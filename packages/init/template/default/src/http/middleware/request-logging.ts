import type { Middleware } from "@oak/oak";
import { LOG } from "@/tools/logger/index.ts";

const getRequestIpAddress = (
  request: { headers: Headers; ip?: string },
): string => {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() ?? "unknown";
  }

  return request.ip ?? "unknown";
};

const formatDuration = (startedAt: number): string => {
  const durationMs = performance.now() - startedAt;
  return `${durationMs.toFixed(1)}ms`;
};

const formatRequestSummary = (
  method: string,
  path: string,
  status: number,
  duration: string,
  ipAddress: string,
): string => {
  return `${method} ${path} -> ${status} in ${duration} (${ipAddress})`;
};

const isLowSignalPath = (path: string): boolean => {
  return path === "/health" || path.startsWith("/admin/assets/");
};

const isReadOnlyMethod = (method: string): boolean => {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
};

export const requestLoggingMiddleware: Middleware = async (ctx, next) => {
  const startedAt = performance.now();
  const method = ctx.request.method;
  const path = ctx.request.url.pathname;
  const ipAddress = getRequestIpAddress(ctx.request);

  try {
    await next();
  } catch (error) {
    const duration = formatDuration(startedAt);
    const message = error instanceof Error ? error.message : String(error);
    LOG.error(
      `${method} ${path} failed in ${duration} (${ipAddress}): ${message}`,
      "requestLoggingMiddleware",
    );
    throw error;
  }

  const status = ctx.response.status || 404;
  const duration = formatDuration(startedAt);
  const summary = formatRequestSummary(
    method,
    path,
    status,
    duration,
    ipAddress,
  );

  if (status >= 500) {
    LOG.error(summary, "requestLoggingMiddleware");
    return;
  }

  if (status >= 400) {
    LOG.warn(summary, "requestLoggingMiddleware");
    return;
  }

  if (isLowSignalPath(path) || isReadOnlyMethod(method) && path === "/") {
    LOG.debug(summary, "requestLoggingMiddleware");
    return;
  }

  LOG.info(summary, "requestLoggingMiddleware");
};
