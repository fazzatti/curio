import { INTERNALS } from "@/api/api.ts";
import type {
  EndpointMethod,
  RouteMethodDocs,
  RouteSegment,
} from "@/api/types.ts";
import type { CurioHttpContext } from "@/http/types.ts";
import type { ValibotSchema } from "@/schema/valibot.ts";
import { formatUnknownError } from "@/support/errors.ts";
import { toJsonSchema } from "@valibot/to-json-schema";

export type OpenApiInfo = {
  title: string;
  version: string;
  description?: string;
};

export type OpenApiServer = {
  url: string;
  description?: string;
};

export type OpenApiSchema = Record<string, unknown>;

export type OpenApiParameter = {
  name: string;
  in: "path" | "query";
  required: boolean;
  schema: OpenApiSchema;
};

export type OpenApiMediaType = {
  schema: OpenApiSchema;
};

export type OpenApiRequestBody = {
  required: boolean;
  content: {
    "application/json": OpenApiMediaType;
  };
};

export type OpenApiResponse = {
  description: string;
  content?: {
    "application/json": OpenApiMediaType;
  };
};

export type OpenApiOperation = {
  summary?: string;
  description?: string;
  tags?: readonly string[];
  operationId?: string;
  deprecated?: boolean;
  parameters?: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
};

export type OpenApiPathItem = Partial<
  Record<Lowercase<EndpointMethod>, OpenApiOperation>
>;

export type OpenApiDocument = {
  openapi: "3.1.0";
  info: OpenApiInfo;
  servers?: OpenApiServer[];
  paths: Record<string, OpenApiPathItem>;
};

export type OpenApiOptions = {
  info?: OpenApiInfo;
  servers?: OpenApiServer[];
  defaultResponseDescription?: string;
};

export type OpenApiNamespace = {
  from<TContext extends CurioHttpContext>(
    routes: RouteSegment<TContext>[],
    options?: OpenApiOptions,
  ): OpenApiDocument;
};

type OpenApiRequestSchemas = {
  pathParams?: ValibotSchema;
  query?: ValibotSchema;
  body?: ValibotSchema;
};

type OpenApiHandlerSchemas = {
  request?: OpenApiRequestSchemas;
  response?: ValibotSchema;
};

type JsonSchemaObjectShape = {
  properties?: Record<string, unknown>;
  required?: unknown;
};

export class OpenApiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpenApiGenerationError";
  }
}

const DEFAULT_INFO: OpenApiInfo = {
  title: "Curio API",
  version: "0.1.0",
};

const normalizeOpenApiPath = (path: string): string => {
  return path.replaceAll(/:([A-Za-z0-9_]+)/g, "{$1}");
};

const stripSchemaDocumentMeta = (schema: OpenApiSchema): OpenApiSchema => {
  const { $schema: _schema, ...rest } = schema;
  return rest;
};

const toOpenApiSchema = (
  schema: ValibotSchema,
  context: string,
): OpenApiSchema => {
  try {
    return stripSchemaDocumentMeta(
      toJsonSchema(schema) as unknown as OpenApiSchema,
    );
  } catch (error) {
    throw new OpenApiGenerationError(
      `${context}: failed to convert Valibot schema to JSON Schema: ${
        formatUnknownError(error)
      }`,
    );
  }
};

const toOpenApiParameters = (
  schema: ValibotSchema,
  location: "path" | "query",
  context: string,
): OpenApiParameter[] => {
  const jsonSchema = toOpenApiSchema(schema, context) as JsonSchemaObjectShape;
  const properties = jsonSchema.properties;

  if (!properties || Array.isArray(properties)) {
    throw new OpenApiGenerationError(
      `${context}: ${location} schema must be an object schema.`,
    );
  }

  const required = new Set(
    Array.isArray(jsonSchema.required) ? jsonSchema.required as string[] : [],
  );

  return Object.entries(properties).map(([name, propertySchema]) => ({
    name,
    in: location,
    required: location === "path" ? true : required.has(name),
    schema: propertySchema as OpenApiSchema,
  }));
};

