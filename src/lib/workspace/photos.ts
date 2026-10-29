import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Inventory } from "./types";

type Photo = { type: string; bytes: Buffer };

// Photos live inside the workspace record. Reading one used to load the whole workspace,
// once per image; now one query fetches only the inventory and every photo is kept in memory.
const MAX_ENTRIES = 400;
const photos = new Map<string, Photo>();
const loading = new Map<string, Promise<void>>();

export const photoVersion = (data: string) => createHash("sha1").update(data).digest("hex").slice(0, 12);

function remember(key: string, photo: Photo) {
  photos.delete(key);
  photos.set(key, photo);
  // Map keeps insertion order, so the first key is the least recently stored.
  while (photos.size > MAX_ENTRIES) photos.delete(photos.keys().next().value!);
}

// Concurrent requests for one workspace share a single query.
function loadInventory(tenantId: string) {
  let pending = loading.get(tenantId);
  if (!pending) {
    pending = (async () => {
      const { data, error } = await createAdminClient().from("tripdash_workspaces").select("inventory:data->inventory").eq("tenant_id", tenantId).maybeSingle();
      if (error) throw error;
      for (const item of ((data?.inventory ?? []) as Inventory[])) {
        const match = item.imageUrl?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
        if (match) remember(`${tenantId}:${item.id}:${photoVersion(item.imageUrl!)}:full`, { type: match[1], bytes: Buffer.from(match[2], "base64") });
      }
    })().finally(() => loading.delete(tenantId));
    loading.set(tenantId, pending);
  }
  return pending;
}

const thumbnails = new Map<string, string>();
/** A 128px WebP data URL of a stored photo, cached by photo version (a few KB each). */
export async function inlineThumbnail(dataUrl: string) {
  const version = photoVersion(dataUrl);
  const hit = thumbnails.get(version);
  if (hit) return hit;
  const match = dataUrl.match(/^data:image\/(?:png|jpeg|webp);base64,(.+)$/);
  if (!match) return undefined;
  const { default: sharp } = await import("sharp");
  const bytes = await sharp(Buffer.from(match[1], "base64")).resize(128, 128, { fit: "cover" }).webp({ quality: 70 }).toBuffer();
  const url = `data:image/webp;base64,${bytes.toString("base64")}`;
  thumbnails.set(version, url);
  if (thumbnails.size > MAX_ENTRIES) thumbnails.delete(thumbnails.keys().next().value!);
  return url;
}

/** Returns the photo for an item at a version, optionally as a square WebP thumbnail of `width` pixels. */
export async function inventoryPhoto(tenantId: string, itemId: string, version: string, width?: number): Promise<Photo | null> {
  const base = `${tenantId}:${itemId}:${version}`;
  const sized = width ? `${base}:${width}` : `${base}:full`;
  const hit = photos.get(sized);
  if (hit) return hit;
  let full = photos.get(`${base}:full`);
  if (!full) { await loadInventory(tenantId); full = photos.get(`${base}:full`); }
  if (!full) return null;
  if (!width) return full;
  // Loaded on first use so routes that only import the workspace helpers skip the image library.
  const { default: sharp } = await import("sharp");
  const thumb = { type: "image/webp", bytes: await sharp(full.bytes).resize(width, width, { fit: "cover" }).webp({ quality: 78 }).toBuffer() };
  remember(sized, thumb);
  return thumb;
}
