import {
  Router,
  type RouterContext as OakRouterContext,
} from "@oak/oak";
import type { RouteHandler } from "@/api/types.ts";
import type {
  CurioHttpContext,
  HttpAdapter,
  HttpResponseHeaders,
} from "@/http/types.ts";
import type { EndpointMethod } from "@/api/types.ts";
import { once } from "@/http/once.ts";

/** Applies a `HeadersInit` value to an Oak response headers object. */
const applyHeaders = (
  headers: Headers,
  nextHeaders: HttpResponseHeaders,
): void => {
  const normalizedHeaders = new Headers(nextHeaders);

  for (const [key, value] of normalizedHeaders.entries()) {
    headers.set(key, value);
  }
};

/** Reads the raw request body from an Oak router context. */
const readBody = async (ctx: OakRouterContext<string>): Promise<unknown> => {
  if (!ctx.request.hasBody) {
    return undefined;
  }

  const requestBody = ctx.request.body;
  const bodyType = requestBody.type();

  switch (bodyType) {
    case "json":
      return await requestBody.json();
    case "text":
      return await requestBody.text();
    case "form":
      return await requestBody.form();
    case "form-data":
      return await requestBody.formData();
    case "binary":
      return await requestBody.blob();
    case "unknown":
      return await requestBody.text();
  }
};

/** Writes a response payload to the Oak response body. */
const setPayload = (
  ctx: OakRouterContext<string>,
  payload: unknown,
): void => {
  ctx.response.body = payload as never;
};

/** Registers a Curio handler on an Oak router for a method/path pair. */
const registerRoute = (
  router: Router,
  method: EndpointMethod,
  path: string,
  handler: RouteHandler<CurioHttpContext>,
): void => {
  router.add(method, path, (oakContext) => {
    return handler(oakHttpAdapter.createContext(oakContext));
  });
};

/**
 * Oak implementation of the Curio HTTP adapter contract.
 *
 * Converts Oak router contexts into Curio HTTP contexts and registers Curio
 * handlers back onto an Oak `Router`.
 *
 * @remarks
 * `ctx.raw` remains the original Oak router context. Request reads stay raw,
 * while response helpers write through to the underlying Oak response.
 */
export const oakHttpAdapter: HttpAdapter<Router, OakRouterContext<string>> = {
  createRouter() {
    return new Router();
  },
  createContext(rawContext) {
    const readBodyOnce = once(() => readBody(rawContext));

    return {
      raw: rawContext,
      request: {
        method: rawContext.request.method,
        path: rawContext.request.url.pathname,
        headers: rawContext.request.headers,
        query: rawContext.request.url.searchParams,
        params: { ...rawContext.params },
        body: () => readBodyOnce(),
      },
      response: {
        setStatus(status) {
          rawContext.response.status = status;
        },
        setHeaders(headers) {
          applyHeaders(rawContext.response.headers, headers);
        },
        setPayload(payload) {
          setPayload(rawContext, payload);
        },
        send({ payload, status, headers }) {
          if (typeof status === "number") {
            rawContext.response.status = status;
          }

          if (headers) {
            applyHeaders(rawContext.response.headers, headers);
          }

          setPayload(rawContext, payload);
        },
      },
      middlewareData: {},
    };
  },
  registerRoute,
};
