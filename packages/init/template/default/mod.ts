/**
 * Curio app entrypoint surface.
 *
 * @remarks
 * Re-export the assembled API and server helpers so tests and embedding code
 * can import the generated app without reaching into `src/` directly.
 */
export { httpApi } from "@/http/api/index.ts";
export { createHttpServer, startHttpServer } from "@/http/server.ts";
