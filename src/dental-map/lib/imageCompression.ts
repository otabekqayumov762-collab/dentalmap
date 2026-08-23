/**
 * Shrink a photo in the browser before it is ever uploaded.
 *
 * Two things made phone uploads fail, and the size limit was only one of them.
 * A modern iPhone writes 3-8 MB per photo (48 MP on the Pro bodies), so a 5 MB
 * cap rejected ordinary pictures outright. The bigger problem was the network:
 * on the route this project used to be reachable on, POST bodies over ~200 KB
 * never left the phone at all -- the connection opened, the body stalled, and
 * the user saw a spinner until it timed out.
 *
 * The route is fixed elsewhere (traffic now goes through Cloudflare). This file
 * fixes the other half, and does it in the direction that costs the server
 * nothing: the picture is re-encoded on the device, so what crosses the network
 * is a few hundred kilobytes instead of several megabytes. The origin then never
 * receives, buffers or resizes a large file.
 *
 * The quality rule is deliberately conservative. A doctor's photo is displayed
 * at a few hundred CSS pixels, so a 2048 px long edge is still oversampled on a
 * 3x screen -- there is nothing to see at full resolution that is lost at this
 * one. Quality steps down only if the file is still above target, and stops at
 * the first step that fits, so a picture is never compressed harder than it has
 * to be.
 */

/** What we aim to hand the network. Comfortably under every server-side cap. */
export const COMPRESSION_TARGET_BYTES = 1_500_000;

/** Longest edge we keep. See the note above on why this is not a quality loss. */
export const MAX_EDGE_PIXELS = 2048;

export type CompressionAttempt = { maxEdge: number; quality: number };

/**
 * The ladder of attempts, easiest first.
 *
 * Quality moves before size: dropping to 0.8 WebP is invisible on a photograph,
 * while dropping resolution is the first thing a person notices. Only when
 * quality alone cannot reach the target does the long edge come down, and even
 * the last rung (1280 px) is larger than any place this image is displayed.
 */
export function compressionLadder(): CompressionAttempt[] {
  return [
    { maxEdge: MAX_EDGE_PIXELS, quality: 0.9 },
    { maxEdge: MAX_EDGE_PIXELS, quality: 0.82 },
    { maxEdge: MAX_EDGE_PIXELS, quality: 0.74 },
    { maxEdge: 1600, quality: 0.78 },
    { maxEdge: 1280, quality: 0.75 },
  ];
}

/**
 * Fit within a square of `maxEdge` without changing the aspect ratio, and never
 * scale UP -- enlarging a small picture adds bytes and blur and no information.
 */
export function fitWithin(width: number, height: number, maxEdge: number) {
  if (width <= 0 || height <= 0) {
    return { width: 0, height: 0 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxEdge) {
    return { width, height };
  }
  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/**
 * The name the re-encoded file must carry.
 *
 * This is not cosmetic. The API checks that the extension matches the actual
 * image signature, so a WebP posted as `photo.jpg` is rejected as a mismatched
 * format -- which would look, to the user, exactly like the upload being broken
 * again.
 */
export function compressedFileName(originalName: string, mimeType: string) {
  const extension = mimeType === "image/webp" ? "webp" : "jpg";
  const base = (originalName || "rasm").replace(/\.[^./\\]*$/, "").trim() || "rasm";
  return `${base}.${extension}`;
}

/** PDFs and anything non-image pass through untouched. */
export function isCompressibleImage(file: { type?: string; name?: string }) {
  const type = (file.type || "").toLowerCase();
  if (type.startsWith("image/")) {
    return type !== "image/gif" && type !== "image/svg+xml";
  }
  // iOS sometimes hands over an empty or generic type; fall back to the name.
  const extension = (file.name || "").split(".").pop()?.toLowerCase() ?? "";
  return ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension);
}

/** Nothing to gain from re-encoding something already small enough. */
export function shouldCompress(file: { size: number; type?: string; name?: string }) {
  return isCompressibleImage(file) && file.size > COMPRESSION_TARGET_BYTES;
}

export function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Whether this browser can *encode* WebP, which is not the same question as
 * whether it can display it: Safari has shown WebP since 14 but only started
 * writing it from canvas in 16.4. Asking the wrong question here produces an
 * empty blob on older iPhones, so it is measured rather than assumed.
 */
function canEncodeWebp() {
  try {
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    return probe.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
}

async function decode(file: File) {
  // `from-image` matters more than it looks: phone cameras record rotation in
  // EXIF rather than in the pixels, and a canvas that ignores it produces a
  // sideways portrait. createImageBitmap honours it; the <img> fallback is for
  // browsers without the option.
  try {
    return await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.decoding = "sync";
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("decode failed"));
        image.src = url;
      });
      return image;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function draw(source: CanvasImageSource, width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2d context unavailable");
  }
  // Best available resampling: the difference on a downscale of this size is
  // visible, and blur is the one thing we are not willing to trade away.
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return canvas;
}

function encode(canvas: HTMLCanvasElement, mimeType: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

export type CompressionResult = {
  file: File;
  originalBytes: number;
  compressed: boolean;
};

/**
 * Re-encode `file` down towards COMPRESSION_TARGET_BYTES, and return the
 * original untouched if that is already the better answer.
 *
 * Never throws for a picture it cannot read: an undecodable file (a HEIC on a
 * browser with no HEIC support, say) comes back as-is, and the caller's own
 * size check decides whether to accept it. Failing closed here would turn a
 * browser limitation into "the upload is broken".
 */
export async function compressImage(file: File): Promise<CompressionResult> {
  const unchanged = { file, originalBytes: file.size, compressed: false };
  if (!shouldCompress(file)) {
    return unchanged;
  }

  let source: CanvasImageSource & { width: number; height: number };
  try {
    source = (await decode(file)) as CanvasImageSource & { width: number; height: number };
  } catch {
    return unchanged;
  }

  const mimeType = canEncodeWebp() ? "image/webp" : "image/jpeg";
  let best: Blob | null = null;

  try {
    for (const attempt of compressionLadder()) {
      const { width, height } = fitWithin(source.width, source.height, attempt.maxEdge);
      if (!width || !height) {
        break;
      }
      const blob = await encode(draw(source, width, height), mimeType, attempt.quality);
      if (!blob || blob.size === 0) {
        continue;
      }
      // Keep the smallest thing produced so far, so a browser that ignores the
      // quality argument still yields the best of the attempts rather than the
      // last one.
      if (!best || blob.size < best.size) {
        best = blob;
      }
      if (blob.size <= COMPRESSION_TARGET_BYTES) {
        break;
      }
    }
  } finally {
    if ("close" in source && typeof source.close === "function") {
      source.close();
    }
  }

  // Re-encoding can enlarge an already-optimised file; in that case the original
  // is simply the better upload.
  if (!best || best.size >= file.size) {
    return unchanged;
  }

  return {
    file: new File([best], compressedFileName(file.name, mimeType), {
      type: mimeType,
      lastModified: Date.now(),
    }),
    originalBytes: file.size,
    compressed: true,
  };
}
