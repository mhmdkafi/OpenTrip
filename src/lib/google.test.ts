import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { parseGoogleSheetsUrl, parseGoogleDriveUrl, suggestHeaderMappings, GoogleApiError } from "@/lib/google";
import { createSourceFingerprint, reconcileSourceRows, findMissingBookings } from "@/lib/sync";

describe("google.ts", () => {
  describe("parseGoogleSheetsUrl", () => {
    it("parse spreadsheet ID dari URL langsung", () => {
      const result = parseGoogleSheetsUrl("1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ");
      assert.strictEqual(result.spreadsheetId, "1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ");
    });

    it("parse URL Google Sheets standar", () => {
      const result = parseGoogleSheetsUrl("https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ/edit#gid=0");
      assert.strictEqual(result.spreadsheetId, "1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ");
      assert.strictEqual(result.sheetId, 0);
    });

    it("parse sheet ID dari parameter query", () => {
      const result = parseGoogleSheetsUrl("https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ/edit?gid=123");
      assert.strictEqual(result.sheetId, 123);
    });

    it("tolak URL tidak valid", () => {
      assert.throws(() => parseGoogleSheetsUrl("bukan url"), (error: unknown) => error instanceof GoogleApiError && error.code === "invalid_sheet_url");
    });

    it("tolak URL tanpa spreadsheet ID", () => {
      assert.throws(() => parseGoogleSheetsUrl("https://docs.google.com/document/d/1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ/edit"), (error: unknown) => error instanceof GoogleApiError && error.code === "missing_spreadsheet_id");
    });
  });

  describe("parseGoogleDriveUrl", () => {
    it("parse file ID dari URL Drive", () => {
      const result = parseGoogleDriveUrl("https://drive.google.com/file/d/1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ/view");
      assert.strictEqual(result.fileId, "1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ");
    });

    it("parse file ID dari query parameter", () => {
      const result = parseGoogleDriveUrl("https://drive.google.com/open?id=1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ");
      assert.strictEqual(result.fileId, "1BxiMVs0XRA5nFMXT6erV6uo6WQZQQQQ");
    });
  });

  describe("suggestHeaderMappings", () => {
    it("suggest header berdasarkan alias", () => {
      const headers = ["Timestamp", "Nama Lengkap", "Fasilitas", "Mepo"];
      const result = suggestHeaderMappings(headers);
      const reg = result.find((item) => item.field === "registered_at");
      const name = result.find((item) => item.field === "raw_name");
      assert.ok(reg && reg.index === 0 && reg.confidence > 0.9);
      assert.ok(name && name.index === 1 && name.confidence > 0.9);
    });

    it("infer header dari bentuk nilai", () => {
      const headers = ["Col1", "Col2", "Col3"];
      const rows = [
        ["2024-01-15", "Budi", "Standar"],
        ["2024-01-16", "Ani", "Premium"],
      ];
      const result = suggestHeaderMappings(headers, rows);
      const reg = result.find((item) => item.field === "registered_at");
      assert.ok(reg && reg.index !== null && reg.reason.includes("bentuk nilai"));
    });

    it("flag field wajib yang tidak ditemukan", () => {
      const headers = ["X", "Y"];
      const result = suggestHeaderMappings(headers);
      const missing = result.filter((item) => item.required && item.index === null);
      assert.ok(missing.length > 0);
    });

    it("sort header oleh kepercayaan", () => {
      const headers = ["Timestamp", "Nama", "Unknown", "Mepo"];
      const result = suggestHeaderMappings(headers);
      const conf = result.map((item) => item.confidence);
      assert.ok(conf[0] >= conf[conf.length - 1]);
    });
  });
});

