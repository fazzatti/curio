import { Buffer } from "node:buffer";
import { join, relative } from "@std/path";

type TemplateFile = {
  content: string;
  encoding: "base64" | "utf8";
  path: string;
};

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

const BUNDLE_SOURCES = [
  {
    inputRoot: new URL("../template/default/", import.meta.url),
    outputFile: new URL("../template/default.bundle.json", import.meta.url),
    outputLabel: join("packages", "init", "template", "default.bundle.json"),
  },
  {
    inputRoot: new URL("../template/features/vscode/", import.meta.url),
    outputFile: new URL("../template/vscode.bundle.json", import.meta.url),
    outputLabel: join("packages", "init", "template", "vscode.bundle.json"),
  },
] as const;

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

for (const bundle of BUNDLE_SOURCES) {
  const files = await collectTemplateFiles(bundle.inputRoot, bundle.inputRoot);

  await Deno.writeTextFile(
    bundle.outputFile,
    `${JSON.stringify({ files }, null, 2)}\n`,
  );

  console.log(`Wrote ${bundle.outputLabel} with ${files.length} files.`);
}
