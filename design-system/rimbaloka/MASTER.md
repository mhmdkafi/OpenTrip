# Rimbaloka TripDash — workspace UI

Source: client PDF, “Revisi UI Design”, pages 16–18 (September 2026). This supersedes the earlier hero/card-heavy prototype. The palette is a manual interpretation of the original logo. Local Python skill search is unavailable; general accessibility and interaction guidance comes from the skill's static quick reference.

## Identity

- Original Rimbaloka logo, intact, in a circular container. Browser title: TripDash.
- Sidebar: `#103A32`; primary actions: `#133E35`.
- Canvas: `#F6F7F3`; data surfaces: white; ink: `#203A32`; secondary text: `#637069`.
- Sage highlights indicate selection. Upcoming trips use blue, done green, risk amber, and cancellation red. Color always has a text label.
- Segoe UI/Arial. Headings 26–29px, body/table 13–14px, secondary labels 11–12px; mobile fields 16px. No external font request.
- 6–10px corners, thin borders, shadows only for overlays. Icons explain actions. No decorative mountain art, marketing banner, status ornaments, or repeated slogans in the workspace.

## Navigation and content

Exactly four primary entries: Overview, Trip Schedule, Cashflow, Inventory. No top navbar. Brand at the top of the left sidebar; account information at the bottom. Mobile uses a menu trigger and focus-contained drawer with Escape support. Desktop can collapse to icons using a button on the sidebar edge. The administrator identity opens an editable profile.

Overview: five status counts, calendar and agenda. No extra count subtitles or operational footer facts. Details are reached through trip links.

Trip Schedule: link-only import creates trips; there is no separate create button. Period controls, month groups, week groups, clickable trip rows. Participant management and PDF are inside the trip detail. Participant pagination is 10 rows.

Cashflow: period selection, net cash profit with previous-period comparison, actual transaction-derived graph, month/week/trip drilldown. Transaction editing appears only within the trip detail; weekly drilldowns keep their week filter. Empty previous periods do not produce invented percentages.

Inventory: two-column cards with large clickable photos, stock and edit/delete actions; pagination is 8 items. Mobile uses a single column. The editor separates photo, identity, tracking method, and stock fields. A right column lists low consumable stock. Loans, returns and consumable usage have separate actions. Descriptive incident notes can record lost or damaged items with the corresponding stock adjustment.

## Responsive and accessibility

Desktop data tables scroll inside bounded containers on small screens. Inventory reflows into structured rows. Input labels, visible focus, native dialogs, number formatting and text status labels are required. Calendar day cells use their trip status color with a legend. Mobile events retain dots and full accessible date/trip labels. Graphs include expandable numeric tables.

Verification entry point: `node scripts/prd-smoke.mjs` (375/768/1024/1440px and 812×375 landscape). Screenshots: `artifacts/prd-*.png`. Detailed requirement mapping: `docs/prd-ui-alignment.md`.
