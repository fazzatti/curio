import initPackageConfig from "../deno.json" with { type: "json" };
import defaultTemplateBundle from "../template/default.bundle.json" with {
  type: "json",
};

export type TemplateFileEncoding = "base64" | "utf8";

export type TemplateFile = {
  content: string;
  encoding: TemplateFileEncoding;
  path: string;
};

type TemplateBundle = {
  files: readonly TemplateFile[];
};

type InitPackageConfig = {
  imports?: Record<string, unknown>;
};

const UTF8_ENCODER = new TextEncoder();

const parsedDefaultTemplateBundle = defaultTemplateBundle as TemplateBundle;

export const INIT_PACKAGE_CONFIG = initPackageConfig as InitPackageConfig;

export const TEMPLATE_BUNDLES: Record<string, readonly TemplateFile[]> = {
  default: parsedDefaultTemplateBundle.files,
};

const decodeBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

export const readScaffoldAssetBytes = (file: TemplateFile): Uint8Array => {
  if (file.encoding === "base64") {
    return decodeBase64(file.content);
  }

  return UTF8_ENCODER.encode(file.content);
};

export const readScaffoldAssetText = (file: TemplateFile): string => {
  if (file.encoding !== "utf8") {
    throw new Error(`Template file is not text: ${file.path}`);
  }

  return file.content;
};

export const resolveTemplateFiles = (
  template: string,
): readonly TemplateFile[] => {
  const files = TEMPLATE_BUNDLES[template];

  if (!files) {
    throw new Error(`Unknown template "${template}".`);
  }

  return files;
};
