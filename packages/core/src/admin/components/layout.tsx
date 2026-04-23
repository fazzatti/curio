/** @jsxImportSource preact */

// deno-coverage-ignore-start
import type { FunctionComponent } from "preact";
import type {
  AdminFlashMessage,
  AdminLoginPageProps,
  AdminShellProps,
} from "@/admin/components/types.ts";
import { AdminIcon } from "@/admin/components/icons.tsx";
// deno-coverage-ignore-stop

const FlashStack: FunctionComponent<{ flashes?: AdminFlashMessage[] }> = (
  { flashes },
) => {
  if (!flashes?.length) {
    return null;
  }

  return (
    <div data-curio-admin-grid>
      {flashes.map((flash) => (
        <div
          key={`${flash.tone ?? "neutral"}:${flash.message}`}
          data-curio-admin-flash
          data-tone={flash.tone === "neutral" ? undefined : flash.tone}
        >
          {flash.message}
        </div>
      ))}
    </div>
  );
};

const ShellHeader: FunctionComponent<Omit<AdminShellProps, "children">> = (
  { kicker, title, subtitle, headerActions, currentUserEmail, logoutAction },
) => {
  return (
    <div data-curio-admin-topbar>
      <div data-curio-admin-title-block>
        {kicker ? <div data-curio-admin-kicker>{kicker}</div> : null}
        <h1 data-curio-admin-title>{title}</h1>
        {subtitle ? <div data-curio-admin-subtitle>{subtitle}</div> : null}
      </div>
      <div data-curio-admin-actions>
        {headerActions}
        {currentUserEmail
          ? (
            <form action={logoutAction} method="post">
              <button data-curio-admin-button type="submit">Sign out</button>
            </form>
          )
          : null}
      </div>
    </div>
  );
};

export const DefaultAdminShell: FunctionComponent<AdminShellProps> = (
  props,
) => {
  const brandName = props.brandName ?? "Curio Admin";
  const brandTagline = props.brandTagline ?? "Control room.";

  return (
    <div data-curio-admin-shell data-curio-admin="shell">
      <aside data-curio-admin-sidebar>
        <div data-curio-admin-brand>
          <div data-curio-admin-brand-title>{brandName}</div>
          <div data-curio-admin-brand-copy>{brandTagline}</div>
        </div>

        <nav data-curio-admin-nav>
          <a
            href={props.navigation.homeItem.href}
            data-curio-admin-nav-link
            data-kind={props.navigation.homeItem.kind ?? "home"}
            data-active={props.navigation.homeItem.active ? "true" : "false"}
          >
            <span data-curio-admin-nav-main>
              <span data-curio-admin-nav-icon>
                <AdminIcon name="home" />
              </span>
              <span>{props.navigation.homeItem.label}</span>
            </span>
            {props.navigation.homeItem.badge
              ? (
                <span data-curio-admin-badge data-tone="muted">
                  {props.navigation.homeItem.badge}
                </span>
              )
              : null}
          </a>

          {props.navigation.groups.map((group) => {
            if (group.items.length === 0) {
              return null;
            }

            const groupKey = group.label
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
            const isActiveGroup = group.items.some((item) => item.active);

            return (
              <details
                data-curio-admin-nav-group
                data-curio-admin-nav-collapsible
                data-group-key={groupKey}
                key={group.label}
                open={isActiveGroup}
              >
                <summary data-curio-admin-nav-heading>
                  <span>{group.label}</span>
                  <span data-curio-admin-nav-group-toggle>
                    <AdminIcon name="chevron-right" />
                  </span>
                </summary>
                <div data-curio-admin-nav-group-items>
                  {group.items.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      data-curio-admin-nav-link
                      data-kind={item.kind ?? "resource"}
                      data-active={item.active ? "true" : "false"}
                    >
                      <span data-curio-admin-nav-main>
                        <span data-curio-admin-nav-icon>
                          <AdminIcon name={item.kind ?? "resource"} />
                        </span>
                        <span>{item.label}</span>
                      </span>
                      {item.badge
                        ? (
                          <span data-curio-admin-badge data-tone="muted">
                            {item.badge}
                          </span>
                        )
                        : null}
                    </a>
                  ))}
                </div>
              </details>
            );
          })}
        </nav>
      </aside>

      <main data-curio-admin-main>
        <div data-curio-admin-frame>
          <ShellHeader {...props} />
          <FlashStack flashes={props.flashes} />
          <div data-curio-admin-live-root>
            {props.children}
          </div>

          <div data-curio-admin-navigation-indicator aria-hidden="true">
            <div data-curio-admin-navigation-indicator-card>
              <span data-curio-admin-navigation-spinner />
              <span>Loading page</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export const DefaultAdminLoginPage: FunctionComponent<AdminLoginPageProps> = (
  { loginAction, brandName, brandTagline, title, subtitle, error, emailValue },
) => {
  return (
    <div data-curio-admin-login>
      <div
        data-curio-admin-card
        data-curio-admin-login-card
        data-curio-admin="login-page"
      >
        <section data-curio-admin-login-cover>
          <div data-curio-admin-kicker>Back Office</div>
          <h1 data-curio-admin-title>{title ?? brandName ?? "Curio Admin"}</h1>
          <p data-curio-admin-login-copy>
            {subtitle ?? brandTagline ??
              "Sign in to manage users, sessions, and records."}
          </p>
        </section>

        <section data-curio-admin-login-panel>
          <div data-curio-admin-grid>
            <div data-curio-admin-title-block>
              <div data-curio-admin-kicker>Secure Access</div>
              <h2 data-curio-admin-title style={{ fontSize: "32px" }}>
                Welcome back
              </h2>
              <div data-curio-admin-subtitle>
                Use your admin credentials to continue.
              </div>
            </div>

            {error
              ? <div data-curio-admin-flash data-tone="error">{error}</div>
              : null}

            <form action={loginAction} method="post" data-curio-admin-form>
              <div data-curio-admin-field>
                <label data-curio-admin-label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={emailValue ?? ""}
                  required
                  autoComplete="email"
                  data-curio-admin-input
                />
              </div>

              <div data-curio-admin-field data-curio-password-toggle>
                <label data-curio-admin-label htmlFor="password">
                  Password
                </label>
                <div data-curio-admin-inline-input>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    data-curio-admin-input
                  />
                  <button data-curio-admin-button type="button">Show</button>
                </div>
              </div>

              <div data-curio-admin-actions>
                <button
                  data-curio-admin-button
                  data-variant="primary"
                  type="submit"
                >
                  Sign in
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
