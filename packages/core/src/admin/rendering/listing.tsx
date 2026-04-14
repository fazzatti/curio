/** @jsxImportSource preact */

// deno-coverage-ignore-start
import type { ComponentChildren } from "preact";
import { AdminIcon } from "@/admin/components/icons.tsx";
import { hasAdminPermission } from "@/admin/modules.ts";
import { getRoleRepo, getUserRoleRepo } from "@/admin/modules/repositories.ts";
import type {
  AdminActorContext,
  AdminDatabase,
  AdminNormalizedResource,
  AdminRuntimeLike,
} from "@/admin/core/types.ts";
import {
  cloneSearchParams,
  formatRecordValue,
  getFieldLabel,
  getRecordId,
  PAGE_SIZE,
  parsePage,
  parseScalarFieldValue,
  RESERVED_QUERY_KEYS,
  resolveWidgetOverride,
  toQueryString,
} from "@/admin/support/utils.tsx";
import type { RawRecord } from "@/db/types.ts";
// deno-coverage-ignore-stop

export const renderListHeaderActions = (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  actor: AdminActorContext,
): ComponentChildren => {
  if (
    !resource.actions.create ||
    !hasAdminPermission(actor, `${resource.slug}:create`)
  ) {
    return null;
  }

  return (
    <a
      href={admin.getResourceCreatePath(resource)}
      data-curio-admin-button
      data-variant="primary"
    >
      New {resource.model.labels.singular}
    </a>
  );
};

export const loadListState = async (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  searchParams: URLSearchParams,
): Promise<{ records: RawRecord[]; hasNext: boolean }> => {
  const repo = admin.getRepository(resource);
  const page = parsePage(searchParams.get("page"));
  const offset = (page - 1) * PAGE_SIZE;
  const where = buildWhereClause(resource, searchParams);
  const orderBy = buildOrderBy(resource, searchParams);
  const records = (await repo.findMany({
    where,
    orderBy,
    offset,
    limit: PAGE_SIZE + 1,
  })) as unknown as RawRecord[];

  const hasNext = records.length > PAGE_SIZE;

  return {
    records: hasNext ? records.slice(0, PAGE_SIZE) : records,
    hasNext,
  };
};

export const buildWhereClause = (
  resource: AdminNormalizedResource,
  searchParams: URLSearchParams,
): RawRecord | undefined => {
  const clauses: RawRecord[] = [];

  const search = searchParams.get("search")?.trim();

  if (search && resource.searchFields.length > 0) {
    clauses.push({
      OR: resource.searchFields.map((fieldName) => {
        const field = resource.model.fields[fieldName];

        if (!field) {
          return {};
        }

        if (
          field.kind === "string" || field.kind === "text" ||
          field.kind === "enum"
        ) {
          return { [fieldName]: { contains: search } };
        }

        return { [fieldName]: search };
      }),
    });
  }

  for (const [fieldName, field] of Object.entries(resource.model.fields)) {
    if (RESERVED_QUERY_KEYS.has(fieldName)) {
      continue;
    }

    const exactValue = searchParams.get(fieldName);

    if (exactValue) {
      const parsed = parseScalarFieldValue(field, exactValue);

      if (parsed !== undefined) {
        clauses.push({ [fieldName]: parsed });
      }
    }

    const filter = resource.filters.find((entry) => entry.field === fieldName);

    if (filter?.type === "date") {
      const fromValue = searchParams.get(`${fieldName}From`);
      const toValue = searchParams.get(`${fieldName}To`);
      const operator: Record<string, unknown> = {};

      if (fromValue) {
        operator.gte = new Date(fromValue);
      }

      if (toValue) {
        operator.lte = new Date(toValue);
      }

      if (Object.keys(operator).length > 0) {
        clauses.push({ [fieldName]: operator });
      }
    }
  }

  if (clauses.length === 0) {
    return undefined;
  }

  if (clauses.length === 1) {
    return clauses[0];
  }

  return {
    AND: clauses,
  };
};

