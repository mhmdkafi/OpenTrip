import { describe, it } from "node:test";
import assert from "node:assert";
import { splitName, detectAmbiguousCommas, normalizeNameForComparison } from "./split-name";

describe("splitName", () => {
  it("splits on plus sign", () => {
    const result = splitName("Adi Nugroho + Antares + Zanki");
    assert.strictEqual(result.names.length, 3);
    assert.strictEqual(result.names[0].name, "Adi Nugroho");
    assert.strictEqual(result.names[1].name, "Antares");
    assert.strictEqual(result.names[2].name, "Zanki");
    assert.strictEqual(result.hasAmbiguous, false);
  });

  it("splits on comma without degree", () => {
    const result = splitName("Nama A, Nama B");
    assert.strictEqual(result.names.length, 2);
    assert.strictEqual(result.names[0].name, "Nama A");
    assert.strictEqual(result.names[1].name, "Nama B");
  });

  it("splits on newline", () => {
    const result = splitName("Nama A\nNama B\nNama C");
    assert.strictEqual(result.names.length, 3);
    assert.strictEqual(result.names[0].name, "Nama A");
    assert.strictEqual(result.names[1].name, "Nama B");
    assert.strictEqual(result.names[2].name, "Nama C");
  });

  it("trims whitespace", () => {
    const result = splitName("  Adi  +  Antares  ");
    assert.strictEqual(result.names.length, 2);
    assert.strictEqual(result.names[0].name, "Adi");
    assert.strictEqual(result.names[1].name, "Antares");
  });

  it("filters empty tokens and warns", () => {
    const result = splitName("Adi + + Antares");
    assert.strictEqual(result.names.length, 2);
    assert.strictEqual(result.names[0].name, "Adi");
    assert.strictEqual(result.names[1].name, "Antares");
    assert.ok(result.totalWarnings > 0);
  });

  it("handles single name", () => {
    const result = splitName("Adi Nugroho");
    assert.strictEqual(result.names.length, 1);
    assert.strictEqual(result.names[0].name, "Adi Nugroho");
  });

  it("detects ambiguous comma in name", () => {
    const result = splitName("Raka, S.T.");
    assert.strictEqual(result.names.length, 1);
    assert.strictEqual(result.names[0].name, "Raka, S.T.");
    assert.strictEqual(result.names[0].isAmbiguous, false);
  });

  it("marks comma without degree as ambiguous", () => {
    const result = splitName("Raka, Budi");
    assert.strictEqual(result.names.length, 2);
  });

  it("handles double plus with trailing spaces", () => {
    const result = splitName("A + + B + C  ");
    assert.strictEqual(result.names.length, 3);
    assert.strictEqual(result.names[0].name, "A");
    assert.strictEqual(result.names[1].name, "B");
    assert.strictEqual(result.names[2].name, "C");
  });

  it("handles empty string", () => {
    const result = splitName("");
    assert.strictEqual(result.names.length, 0);
    assert.strictEqual(result.hasAmbiguous, false);
  });

  it("handles whitespace only", () => {
    const result = splitName("   ");
    assert.strictEqual(result.names.length, 0);
  });

  it("preserves name with degree M.T.", () => {
    const result = splitName("Ahmad, M.T. + Budi");
    assert.strictEqual(result.names.length, 2);
    assert.strictEqual(result.names[0].name, "Ahmad, M.T.");
    assert.strictEqual(result.names[0].isAmbiguous, false);
  });

  it("preserves name with degree S.Kom.", () => {
    const result = splitName("Siti, S.Kom.");
    assert.strictEqual(result.names.length, 1);
    assert.strictEqual(result.names[0].name, "Siti, S.Kom.");
  });

  it("handles mixed separators", () => {
    const result = splitName("A + B\nC, D");
    assert.strictEqual(result.names.length, 4);
  });
});

describe("detectAmbiguousCommas", () => {
  it("returns false for name with degree", () => {
    assert.strictEqual(detectAmbiguousCommas("Raka, S.T."), false);
  });

  it("returns true for comma without degree", () => {
    assert.strictEqual(detectAmbiguousCommas("Raka, Budi"), true);
  });

  it("returns false when no comma", () => {
    assert.strictEqual(detectAmbiguousCommas("Raka Budi"), false);
  });
});

describe("normalizeNameForComparison", () => {
  it("trims and lowercases", () => {
    assert.strictEqual(normalizeNameForComparison("  Adi Nugroho  "), "adi nugroho");
  });

  it("normalizes multiple spaces", () => {
    assert.strictEqual(normalizeNameForComparison("Adi  Nugroho"), "adi nugroho");
  });
});
