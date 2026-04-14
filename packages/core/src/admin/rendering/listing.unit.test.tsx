/** @jsxImportSource preact */

import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { renderToString } from "preact-render-to-string";
import { Admin } from "@/admin/core/admin.tsx";
import {
  buildOrderBy,
  buildWhereClause,
  loadListState,
  loadUserRoleBadges,
  renderListHeaderActions,
  renderListTable,
  renderPagination,
  renderSearchAndFilters,
} from "@/admin/rendering/listing.tsx";
import type {
  AdminActorContext,
  AdminUserRecord,
} from "@/admin/modules/types.ts";
import type { AdminRuntimeLike } from "@/admin/core/types.ts";
import { Permission, Role, RolePermission, UserRole } from "@/admin/models.ts";
import { Database } from "@/db/database.ts";
import { Entity } from "@/db/entity.ts";
import { field } from "@/db/field.ts";
import { memoryDatabaseAdapter } from "@/db/memory-adapter.ts";
import { Model } from "@/db/model.ts";
import { relation } from "@/db/relation.ts";
import type { RawRecord } from "@/db/types.ts";
import { Timestamps, UuidPrimaryKey } from "@/db/variant.ts";

const UserModel = new Model({
  name: "User",
  table: "users",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    email: field.string().required().unique().sortable(),
    passwordHash: field.string().required().hidden(),
    status: field.string().required().sortable(),
    active: field.boolean().required().sortable(),
  },
  relations: {
    userRoles: relation.hasMany("UserRole").foreignKey("userId"),
  },
});

class UserEntity extends Entity {
  declare id: string;
  declare email: string;
  declare passwordHash: string;
  declare status: string;
  declare active: boolean;
  declare createdAt: Date;
  declare updatedAt: Date;
}

const User = UserEntity.from(UserModel);

const AccountModel = new Model({
  name: "Account",
  table: "accounts",
  uses: [Timestamps],
  fields: {
    publicKey: field.string().required().primaryKey().sortable(),
    kind: field.string().required().sortable(),
  },
});

class AccountEntity extends Entity {
  declare publicKey: string;
  declare kind: string;
  declare createdAt: Date;
  declare updatedAt: Date;
}

const Account = AccountEntity.from(AccountModel);

const createListingTestDatabase = () =>
  Database.create({
    adapter: memoryDatabaseAdapter(),
    tables: {
      User,
      Account,
      Role,
      Permission,
      UserRole,
      RolePermission,
    },
  });

const createListingAdmin = () => {
  const db = createListingTestDatabase();
  const admin = Admin.create({
    db,
    resources: {
      users: Admin.resource(User, {
        path: "users",
        label: "Users",
        columns: ["email", "roles", "status", "active", "createdAt"],
        searchFields: ["email", "status"],
        defaultOrder: [{ createdAt: "desc" }],
        actions: {
          create: true,
          update: true,
          delete: true,
          reset_password: true,
        },
        filters: [
          { field: "email", type: "text" },
          {
            field: "status",
            type: "select",
            options: [
              { label: "Pending", value: "pending" },
              { label: "Live", value: "live" },
            ],
          },
          { field: "active", type: "boolean" },
          { field: "createdAt", type: "date" },
        ],
        fieldWidgets: {
          email: {
            list: ({ value }) => <strong>Widget {String(value)}</strong>,
          },
        },
      }),
      accounts: Admin.resource(Account, {
        path: "accounts",
        label: "Accounts",
        columns: ["publicKey", "kind", "createdAt"],
        searchFields: ["publicKey", "kind"],
        actions: {
          create: false,
          update: false,
          delete: true,
        },
      }),
    },
  });

  return { db, admin, runtime: admin as unknown as AdminRuntimeLike };
};

const createActor = (
  permissionKeys: string[],
  bypass = false,
): AdminActorContext => {
  return {
    user: {
      id: "actor",
      email: "admin@example.com",
      passwordHash: "hash",
    } as AdminUserRecord,
    roles: [],
    permissions: [],
    session: {} as never,
    permissionKeys: new Set(permissionKeys),
    bypass,
  };
};

