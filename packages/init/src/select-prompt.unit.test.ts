import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import {
  createDefaultSelectPrompt,
  createSelectPrompt,
  parseSelectPromptAction,
  renderSelectPrompt,
} from "./select-prompt.ts";

Deno.test("renderSelectPrompt highlights the selected option", () => {
  const rendered = renderSelectPrompt({
    message: "Which IDE are you using?",
    options: [
      { label: "VS Code", value: "vscode" },
      { label: "Other", value: "other" },
    ],
  }, 1);

  assertStringIncludes(rendered, "Which IDE are you using?");
  assertStringIncludes(rendered, "  VS Code");
  assertStringIncludes(rendered, "> Other");
});

Deno.test("parseSelectPromptAction recognizes submit, cancel, and movement keys", () => {
  assertEquals(parseSelectPromptAction(new Uint8Array()), "noop");
  assertEquals(parseSelectPromptAction(new Uint8Array([10])), "submit");
  assertEquals(parseSelectPromptAction(new Uint8Array([13])), "submit");
  assertEquals(parseSelectPromptAction(new Uint8Array([3])), "cancel");
  assertEquals(parseSelectPromptAction(new Uint8Array([27])), "cancel");
  assertEquals(parseSelectPromptAction(new Uint8Array([107])), "up");
  assertEquals(parseSelectPromptAction(new Uint8Array([106])), "down");
  assertEquals(parseSelectPromptAction(new Uint8Array([27, 91, 65])), "up");
  assertEquals(parseSelectPromptAction(new Uint8Array([27, 91, 66])), "down");
  assertEquals(parseSelectPromptAction(new Uint8Array([120])), "noop");
});

Deno.test("createSelectPrompt selects the active option after navigation", async () => {
  const writes: string[] = [];
  const prompt = createSelectPrompt({
    isTerminal: true,
    read: () => {
      const next = inputQueue.shift();
      return Promise.resolve(next ?? null);
    },
    setRaw: (_enabled) => {},
    write: (value) => {
      writes.push(value);
      return Promise.resolve();
    },
  });
  const inputQueue = [
    new Uint8Array([27, 91, 66]),
    new Uint8Array([10]),
  ];

  const result = await prompt({
    message: "Which IDE are you using?",
    options: [
      { label: "VS Code", value: "vscode" },
      { label: "Other", value: "other" },
    ] as const,
  });

  assertEquals(result, "other");
  assertEquals(writes.length >= 2, true);
});

Deno.test("createSelectPrompt ignores noop input and wraps upward navigation", async () => {
  const prompt = createSelectPrompt({
    isTerminal: true,
    read: () => Promise.resolve(inputQueue.shift() ?? null),
    setRaw: (_enabled) => {},
    write: (_value) => Promise.resolve(),
  });
  const inputQueue = [
    new Uint8Array(),
    new Uint8Array([107]),
    new Uint8Array([10]),
  ];

  const result = await prompt({
    message: "Which IDE are you using?",
    options: [
      { label: "VS Code", value: "vscode" },
      { label: "Other", value: "other" },
    ] as const,
  });

  assertEquals(result, "other");
});

Deno.test("createSelectPrompt moves upward without wrapping when already past the first option", async () => {
  const prompt = createSelectPrompt({
    isTerminal: true,
    read: () => Promise.resolve(inputQueue.shift() ?? null),
    setRaw: (_enabled) => {},
    write: (_value) => Promise.resolve(),
  });
  const inputQueue = [
    new Uint8Array([106]),
    new Uint8Array([107]),
    new Uint8Array([10]),
  ];

  const result = await prompt({
    message: "Which IDE are you using?",
    options: [
      { label: "VS Code", value: "vscode" },
      { label: "Other", value: "other" },
    ] as const,
  });

  assertEquals(result, "vscode");
});

Deno.test("createSelectPrompt returns null when cancelled", async () => {
  const prompt = createSelectPrompt({
    isTerminal: true,
    read: () => Promise.resolve(new Uint8Array([3])),
    setRaw: (_enabled) => {},
    write: async (_value) => {},
  });

  const result = await prompt({
    message: "Which IDE are you using?",
    options: [{ label: "VS Code", value: "vscode" }] as const,
  });

  assertEquals(result, null);
});

Deno.test("createSelectPrompt returns null when the input stream closes", async () => {
  const prompt = createSelectPrompt({
    isTerminal: true,
    read: () => Promise.resolve(null),
    setRaw: (_enabled) => {},
    write: (_value) => Promise.resolve(),
  });

  const result = await prompt({
    message: "Which IDE are you using?",
    options: [{ label: "VS Code", value: "vscode" }] as const,
  });

  assertEquals(result, null);
});

Deno.test("createSelectPrompt rejects non-terminal runtimes", async () => {
  const prompt = createSelectPrompt({
    isTerminal: false,
    read: () => Promise.resolve(null),
    setRaw: (_enabled) => {},
    write: async (_value) => {},
  });

  await assertRejects(
    async () => {
      await prompt({
        message: "Which IDE are you using?",
        options: [{ label: "VS Code", value: "vscode" }] as const,
      });
    },
    Error,
    "Interactive selection requires a terminal.",
  );
});

Deno.test("createSelectPrompt rejects empty option lists", async () => {
  const prompt = createSelectPrompt({
    isTerminal: true,
    read: () => Promise.resolve(null),
    setRaw: (_enabled) => {},
    write: async (_value) => {},
  });

  await assertRejects(
    async () => {
      await prompt({
        message: "Which IDE are you using?",
        options: [],
      });
    },
    Error,
    "Select prompt requires at least one option.",
  );
});

Deno.test("createDefaultSelectPrompt wires stdin and stdout through the runtime", async () => {
  const rawCalls: boolean[] = [];
  const writes: Uint8Array[] = [];
  let readCount = 0;
  const prompt = createDefaultSelectPrompt(
    {
      isTerminal: () => true,
      read: (buffer) => {
        if (readCount === 0) {
          buffer.set([10]);
          readCount += 1;
          return Promise.resolve(1);
        }

        return Promise.resolve(null);
      },
      setRaw: (enabled) => {
        rawCalls.push(enabled);
      },
    },
    {
      write: (buffer) => {
        writes.push(buffer.slice());
        return Promise.resolve(buffer.length);
      },
    },
  );

  const result = await prompt({
    message: "Which IDE are you using?",
    options: [{ label: "VS Code", value: "vscode" }] as const,
  });

  const decoder = new TextDecoder();

  assertEquals(result, "vscode");
  assertEquals(rawCalls, [true, false]);
  assertStringIncludes(decoder.decode(writes[0]), "Which IDE are you using?");
  assertStringIncludes(decoder.decode(writes.at(-1)), "\x1b[?25h");
});

Deno.test("createDefaultSelectPrompt returns null when stdin closes", async () => {
  const rawCalls: boolean[] = [];
  const writes: Uint8Array[] = [];
  const prompt = createDefaultSelectPrompt(
    {
      isTerminal: () => true,
      read: (_buffer) => Promise.resolve(null),
      setRaw: (enabled) => {
        rawCalls.push(enabled);
      },
    },
    {
      write: (buffer) => {
        writes.push(buffer.slice());
        return Promise.resolve(buffer.length);
      },
    },
  );

  const result = await prompt({
    message: "Which IDE are you using?",
    options: [{ label: "VS Code", value: "vscode" }] as const,
  });

  assertEquals(result, null);
  assertEquals(rawCalls, [true, false]);
  assertEquals(writes.length >= 2, true);
});
