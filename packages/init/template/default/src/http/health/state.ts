export type AppHealthStatus = "starting" | "ready" | "stopping" | "stopped";

export type AppHealthSnapshot = {
  status: AppHealthStatus;
  healthy: boolean;
  uptimeMs: number;
  timestamp: string;
};

type AppHealthState = {
  status: AppHealthStatus;
  startedAt: number;
};

const DEFAULT_STATUS: AppHealthStatus = "starting";

let appHealthState: AppHealthState = {
  status: DEFAULT_STATUS,
  startedAt: Date.now(),
};

const isHealthyStatus = (status: AppHealthStatus): boolean => {
  return status === "ready";
};

export const setAppHealthStatus = (status: AppHealthStatus): void => {
  appHealthState = {
    ...appHealthState,
    status,
  };
};

export const resetAppHealthState = (
  status: AppHealthStatus = DEFAULT_STATUS,
): void => {
  appHealthState = {
    status,
    startedAt: Date.now(),
  };
};

export const getAppHealthSnapshot = (): AppHealthSnapshot => {
  return {
    status: appHealthState.status,
    healthy: isHealthyStatus(appHealthState.status),
    uptimeMs: Math.max(0, Date.now() - appHealthState.startedAt),
    timestamp: new Date().toISOString(),
  };
};
