"use client";

import { createClientSupabase } from "./client";

const BUCKET = "health-photos";

// Uploads a health-log photo under <farm_id>/<random>-<filename> and returns its
// public URL. Farm-scoped path is required by the storage RLS insert policy.
export async function uploadHealthPhoto(file: File, farmId: string): Promise<string> {
  const supabase = createClientSupabase();
  const path = `${farmId}/${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
