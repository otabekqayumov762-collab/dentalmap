"use client";

import { Camera, CheckCircle2, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { PHOTO_UPLOAD_TYPES, validatePhotoFile } from "../lib/fileUpload";
import { cn, useToast } from "../ui";

export type PhotoUploadFieldProps = {
  name: string;
  label?: string;
  fileName: string;
  existingPhotoUrl?: string;
  onFileNameChange: (fileName: string) => void;
};

/**
 * Reusable "modern" photo uploader — the single source of truth for every
 * doctor-photo upload surface (registration wizard, self-service profile
 * editor, …) so they all look and behave identically. The file input stays
 * mounted in both states so the host form always submits the field.
 */
export function PhotoUploadField({ name, label, fileName, existingPhotoUrl, onFileNameChange }: PhotoUploadFieldProps) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    const validationError = validatePhotoFile(file);
    if (validationError) {
      toast.error(validationError);
      event.currentTarget.value = "";
      return;
    }
    setPreview(URL.createObjectURL(file));
    onFileNameChange(file.name);
  }

  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  function clearPhoto() {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    setPreview(null);
    onFileNameChange("");
  }

  const openPicker = () => inputRef.current?.click();
  const hasSelection = Boolean(fileName || existingPhotoUrl);
  const thumbnailSrc = preview || existingPhotoUrl;
  // A genuinely new pick gets the brand-tinted card; an existing-only photo
  // (nothing picked yet) reads as a neutral surface card.
  const cardTone = fileName ? "border-brand-200 bg-brand-50/60" : "border-surface-200 bg-surface-50";

  return (
    <div>
      {label ? <span className="mb-1.5 block text-sm font-medium text-ink-700">{label}</span> : null}
      {/* The input stays mounted in both states so the form always submits the file field. */}
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={PHOTO_UPLOAD_TYPES.join(",")}
        className="sr-only"
        onChange={handleChange}
      />
      {hasSelection ? (
        <div className={cn("flex items-center gap-3 rounded-2xl border p-2.5", cardTone)}>
          <button
            type="button"
            onClick={openPicker}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-100 ring-1 ring-surface-200"
            aria-label="Rasmni almashtirish"
          >
            {thumbnailSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnailSrc} alt="Tanlangan rasm" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-brand-400">
                <ImageIcon size={24} />
              </span>
            )}
          </button>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-ink-900">{fileName || "Joriy rasm"}</strong>
            {fileName ? (
              <small className="mt-0.5 flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 size={13} /> Rasm tanlandi
              </small>
            ) : null}
          </span>
          <button
            type="button"
            onClick={clearPhoto}
            aria-label="Rasmni o'chirish"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-0 text-ink-500 shadow-sm ring-1 ring-surface-200 transition-colors hover:bg-danger/10 hover:text-danger active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-surface-200 bg-surface-50 px-4 py-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500">
            <Camera size={22} />
          </span>
          <span className="text-sm font-semibold text-ink-900">Rasm yuklash</span>
          <small className="text-xs text-ink-500">JPG, PNG yoki WebP — 5 MB gacha</small>
        </button>
      )}
    </div>
  );
}