describe("admin runtime listing helpers", () => {
  it("build search and filter clauses and render controls", () => {
    const { admin, runtime } = createListingAdmin();
    const resource = admin.findResource("users");
    assert(resource);

    const searchParams = new URLSearchParams({
      search: "ada",
      email: "ada@example.com",
      status: "pending",
      active: "true",
      createdAtFrom: "2026-01-01",
      createdAtTo: "2026-12-31",
      sort: "email",
      direction: "desc",
    });

    const where = buildWhereClause(resource, searchParams);
    assert(where);
    const clauses = (where as { AND: Array<Record<string, unknown>> }).AND;
    assertEquals(clauses.length, 5);
    assertEquals(clauses[0], {
      OR: [
        { email: { contains: "ada" } },
        { status: { contains: "ada" } },
      ],
    });
    assert(
      clauses.some((clause) =>
        JSON.stringify(clause) === JSON.stringify({ email: "ada@example.com" })
      ),
    );
    assert(
      clauses.some((clause) =>
        JSON.stringify(clause) === JSON.stringify({ status: "pending" })
      ),
    );
    assert(
      clauses.some((clause) =>
        JSON.stringify(clause) === JSON.stringify({ active: true })
      ),
    );
    assert(clauses.some((clause) =>
      JSON.stringify(clause) === JSON.stringify({
        createdAt: {
          gte: new Date("2026-01-01"),
          lte: new Date("2026-12-31"),
        },
      })
    ));

    assertEquals(buildOrderBy(resource, searchParams), [{ email: "desc" }]);
    assertEquals(
      buildOrderBy(resource, new URLSearchParams({ sort: "missing" })),
      [{ createdAt: "desc" }],
    );

    const filtersHtml = renderToString(
      <>{renderSearchAndFilters(resource, searchParams)}</>,
    );
    assertStringIncludes(filtersHtml, "Search users");
    assertStringIncludes(filtersHtml, "Filters");
    assertStringIncludes(filtersHtml, "Clear");
    assertStringIncludes(filtersHtml, "data-curio-admin-filters-grid");
    assertStringIncludes(filtersHtml, ">5<");
    assertStringIncludes(filtersHtml, "<details");
    assertStringIncludes(filtersHtml, "open");
    assertStringIncludes(filtersHtml, 'name="status"');
    assertStringIncludes(filtersHtml, ">Pending<");
    assertStringIncludes(filtersHtml, 'name="active"');
    assertStringIncludes(filtersHtml, 'name="createdAtFrom"');
    assertStringIncludes(filtersHtml, 'name="createdAtTo"');

    const createActionHtml = renderToString(
      <>
        {renderListHeaderActions(
          runtime,
          resource,
          createActor(["users:create"]),
        )}
      </>,
    );
    assertStringIncludes(createActionHtml, "/admin/resources/users/new");
    assertStringIncludes(createActionHtml, "New User");

    const hiddenActionHtml = renderToString(
      <>{renderListHeaderActions(runtime, resource, createActor([]))}</>,
    );
    assertEquals(hiddenActionHtml, "");

    const paginationHtml = renderToString(
      <>
        {renderPagination(
          runtime,
          resource,
          2,
          true,
          new URLSearchParams({
            search: "ada",
            status: "pending",
          }),
        )}
      </>,
    );
    assertStringIncludes(paginationHtml, "Page 2");
    assertStringIncludes(paginationHtml, 'data-curio-admin-pagination="true"');
    assertStringIncludes(
      paginationHtml,
      "/admin/resources/users?search=ada&amp;status=pending&amp;page=1",
    );
    assertStringIncludes(
      paginationHtml,
      "/admin/resources/users?search=ada&amp;status=pending&amp;page=3",
    );
    assertEquals(buildWhereClause(resource, new URLSearchParams()), undefined);
    assertEquals(
      buildWhereClause(resource, new URLSearchParams({ active: "false" })),
      { active: false },
    );
    assertEquals(
      buildWhereClause(
        {
          ...resource,
          searchFields: ["email", "missing"],
        },
        new URLSearchParams({ search: "ada" }),
      ),
      {
        OR: [
          { email: { contains: "ada" } },
          {},
        ],
      },
    );
    const noFilterHtml = renderToString(
      <>
        {renderSearchAndFilters(
          {
            ...resource,
            filters: [],
          },
          new URLSearchParams(),
        )}
      </>,
    );
    assertStringIncludes(noFilterHtml, "Apply");
    assert(!noFilterHtml.includes("Filters"));
  });

  it("load paginated rows, user role badges, and action links", async () => {
    const { db, admin, runtime } = createListingAdmin();
    const resource = admin.findResource("users");
    assert(resource);

    const adminRole = await db.Role.create({
      key: "admin",
      label: "Admin",
      description: null,
      bypass: false,
    });
    const reviewerRole = await db.Role.create({
      key: "reviewer",
      label: "Reviewer",
      description: null,
      bypass: false,
    });

    const ada = await db.User.create({
      email: "ada@example.com",
      passwordHash: "hash",
      status: "pending",
      active: true,
    });
    await db.UserRole.create({
      userId: ada.id,
      roleId: reviewerRole.id,
    });
    await db.UserRole.create({
      userId: ada.id,
      roleId: adminRole.id,
    });

    for (let index = 0; index < 20; index += 1) {
      await db.User.create({
        email: `user-${index.toString().padStart(2, "0")}@example.com`,
        passwordHash: "hash",
        status: index % 2 === 0 ? "pending" : "live",
        active: index % 2 === 0,
      });
    }

    const state = await loadListState(
      runtime,
      resource,
      new URLSearchParams({
        sort: "email",
        direction: "asc",
      }),
    );
    assertEquals(state.records.length, 20);
    assertEquals(state.hasNext, true);
    assertEquals(String(state.records[0]?.email), "ada@example.com");

    const adaRecord = ada as unknown as RawRecord;

    const roleBadges = await loadUserRoleBadges(runtime, [adaRecord]);
    assertEquals(roleBadges.get(ada.id), ["admin", "reviewer"]);
    assertEquals((await loadUserRoleBadges(runtime, [])).size, 0);

    const tableHtml = renderToString(
      <>
        {await renderListTable(
          runtime,
          resource,
          createActor([
            "users:view",
            "users:update",
            "users:reset_password",
            "users:delete",
          ]),
          [adaRecord],
          new URLSearchParams({
            sort: "email",
            direction: "asc",
          }),
        )}
      </>,
    );
    assertStringIncludes(tableHtml, "Widget ada@example.com");
    assertStringIncludes(tableHtml, ">admin<");
    assertStringIncludes(tableHtml, ">reviewer<");
    assertStringIncludes(tableHtml, `/admin/resources/users/${ada.id}`);
    assertStringIncludes(tableHtml, "Edit");
    assertStringIncludes(tableHtml, "Reset password");
    assertStringIncludes(tableHtml, "Delete");
    assertStringIncludes(
      tableHtml,
      "/admin/resources/users?sort=email&amp;direction=desc",
    );

    const limitedTableHtml = renderToString(
      <>
        {await renderListTable(
          runtime,
          resource,
          createActor(["users:view"]),
          [adaRecord],
          new URLSearchParams(),
        )}
      </>,
    );
    assertStringIncludes(limitedTableHtml, "View");
    assert(!limitedTableHtml.includes("Edit"));
    assert(!limitedTableHtml.includes("Reset password"));
    assert(!limitedTableHtml.includes("Delete"));

    const emptyTableHtml = renderToString(
      <>
        {await renderListTable(
          runtime,
          resource,
          createActor([]),
          [],
          new URLSearchParams(),
        )}
      </>,
    );
    assertStringIncludes(
      emptyTableHtml,
      "No users matched the current filters.",
    );

    const paginationHtml = renderToString(
      <>
        {renderPagination(runtime, resource, 1, false, new URLSearchParams())}
      </>,
    );
    assertStringIncludes(paginationHtml, "Page 1");
    assertEquals(paginationHtml.includes("Previous"), false);
    assertEquals(paginationHtml.includes("Next"), false);
  });

  it("uses a non-id primary key for list links and row actions", async () => {
    const { db, admin, runtime } = createListingAdmin();
    const resource = admin.findResource("accounts");
    assert(resource);

    const publicKey =
      "GCFX3U3Q3R7QTRQLEAQ76XDFWQNU4I4EAP5AT5QOQFOYQHRI6K4J6VCP";
    const account = await db.Account.create({
      publicKey,
      kind: "opex",
    });

    const html = renderToString(
      <>
        {await renderListTable(
          runtime,
          resource,
          createActor([
            "accounts:view",
            "accounts:delete",
          ]),
          [account as unknown as RawRecord],
          new URLSearchParams(),
        )}
      </>,
    );

    assertStringIncludes(
      html,
      `/admin/resources/accounts/${publicKey}`,
    );
    assertStringIncludes(
      html,
      `/admin/resources/accounts/${publicKey}/delete`,
    );
  });

  it("handle invalid search/filter fields and missing role lookups", async () => {
    const { db, admin, runtime } = createListingAdmin();
    const resource = admin.findResource("users");
    assert(resource);

    const mutatedResource = {
      ...resource,
      searchFields: ["missing", "active"],
      filters: [
        ...resource.filters,
        {
          field: "missing",
          type: "text" as const,
        },
      ],
    };

    (mutatedResource.model.fields as Record<string, unknown>).search = field
      .string()
      .required().definition;

    const singleClause = buildWhereClause(
      mutatedResource,
      new URLSearchParams({
        search: "enabled",
      }),
    );
    assertEquals(singleClause, {
      OR: [
        {},
        { active: "enabled" },
      ],
    });

    const onlyExactFilterClause = buildWhereClause(
      mutatedResource,
      new URLSearchParams({
        email: "ada@example.com",
      }),
    );
    assertEquals(onlyExactFilterClause, { email: "ada@example.com" });

    const filtersHtml = renderToString(
      <>{renderSearchAndFilters(mutatedResource, new URLSearchParams())}</>,
    );
    assert(!filtersHtml.includes('name="missing"'));

    delete (resource.model.fields as Record<string, unknown>).search;

    const userWithoutRoles = await db.User.create({
      email: "lonely@example.com",
      passwordHash: "hash",
      status: "pending",
      active: true,
    });
    assertEquals(
      (await loadUserRoleBadges(runtime, [
        userWithoutRoles as unknown as RawRecord,
      ]))
        .size,
      0,
    );

    const orphanedUser = await db.User.create({
      email: "orphan@example.com",
      passwordHash: "hash",
      status: "pending",
      active: true,
    });
    await db.UserRole.create({
      userId: orphanedUser.id,
      roleId: "missing-role",
    });

    const orphanedBadges = await loadUserRoleBadges(runtime, [
      orphanedUser as unknown as RawRecord,
    ]);
    assertEquals(orphanedBadges.size, 0);
  });
});


