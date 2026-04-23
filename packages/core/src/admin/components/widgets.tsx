/** @jsxImportSource preact */

import type { FunctionComponent } from "preact";
import type { AdminDashboardWidgetRenderProps } from "@/admin/core/types.ts";

type AdminCountWidgetData = {
  value: string;
  copy?: string;
};

export const DefaultAdminCountWidget: FunctionComponent<
  AdminDashboardWidgetRenderProps<AdminCountWidgetData>
> = (
  { title, href, data },
) => {
  const card = (
    <section data-curio-admin-card data-curio-admin-dashboard-widget>
      <div data-curio-admin-card-inner>
        <div data-curio-admin-kicker>Dashboard</div>
        <div data-curio-admin-widget-title>{title}</div>
        <div data-curio-admin-metrics-value>{data.value}</div>
        {data.copy
          ? <div data-curio-admin-metrics-copy>{data.copy}</div>
          : null}
      </div>
    </section>
  );

  if (!href) {
    return card;
  }

  return (
    <a href={href} data-curio-admin-widget-link>
      {card}
    </a>
  );
};
