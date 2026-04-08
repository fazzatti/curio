import { loadOptionalEnv } from "@/config/env/load-optional-env.ts";
import { Color, ColorCodes, LogLevel } from "@/tools/logger/types.ts";

const DEFAULT_LOG_LEVEL_NAME = "INFO";

const resolveLogLevel = (): LogLevel => {
  const rawValue = loadOptionalEnv("LOG_LEVEL");
  const normalizedValue = rawValue?.trim().toUpperCase() ??
    DEFAULT_LOG_LEVEL_NAME;
  const resolvedLevel = LogLevel[
    normalizedValue as keyof typeof LogLevel
  ];

  if (typeof resolvedLevel === "number") {
    return resolvedLevel;
  }

  console.warn(
    `Invalid LOG_LEVEL "${rawValue}". Falling back to ${DEFAULT_LOG_LEVEL_NAME}.`,
  );

  return LogLevel[DEFAULT_LOG_LEVEL_NAME];
};

class Logger {
  private logLevel: LogLevel;
  constructor(logLevel: LogLevel) {
    this.logLevel = logLevel;
    this.info(`Logger initialized with level: ${this.getLogLevelName()}`);
  }

  private highlightText(text: string, color: Color): string {
    return `${ColorCodes[color]}${text}${ColorCodes[Color.RESET]}`;
  }

  private log(
    message: string,
    level: LogLevel = LogLevel.INFO,
    prefixColor: Color = Color.RESET,
    messageColor: Color = Color.RESET,
    fnName?: string,
  ): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}::${LogLevel[level]}${
      fnName ? " - " + this.highlightText(fnName, Color.MAGENTA) : ""
    }]`;
    const coloredMessage = this.highlightText(message, messageColor);
    const coloredPrefix = this.highlightText(prefix, prefixColor);
    console.log(`${coloredPrefix} ${coloredMessage}`);
  }

  public getLogLevel(): LogLevel {
    return this.logLevel;
  }
  public getLogLevelName(): string {
    return LogLevel[this.logLevel];
  }

  public trace(message: string, fnName?: string) {
    if (this.logLevel >= LogLevel.TRACE) {
      this.log(message, LogLevel.TRACE, Color.RESET, Color.RESET, fnName);
    }
  }

  public debug(message: string, fnName?: string) {
    if (this.logLevel >= LogLevel.DEBUG) {
      this.log(message, LogLevel.DEBUG, Color.GREEN, Color.LIGHT_GREEN, fnName);
    }
  }
  public info(message: string, fnName?: string) {
    if (this.logLevel >= LogLevel.INFO) {
      this.log(message, LogLevel.INFO, Color.BLUE, Color.LIGHT_BLUE, fnName);
    }
  }

  public warn(message: string, fnName?: string) {
    if (this.logLevel >= LogLevel.WARN) {
      this.log(
        message,
        LogLevel.WARN,
        Color.YELLOW,
        Color.LIGHT_YELLOW,
        fnName,
      );
    }
  }

  public error(message: string, fnName?: string) {
    if (this.logLevel >= LogLevel.ERROR) {
      this.log(message, LogLevel.ERROR, Color.RED, Color.LIGHT_RED, fnName);
    }
  }
  public fatal(message: string, fnName?: string) {
    if (this.logLevel >= LogLevel.FATAL) {
      this.log(message, LogLevel.FATAL, Color.DARK_RED, Color.RED, fnName);
    }
  }
}

export const LOG = new Logger(resolveLogLevel());
