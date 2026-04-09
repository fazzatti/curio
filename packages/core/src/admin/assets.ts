/** Bundled stylesheet served by the default Curio admin renderer. */
export const ADMIN_STYLESHEET = `
:root {
  --curio-bg: #f4efe8;
  --curio-bg-elevated: rgba(255, 255, 255, 0.82);
  --curio-bg-soft: rgba(255, 248, 241, 0.86);
  --curio-ink: #1f1f24;
  --curio-muted: #6d6864;
  --curio-border: rgba(50, 36, 26, 0.12);
  --curio-accent: #c65a3e;
  --curio-accent-strong: #9a3c23;
  --curio-success: #2f7a57;
  --curio-danger: #a23b3b;
  --curio-warning: #9f6c16;
  --curio-shadow: 0 26px 72px rgba(41, 23, 13, 0.12);
  --curio-radius-xl: 28px;
  --curio-radius-lg: 18px;
  --curio-radius-md: 12px;
  --curio-radius-sm: 10px;
  --curio-control-height: 46px;
  --curio-control-radius: 16px;
  --curio-page-max: 1400px;
  --curio-shell-width: 288px;
}

* {
  box-sizing: border-box;
}

html {
  min-height: 100%;
  background:
    radial-gradient(circle at top right, rgba(198, 90, 62, 0.14), transparent 25%),
    radial-gradient(circle at left center, rgba(86, 140, 110, 0.12), transparent 24%),
    linear-gradient(180deg, #f7f2eb 0%, #f1ebe4 100%);
}

body {
  margin: 0;
  color: var(--curio-ink);
  font: 15px/1.5 "Avenir Next", "Helvetica Neue", "Segoe UI", sans-serif;
  min-height: 100vh;
}

a {
  color: inherit;
}

button,
input,
select,
textarea {
  font: inherit;
}

[data-curio-admin-shell] {
  display: grid;
  grid-template-columns: var(--curio-shell-width) minmax(0, 1fr);
  min-height: 100vh;
}

[data-curio-admin-sidebar] {
  position: sticky;
  top: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  height: 100vh;
  padding: 28px 22px;
  background:
    linear-gradient(180deg, rgba(33, 29, 28, 0.96), rgba(29, 24, 24, 0.98)),
    radial-gradient(circle at top, rgba(198, 90, 62, 0.16), transparent 34%);
  color: #f5ece3;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

[data-curio-admin-brand] {
  display: grid;
  gap: 8px;
  margin-bottom: 30px;
}

[data-curio-admin-brand-title] {
  font: 700 30px/0.95 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  letter-spacing: 0.01em;
}

[data-curio-admin-brand-copy] {
  color: rgba(245, 236, 227, 0.7);
  font-size: 13px;
}

[data-curio-admin-nav] {
  display: grid;
  gap: 14px;
  min-height: 0;
  overflow-y: auto;
  align-content: start;
  padding-right: 6px;
}

[data-curio-admin-nav]::-webkit-scrollbar {
  width: 9px;
}

[data-curio-admin-nav]::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

[data-curio-admin-nav-group] {
  display: grid;
  gap: 10px;
  margin: 0;
}

[data-curio-admin-nav-group][open] {
  padding-bottom: 4px;
}

[data-curio-admin-nav-heading] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 2px 2px 2px 0;
  color: rgba(245, 236, 227, 0.56);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  list-style: none;
  cursor: pointer;
  user-select: none;
}

[data-curio-admin-nav-heading]::-webkit-details-marker {
  display: none;
}

[data-curio-admin-nav-group-toggle] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: rgba(245, 236, 227, 0.46);
  transition: transform 180ms ease, color 180ms ease;
}

[data-curio-admin-nav-group][open] [data-curio-admin-nav-group-toggle] {
  transform: rotate(90deg);
  color: rgba(247, 193, 177, 0.82);
}

[data-curio-admin-nav-group-items] {
  display: grid;
  gap: 10px;
  overflow: hidden;
}

[data-curio-admin-nav-link] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  text-decoration: none;
  border-radius: 14px;
  padding: 11px 14px;
  color: rgba(245, 236, 227, 0.84);
  transition: background 180ms ease, color 180ms ease, transform 180ms ease;
}

[data-curio-admin-nav-main] {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

[data-curio-admin-nav-main] > span:last-child {
  min-width: 0;
}

[data-curio-admin-nav-icon] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: rgba(245, 236, 227, 0.62);
  flex: 0 0 auto;
}

[data-curio-admin-nav-link]:hover,
[data-curio-admin-nav-link][data-active="true"] {
  background: rgba(255, 255, 255, 0.1);
  color: #fffaf5;
  transform: translateX(2px);
}

[data-curio-admin-nav-link]:hover [data-curio-admin-nav-icon],
[data-curio-admin-nav-link][data-active="true"] [data-curio-admin-nav-icon] {
  color: #f7c1b1;
}

[data-curio-admin-main] {
  position: relative;
  padding: 28px;
  min-width: 0;
}

[data-curio-admin-frame] {
  max-width: var(--curio-page-max);
  margin: 0 auto;
  display: grid;
  gap: 22px;
  min-width: 0;
}

[data-curio-admin-live-root] {
  display: grid;
  gap: 22px;
  min-width: 0;
}

[data-curio-admin-navigation-indicator] {
  position: absolute;
  inset: 0;
  z-index: 60;
  display: grid;
  place-items: center;
  padding: 28px;
  background: linear-gradient(180deg, rgba(244, 239, 232, 0.72), rgba(244, 239, 232, 0.82));
  opacity: 0;
  pointer-events: none;
  transition: opacity 160ms ease;
}

[data-curio-admin-navigation-indicator-card] {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 18px;
  border: 1px solid rgba(53, 35, 23, 0.12);
  background: rgba(255, 250, 244, 0.98);
  box-shadow: 0 20px 46px rgba(31, 17, 12, 0.12);
  color: var(--curio-accent-strong);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

[data-curio-admin-navigation-spinner] {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(154, 60, 35, 0.18);
  border-top-color: currentColor;
  animation: curio-admin-spin 0.7s linear infinite;
}

html[data-curio-admin-navigation-pending="true"] [data-curio-admin-navigation-indicator] {
  opacity: 1;
}

html[data-curio-admin-navigation-pending="true"] [data-curio-admin-frame] {
  filter: saturate(0.9);
}

[data-curio-admin-topbar] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  gap: 18px;
}

[data-curio-admin-title-block] {
  display: grid;
  gap: 5px;
  min-width: 0;
}

[data-curio-admin-kicker] {
  color: var(--curio-accent-strong);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

[data-curio-admin-title] {
  margin: 0;
  max-width: 100%;
  font:
    700 clamp(24px, 3vw, 34px) / 0.98 "Iowan Old Style",
    "Palatino Linotype",
    Georgia,
    serif;
  overflow-wrap: anywhere;
  word-break: break-word;
}

[data-curio-admin-sort-link] {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  text-decoration: none;
}

[data-curio-admin-sort-icon] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.45;
}

[data-curio-admin-sort-link][data-active="true"] {
  color: var(--curio-accent-strong);
}

[data-curio-admin-sort-link][data-active="true"] [data-curio-admin-sort-icon] {
  opacity: 1;
}

[data-curio-admin-card-header] {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
  padding: 24px 24px 0;
}

[data-curio-admin-card-header-actions] {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

[data-curio-admin-card-link] {
  display: inline-flex;
  align-items: flex-start;
  gap: 5px;
  color: var(--curio-accent-strong);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
}

[data-curio-admin-card-link][data-curio-admin-outbound="true"]::after {
  content: "";
  width: 11px;
  height: 11px;
  flex: 0 0 auto;
  opacity: 0.72;
  background-color: currentColor;
  -webkit-mask:
    url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M9.4 2.8H13.2V6.6"/%3E%3Cpath d="M13 3 7.7 8.3"/%3E%3Cpath d="M6.4 4H4.5A1.7 1.7 0 0 0 2.8 5.7V11.5A1.7 1.7 0 0 0 4.5 13.2H10.3A1.7 1.7 0 0 0 12 11.5V9.6"/%3E%3C/svg%3E')
    center / contain no-repeat;
  mask:
    url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="black" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M9.4 2.8H13.2V6.6"/%3E%3Cpath d="M13 3 7.7 8.3"/%3E%3Cpath d="M6.4 4H4.5A1.7 1.7 0 0 0 2.8 5.7V11.5A1.7 1.7 0 0 0 4.5 13.2H10.3A1.7 1.7 0 0 0 12 11.5V9.6"/%3E%3C/svg%3E')
    center / contain no-repeat;
  transform: translateY(1px);
}

[data-curio-admin-card-link]:hover {
  text-decoration: underline;
}

[data-curio-admin-subtitle] {
  color: var(--curio-muted);
  max-width: 60ch;
}

[data-curio-admin-card] {
  background: var(--curio-bg-elevated);
  border: 1px solid var(--curio-border);
  border-radius: var(--curio-radius-xl);
  box-shadow: var(--curio-shadow);
  backdrop-filter: blur(16px);
  min-width: 0;
  max-width: 100%;
}

[data-curio-admin-card-inner] {
  padding: 26px;
  min-width: 0;
  max-width: 100%;
}

[data-curio-admin-modal] {
  width: min(100vw - 32px, 760px);
  max-width: 760px;
  padding: 0;
  border: none;
  background: transparent;
}

[data-curio-admin-modal]::backdrop {
  background: rgba(24, 18, 17, 0.46);
  backdrop-filter: blur(6px);
}

[data-curio-admin-modal-card] {
  background: var(--curio-bg-elevated);
  border: 1px solid var(--curio-border);
  border-radius: var(--curio-radius-xl);
  box-shadow: 0 34px 80px rgba(29, 18, 14, 0.2);
  backdrop-filter: blur(18px);
}

[data-curio-admin-grid] {
  display: grid;
  gap: 18px;
}

[data-curio-admin-dashboard-grid] {
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: stretch;
}

[data-curio-admin-widget-slot] {
  min-width: 0;
}

[data-curio-admin-widget-slot][data-size="sm"] {
  grid-column: span 3;
}

[data-curio-admin-widget-slot][data-size="md"] {
  grid-column: span 4;
}

[data-curio-admin-widget-slot][data-size="lg"] {
  grid-column: span 6;
}

[data-curio-admin-widget-slot][data-size="full"] {
  grid-column: 1 / -1;
}

[data-curio-admin-grid][data-columns="4"] {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

[data-curio-admin-metrics-card] {
  position: relative;
  overflow: hidden;
  padding: 22px;
  min-height: 150px;
}

[data-curio-admin-metrics-card]::after {
  content: "";
  position: absolute;
  inset: auto -40px -50px auto;
  width: 140px;
  height: 140px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(198, 90, 62, 0.18), transparent 70%);
}

[data-curio-admin-metrics-label] {
  color: var(--curio-muted);
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

[data-curio-admin-metrics-value] {
  margin-top: 18px;
  font: 700 48px/0.92 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}

[data-curio-admin-metrics-copy] {
  margin-top: 10px;
  color: var(--curio-muted);
}

[data-curio-admin-widget-link] {
  display: block;
  height: 100%;
  text-decoration: none;
}

[data-curio-admin-dashboard-widget] {
  height: 100%;
}

[data-curio-admin-widget-title] {
  margin-top: 12px;
  font: 700 32px/0.96 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}

[data-curio-admin-toolbar] {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
}

[data-curio-admin-actions] {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

[data-curio-admin-topbar] > [data-curio-admin-actions] {
  justify-self: end;
  flex-wrap: nowrap;
  align-items: flex-start;
}

[data-curio-admin-button] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: var(--curio-control-height);
  min-width: 108px;
  padding: 0 18px;
  border-radius: var(--curio-control-radius);
  border: none;
  background: rgba(255, 255, 255, 0.92);
  color: var(--curio-ink);
  text-decoration: none;
  white-space: nowrap;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
  box-shadow:
    0 10px 24px rgba(41, 23, 13, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.62);
  transition:
    transform 180ms ease,
    background 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
}

[data-curio-admin-button][data-size="sm"] {
  min-height: 38px;
  min-width: 0;
  padding: 0 14px;
  border-radius: 13px;
  font-size: 13px;
}

[data-curio-admin-button]:hover {
  transform: translateY(-1px);
  box-shadow:
    0 16px 30px rgba(41, 23, 13, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.68);
}

[data-curio-admin-button][data-variant="primary"] {
  background: linear-gradient(135deg, #cb6548, #9f432a);
  color: #fff8f2;
}

[data-curio-admin-button][data-variant="danger"] {
  background: linear-gradient(135deg, #bd5757, #943535);
  color: #fff7f7;
}

[data-curio-admin-button][disabled] {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

[data-curio-admin-button][data-loading="true"] {
  position: relative;
  cursor: progress;
}

[data-curio-admin-button][data-loading="true"]::before {
  content: "";
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: curio-admin-spin 0.7s linear infinite;
}

[data-curio-admin-form] {
  display: grid;
  gap: 18px;
}

[data-curio-admin-field-grid] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

[data-curio-admin-field][data-span="2"] {
  grid-column: 1 / -1;
}

[data-curio-admin-field] {
  display: grid;
  gap: 8px;
}

[data-curio-admin-field-error] {
  min-height: 18px;
  color: var(--curio-danger);
  font-size: 13px;
  line-height: 1.35;
}

[data-curio-admin-field-error]:empty {
  min-height: 0;
}

[data-curio-admin-label] {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--curio-muted);
}

[data-curio-admin-input],
[data-curio-admin-select],
[data-curio-admin-textarea] {
  width: 100%;
  border: 1px solid rgba(64, 47, 36, 0.14);
  border-radius: var(--curio-control-radius);
  padding: 13px 15px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--curio-ink);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.74) inset;
  transition: border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease;
}

[data-curio-admin-input],
[data-curio-admin-select] {
  min-height: var(--curio-control-height);
}

[data-curio-admin-textarea] {
  min-height: 132px;
  resize: vertical;
}

[data-curio-admin-input]:focus,
[data-curio-admin-select]:focus,
[data-curio-admin-textarea]:focus {
  outline: none;
  border-color: rgba(198, 90, 62, 0.52);
  box-shadow: 0 0 0 4px rgba(198, 90, 62, 0.12);
}

[data-curio-admin-field][data-invalid="true"] [data-curio-admin-input],
[data-curio-admin-field][data-invalid="true"] [data-curio-admin-select],
[data-curio-admin-field][data-invalid="true"] [data-curio-admin-textarea] {
  border-color: rgba(162, 59, 59, 0.32);
  box-shadow: 0 0 0 4px rgba(162, 59, 59, 0.08);
}

[data-curio-admin-checkbox-row] {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  color: var(--curio-muted);
}

[data-curio-admin-checkbox-row] input[type="checkbox"] {
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  accent-color: var(--curio-accent);
  flex: 0 0 auto;
}

[data-curio-admin-assignment] {
  display: grid;
  gap: 14px;
  padding: 18px;
  border: 1px solid rgba(64, 47, 36, 0.12);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 251, 247, 0.86)),
    radial-gradient(circle at top right, rgba(198, 90, 62, 0.08), transparent 32%);
}

[data-curio-admin-assignment-header] {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

[data-curio-admin-assignment-meta] {
  display: grid;
  gap: 8px;
  justify-items: end;
  text-align: right;
  align-content: start;
}

[data-curio-admin-assignment-summary] {
  color: var(--curio-muted);
  font-size: 13px;
  max-width: 26ch;
}

[data-curio-admin-assignment-filter] {
  display: grid;
}

[data-curio-admin-assignment-scroll] {
  display: grid;
  gap: 10px;
  max-height: 320px;
  padding-right: 6px;
  overflow: auto;
}

[data-curio-admin-assignment-option] {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  padding: 15px 16px;
  min-height: 86px;
  border-radius: 20px;
  border: 1px solid rgba(64, 47, 36, 0.1);
  background: rgba(255, 255, 255, 0.68);
  cursor: pointer;
  transition:
    border-color 160ms ease,
    background 160ms ease,
    transform 160ms ease,
    box-shadow 160ms ease;
}

[data-curio-admin-assignment-option]:hover {
  transform: translateY(-1px);
  border-color: rgba(198, 90, 62, 0.24);
  background: rgba(255, 255, 255, 0.9);
}

[data-curio-admin-assignment-option][data-selected="true"] {
  border-color: rgba(198, 90, 62, 0.36);
  background:
    linear-gradient(135deg, rgba(198, 90, 62, 0.12), rgba(255, 250, 245, 0.96));
  box-shadow: inset 0 0 0 1px rgba(198, 90, 62, 0.08);
}

[data-curio-admin-assignment-option][hidden] {
  display: none;
}

[data-curio-admin-assignment-input] {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

[data-curio-admin-assignment-copy-block] {
  display: grid;
  gap: 4px;
}

[data-curio-admin-assignment-key] {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--curio-accent-strong);
}

[data-curio-admin-assignment-label] {
  font-weight: 700;
  color: var(--curio-ink);
}

[data-curio-admin-assignment-description] {
  color: var(--curio-muted);
  font-size: 14px;
}

[data-curio-admin-assignment-state] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 92px;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 12px;
  background: rgba(38, 31, 26, 0.07);
  color: var(--curio-muted);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

[data-curio-admin-assignment-option][data-selected="true"] [data-curio-admin-assignment-state] {
  background: rgba(198, 90, 62, 0.14);
  color: var(--curio-accent-strong);
}

[data-curio-admin-inline-input] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: stretch;
}

[data-curio-admin-inline-input] > * {
  flex: 1;
}

[data-curio-admin-inline-input] > button {
  flex: 0 0 auto;
  min-width: 84px;
  padding-inline: 14px;
  box-shadow: none;
}

[data-curio-admin-toggle-field] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 16px 18px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(64, 47, 36, 0.1);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.72) inset;
}

[data-curio-admin-toggle-copy] {
  display: grid;
  gap: 6px;
  min-width: 0;
}

[data-curio-admin-toggle-copy] [data-curio-admin-label] {
  color: var(--curio-ink);
}

[data-curio-admin-toggle-control] {
  position: relative;
  flex: 0 0 auto;
  width: 56px;
  height: 32px;
}

[data-curio-admin-toggle-input] {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

[data-curio-admin-toggle-track] {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(38, 31, 26, 0.14);
  transition: background 180ms ease, box-shadow 180ms ease;
}

[data-curio-admin-toggle-track]::after {
  content: "";
  position: absolute;
  top: 4px;
  left: 4px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: #fffaf5;
  box-shadow: 0 6px 16px rgba(41, 23, 13, 0.2);
  transition: transform 180ms ease;
}

[data-curio-admin-toggle-input]:focus-visible + [data-curio-admin-toggle-track] {
  box-shadow: 0 0 0 4px rgba(198, 90, 62, 0.12);
}

[data-curio-admin-toggle-input]:checked + [data-curio-admin-toggle-track] {
  background: linear-gradient(135deg, #cb6548, #9f432a);
}

[data-curio-admin-toggle-input]:checked + [data-curio-admin-toggle-track]::after {
  transform: translateX(24px);
}

[data-curio-admin-search-panel] {
  display: grid;
  gap: 16px;
  margin-bottom: 22px;
}

[data-curio-admin-searchbar] {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

[data-curio-admin-search-actions] {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  justify-self: end;
}

[data-curio-admin-search-actions] > [data-curio-admin-button] {
  min-height: 40px;
  min-width: 96px;
  padding: 0 16px;
}

[data-curio-admin-toolbar] [data-curio-admin-actions] > [data-curio-admin-button] {
  min-width: 96px;
}

[data-curio-admin-pagination] {
  margin-top: 22px;
  padding-top: 8px;
}

[data-curio-admin-filters] {
  display: block;
}

[data-curio-admin-filters-summary] {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-height: 38px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid rgba(64, 47, 36, 0.08);
  background: rgba(255, 255, 255, 0.78);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--curio-muted);
  list-style: none;
  user-select: none;
}

[data-curio-admin-filters-summary]::-webkit-details-marker {
  display: none;
}

[data-curio-admin-filters-summary]::before {
  content: none;
}

[data-curio-admin-filters-summary]::after {
  content: ">";
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 10px;
  color: var(--curio-accent-strong);
  transform: translateY(-1px);
  transition: transform 180ms ease;
}

[data-curio-admin-filters][open] {
  display: grid;
  gap: 14px;
  padding: 16px 18px 18px;
  border: 1px solid rgba(64, 47, 36, 0.08);
  border-radius: 20px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.86), rgba(255, 251, 247, 0.78));
}

[data-curio-admin-filters][open] [data-curio-admin-filters-summary] {
  display: flex;
  width: 100%;
  min-height: 0;
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

[data-curio-admin-filters][open] [data-curio-admin-filters-summary]::after {
  transform: rotate(90deg) translateX(1px);
}

[data-curio-admin-filters-grid] {
  display: none;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 16px;
}

[data-curio-admin-filters][open] [data-curio-admin-filters-grid] {
  display: grid;
}

[data-curio-admin-table-wrap] {
  border: 1px solid rgba(64, 47, 36, 0.08);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.82), rgba(255, 251, 247, 0.76));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  overflow-x: auto;
  max-width: 100%;
  min-width: 0;
}

[data-curio-admin-table] {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 760px;
}

[data-curio-admin-table] th,
[data-curio-admin-table] td {
  padding: 16px 18px;
  border-bottom: 1px solid rgba(64, 47, 36, 0.08);
  vertical-align: top;
}

[data-curio-admin-table] th {
  text-align: left;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--curio-muted);
  background: rgba(255, 250, 246, 0.88);
  position: sticky;
  top: 0;
  z-index: 1;
}

[data-curio-admin-table] thead th:first-child {
  border-top-left-radius: 22px;
}

[data-curio-admin-table] thead th:last-child {
  border-top-right-radius: 22px;
}

[data-curio-admin-table] tbody tr:last-child td {
  border-bottom: none;
}

[data-curio-admin-table] tbody tr:nth-child(even) td {
  background: rgba(255, 255, 255, 0.34);
}

[data-curio-admin-table] tbody tr:hover td {
  background: rgba(255, 255, 255, 0.7);
}

[data-curio-admin-table] td [data-curio-admin-actions] {
  gap: 8px;
}

[data-curio-admin-inline-action] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 11px;
  border-radius: 11px;
  border: 1px solid rgba(64, 47, 36, 0.1);
  background: rgba(255, 255, 255, 0.72);
  color: var(--curio-ink);
  font-size: 13px;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

[data-curio-admin-inline-action]:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(198, 90, 62, 0.18);
}

[data-curio-admin-inline-action][data-tone="danger"] {
  color: var(--curio-danger);
  border-color: rgba(162, 59, 59, 0.16);
  background: rgba(162, 59, 59, 0.06);
}

[data-curio-admin-badge-row] {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

[data-curio-admin-badge] {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(198, 90, 62, 0.12);
  color: var(--curio-accent-strong);
  font-size: 13px;
  font-weight: 600;
}

[data-curio-admin-badge][data-tone="muted"] {
  background: rgba(38, 31, 26, 0.08);
  color: var(--curio-muted);
}

[data-curio-admin-badge][data-tone="success"] {
  background: rgba(47, 122, 87, 0.12);
  color: var(--curio-success);
}

[data-curio-admin-badge][data-tone="danger"] {
  background: rgba(162, 59, 59, 0.12);
  color: var(--curio-danger);
}

[data-curio-admin-badge][data-tone="warning"] {
  background: rgba(159, 108, 22, 0.12);
  color: var(--curio-warning);
}

[data-curio-admin-badge][data-tone="info"] {
  background: rgba(56, 98, 140, 0.12);
  color: #315b84;
}

[data-curio-admin-badge][data-pulse="true"]::before {
  content: "";
  width: 8px;
  height: 8px;
  margin-right: 8px;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 0 0 currentColor;
  animation: curio-admin-pulse 1.35s ease-out infinite;
}

[data-curio-admin-detail-grid] {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  gap: 18px;
}

[data-curio-admin-kv] {
  display: grid;
  gap: 18px;
}

[data-curio-admin-kv-row] {
  display: grid;
  grid-template-columns: 160px minmax(0, 1fr);
  gap: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(64, 47, 36, 0.08);
}

[data-curio-admin-kv-row] dt {
  color: var(--curio-muted);
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

[data-curio-admin-kv-row] dd {
  margin: 0;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

[data-curio-admin-panel-stack] {
  display: grid;
  gap: 18px;
}

[data-curio-admin-empty] {
  padding: 42px 28px;
  text-align: center;
  color: var(--curio-muted);
}

[data-curio-admin-flash] {
  padding: 14px 16px;
  border-radius: 16px;
  border: 1px solid rgba(198, 90, 62, 0.18);
  background: rgba(198, 90, 62, 0.08);
}

[data-curio-admin-flash][data-tone="error"] {
  border-color: rgba(162, 59, 59, 0.2);
  background: rgba(162, 59, 59, 0.08);
  color: var(--curio-danger);
}

[data-curio-admin-flash][data-tone="success"] {
  border-color: rgba(47, 122, 87, 0.22);
  background: rgba(47, 122, 87, 0.08);
  color: var(--curio-success);
}

[data-curio-admin-card-inner] pre,
[data-curio-admin-kv-row] pre {
  max-width: 100%;
  overflow-x: auto;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: pre-wrap;
}

[data-curio-admin-login] {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
}

[data-curio-admin-login-card] {
  width: min(100%, 840px);
  display: grid;
  grid-template-columns: minmax(0, 0.96fr) minmax(360px, 0.82fr);
  overflow: hidden;
}

[data-curio-admin-login-cover] {
  position: relative;
  overflow: hidden;
  padding: 42px 38px;
  display: grid;
  align-content: center;
  background:
    radial-gradient(circle at top left, rgba(255,255,255,0.2), transparent 30%),
    radial-gradient(circle at bottom right, rgba(255,255,255,0.12), transparent 32%),
    linear-gradient(160deg, #241f1f, #45352f 55%, #7a4e3f);
  color: #fff4ed;
}

[data-curio-admin-login-cover]::after {
  content: "";
  position: absolute;
  inset: auto -70px -80px auto;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(245, 228, 205, 0.28), transparent 66%);
}

[data-curio-admin-login-copy] {
  max-width: 26ch;
  color: rgba(255, 244, 237, 0.78);
}

[data-curio-admin-login-panel] {
  padding: 34px;
  display: grid;
  place-items: center;
  background: rgba(255, 252, 248, 0.92);
}

[data-curio-admin-login-panel] > [data-curio-admin-grid] {
  width: min(100%, 348px);
}

[data-curio-admin-code] {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 6px 10px;
  border-radius: 12px;
  background: rgba(38, 31, 26, 0.06);
  color: var(--curio-ink);
  font-family: ui-monospace, "SFMono-Regular", Menlo, monospace;
  font-size: 12px;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

[data-curio-admin-code][data-wrap="true"] {
  display: inline-block;
  width: 100%;
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

@keyframes curio-admin-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes curio-admin-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0.24);
  }

  70% {
    box-shadow: 0 0 0 10px rgba(0, 0, 0, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(0, 0, 0, 0);
  }
}

[data-curio-admin-footer] {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--curio-muted);
  font-size: 13px;
}

[data-curio-admin-confirm-box] {
  padding: 16px;
  border-radius: 18px;
  border: 1px dashed rgba(162, 59, 59, 0.24);
  background: rgba(162, 59, 59, 0.06);
}

[data-curio-admin-pipeline-live-indicator] {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 11px;
  border-radius: 999px;
  border: 1px solid rgba(47, 122, 87, 0.18);
  background: rgba(255, 255, 255, 0.72);
  color: var(--curio-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

[data-curio-admin-pipeline-live-dot] {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--curio-success);
  box-shadow: 0 0 0 0 rgba(47, 122, 87, 0.28);
  animation: curio-admin-live-pulse 1.6s ease-out infinite;
}

@keyframes curio-admin-live-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(47, 122, 87, 0.3);
  }

  70% {
    box-shadow: 0 0 0 8px rgba(47, 122, 87, 0);
  }

  100% {
    box-shadow: 0 0 0 0 rgba(47, 122, 87, 0);
  }
}

[data-curio-admin-pipeline-lanes] {
  display: grid;
  gap: 16px;
}

[data-curio-admin-pipeline-lane] {
  overflow: hidden;
}

[data-curio-admin-pipeline-lane-summary] {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 18px;
  align-items: start;
  padding: 22px 24px;
  cursor: pointer;
  list-style: none;
}

[data-curio-admin-pipeline-lane-summary]::-webkit-details-marker {
  display: none;
}

[data-curio-admin-pipeline-lane-main] {
  display: grid;
  gap: 10px;
  min-width: 0;
}

[data-curio-admin-pipeline-lane-title] {
  margin: 0;
  font: 700 28px/0.98 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  overflow-wrap: anywhere;
}

[data-curio-admin-pipeline-lane-meta] {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

[data-curio-admin-pipeline-lane-meta-item] {
  color: var(--curio-muted);
  font-size: 13px;
}

[data-curio-admin-pipeline-lane-counts] {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

[data-curio-admin-pipeline-lane-count] {
  display: grid;
  gap: 2px;
  min-width: 78px;
  padding: 8px 10px;
  border-radius: 16px;
  border: 1px solid rgba(64, 47, 36, 0.08);
  background: rgba(255, 255, 255, 0.6);
}

[data-curio-admin-pipeline-lane-count-label] {
  color: var(--curio-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

[data-curio-admin-pipeline-lane-count-value] {
  font: 700 22px/0.94 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}

[data-curio-admin-pipeline-lane-chevron] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--curio-muted);
  font-size: 24px;
  transform: rotate(90deg);
  transition: transform 180ms ease;
}

[data-curio-admin-pipeline-lane][open] [data-curio-admin-pipeline-lane-chevron] {
  transform: rotate(270deg);
}

[data-curio-admin-pipeline-lane-body] {
  display: grid;
  gap: 18px;
  padding: 18px 24px 24px;
  border-top: 1px solid rgba(64, 47, 36, 0.08);
}

[data-curio-admin-pipeline-lane-grid] {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

[data-curio-admin-pipeline-lane-footer] {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
  padding-top: 16px;
  border-top: 1px solid rgba(64, 47, 36, 0.08);
}

[data-curio-admin-pipeline-lane-footer-copy] {
  display: grid;
  gap: 4px;
  min-width: 140px;
}

[data-curio-admin-pipeline-lane-footer-value] {
  font: 700 22px/1 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}

[data-curio-admin-pipeline-lane-footer-note] {
  color: var(--curio-muted);
  font-size: 13px;
}

[data-curio-admin-pipeline-lane-channel-block] {
  display: grid;
  gap: 8px;
  justify-items: start;
}

[data-curio-admin-pipeline-lane-shared-note] {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--curio-muted);
  font-size: 12px;
}

[data-curio-admin-pipeline-flow-card] {
  overflow: hidden;
}

[data-curio-admin-pipeline-flow-card-inner] {
  display: grid;
  gap: 20px;
  padding: 0 24px 24px;
}

[data-curio-admin-pipeline-legend] {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
  justify-content: flex-end;
}

[data-curio-admin-pipeline-legend-item] {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 28px;
  color: var(--curio-muted);
  font-size: 13px;
}

[data-curio-admin-pipeline-legend][data-compact="true"] {
  gap: 8px 12px;
}

[data-curio-admin-pipeline-legend][data-compact="true"] [data-curio-admin-pipeline-legend-item] {
  gap: 8px;
  min-height: 22px;
  font-size: 11px;
}

[data-curio-admin-pipeline-legend][data-compact="true"] [data-curio-admin-pipeline-token] {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  font-size: 6px;
}

[data-curio-admin-pipeline-legend][data-compact="true"] [data-curio-admin-pipeline-token-corner] {
  min-width: 11px;
  height: 11px;
  font-size: 4px;
}

[data-curio-admin-pipeline-ribbon] {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

[data-curio-admin-pipeline-band] {
  display: grid;
  gap: 14px;
  min-width: 236px;
  padding: 16px 18px;
  border: 1px solid rgba(64, 47, 36, 0.09);
  border-radius: 22px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.88), rgba(255, 249, 244, 0.76));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

[data-curio-admin-pipeline-band][data-stage="queued"] {
  background:
    linear-gradient(180deg, rgba(255, 253, 250, 0.9), rgba(255, 244, 236, 0.86)),
    radial-gradient(circle at top right, rgba(198, 90, 62, 0.08), transparent 48%);
}

[data-curio-admin-pipeline-band][data-stage="held"] {
  background:
    linear-gradient(180deg, rgba(248, 252, 255, 0.92), rgba(236, 244, 255, 0.88)),
    radial-gradient(circle at top right, rgba(74, 126, 201, 0.12), transparent 48%);
}

[data-curio-admin-pipeline-band][data-stage="network"] {
  background:
    linear-gradient(180deg, rgba(248, 247, 255, 0.92), rgba(238, 235, 255, 0.88)),
    radial-gradient(circle at top right, rgba(135, 84, 190, 0.12), transparent 48%);
}

[data-curio-admin-pipeline-band-head] {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

[data-curio-admin-pipeline-band-title] {
  margin: 0;
  font: 700 18px/1.02 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}

[data-curio-admin-pipeline-band-note] {
  color: var(--curio-muted);
  font-size: 13px;
  max-width: 26ch;
}

[data-curio-admin-pipeline-separator] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  color: rgba(74, 51, 33, 0.46);
  font-size: 24px;
  font-weight: 700;
  transform: translateY(24px);
}

[data-curio-admin-pipeline-matrix-shell] {
  display: flex;
  align-items: flex-start;
  min-height: 104px;
}

[data-curio-admin-pipeline-matrix-shell][data-compact="true"] {
  min-height: 54px;
}

[data-curio-admin-pipeline-matrix] {
  display: grid;
  grid-template-columns: repeat(8, 22px);
  grid-auto-rows: 22px;
  gap: 6px;
  width: fit-content;
}

[data-curio-admin-pipeline-matrix-shell][data-compact="true"] [data-curio-admin-pipeline-matrix] {
  grid-template-columns: repeat(10, 18px);
  grid-auto-rows: 18px;
  gap: 4px;
}

[data-curio-admin-pipeline-token] {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1px solid rgba(64, 47, 36, 0.14);
  background: rgba(196, 185, 173, 0.42);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
  color: #fffaf5;
  text-decoration: none;
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

[data-curio-admin-pipeline-matrix-shell][data-compact="true"] [data-curio-admin-pipeline-token] {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  font-size: 6px;
}

[data-curio-admin-pipeline-token-label] {
  line-height: 1;
}

[data-curio-admin-pipeline-token][data-tone="classic"] {
  background: linear-gradient(180deg, rgba(74, 126, 201, 0.92), rgba(44, 92, 175, 0.96));
  border-color: rgba(33, 66, 122, 0.26);
}

[data-curio-admin-pipeline-token][data-tone="contract"] {
  background: linear-gradient(180deg, rgba(135, 84, 190, 0.92), rgba(98, 57, 158, 0.96));
  border-color: rgba(74, 39, 119, 0.28);
}

[data-curio-admin-pipeline-token][data-tone="channel"] {
  background: linear-gradient(180deg, rgba(76, 152, 113, 0.9), rgba(46, 118, 81, 0.96));
  border-color: rgba(31, 88, 58, 0.22);
}

[data-curio-admin-pipeline-token-corner] {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 13px;
  height: 13px;
  padding: 0 2px;
  border-radius: 999px;
  border: 2px solid rgba(255, 255, 255, 0.94);
  background: #1f1f24;
  color: #fffaf5;
  font-size: 5px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

[data-curio-admin-pipeline-matrix-shell][data-compact="true"] [data-curio-admin-pipeline-token-corner] {
  min-width: 11px;
  height: 11px;
  font-size: 4px;
}

[data-curio-admin-pipeline-token-more] {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 7px;
  border: 1px dashed rgba(64, 47, 36, 0.18);
  color: var(--curio-muted);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

[data-curio-admin-pipeline-matrix-shell][data-compact="true"] [data-curio-admin-pipeline-token-more] {
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 6px;
  font-size: 6px;
}

[data-curio-admin-pipeline-empty] {
  display: flex;
  align-items: center;
  min-height: 104px;
  color: var(--curio-muted);
  font-size: 13px;
}

[data-curio-admin-pipeline-matrix-shell][data-compact="true"] [data-curio-admin-pipeline-empty] {
  min-height: 54px;
  font-size: 12px;
}

[data-curio-admin-pipeline-channel-strip] {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
  padding-top: 18px;
  border-top: 1px solid rgba(64, 47, 36, 0.1);
}

[data-curio-admin-pipeline-channel-copy] {
  display: grid;
  gap: 4px;
  min-width: 140px;
}

[data-curio-admin-pipeline-channel-caption] {
  color: var(--curio-muted);
  font: 700 22px/1 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
}

[data-curio-admin-pipeline-stat-grid] {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  align-items: stretch;
}

[data-curio-admin-pipeline-stat-card] {
  overflow: hidden;
  min-width: 0;
}

[data-curio-admin-pipeline-stat-card][data-tone="queue"] {
  --curio-pipeline-tone: rgba(198, 90, 62, 0.88);
  --curio-pipeline-tone-soft: rgba(198, 90, 62, 0.22);
}

[data-curio-admin-pipeline-stat-card][data-tone="reservation"] {
  --curio-pipeline-tone: rgba(44, 92, 175, 0.9);
  --curio-pipeline-tone-soft: rgba(74, 126, 201, 0.22);
}

[data-curio-admin-pipeline-stat-card][data-tone="submitted"] {
  --curio-pipeline-tone: rgba(98, 57, 158, 0.92);
  --curio-pipeline-tone-soft: rgba(135, 84, 190, 0.22);
}

[data-curio-admin-pipeline-stat-card][data-tone="confirmed"] {
  --curio-pipeline-tone: rgba(46, 118, 81, 0.94);
  --curio-pipeline-tone-soft: rgba(76, 152, 113, 0.22);
}

[data-curio-admin-pipeline-stat-card][data-tone="failed"] {
  --curio-pipeline-tone: rgba(162, 59, 59, 0.92);
  --curio-pipeline-tone-soft: rgba(162, 59, 59, 0.2);
}

[data-curio-admin-pipeline-stat-card] [data-curio-admin-card-inner] {
  display: grid;
  gap: 14px;
  position: relative;
}

[data-curio-admin-pipeline-stat-head] {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  min-height: 54px;
}

[data-curio-admin-pipeline-stat-title] {
  margin: 0;
  font: 700 17px/1.06 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  max-width: 18ch;
  overflow-wrap: anywhere;
}

[data-curio-admin-pipeline-stat-aside] {
  display: grid;
  justify-items: end;
  align-content: start;
  gap: 0;
  min-width: 0;
  flex: 0 0 auto;
}

[data-curio-admin-pipeline-stat-link] {
  display: inline-flex;
  color: var(--curio-muted);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
  text-transform: uppercase;
}

[data-curio-admin-pipeline-stat-link]:hover {
  color: var(--curio-accent-strong);
  text-decoration: underline;
}

[data-curio-admin-pipeline-stat-value] {
  font: 700 40px/0.92 "Iowan Old Style", "Palatino Linotype", Georgia, serif;
  color: var(--curio-pipeline-tone);
}

[data-curio-admin-pipeline-mini-bars] {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: end;
  gap: 6px;
  height: 54px;
}

[data-curio-admin-pipeline-mini-bar] {
  border-radius: 999px 999px 5px 5px;
  background: var(--curio-pipeline-tone-soft);
  border: 1px solid rgba(64, 47, 36, 0.08);
  border-bottom-color: transparent;
  min-height: 12px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
}

[data-curio-admin-pipeline-stat-card][data-tone="queue"] [data-curio-admin-pipeline-mini-bar],
[data-curio-admin-pipeline-stat-card][data-tone="reservation"] [data-curio-admin-pipeline-mini-bar],
[data-curio-admin-pipeline-stat-card][data-tone="submitted"] [data-curio-admin-pipeline-mini-bar],
[data-curio-admin-pipeline-stat-card][data-tone="confirmed"] [data-curio-admin-pipeline-mini-bar],
[data-curio-admin-pipeline-stat-card][data-tone="failed"] [data-curio-admin-pipeline-mini-bar] {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.34), transparent 24%),
    var(--curio-pipeline-tone-soft);
}

@media (max-width: 1180px) {
  [data-curio-admin-dashboard-grid] {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  [data-curio-admin-widget-slot][data-size="sm"],
  [data-curio-admin-widget-slot][data-size="md"] {
    grid-column: span 3;
  }

  [data-curio-admin-widget-slot][data-size="lg"],
  [data-curio-admin-widget-slot][data-size="full"] {
    grid-column: 1 / -1;
  }

  [data-curio-admin-grid][data-columns="4"] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  [data-curio-admin-detail-grid] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-pipeline-ribbon] {
    justify-content: flex-start;
  }

  [data-curio-admin-pipeline-stat-grid] {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  [data-curio-admin-pipeline-lane-grid] {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 920px) {
  [data-curio-admin-shell] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-sidebar] {
    position: static;
    height: auto;
  }

  [data-curio-admin-login-card] {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  [data-curio-admin-dashboard-grid] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-widget-slot][data-size="sm"],
  [data-curio-admin-widget-slot][data-size="md"],
  [data-curio-admin-widget-slot][data-size="lg"],
  [data-curio-admin-widget-slot][data-size="full"] {
    grid-column: auto;
  }

  [data-curio-admin-main] {
    padding: 20px;
  }

  [data-curio-admin-topbar] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-topbar] > [data-curio-admin-actions] {
    justify-self: stretch;
    flex-wrap: wrap;
  }

  [data-curio-admin-kv-row] {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  [data-curio-admin-grid][data-columns="4"] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-pipeline-band] {
    min-width: 100%;
  }

  [data-curio-admin-pipeline-legend] {
    justify-content: flex-start;
  }

  [data-curio-admin-pipeline-separator] {
    display: none;
  }

  [data-curio-admin-pipeline-channel-strip] {
    flex-direction: column;
  }

  [data-curio-admin-pipeline-stat-grid] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-pipeline-stat-head] {
    min-height: auto;
    flex-direction: column;
    align-items: flex-start;
  }

  [data-curio-admin-pipeline-stat-aside] {
    justify-items: start;
  }

  [data-curio-admin-pipeline-stat-title] {
    max-width: none;
  }

  [data-curio-admin-pipeline-lane-summary] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-pipeline-lane-counts] {
    justify-content: flex-start;
  }

  [data-curio-admin-pipeline-lane-footer] {
    flex-direction: column;
  }

  [data-curio-admin-field-grid] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-assignment-header] {
    flex-direction: column;
    align-items: flex-start;
  }

  [data-curio-admin-assignment-meta] {
    justify-items: start;
    text-align: left;
  }

  [data-curio-admin-toggle-field] {
    align-items: flex-start;
    flex-direction: column;
  }

  [data-curio-admin-searchbar] {
    grid-template-columns: 1fr;
  }

  [data-curio-admin-search-actions] {
    justify-self: end;
  }

  [data-curio-admin-filters-grid] {
    grid-template-columns: 1fr;
  }
}
`;

