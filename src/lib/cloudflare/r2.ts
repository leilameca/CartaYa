import "server-only";

import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
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

export async function uploadMenuImage(file: File, restaurantId: string) {
  const config = readR2Config();
  if (!config) throw new Error("R2_NOT_CONFIGURED");

  const extension = imageExtensions[file.type];
  if (!extension) throw new Error("IMAGE_TYPE_INVALID");
  if (file.size <= 0 || file.size > MAX_MENU_IMAGE_BYTES) throw new Error("IMAGE_SIZE_INVALID");

  const key = `restaurants/${restaurantId}/menu/${randomUUID()}.${extension}`;
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

export async function deleteMenuImageByUrl(url: string | null, restaurantId: string) {
  const config = readR2Config();
  if (!config || !url) return;

  const prefix = `${config.publicBaseUrl}/`;
  if (!url.startsWith(prefix)) return;

  const key = decodeURIComponent(url.slice(prefix.length));
  if (!key.startsWith(`restaurants/${restaurantId}/menu/`) || key.includes("..")) return;

  await getR2Client(config).send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
}
