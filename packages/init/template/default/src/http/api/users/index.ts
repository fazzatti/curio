import type { RouteSegment } from "@curio/core";
import { Route } from "@curio/core/http/oak";
import type { OakHttpContext } from "@curio/core/http/oak";
import { usersGet } from "@/http/api/users/get.ts";

export const usersRoute: RouteSegment<OakHttpContext> = Route("users", {
  GET: usersGet,
});
