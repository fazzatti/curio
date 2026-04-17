/** @jsxImportSource preact */

// deno-coverage-ignore-start
import type { ComponentChildren } from "preact";
import { hashPassword } from "@/auth/password.ts";
import { DefaultAdminAssignmentField } from "@/admin/components.tsx";
import {
  loadRolePermissions,
  loadUserRoles,
  recordAdminAuditEvent,
  syncRolePermissions,
  syncUserRoles,
} from "@/admin/modules.ts";
import {
  getPermissionRepo,
  getRolePermissionRepo,
  getRoleRepo,
  getSessionRepo,
  getUserRepo,
  getUserRoleRepo,
} from "@/admin/modules/repositories.ts";
import type {
  AdminActorContext,
  AdminDatabase,
  AdminNormalizedResource,
  AdminRuntimeLike,
  AdminUserRecord,
  FormSource,
  OakRouterContext,
} from "@/admin/core/types.ts";
import {
  defaultFormWidget,
  getEditableFieldNames,
  getFieldDescription,
  getFieldLabel,
  getFormValue,
  getFormValues,
  getRecordId,
  getRequestIpAddress,
  getRequestUserAgent,
  parseScalarFieldValue,
  renderBooleanToggleField,
  resolveWidgetOverride,
  sendHtml,
} from "@/admin/support/utils.tsx";
import type { RawRecord } from "@/db/types.ts";
// deno-coverage-ignore-stop

