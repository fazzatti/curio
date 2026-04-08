/**
 * Root Curio SDK entrypoint.
 *
 * @remarks
 * This barrel exports the framework-agnostic HTTP helpers, DB layer, schema
 * adapters, and shared primitives used across Curio backends.
 */
export { API } from "@/api/api.ts";
export {
  DuplicateMiddlewareDataKeyError,
  DuplicateRegisteredRouteError,
  DuplicateRouteSegmentError,
  InvalidRouteSegmentError,
  MismatchedRouteMethodError,
} from "@/api/api.ts";
export { createMiddlewareFactory, middleware } from "@/api/middleware.ts";
export {
  createEndpointOperations,
  DELETE,
  GET,
  PATCH,
  POST,
  PUT,
} from "@/api/endpoint-operations.ts";
export { createRouteFactory, Route } from "@/api/route.ts";
export {
  withSchemas,
} from "@/api/with-schemas.ts";
export type {
  Endpoint,
  EndpointMethod,
  EnsureUniqueMiddlewareKeys,
  KeyedRouteMiddleware,
  KeyedRouteMiddlewareHandler,
  MiddlewareDataFromDefinitions,
  MiddlewareHalt,
  MiddlewareHaltOutput,
  PassThroughRouteMiddleware,
  PassThroughRouteMiddlewareHandler,
  RegisteredRoute,
  RouteHandler,
  RouteMethodConfig,
  RouteMethodDocs,
  RouteMethodEntry,
  RouteMethodOperation,
  RouteMiddleware,
  RouteOptions,
  RouteResponseDocs,
  RouteSegment,
  WithMiddlewareData,
} from "@/api/types.ts";
export type {
  CurioHttpContext,
  CurioHttpRequest,
  CurioHttpResponse,
  HttpAdapter,
  HttpResponseHeaders,
  HttpResponseOutput,
} from "@/http/types.ts";
export { valibotSchemaAdapter } from "@/schema/valibot.ts";
export type { InferValibotSchema, ValibotSchema } from "@/schema/valibot.ts";
export { SchemaValidationError } from "@/schema/types.ts";
export type {
  SchemaAdapter,
  SchemaValidationFailure,
  SchemaValidationResult,
  SchemaValidationSuccess,
} from "@/schema/types.ts";
export { Database } from "@/db/database.ts";
export { Entity } from "@/db/entity.ts";
export {
  DuplicateModelVariantError,
  InvalidModelPrimaryKeyError,
  MissingRelationForeignKeyError,
  MissingRequiredFieldError,
  ModelFieldConflictError,
  ModelMetadataConflictError,
  NonNullableFieldError,
  NotFoundError,
  ReservedTableKeyError,
  TableRegistrationNameMismatchError,
  UniqueConstraintViolationError,
  UnknownModelFieldError,
  UnknownRelationForeignKeyError,
  UnknownRelationReferenceError,
  UnknownRelationTargetError,
} from "@/db/errors.ts";
export { field, REDACTED_FIELD_VALUE } from "@/db/field.ts";
export { memoryDatabaseAdapter } from "@/db/memory-adapter.ts";
export { Model } from "@/db/model.ts";
export { relation } from "@/db/relation.ts";
export { Timestamps, UuidPrimaryKey } from "@/db/variant.ts";
export type {
  DatabaseAdapter,
  DatabaseCreateInput,
  DatabaseInstance,
  DatabaseValidationAdapter,
  DatabaseValidationBinding,
  FindManyOptions,
  FindOneOptions,
  IncludeClause,
  ModelLabels,
  ModelValidationConfig,
  ModelValidationEntry,
  OrderByClause,
  Repository,
  WhereClause,
  WriteOptions,
} from "@/db/types.ts";
export type { BoundEntityClass, HydratedEntityInstance } from "@/db/entity.ts";
export type { FieldDefinition, FieldKind, FieldOptions } from "@/db/field.ts";
export type { ModelOptions } from "@/db/model.ts";
export type { RelationDefinition, RelationKind } from "@/db/relation.ts";