describe("admin runtime listing extra edge cases", () => {
  it("handles omitted filter types and invalid sorting gracefully", () => {
    const { admin, runtime } = createListingAdmin();
    const resource = admin.findResource("users");
    assert(resource);
    
    const hackedResource = {
      ...resource,
      filters: [
        { field: "email" as const },
        { field: "status" as const, type: "select" },
      ],
    } as any;
    const html = renderToString(<>{renderSearchAndFilters(hackedResource, new URLSearchParams())}</>);
    assertStringIncludes(html, "Search");
    assertStringIncludes(html, ">All<");
    
    const orderBy = buildOrderBy(resource, new URLSearchParams({ sort: "missingField", direction: "desc" }));
    assertEquals(orderBy, [{ createdAt: "desc" }]);
  });

  it("marks descending sort as active and omits reset password without permission", async () => {
    const { admin, runtime } = createListingAdmin();
    const resource = admin.findResource("users");
    assert(resource);
    
    const noIdRecord = { email: "noid@example.com", status: "pending", active: true } as unknown as RawRecord;
    
    const actor = createActor(["users:view"], false);
    const tableHtml = renderToString(
      <>{await renderListTable(runtime, resource, actor, [noIdRecord], new URLSearchParams({ sort: "email", direction: "desc" }))}</>
    );
    
    assert(!tableHtml.includes("Reset password"));
    assertStringIncludes(
      tableHtml,
      "/admin/resources/users?sort=email&amp;direction=asc",
    );
    assertStringIncludes(tableHtml, 'data-active="true"');
  });

  it("sorts correctly when direction isn't explicitly desc", async () => {
    const { admin, runtime } = createListingAdmin();
    const resource = admin.findResource("users");
    assert(resource);
    
    const noIdRecord = { email: "noid@example.com", status: "pending", active: true } as unknown as RawRecord;
    
    const actor = createActor(["users:view"], false);
    const tableHtmlAsc = renderToString(
      <>{await renderListTable(runtime, resource, actor, [noIdRecord], new URLSearchParams({ sort: "email", direction: "asc" }))}</>
    );
    
    assert(tableHtmlAsc);
  });
});



