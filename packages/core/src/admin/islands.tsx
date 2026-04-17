/** @jsxImportSource preact */

/**
 * Small client-hydrated building blocks for Curio admin surfaces.
 *
 * @module
 *
 * @remarks
 * Admin islands keep Curio's server-rendered model intact while allowing
 * focused interactive widgets to hydrate on the client. This first cut is
 * intentionally narrow:
 *
 * - island props must be JSON-serializable
 * - island logic should stay self-contained inside the island component
 * - islands are meant for small field and widget interactions, not full pages
 */

import type { FunctionComponent } from "preact";
import {
  useEffect as preactUseEffect,
  useMemo as preactUseMemo,
  useRef as preactUseRef,
  useState as preactUseState,
} from "preact/hooks";

/** JSON-like value accepted by Curio admin island props. */
export type AdminIslandSerializable =
  | string
  | number
  | boolean
  | null
  | AdminIslandSerializable[]
  | { [key: string]: AdminIslandSerializable };

/** Function component shape accepted by {@link island}. */
export type AdminIslandComponent<
  TProps extends Record<string, unknown> = Record<string, unknown>,
> = FunctionComponent<TProps>;

type IslandPayload<TProps extends Record<string, unknown>> = {
  name: string;
  source: string;
  props: TProps;
};

const ISLAND_WRAPPER_STYLE = { display: "contents" };

const resolveIslandName = (
  component: { displayName?: string; name?: string },
): string => {
  const displayName = component.displayName?.trim();

  if (displayName) {
    return displayName;
  }

  const functionName = component.name?.trim();

  if (functionName) {
    return functionName;
  }

  return "AdminIsland";
};

const buildPropPath = (
  parentPath: string,
  segment: string | number,
): string => {
  return typeof segment === "number"
    ? `${parentPath}[${segment}]`
    : `${parentPath}.${segment}`;
};

const findNonSerializablePath = (
  value: unknown,
  path = "props",
  seen = new WeakSet<object>(),
): string | undefined => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return undefined;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return path;
    }

    return undefined;
  }

  if (
    typeof value === "undefined" ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    return path;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const failurePath = findNonSerializablePath(
        value[index],
        buildPropPath(path, index),
        seen,
      );

      if (failurePath) {
        return failurePath;
      }
    }

    return undefined;
  }

  if (seen.has(value)) {
    return path;
  }

  seen.add(value);

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    return path;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    const failurePath = findNonSerializablePath(
      nestedValue,
      buildPropPath(path, key),
      seen,
    );

    if (failurePath) {
      return failurePath;
    }
  }

  return undefined;
};

const encodePayload = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
};

/**
 * Serializes a Curio admin island payload into the HTML-safe base64 form used
 * by the built-in admin client runtime.
 *
 * @remarks
 * This validates the props eagerly so islands fail during SSR instead of
 * silently rendering non-hydratable markup.
 */
export const serializeAdminIslandPayload = <
  const TProps extends Record<string, unknown>,
>(
  name: string,
  source: string,
  props: TProps,
): string => {
  const failurePath = findNonSerializablePath(props);

  if (failurePath) {
    throw new Error(
      `Curio admin island "${name}" received a non-serializable prop at "${failurePath}". ` +
        "Island props must be plain JSON-compatible values.",
    );
  }

  const payload: IslandPayload<TProps> = {
    name,
    source,
    props,
  };

  return encodePayload(JSON.stringify(payload));
};

/**
 * Wraps a server-rendered admin component so Curio can hydrate it on the
 * client without extra registration.
 *
 * @remarks
 * The wrapped component is still rendered during SSR. Curio serializes the
 * component source and props into the surrounding markup and the admin client
 * runtime replays that component on the browser side.
 *
 * Keep island logic self-contained inside the island component. Module-level
 * helper references are not serialized in this first cut.
 */
export const island = <const TProps extends Record<string, unknown>>(
  component: AdminIslandComponent<TProps>,
): FunctionComponent<TProps> => {
  const name = resolveIslandName(component);
  const source = component.toString();
  const Component = component;

  const IslandComponent: FunctionComponent<TProps> = (props) => {
    const payload = serializeAdminIslandPayload(name, source, props);

    return (
      <div
        data-curio-admin-island={name}
        data-curio-admin-island-payload={payload}
        style={ISLAND_WRAPPER_STYLE}
      >
        <Component {...props} />
      </div>
    );
  };

  IslandComponent.displayName = `CurioIsland(${name})`;

  return IslandComponent;
};

/**
 * React-style state hook supported inside Curio admin islands.
 *
 * @remarks
 * Import this from `@curio/core/admin` alongside {@link island} so the server
 * and client runtimes stay aligned.
 */
export const useState = preactUseState;

/**
 * Effect hook supported inside Curio admin islands.
 *
 * @remarks
 * Effects run only on the client-hydrated island instance.
 */
export const useEffect = preactUseEffect;

/** Memo hook supported inside Curio admin islands. */
export const useMemo = preactUseMemo;

/** Ref hook supported inside Curio admin islands. */
export const useRef = preactUseRef;
