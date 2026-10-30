import { test } from "node:test";
import assert from "node:assert/strict";
import { suggestHeaderMappings } from "./google";

// Headers from the Rimbaloka registration form.
const HEADERS = ["Timestamp", "Nama Lengkap", "Usia", "Fasilitas", "Mepo", "Alamat", "No WhatsApp", "No Darurat", "Apakah memiliki riwayat penyakit? jika iya tuliskan", "Jas Hujan (+15k)", "Registrasi \n175k Full Transport\n110k Non Transport\nuntuk dengan jas hujan +15k\n\n5151040000\nBCA"];

test("every registration form column maps to its own field", () => {
  const mapped = Object.fromEntries(suggestHeaderMappings(HEADERS).map(s => [s.field, s.index]));
  assert.deepEqual(mapped, { registered_at: 0, raw_name: 1, facility: 3, meeting_point: 4, raincoat_option: 9, proof_refs: 10, contact_phone: 6, age: 2, address: 5, emergency_phone: 7, medical_notes: 8 });
});

test("short aliases never match inside unrelated headers", () => {
  const mapped = Object.fromEntries(suggestHeaderMappings(["Package", "Riwayat perjalanan"]).map(s => [s.field, s.index]));
  assert.equal(mapped.age, null);
  assert.equal(mapped.contact_phone, null);
});
