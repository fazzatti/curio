import {
  assert,
  assertEquals,
  assertRejects,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { dirname, fromFileUrl, join, relative } from "@std/path";
import { parseInitArgs, runInit, scaffoldProject } from "./init.ts";

const localCoreImportMap = {
  "@curio/core": "./.curio-core/src/mod.ts",
  "@curio/core/admin": "./.curio-core/src/admin.ts",
  "@curio/core/admin/modules/rbac": "./.curio-core/src/admin/modules/rbac.ts",
  "@curio/core/auth": "./.curio-core/src/auth.ts",
  "@curio/core/drizzle": "./.curio-core/src/drizzle.ts",
  "@curio/core/http/oak": "./.curio-core/src/http/oak-api.ts",
} as const;

const coreSourceRoot = fromFileUrl(
  new URL("../../../packages/core/src", import.meta.url),
);
const initPackageConfigPath = fromFileUrl(
  new URL("../deno.json", import.meta.url),
);
const initPackageConfigUrl = new URL("../deno.json", import.meta.url).href;
const corePackageConfigPath = fromFileUrl(
  new URL("../../../packages/core/deno.json", import.meta.url),
);
const defaultTemplateDir = fromFileUrl(
  new URL("../template/default", import.meta.url),
);

const canRunScaffoldTests = await (async (): Promise<boolean> => {
  const [read, run, write] = await Promise.all([
    Deno.permissions.query({ name: "read" }),
    Deno.permissions.query({ name: "run" }),
    Deno.permissions.query({ name: "write" }),
  ]);

  return read.state === "granted" &&
    run.state === "granted" &&
    write.state === "granted";
})();

const readCoreDependencyImports = (): Record<string, string> => {
  const rawConfig = Deno.readTextFileSync(corePackageConfigPath);
  const config = JSON.parse(rawConfig) as {
    imports?: Record<string, string>;
  };

  return Object.fromEntries(
    Object.entries(config.imports ?? {}).filter(([key]) => key !== "@/"),
  );
};

const copyDirectory = async (
  sourceDir: string,
  targetDir: string,
): Promise<void> => {
  await Deno.mkdir(targetDir, { recursive: true });

  for await (const entry of Deno.readDir(sourceDir)) {
    const sourcePath = join(sourceDir, entry.name);
    const targetPath = join(targetDir, entry.name);

    if (entry.isDirectory) {
      await copyDirectory(sourcePath, targetPath);
      continue;
    }

    await Deno.copyFile(sourcePath, targetPath);
  }
};

const rewriteCoreAliases = async (
  directory: string,
  sourceRoot = directory,
): Promise<void> => {
  for await (const entry of Deno.readDir(directory)) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory) {
      await rewriteCoreAliases(entryPath, sourceRoot);
      continue;
    }

    if (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx")) {
      continue;
    }

    const source = await Deno.readTextFile(entryPath);
    const rewritten = source.replaceAll(
      /(["'])@\/([^"']+)["']/g,
      (_match, quote: string, specifierPath: string) => {
        const resolvedTarget = join(sourceRoot, specifierPath);
        let relativeSpecifier = relative(
          dirname(entryPath),
          resolvedTarget,
        ).replaceAll("\\", "/");

        if (!relativeSpecifier.startsWith(".")) {
          relativeSpecifier = `./${relativeSpecifier}`;
        }

        return `${quote}${relativeSpecifier}${quote}`;
      },
    );

    await Deno.writeTextFile(entryPath, rewritten);
  }
};

const patchGeneratedProjectForWorkspaceCore = async (
  projectDir: string,
): Promise<void> => {
  const localCoreDir = join(projectDir, ".curio-core", "src");
  const denoConfigPath = join(projectDir, "deno.json");

  await copyDirectory(coreSourceRoot, localCoreDir);
  await rewriteCoreAliases(localCoreDir);

  const rawConfig = await Deno.readTextFile(denoConfigPath);
  const config = JSON.parse(rawConfig) as {
    imports?: Record<string, string>;
  };

  config.imports = {
    ...(config.imports ?? {}),
    ...readCoreDependencyImports(),
    ...localCoreImportMap,
  };

  await Deno.writeTextFile(
    denoConfigPath,
    `${JSON.stringify(config, null, 2)}\n`,
  );
};