export const renderCreateForm = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
  actor: AdminActorContext,
  resource: AdminNormalizedResource,
  error?: string,
  form?: FormSource,
): Promise<void> => {
  const FormPage = resource.components.FormPage ?? admin.components.FormPage;
  sendHtml(
    ctx,
    admin.getDocumentTitle(`New ${resource.model.labels.singular}`),
    (
      <FormPage
        shell={{
          navigation: admin.buildNavigation(actor, {
            kind: "resource",
            slug: resource.slug,
          }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: `New ${resource.model.labels.singular}`,
          kicker: resource.label,
          subtitle:
            `Create a new ${resource.model.labels.singular.toLowerCase()}.`,
          logoutAction: admin.getLogoutPath(),
          flashes: error ? [{ tone: "error", message: error }] : undefined,
        }}
        form={await renderForm(
          admin,
          actor,
          resource,
          "create",
          undefined,
          form,
        )}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};

export const renderEditForm = async (
  admin: AdminRuntimeLike,
  ctx: OakRouterContext,
  actor: AdminActorContext,
  resource: AdminNormalizedResource,
  record: RawRecord,
  error?: string,
  form?: FormSource,
): Promise<void> => {
  const FormPage = resource.components.FormPage ?? admin.components.FormPage;
  sendHtml(
    ctx,
    admin.getDocumentTitle(`Edit ${admin.getRecordTitle(resource, record)}`),
    (
      <FormPage
        shell={{
          navigation: admin.buildNavigation(actor, {
            kind: "resource",
            slug: resource.slug,
          }),
          brandName: admin.branding.name,
          brandTagline: admin.branding.tagline,
          currentUserEmail: (actor.user as AdminUserRecord).email,
          title: `Edit ${admin.getRecordTitle(resource, record)}`,
          kicker: resource.label,
          subtitle:
            `Update this ${resource.model.labels.singular.toLowerCase()}.`,
          logoutAction: admin.getLogoutPath(),
          flashes: error ? [{ tone: "error", message: error }] : undefined,
        }}
        form={await renderForm(
          admin,
          actor,
          resource,
          "edit",
          record,
          form,
        )}
      />
    ),
    admin.basePath,
    200,
    admin.branding,
  );
};

export const renderForm = async (
  admin: AdminRuntimeLike,
  actor: AdminActorContext,
  resource: AdminNormalizedResource,
  mode: "create" | "edit",
  record?: RawRecord,
  form?: FormSource,
): Promise<ComponentChildren> => {
  if (resource.kind === "users") {
    return await renderUserForm(admin, mode, record, form);
  }

  if (resource.kind === "roles") {
    return await renderRoleForm(admin, mode, record, form);
  }

  const fields = getEditableFieldNames(resource, mode);
  const renderedFields = await Promise.all(
    fields.map(async (fieldName) => {
      const field = resource.model.fields[fieldName];
      const override = resolveWidgetOverride(
        resource,
        admin.fieldWidgets,
        fieldName,
        field,
      );
      const value = form
        ? getFormValue(form, fieldName)
        : admin.formatFieldForForm(field, record?.[fieldName]);

      return override?.form
        ? await override.form({
          mode: "form",
          resourceKey: resource.slug,
          fieldName,
          field,
          record,
          value,
          inputName: fieldName,
          db: admin.db,
          actor,
        })
        : defaultFormWidget(fieldName, field, value, {
          label: getFieldLabel(resource, fieldName),
          description: getFieldDescription(resource, fieldName),
        });
    }),
  );

  return (
    <form method="post" data-curio-admin-form>
      <div data-curio-admin-field-grid>
        {renderedFields}
      </div>
      <div data-curio-admin-actions>
        <button data-curio-admin-button data-variant="primary" type="submit">
          {mode === "create" ? "Create" : "Save changes"}
        </button>
      </div>
    </form>
  );
};

export const renderUserForm = async (
  admin: AdminRuntimeLike,
  mode: "create" | "edit",
  record?: RawRecord,
  form?: FormSource,
): Promise<ComponentChildren> => {
  const roles = await getRoleRepo(admin.db as unknown as AdminDatabase)
    .findMany({
      orderBy: [{ key: "asc" }],
    });
  const selectedRoleIds = form
    ? new Set(getFormValues(form, "roleIds"))
    : new Set(
      record?.id
        ? (
          await loadUserRoles(
            admin.db as unknown as AdminDatabase,
            String(record.id),
          )
        ).map((role) => role.id)
        : [],
    );
  const emailValue = form
    ? getFormValue(form, "email")
    : String(record?.email ?? "");
  const roleOptions = roles.map((role) => ({
    id: role.id,
    key: role.key,
    label: role.label,
    description: null,
  }));

  return (
    <form
      method="post"
      data-curio-admin-form
      data-curio-dirty-form={mode === "edit" ? "true" : undefined}
    >
      <div data-curio-admin-field-grid>
        <div data-curio-admin-field data-span="2">
          <label data-curio-admin-label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={emailValue}
            required
            data-curio-admin-input
          />
        </div>
        {mode === "create"
          ? (
            <div
              data-curio-admin-field
              data-span="2"
              data-curio-password-toggle
            >
              <label data-curio-admin-label htmlFor="password">Password</label>
              <div data-curio-admin-inline-input>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  data-curio-admin-input
                />
                <button data-curio-admin-button type="button">Show</button>
              </div>
            </div>
          )
          : null}
        <DefaultAdminAssignmentField
          label="Roles"
          name="roleIds"
          options={roleOptions}
          selectedIds={[...selectedRoleIds]}
          helperText="Select the roles granted to this user."
          emptyText="No roles are available yet."
          filterPlaceholder="Filter roles"
        />
      </div>
      <div data-curio-admin-actions>
        <button
          data-curio-admin-button
          data-curio-dirty-submit={mode === "edit" ? "true" : undefined}
          data-variant="primary"
          type="submit"
        >
          {mode === "create" ? "Create user" : "Save user"}
        </button>
      </div>
    </form>
  );
};

export const renderRoleForm = async (
  admin: AdminRuntimeLike,
  mode: "create" | "edit",
  record?: RawRecord,
  form?: FormSource,
): Promise<ComponentChildren> => {
  const permissions = await getPermissionRepo(
    admin.db as unknown as AdminDatabase,
  )
    .findMany({
      orderBy: [{ key: "asc" }],
    });
  const selectedPermissionIds = form
    ? new Set(getFormValues(form, "permissionIds"))
    : new Set(
      record?.id
        ? (
          await loadRolePermissions(
            admin.db as unknown as AdminDatabase,
            String(record.id),
          )
        ).map((permission) => permission.id)
        : [],
    );
  const keyValue = form ? getFormValue(form, "key") : String(record?.key ?? "");
  const labelValue = form
    ? getFormValue(form, "label")
    : String(record?.label ?? "");
  const descriptionValue = form
    ? getFormValue(form, "description")
    : String(record?.description ?? "");
  const bypassValue = form
    ? getFormValue(form, "bypass") === "true"
    : Boolean(record?.bypass);
  const permissionOptions = permissions.map((permission) => ({
    id: permission.id,
    key: permission.key,
    label: permission.label,
    description: permission.description ?? null,
  }));

  return (
    <form
      method="post"
      data-curio-admin-form
      data-curio-dirty-form={mode === "edit" ? "true" : undefined}
    >
      <div data-curio-admin-field-grid>
        <div data-curio-admin-field>
          <label data-curio-admin-label htmlFor="key">Key</label>
          <input
            id="key"
            name="key"
            type="text"
            value={keyValue}
            required
            data-curio-admin-input
          />
        </div>
        <div data-curio-admin-field>
          <label data-curio-admin-label htmlFor="label">Label</label>
          <input
            id="label"
            name="label"
            type="text"
            value={labelValue}
            required
            data-curio-admin-input
          />
        </div>
        <div data-curio-admin-field data-span="2">
          <label data-curio-admin-label htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            data-curio-admin-textarea
          >
            {descriptionValue}
          </textarea>
        </div>
        {renderBooleanToggleField({
          fieldName: "bypass",
          label: "Bypass granular permission checks",
          checked: bypassValue,
          description: "Use this only for roles like superadmin.",
        })}
        <DefaultAdminAssignmentField
          label="Permissions"
          name="permissionIds"
          options={permissionOptions}
          selectedIds={[...selectedPermissionIds]}
          helperText="Select the permissions granted through this role."
          emptyText="No permissions are available yet."
          filterPlaceholder="Filter permissions"
        />
      </div>
      <div data-curio-admin-actions>
        <button
          data-curio-admin-button
          data-curio-dirty-submit={mode === "edit" ? "true" : undefined}
          data-variant="primary"
          type="submit"
        >
          {mode === "create" ? "Create role" : "Save role"}
        </button>
      </div>
    </form>
  );
};

export const renderResetPasswordForm = (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  id: string,
): ComponentChildren => {
  return (
    <form method="post" data-curio-admin-form>
      <div data-curio-admin-field-grid>
        <div data-curio-admin-field data-span="2" data-curio-password-toggle>
          <label data-curio-admin-label htmlFor="password">New password</label>
          <div data-curio-admin-inline-input>
            <input
              id="password"
              name="password"
              type="password"
              required
              data-curio-admin-input
            />
            <button data-curio-admin-button type="button">Show</button>
          </div>
        </div>
        <div data-curio-admin-field data-span="2">
          <label data-curio-admin-label htmlFor="passwordConfirmation">
            Confirm password
          </label>
          <input
            id="passwordConfirmation"
            name="passwordConfirmation"
            type="password"
            required
            data-curio-admin-input
          />
        </div>
      </div>
      <div data-curio-admin-actions>
        <button data-curio-admin-button data-variant="primary" type="submit">
          Save new password
        </button>
        <a
          href={admin.getResourceDetailPath(resource, id)}
          data-curio-admin-button
        >
          Cancel
        </a>
      </div>
    </form>
  );
};

export const renderDeleteForm = (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  id: string,
): ComponentChildren => {
  return (
    <form method="post" data-curio-admin-form data-curio-confirm>
      <div data-curio-admin-confirm-box>
        <label data-curio-admin-checkbox-row>
          <input type="checkbox" name="confirmDelete" value="true" />
          <span>I understand this deletion is permanent.</span>
        </label>
      </div>
      <div data-curio-admin-actions>
        <button
          data-curio-admin-button
          data-curio-confirm-submit
          data-variant="danger"
          type="submit"
        >
          Delete permanently
        </button>
        <a
          href={admin.getResourceDetailPath(resource, id)}
          data-curio-admin-button
        >
          Cancel
        </a>
      </div>
    </form>
  );
};

export const createRecord = async (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  actor: AdminActorContext,
  form: FormSource,
  ctx: OakRouterContext,
): Promise<string> => {
  if (resource.kind === "users") {
    const email = getFormValue(form, "email").toLowerCase();
    const password = getFormValue(form, "password");
    const roleIds = getFormValues(form, "roleIds");

    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const created = await admin.db.transaction(async (database) => {
      const tx = database as unknown as AdminDatabase;
      const user = await getUserRepo(tx).create({
        email,
        passwordHash: await hashPassword(password),
      });
      await syncUserRoles(tx, user.id, roleIds);
      return user;
    }) as unknown as RawRecord;

    await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
      actorUserId: (actor.user as AdminUserRecord).id,
      eventType: "admin.users.create",
      resource: "users",
      recordId: String(created.id),
      summary: `Created user ${email}.`,
      payload: {
        email,
        roleIds,
      },
      ipAddress: getRequestIpAddress(ctx),
      userAgent: getRequestUserAgent(ctx),
    });

    return String(created.id);
  }

  if (resource.kind === "roles") {
    const key = getFormValue(form, "key").trim();
    const label = getFormValue(form, "label").trim();
    const description = getFormValue(form, "description").trim() || null;
    const bypass = getFormValue(form, "bypass") === "true";
    const permissionIds = getFormValues(form, "permissionIds");

    if (!key || !label) {
      throw new Error("Key and label are required.");
    }

    const created = await admin.db.transaction(async (database) => {
      const tx = database as unknown as AdminDatabase;
      const role = await getRoleRepo(tx).create({
        key,
        label,
        description,
        bypass,
      });
      await syncRolePermissions(tx, role.id, permissionIds);
      return role;
    }) as unknown as RawRecord;

    await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
      actorUserId: (actor.user as AdminUserRecord).id,
      eventType: "admin.roles.create",
      resource: "roles",
      recordId: String(created.id),
      summary: `Created role ${key}.`,
      payload: {
        key,
        label,
        bypass,
        permissionIds,
      },
      ipAddress: getRequestIpAddress(ctx),
      userAgent: getRequestUserAgent(ctx),
    });

    return String(created.id);
  }

  const input = buildGenericInput(resource, form, "create");
  const createHook = resource.hooks.create;
  const created = createHook
    ? await (async () => {
      const createdId = await createHook({
        db: admin.db,
        actor,
        ctx,
        form,
        input,
      });
      const record = await admin.getRepository(resource).findById(
        createdId,
      ) as unknown as
        | RawRecord
        | null;

      if (!record) {
        throw new Error(
          `Created ${resource.model.labels.singular.toLowerCase()} could not be reloaded.`,
        );
      }

      return record;
    })()
    : await admin.getRepository(resource).create(
      input as RawRecord,
    ) as unknown as RawRecord;
  const resolvedCreatedId = getRecordId(resource, created);

  await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
    actorUserId: (actor.user as AdminUserRecord).id,
    eventType: `admin.${resource.slug}.create`,
    resource: resource.slug,
    recordId: resolvedCreatedId,
    summary: `Created ${resource.model.labels.singular.toLowerCase()} ${
      admin.getRecordTitle(resource, created)
    }.`,
    ipAddress: getRequestIpAddress(ctx),
    userAgent: getRequestUserAgent(ctx),
  });

  return resolvedCreatedId;
};

