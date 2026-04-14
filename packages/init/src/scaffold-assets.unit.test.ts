import {
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import {
  assertTemplateFileSupported,
  INIT_PACKAGE_CONFIG_URL,
  readScaffoldAssetBytes,
  readScaffoldAssetText,
  resolveTemplateFiles,
  resolveTemplateFileUrl,
} from "./scaffold-assets.ts";

const defaultTemplateDir = fromFileUrl(
  new URL("../template/default", import.meta.url),
);

const listFiles = async (directory: string): Promise<string[]> => {
  const files: string[] = [];

  for await (const entry of Deno.readDir(directory)) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory) {
      files.push(
        ...(await listFiles(entryPath)).map((path) => join(entry.name, path)),
      );
      continue;
    }

    files.push(entry.name);
  }

  return files.sort();
};

Deno.test("resolveTemplateFiles matches the default template contents", async () => {
  const expectedFiles = await listFiles(defaultTemplateDir);

  assertEquals([...resolveTemplateFiles("default")].sort(), expectedFiles);
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

Deno.test("readScaffoldAssetText reads local and remote text assets", async () => {
  const localConfig = await readScaffoldAssetText(INIT_PACKAGE_CONFIG_URL);
  assertStringIncludes(localConfig, '"name": "@curio/init"');

  const remoteText = await readScaffoldAssetText(
    new URL("https://example.com/template.txt"),
    (url) => {
      assertEquals(String(url), "https://example.com/template.txt");

      return Promise.resolve(new Response("remote template"));
    },
  );

  assertEquals(remoteText, "remote template");
});

Deno.test("readScaffoldAssetBytes reads remote scaffold assets", async () => {
  const bytes = await readScaffoldAssetBytes(
    new URL("https://example.com/template.bin"),
    (url) => {
      assertEquals(String(url), "https://example.com/template.bin");

      return Promise.resolve(new Response(new Uint8Array([1, 2, 3])));
    },
  );

  assertEquals([...bytes], [1, 2, 3]);
});

Deno.test("scaffold asset readers reject failed remote requests", async () => {
  await assertRejects(
    async () => {
      await readScaffoldAssetText(
        new URL("https://example.com/missing.txt"),
        () => Promise.resolve(new Response("missing", { status: 404 })),
      );
    },
    Error,
    "Failed to read scaffold asset: https://example.com/missing.txt",
  );

  await assertRejects(
    async () => {
      await readScaffoldAssetBytes(
        new URL("https://example.com/missing.bin"),
        () => Promise.resolve(new Response("missing", { status: 404 })),
      );
    },
    Error,
    "Failed to read scaffold asset: https://example.com/missing.bin",
  );
});

Deno.test("assertTemplateFileSupported rejects local symlinks", async () => {
  const templateAssetUrl = resolveTemplateFileUrl("default", ".gitignore");
  const originalLstat = Deno.lstat;

  Deno.lstat = ((path) => {
    if (String(path) === templateAssetUrl.href) {
      return Promise.resolve({
        isDirectory: false,
        isFile: false,
        isSymlink: true,
      } as Deno.FileInfo);
    }

    return originalLstat(path);
  }) as typeof Deno.lstat;

  try {
    await assertRejects(
      async () => {
        await assertTemplateFileSupported(templateAssetUrl);
      },
      Error,
      "Template symlinks are not supported",
    );
  } finally {
    Deno.lstat = originalLstat;
  }
});

Deno.test("assertTemplateFileSupported skips filesystem checks for remote assets", async () => {
  await assertTemplateFileSupported(
    new URL("https://example.com/template.txt"),
  );
});

Deno.test("assertTemplateFileSupported rejects non-file local entries", async () => {
  const templateAssetUrl = resolveTemplateFileUrl("default", ".gitignore");
  const originalLstat = Deno.lstat;

  Deno.lstat = ((path) => {
    if (String(path) === templateAssetUrl.href) {
      return Promise.resolve({
        isDirectory: true,
        isFile: false,
        isSymlink: false,
      } as Deno.FileInfo);
    }

    return originalLstat(path);
  }) as typeof Deno.lstat;

  try {
    await assertRejects(
      async () => {
        await assertTemplateFileSupported(templateAssetUrl);
      },
      Error,
      "Template entries must be files",
    );
  } finally {
    Deno.lstat = originalLstat;
  }
});

Deno.test("resolveTemplateFileUrl keeps manifest paths rooted under the template", () => {
  const templateFileUrl = resolveTemplateFileUrl(
    "default",
    "src/http/server.ts",
  );
  const relativePath = relative(
    defaultTemplateDir,
    fromFileUrl(templateFileUrl),
  );

  assertEquals(relativePath.replaceAll("\\", "/"), "src/http/server.ts");
});
