/**
 * Deprecated. The unified runner was split into per-game entries (see
 * `src/entries/*` + their HTML pages) and a launcher (`src/launcher.ts`).
 *
 * This file is no longer referenced by any HTML entry and is kept only as a
 * safe redirect in case something still loads `/src/main.ts` directly.
 */
if (typeof location !== "undefined") {
  location.replace("./index.html");
}

export {};
