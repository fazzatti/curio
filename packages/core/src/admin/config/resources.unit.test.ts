import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import {
  deriveDefaultColumns,
  deriveDefaultSearchFields,
  getResourceKind,
  mergeResourceConfig,
  normalizeResources,
  resolveActions,
} from "@/admin/config/resources.ts";
import { Entity } from "@/db/entity.ts";
import { field } from "@/db/field.ts";
import { Model } from "@/db/model.ts";
import { Timestamps, UuidPrimaryKey } from "@/db/variant.ts";

const ExampleModel = new Model({
  name: "Example",
  table: "examples",
  uses: [UuidPrimaryKey, Timestamps],
  fields: {
    title: field.string().required().sortable(),
    slug: field.string().searchable(false),
    status: field.enum(["draft", "published"] as const).sortable(),
    secret: field.string().hidden(),
    body: field.text(),
  },
});

const Example = Entity.from(ExampleModel);

describe("admin runtime resources", () => {
  it("combines nested config without dropping right-hand overrides", () => {
    const merged = mergeResourceConfig(
      {
        label: "Left",
        actions: { create: true, update: false },
        fieldAccess: { title: { visible: true } },
        fieldWidgets: { title: { list: () => "left" } },
        components: {},
        filters: [{ field: "status", type: "select" }],
        columns: ["title"],
        searchFields: ["title"],
        defaultOrder: [{ title: "asc" }],
        nav: { visible: true, group: "Alpha", order: 1, groupOrder: 10 },
      },
      {
        label: "Right",
        actions: { delete: true },
        fieldAccess: { slug: { editable: false } },
        fieldWidgets: { slug: { detail: () => "right" } },
        components: {},
        filters: [{ field: "slug", type: "text" }],
        columns: ["slug"],
        searchFields: ["slug"],
        defaultOrder: [{ slug: "desc" }],
        nav: { visible: false, group: "Beta", order: 3, groupOrder: 20 },
      },
    );

    assertEquals(merged.label, "Right");
    assertEquals(merged.actions?.create, true);
    assertEquals(merged.actions?.update, false);
    assertEquals(merged.actions?.delete, true);
    assertEquals(merged.fieldAccess?.title?.visible, true);
    assertEquals(merged.fieldAccess?.slug?.editable, false);
    assertEquals(merged.filters?.[0]?.field, "slug");
    assertEquals(merged.columns, ["slug"]);
    assertEquals(merged.searchFields, ["slug"]);
    assertEquals(merged.defaultOrder, [{ slug: "desc" }]);
    assertEquals(merged.nav?.visible, false);
    assertEquals(merged.nav?.group, "Beta");
    assertEquals(merged.nav?.order, 3);
    assertEquals(merged.nav?.groupOrder, 20);
  });

  it("falls back to left-hand values when the right side omits optional config", () => {
    const merged = mergeResourceConfig(
      {
        actions: { create: true },
        filters: [{ field: "status", type: "select" }],
        columns: ["title"],
        searchFields: ["title"],
        defaultOrder: [{ title: "asc" }],
        nav: { visible: true },
      },
      {
        actions: { delete: true },
      },
    );

    assertEquals(merged.filters, [{ field: "status", type: "select" }]);
    assertEquals(merged.columns, ["title"]);
    assertEquals(merged.searchFields, ["title"]);
    assertEquals(merged.defaultOrder, [{ title: "asc" }]);
    assertEquals(merged.nav?.visible, true);
  });

  it("derives default columns, search fields, actions, and resource kinds", () => {
    assertEquals(deriveDefaultColumns(ExampleModel), [
      "createdAt",
      "updatedAt",
      "title",
      "slug",
    ]);
    assertEquals(deriveDefaultSearchFields(ExampleModel), [
      "id",
      "createdAt",
      "updatedAt",
      "title",
      "status",
      "body",
    ]);

    assertEquals(resolveActions("users", false).reset_password, true);
    assertEquals(
      resolveActions("users", false, { reset_password: false }).reset_password,
      false,
    );
    assertEquals(resolveActions("sessions", true).create, false);
    assertEquals(resolveActions("sessions", true).delete, false);

    assertEquals(getResourceKind("users"), "users");
    assertEquals(getResourceKind("roles"), "roles");
    assertEquals(getResourceKind("permissions"), "permissions");
    assertEquals(getResourceKind("sessions"), "sessions");
    assertEquals(getResourceKind("audit"), "audit");
    assertEquals(getResourceKind("anything-else"), "generic");
  });

  it("resolves default labels, readonly actions, nav visibility, and model lookup", () => {
    const { resources, resourceByModelName } = normalizeResources({
      examples: {
        entity: Example,
        config: {
          path: "content",
          label: "Content",
          readOnly: true,
          nav: { visible: false },
        },
      },
      defaults: {
        entity: Example,
        config: {},
      },
    });
    const contentResource = resources.content;
    const defaultResource = resources.defaults;

    assertEquals(contentResource?.slug, "content");
    assertEquals(contentResource?.label, "Content");
    assertEquals(contentResource?.readOnly, true);
    assertEquals(contentResource?.actions.create, false);
    assertEquals(contentResource?.actions.update, false);
    assertEquals(contentResource?.actions.delete, false);
    assertEquals(contentResource?.nav.visible, false);
    assertEquals(contentResource?.navGroup, "Resources");
    assertEquals(contentResource?.navOrder, 0);
    assertEquals(contentResource?.navGroupOrder, 999);
    assertEquals(resourceByModelName.Example?.slug, "defaults");

    assertEquals(defaultResource?.slug, "defaults");
    assertEquals(defaultResource?.label, "Examples");
    assertEquals(defaultResource?.nav.visible, true);
    assertEquals(defaultResource?.navGroup, "Resources");
    assertEquals(defaultResource?.columns, deriveDefaultColumns(ExampleModel));
    assertEquals(
      defaultResource?.searchFields,
      deriveDefaultSearchFields(ExampleModel),
    );
  });
});
