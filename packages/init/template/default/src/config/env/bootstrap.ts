let didLoadEnv = false;

const ENV_FILE_URL = new URL("../../../.env", import.meta.url);

const stripInlineComment = (value: string): string => {
  let inSingleQuote = false;
  let inDoubleQuote = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const previousCharacter = index > 0 ? value[index - 1] : "";

    if (character === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (character === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (
      character === "#" &&
      !inSingleQuote &&
      !inDoubleQuote &&
      (index === 0 || /\s/.test(previousCharacter))
    ) {
      return value.slice(0, index).trimEnd();
    }
  }

  return value;
};

const parseEnvValue = (rawValue: string): string => {
  const trimmedValue = stripInlineComment(rawValue).trim();

  if (
    (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) ||
    (trimmedValue.startsWith("'") && trimmedValue.endsWith("'"))
  ) {
    return trimmedValue.slice(1, -1);
  }

  return trimmedValue;
};

const parseEnvLine = (
  line: string,
): { key: string; value: string } | null => {
  const trimmedLine = line.trim();

  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmedLine.indexOf("=");

  if (separatorIndex <= 0) {
    return null;
  }

  const key = trimmedLine.slice(0, separatorIndex).trim();
  const value = parseEnvValue(trimmedLine.slice(separatorIndex + 1));

  if (!key) {
    return null;
  }

  return { key, value };
};

export const ensureEnvLoaded = (): void => {
  if (didLoadEnv) {
    return;
  }

  didLoadEnv = true;

  let fileContent: string;

  try {
    fileContent = Deno.readTextFileSync(ENV_FILE_URL);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      return;
    }

    throw error;
  }

  for (const line of fileContent.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);

    if (!parsed) {
      continue;
    }

    if (Deno.env.get(parsed.key) === undefined) {
      Deno.env.set(parsed.key, parsed.value);
    }
  }
};