describe("sync.ts", () => {
  describe("createSourceFingerprint", () => {
    it("generate hash konsisten", () => {
      const values = { name: "Budi", date: "2024-01-15" };
      const fp1 = createSourceFingerprint(values);
      const fp2 = createSourceFingerprint(values);
      assert.strictEqual(fp1, fp2);
    });

    it("berbeda untuk nilai berbeda", () => {
      const fp1 = createSourceFingerprint({ name: "Budi" });
      const fp2 = createSourceFingerprint({ name: "Ani" });
      assert.notStrictEqual(fp1, fp2);
    });

    it("normalize spasi dan kasus", () => {
      const fp1 = createSourceFingerprint({ name: "Budi   Pratama" });
      const fp2 = createSourceFingerprint({ name: "budi pratama" });
      assert.strictEqual(fp1, fp2);
    });
  });

  describe("reconcileSourceRows", () => {
    it("identifikasi baris baru", () => {
      const rows = [{ rowNumber: 1, values: { name: "Budi", date: "2024-01-15" } }];
      const result = reconcileSourceRows(rows, []);
      assert.strictEqual(result[0].action, "new");
    });

    it("identifikasi baris tidak berubah", () => {
      const fp = createSourceFingerprint({ name: "Budi", date: "2024-01-15" });
      const rows = [{ rowNumber: 1, values: { name: "Budi", date: "2024-01-15" } }];
      const existing = [{ bookingId: "b1", rowNumber: 2, fingerprint: fp, snapshot: { name: "Budi", date: "2024-01-15" } }];
      const result = reconcileSourceRows(rows, existing);
      assert.strictEqual(result[0].action, "unchanged");
      assert.strictEqual(result[0].bookingId, "b1");
    });

    it("identifikasi update sederhana", () => {
      const fp1 = createSourceFingerprint({ raw_name: "Budi", registered_at: "2024-01-15", facility: "Standar" });
      const rows = [{ rowNumber: 1, values: { raw_name: "Budi", registered_at: "2024-01-15", facility: "Premium" } }];
      const existing = [{ bookingId: "b1", rowNumber: 1, fingerprint: fp1, snapshot: { raw_name: "Budi", registered_at: "2024-01-15", facility: "Standar" }, locallyEditedFields: [] }];
      const result = reconcileSourceRows(rows, existing);
      assert.strictEqual(result[0].action, "update");
      assert.ok(result[0].changedFields.includes("facility"));
    });

    it("review jika field terproteksi berubah", () => {
      const fp1 = createSourceFingerprint({ raw_name: "Budi", registered_at: "2024-01-15", facility: "Standar" });
      const rows = [{ rowNumber: 1, values: { raw_name: "Budi", registered_at: "2024-01-15", facility: "Premium" } }];
      const existing = [{ bookingId: "b1", rowNumber: 1, fingerprint: fp1, snapshot: { raw_name: "Budi", registered_at: "2024-01-15", facility: "Standar" }, locallyEditedFields: ["facility"], paymentVerified: false }];
      const result = reconcileSourceRows(rows, existing);
      assert.strictEqual(result[0].action, "review");
      assert.ok(result[0].protectedFields.includes("facility"));
    });

    it("cegah duplikat booking saat klaim", () => {
      const fp1 = createSourceFingerprint({ name: "Budi" });
      const rows = [
        { rowNumber: 1, values: { name: "Budi" } },
        { rowNumber: 2, values: { name: "Budi" } },
      ];
      const existing = [{ bookingId: "b1", rowNumber: 1, fingerprint: fp1, snapshot: { name: "Budi" } }];
      const result = reconcileSourceRows(rows, existing);
      assert.strictEqual(result[0].bookingId, "b1");
      assert.strictEqual(result[1].action, "new");
    });
  });

  describe("findMissingBookings", () => {
    it("identifikasi booking hilang dari sumber", () => {
      const rows = [{ rowNumber: 1, values: { name: "Budi", date: "2024-01-15" } }];
      const fp2 = createSourceFingerprint({ name: "Ani", date: "2024-01-16" });
      const existing = [
        { bookingId: "b1", rowNumber: 1, fingerprint: createSourceFingerprint({ name: "Budi", date: "2024-01-15" }), snapshot: { name: "Budi", date: "2024-01-15" } },
        { bookingId: "b2", rowNumber: 2, fingerprint: fp2, snapshot: { name: "Ani", date: "2024-01-16" } },
      ];
      const result = findMissingBookings(rows, existing);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].bookingId, "b2");
    });
  });
});
