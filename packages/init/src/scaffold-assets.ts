import templateManifest from "../template/manifest.json" with { type: "json" };

export const INIT_PACKAGE_CONFIG_URL = new URL("../deno.json", import.meta.url);
const TEMPLATE_ROOT_URL = new URL("../template/", import.meta.url);

const parsedTemplateManifest = templateManifest as Record<
  string,
  readonly string[]
>;

export const readScaffoldAssetBytes = async (
  assetUrl: URL,
  fetchImpl: typeof fetch = fetch,
): Promise<Uint8Array> => {
  if (assetUrl.protocol === "file:") {
    return await Deno.readFile(assetUrl);
  }

  const response = await fetchImpl(assetUrl);

  if (!response.ok) {
    throw new Error(`Failed to read scaffold asset: ${assetUrl.href}`);
  }

  return new Uint8Array(await response.arrayBuffer());
};

export const readScaffoldAssetText = async (
  assetUrl: URL,
  fetchImpl: typeof fetch = fetch,
): Promise<string> => {
  if (assetUrl.protocol === "file:") {
    return await Deno.readTextFile(assetUrl);
  }

  const response = await fetchImpl(assetUrl);

  if (!response.ok) {
    throw new Error(`Failed to read scaffold asset: ${assetUrl.href}`);
  }

  return await response.text();
};

export const resolveTemplateFiles = (template: string): readonly string[] => {
  const files = parsedTemplateManifest[template];

  if (!files) {
    throw new Error(`Unknown template "${template}".`);
  }

  return files;
};

export const resolveTemplateFileUrl = (
  template: string,
  relativePath: string,
): URL => {
  return new URL(relativePath, new URL(`${template}/`, TEMPLATE_ROOT_URL));
};

export const assertTemplateFileSupported = async (
  assetUrl: URL,
): Promise<void> => {
  if (assetUrl.protocol !== "file:") {
    return;
  }

  const stat = await Deno.lstat(assetUrl);

  if (stat.isSymlink) {
    throw new Error(`Template symlinks are not supported: ${assetUrl.href}`);
  }

  if (!stat.isFile) {
    throw new Error(`Template entries must be files: ${assetUrl.href}`);
  }
};
