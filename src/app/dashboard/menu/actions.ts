"use server";

import { revalidatePath } from "next/cache";
import { deleteMenuImageByUrl, uploadMenuImage } from "@/lib/cloudflare/r2";
import { createClient } from "@/lib/supabase/server";
import { categoryIdSchema, categorySchema, menuItemIdSchema, menuItemSchema } from "@/lib/validation/menu";

export type MenuActionResult = { error?: string; success?: string };

const FREE_PLAN_LIMIT_MESSAGE = "Llegaste al límite del plan Gratis — mejora tu plan para agregar más";

function firstIssue(error: { issues: { message: string }[] }) {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}

function databaseMessage(error: { code?: string; message: string }) {
  const message = error.message.toLowerCase();
  if (message.includes("límite del plan gratis") || message.includes("limite del plan gratis")) {
    return FREE_PLAN_LIMIT_MESSAGE;
  }
  if (error.code === "23505") return "Ya existe una categoría con ese nombre.";
  if (error.code === "23503") return "La categoría seleccionada no es válida.";
  return "No pudimos guardar los cambios. Inténtalo nuevamente.";
}

function imageMessage(error: unknown) {
  if (!(error instanceof Error)) return "No pudimos subir la foto.";
  if (error.message === "R2_NOT_CONFIGURED") {
    return "La carga de fotos aún no está configurada. Completa las credenciales de Cloudflare R2.";
  }
  if (error.message === "IMAGE_TYPE_INVALID") return "Usa una foto JPG, PNG, WebP o AVIF.";
  if (error.message === "IMAGE_SIZE_INVALID") return "La foto debe pesar 3 MB o menos.";
  console.error("Cloudflare R2 menu image error", error);
  return "No pudimos subir la foto. Inténtalo nuevamente.";
}

async function getRestaurantContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión venció. Inicia sesión nuevamente." } as const;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("restaurant_id, role, restaurants(subscription_tier)")
    .eq("id", user.id)
    .single();

  if (error || !profile || profile.role !== "owner") {
    return { error: "No tienes permisos para administrar este menú." } as const;
  }

  const relation = profile.restaurants as unknown as
    | { subscription_tier: "gratis" | "plus" | "pro" }
    | { subscription_tier: "gratis" | "plus" | "pro" }[]
    | null;
  const restaurant = Array.isArray(relation) ? relation[0] : relation;
  if (!restaurant) return { error: "No encontramos el restaurante de esta cuenta." } as const;

  return { supabase, restaurantId: profile.restaurant_id, tier: restaurant.subscription_tier } as const;
}

export async function createCategoryAction(formData: FormData): Promise<MenuActionResult> {
  const parsed = categorySchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const context = await getRestaurantContext();
  if ("error" in context) return { error: context.error };

  const { data: lastCategory } = await context.supabase
    .from("categories")
    .select("display_order")
    .eq("restaurant_id", context.restaurantId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await context.supabase.from("categories").insert({
    restaurant_id: context.restaurantId,
    name: parsed.data.name,
    display_order: (lastCategory?.display_order ?? -1) + 1,
  });

  if (error) return { error: databaseMessage(error) };
  revalidatePath("/dashboard/menu");
  return { success: "Categoría creada." };
}

export async function renameCategoryAction(formData: FormData): Promise<MenuActionResult> {
  const id = categoryIdSchema.safeParse(formData.get("categoryId"));
  const values = categorySchema.safeParse({ name: formData.get("name") });
  if (!id.success) return { error: firstIssue(id.error) };
  if (!values.success) return { error: firstIssue(values.error) };

  const context = await getRestaurantContext();
  if ("error" in context) return { error: context.error };

  const { data, error } = await context.supabase
    .from("categories")
    .update({ name: values.data.name })
    .eq("id", id.data)
    .eq("restaurant_id", context.restaurantId)
    .select("id")
    .maybeSingle();

  if (error) return { error: databaseMessage(error) };
  if (!data) return { error: "La categoría ya no existe o no te pertenece." };
  revalidatePath("/dashboard/menu");
  return { success: "Categoría renombrada." };
}

export async function moveCategoryAction(categoryId: string, direction: "up" | "down"): Promise<MenuActionResult> {
  const id = categoryIdSchema.safeParse(categoryId);
  if (!id.success) return { error: firstIssue(id.error) };

  const context = await getRestaurantContext();
  if ("error" in context) return { error: context.error };

  const { data: categories, error } = await context.supabase
    .from("categories")
    .select("id")
    .eq("restaurant_id", context.restaurantId)
    .order("display_order")
    .order("name");
  if (error) return { error: databaseMessage(error) };

  const currentIndex = categories.findIndex((category) => category.id === id.data);
  const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= categories.length) return { success: "Orden actualizado." };

  const orderedIds = categories.map((category) => category.id);
  [orderedIds[currentIndex], orderedIds[targetIndex]] = [orderedIds[targetIndex], orderedIds[currentIndex]];

  const { error: reorderError } = await context.supabase.rpc("reorder_categories", { p_ordered_ids: orderedIds });
  if (reorderError) return { error: databaseMessage(reorderError) };
  revalidatePath("/dashboard/menu");
  return { success: "Orden actualizado." };
}

