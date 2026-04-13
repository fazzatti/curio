/** @jsxImportSource preact */

import { assertStringIncludes } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { renderToString } from "preact-render-to-string";
import { DefaultAdminAssignmentField } from "@/admin/components.tsx";

describe("DefaultAdminAssignmentField", () => {
  it("renders empty assignment states with fallback copy", () => {
    const html = renderToString(
      <DefaultAdminAssignmentField
        label="Roles"
        name="roleIds"
        options={[]}
        selectedIds={[]}
      />,
    );

    assertStringIncludes(html, "0 selected");
    assertStringIncludes(html, "Nothing assigned");
    assertStringIncludes(html, "Select one or more linked records.");
    assertStringIncludes(html, 'placeholder="Filter roles"');
    assertStringIncludes(html, "No records available to assign.");
  });

  it("renders selected summaries, descriptions, and custom empty copy", () => {
    const html = renderToString(
      <DefaultAdminAssignmentField
        label="Permissions"
        name="permissionIds"
        options={[
          { id: "1", key: "users:list", label: "Users list" },
          { id: "2", key: "users:view", label: "Users view" },
          {
            id: "3",
            key: "users:update",
            label: "Users update",
            description: "Can update users",
          },
          { id: "4", key: "users:delete", label: "Users delete" },
        ]}
        selectedIds={["1", "2", "3", "4"]}
        helperText="Choose permissions."
        emptyText="Nothing here."
        filterPlaceholder="Filter permissions"
      />,
    );

    assertStringIncludes(html, "4 selected");
    assertStringIncludes(html, "users:list, users:view, users:update +1");
    assertStringIncludes(html, "Choose permissions.");
    assertStringIncludes(html, 'placeholder="Filter permissions"');
    assertStringIncludes(html, "Can update users");
    assertStringIncludes(html, "Assigned");
    assertStringIncludes(html, "Assign");
  });
});
