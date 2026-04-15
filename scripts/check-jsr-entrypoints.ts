const ENTRYPOINTS = [
  "packages/core/src/mod.ts",
  "packages/core/src/admin.ts",
  "packages/core/src/admin/modules/audit.ts",
  "packages/core/src/admin/modules/rbac.ts",
  "packages/core/src/admin/modules/sessions.ts",
  "packages/core/src/auth.ts",
  "packages/core/src/drizzle.ts",
  "packages/core/src/http/oak-api.ts",
  "packages/core/src/openapi.ts",
  "packages/core/src/testing.ts",
  "packages/core/src/value-object.ts",
  "packages/init/mod.ts",
] as const;

const missingModuleDocs: string[] = [];

for (const entrypoint of ENTRYPOINTS) {
  const source = await Deno.readTextFile(entrypoint);
  const trimmed = source.trimStart();

  if (!trimmed.startsWith("/**")) {
    missingModuleDocs.push(entrypoint);
    continue;
  }

  const commentEnd = trimmed.indexOf("*/");
  const leadingComment = commentEnd === -1 ? "" : trimmed.slice(0, commentEnd);

  if (!leadingComment.includes("@module")) {
    missingModuleDocs.push(entrypoint);
  }
}

if (missingModuleDocs.length > 0) {
  console.error("Missing JSR module docs in the following entrypoints:");

  for (const entrypoint of missingModuleDocs) {
    console.error(`- ${entrypoint}`);
  }

  Deno.exit(1);
}

console.log(
  `Verified JSR module docs for ${ENTRYPOINTS.length} public entrypoints.`,
);
