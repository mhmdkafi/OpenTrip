# TripDash design system

Mode: **Operate**. Precision and calm over expression; the brand lives in the forest green and in careful details.

## Tokens
All values live in [src/styles/tokens.css](src/styles/tokens.css). Components use roles, not raw hex.

| Role | Token | Use |
|---|---|---|
| Page background | `--canvas` | App background behind cards |
| Surface | `--surface` | Cards, modals, tables |
| Muted surface | `--surface-muted` | Zebra rows, inset panels |
| Border / divider | `--border`, `--divider` | 1px card borders, row dividers |
| Text | `--text`, `--text-secondary`, `--text-muted`, `--text-subtle` | Headings/body, labels, meta, placeholders |
| Primary | `--primary` (`--forest-700` #14532d) | Main actions, active nav, table headers |
| Accent | `--sand-*` | Sparing highlights taken from the logo |
| Status | `--success-*`, `--warning-*`, `--danger-*`, `--orange-*`, `--info-*` | Paid / deposit / unpaid / cancelled / info |

Scales: `--forest-50…950`, `--gray-25…900`, `--sand-50…700`.

## Shape and depth
- Radius: `--radius-sm` 8 (inputs inside cards), `--radius-md` 12 (inputs, small panels), `--radius-lg` 16 (cards, modals), `--radius-pill` (buttons, badges, tabs).
- Cards are flat: white surface, 1px `--border`, no shadow. Shadows only for floating layers (menus, popovers, modals): `--shadow-md`, `--shadow-lg`.
- No gradients on UI chrome.

## Type
Poppins. Page title 28/650, section title 18–20/600, body 14/400, meta 12–13/400. Tabular numbers for money.

## Components
- **Buttons**: pill. Primary solid forest; secondary white with border; destructive solid danger only for the final confirm.
- **Tables**: forest header row, zebra body, one action per row.
- **Status pills**: solid status colour with white text.
- **Dropdowns**: the shared `Dropdown` component, never a native select in new UI.
- **Pagination**: shared `Pagination` with summary and numbered pages.
- **Loading**: skeleton shimmer in place of the final content, sized to it; respects reduced motion.

## Motion
150–220ms ease-out (`--ease-out`) for hover, open, and fade. Nothing animates on page load.