export async function deleteCategoryAction(categoryId: string, confirmationId: string): Promise<MenuActionResult> {
  const id = categoryIdSchema.safeParse(categoryId);
  if (!id.success || confirmationId !== categoryId) return { error: "Confirma la categoría que deseas eliminar." };

  const context = await getRestaurantContext();
  if ("error" in context) return { error: context.error };

  const { data: items } = await context.supabase
    .from("menu_items")
    .select("image_url")
    .eq("restaurant_id", context.restaurantId)
    .eq("category_id", id.data);

  const { data, error } = await context.supabase
    .from("categories")
    .delete()
    .eq("id", id.data)
    .eq("restaurant_id", context.restaurantId)
    .select("id")
    .maybeSingle();

  if (error) return { error: databaseMessage(error) };
  if (!data) return { error: "La categoría ya no existe o no te pertenece." };

  await Promise.allSettled((items ?? []).map((item) => deleteMenuImageByUrl(item.image_url, context.restaurantId)));
  revalidatePath("/dashboard/menu");
  return { success: "Categoría eliminada." };
}

function parseMenuItem(formData: FormData) {
  return menuItemSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    price: formData.get("price"),
    categoryId: formData.get("categoryId"),
    tag: formData.get("tag") ?? "",
    isAvailable: formData.get("isAvailable") !== "false",
  });
}

function getImage(formData: FormData) {
  const value = formData.get("image");
  return value instanceof File && value.size > 0 ? value : null;
}

