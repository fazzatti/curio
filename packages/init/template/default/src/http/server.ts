import { Application } from "@oak/oak";
import { CONFIG } from "@/config/index.ts";
import { closeDatabase, prepareDatabase } from "@/db/index.ts";
import { admin } from "@/http/admin/index.ts";
import { httpApi } from "@/http/api/index.ts";
import { setAppHealthStatus } from "@/http/health/state.ts";
import { requestLoggingMiddleware } from "@/http/middleware/request-logging.ts";
import { LOG } from "@/tools/logger/index.ts";

const SHUTDOWN_TIMEOUT_MS = 5_000;

export const createHttpServer = (): Application => {
  const app = new Application();

  app.use(requestLoggingMiddleware);
  admin.mount(app);
  app.use(httpApi.routes());
  app.use(httpApi.allowedMethods());

  return app;
};

export const startHttpServer = async (): Promise<void> => {
  LOG.debug("Creating HTTP server");
  const app = createHttpServer();
  const abortController = new AbortController();
  let shuttingDown = false;
  let forceExitTimer: number | undefined;

  const clearForceExitTimer = () => {
    if (forceExitTimer === undefined) {
      return;
    }

    clearTimeout(forceExitTimer);
    forceExitTimer = undefined;
  };

  const scheduleForceExit = () => {
    if (forceExitTimer !== undefined) {
      return;
    }

    forceExitTimer = setTimeout(() => {
      LOG.warn("Shutdown timed out. Forcing process exit.");
      Deno.exit(130);
    }, SHUTDOWN_TIMEOUT_MS);
  };

  const removeShutdownListeners = () => {
    Deno.removeSignalListener("SIGINT", handleShutdownSignal);
    Deno.removeSignalListener("SIGTERM", handleShutdownSignal);
  };

  const handleShutdownSignal = () => {
    if (shuttingDown) {
      LOG.warn("Shutdown already in progress. Forcing process exit.");
      Deno.exit(130);
    }

    shuttingDown = true;
    removeShutdownListeners();
    scheduleForceExit();
    setAppHealthStatus("stopping");
    LOG.info("HTTP server shutting down");
    abortController.abort();
  };

  app.addEventListener("listen", () => {
    setAppHealthStatus("ready");
    LOG.info(`HTTP server listening on http://localhost:${CONFIG.port}`);
  });

  app.addEventListener("close", () => {
    setAppHealthStatus("stopped");
    LOG.info("HTTP server stopped");
  });

  setAppHealthStatus("starting");
  Deno.addSignalListener("SIGINT", handleShutdownSignal);
  Deno.addSignalListener("SIGTERM", handleShutdownSignal);

  try {
    LOG.info("Preparing database before accepting traffic");
    await prepareDatabase();
    LOG.info("Database ready");
    LOG.debug("Admin mounted at /admin");
    LOG.debug("API routes mounted");

    await app.listen({
      port: CONFIG.port,
      signal: abortController.signal,
    });
  } finally {
    removeShutdownListeners();

    try {
      LOG.debug("Closing database connection");
      await closeDatabase();
      LOG.debug("Database connection closed");
    } finally {
      clearForceExitTimer();
    }
  }
};

if (import.meta.main) {
  await startHttpServer();
}
