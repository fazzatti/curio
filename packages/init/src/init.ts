import { basename, dirname, join, relative, resolve } from "@std/path";
import {
  INIT_PACKAGE_CONFIG,
  readScaffoldAssetBytes,
  readScaffoldAssetText,
  resolveTemplateFiles,
} from "./scaffold-assets.ts";
import { defaultSelectPrompt, type SelectPrompt } from "./select-prompt.ts";

export const DEFAULT_TEMPLATE = "default" as const;
export const DEFAULT_IDE = "other" as const;
export const VSCODE_IDE = "vscode" as const;

export type TemplateName = typeof DEFAULT_TEMPLATE;
export type IdeChoice = typeof DEFAULT_IDE | typeof VSCODE_IDE;

export type ParsedInitArgs = {
  directory?: string;
  force: boolean;
  help: boolean;
  template: TemplateName;
};

export type ScaffoldProjectOptions = {
  force?: boolean;
  ide?: IdeChoice;
  projectName?: string;
  targetDir: string;
  template?: TemplateName;
};

export type ScaffoldProjectResult = {
  projectDir: string;
  ide: IdeChoice;
  projectName: string;
  projectSlug: string;
  template: TemplateName;
};

export type RunInitOptions = {
  cwd?: string;
  isInteractive?: () => boolean;
  select?: SelectPrompt;
  stderr?: (message: string) => void;
  stdout?: (message: string) => void;
};

const CORE_IMPORT_KEYS = [
  "@curio/core",
  "@curio/core/admin",
  "@curio/core/admin/modules/rbac",
  "@curio/core/auth",
  "@curio/core/drizzle",
  "@curio/core/http/oak",
] as const;

const TEMPLATE_PLACEHOLDERS = {
  "__CURIO_PROJECT_NAME__": (context: TemplateContext) => context.projectName,
  "{{CURIO_PROJECT_NAME}}": (context: TemplateContext) => context.projectName,
  "__CURIO_PROJECT_SLUG__": (context: TemplateContext) => context.projectSlug,
  "__CURIO_PROJECT_DB_IDENTIFIER__": (context: TemplateContext) =>
    context.projectDatabaseIdentifier,
  "__CURIO_CORE_IMPORT__": (context: TemplateContext) =>
    context.coreImports["@curio/core"],
  "__CURIO_CORE_ADMIN_IMPORT__": (context: TemplateContext) =>
    context.coreImports["@curio/core/admin"],
  "__CURIO_CORE_ADMIN_MODULES_RBAC_IMPORT__": (context: TemplateContext) =>
    context.coreImports["@curio/core/admin/modules/rbac"],
  "__CURIO_CORE_AUTH_IMPORT__": (context: TemplateContext) =>
    context.coreImports["@curio/core/auth"],
  "__CURIO_CORE_DRIZZLE_IMPORT__": (context: TemplateContext) =>
    context.coreImports["@curio/core/drizzle"],
  "__CURIO_CORE_HTTP_OAK_IMPORT__": (context: TemplateContext) =>
    context.coreImports["@curio/core/http/oak"],
  "CURIO_VSCODE_README_SECTION_PLACEHOLDER": (context: TemplateContext) =>
    context.vscodeReadmeSection,
} as const;

const IDE_OPTIONS = [
  { label: "VS Code", value: VSCODE_IDE },
  { label: "Other", value: DEFAULT_IDE },
] as const;

const VSCODE_README_SECTION = `## VS Code

If you use VS Code, install the official Deno extension.

After opening the project, make sure Deno is enabled for this workspace. If
VS Code prompts you, run "Deno: Initialize Workspace Configuration".`;

type TemplateContext = {
  projectDatabaseIdentifier: string;
  projectName: string;
  projectSlug: string;
  coreImports: Record<(typeof CORE_IMPORT_KEYS)[number], string>;
  vscodeReadmeSection: string;
};

export const helpText: string = `Create a new Curio project.

Usage:
  deno run -Ar jsr:@curio/init <directory>

Options:
  --template <name>   Template to scaffold. Currently supports only "default".
  --force             Allow scaffolding into an existing non-empty directory.
  -h, --help          Show this help message.
`;

const formatProjectName = (slug: string): string => {
  return slug
    .split("-")
    .filter(Boolean)
    .map((segment) => {
      return `${segment[0].toUpperCase()}${segment.slice(1)}`;
    })
    .join(" ");
};

