import type { RouteSegment } from "@curio/sdk";
import { Route } from "@curio/sdk/http/oak";
import type { OakHttpContext } from "@curio/sdk/http/oak";
import { healthGet } from "@/http/api/health/get.ts";

export const healthRoute: RouteSegment<OakHttpContext> = Route("health", {
  GET: healthGet,
});
