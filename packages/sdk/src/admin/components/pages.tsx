/** @jsxImportSource preact */

import type { FunctionComponent } from "preact";
import { DefaultAdminShell } from "@/admin/components/layout.tsx";
import type {
  AdminDashboardPageProps,
  AdminDetailPageProps,
  AdminFormPageProps,
  AdminListPageProps,
  AdminTableCellProps,
} from "@/admin/components/types.ts";

export const DefaultAdminDashboardPage: FunctionComponent<
  AdminDashboardPageProps
> = (
  { shell, widgets, emptyState },
) => {
  return (
    <DefaultAdminShell {...shell}>
      {widgets.length > 0
        ? (
          <section data-curio-admin-grid data-curio-admin-dashboard-grid>
            {widgets.map((widget) => (
              <div
                key={widget.key}
                data-curio-admin-widget-slot
                data-size={widget.size}
                data-curio-admin-live-poll-interval={widget.pollIntervalMs}
              >
                {widget.content}
              </div>
            ))}
          </section>
        )
        : (
          emptyState ?? (
            <section data-curio-admin-card>
              <div data-curio-admin-card-inner>
                <div data-curio-admin-title-block>
                  <div data-curio-admin-kicker>Dashboard</div>
                  <h2 data-curio-admin-title style={{ fontSize: "32px" }}>
                    No widgets available
                  </h2>
                  <div data-curio-admin-subtitle>
                    This account does not currently have access to any dashboard
                    widgets.
                  </div>
                </div>
              </div>
            </section>
          )
        )}
    </DefaultAdminShell>
  );
};

export const DefaultAdminListPage: FunctionComponent<AdminListPageProps> = (
  { shell, search, table, pagination },
) => {
  return (
    <DefaultAdminShell {...shell}>
      <section data-curio-admin-card>
        <div data-curio-admin-card-inner>
          {search}
          {table}
          {pagination}
        </div>
      </section>
    </DefaultAdminShell>
  );
};

export const DefaultAdminDetailPage: FunctionComponent<AdminDetailPageProps> = (
  { shell, primary, secondary },
) => {
  return (
    <DefaultAdminShell {...shell}>
      <section data-curio-admin-card>
        <div data-curio-admin-card-inner>{primary}</div>
      </section>
      {secondary}
    </DefaultAdminShell>
  );
};

export const DefaultAdminFormPage: FunctionComponent<AdminFormPageProps> = (
  { shell, form },
) => {
  return (
    <DefaultAdminShell {...shell}>
      <section data-curio-admin-card>
        <div data-curio-admin-card-inner>{form}</div>
      </section>
    </DefaultAdminShell>
  );
};

export const DefaultAdminTableCell: FunctionComponent<AdminTableCellProps> = (
  { value },
) => {
  return <>{value}</>;
};