const formatInitError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const slugifyProjectName = (value: string): string => {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const toDatabaseIdentifier = (slug: string): string => {
  return slug.replace(/-/g, "_");
};

const isDirectoryEmpty = async (path: string): Promise<boolean> => {
  for await (const _entry of Deno.readDir(path)) {
    return false;
  }

  return true;
};

const ensureTargetDirectory = async (
  path: string,
  force: boolean,
): Promise<void> => {
  try {
    const stat = await Deno.stat(path);

    if (!stat.isDirectory) {
      throw new Error(`Target path is not a directory: ${path}`);
    }

    if (!force && !(await isDirectoryEmpty(path))) {
      throw new Error(
        `Target directory is not empty: ${path}. Use --force to continue.`,
      );
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      await Deno.mkdir(path, { recursive: true });
      return;
    }

    throw error;
  }
};

const renderTemplate = (
  content: string,
  context: TemplateContext,
): string => {
  let rendered = content;

  for (
    const [placeholder, resolveValue] of Object.entries(
      TEMPLATE_PLACEHOLDERS,
    )
  ) {
    rendered = rendered.replaceAll(placeholder, resolveValue(context));
  }

  return rendered;
};

const readCoreImports = (): Record<
  (typeof CORE_IMPORT_KEYS)[number],
  string
> => {
  const imports = INIT_PACKAGE_CONFIG.imports ?? {};
  const resolvedImports = {} as Record<
    (typeof CORE_IMPORT_KEYS)[number],
    string
  >;

  for (const key of CORE_IMPORT_KEYS) {
    const value = imports[key];

    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Missing scaffold import mapping for ${key}.`);
    }

    resolvedImports[key] = value;
  }

  return resolvedImports;
};

const copyTemplateDirectory = async (
  template: TemplateName,
  ide: IdeChoice,
  targetDir: string,
  context: TemplateContext,
): Promise<void> => {
  await Deno.mkdir(targetDir, { recursive: true });

  const bundleNames: string[] = [template];

  if (ide === VSCODE_IDE) {
    bundleNames.push(VSCODE_IDE);
  }

  for (const bundleName of bundleNames) {
    for (const templateFile of resolveTemplateFiles(bundleName)) {
      const targetPath = join(targetDir, templateFile.path);
      await Deno.mkdir(dirname(targetPath), { recursive: true });

      if (templateFile.encoding === "utf8") {
        await Deno.writeTextFile(
          targetPath,
          renderTemplate(readScaffoldAssetText(templateFile), context),
        );
        continue;
      }

      await Deno.writeFile(targetPath, readScaffoldAssetBytes(templateFile));
    }
  }
};

const resolveScaffoldInput = (
  parsedArgs: ParsedInitArgs,
  cwd: string,
): ScaffoldProjectOptions => {
  const directory = parsedArgs.directory?.trim();

  if (!directory) {
    throw new Error("Project directory is required.");
  }

  return {
    force: parsedArgs.force,
    targetDir: resolve(cwd, directory),
    template: parsedArgs.template,
  };
};

export const parseInitArgs = (args: string[]): ParsedInitArgs => {
  const parsedArgs: ParsedInitArgs = {
    force: false,
    help: false,
    template: DEFAULT_TEMPLATE,
  };

  const positionalArgs: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case "--":
        break;
      case "--force":
        parsedArgs.force = true;
        break;
      case "--help":
      case "-h":
        parsedArgs.help = true;
        break;
      case "--template": {
        const value = args[index + 1];

        if (!value) {
          throw new Error("Missing value for --template.");
        }

        if (value !== DEFAULT_TEMPLATE) {
          throw new Error(
            `Unknown template "${value}". Supported templates: ${DEFAULT_TEMPLATE}.`,
          );
        }

        parsedArgs.template = value;
        index += 1;
        break;
      }
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }

        positionalArgs.push(arg);
    }
  }

  if (positionalArgs.length > 1) {
    throw new Error("Expected at most one target directory.");
  }

  if (positionalArgs.length === 1) {
    parsedArgs.directory = positionalArgs[0];
  }

  return parsedArgs;
};

export const scaffoldProject = async (
  options: ScaffoldProjectOptions,
): Promise<ScaffoldProjectResult> => {
  const ide = options.ide ?? DEFAULT_IDE;
  const template = options.template ?? DEFAULT_TEMPLATE;
  const targetDir = resolve(options.targetDir);
  const projectSlug = slugifyProjectName(basename(targetDir));

  if (!projectSlug) {
    throw new Error(
      `Could not derive a valid project slug from target directory: ${targetDir}`,
    );
  }

  const projectName = options.projectName?.trim() ||
    formatProjectName(projectSlug);

  await ensureTargetDirectory(targetDir, options.force ?? false);

  const context: TemplateContext = {
    projectDatabaseIdentifier: toDatabaseIdentifier(projectSlug),
    projectName,
    projectSlug,
    coreImports: readCoreImports(),
    vscodeReadmeSection: ide === VSCODE_IDE ? VSCODE_README_SECTION : "",
  };

  await copyTemplateDirectory(template, ide, targetDir, context);

  return {
    projectDir: targetDir,
    ide,
    projectName,
    projectSlug,
    template,
  };
};

export const runInit = async (
  args: string[],
  options: RunInitOptions = {},
): Promise<number> => {
  const stdout = options.stdout ?? console.log;
  const stderr = options.stderr ?? console.error;
  const cwd = options.cwd ?? Deno.cwd();
  const isInteractive = options.isInteractive ??
    (() => Deno.stdin.isTerminal());
  const select = options.select ?? defaultSelectPrompt;

  try {
    const parsedArgs = parseInitArgs(args);

    if (parsedArgs.help) {
      stdout(helpText.trimEnd());
      return 0;
    }

    const scaffoldInput = resolveScaffoldInput(parsedArgs, cwd);
    const ide = isInteractive()
      ? await select({
        message: "Which IDE are you using?",
        options: IDE_OPTIONS,
      })
      : DEFAULT_IDE;

    if (ide === null) {
      throw new Error("Project initialization cancelled.");
    }

    scaffoldInput.ide = ide;
    const result = await scaffoldProject(scaffoldInput);
    const relativeProjectPath = relative(cwd, result.projectDir) || ".";

    const nextSteps = [
      `Created ${result.projectName} in ${result.projectDir}.`,
      "",
      "Next steps:",
      relativeProjectPath === "." ? undefined : `  cd ${relativeProjectPath}`,
      "  cp .env.example .env",
      "  deno task db:up",
      "  deno task start",
      result.ide === VSCODE_IDE
        ? "  Install the Deno VS Code extension and enable it for this workspace"
        : undefined,
    ].filter((line): line is string => Boolean(line));

    stdout(nextSteps.join("\n"));
    return 0;
  } catch (error) {
    stderr(formatInitError(error));
    return 1;
  }
};