const toOpenApiRequestBody = (
  schema: ValibotSchema,
  context: string,
): OpenApiRequestBody => ({
  required: true,
  content: {
    "application/json": {
      schema: toOpenApiSchema(schema, context),
    },
  },
});

const toOpenApiResponses = (
  schema: ValibotSchema | undefined,
  docs: RouteMethodDocs | undefined,
  defaultDescription: string,
  context: string,
): Record<string, OpenApiResponse> => {
  const responses: Record<string, OpenApiResponse> = {};

  for (const [status, responseDocs] of Object.entries(docs?.responses ?? {})) {
    if (!status.trim()) {
      continue;
    }

    responses[status] = {
      description: responseDocs.description ?? defaultDescription,
    };
  }

  const successStatus = docs?.successStatus ?? "200";
  const existingSuccessResponse = responses[successStatus];

  responses[successStatus] = {
    description: existingSuccessResponse?.description ?? defaultDescription,
    content: schema
      ? {
        "application/json": {
          schema: toOpenApiSchema(schema, context),
        },
      }
      : undefined,
  };

  return responses;
};

const toOpenApiOperation = (
  method: EndpointMethod,
  path: string,
  schemas: OpenApiHandlerSchemas | undefined,
  docs: RouteMethodDocs | undefined,
  options: OpenApiOptions,
): OpenApiOperation => {
  const parameters: OpenApiParameter[] = [];

  if (schemas?.request?.pathParams) {
    parameters.push(
      ...toOpenApiParameters(
        schemas.request.pathParams,
        "path",
        `${method} ${path}`,
      ),
    );
  }

  if (schemas?.request?.query) {
    parameters.push(
      ...toOpenApiParameters(
        schemas.request.query,
        "query",
        `${method} ${path}`,
      ),
    );
  }

  return {
    summary: docs?.summary,
    description: docs?.description,
    tags: docs?.tags,
    operationId: docs?.operationId,
    deprecated: docs?.deprecated,
    parameters: parameters.length > 0 ? parameters : undefined,
    requestBody: schemas?.request?.body
      ? toOpenApiRequestBody(schemas.request.body, `${method} ${path}`)
      : undefined,
    responses: toOpenApiResponses(
      schemas?.response,
      docs,
      options.defaultResponseDescription ?? "Successful response.",
      `${method} ${path}`,
    ),
  };
};

/**
 * OpenAPI document generation helpers.
 *
 * @remarks
 * This advanced entrypoint derives an OpenAPI document from the same Curio
 * route tree consumed by `API.withHttp(...).from(...)` or
 * `@curio/core/http/oak`.
 * Built-in Curio operations contribute Valibot request/response schemas
 * automatically, while custom handlers can opt in through `withSchemas(...)`.
 */
export const OpenAPI: OpenApiNamespace = {
  from<TContext extends CurioHttpContext>(
    routes: RouteSegment<TContext>[],
    options: OpenApiOptions = {},
  ): OpenApiDocument {
    const pathItems: Record<string, OpenApiPathItem> = {};
    const registeredRoutes = INTERNALS.buildRegisteredRoutes(routes);

    for (const route of registeredRoutes) {
      const openApiPath = normalizeOpenApiPath(route.path);
      const pathItem = pathItems[openApiPath] ?? {};
      const methodKey = route.method.toLowerCase() as Lowercase<EndpointMethod>;

      pathItem[methodKey] = toOpenApiOperation(
        route.method,
        route.path,
        route.schemas as OpenApiHandlerSchemas | undefined,
        route.docs,
        options,
      );

      pathItems[openApiPath] = pathItem;
    }

    return {
      openapi: "3.1.0",
      info: options.info ?? DEFAULT_INFO,
      servers: options.servers,
      paths: pathItems,
    };
  },
};
