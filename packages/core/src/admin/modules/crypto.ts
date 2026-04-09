const textEncoder = new TextEncoder();

const encodeBase64Url = (value: Uint8Array): string => {
  return btoa(String.fromCharCode(...value))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
};

export const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textEncoder.encode(value),
  );

  return Array.from(new Uint8Array(digest)).map((byte) =>
    byte.toString(16).padStart(2, "0")
  ).join("");
};

export const createOpaqueToken = (): string => {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
};
