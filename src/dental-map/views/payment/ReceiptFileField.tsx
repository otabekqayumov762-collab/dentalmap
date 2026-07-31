"use client";

import { FileText, ImageIcon, Paperclip, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { RECEIPT_UPLOAD_TYPES, validateReceiptFile } from "../../lib/fileUpload";
import { cn } from "../../ui";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Receipt picker (screenshot or PDF) with a name/thumbnail preview. */
export function ReceiptFileField({
  file,
  disabled,
  onFileChange
}: {
  file: File | null;
  disabled?: boolean;
  onFileChange: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [validationError, setValidationError] = useState("");

  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreviewUrl("");
    return undefined;
  }, [file]);

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink-700">Chek (skrinshot yoki PDF)</span>

      <input
        ref={inputRef}
        type="file"
        name="file"
        accept={RECEIPT_UPLOAD_TYPES.join(",")}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          const nextFile = event.target.files?.[0] ?? null;
          if (!nextFile) {
            setValidationError("");
            onFileChange(null);
            return;
          }
          const error = validateReceiptFile(nextFile);
          if (error) {
            event.currentTarget.value = "";
            setValidationError(error);
            onFileChange(null);
            return;
          }
          setValidationError("");
          onFileChange(nextFile);
        }}
      />

      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-surface-200 bg-surface-50 px-4 py-6 text-center transition-colors",
            "hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
            "disabled:pointer-events-none disabled:opacity-55"
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-500">
            <Paperclip size={18} />
          </span>
          <span className="text-sm font-semibold text-ink-900">Chek faylini tanlang</span>
          <span className="text-xs text-ink-500">PNG, JPG yoki PDF — 8 MB gacha</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl border border-surface-100 bg-surface-0 p-3 shadow-card">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-100 text-ink-500">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="Chek ko'rinishi" className="h-full w-full object-cover" />
            ) : file.type === "application/pdf" ? (
              <FileText size={20} />
            ) : (
              <ImageIcon size={20} />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block truncate text-sm font-semibold text-ink-900">{file.name}</strong>
            <small className="block text-xs text-ink-500">{formatSize(file.size)}</small>
          </span>
          <button
            type="button"
            aria-label="Faylni olib tashlash"
            disabled={disabled}
            onClick={() => {
              onFileChange(null);
              setValidationError("");
              if (inputRef.current) {
                inputRef.current.value = "";
              }
            }}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-surface-100 disabled:opacity-55"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {validationError && (
        <small className="text-xs font-medium text-danger" role="alert">
          {validationError}
        </small>
      )}
    </div>
  );
}
