import { assertEquals, assertRejects } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { createRequestPipe } from "@/pipelines/request-pipe.ts";
import type { HttpResponseOutput } from "@/http/types.ts";

const schemaAdapter = {
  parse<TOutput>(_schema: unknown, input: unknown): TOutput {
    return input as TOutput;
  },
  safeParse<TOutput>(_schema: unknown, input: unknown) {
    return {
      success: true as const,
      output: input as TOutput,
    };
  },
};

describe("request pipe", () => {
  it("invokes the handler with the seeded HTTP context and sends the response", async () => {
    let sentResponse:
      | HttpResponseOutput
      | undefined;

    const builtPipe = createRequestPipe({
      schemaAdapter,
      handler: (_input, ctx) => ({
        status: 201,
        payload: {
          path: ctx.request.path,
        },
      }),
    });

    await builtPipe({
      raw: {},
      request: {
        method: "GET",
        path: "/health",
        headers: new Headers(),
        query: new URL("http://localhost/health").searchParams,
        params: {},
        body: () => Promise.resolve(undefined),
      },
      response: {
        setStatus() {},
        setHeaders() {},
        setPayload() {},
        send(output) {
          sentResponse = output;
        },
      },
      middlewareData: {},
    });

    assertEquals(sentResponse, {
      headers: undefined,
      status: 201,
      payload: {
        path: "/health",
      },
    });
  });

  it("throws when the HTTP context is missing from pipeline state", async () => {
    const builtPipe = createRequestPipe({
      schemaAdapter,
      handler: (_input, _ctx) => Promise.resolve({
        status: 200,
        payload: { ok: true },
      }),
    });

    await assertRejects(
      // The pipeline always seeds ctx in real use; this forces the defensive branch.
      () => (builtPipe as (ctx?: unknown) => Promise<unknown>)(undefined),
      Error,
      "Missing HTTP context in pipeline state.",
    );
  });

  it("throws from the response step when a one-argument handler runs without seeded context", async () => {
    const builtPipe = createRequestPipe({
      schemaAdapter,
      handler: () => Promise.resolve({
        status: 200,
        payload: { ok: true },
      }),
    });

    await assertRejects(
      () => (builtPipe as (ctx?: unknown) => Promise<unknown>)(undefined),
      Error,
      "Missing HTTP context in pipeline state.",
    );
  });
});
