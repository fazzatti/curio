import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import {
  ADMIN_CLIENT_SCRIPT,
  ADMIN_STYLESHEET,
  renderAdminBrandingThemeStyles,
  resolveAdminBrandingColors,
} from "@/admin/assets.ts";

type FakeListener = (event: {
  altKey: boolean;
  button: number;
  ctrlKey: boolean;
  defaultPrevented: boolean;
  metaKey: boolean;
  preventDefault: () => void;
  shiftKey: boolean;
  target: unknown;
}) => void;

class FakeText {
  constructor(private value: string) {}

  get textContent(): string {
    return this.value;
  }

  set textContent(value: string) {
    this.value = value;
  }
}

class FakeDocumentFragment {
  childNodes: FakeNode[] = [];

  appendChild(child: FakeNode): FakeNode {
    this.childNodes.push(child);
    return child;
  }

  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join("");
  }
}

type FakeNode = FakeElement | FakeText | FakeDocumentFragment;

const toDatasetKey = (attribute: string): string => {
  return attribute.replace(/^data-/, "").replaceAll(
    /-([a-z])/g,
    (_, letter) => String(letter).toUpperCase(),
  );
};

const matchesSelector = (element: FakeElement, selector: string): boolean => {
  if (
    selector ===
      "[data-curio-admin-island][data-curio-admin-island-payload]"
  ) {
    return element.hasAttribute("data-curio-admin-island") &&
      element.hasAttribute("data-curio-admin-island-payload");
  }

  if (selector === "input, textarea, select") {
    return ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName);
  }

  if (/^[a-z]+$/.test(selector)) {
    return element.tagName.toLowerCase() === selector;
  }

  if (/^\[[^\]]+\]$/.test(selector)) {
    return element.hasAttribute(selector.slice(1, -1));
  }

  return false;
};

class FakeElement {
  readonly attributes = new Map<string, string>();
  childNodes: FakeNode[] = [];
  dataset: Record<string, string> = {};
  disabled = false;
  hidden = false;
  readonly listeners = new Map<string, FakeListener[]>();
  readonly style = {
    setProperty: (_name: string, _value: string) => {},
  };

  constructor(readonly tagName: string) {}

  addEventListener(name: string, listener: FakeListener): void {
    const listeners = this.listeners.get(name) ?? [];
    listeners.push(listener);
    this.listeners.set(name, listeners);
  }

  appendChild(child: FakeNode): FakeNode {
    if (child instanceof FakeDocumentFragment) {
      for (const nestedChild of child.childNodes) {
        this.childNodes.push(nestedChild);
      }
      return child;
    }

    this.childNodes.push(child);
    return child;
  }

  dispatch(name: string): void {
    const event = {
      altKey: false,
      button: 0,
      ctrlKey: false,
      defaultPrevented: false,
      metaKey: false,
      preventDefault: () => {
        event.defaultPrevented = true;
      },
      shiftKey: false,
      target: this,
    };

    for (const listener of this.listeners.get(name) ?? []) {
      listener(event);
    }
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  hasAttribute(name: string): boolean {
    return this.attributes.has(name);
  }

  querySelector(selector: string): FakeElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): FakeElement[] {
    const matches: FakeElement[] = [];

    const visit = (node: FakeNode): void => {
      if (!(node instanceof FakeElement)) {
        return;
      }

      if (matchesSelector(node, selector)) {
        matches.push(node);
      }

      for (const child of node.childNodes) {
        visit(child);
      }
    };

    for (const child of this.childNodes) {
      visit(child);
    }

    return matches;
  }

  removeAttribute(name: string): void {
    this.attributes.delete(name);
    if (name.startsWith("data-")) {
      delete this.dataset[toDatasetKey(name)];
    }
  }

  replaceChildren(...children: FakeNode[]): void {
    this.childNodes = [...children];
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
    if (name.startsWith("data-")) {
      this.dataset[toDatasetKey(name)] = value;
    }
  }

  get textContent(): string {
    return this.childNodes.map((child) => child.textContent).join("");
  }

  set textContent(value: string) {
    this.childNodes = [new FakeText(value)];
  }
}

class FakeDocument extends FakeElement {
  readonly activeElement: FakeElement | null = null;
  override hidden = false;
  readonly documentElement = new FakeElement("HTML");

  constructor(islandRoot: FakeElement) {
    super("#document");
    this.childNodes = [islandRoot];
  }

  createComment(value: string): FakeText {
    return new FakeText(value);
  }

  createDocumentFragment(): FakeDocumentFragment {
    return new FakeDocumentFragment();
  }

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName.toUpperCase());
  }

  createTextNode(value: string): FakeText {
    return new FakeText(value);
  }

  getElementById(_id: string): FakeElement | null {
    return null;
  }
}