export const updateRecord = async (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  actor: AdminActorContext,
  id: string,
  form: FormSource,
  ctx: OakRouterContext,
): Promise<void> => {
  if (resource.kind === "users") {
    const email = getFormValue(form, "email").toLowerCase();
    const roleIds = getFormValues(form, "roleIds");

    if (!email) {
      throw new Error("Email is required.");
    }

    await admin.db.transaction(async (database) => {
      const tx = database as unknown as AdminDatabase;
      await getUserRepo(tx).updateById(id, {
        email,
        updatedAt: new Date(),
      });
      await syncUserRoles(tx, id, roleIds);
    });

    await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
      actorUserId: (actor.user as AdminUserRecord).id,
      eventType: "admin.users.update",
      resource: "users",
      recordId: id,
      summary: `Updated user ${email}.`,
      payload: {
        email,
        roleIds,
      },
      ipAddress: getRequestIpAddress(ctx),
      userAgent: getRequestUserAgent(ctx),
    });

    return;
  }

  if (resource.kind === "roles") {
    const key = getFormValue(form, "key").trim();
    const label = getFormValue(form, "label").trim();
    const description = getFormValue(form, "description").trim() || null;
    const bypass = getFormValue(form, "bypass") === "true";
    const permissionIds = getFormValues(form, "permissionIds");

    if (!key || !label) {
      throw new Error("Key and label are required.");
    }

    await admin.db.transaction(async (database) => {
      const tx = database as unknown as AdminDatabase;
      await getRoleRepo(tx).updateById(id, {
        key,
        label,
        description,
        bypass,
        updatedAt: new Date(),
      });
      await syncRolePermissions(tx, id, permissionIds);
    });

    await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
      actorUserId: (actor.user as AdminUserRecord).id,
      eventType: "admin.roles.update",
      resource: "roles",
      recordId: id,
      summary: `Updated role ${key}.`,
      payload: {
        key,
        label,
        bypass,
        permissionIds,
      },
      ipAddress: getRequestIpAddress(ctx),
      userAgent: getRequestUserAgent(ctx),
    });

    return;
  }

  const input = buildGenericInput(resource, form, "edit");

  if ("updatedAt" in resource.model.fields) {
    input.updatedAt = new Date();
  }

  if (resource.hooks.update) {
    await resource.hooks.update({
      db: admin.db,
      actor,
      ctx,
      id,
      form,
      input,
    });
  } else {
    await admin.getRepository(resource).updateById(id, input as RawRecord);
  }
  await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
    actorUserId: (actor.user as AdminUserRecord).id,
    eventType: `admin.${resource.slug}.update`,
    resource: resource.slug,
    recordId: id,
    summary: `Updated ${resource.model.labels.singular.toLowerCase()} ${id}.`,
    ipAddress: getRequestIpAddress(ctx),
    userAgent: getRequestUserAgent(ctx),
  });
};