Deno.test("parseInitArgs reads the supported scaffold flags", () => {
  const parsedArgs = parseInitArgs([
    "my-app",
    "--name",
    "My App",
    "--template",
    "default",
    "--force",
  ]);

  assertEquals(parsedArgs, {
    directory: "my-app",
    force: true,
    help: false,
    projectName: "My App",
    template: "default",
  });
});

Deno.test("parseInitArgs rejects missing flag values and unknown arguments", () => {
  assertThrows(
    () => parseInitArgs(["--name"]),
    Error,
    "Missing value for --name.",
  );
  assertThrows(
    () => parseInitArgs(["--template"]),
    Error,
    "Missing value for --template.",
  );
  assertThrows(
    () => parseInitArgs(["--template", "other"]),
    Error,
    'Unknown template "other". Supported templates: default.',
  );
  assertThrows(
    () => parseInitArgs(["--nope"]),
    Error,
    "Unknown option: --nope",
  );
  assertThrows(
    () => parseInitArgs(["one", "two"]),
    Error,
    "Expected at most one target directory.",
  );
});

Deno.test("parseInitArgs accepts help shorthand and the bare separator", () => {
  assertEquals(parseInitArgs(["-h"]), {
    force: false,
    help: true,
    template: "default",
  });
  assertEquals(parseInitArgs(["--"]), {
    force: false,
    help: false,
    template: "default",
  });
});

Deno.test("runInit prints help text and exits cleanly", async () => {
  const stdout: string[] = [];
  const stderr: string[] = [];

  const exitCode = await runInit(["--help"], {
    stdout: (message) => stdout.push(message),
    stderr: (message) => stderr.push(message),
  });

  assertEquals(exitCode, 0);
  assertEquals(stderr, []);
  assertStringIncludes(stdout[0] ?? "", "Create a new Curio project.");
  assertStringIncludes(stdout[0] ?? "", "deno run -Ar jsr:@curio/init");
});

Deno.test("runInit reports parse and non-interactive scaffold errors", async () => {
  const parseErrors: string[] = [];
  const parseExitCode = await runInit(["--nope"], {
    stderr: (message) => parseErrors.push(message),
  });

  assertEquals(parseExitCode, 1);
  assertEquals(parseErrors, ["Unknown option: --nope"]);

  const scaffoldErrors: string[] = [];
  const scaffoldExitCode = await runInit([], {
    isInteractive: () => false,
    stderr: (message) => scaffoldErrors.push(message),
  });

  assertEquals(scaffoldExitCode, 1);
  assertEquals(scaffoldErrors, ["Project directory is required."]);
});

