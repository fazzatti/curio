import type { RouteSegment } from "@curio/core";
import type { Router } from "@oak/oak";
import { API } from "@curio/core/http/oak";
import type { OakHttpContext } from "@curio/core/http/oak";
import { healthRoute } from "@/http/api/health/index.ts";
import { usersRoute } from "@/http/api/users/index.ts";

export const httpRoutes: RouteSegment<OakHttpContext>[] = [
  healthRoute,
  usersRoute,
];

export const httpApi: Router = API.from(httpRoutes);
