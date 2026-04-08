import { assertEquals } from "@std/assert";
import { Route } from "@/api/route.ts";

Deno.test("Route builds a segment node with methods and children", () => {
  const childRoute = Route(":id");
  const handler = () => {};
  const route = Route("transactions", {
    GET: handler,
    children: [childRoute],
  });

  assertEquals(route.pathSegment, "transactions");
  assertEquals(route.GET, handler);
  assertEquals(route.children, [childRoute]);
});
