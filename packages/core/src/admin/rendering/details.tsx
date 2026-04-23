/** @jsxImportSource preact */

// deno-coverage-ignore-start
import type { ComponentChildren } from "preact";
import { hasAdminPermission } from "@/admin/modules.ts";
import type {
  AdminActorContext,
  AdminAuditEventRecord,
  AdminNormalizedResource,
  AdminRuntimeLike,
} from "@/admin/core/types.ts";
import {
  formatDateTime,
  formatRecordValue,
  getDisplayFieldNames,
  getFieldLabel,
  getRecordId,
  humanize,
  resolveWidgetOverride,
  toQueryString,
} from "@/admin/support/utils.tsx";
import type { RawRecord } from "@/db/types.ts";
import { loadUserRoleBadges } from "@/admin/rendering/listing.tsx";
// deno-coverage-ignore-stop

export const renderDetailHeaderActions = (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  actor: AdminActorContext,
  id: string,
): ComponentChildren => {
  const actions: ComponentChildren[] = [];

  if (
    resource.actions.update &&
    hasAdminPermission(actor, `${resource.slug}:update`)
  ) {
    actions.push(
      <a
        href={admin.getResourceEditPath(resource, id)}
        data-curio-admin-button
      >
        Edit
      </a>,
    );
  }

  if (
    resource.actions.reset_password &&
    hasAdminPermission(actor, `${resource.slug}:reset_password`)
  ) {
    actions.push(
      <a
        href={admin.getResourceResetPasswordPath(resource, id)}
        data-curio-admin-button
      >
        Reset password
      </a>,
    );
  }

  if (
    resource.actions.delete &&
    hasAdminPermission(actor, `${resource.slug}:delete`)
  ) {
    actions.push(
      <a
        href={admin.getResourceDeletePath(resource, id)}
        data-curio-admin-button
        data-variant="danger"
      >
        Delete
      </a>,
    );
  }

  return <>{actions}</>;
};

export const renderDetailPrimary = async (
  admin: AdminRuntimeLike,
  actor: AdminActorContext,
  resource: AdminNormalizedResource,
  record: RawRecord,
): Promise<ComponentChildren> => {
  const displayFields = getDisplayFieldNames(resource);
  const recordId = getRecordId(resource, record);
  const roleMap = resource.kind === "users"
    ? await loadUserRoleBadges(admin, [record])
    : new Map<string, string[]>();

  return (
    <dl data-curio-admin-kv>
      {resource.kind === "users"
        ? (
          <div data-curio-admin-kv-row>
            <dt>Roles</dt>
            <dd>
              <div data-curio-admin-badge-row>
                {(roleMap.get(recordId) ?? []).map((roleKey) => (
                  <span data-curio-admin-badge key={roleKey}>{roleKey}</span>
                ))}
              </div>
            </dd>
          </div>
        )
        : null}
      {await Promise.all(displayFields.map(async (fieldName) => {
        const field = resource.model.fields[fieldName];
        const widget = resolveWidgetOverride(
          resource,
          admin.fieldWidgets,
          fieldName,
          field,
        );
        const value = widget?.detail
          ? await widget.detail({
            mode: "detail",
            resourceKey: resource.slug,
            fieldName,
            field,
            record,
            value: record[fieldName],
            db: admin.db,
            actor,
          })
          : formatRecordValue(field, record[fieldName]);

        return (
          <div data-curio-admin-kv-row key={fieldName}>
            <dt>{getFieldLabel(resource, fieldName)}</dt>
            <dd>{value}</dd>
          </div>
        );
      }))}
    </dl>
  );
};

