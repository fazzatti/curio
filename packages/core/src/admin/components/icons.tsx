/** @jsxImportSource preact */

// deno-coverage-ignore-start
import type { FunctionComponent } from "preact";
// deno-coverage-ignore-stop

type AdminIconName =
  | "home"
  | "view"
  | "flow"
  | "resource"
  | "chevron-right"
  | "sort"
  | "sort-asc"
  | "sort-desc";

type AdminIconProps = {
  name: AdminIconName;
};

const baseProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: "false",
};

export const AdminIcon: FunctionComponent<AdminIconProps> = ({ name }) => {
  switch (name) {
    case "home":
      return (
        <svg {...baseProps}>
          <path d="M2.5 7.2 8 2.8l5.5 4.4" />
          <path d="M4.2 6.8v6.1h7.6V6.8" />
          <path d="M6.8 12.9V9.6h2.4v3.3" />
        </svg>
      );
    case "view":
      return (
        <svg {...baseProps}>
          <path d="M1.8 8s2.3-4 6.2-4 6.2 4 6.2 4-2.3 4-6.2 4-6.2-4-6.2-4Z" />
          <circle cx="8" cy="8" r="2.2" />
        </svg>
      );
    case "flow":
      return (
        <svg {...baseProps}>
          <rect x="2.2" y="2.4" width="4.2" height="3.4" rx="1.1" />
          <rect x="9.6" y="5.9" width="4.2" height="3.4" rx="1.1" />
          <rect x="2.2" y="10.2" width="4.2" height="3.4" rx="1.1" />
          <path d="M6.4 4.1h1.7a1.5 1.5 0 0 1 1.5 1.5v.3" />
          <path d="M9.6 10.1v.3a1.5 1.5 0 0 1-1.5 1.5H6.4" />
        </svg>
      );
    case "resource":
      return (
        <svg {...baseProps}>
          <rect x="2.2" y="2.4" width="11.6" height="11.2" rx="1.8" />
          <path d="M5 5.4h6" />
          <path d="M5 8h6" />
          <path d="M5 10.6h3.8" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...baseProps}>
          <path d="m6 3.3 4.1 4.7L6 12.7" />
        </svg>
      );
    case "sort-asc":
      return (
        <svg {...baseProps}>
          <path d="M5.4 11.7V4.2" />
          <path d="M3.6 6.1 5.4 4.2l1.8 1.9" />
          <path d="M10.2 5.1h2.2" />
          <path d="M10.2 8h1.6" />
          <path d="M10.2 10.9h1" />
        </svg>
      );
    case "sort-desc":
      return (
        <svg {...baseProps}>
          <path d="M5.4 4.3v7.5" />
          <path d="m3.6 9.9 1.8 1.9 1.8-1.9" />
          <path d="M10.2 5.1h1" />
          <path d="M10.2 8h1.6" />
          <path d="M10.2 10.9h2.2" />
        </svg>
      );
    case "sort":
    default:
      return (
        <svg {...baseProps}>
          <path d="M5.2 3.6v8.8" />
          <path d="m3.5 5.2 1.7-1.6 1.7 1.6" />
          <path d="m3.5 10.8 1.7 1.6 1.7-1.6" />
          <path d="M10.2 5.1h2.2" />
          <path d="M10.2 8h1.6" />
          <path d="M10.2 10.9h1" />
        </svg>
      );
  }
};