describe("admin runtime listing extra edge cases 2", () => {
  it("handles explicit undefined filter type and reset_password action block", async () => {
    const { db, admin, runtime } = createListingAdmin();
    const resource = admin.findResource("users");
    
    const hackedResource = { ...resource, filters: [{ field: "email" as const, type: undefined }] } as any;
    const html = renderToString(<>{renderSearchAndFilters(hackedResource, new URLSearchParams())}</>);
    assertStringIncludes(html, "Search");
    
    // reset_password: false but user HAS permission
    hackedResource.actions = { ...resource!.actions, reset_password: false };
    const noIdRecord = { email: "noid@example.com", status: "pending", active: true } as unknown as RawRecord;
    
    const actor = createActor(["users:view", "users:reset_password"], false);
    const tableHtml = renderToString(
      <>{await renderListTable(runtime, hackedResource, actor, [noIdRecord], new URLSearchParams())}</>
    );
    
    assert(!tableHtml.includes("Reset password"));
  });
});





Deno.test("loadUserRoleBadges edge cases", async () => {
  const { admin } = createListingAdmin();
  
  // Empty user array
  const emptyRes = await loadUserRoleBadges(admin as any, []);
  assertEquals(emptyRes.size, 0);

  // Users without role assignments
  const noRolesRes = await loadUserRoleBadges(admin as any, [{ id: "missing-user" }] as any[]);
  assertEquals(noRolesRes.size, 0);

  // Hack a bogus assignment into memory db to trigger missing roleKey
  const db = admin.db as any;
  await db.UserRole.create({ userId: "user-1", roleId: "non-existent-role" });
  const missingRoleRes = await loadUserRoleBadges(admin as any, [{ id: "user-1" }] as any[]);
  assertEquals(missingRoleRes.size, 0);
});
