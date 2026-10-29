import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTransferAmount, toRupiah } from "./transfer-amount";

test("reads the Total line of a receipt and ignores the fee and reference numbers", () => {
  const text = "BANK NUSANTARA\nTransfer Berhasil\nRp 175.000\nRp 175.000,00\nPenerima Amirul Andas\nBank Nusantara - 515104xxxx\nNomor Referensi TRX-20261031-081494\nBiaya Transaksi Rp 0\nTotal Rp 175.000";
  assert.equal(parseTransferAmount(text), 175000);
});

test("falls back to the most repeated rupiah amount when there is no label", () => {
  assert.equal(parseTransferAmount("Uang Muka / DP\nRp 100.000\nRp 100.000,00\n31 Oktober 2026"), 100000);
  assert.equal(parseTransferAmount("IDR 190,000.00\nSuccessful"), 190000);
});

test("returns null when no amount is present", () => {
  assert.equal(parseTransferAmount("Transfer Berhasil\nNo. Ref 20261031081494"), null);
});

test("normalises Indonesian and English number formats", () => {
  assert.equal(toRupiah("175.000,00"), 175000);
  assert.equal(toRupiah("1,250,000.00"), 1250000);
  assert.equal(toRupiah("110000"), 110000);
});
