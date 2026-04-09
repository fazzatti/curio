import * as v from "@valibot/valibot";
import type { RouteMethodOperation } from "@curio/core";
import { GET } from "@curio/core/http/oak";
import type { OakHttpContext } from "@curio/core/http/oak";
import { getAppHealthSnapshot } from "@/http/health/state.ts";

export const healthGet: RouteMethodOperation<"GET", OakHttpContext> = GET({
  responseSchema: v.object({
    status: v.picklist(["starting", "ready", "stopping", "stopped"]),
    healthy: v.boolean(),
    uptimeMs: v.number(),
    timestamp: v.string(),
  }),
  handler: () => {
    return {
      payload: getAppHealthSnapshot(),
    };
  },
});
