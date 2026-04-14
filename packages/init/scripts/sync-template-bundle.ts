import { Buffer } from "node:buffer";
import { join, relative } from "@std/path";

type TemplateFile = {
  content: string;
  encoding: "base64" | "utf8";
  path: string;
};

const TEMPLATE_ROOT = new URL("../template/default/", import.meta.url);
const OUTPUT_FILE = new URL("../template/default.bundle.json", import.meta.url);
const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

const collectTemplateFiles = async (
  directory: URL,
  rootDirectory: URL,
): Promise<TemplateFile[]> => {
  const files: TemplateFile[] = [];

  for await (const entry of Deno.readDir(directory)) {
    const entryUrl = new URL(entry.name, directory);

    if (entry.isSymlink) {
      throw new Error(`Template symlinks are not supported: ${entry.name}`);
    }

    if (entry.isDirectory) {
      files.push(
        ...(await collectTemplateFiles(
          new URL(`${entry.name}/`, directory),
          rootDirectory,
        )),
      );
      continue;
    }

    const filePath = relative(
      new URL(".", rootDirectory).pathname,
      entryUrl.pathname,
    ).replaceAll("\\", "/");
    const fileBytes = await Deno.readFile(entryUrl);

    try {
      files.push({
        content: UTF8_DECODER.decode(fileBytes),
        encoding: "utf8",
        path: filePath,
      });
    } catch {
      files.push({
        content: Buffer.from(fileBytes).toString("base64"),
        encoding: "base64",
        path: filePath,
      });
    }
  }

  return files.sort((left, right) => left.path.localeCompare(right.path));
};

const files = await collectTemplateFiles(TEMPLATE_ROOT, TEMPLATE_ROOT);

await Deno.writeTextFile(
  OUTPUT_FILE,
  `${JSON.stringify({ files }, null, 2)}\n`,
);

console.log(
  `Wrote ${
    join(
      "packages",
      "init",
      "template",
      "default.bundle.json",
    )
  } with ${files.length} files.`,
);
