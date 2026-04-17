import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import {
  ADMIN_STYLESHEET,
  renderAdminBrandingThemeStyles,
  resolveAdminBrandingColors,
} from "@/admin/assets.ts";

Deno.test("admin asset helpers return no theme overrides when branding colors are omitted", () => {
  assertEquals(resolveAdminBrandingColors(undefined), undefined);
  assertEquals(renderAdminBrandingThemeStyles({}), "");
});

Deno.test("admin asset helpers normalize partial branding colors and derive theme variables", () => {
  assertEquals(
    resolveAdminBrandingColors({
      primary: "#369",
    }),
    {
      primary: "#336699",
      secondary: "#568c6e",
    },
  );

  assertEquals(
    resolveAdminBrandingColors({
      secondary: "#abc",
    }),
    {
      primary: "#c65a3e",
      secondary: "#aabbcc",
    },
  );

  const themeStyles = renderAdminBrandingThemeStyles({
    colors: {
      primary: "#336699",
      secondary: "#cc8844",
    },
  });

  assertStringIncludes(themeStyles, "--curio-accent: #336699");
  assertStringIncludes(themeStyles, "--curio-secondary: #cc8844");
  assertStringIncludes(themeStyles, "--curio-accent-rgb: 51, 102, 153");
  assertStringIncludes(themeStyles, "--curio-secondary-rgb: 204, 136, 68");
});

Deno.test("admin asset helpers reject invalid branding colors and expose default theme variables", () => {
  assertThrows(
    () =>
      resolveAdminBrandingColors({
        primary: "#336699",
        secondary: "blue",
      }),
    Error,
    'Admin branding color "secondary" must be a hex color',
  );

  assertStringIncludes(ADMIN_STYLESHEET, "--curio-accent-rgb: 198, 90, 62");
  assertStringIncludes(ADMIN_STYLESHEET, "--curio-secondary-rgb: 86, 140, 110");
});
