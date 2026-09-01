import "server-only";

import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { MAX_MENU_IMAGE_BYTES } from "@/lib/menu-images";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function hasValidImageSignature(bytes: Uint8Array, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") {
    return [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  if (mimeType === "image/avif") {
    const box = new TextDecoder().decode(bytes.slice(4, 12));
    return box.startsWith("ftyp") && /avif|avis/.test(new TextDecoder().decode(bytes.slice(8, 32)));
  }
  return false;
}

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicBaseUrl: string;
};

function normalizePublicBaseUrl(value: string) {
  const trimmed = value.trim();
  const markdownLink = /^\[[^\]]+\]\((https?:\/\/[^)]+)\)\/?$/.exec(trimmed);
  const candidate = markdownLink?.[1] ?? trimmed;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:") return null;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function readR2Config(): R2Config | null {
  const config = {
    accountId: process.env.CLOUDFLARE_R2_ACCOUNT_ID,
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
    bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME,
    publicBaseUrl: process.env.CLOUDFLARE_R2_PUBLIC_BASE_URL,
  };

  if (Object.values(config).some((value) => !value)) return null;
  const publicBaseUrl = normalizePublicBaseUrl(config.publicBaseUrl!);
  if (!publicBaseUrl) return null;

  return {
    accountId: config.accountId!,
    accessKeyId: config.accessKeyId!,
    secretAccessKey: config.secretAccessKey!,
    bucket: config.bucket!,
    publicBaseUrl,
  };
}

function getR2Client(config: R2Config) {
  return new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function isR2Configured() {
  return Boolean(readR2Config());
}

export const MAX_SUPPORT_ATTACHMENT_BYTES = 3 * 1024 * 1024;

export async function uploadEncryptedSupportAttachment(file: File, ticketId: string) {
  const config = readR2Config();
  if (!config) throw new Error("R2_NOT_CONFIGURED");
  if (!/^[0-9a-f-]{36}$/i.test(ticketId)) throw new Error("ATTACHMENT_INVALID");
  if (!(file.type in imageExtensions) || file.type === "image/avif") throw new Error("ATTACHMENT_TYPE_INVALID");
  if (file.size <= 0 || file.size > MAX_SUPPORT_ATTACHMENT_BYTES) throw new Error("ATTACHMENT_SIZE_INVALID");

  const body = new Uint8Array(await file.arrayBuffer());
  if (!hasValidImageSignature(body, file.type)) throw new Error("ATTACHMENT_TYPE_INVALID");

  const encryptionKey = randomBytes(32);
  const encryptionIv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey, encryptionIv);
  const encrypted = Buffer.concat([cipher.update(body), cipher.final(), cipher.getAuthTag()]);
  const key = `support/${ticketId}/${randomUUID()}.enc`;

  await getR2Client(config).send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: encrypted,
    ContentLength: encrypted.byteLength,
    ContentType: "application/octet-stream",
    CacheControl: "private, no-store",
    Metadata: { ticketId, encrypted: "aes-256-gcm" },
  }));

  const safeName = file.name.replace(/[^a-zA-Z0-9._ -]/g, "_").slice(0, 180) || `captura.${imageExtensions[file.type]}`;
  return {
    objectKey: key,
    encryptionKey: encryptionKey.toString("base64"),
    encryptionIv: encryptionIv.toString("base64"),
    originalName: safeName,
    mimeType: file.type,
    byteSize: file.size,
  };
}

export async function downloadEncryptedSupportAttachment({ objectKey, encryptionKey, encryptionIv }: { objectKey: string; encryptionKey: string; encryptionIv: string }) {
  const config = readR2Config();
  if (!config) throw new Error("R2_NOT_CONFIGURED");
  if (!objectKey.startsWith("support/") || objectKey.includes("..")) throw new Error("ATTACHMENT_INVALID");

  const response = await getR2Client(config).send(new GetObjectCommand({ Bucket: config.bucket, Key: objectKey }));
  if (!response.Body) throw new Error("ATTACHMENT_NOT_FOUND");
  const encrypted = Buffer.from(await response.Body.transformToByteArray());
  if (encrypted.length <= 16) throw new Error("ATTACHMENT_INVALID");

  const key = Buffer.from(encryptionKey, "base64");
  const iv = Buffer.from(encryptionIv, "base64");
  if (key.length !== 32 || iv.length !== 12) throw new Error("ATTACHMENT_INVALID");
  const authTag = encrypted.subarray(encrypted.length - 16);
  const ciphertext = encrypted.subarray(0, encrypted.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export async function deleteEncryptedSupportAttachment(objectKey: string) {
  const config = readR2Config();
  if (!config || !objectKey.startsWith("support/") || objectKey.includes("..")) return;
  await getR2Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }));
}

export async function uploadMenuImage(file: File, restaurantId: string) {
  return uploadRestaurantImage(file, restaurantId, "menu");
}

export async function uploadRestaurantLogo(file: File, restaurantId: string) {
  return uploadRestaurantImage(file, restaurantId, "branding");
}

async function uploadRestaurantImage(file: File, restaurantId: string, folder: "menu" | "branding") {
  const config = readR2Config();
  if (!config) throw new Error("R2_NOT_CONFIGURED");

  const extension = imageExtensions[file.type];
  if (!extension) throw new Error("IMAGE_TYPE_INVALID");
  if (file.size <= 0 || file.size > MAX_MENU_IMAGE_BYTES) throw new Error("IMAGE_SIZE_INVALID");

  const key = `restaurants/${restaurantId}/${folder}/${randomUUID()}.${extension}`;
  const body = new Uint8Array(await file.arrayBuffer());
  if (!hasValidImageSignature(body, file.type)) throw new Error("IMAGE_TYPE_INVALID");

  await getR2Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentLength: body.byteLength,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
      Metadata: { restaurantId },
    }),
  );

  return { key, url: `${config.publicBaseUrl}/${key}` };
}

export async function deleteRestaurantLogo(url: string | null, restaurantId: string) {
  const config = readR2Config();
  if (!config || !url) return;

  const prefix = `${config.publicBaseUrl}/`;
  if (!url.startsWith(prefix)) return;

  const key = decodeURIComponent(url.slice(prefix.length));
  if (!key.startsWith(`restaurants/${restaurantId}/branding/`) || key.includes("..")) return;

  await getR2Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}

export async function deleteMenuImageByUrl(url: string | null, restaurantId: string) {
  const config = readR2Config();
  if (!config || !url) return;

  const prefix = `${config.publicBaseUrl}/`;
  if (!url.startsWith(prefix)) return;

  const key = decodeURIComponent(url.slice(prefix.length));
  if (!key.startsWith(`restaurants/${restaurantId}/menu/`) || key.includes("..")) return;

  await getR2Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