const encodeAdminIslandPayload = (payload: Record<string, unknown>): string => {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

const runAdminClientScript = (
  document: FakeDocument,
  errors: unknown[][],
): void => {
  const window = {
    addEventListener: () => {},
    atob,
    cancelAnimationFrame: () => {},
    clearTimeout: () => {},
    confirm: () => true,
    fetch: () => Promise.reject(new Error("Unexpected fetch")),
    localStorage: {
      getItem: (_key: string) => null,
      setItem: (_key: string, _value: string) => {},
    },
    location: {
      assign: (_href: string) => {},
      hash: "",
      href: "https://curio.test/admin",
      origin: "https://curio.test",
      pathname: "/admin",
      search: "",
    },
    requestAnimationFrame: (callback: () => void) => {
      callback();
      return 1;
    },
    setTimeout: () => 0,
  };

  const execute = new Function(
    "document",
    "window",
    "TextDecoder",
    "Uint8Array",
    "DocumentFragment",
    "HTMLInputElement",
    "HTMLTextAreaElement",
    "HTMLSelectElement",
    "HTMLAnchorElement",
    "HTMLElement",
    "Element",
    "DOMParser",
    "FormData",
    "console",
    ADMIN_CLIENT_SCRIPT,
  );

  execute(
    document,
    window,
    TextDecoder,
    Uint8Array,
    FakeDocumentFragment,
    FakeElement,
    FakeElement,
    FakeElement,
    FakeElement,
    FakeElement,
    FakeElement,
    class FakeDOMParser {},
    class FakeFormData {},
    {
      error: (...args: unknown[]) => errors.push(args),
    },
  );

  document.dispatch("DOMContentLoaded");
};

Deno.test("admin asset helpers return no theme overrides when branding colors are omitted", () => {
  assertEquals(resolveAdminBrandingColors(undefined), undefined);
  assertEquals(renderAdminBrandingThemeStyles({}), "");
});

Deno.test("admin asset helpers normalize partial branding colors and derive theme variables", () => {
  assertEquals(
    resolveAdminBrandingColors({
      primary: "#369",
    }),
    {
      primary: "#336699",
      secondary: "#568c6e",
    },
  );

  assertEquals(
    resolveAdminBrandingColors({
      secondary: "#abc",
    }),
    {
      primary: "#c65a3e",
      secondary: "#aabbcc",
    },
  );

  const themeStyles = renderAdminBrandingThemeStyles({
    colors: {
      primary: "#336699",
      secondary: "#cc8844",
    },
  });

  assertStringIncludes(themeStyles, "--curio-accent: #336699");
  assertStringIncludes(themeStyles, "--curio-secondary: #cc8844");
  assertStringIncludes(themeStyles, "--curio-accent-rgb: 51, 102, 153");
  assertStringIncludes(themeStyles, "--curio-secondary-rgb: 204, 136, 68");
});

Deno.test("admin asset helpers reject invalid branding colors and expose default theme variables", () => {
  assertThrows(
    () =>
      resolveAdminBrandingColors({
        primary: "#336699",
        secondary: "blue",
      }),
    Error,
    'Admin branding color "secondary" must be a hex color',
  );

  assertStringIncludes(ADMIN_STYLESHEET, "--curio-accent-rgb: 198, 90, 62");
  assertStringIncludes(ADMIN_STYLESHEET, "--curio-secondary-rgb: 86, 140, 110");
});

Deno.test("admin client hydrates nested island components that use hooks", () => {
  const islandRoot = new FakeElement("DIV");
  islandRoot.setAttribute("data-curio-admin-island", "CounterIsland");
  islandRoot.setAttribute(
    "data-curio-admin-island-payload",
    encodeAdminIslandPayload({
      name: "CounterIsland",
      props: {},
      source: `function CounterIsland() {
        function NestedCounter(props) {
          const [label] = useState("nested");
          return _jsx("span", { children: label + ":" + props.count });
        }

        const [count, setCount] = useState(0);

        return _jsx("button", {
          type: "button",
          onClick: () => setCount(count + 1),
          children: _jsx(NestedCounter, { count }),
        });
      }`,
    }),
  );

  const errors: unknown[][] = [];
  const document = new FakeDocument(islandRoot);

  runAdminClientScript(document, errors);

  assertEquals(errors, []);
  assertEquals(islandRoot.dataset.curioAdminIslandMounted, "true");
  assertEquals(islandRoot.textContent, "nested:0");

  const button = islandRoot.querySelector("button");
  assert(button);
  button.dispatch("click");

  assertEquals(islandRoot.textContent, "nested:1");
});
