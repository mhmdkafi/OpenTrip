# Rimbaloka TripDash — UI specification

Basis: client logo and TripDash PRD. This is a manually authored brand interpretation, not generated search output. The local skill search could not run because a Python executable was unavailable.

## Color and visual language

- Logo/deep forest: `#092E2C`.
- Sidebar and primary actions: `#143E34`.
- Main canvas: `#F7F8F2`; warm cards: `#FFFEFA`.
- Sage surfaces: `#E8EEDF`; active navigation: `#E3EBD8`.
- Earth/gold accent: `#D7B773`; warning surfaces: muted sand.
- Ink: `#173E35`; lines: `#E1E7DC`.
- Original logo is used intact, with a rounded container. Mountain illustrations are decorative SVG, not recreations of the logo or photos of the destinations.

## Layout and interaction

Fixed forest sidebar, light workspace header, maximum-width content canvas. Overview uses a landscape banner, four metrics, upcoming trips, cash chart, participant table, recent activity and three shortcuts. Functional pages prioritize tables, relevant filters, cards, and native dialogs for edits.

Segoe UI / Arial local font stack. Headings 24–34px, main values 24–29px, tables and fields 12–13px. Cards use 12–16px radii and subtle outlines, with restrained shadows on dialogs only. Lucide icons, consistent outlined appearance. No decorative animations; reduced motion is respected.

Mobile switches to a drawer with a scrim. Tables and the A4 sheet scroll within their own containers, never the entire viewport. Dialogs use native focus trapping and Escape. Fields have visible labels, alerts are exposed inside dialogs, payment statuses use text as well as color. Primary mobile actions are at least 44px high.

## Data semantics

19 responses and 21 people remain different counts. All active participants are included in attendance irrespective of payment. Group payments show a single transfer and member list. Financial examples are explicitly simulated. Chart bars derive from state, not arbitrary decorative numbers. Inventory available = total − damaged − currently lent. Production and prototype share components while keeping storage and API access separate.

## Verification

Browser checks cover seven pages at 375px, desktop at 1440px, working forms, local persistence, zero business API calls in prototype, 21-person print view, CSV, and reset. Dark theme is not offered; the dashboard uses a fixed light canvas and dark branded sidebar.
