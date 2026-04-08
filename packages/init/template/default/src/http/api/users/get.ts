import * as v from "@valibot/valibot";
import type { RouteMethodOperation } from "@curio/sdk";
import { GET } from "@curio/sdk/http/oak";
import {
  DEFAULT_ROLE_KEYS,
  loadUserRoles,
} from "@curio/sdk/admin/modules/rbac";
import type { OakHttpContext } from "@curio/sdk/http/oak";
import { db } from "@/db/index.ts";

export const usersGet: RouteMethodOperation<"GET", OakHttpContext> = GET({
  responseSchema: v.object({
    users: v.array(v.object({
      id: v.string(),
      email: v.string(),
      roles: v.array(v.string()),
      isSuperAdmin: v.boolean(),
      createdAt: v.string(),
      updatedAt: v.string(),
    })),
  }),
  handler: async () => {
    const users = await db.User.findMany();
    const usersWithRoles = await Promise.all(
      users.map(async (user) => {
        const roles = await loadUserRoles(db, user.id);
        const roleKeys = roles.map((role) => role.key);

        return {
          id: user.id,
          email: user.email,
          roles: roleKeys,
          isSuperAdmin: roleKeys.includes(DEFAULT_ROLE_KEYS.superadmin),
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        };
      }),
    );

    return {
      payload: {
        users: usersWithRoles,
      },
    };
  },
});