/** Small progressive-enhancement script served by the default Curio admin renderer. */
export const ADMIN_CLIENT_SCRIPT = `
document.addEventListener("DOMContentLoaded", () => {
  const navGroupStorageKey = "curio-admin-nav-groups";
  const navScrollStorageKey = "curio-admin-nav-scroll-top";
  const openStateStorageKey = "curio-admin-open-state";
  const shell = document.querySelector("[data-curio-admin-shell]");
  const liveRootSelector = "[data-curio-admin-live-root]";

  const readNavGroupState = () => {
    try {
      const raw = window.localStorage.getItem(navGroupStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeNavGroupState = (state) => {
    try {
      window.localStorage.setItem(navGroupStorageKey, JSON.stringify(state));
    } catch {
      // Ignore storage failures.
    }
  };

  const readNavScrollTop = () => {
    try {
      const raw = window.localStorage.getItem(navScrollStorageKey);
      const value = raw ? Number(raw) : 0;
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  };

  const writeNavScrollTop = (value) => {
    try {
      window.localStorage.setItem(navScrollStorageKey, String(Math.max(0, value)));
    } catch {
      // Ignore storage failures.
    }
  };

  const readOpenState = () => {
    try {
      const raw = window.localStorage.getItem(openStateStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const writeOpenState = (state) => {
    try {
      window.localStorage.setItem(openStateStorageKey, JSON.stringify(state));
    } catch {
      // Ignore storage failures.
    }
  };

  const navGroupState = readNavGroupState();
  const openState = readOpenState();
  const nav = document.querySelector("[data-curio-admin-nav]");
  let navigationPending = false;
  let stopLivePolling = () => {};

  const clearNavigationPending = () => {
    navigationPending = false;
    document.documentElement.removeAttribute("data-curio-admin-navigation-pending");
    shell?.removeAttribute("aria-busy");
  };

  const setNavigationPending = () => {
    navigationPending = true;
    document.documentElement.setAttribute("data-curio-admin-navigation-pending", "true");
    shell?.setAttribute("aria-busy", "true");

    if (nav) {
      writeNavScrollTop(nav.scrollTop);
    }
  };

  clearNavigationPending();

  const serializeForm = (form) => {
    const pairs = [];

    for (const [key, value] of new FormData(form).entries()) {
      pairs.push([key, String(value)]);
    }

    pairs.sort((left, right) => {
      if (left[0] === right[0]) {
        return left[1].localeCompare(right[1]);
      }

      return left[0].localeCompare(right[0]);
    });

    return JSON.stringify(pairs);
  };

  for (const group of document.querySelectorAll("[data-curio-admin-nav-collapsible]")) {
    const key = group.getAttribute("data-group-key");

    if (key && Object.prototype.hasOwnProperty.call(navGroupState, key)) {
      if (navGroupState[key]) {
        group.setAttribute("open", "");
      } else {
        group.removeAttribute("open");
      }
    }

    group.addEventListener("toggle", () => {
      if (!key) {
        return;
      }

      navGroupState[key] = group.hasAttribute("open");
      writeNavGroupState(navGroupState);
    });
  }

  if (nav) {
    const restoreNavScroll = () => {
      nav.scrollTop = readNavScrollTop();
    };

    restoreNavScroll();
    window.requestAnimationFrame(restoreNavScroll);

    let pendingScrollFrame = 0;
    nav.addEventListener("scroll", () => {
      if (pendingScrollFrame) {
        window.cancelAnimationFrame(pendingScrollFrame);
      }

      pendingScrollFrame = window.requestAnimationFrame(() => {
        pendingScrollFrame = 0;
        writeNavScrollTop(nav.scrollTop);
      });
    }, { passive: true });

    window.addEventListener("pagehide", () => {
      writeNavScrollTop(nav.scrollTop);
    });
  }

  const openModal = (dialog) => {
    if (typeof dialog.showModal === "function") {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    dialog.setAttribute("open", "");
  };

  const closeModal = (dialog) => {
    if (typeof dialog.close === "function") {
      if (dialog.open) {
        dialog.close();
      }
      return;
    }

    dialog.removeAttribute("open");
  };

  const initializeDynamicContent = (root) => {
    for (const wrapper of root.querySelectorAll("[data-curio-confirm]")) {
      const checkbox = wrapper.querySelector("input[type=checkbox]");
      const submit = wrapper.querySelector("[data-curio-confirm-submit]");

      if (!checkbox || !submit) {
        continue;
      }

      const sync = () => {
        submit.disabled = !checkbox.checked;
      };

      checkbox.addEventListener("change", sync);
      sync();
    }

    for (const details of root.querySelectorAll("[data-curio-admin-persist-open-key]")) {
      const key = details.getAttribute("data-curio-admin-persist-open-key");

      if (!key || details.tagName !== "DETAILS") {
        continue;
      }

      const storageKey = window.location.pathname + "::" + key;

      if (Object.prototype.hasOwnProperty.call(openState, storageKey)) {
        if (openState[storageKey]) {
          details.setAttribute("open", "");
        } else {
          details.removeAttribute("open");
        }
      }

      details.addEventListener("toggle", () => {
        openState[storageKey] = details.hasAttribute("open");
        writeOpenState(openState);
      });
    }

    for (const trigger of root.querySelectorAll("[data-curio-admin-modal-trigger]")) {
      const targetId = trigger.getAttribute("data-curio-admin-modal-trigger");
      const dialog = targetId ? document.getElementById(targetId) : null;

      if (!dialog) {
        continue;
      }

      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        openModal(dialog);
      });
    }

    for (const dialog of root.querySelectorAll("[data-curio-admin-modal]")) {
      if (dialog.getAttribute("data-open-on-load") === "true") {
        openModal(dialog);
      }

      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) {
          closeModal(dialog);
        }
      });

      for (const button of dialog.querySelectorAll("[data-curio-admin-modal-close]")) {
        button.addEventListener("click", (event) => {
          event.preventDefault();
          closeModal(dialog);
        });
      }
    }

    for (const wrapper of root.querySelectorAll("[data-curio-password-toggle]")) {
      const input = wrapper.querySelector("input");
      const button = wrapper.querySelector("button");

      if (!input || !button) {
        continue;
      }

      button.addEventListener("click", (event) => {
        event.preventDefault();
        const nextType = input.getAttribute("type") === "password" ? "text" : "password";
        input.setAttribute("type", nextType);
        button.textContent = nextType === "password" ? "Show" : "Hide";
      });
    }

    for (const wrapper of root.querySelectorAll("[data-curio-admin-assignment]")) {
      const filterInput = wrapper.querySelector("[data-curio-admin-assignment-filter-input]");
      const countNode = wrapper.querySelector("[data-curio-admin-assignment-count]");
      const summaryNode = wrapper.querySelector("[data-curio-admin-assignment-summary]");
      const options = [...wrapper.querySelectorAll("[data-curio-admin-assignment-option]")];

      const sync = () => {
        const selected = options.filter((option) => {
          const input = option.querySelector("[data-curio-admin-assignment-input]");
          return Boolean(input?.checked);
        });

        for (const option of options) {
          const input = option.querySelector("[data-curio-admin-assignment-input]");
          const state = option.querySelector("[data-curio-admin-assignment-state]");
          const checked = Boolean(input?.checked);
          option.setAttribute("data-selected", checked ? "true" : "false");

          if (state) {
            state.textContent = checked ? "Assigned" : "Assign";
          }
        }

        if (countNode) {
          countNode.textContent = selected.length + " selected";
        }

        if (summaryNode) {
          if (selected.length === 0) {
            summaryNode.textContent = "Nothing assigned";
          } else {
            const visible = selected.slice(0, 3).map((option) => {
              return option.querySelector("[data-curio-admin-assignment-key]")?.textContent?.trim() || "";
            }).filter(Boolean);

            summaryNode.textContent = selected.length <= 3
              ? visible.join(", ")
              : visible.join(", ") + " +" + (selected.length - 3);
          }
        }
      };

      const applyFilter = () => {
        const query = String(filterInput?.value || "").trim().toLowerCase();

        for (const option of options) {
          const haystack = option.getAttribute("data-search") || "";
          option.hidden = query.length > 0 && !haystack.includes(query);
        }
      };

      for (const option of options) {
        const input = option.querySelector("[data-curio-admin-assignment-input]");

        input?.addEventListener("change", sync);
      }

      filterInput?.addEventListener("input", applyFilter);
      sync();
      applyFilter();
    }

    for (const form of root.querySelectorAll("[data-curio-dirty-form]")) {
      const submit = form.querySelector("[data-curio-dirty-submit]");

      if (!submit) {
        continue;
      }

      const baseline = serializeForm(form);

      const sync = () => {
        submit.disabled = serializeForm(form) === baseline;
      };

      form.addEventListener("input", sync);
      form.addEventListener("change", sync);
      sync();
    }

    for (const form of root.querySelectorAll("[data-curio-live-validate-form]")) {
      const fields = [...form.querySelectorAll("[data-curio-live-validate]")];

      const readMessage = (input) => {
        const value = String(input.value || "").trim();
        const requiredMessage = input.getAttribute("data-curio-required-message") || "This field is required.";
        const patternMessage = input.getAttribute("data-curio-pattern-message") || "Enter a valid value.";
        const pattern = input.getAttribute("pattern");

        if (input.hasAttribute("required") && value.length === 0) {
          return requiredMessage;
        }

        if (pattern && value.length > 0) {
          try {
            if (!(new RegExp(pattern).test(value))) {
              return patternMessage;
            }
          } catch {
            return patternMessage;
          }
        }

        return "";
      };

      const syncField = (input) => {
        const wrapper = input.closest("[data-curio-admin-field]");
        const errorNode = wrapper?.querySelector("[data-curio-admin-field-error]");
        const touched = input.dataset.curioTouched === "true" || form.dataset.curioSubmitted === "true";
        const message = readMessage(input);
        const showMessage = touched && message.length > 0;

        if (wrapper) {
          wrapper.setAttribute("data-invalid", showMessage ? "true" : "false");
        }

        input.setAttribute("aria-invalid", showMessage ? "true" : "false");

        if (errorNode) {
          errorNode.textContent = showMessage ? message : "";
        }

        return message.length === 0;
      };

      const touchAndSync = (input) => {
        input.dataset.curioTouched = "true";
        return syncField(input);
      };

      for (const input of fields) {
        input.addEventListener("input", () => touchAndSync(input));
        input.addEventListener("blur", () => touchAndSync(input));
        syncField(input);
      }

      form.addEventListener("submit", (event) => {
        form.dataset.curioSubmitted = "true";
        const firstInvalid = fields.find((input) => !touchAndSync(input));

        if (firstInvalid) {
          event.preventDefault();
          firstInvalid.focus();
          return;
        }

        if (form.dataset.curioSubmitting === "true") {
          event.preventDefault();
          return;
        }

        for (const input of form.querySelectorAll("[data-curio-confirm-checked]")) {
          if (!(input instanceof HTMLInputElement)) {
            continue;
          }

          const message = input.getAttribute("data-curio-confirm-checked");
          const initialChecked =
            input.getAttribute("data-curio-initial-checked") === "true";

          if (!message || !input.checked || initialChecked) {
            continue;
          }

          if (!window.confirm(message)) {
            event.preventDefault();
            return;
          }
        }

        form.dataset.curioSubmitting = "true";
        setNavigationPending();

        for (const submit of form.querySelectorAll("button[type=submit], input[type=submit]")) {
          const label = submit.getAttribute("data-curio-loading-label") ||
            submit.dataset.curioOriginalLabel ||
            "Working…";

          if (submit.tagName === "BUTTON") {
            submit.dataset.curioOriginalLabel = submit.textContent || "";
            submit.textContent = label;
          } else if (submit.tagName === "INPUT") {
            submit.dataset.curioOriginalLabel = submit.value || "";
            submit.value = label;
          }

          submit.setAttribute("data-loading", "true");
          submit.disabled = true;
        }
      });
    }

    for (const form of root.querySelectorAll("[data-curio-conditional-form]")) {
      const sync = () => {
        for (const node of form.querySelectorAll("[data-curio-show-when], [data-curio-show-when-secondary]")) {
          const rules = [
            node.getAttribute("data-curio-show-when") || "",
            node.getAttribute("data-curio-show-when-secondary") || "",
          ].filter(Boolean);

          let visible = true;

          for (const rawRule of rules) {
            const [fieldName, rawValues] = rawRule.split(":");

            if (!fieldName || !rawValues) {
              continue;
            }

            const field = form.querySelector(\`[name="\${fieldName}"]\`);
            const value = field && "value" in field ? field.value : "";
            const values = rawValues.split("|").map((part) => part.trim()).filter(Boolean);

            if (!values.includes(value)) {
              visible = false;
              break;
            }
          }

          node.hidden = !visible;
          node.style.display = visible ? "" : "none";

          for (const field of node.querySelectorAll("input, select, textarea, button")) {
            if ("disabled" in field) {
              field.disabled = !visible;
            }
          }
        }
      };

      form.addEventListener("change", sync);
      form.addEventListener("input", sync);
      sync();
    }
  };

  initializeDynamicContent(document);

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest("a[href]");

    if (!(anchor instanceof HTMLAnchorElement)) {
      return;
    }

    if (anchor.target && anchor.target !== "_self") {
      return;
    }

    if (anchor.hasAttribute("download")) {
      return;
    }

    const href = anchor.getAttribute("href");

    if (!href || href.startsWith("#")) {
      return;
    }

    let destination;

    try {
      destination = new URL(anchor.href, window.location.href);
    } catch {
      return;
    }

    if (destination.origin !== window.location.origin) {
      return;
    }

    if (
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search &&
      destination.hash === window.location.hash
    ) {
      return;
    }

    event.preventDefault();
    setNavigationPending();
    stopLivePolling();
    window.location.assign(destination.href);
  });

  const pollIntervals = [...document.querySelectorAll("[data-curio-admin-live-poll-interval]")]
    .map((node) => Number(node.getAttribute("data-curio-admin-live-poll-interval") || "0"))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (pollIntervals.length > 0) {
    const intervalMs = Math.min(...pollIntervals);
    let livePollTimer = 0;
    let livePollInFlight = false;

    stopLivePolling = () => {
      if (livePollTimer) {
        window.clearTimeout(livePollTimer);
        livePollTimer = 0;
      }
    };

    const shouldPauseLiveRefresh = () => {
      const root = document.querySelector(liveRootSelector);
      const active = document.activeElement;

      if (!root || !(active instanceof HTMLElement) || !root.contains(active)) {
        return false;
      }

      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        active.isContentEditable
      ) {
        return true;
      }

      return false;
    };

    const refreshLiveContent = async () => {
      if (livePollInFlight) {
        return;
      }

      if (shouldPauseLiveRefresh()) {
        scheduleLivePolling();
        return;
      }

      livePollInFlight = true;

      try {
        const response = await window.fetch(window.location.href, {
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            "x-curio-admin-live-refresh": "1",
          },
        });

        if (!response.ok) {
          scheduleLivePolling();
          return;
        }

        const nextHtml = await response.text();
        const nextDocument = new DOMParser().parseFromString(nextHtml, "text/html");
        const currentRoot = document.querySelector(liveRootSelector);
        const nextRoot = nextDocument.querySelector(liveRootSelector);

        if (!currentRoot || !nextRoot) {
          scheduleLivePolling();
          return;
        }

        if (currentRoot.innerHTML === nextRoot.innerHTML) {
          scheduleLivePolling();
          return;
        }

        currentRoot.replaceWith(nextRoot);
        initializeDynamicContent(nextRoot);
      } catch {
        // Ignore transient live refresh failures and try again next interval.
      } finally {
        livePollInFlight = false;
        scheduleLivePolling();
      }
    };

    const scheduleLivePolling = () => {
      if (livePollTimer) {
        return;
      }

      livePollTimer = window.setTimeout(() => {
        livePollTimer = 0;

        if (navigationPending) {
          return;
        }

        if (document.hidden) {
          scheduleLivePolling();
          return;
        }

        if (nav) {
          writeNavScrollTop(nav.scrollTop);
        }

        void refreshLiveContent();
      }, intervalMs);
    };

    scheduleLivePolling();

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        stopLivePolling();
        return;
      }

      scheduleLivePolling();
    });

    window.addEventListener("pageshow", () => {
      clearNavigationPending();
      scheduleLivePolling();
    });

    window.addEventListener("pagehide", () => {
      stopLivePolling();
    });
  }
});
`;
