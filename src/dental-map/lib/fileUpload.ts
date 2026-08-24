export const PHOTO_UPLOAD_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"] as const;
export const RECEIPT_UPLOAD_TYPES = [...PHOTO_UPLOAD_TYPES, "application/pdf"] as const;

/**
 * What the SERVER accepts, after the browser has shrunk the picture. The photo
 * cap matches `DOCTOR_PHOTO_MAX_BYTES` in the API; the receipt cap matches
 * `RECEIPT_MAX_BYTES`. Neither is what the picker allows -- see MAX_PICK_BYTES.
 */
export const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

/**
 * What the PICKER accepts, before the browser shrinks anything. Deliberately far
 * above the server caps: a phone photo is 3-8 MB and a 48 MP one can be more, and
 * refusing it here would be refusing an ordinary picture that is about to become
 * a few hundred kilobytes. The ceiling exists to stop a video-sized file from
 * being decoded on the device, not to police the upload.
 *
 * Declared here with the other limits rather than beside the compressor: this
 * module is the one place that answers "what is allowed", and keeping it free of
 * internal imports also keeps it loadable on its own in tests.
 */
export const MAX_PICK_BYTES = 50 * 1024 * 1024;
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

/**
 * The check that runs the moment a file is PICKED, before compression.
 *
 * A phone photo is routinely 3-8 MB, so rejecting on the server's limit here
 * would refuse ordinary pictures that the browser is about to shrink to a few
 * hundred kilobytes. Only the type is decided at this point; the size gate is
 * the picker ceiling, which exists to stop a video-sized file from being decoded
 * on the device, not to police the upload.
 */
export function validatePickedPhoto(file: File) {
  return validateUploadFile(file, {
    allowedTypes: PHOTO_UPLOAD_TYPES,
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
    maxBytes: MAX_PICK_BYTES,
    typeMessage: "Faqat JPG, PNG, WebP yoki HEIC rasm yuklang.",
    sizeMessage: `Rasm hajmi ${Math.round(MAX_PICK_BYTES / (1024 * 1024))} MB dan oshmasligi kerak.`
  });
}

/** The check that runs on what will actually be sent, after compression. */
/**
 * A phone photo that arrived as HEIC and never became anything else.
 *
 * The picker accepts HEIC on purpose: it is what an iPhone writes by default, and
 * on the browsers that can decode it the compressor turns it into WebP or JPEG
 * before anything is uploaded. Android Chrome cannot decode it, so the compressor
 * hands the original straight back -- and the upload gate then answered "Faqat
 * JPG, PNG yoki WebP rasm yuklang", refusing the exact format the picker had just
 * allowed. The person is told to do something they already did.
 *
 * So the unconverted case gets its own message, one that says what actually went
 * wrong and what to change. Recognised by extension as well as MIME type because
 * iOS and Android both hand over HEIC with an empty or generic type.
 */
export function isUnconvertedHeic(file: { name?: string; type?: string }) {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") {
    return true;
  }
  const extension = (file.name || "").split(".").pop()?.toLowerCase() ?? "";
  return extension === "heic" || extension === "heif";
}

/** What to say when the browser could not convert a HEIC. */
export const HEIC_UNCONVERTED_MESSAGE =
  "Brauzeringiz HEIC rasmni o'gira olmadi. Telefon kamerasi sozlamasidan " +
  "\"Eng mos\" (JPEG) formatni tanlang yoki rasmni skrinshot qilib yuklang.";

export function validatePhotoFile(file: File) {
  return validateUploadFile(file, {
    allowedTypes: PHOTO_UPLOAD_TYPES,
    allowedExtensions: ["jpg", "jpeg", "png", "webp"],
    maxBytes: MAX_PHOTO_BYTES,
    typeMessage: "Faqat JPG, PNG yoki WebP rasm yuklang.",
    sizeMessage: "Rasmni siqib bo'lmadi — kichikroq rasm tanlang."
  });
}

export function validatePickedReceipt(file: File) {
  return validateUploadFile(file, {
    allowedTypes: RECEIPT_UPLOAD_TYPES,
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "heic", "heif", "pdf"],
    maxBytes: MAX_PICK_BYTES,
    typeMessage: "Faqat PNG, JPG, WebP, HEIC yoki PDF fayl yuklang.",
    sizeMessage: `Fayl hajmi ${Math.round(MAX_PICK_BYTES / (1024 * 1024))} MB dan oshmasligi kerak.`
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
