export const PHOTO_UPLOAD_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
export const RECEIPT_UPLOAD_TYPES = [...PHOTO_UPLOAD_TYPES, "application/pdf"] as const;

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

type UploadValidationOptions = {
  allowedTypes: readonly string[];
  allowedExtensions: readonly string[];
  maxBytes: number;
  typeMessage: string;
  sizeMessage: string;
};

/**
 * Client-side defence in depth for upload controls. The API remains the
 * authority and must inspect file signatures because browser MIME types can be
 * empty, generic or spoofed.
 */
export function validateUploadFile(file: File, options: UploadValidationOptions) {
  if (!file.name || file.size <= 0) {
    return "Bo'sh faylni yuklab bo'lmaydi.";
  }
  if (file.size > options.maxBytes) {
    return options.sizeMessage;
  }
  const normalizedExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!options.allowedExtensions.includes(normalizedExtension)) {
    return options.typeMessage;
  }
  const normalizedType = file.type.toLowerCase();
  const isGenericType = normalizedType === "" || normalizedType === "application/octet-stream";
  if (!isGenericType && !options.allowedTypes.includes(normalizedType)) {
    return options.typeMessage;
  }
  return "";
}

export function validatePhotoFile(file: File) {
  return validateUploadFile(file, {
    allowedTypes: PHOTO_UPLOAD_TYPES,
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    maxBytes: MAX_PHOTO_BYTES,
    typeMessage: "Faqat JPG, PNG yoki WebP rasm yuklang.",
    sizeMessage: "Rasm hajmi 5 MB dan oshmasligi kerak."
  });
}

export function validateReceiptFile(file: File) {
  return validateUploadFile(file, {
    allowedTypes: RECEIPT_UPLOAD_TYPES,
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "pdf"],
    maxBytes: MAX_RECEIPT_BYTES,
    typeMessage: "Faqat PNG, JPG, WebP yoki PDF fayl yuklang.",
    sizeMessage: "Fayl hajmi 8 MB dan oshmasligi kerak."
  });
}