export const deleteRecord = async (
  admin: AdminRuntimeLike,
  resource: AdminNormalizedResource,
  actor: AdminActorContext,
  id: string,
  ctx: OakRouterContext,
): Promise<void> => {
  if (resource.kind === "users") {
    await admin.db.transaction(async (database) => {
      const tx = database as unknown as AdminDatabase;
      const userRoleRepo = getUserRoleRepo(tx);
      const sessionRepo = getSessionRepo(tx);
      const assignments = await userRoleRepo.findMany({
        where: { userId: id },
      });

      for (const assignment of assignments) {
        await userRoleRepo.deleteById(assignment.id);
      }

      const sessions = await sessionRepo.findMany({
        where: { userId: id },
      }) as Array<{ id: string }>;

      for (const session of sessions) {
        await sessionRepo.deleteById(session.id);
      }

      await getUserRepo(tx).deleteById(id);
    });
  } else if (resource.kind === "roles") {
    await admin.db.transaction(async (database) => {
      const tx = database as unknown as AdminDatabase;
      const rolePermissionRepo = getRolePermissionRepo(tx);
      const userRoleRepo = getUserRoleRepo(tx);
      const rolePermissions = await rolePermissionRepo.findMany({
        where: { roleId: id },
      });
      const userRoles = await userRoleRepo.findMany({
        where: { roleId: id },
      });

      for (const assignment of rolePermissions) {
        await rolePermissionRepo.deleteById(assignment.id);
      }

      for (const assignment of userRoles) {
        await userRoleRepo.deleteById(assignment.id);
      }

      await getRoleRepo(tx).deleteById(id);
    });
  } else if (resource.kind === "permissions") {
    await admin.db.transaction(async (database) => {
      const tx = database as unknown as AdminDatabase;
      const rolePermissionRepo = getRolePermissionRepo(tx);
      const assignments = await rolePermissionRepo.findMany({
        where: { permissionId: id },
      });

      for (const assignment of assignments) {
        await rolePermissionRepo.deleteById(assignment.id);
      }

      await getPermissionRepo(tx).deleteById(id);
    });
  } else {
    await admin.getRepository(resource).deleteById(id);
  }

  await recordAdminAuditEvent(admin.db as unknown as AdminDatabase, {
    actorUserId: (actor.user as AdminUserRecord).id,
    eventType: `admin.${resource.slug}.delete`,
    resource: resource.slug,
    recordId: id,
    summary: `Deleted ${resource.model.labels.singular.toLowerCase()} ${id}.`,
    ipAddress: getRequestIpAddress(ctx),
    userAgent: getRequestUserAgent(ctx),
  });
};

export const buildGenericInput = (
  resource: AdminNormalizedResource,
  form: FormSource,
  mode: "create" | "edit" = "edit",
): RawRecord => {
  return Object.fromEntries(
    getEditableFieldNames(resource, mode).map((fieldName) => {
      const field = resource.model.fields[fieldName];

      if (field.kind === "boolean") {
        return [fieldName, getFormValue(form, fieldName) === "true"];
      }

      return [
        fieldName,
        parseScalarFieldValue(field, getFormValue(form, fieldName)),
      ];
    }).filter(([, value]) => value !== undefined),
  );
};