export async function createMenuItemAction(formData: FormData): Promise<MenuActionResult> {
  const parsed = parseMenuItem(formData);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const context = await getRestaurantContext();
  if ("error" in context) return { error: context.error };

  if (context.tier === "gratis") {
    const { count, error: countError } = await context.supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", context.restaurantId);
    if (countError) return { error: databaseMessage(countError) };
    if ((count ?? 0) >= 20) return { error: FREE_PLAN_LIMIT_MESSAGE };
  }

  const image = getImage(formData);
  let uploaded: { key: string; url: string } | null = null;
  if (image) {
    try {
      uploaded = await uploadMenuImage(image, context.restaurantId);
    } catch (error) {
      return { error: imageMessage(error) };
    }
  }

  const { data: lastItem } = await context.supabase
    .from("menu_items")
    .select("display_order")
    .eq("restaurant_id", context.restaurantId)
    .eq("category_id", parsed.data.categoryId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await context.supabase.from("menu_items").insert({
    restaurant_id: context.restaurantId,
    category_id: parsed.data.categoryId,
    name: parsed.data.name,
    description: parsed.data.description,
    price: parsed.data.price,
    image_url: uploaded?.url ?? null,
    is_available: parsed.data.isAvailable,
    tag: parsed.data.tag,
    display_order: (lastItem?.display_order ?? -1) + 1,
  });

  if (error) {
    if (uploaded) await deleteMenuImageByUrl(uploaded.url, context.restaurantId).catch(console.error);
    return { error: databaseMessage(error) };
  }

  revalidatePath("/dashboard/menu");
  return { success: "Plato agregado." };
}

export async function updateMenuItemAction(formData: FormData): Promise<MenuActionResult> {
  const id = menuItemIdSchema.safeParse(formData.get("menuItemId"));
  const parsed = parseMenuItem(formData);
  if (!id.success) return { error: firstIssue(id.error) };
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const context = await getRestaurantContext();
  if ("error" in context) return { error: context.error };

  const { data: current, error: currentError } = await context.supabase
    .from("menu_items")
    .select("image_url")
    .eq("id", id.data)
    .eq("restaurant_id", context.restaurantId)
    .maybeSingle();
  if (currentError) return { error: databaseMessage(currentError) };
  if (!current) return { error: "El plato ya no existe o no te pertenece." };

  const image = getImage(formData);
  let uploaded: { key: string; url: string } | null = null;
  if (image) {
    try {
      uploaded = await uploadMenuImage(image, context.restaurantId);
    } catch (error) {
      return { error: imageMessage(error) };
    }
  }

  const { data, error } = await context.supabase
    .from("menu_items")
    .update({
      category_id: parsed.data.categoryId,
      name: parsed.data.name,
      description: parsed.data.description,
      price: parsed.data.price,
      image_url: uploaded?.url ?? current.image_url,
      is_available: parsed.data.isAvailable,
      tag: parsed.data.tag,
    })
    .eq("id", id.data)
    .eq("restaurant_id", context.restaurantId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    if (uploaded) await deleteMenuImageByUrl(uploaded.url, context.restaurantId).catch(console.error);
    return { error: error ? databaseMessage(error) : "El plato ya no existe o no te pertenece." };
  }

  if (uploaded && current.image_url) {
    await deleteMenuImageByUrl(current.image_url, context.restaurantId).catch(console.error);
  }
  revalidatePath("/dashboard/menu");
  return { success: "Plato actualizado." };
}

export async function setMenuItemAvailabilityAction(menuItemId: string, isAvailable: boolean): Promise<MenuActionResult> {
  const id = menuItemIdSchema.safeParse(menuItemId);
  if (!id.success) return { error: firstIssue(id.error) };

  const context = await getRestaurantContext();
  if ("error" in context) return { error: context.error };

  const { data, error } = await context.supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("id", id.data)
    .eq("restaurant_id", context.restaurantId)
    .select("id")
    .maybeSingle();
  if (error) return { error: databaseMessage(error) };
  if (!data) return { error: "El plato ya no existe o no te pertenece." };

  revalidatePath("/dashboard/menu");
  return { success: isAvailable ? "Plato disponible." : "Plato marcado como agotado." };
}

export async function deleteMenuItemAction(menuItemId: string, confirmationId: string): Promise<MenuActionResult> {
  const id = menuItemIdSchema.safeParse(menuItemId);
  if (!id.success || confirmationId !== menuItemId) return { error: "Confirma el plato que deseas eliminar." };

  const context = await getRestaurantContext();
  if ("error" in context) return { error: context.error };

  const { data, error } = await context.supabase
    .from("menu_items")
    .delete()
    .eq("id", id.data)
    .eq("restaurant_id", context.restaurantId)
    .select("image_url")
    .maybeSingle();
  if (error) return { error: databaseMessage(error) };
  if (!data) return { error: "El plato ya no existe o no te pertenece." };

  await deleteMenuImageByUrl(data.image_url, context.restaurantId).catch(console.error);
  revalidatePath("/dashboard/menu");
  return { success: "Plato eliminado." };
}
