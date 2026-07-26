import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "business-logos";
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export type LogoUploadResult = { url: string } | { error: string };

export async function uploadBusinessLogo(file: File): Promise<LogoUploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Logo must be a PNG, JPEG, or WEBP image." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Logo must be smaller than 5MB." };
  }

  const adminClient = createAdminClient();
  if (!adminClient) return { error: "Storage is not configured." };

  const extension = file.name.split(".").pop() || "png";
  const path = `${crypto.randomUUID()}.${extension}`;

  const { error } = await adminClient.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { error: error.message };

  const { data } = adminClient.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
