export enum LogLevel {
  TRACE = 6,
  DEBUG = 5,
  INFO = 4,
  WARN = 3,
  ERROR = 2,
  FATAL = 1,
}

export enum Color {
  RESET = "reset",
  RED = "red",
  LIGHT_RED = "light_red",
  DARK_RED = "dark_red",
  GREEN = "green",
  LIGHT_GREEN = "light_green",
  YELLOW = "yellow",
  LIGHT_YELLOW = "light_yellow",
  BLUE = "blue",
  LIGHT_BLUE = "light_blue",
  CYAN = "cyan",
  LIGHT_CYAN = "light_cyan",
  MAGENTA = "magenta",
  LIGHT_MAGENTA = "light_magenta",
}

export const ColorCodes: Record<Color, string> = {
  [Color.RESET]: "\x1b[0m",
  [Color.RED]: "\x1b[1;31m", // Bold red
  [Color.LIGHT_RED]: "\x1b[91m",
  [Color.DARK_RED]: "\x1b[31m",
  [Color.GREEN]: "\x1b[1;32m", // Bold green
  [Color.LIGHT_GREEN]: "\x1b[92m",
  [Color.YELLOW]: "\x1b[1;33m", // Bold yellow
  [Color.LIGHT_YELLOW]: "\x1b[93m",
  [Color.BLUE]: "\x1b[1;34m", // Bold blue
  [Color.LIGHT_BLUE]: "\x1b[94m",
  [Color.CYAN]: "\x1b[1;36m", // Bold cyan
  [Color.LIGHT_CYAN]: "\x1b[96m",
  [Color.MAGENTA]: "\x1b[1;35m", // Bold magenta
  [Color.LIGHT_MAGENTA]: "\x1b[95m",
};
