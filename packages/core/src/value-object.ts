/**
 * Curio value-object entrypoint.
 *
 * @remarks
 * Import from `@curio/core/value-object` when you want Valibot-backed,
 * class-based value objects without expanding the root core happy path.
 */
export {
  assertValueObject,
  getValueObjectDefinition,
  isValueObjectClass,
  isValueObjectInstance,
  parseValueObject,
  ValueObject,
} from "@/value-object/base.ts";
export type {
  ValueObjectClass,
  ValueObjectDefinition,
} from "@/value-object/base.ts";
