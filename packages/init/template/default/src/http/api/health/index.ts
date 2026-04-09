import type { RouteSegment } from "@curio/core";
import { Route } from "@curio/core/http/oak";
import type { OakHttpContext } from "@curio/core/http/oak";
import { healthGet } from "@/http/api/health/get.ts";

export const healthRoute: RouteSegment<OakHttpContext> = Route("health", {
  GET: healthGet,
});
