# TripDash

Internal operations dashboard for **Rimbaloka Trip**, an open-trip hiking organiser in Bandung. A small team of admins runs every trip from here instead of juggling Google Forms, spreadsheets, and bank screenshots.

## Who uses it
- **Owner**: manages admins, sees everything.
- **Admins**: two or three people who prepare and run trips. They use it on a laptop at home and on a phone between errands or at the meeting point, so both sizes matter equally.

## Jobs it does
1. **Plan the schedule**: trips by month, volume per mountain, status (upcoming, at risk, done, cancelled).
2. **Import registrations**: pull Google Form responses from a public sheet; prices, bank account, and volume are read from the sheet header.
3. **Verify payments**: open each transfer proof, compare the amount read by OCR with the bill (package + optional raincoat), approve, reject, or record a deposit.
4. **Prepare the trip**: attendance PDF for the guide, meeting points, participant details (contact, emergency number, medical notes), and WhatsApp reminders the day before departure for anyone with a balance or an overpayment.
5. **Track money**: income attributed to the departure date, expenses, monthly/yearly comparison.
6. **Manage gear**: returnable and consumable inventory, loans per trip, low-stock reminders.

## Principles
- Fewer clicks for the daily loop: import, review proofs, download attendance.
- Numbers must be trustworthy; anything estimated (OCR amounts) is labelled until an admin confirms it.
- No decorative descriptions; headings and data speak for themselves.
- UI copy in English; the team discusses in Indonesian.
