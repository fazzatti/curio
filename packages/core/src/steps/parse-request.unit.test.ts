import { assertEquals, assertExists } from "@std/assert";
import { createRunContext } from "@convee";
import * as v from "@valibot/valibot";
import { valibotSchemaAdapter } from "@/schema/valibot.ts";
import {
  createParseBodyStep,
  createParsePathParamsStep,
  createParseQueryStep,
  createSeedHttpContextStep,
  type HttpPipelineState,
  searchParamsToObject,
} from "@/steps/parse-request.ts";
import type { CurioHttpContext } from "@/http/types.ts";

const createContext = (
  url: string,
  params: Record<string, string> = {},
  body: unknown = undefined,
): CurioHttpContext => ({
  raw: {},
  request: {
    method: "GET",
    path: new URL(url).pathname,
    headers: new Headers(),
    query: new URL(url).searchParams,
    params,
    body: () => Promise.resolve(body),
  },
  response: {
    setStatus() {},
    setHeaders() {},
    setPayload() {},
    send() {},
  },
  middlewareData: {},
});

Deno.test("searchParamsToObject converts search params into a plain object", () => {
  const query = new URL("http://localhost/test?search=ok&page=1").searchParams;

  assertEquals(searchParamsToObject(query), {
    search: "ok",
    page: "1",
  });
});

Deno.test("seed step stores the Curio HTTP context in the run context", async () => {
  const ctx = createContext("http://localhost/test");
  const runContext = createRunContext<HttpPipelineState>();
  const seedHttpContextStep = createSeedHttpContextStep<HttpPipelineState>();

  await seedHttpContextStep.runWith(
    {
      context: { parent: runContext },
    },
    ctx,
  );

  assertEquals(runContext.state.get("ctx"), ctx);
});

Deno.test("parse steps store validated path params and query values in the run context", async () => {
  const ctx = createContext("http://localhost/test?verbose=true", {
    id: "tx_123",
  });
  const runContext = createRunContext<
    HttpPipelineState<{ id: string }, { verbose: string }>
  >();
  const parsePathParamsStep = createParsePathParamsStep<
    v.GenericSchema<unknown>,
    { id: string },
    HttpPipelineState<{ id: string }, { verbose: string }>
  >(
    valibotSchemaAdapter,
    v.object({
      id: v.string(),
    }),
  );
  const parseQueryStep = createParseQueryStep<
    v.GenericSchema<unknown>,
    { verbose: string },
    HttpPipelineState<{ id: string }, { verbose: string }>
  >(
    valibotSchemaAdapter,
    v.object({
      verbose: v.string(),
    }),
  );

  await parsePathParamsStep.runWith(
    {
      context: { parent: runContext },
    },
    ctx,
  );
  await parseQueryStep.runWith(
    {
      context: { parent: runContext },
    },
    ctx,
  );

  assertEquals(runContext.state.get("pathParams"), {
    id: "tx_123",
  });
  assertEquals(runContext.state.get("query"), {
    verbose: "true",
  });
  assertExists(runContext.state.get("query"));
});

Deno.test("parse body step stores validated body values in the run context", async () => {
  const ctx = createContext("http://localhost/test", {}, {
    name: "Ada",
  });
  const runContext = createRunContext<
    HttpPipelineState<never, never, { name: string }>
  >();
  const parseBodyStep = createParseBodyStep<
    v.GenericSchema<unknown>,
    { name: string },
    HttpPipelineState<never, never, { name: string }>
  >(
    valibotSchemaAdapter,
    v.object({
      name: v.string(),
    }),
  );

  await parseBodyStep.runWith(
    {
      context: { parent: runContext },
    },
    ctx,
  );

  assertEquals(runContext.state.get("body"), {
    name: "Ada",
  });
});
