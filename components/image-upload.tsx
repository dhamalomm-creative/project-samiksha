"use client";

import { ImagePlus, Loader2, X } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/browser";

const MAX_DIMENSION = 1600;
const MAX_INPUT_BYTES = 20 * 1024 * 1024;

/** Phone photos are huge; shrinking here keeps pages fast and storage cheap. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), "image/webp", 0.82),
  );
}

export function ImageUpload({
  name,
  bucket,
  userId,
  defaultValue,
  round,
}: {
  name: string;
  bucket: "wish-images" | "avatars";
  userId: string;
  defaultValue?: string | null;
  round?: boolean;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function onPick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image.");
    if (file.size > MAX_INPUT_BYTES) return void toast.error("That image is too large (20 MB max).");

    setBusy(true);
    try {
      const blob = await shrink(file);
      const supabase = createClient();
      const path = `${userId}/${crypto.randomUUID()}.webp`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { contentType: "image/webp", cacheControl: "31536000" });
      if (error) throw error;
      setUrl(supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    } catch {
      toast.error("We couldn't upload that image. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  const shape = round ? "size-28 rounded-full" : "aspect-[4/3] w-full rounded-2xl";

  return (
    <div className={round ? "w-fit" : "w-full"}>
      <input type="hidden" name={name} value={url} />
      <input
        ref={input}
        type="file"
        accept="image/*"
        onChange={onPick}
        className="sr-only"
        aria-label="Upload an image"
        data-testid={`${name}-file`}
      />
      <div className="relative">
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className={`${shape} grid place-items-center overflow-hidden border border-dashed border-line bg-sand/50 text-muted transition hover:bg-sand`}
        >
          {busy ? (
            <Loader2 className="size-6 animate-spin" aria-label="Uploading" />
          ) : url ? (
            <img src={url} alt="Selected" className="size-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1.5 text-sm font-medium">
              <ImagePlus className="size-6" aria-hidden />
              Add a photo
            </span>
          )}
        </button>
        {url && !busy && (
          <button
            type="button"
            onClick={() => setUrl("")}
            aria-label="Remove image"
            className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-ink/70 text-white"
          >
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
