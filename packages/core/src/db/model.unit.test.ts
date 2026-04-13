import {
  assertEquals,
  assertThrows,
} from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  DuplicateModelVariantError,
  InvalidModelPrimaryKeyError,
  ModelFieldConflictError,
  ModelMetadataConflictError,
} from "@/db/errors.ts";
import { field } from "@/db/field.ts";
import { Model } from "@/db/model.ts";
import { relation } from "@/db/relation.ts";
import { Timestamps, UuidPrimaryKey } from "@/db/variant.ts";

describe("Model", () => {
  it("resolves variants, fields, relations, metadata, and defaults", () => {
    const SessionModel = new Model({
      name: "Session",
      table: "sessions",
      uses: [UuidPrimaryKey, Timestamps],
      fields: {
        userId: field.uuid().required(),
        token: field.string().required().unique(),
      },
      relations: {
        user: relation.belongsTo("User").foreignKey("userId"),
      },
      labels: {
        plural: "Auth Sessions",
      },
      defaultOrder: [{ createdAt: "desc" }],
    });

    assertEquals(SessionModel.name, "Session");
    assertEquals(SessionModel.table, "sessions");
    assertEquals(SessionModel.primaryKey, "id");
    assertEquals(SessionModel.labels.singular, "Session");
    assertEquals(SessionModel.labels.plural, "Auth Sessions");
    assertEquals(SessionModel.defaultOrder, [{ createdAt: "desc" }]);
    assertEquals(SessionModel.fields.id.primaryKey, true);
    assertEquals(SessionModel.fields.id.unique, true);
    assertEquals(SessionModel.fields.createdAt.kind, "datetime");
    assertEquals(SessionModel.fields.updatedAt.kind, "datetime");
    assertEquals(SessionModel.relations.user.kind, "belongsTo");
    assertEquals(SessionModel.relations.user.target, "User");
    assertEquals(SessionModel.uses, [UuidPrimaryKey, Timestamps]);
  });

  it("rejects duplicated variants", () => {
    assertThrows(
      () =>
        new Model({
          name: "User",
          table: "users",
          uses: [UuidPrimaryKey, UuidPrimaryKey],
          fields: {
            email: field.string().required(),
          },
        }),
      DuplicateModelVariantError,
    );
  });

  it("rejects field collisions between variants and explicit fields or variants", () => {
    assertThrows(
      () =>
        new Model({
          name: "User",
          table: "users",
          uses: [UuidPrimaryKey],
          fields: {
            id: field.id(),
            email: field.string().required(),
          },
        }),
      ModelFieldConflictError,
    );

    assertThrows(
      () =>
        new Model({
          name: "User",
          table: "users",
          uses: [
            {
              name: "AuditFields",
              fields: {
                createdAt: field.datetime(),
              },
            },
            {
              name: "LegacyAuditFields",
              fields: {
                createdAt: field.datetime(),
              },
            },
            UuidPrimaryKey,
          ],
          fields: {
            email: field.string().required(),
          },
        }),
      ModelFieldConflictError,
    );
  });

  it("rejects conflicting metadata from variants and explicit model metadata", () => {
    assertThrows(
      () =>
        new Model({
          name: "User",
          table: "users",
          uses: [
            UuidPrimaryKey,
            {
              name: "Named",
              labels: {
                singular: "Member",
              },
            },
          ],
          fields: {
            email: field.string().required(),
          },
          labels: {
            singular: "User",
          },
        }),
      ModelMetadataConflictError,
    );

    assertThrows(
      () =>
        new Model({
          name: "User",
          table: "users",
          uses: [
            UuidPrimaryKey,
            {
              name: "Ordered",
              defaultOrder: [{ createdAt: "desc" }],
            },
          ],
          fields: {
            createdAt: field.datetime(),
            email: field.string().required(),
          },
          defaultOrder: [{ email: "asc" }],
        }),
      ModelMetadataConflictError,
    );

    assertThrows(
      () =>
        new Model({
          name: "User",
          table: "users",
          uses: [
            UuidPrimaryKey,
            {
              name: "PluralA",
              labels: {
                plural: "Members",
              },
            },
            {
              name: "PluralB",
              labels: {
                plural: "People",
              },
            },
          ],
          fields: {
            email: field.string().required(),
          },
        }),
      ModelMetadataConflictError,
    );
  });

  it("requires exactly one primary key", () => {
    assertThrows(
      () =>
        new Model({
          name: "User",
          table: "users",
          fields: {
            email: field.string().required(),
          },
        }),
      InvalidModelPrimaryKeyError,
    );

    assertThrows(
      () =>
        new Model({
          name: "User",
          table: "users",
          fields: {
            id: field.id(),
            legacyId: field.id(),
          },
        }),
      InvalidModelPrimaryKeyError,
    );
  });

  it("preserves explicit field options and later chain overrides", () => {
    const UserModel = new Model({
      name: "User",
      table: "users",
      uses: [UuidPrimaryKey],
      fields: {
        email: field.string({ searchable: true }).searchable(false).sortable(),
        passwordHash: field.string({ hidden: false }).hidden(),
      },
    });

    assertEquals(UserModel.fields.email.searchable, false);
    assertEquals(UserModel.fields.email.sortable, true);
    assertEquals(UserModel.fields.passwordHash.hidden, true);
  });

  it("fills missing labels from defaults when only one side is provided", () => {
    const WidgetModel = new Model({
      name: "Widget",
      table: "widgets",
      fields: {
        id: field.id(),
      },
      labels: {
        singular: "Control",
      },
    });

    assertEquals(WidgetModel.labels.singular, "Control");
    assertEquals(WidgetModel.labels.plural, "Widgets");
  });

  it("supports variant-only models without explicit fields", () => {
    const AuditModel = new Model({
      name: "AuditEntry",
      table: "audit_entries",
      uses: [UuidPrimaryKey, Timestamps],
    });

    assertEquals(Object.keys(AuditModel.fields).sort(), [
      "createdAt",
      "id",
      "updatedAt",
    ]);
    assertEquals(AuditModel.primaryKey, "id");
    assertEquals(AuditModel.labels.singular, "AuditEntry");
    assertEquals(AuditModel.labels.plural, "AuditEntrys");
  });
});
