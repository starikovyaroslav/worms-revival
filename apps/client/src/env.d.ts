/// <reference types="vite/client" />

/** Injected by vite.config.ts: unique per build, used to bust asset caches. */
declare const __BUILD_ID__: string;

/** True in `vite --mode e2e` builds: `window.__game` stays available outside dev. */
declare const __E2E__: boolean;