Deno.test({
  name:
    "runInit uses the default console writers and omits the cd step for the current directory",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });
    const originalLog = console.log;
    const originalError = console.error;
    const stdout: string[] = [];
    const stderr: string[] = [];

    console.log = ((message?: unknown) => {
      stdout.push(String(message ?? ""));
    }) as typeof console.log;
    console.error = ((message?: unknown) => {
      stderr.push(String(message ?? ""));
    }) as typeof console.error;

    try {
      const successCode = await runInit(["."], {
        cwd: tempRoot,
      });

      assertEquals(successCode, 0);
      assertEquals(stderr, []);
      assertStringIncludes(stdout[0] ?? "", "Created");
      assertEquals((stdout[0] ?? "").includes("\n  cd "), false);

      const failureCode = await runInit(["--nope"]);
      assertEquals(failureCode, 1);
      assertEquals(stderr.at(-1), "Unknown option: --nope");
    } finally {
      console.log = originalLog;
      console.error = originalError;
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "runInit prompts for the project directory in interactive terminals",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });
    const workspaceDir = join(tempRoot, "workspace");
    const stdout: string[] = [];
    const stderr: string[] = [];

    await Deno.mkdir(workspaceDir);

    try {
      const exitCode = await runInit([], {
        cwd: workspaceDir,
        isInteractive: () => true,
        prompt: () => " prompted-app ",
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      });

      assertEquals(exitCode, 0);
      assertEquals(stderr, []);
      assertStringIncludes(stdout[0] ?? "", "Created Prompted App");
      assertStringIncludes(stdout[0] ?? "", "cd prompted-app");
      assert(await Deno.stat(join(workspaceDir, "prompted-app", "README.md")));
    } finally {
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test("runInit reports interactive prompt cancellation", async () => {
  const stderr: string[] = [];

  const exitCode = await runInit([], {
    isInteractive: () => true,
    prompt: () => null,
    stderr: (message) => stderr.push(message),
  });

  assertEquals(exitCode, 1);
  assertEquals(stderr, ["Project initialization cancelled."]);
});

Deno.test("runInit stringifies non-Error failures", async () => {
  const stderr: string[] = [];

  const exitCode = await runInit([], {
    isInteractive: () => true,
    prompt: () => {
      throw "prompt failed";
    },
    stderr: (message) => stderr.push(message),
  });

  assertEquals(exitCode, 1);
  assertEquals(stderr, ["prompt failed"]);
});

Deno.test({
  name: "scaffoldProject creates a Curio project from the default template",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });

    try {
      const projectDir = join(tempRoot, "hello-curio");
      const result = await scaffoldProject({
        targetDir: projectDir,
      });

      assertEquals(result.projectSlug, "hello-curio");
      assertEquals(result.projectName, "Hello Curio");

      const readme = await Deno.readTextFile(join(projectDir, "README.md"));
      const envExample = await Deno.readTextFile(
        join(projectDir, ".env.example"),
      );
      const composeYaml = await Deno.readTextFile(
        join(projectDir, "compose.yaml"),
      );
      const denoConfig = await Deno.readTextFile(join(projectDir, "deno.json"));
      const adminConfig = await Deno.readTextFile(
        join(projectDir, "src/http/admin/index.ts"),
      );

      assertStringIncludes(readme, "# Hello Curio");
      assertStringIncludes(envExample, "DB_NAME=hello_curio");
      assertStringIncludes(composeYaml, "container_name: hello-curio-db");
      assertStringIncludes(adminConfig, 'name: "Hello Curio Admin"');
      assert(!denoConfig.includes("__CURIO_"));

      await patchGeneratedProjectForWorkspaceCore(projectDir);

      const checkCommand = new Deno.Command(Deno.execPath(), {
        args: ["task", "--config", join(projectDir, "deno.json"), "check"],
        cwd: projectDir,
        stdout: "piped",
        stderr: "piped",
      });
      const output = await checkCommand.output();

      if (!output.success) {
        const decoder = new TextDecoder();

        throw new Error(
          [
            "Generated project check failed.",
            decoder.decode(output.stdout),
            decoder.decode(output.stderr),
          ].join("\n"),
        );
      }
    } finally {
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name:
    "scaffoldProject accepts force for existing directories and honors project name overrides",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });

    try {
      const projectDir = join(tempRoot, "existing-app");

      await Deno.mkdir(projectDir);
      await Deno.writeTextFile(join(projectDir, "README.md"), "# existing\n");

      const result = await scaffoldProject({
        force: true,
        projectName: "Custom App",
        targetDir: projectDir,
      });

      assertEquals(result.projectName, "Custom App");
      assertEquals(result.projectSlug, "existing-app");

      const readme = await Deno.readTextFile(join(projectDir, "README.md"));
      assertStringIncludes(readme, "# Custom App");
    } finally {
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "scaffoldProject accepts existing empty directories without force",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });

    try {
      const projectDir = join(tempRoot, "empty-app");
      await Deno.mkdir(projectDir);

      const result = await scaffoldProject({
        targetDir: projectDir,
      });

      assertEquals(result.projectSlug, "empty-app");
      assertEquals(result.projectName, "Empty App");
      assert(await Deno.stat(join(projectDir, "README.md")));
    } finally {
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "scaffoldProject rejects file paths and invalid derived slugs",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });

    try {
      const filePath = join(tempRoot, "not-a-directory");
      await Deno.writeTextFile(filePath, "content");

      await assertRejects(
        async () => {
          await scaffoldProject({
            targetDir: filePath,
          });
        },
        Error,
        "Target path is not a directory",
      );

      await assertRejects(
        async () => {
          await scaffoldProject({
            targetDir: join(tempRoot, "---"),
          });
        },
        Error,
        "Could not derive a valid project slug",
      );
    } finally {
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "scaffoldProject rejects missing core import mappings",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });
    const originalReadTextFileSync = Deno.readTextFileSync;

    Deno.readTextFileSync = ((path) => {
      if (
        String(path) === initPackageConfigPath ||
        String(path) === initPackageConfigUrl
      ) {
        return JSON.stringify({
          imports: {
            "@curio/core": "",
          },
        });
      }

      return originalReadTextFileSync(path);
    }) as typeof Deno.readTextFileSync;

    try {
      await assertRejects(
        async () => {
          await scaffoldProject({
            targetDir: join(tempRoot, "missing-imports"),
          });
        },
        Error,
        "Missing scaffold import mapping for @curio/core.",
      );
    } finally {
      Deno.readTextFileSync = originalReadTextFileSync;
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "scaffoldProject rejects missing core import sections",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });
    const originalReadTextFileSync = Deno.readTextFileSync;

    Deno.readTextFileSync = ((path) => {
      if (
        String(path) === initPackageConfigPath ||
        String(path) === initPackageConfigUrl
      ) {
        return JSON.stringify({});
      }

      return originalReadTextFileSync(path);
    }) as typeof Deno.readTextFileSync;

    try {
      await assertRejects(
        async () => {
          await scaffoldProject({
            targetDir: join(tempRoot, "missing-import-section"),
          });
        },
        Error,
        "Missing scaffold import mapping for @curio/core.",
      );
    } finally {
      Deno.readTextFileSync = originalReadTextFileSync;
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name:
    "scaffoldProject copies non-text template files when text decoding fails",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });
    const projectDir = join(tempRoot, "binary-template");
    const templateFilePath = join(defaultTemplateDir, ".gitignore");
    const originalReadTextFile = Deno.readTextFile;
    const templateFileContent = await Deno.readTextFile(templateFilePath);

    Deno.readTextFile = ((path, options) => {
      if (String(path) === templateFilePath) {
        throw new Deno.errors.InvalidData("binary template fixture");
      }

      return originalReadTextFile(path, options);
    }) as typeof Deno.readTextFile;

    try {
      await scaffoldProject({
        targetDir: projectDir,
      });

      assertEquals(
        await Deno.readTextFile(join(projectDir, ".gitignore")),
        templateFileContent,
      );
    } finally {
      Deno.readTextFile = originalReadTextFile;
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "scaffoldProject rethrows unexpected template read errors",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });
    const originalReadTextFile = Deno.readTextFile;
    const templateFilePath = join(defaultTemplateDir, ".gitignore");

    Deno.readTextFile = ((path, options) => {
      if (String(path) === templateFilePath) {
        throw new Error("template read failed");
      }

      return originalReadTextFile(path, options);
    }) as typeof Deno.readTextFile;

    try {
      await assertRejects(
        async () => {
          await scaffoldProject({
            targetDir: join(tempRoot, "broken-template"),
          });
        },
        Error,
        "template read failed",
      );
    } finally {
      Deno.readTextFile = originalReadTextFile;
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "scaffoldProject rejects symlink entries in the template",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });
    const originalReadDir = Deno.readDir;

    Deno.readDir = ((path) => {
      if (String(path) === defaultTemplateDir) {
        return (async function* () {
          yield {
            name: "linked",
            isDirectory: false,
            isFile: false,
            isSymlink: true,
          };
        })();
      }

      return originalReadDir(path);
    }) as typeof Deno.readDir;

    try {
      await assertRejects(
        async () => {
          await scaffoldProject({
            targetDir: join(tempRoot, "symlink-template"),
          });
        },
        Error,
        "Template symlinks are not supported",
      );
    } finally {
      Deno.readDir = originalReadDir;
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "scaffoldProject rejects non-empty directories without force",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });

    try {
      const projectDir = join(tempRoot, "existing-app");

      await Deno.mkdir(projectDir);
      await Deno.writeTextFile(join(projectDir, "README.md"), "# existing\n");

      await assertRejects(
        async () => {
          await scaffoldProject({
            targetDir: projectDir,
          });
        },
        Error,
        "Target directory is not empty",
      );
    } finally {
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});

Deno.test({
  name: "runInit scaffolds a project and prints next steps",
  ignore: !canRunScaffoldTests,
  async fn() {
    const tempRoot = await Deno.makeTempDir({ prefix: "curio-init-" });

    try {
      const stdout: string[] = [];
      const stderr: string[] = [];
      const exitCode = await runInit(["hello-curio"], {
        cwd: tempRoot,
        stdout: (message) => stdout.push(message),
        stderr: (message) => stderr.push(message),
      });

      assertEquals(exitCode, 0);
      assertEquals(stderr, []);
      assertStringIncludes(stdout[0] ?? "", "Created Hello Curio");
      assertStringIncludes(stdout[0] ?? "", "cd hello-curio");
      assertStringIncludes(stdout[0] ?? "", "deno task start");
    } finally {
      await Deno.remove(tempRoot, { recursive: true });
    }
  },
});
