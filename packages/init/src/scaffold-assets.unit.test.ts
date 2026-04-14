import { assertEquals, assertStringIncludes, assertThrows } from "@std/assert";
import { join, relative } from "@std/path";
import {
  INIT_PACKAGE_CONFIG,
  readScaffoldAssetBytes,
  readScaffoldAssetText,
  resolveTemplateFiles,
  TEMPLATE_BUNDLES,
  type TemplateFile,
} from "./scaffold-assets.ts";

const defaultTemplateDir = new URL("../template/default/", import.meta.url);

const listTemplateFiles = async (
  directory: URL,
  prefix = "",
): Promise<TemplateFile[]> => {
  const files: TemplateFile[] = [];

  for await (const entry of Deno.readDir(directory)) {
    const entryUrl = new URL(entry.name, directory);
    const entryPath = prefix ? join(prefix, entry.name) : entry.name;

    if (entry.isSymlink) {
      throw new Error(`Template symlinks are not supported: ${entryPath}`);
    }

    if (entry.isDirectory) {
      files.push(
        ...(await listTemplateFiles(
          new URL(`${entry.name}/`, directory),
          entryPath,
        )),
      );
      continue;
    }

    files.push({
      content: await Deno.readTextFile(entryUrl),
      encoding: "utf8",
      path: entryPath.replaceAll("\\", "/"),
    });
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
};

Deno.test("default template bundle matches the editable template directory", async () => {
  const bundledFiles = [...resolveTemplateFiles("default")].sort((
    left,
    right,
  ) => left.path.localeCompare(right.path));
  const sourceFiles = await listTemplateFiles(defaultTemplateDir);

  assertEquals(bundledFiles, sourceFiles);
});

Deno.test("resolveTemplateFiles rejects unknown templates", () => {
  assertThrows(
    () => {
      resolveTemplateFiles("missing");
    },
    Error,
    'Unknown template "missing".',
  );
});

Deno.test("init package config exposes the expected JSR package metadata", () => {
  assertStringIncludes(
    String(INIT_PACKAGE_CONFIG.imports?.["@curio/core"] ?? ""),
    "jsr:@curio/core",
  );
});

Deno.test("readScaffoldAssetText returns text bundle entries", () => {
  const readmeFile = resolveTemplateFiles("default").find((file) =>
    file.path === "README.md"
  );

  assertEquals(
    readScaffoldAssetText(readmeFile as TemplateFile).startsWith("# "),
    true,
  );
});

Deno.test("readScaffoldAssetText rejects binary bundle entries", () => {
  assertThrows(
    () => {
      readScaffoldAssetText({
        content: "AAE=",
        encoding: "base64",
        path: "favicon.ico",
      });
    },
    Error,
    "Template file is not text: favicon.ico",
  );
});

Deno.test("readScaffoldAssetBytes encodes text bundle entries as utf8", () => {
  const bytes = readScaffoldAssetBytes({
    content: "Curio",
    encoding: "utf8",
    path: "README.md",
  });

  assertEquals([...bytes], [67, 117, 114, 105, 111]);
});

Deno.test("readScaffoldAssetBytes decodes base64 bundle entries", () => {
  const bytes = readScaffoldAssetBytes({
    content: "AAEC",
    encoding: "base64",
    path: "favicon.ico",
  });

  assertEquals([...bytes], [0, 1, 2]);
});

Deno.test("template bundle paths stay rooted under the default template", () => {
  const serverFile = resolveTemplateFiles("default").find((file) =>
    file.path === "src/http/server.ts"
  );

  const relativePath = relative(
    new URL("../template/default/", import.meta.url).pathname,
    new URL(`../template/default/${serverFile?.path}`, import.meta.url)
      .pathname,
  );

  assertEquals(relativePath.replaceAll("\\", "/"), "src/http/server.ts");
});

Deno.test("template bundle can be temporarily overridden in tests", () => {
  const originalBundle = TEMPLATE_BUNDLES.default;

  try {
    TEMPLATE_BUNDLES.default = [{
      content: "override",
      encoding: "utf8",
      path: "README.md",
    }];

    assertEquals(resolveTemplateFiles("default")[0]?.path, "README.md");
  } finally {
    TEMPLATE_BUNDLES.default = originalBundle;
  }
});
