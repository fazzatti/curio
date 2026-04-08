import type { RouteSegment } from "@curio/sdk";
import { Route } from "@curio/sdk/http/oak";
import type { OakHttpContext } from "@curio/sdk/http/oak";
import { usersGet } from "@/http/api/users/get.ts";

export const usersRoute: RouteSegment<OakHttpContext> = Route("users", {
  GET: usersGet,
});