export const renderDetailSecondary = async (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  actor: AdminActorContext,
  record: RawRecord,
  recentAudit: AdminAuditEventRecord[],
): Promise<ComponentChildren> => {
  const children: ComponentChildren[] = [];

  const relationCard = await renderRelationSummaryCard(
    admin,
    resource,
    actor,
    record,
  );

  if (relationCard) {
    children.push(relationCard);
  }

  if (recentAudit.length > 0) {
    children.push(
      <section data-curio-admin-card>
        <div data-curio-admin-card-inner>
          <div data-curio-admin-title-block>
            <div data-curio-admin-kicker>Audit</div>
            <h2 data-curio-admin-title style={{ fontSize: "28px" }}>
              Recent history
            </h2>
          </div>
          <div data-curio-admin-grid style={{ marginTop: "14px" }}>
            {recentAudit.map((entry) => (
              <div data-curio-admin-flash key={entry.id}>
                <strong>{entry.eventType}</strong>
                <div>{entry.summary}</div>
                <div data-curio-admin-subtitle>
                  {formatDateTime(entry.createdAt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>,
    );
  }

  if (resource.kind === "audit" && record.payload) {
    children.push(
      <section data-curio-admin-card>
        <div data-curio-admin-card-inner>
          <div data-curio-admin-title-block>
            <div data-curio-admin-kicker>Payload</div>
            <h2 data-curio-admin-title style={{ fontSize: "28px" }}>
              Event payload
            </h2>
          </div>
          <pre>{JSON.stringify(record.payload, null, 2)}</pre>
        </div>
      </section>,
    );
  }

  return <>{children}</>;
};

export const renderRelationSummaryCard = async (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  actor: AdminActorContext,
  record: RawRecord,
): Promise<ComponentChildren> => {
  const items: ComponentChildren[] = [];

  for (
    const [relationName, relation] of Object.entries(resource.model.relations)
  ) {
    const targetResource = admin.resourceByModelName[relation.target];

    if (!targetResource) {
      continue;
    }

    if (relation.kind === "belongsTo") {
      if (!hasAdminPermission(actor, `${targetResource.slug}:view`)) {
        continue;
      }

      const foreignKeyValue = record[relation.foreignKey as string];

      if (!foreignKeyValue) {
        continue;
      }

      const targetRecord = await admin.getRepository(targetResource).findById(
        String(foreignKeyValue),
      ) as RawRecord | null;

      if (!targetRecord) {
        continue;
      }

      items.push(
        <div data-curio-admin-kv-row>
          <dt>{humanize(relationName)}</dt>
          <dd>
            <a
              href={admin.getResourceDetailPath(
                targetResource,
                getRecordId(targetResource, targetRecord),
              )}
            >
              {admin.getRecordTitle(targetResource, targetRecord)}
            </a>
          </dd>
        </div>,
      );
      continue;
    }

    if (!hasAdminPermission(actor, `${targetResource.slug}:list`)) {
      continue;
    }

    if (!relation.foreignKey) {
      continue;
    }

    const relatedRecords = await admin.getRepository(targetResource).findMany({
      where: {
        [relation.foreignKey]:
          record[relation.references ?? targetResource.model.primaryKey],
      },
    }) as unknown as RawRecord[];
    const filterParams = new URLSearchParams();
    filterParams.set(
      relation.foreignKey,
      String(record[relation.references ?? resource.model.primaryKey]),
    );
    items.push(
      <div data-curio-admin-kv-row>
        <dt>{humanize(relationName)}</dt>
        <dd>
          <div data-curio-admin-actions>
            <span data-curio-admin-badge>{relatedRecords.length}</span>
            <a
              href={`${admin.getResourcePath(targetResource)}${
                toQueryString(filterParams)
              }`}
            >
              View {targetResource.label.toLowerCase()}
            </a>
          </div>
        </dd>
      </div>,
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section data-curio-admin-card>
      <div data-curio-admin-card-inner>
        <div data-curio-admin-title-block>
          <div data-curio-admin-kicker>Relations</div>
          <h2 data-curio-admin-title style={{ fontSize: "28px" }}>
            Linked records
          </h2>
        </div>
        <dl data-curio-admin-kv style={{ marginTop: "16px" }}>
          {items}
        </dl>
      </div>
    </section>
  );
};
