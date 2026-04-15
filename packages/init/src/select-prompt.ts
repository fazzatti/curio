const encoder = new TextEncoder();

const CTRL_C_BYTE = 3;
const DOWN_BYTE = 106;
const ENTER_BYTES = new Set([10, 13]);
const ESCAPE_BYTE = 27;
const UP_BYTE = 107;

/**
 * @internal
 *
 * Option accepted by the internal terminal select prompt.
 */
export type SelectPromptOption<T extends string> = {
  label: string;
  value: T;
};

/**
 * @internal
 *
 * Input accepted by the internal terminal select prompt.
 */
export type SelectPromptInput<T extends string> = {
  message: string;
  options: readonly SelectPromptOption<T>[];
};

/**
 * @internal
 *
 * Function signature for the internal terminal select prompt.
 */
export type SelectPrompt = <T extends string>(
  input: SelectPromptInput<T>,
) => Promise<T | null>;

type SelectPromptAction = "cancel" | "down" | "noop" | "submit" | "up";

type SelectPromptRuntime = {
  isTerminal: boolean;
  read: () => Promise<Uint8Array | null>;
  setRaw: (enabled: boolean) => void;
  write: (value: string) => Promise<void>;
};

type SelectPromptInputDevice = {
  isTerminal: () => boolean;
  read: (buffer: Uint8Array) => Promise<number | null>;
  setRaw: (enabled: boolean) => void;
};

type SelectPromptOutputDevice = {
  write: (buffer: Uint8Array) => Promise<number>;
};

const ARROW_UP_SEQUENCE = [27, 91, 65] as const;
const ARROW_DOWN_SEQUENCE = [27, 91, 66] as const;

const matchesSequence = (
  bytes: Uint8Array,
  sequence: readonly number[],
): boolean => {
  return bytes.length === sequence.length &&
    sequence.every((value, index) => bytes[index] === value);
};

/**
 * @internal
 *
 * Renders the current terminal prompt frame for a select interaction.
 */
export const renderSelectPrompt = <T extends string>(
  input: SelectPromptInput<T>,
  selectedIndex: number,
): string => {
  const lines = [
    input.message,
    "Use arrow keys and Enter.",
    ...input.options.map((option, index) =>
      `${index === selectedIndex ? ">" : " "} ${option.label}`
    ),
  ];

  return lines.join("\n");
};

/**
 * @internal
 *
 * Converts raw terminal bytes into a select-prompt action.
 */
export const parseSelectPromptAction = (
  bytes: Uint8Array,
): SelectPromptAction => {
  if (bytes.length === 0) {
    return "noop";
  }

  if (bytes.some((value) => ENTER_BYTES.has(value))) {
    return "submit";
  }

  if (
    bytes[0] === CTRL_C_BYTE || bytes[0] === ESCAPE_BYTE && bytes.length === 1
  ) {
    return "cancel";
  }

  if (bytes[0] === UP_BYTE || matchesSequence(bytes, ARROW_UP_SEQUENCE)) {
    return "up";
  }

  if (bytes[0] === DOWN_BYTE || matchesSequence(bytes, ARROW_DOWN_SEQUENCE)) {
    return "down";
  }

  return "noop";
};

/**
 * @internal
 *
 * Creates a terminal-backed select prompt from the provided runtime hooks.
 */
export const createSelectPrompt = (
  runtime: SelectPromptRuntime,
): SelectPrompt => {
  return async <T extends string>(
    input: SelectPromptInput<T>,
  ): Promise<T | null> => {
    if (!runtime.isTerminal) {
      throw new Error("Interactive selection requires a terminal.");
    }

    if (input.options.length === 0) {
      throw new Error("Select prompt requires at least one option.");
    }

    let renderedLines = 0;
    let selectedIndex = 0;

    const render = async (): Promise<void> => {
      const output = renderSelectPrompt(input, selectedIndex);
      const lines = output.split("\n").length;
      const moveToStart = renderedLines <= 1
        ? "\r"
        : `\x1b[${renderedLines - 1}A\r`;

      await runtime.write(
        `${renderedLines === 0 ? "\x1b[?25l" : moveToStart}\x1b[J${output}`,
      );
      renderedLines = lines;
    };

    runtime.setRaw(true);

    try {
      await render();

      while (true) {
        const bytes = await runtime.read();

        if (bytes === null) {
          return null;
        }

        const action = parseSelectPromptAction(bytes);

        switch (action) {
          case "cancel":
            return null;
          case "down":
            selectedIndex = (selectedIndex + 1) % input.options.length;
            await render();
            break;
          case "submit":
            return input.options[selectedIndex].value;
          case "up":
            selectedIndex = selectedIndex === 0
              ? input.options.length - 1
              : selectedIndex - 1;
            await render();
            break;
          case "noop":
            break;
        }
      }
    } finally {
      runtime.setRaw(false);

      if (renderedLines > 0) {
        await runtime.write("\x1b[?25h\n");
      }
    }
  };
};

/**
 * @internal
 *
 * Creates the default select prompt bound to `Deno.stdin` and `Deno.stdout`.
 */
export const createDefaultSelectPrompt = (
  input: SelectPromptInputDevice = Deno.stdin,
  output: SelectPromptOutputDevice = Deno.stdout,
): SelectPrompt => {
  return createSelectPrompt({
    isTerminal: input.isTerminal(),
    read: async () => {
      const buffer = new Uint8Array(8);
      const read = await input.read(buffer);

      if (read === null) {
        return null;
      }

      return buffer.subarray(0, read);
    },
    setRaw: (enabled) => {
      input.setRaw(enabled);
    },
    write: async (value) => {
      await output.write(encoder.encode(value));
    },
  });
};

/**
 * @internal
 *
 * Default terminal-backed select prompt used by `runInit(...)`.
 */
export const defaultSelectPrompt = createDefaultSelectPrompt();
