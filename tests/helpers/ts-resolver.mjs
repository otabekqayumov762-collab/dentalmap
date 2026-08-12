/**
 * Extensionless-import resolver for `node --test`.
 *
 * The app's own modules import each other the way TypeScript and Next resolve
 * them — `import { formatUzDate } from "../lib/date"` — which Node's ESM
 * resolver rejects. Tests that want to exercise a real module (rather than a
 * hand-copied duplicate of its logic) need that gap closed, so this hook retries
 * a failed relative specifier with the TypeScript extensions.
 *
 * Registered from the test file via `module.register`, so it only ever affects
 * the test process.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".") || !context.parentURL) {
      throw error;
    }
    for (const suffix of SUFFIXES) {
      const candidate = new URL(specifier + suffix, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return nextResolve(specifier + suffix, context);
      }
    }
    throw error;
  }
}
