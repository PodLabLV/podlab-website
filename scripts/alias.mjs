// Node module-resolution hook for running app code outside Next:
//   node --experimental-strip-types --import ./scripts/alias.mjs script.ts
// Maps "@/x" → ./x and lets extensionless relative imports resolve to .ts/.tsx,
// which the bundler-style tsconfig allows but Node's ESM loader does not.

import { dirname, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { register } from "node:module";

const ROOT = resolvePath(dirname(fileURLToPath(import.meta.url)), "..");

register(
  new URL(`data:text/javascript,${encodeURIComponent(`
    import { existsSync } from "node:fs";
    import { dirname, resolve as resolvePath } from "node:path";
    import { fileURLToPath, pathToFileURL } from "node:url";
    const ROOT = ${JSON.stringify(ROOT)};
    const EXTS = [".ts", ".tsx", ".mts", "/index.ts"];
    function withExt(p) {
      if (existsSync(p) && !p.endsWith("/")) return p;
      for (const e of EXTS) if (existsSync(p + e)) return p + e;
      return null;
    }
    export async function resolve(specifier, context, next) {
      if (specifier.startsWith("@/")) {
        const hit = withExt(resolvePath(ROOT, specifier.slice(2)));
        if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
      }
      if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
        const base = dirname(fileURLToPath(context.parentURL));
        const hit = withExt(resolvePath(base, specifier));
        if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true };
      }
      return next(specifier, context);
    }
  `)}`),
  import.meta.url,
);