export const buildOrderBy = (
  resource: AdminNormalizedResource,
  searchParams: URLSearchParams,
): Array<Record<string, "asc" | "desc">> | undefined => {
  const sortField = searchParams.get("sort");
  const direction = searchParams.get("direction") === "desc" ? "desc" : "asc";

  if (sortField && resource.model.fields[sortField]?.sortable) {
    return [{ [sortField]: direction }];
  }

  return resource.defaultOrder as
    | Array<Record<string, "asc" | "desc">>
    | undefined;
};

export const renderSearchAndFilters = (
  resource: AdminNormalizedResource,
  searchParams: URLSearchParams,
): ComponentChildren => {
  const controls = resource.filters.flatMap((filter) => {
    const field = resource.model.fields[filter.field];

    if (!field) {
      return [];
    }

    const label = filter.label ?? getFieldLabel(resource, filter.field);

    if (filter.type === "select") {
      const options = filter.options ?? [];
      return [
        (
          <div data-curio-admin-field>
            <label data-curio-admin-label htmlFor={`filter-${filter.field}`}>
              {label}
            </label>
            <select
              id={`filter-${filter.field}`}
              name={filter.field}
              data-curio-admin-select
            >
              <option value="">All</option>
              {options.map((option) => (
                <option
                  selected={searchParams.get(filter.field) === option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ),
      ];
    }

    if (filter.type === "boolean") {
      return [
        (
          <div data-curio-admin-field>
            <label data-curio-admin-label htmlFor={`filter-${filter.field}`}>
              {label}
            </label>
            <select
              id={`filter-${filter.field}`}
              name={filter.field}
              data-curio-admin-select
            >
              <option value="">All</option>
              <option
                selected={searchParams.get(filter.field) === "true"}
                value="true"
              >
                Yes
              </option>
              <option
                selected={searchParams.get(filter.field) === "false"}
                value="false"
              >
                No
              </option>
            </select>
          </div>
        ),
      ];
    }

    if (filter.type === "date") {
      return [
        (
          <div data-curio-admin-field>
            <label
              data-curio-admin-label
              htmlFor={`filter-${filter.field}-from`}
            >
              {label} from
            </label>
            <input
              id={`filter-${filter.field}-from`}
              type="date"
              name={`${filter.field}From`}
              value={searchParams.get(`${filter.field}From`) ?? ""}
              data-curio-admin-input
            />
          </div>
        ),
        (
          <div data-curio-admin-field>
            <label
              data-curio-admin-label
              htmlFor={`filter-${filter.field}-to`}
            >
              {label} to
            </label>
            <input
              id={`filter-${filter.field}-to`}
              type="date"
              name={`${filter.field}To`}
              value={searchParams.get(`${filter.field}To`) ?? ""}
              data-curio-admin-input
            />
          </div>
        ),
      ];
    }

    return [
      (
        <div data-curio-admin-field>
          <label data-curio-admin-label htmlFor={`filter-${filter.field}`}>
            {label}
          </label>
          <input
            id={`filter-${filter.field}`}
            name={filter.field}
            value={searchParams.get(filter.field) ?? ""}
            data-curio-admin-input
          />
        </div>
      ),
    ];
  });

  const activeFilterCount = resource.filters.reduce((count, filter) => {
    if ((filter.type ?? "text") === "date") {
      return count +
        (searchParams.get(`${filter.field}From`)?.trim() ? 1 : 0) +
        (searchParams.get(`${filter.field}To`)?.trim() ? 1 : 0);
    }

    return count + (searchParams.get(filter.field)?.trim() ? 1 : 0);
  }, 0);
  const hasActiveQuery = Boolean(searchParams.get("search")?.trim()) ||
    activeFilterCount > 0;

  return (
    <form method="get" data-curio-admin-search-panel>
      <div data-curio-admin-searchbar>
        <div data-curio-admin-field>
          <label data-curio-admin-label htmlFor="search">
            Search
          </label>
          <input
            id="search"
            name="search"
            value={searchParams.get("search") ?? ""}
            placeholder={`Search ${resource.label.toLowerCase()}`}
            data-curio-admin-input
          />
        </div>
      </div>
      {controls.length > 0
        ? (
          <details
            data-curio-admin-filters
            open={activeFilterCount > 0 ? true : undefined}
          >
            <summary data-curio-admin-filters-summary>
              <span>Filters</span>
              {activeFilterCount > 0
                ? (
                  <span data-curio-admin-badge data-tone="muted">
                    {activeFilterCount}
                  </span>
                )
                : null}
            </summary>
            <div data-curio-admin-filters-grid>
              {controls}
            </div>
          </details>
        )
        : null}
      <div data-curio-admin-actions data-curio-admin-search-actions>
        {hasActiveQuery
          ? (
            <a href="" data-curio-admin-button>
              Clear
            </a>
          )
          : null}
        <button data-curio-admin-button data-variant="primary" type="submit">
          Apply
        </button>
      </div>
    </form>
  );
};

export const renderListTable = async (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  actor: AdminActorContext,
  records: RawRecord[],
  searchParams: URLSearchParams,
): Promise<ComponentChildren> => {
  const TableCell = resource.components.TableCell ??
    admin.components.TableCell;
  const roleMap = resource.kind === "users"
    ? await loadUserRoleBadges(admin, records)
    : new Map<string, string[]>();
  const sortField = searchParams.get("sort");
  const sortDirection = searchParams.get("direction") === "desc"
    ? "desc"
    : "asc";

  return (
    <div data-curio-admin-table-wrap>
      <table data-curio-admin-table>
        <thead>
          <tr>
            {resource.columns.map((fieldName) => {
              const field = resource.model.fields[fieldName];
              const nextParams = cloneSearchParams(searchParams);
              const nextDirection =
                sortField === fieldName && sortDirection === "asc"
                  ? "desc"
                  : "asc";
              nextParams.set("sort", fieldName);
              nextParams.set("direction", nextDirection);

              return (
                <th key={fieldName}>
                  {field?.sortable
                    ? (
                      <a
                        href={`${admin.getResourcePath(resource)}${
                          toQueryString(nextParams)
                        }`}
                        data-curio-admin-sort-link
                        data-active={sortField === fieldName ? "true" : "false"}
                      >
                        <span>{getFieldLabel(resource, fieldName)}</span>
                        <span data-curio-admin-sort-icon>
                          <AdminIcon
                            name={sortField === fieldName
                              ? sortDirection === "desc"
                                ? "sort-desc"
                                : "sort-asc"
                              : "sort"}
                          />
                        </span>
                      </a>
                    )
                    : getFieldLabel(resource, fieldName)}
                </th>
              );
            })}
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0
            ? (
              <tr>
                <td colSpan={resource.columns.length + 1}>
                  <div data-curio-admin-empty>
                    No {resource.label.toLowerCase()}{" "}
                    matched the current filters.
                  </div>
                </td>
              </tr>
            )
            : await Promise.all(records.map(async (record) => {
              const recordId = getRecordId(resource, record);
              const cells = await Promise.all(
                resource.columns.map(async (fieldName) => {
                  const field = resource.model.fields[fieldName];
                  const widget = field
                    ? resolveWidgetOverride(
                      resource,
                      admin.fieldWidgets,
                      fieldName,
                      field,
                    )
                    : undefined;
                  let value: ComponentChildren;

                  if (resource.kind === "users" && fieldName === "roles") {
                    value = (
                      <div data-curio-admin-badge-row>
                        {(roleMap.get(recordId) ?? []).map((roleKey) => (
                          <span data-curio-admin-badge key={roleKey}>
                            {roleKey}
                          </span>
                        ))}
                      </div>
                    );
                  } else if (widget?.list && field) {
                    value = await widget.list({
                      mode: "list",
                      resourceKey: resource.slug,
                      fieldName,
                      field,
                      record,
                      value: record[fieldName],
                      db: admin.db,
                      actor,
                    });
                  } else {
                    value = formatRecordValue(field, record[fieldName]);
                  }

                  if (
                    fieldName === resource.model.primaryKey &&
                    recordId &&
                    resource.actions.view &&
                    hasAdminPermission(actor, `${resource.slug}:view`)
                  ) {
                    value = (
                      <a
                        href={admin.getResourceDetailPath(resource, recordId)}
                      >
                        {value}
                      </a>
                    );
                  }

                  return (
                    <td key={fieldName}>
                      <TableCell value={value} />
                    </td>
                  );
                }),
              );

              return (
                <tr key={recordId || admin.getRecordTitle(resource, record)}>
                  {cells}
                  <td>
                    <div data-curio-admin-actions>
                      {resource.actions.view &&
                          hasAdminPermission(actor, `${resource.slug}:view`)
                        ? (
                          <a
                            href={admin.getResourceDetailPath(
                              resource,
                              recordId,
                            )}
                            data-curio-admin-inline-action
                          >
                            View
                          </a>
                        )
                        : null}
                      {resource.actions.update &&
                          hasAdminPermission(actor, `${resource.slug}:update`)
                        ? (
                          <a
                            href={admin.getResourceEditPath(
                              resource,
                              recordId,
                            )}
                            data-curio-admin-inline-action
                          >
                            Edit
                          </a>
                        )
                        : null}
                      {resource.actions.reset_password &&
                          hasAdminPermission(
                            actor,
                            `${resource.slug}:reset_password`,
                          )
                        ? (
                          <a
                            href={admin.getResourceResetPasswordPath(
                              resource,
                              recordId,
                            )}
                            data-curio-admin-inline-action
                          >
                            Reset password
                          </a>
                        )
                        : null}
                      {resource.actions.delete &&
                          hasAdminPermission(actor, `${resource.slug}:delete`)
                        ? (
                          <a
                            href={admin.getResourceDeletePath(
                              resource,
                              recordId,
                            )}
                            data-curio-admin-inline-action
                            data-tone="danger"
                          >
                            Delete
                          </a>
                        )
                        : null}
                    </div>
                  </td>
                </tr>
              );
            }))}
        </tbody>
      </table>
    </div>
  );
};

export const renderPagination = (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  page: number,
  hasNext: boolean,
  searchParams: URLSearchParams,
): ComponentChildren => {
  const prevParams = cloneSearchParams(searchParams);
  prevParams.set("page", String(Math.max(1, page - 1)));
  const nextParams = cloneSearchParams(searchParams);
  nextParams.set("page", String(page + 1));

  return (
    <div data-curio-admin-toolbar data-curio-admin-pagination>
      <div data-curio-admin-subtitle>Page {page}</div>
      <div data-curio-admin-actions>
        {page > 1
          ? (
            <a
              href={`${admin.getResourcePath(resource)}${
                toQueryString(prevParams)
              }`}
              data-curio-admin-button
            >
              Previous
            </a>
          )
          : null}
        {hasNext
          ? (
            <a
              href={`${admin.getResourcePath(resource)}${
                toQueryString(nextParams)
              }`}
              data-curio-admin-button
              data-variant="primary"
            >
              Next
            </a>
          )
          : null}
      </div>
    </div>
  );
};

export const loadUserRoleBadges = async (
  admin: AdminRuntimeLike,
  records: RawRecord[],
): Promise<Map<string, string[]>> => {
  const userIds = records.map((record) => String(record.id)).filter(Boolean);

  if (userIds.length === 0) {
    return new Map();
  }

  const assignments = await getUserRoleRepo(
    admin.db as unknown as AdminDatabase,
  ).findMany({
    where: {
      userId: { in: userIds },
    },
  });
  const roleIds = [
    ...new Set(assignments.map((assignment) => assignment.roleId)),
  ];

  if (roleIds.length === 0) {
    return new Map();
  }

  const roles = await getRoleRepo(admin.db as unknown as AdminDatabase)
    .findMany({
      where: {
        id: { in: roleIds },
      },
    });
  const roleKeyById = new Map(roles.map((role) => [role.id, role.key]));
  const result = new Map<string, string[]>();

  for (const assignment of assignments) {
    const roleKey = roleKeyById.get(assignment.roleId);

    if (!roleKey) {
      continue;
    }

    const existing = result.get(assignment.userId) ?? [];
    existing.push(roleKey);
    result.set(assignment.userId, existing.sort());
  }

  return result;
};
