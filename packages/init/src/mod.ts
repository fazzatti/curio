/**
 * Programmatic Curio init entrypoint.
 *
 * @module
 *
 * @remarks
 * Import from `@curio/init` when you want to parse scaffold arguments or
 * assemble a Curio project from code instead of invoking the CLI directly.
 */
export {
  DEFAULT_TEMPLATE,
  helpText,
  type ParsedInitArgs,
  parseInitArgs,
  runInit,
  type RunInitOptions,
  scaffoldProject,
  type ScaffoldProjectOptions,
  type ScaffoldProjectResult,
  type TemplateName,
} from "./init.ts";
