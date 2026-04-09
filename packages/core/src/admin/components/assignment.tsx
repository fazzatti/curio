/** @jsxImportSource preact */

import type { FunctionComponent } from "preact";
import type {
  AdminAssignmentFieldProps,
  AdminAssignmentOption,
} from "@/admin/components/types.ts";

const summarizeSelected = (
  options: AdminAssignmentOption[],
  selectedIds: readonly string[],
): string => {
  const selected = options.filter((option) => selectedIds.includes(option.id));

  if (selected.length === 0) {
    return "Nothing assigned";
  }

  const visible = selected.slice(0, 3).map((option) => option.key);

  if (selected.length <= 3) {
    return visible.join(", ");
  }

  return `${visible.join(", ")} +${selected.length - 3}`;
};

export const DefaultAdminAssignmentField: FunctionComponent<
  AdminAssignmentFieldProps
> = (
  {
    label,
    name,
    options,
    selectedIds,
    helperText,
    emptyText,
    filterPlaceholder,
  },
) => {
  const selectedIdSet = new Set(selectedIds);
  const selectedCount = selectedIds.length;
  const summary = summarizeSelected(options, selectedIds);

  return (
    <div data-curio-admin-field data-span="2">
      <div data-curio-admin-assignment>
        <div data-curio-admin-assignment-header>
          <div data-curio-admin-title-block>
            <label data-curio-admin-label>{label}</label>
            <div data-curio-admin-subtitle>
              {helperText ?? "Select one or more linked records."}
            </div>
          </div>
          <div data-curio-admin-assignment-meta>
            <span data-curio-admin-badge data-curio-admin-assignment-count>
              {selectedCount} selected
            </span>
            <span data-curio-admin-assignment-summary>{summary}</span>
          </div>
        </div>

        <div data-curio-admin-assignment-filter>
          <input
            type="search"
            placeholder={filterPlaceholder ?? `Filter ${label.toLowerCase()}`}
            data-curio-admin-input
            data-curio-admin-assignment-filter-input
          />
        </div>

        <div data-curio-admin-assignment-scroll>
          {options.length === 0
            ? (
              <div data-curio-admin-empty>
                {emptyText ?? "No records available to assign."}
              </div>
            )
            : options.map((option) => {
              const selected = selectedIdSet.has(option.id);

              return (
                <label
                  data-curio-admin-assignment-option
                  data-selected={selected ? "true" : "false"}
                  data-search={`${option.key} ${option.label} ${
                    option.description ?? ""
                  }`.toLowerCase()}
                >
                  <input
                    type="checkbox"
                    name={name}
                    value={option.id}
                    checked={selected}
                    data-curio-admin-assignment-input
                  />
                  <div data-curio-admin-assignment-copy-block>
                    <div data-curio-admin-assignment-key>{option.key}</div>
                    <div data-curio-admin-assignment-label>{option.label}</div>
                    {option.description
                      ? (
                        <div data-curio-admin-assignment-description>
                          {option.description}
                        </div>
                      )
                      : null}
                  </div>
                  <span data-curio-admin-assignment-state>
                    {selected ? "Assigned" : "Assign"}
                  </span>
                </label>
              );
            })}
        </div>
      </div>
    </div>
  );
};
