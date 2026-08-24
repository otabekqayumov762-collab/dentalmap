"use client";

import { Camera, CheckCircle2, Image as ImageIcon, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  HEIC_UNCONVERTED_MESSAGE,
  MAX_PICK_BYTES,
  isUnconvertedHeic,
  validatePhotoFile,
  validatePickedPhoto
} from "../lib/fileUpload";
import { compressImage, formatBytes } from "../lib/imageCompression";
import { cn, useToast } from "../ui";
import { labelClass } from "../ui/Field";

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
  const [busy, setBusy] = useState(false);
  const [savedNote, setSavedNote] = useState("");

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    // Picked-file rules only: the size the SERVER cares about is decided after
    // the shrink below, so judging it here would reject ordinary phone photos.
    const pickError = validatePickedPhoto(file);
    if (pickError) {
      toast.error(pickError);
      input.value = "";
      return;
    }

    setBusy(true);
    setSavedNote("");
    try {
      const result = await compressImage(file);
      const uploadError = isUnconvertedHeic(result.file)
        ? HEIC_UNCONVERTED_MESSAGE
        : validatePhotoFile(result.file);
      if (uploadError) {
        toast.error(uploadError);
        input.value = "";
        return;
      }
      // The form submits this input directly, so the shrunk file has to replace
      // what the picker put there -- otherwise the original is what gets posted.
      if (result.compressed) {
        const transfer = new DataTransfer();
        transfer.items.add(result.file);
        input.files = transfer.files;
        setSavedNote(`${formatBytes(result.originalBytes)} → ${formatBytes(result.file.size)}`);
      }
      setPreview(URL.createObjectURL(result.file));
      onFileNameChange(result.file.name);
    } finally {
      setBusy(false);
    }
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
    setSavedNote("");
    onFileNameChange("");
  }

  const openPicker = () => {
    if (!busy) {
      inputRef.current?.click();
    }
  };
  const hasSelection = Boolean(fileName || existingPhotoUrl);
  const thumbnailSrc = preview || existingPhotoUrl;
  // A genuinely new pick gets the brand-tinted card; an existing-only photo
  // (nothing picked yet) reads as a neutral surface card.
  const cardTone = fileName ? "border-brand-200 bg-brand-50/60" : "border-surface-200 bg-surface-50";

  return (
    <div>
      {label ? <span className={labelClass}>{label}</span> : null}
      {/* The input stays mounted in both states so the form always submits the file field. */}
      <input
        ref={inputRef}
        type="file"
        name={name}
        // image/* rather than a type list: on iOS a narrow list greys out most of
        // the camera roll, and HEIC arrives with an empty type anyway. The
        // allowlist is still enforced in validatePickedPhoto.
        accept="image/*"
        className="sr-only"
        onChange={handleChange}
      />
      {hasSelection ? (
        <div className={cn("flex items-center gap-3 rounded-card border p-2.5", cardTone)}>
          <button
            type="button"
            onClick={openPicker}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-control bg-surface-100 ring-1 ring-control-border/60"
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
            {busy ? (
              <small className="mt-0.5 flex items-center gap-1 text-xs font-medium text-ink-500">
                <Loader2 size={13} className="motion-safe:animate-spin" /> Siqilmoqda…
              </small>
            ) : fileName ? (
              <small className="mt-0.5 flex items-center gap-1 text-xs font-medium text-success">
                <CheckCircle2 size={13} /> {savedNote ? `Siqildi — ${savedNote}` : "Rasm tanlandi"}
              </small>
            ) : null}
          </span>
          <button
            type="button"
            onClick={clearPhoto}
            aria-label="Rasmni o'chirish"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-surface-0 text-ink-500 shadow-card ring-1 ring-control-border/60 transition-colors hover:bg-danger/10 hover:text-danger motion-safe:active:scale-95"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          className="flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed border-surface-200 bg-surface-50 px-4 py-6 text-center transition-colors hover:border-brand-400 hover:bg-brand-50"
        >
          <span className="flex h-12 w-12 items-center justify-center rounded-card bg-brand-500/10 text-brand-500">
            <Camera size={22} />
          </span>
          <span className="text-sm font-semibold text-ink-900">{busy ? "Siqilmoqda…" : "Rasm yuklash"}</span>
          <small className="text-xs text-ink-500">
            Telefondagi rasm ham bo&apos;ladi — {Math.round(MAX_PICK_BYTES / (1024 * 1024))} MB gacha,
            sifatini buzmasdan o&apos;zi kichraytiriladi
          </small>
        </button>
      )}
    </div>
  );
}
