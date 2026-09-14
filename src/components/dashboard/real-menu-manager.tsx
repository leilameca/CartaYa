"use client";

import {
  createCategoryAction,
  createMenuItemAction,
  deleteCategoryAction,
  deleteMenuItemAction,
  moveCategoryAction,
  renameCategoryAction,
  setMenuItemAvailabilityAction,
  updateMenuItemAction,
} from "@/app/dashboard/menu/actions";
import { MenuManager, type MenuEditorOperations } from "@/components/dashboard/menu-manager";
import type { Tables } from "@/types/database";

const operations: MenuEditorOperations = {
  createCategory: createCategoryAction,
  renameCategory: renameCategoryAction,
  moveCategory: moveCategoryAction,
  deleteCategory: deleteCategoryAction,
  createMenuItem: createMenuItemAction,
  updateMenuItem: updateMenuItemAction,
  setMenuItemAvailability: setMenuItemAvailabilityAction,
  deleteMenuItem: deleteMenuItemAction,
};

export function RealMenuManager(props: {
  restaurantName: string;
  tier: "gratis" | "plus" | "pro";
  categories: Tables<"categories">[];
  items: Tables<"menu_items">[];
  r2Configured: boolean;
}) {
  return <MenuManager {...props} operations={operations} refreshAfterMutation />;
}
