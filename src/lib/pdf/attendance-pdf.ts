import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";

export type AttendanceRow = { name: string; meetingPoint: string };

// Layout mirrors the Rimbaloka attendance sheet: logo + two-line title, then a bordered
// table with NO / NAMA / MEPO / BASECAMP / MAKAN / PULANG. Units are PDF points on A4.
const PAGE = { width: 595.28, height: 841.89 };
const TABLE_LEFT = 37, HEADER_TOP = 105, HEADER_HEIGHT = 22, ROW_HEIGHT = 21, BOTTOM_MARGIN = 40;
const COLUMNS = [
  { title: "NO", width: 33, align: "center" },
  { title: "NAMA", width: 173, align: "left" },
  { title: "MEPO", width: 132, align: "center" },
  { title: "BASECAMP", width: 78, align: "center" },
  { title: "MAKAN", width: 61, align: "center" },
  { title: "PULANG", width: 61, align: "center" },
] as const;
const BLACK = rgb(0, 0, 0), HEADER_FILL = rgb(0.906, 0.906, 0.906), LINE = rgb(0.35, 0.35, 0.35);
const LOGO_BOX = 54;

// Shrinks text to fit its cell instead of overflowing the border.
function fit(text: string, font: PDFFont, size: number, max: number) {
  let value = text;
  while (value.length > 1 && font.widthOfTextAtSize(value, size) > max) value = value.slice(0, -2) + "…";
  return value;
}

function cell(page: PDFPage, text: string, font: PDFFont, size: number, x: number, top: number, width: number, height: number, align: "left" | "center") {
  const value = fit(text, font, size, width - 8);
  const textWidth = font.widthOfTextAtSize(value, size);
  const textX = align === "center" ? x + (width - textWidth) / 2 : x + 5;
  page.drawText(value, { x: textX, y: PAGE.height - top - height / 2 - size * 0.35, size, font, color: BLACK });
}

function row(page: PDFPage, top: number, height: number, values: string[], fonts: PDFFont[], sizes: number[], fill?: typeof HEADER_FILL) {
  let x = TABLE_LEFT;
  COLUMNS.forEach((column, index) => {
    page.drawRectangle({ x, y: PAGE.height - top - height, width: column.width, height, borderColor: LINE, borderWidth: 0.35, ...(fill ? { color: fill } : {}) });
    if (values[index]) cell(page, values[index], fonts[index], sizes[index], x, top, column.width, height, fill ? "center" : column.align);
    x += column.width;
  });
}

function header(page: PDFPage, title: string, logo: PDFImage | null, font: PDFFont) {
  const lines = ["RIMBALOKA TRIP", title.toUpperCase()];
  lines.forEach((line, index) => {
    const size = 14, width = font.widthOfTextAtSize(line, size);
    page.drawText(line, { x: (PAGE.width - width) / 2 + 22, y: PAGE.height - 62 - index * 24, size, font, color: BLACK });
  });
  if (!logo) return;
  // Scale within a square box, keeping the logo's own proportions.
  const { width, height } = logo.scaleToFit(LOGO_BOX, LOGO_BOX);
  page.drawImage(logo, { x: 104 + (LOGO_BOX - width) / 2, y: PAGE.height - 96 + (LOGO_BOX - height) / 2, width, height });
}

export async function renderAttendancePdf(title: string, rows: AttendanceRow[], logoBytes: Uint8Array | null) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Absensi ${title}`);
  const [times, sans] = await Promise.all([pdf.embedFont(StandardFonts.TimesRoman), pdf.embedFont(StandardFonts.Helvetica)]);
  const isPng = logoBytes?.[0] === 0x89 && logoBytes[1] === 0x50;
  const logo = logoBytes ? await (isPng ? pdf.embedPng(logoBytes) : pdf.embedJpg(logoBytes)).catch(() => null) : null;
  const headerFonts = COLUMNS.map(() => times), headerSizes = COLUMNS.map(() => 11);
  const bodyFonts = [times, sans, times, times, times, times], bodySizes = [11, 9.5, 11, 11, 11, 11];

  let page = pdf.addPage([PAGE.width, PAGE.height]);
  header(page, title, logo, times);
  let top = HEADER_TOP;
  row(page, top, HEADER_HEIGHT, COLUMNS.map(column => column.title), headerFonts, headerSizes, HEADER_FILL);
  top += HEADER_HEIGHT;
  rows.forEach((person, index) => {
    // Continue on a new page, repeating the column header row.
    if (top + ROW_HEIGHT > PAGE.height - BOTTOM_MARGIN) {
      page = pdf.addPage([PAGE.width, PAGE.height]);
      top = 40;
      row(page, top, HEADER_HEIGHT, COLUMNS.map(column => column.title), headerFonts, headerSizes, HEADER_FILL);
      top += HEADER_HEIGHT;
    }
    row(page, top, ROW_HEIGHT, [String(index + 1), person.name, person.meetingPoint, "", "", ""], bodyFonts, bodySizes);
    top += ROW_HEIGHT;
  });
  return pdf.save();
}

