// Fixture tests for the verified contrast core. Expected values were computed
// against culori@4.0.2, apca-w3@0.1.9, colorparsley@0.1.8 and MUST NOT be edited
// to make a test pass — a mismatch means a dependency version drifted.
//
// Tolerances (per spec): WCAG ratio +/-0.02, APCA Lc +/-0.1.

import { test } from "node:test";
import assert from "node:assert/strict";

import { analyze } from "../contrast";
import { minFontSize } from "../apca";

const WCAG_TOL = 0.02;
const LC_TOL = 0.1;

const closeTo = (actual: number, expected: number, tol: number, label: string): void => {
  assert.ok(
    Math.abs(actual - expected) <= tol,
    `${label}: expected ${expected} +/-${tol}, got ${actual}`,
  );
};

// --- WCAG ratio --------------------------------------------------------------

const WCAG_FIXTURES: Array<[string, string, number]> = [
  ["#000000", "#ffffff", 21.0],
  ["#777777", "#ffffff", 4.48],
  ["#ffa500", "#ffffff", 1.97],
  ["#1d4ed8", "#ffffff", 6.7],
  ["oklch(0.6 0.2 25)", "#ffffff", 4.36],
];

for (const [fg, bg, expected] of WCAG_FIXTURES) {
  test(`WCAG ratio ${fg} on ${bg} = ${expected}`, () => {
    const { wcag } = analyze({ foreground: fg, background: bg });
    closeTo(wcag.ratio, expected, WCAG_TOL, `ratio ${fg}/${bg}`);
  });
}

test("WCAG levels: #000 on #fff passes everything; #ffa500 on #fff fails all", () => {
  const black = analyze({ foreground: "#000000", background: "#ffffff" }).wcag;
  assert.deepEqual(
    { aaN: black.aaNormal, aaL: black.aaLarge, aaaN: black.aaaNormal, aaaL: black.aaaLarge },
    { aaN: true, aaL: true, aaaN: true, aaaL: true },
  );

  const orange = analyze({ foreground: "#ffa500", background: "#ffffff" }).wcag;
  assert.deepEqual(
    { aaN: orange.aaNormal, aaL: orange.aaLarge, aaaN: orange.aaaNormal, aaaL: orange.aaaLarge },
    { aaN: false, aaL: false, aaaN: false, aaaL: false },
  );
});

// --- APCA Lc (signed) --------------------------------------------------------

const APCA_FIXTURES: Array<[string, string, number]> = [
  ["#000000", "#ffffff", 106.04],
  ["#ffffff", "#000000", -107.88],
  ["#777777", "#ffffff", 71.11],
  ["#ffa500", "#ffffff", 37.69],
  ["#1d4ed8", "#ffffff", 82.17],
];

for (const [fg, bg, expected] of APCA_FIXTURES) {
  test(`APCA Lc ${fg} on ${bg} = ${expected}`, () => {
    const { apca } = analyze({ foreground: fg, background: bg });
    closeTo(apca.lc, expected, LC_TOL, `Lc ${fg}/${bg}`);
    closeTo(apca.absLc, Math.abs(expected), LC_TOL, `absLc ${fg}/${bg}`);
  });
}

// --- Nearest passing (target WCAG AA = 4.5) ----------------------------------

test("nearest passing: #ffa500 on #fff darkens to ~#a66a00 at ratio ~4.5", () => {
  const { fixForWcagAA } = analyze({ foreground: "#ffa500", background: "#ffffff" });
  assert.equal(fixForWcagAA.hex, "#a66a00");
  assert.ok(fixForWcagAA.achievable);
  closeTo(fixForWcagAA.ratio, 4.5, WCAG_TOL, "fix ratio #ffa500/#fff");
  assert.ok(fixForWcagAA.ratio >= 4.5 - WCAG_TOL, "fix should reach the 4.5 target");
});

test("nearest passing: #1d4ed8 on dark #0a0a0a lightens to ~#376efa at ratio ~4.5", () => {
  const { fixForWcagAA } = analyze({ foreground: "#1d4ed8", background: "#0a0a0a" });
  assert.equal(fixForWcagAA.hex, "#376efa");
  assert.ok(fixForWcagAA.achievable);
  closeTo(fixForWcagAA.ratio, 4.5, WCAG_TOL, "fix ratio #1d4ed8/#0a0a0a");
});

test("nearest passing: #777777 on #fff nudge is sub-hex, assert ratio >= 4.5", () => {
  const { fixForWcagAA } = analyze({ foreground: "#777777", background: "#ffffff" });
  assert.ok(fixForWcagAA.achievable);
  assert.ok(
    fixForWcagAA.ratio >= 4.5 - WCAG_TOL,
    `expected ratio >= 4.5, got ${fixForWcagAA.ratio}`,
  );
  assert.match(fixForWcagAA.oklch, /^oklch\(/);
});

// --- APCA font-size threshold sanity -----------------------------------------

test("APCA font threshold: absLc 75, weight 400 -> minFontPx 18 (pass@18, fail@14)", () => {
  const min = minFontSize(75, 400);
  assert.equal(min, 18);
  assert.equal(18 >= (min ?? Infinity), true);
  assert.equal(14 >= (min ?? Infinity), false);
});

test("APCA font threshold: absLc 75, weight 700 -> minFontPx 14", () => {
  assert.equal(minFontSize(75, 700), 14);
});

test("APCA font threshold: absLc 20 -> sentinel, minFontPx null for every weight", () => {
  for (const w of [100, 200, 300, 400, 500, 600, 700, 800, 900] as const) {
    assert.equal(minFontSize(20, w), null, `weight ${w} should be unusable at Lc 20`);
  }
});

test("APCA passesAtSize wiring: black on white at 16px/400 is usable", () => {
  const { apca } = analyze({ foreground: "#000000", background: "#ffffff" });
  assert.notEqual(apca.minFontPx, null);
  assert.equal(apca.passesAtSize, true);
});

// --- Input handling ----------------------------------------------------------

test("defaults: fontSizePx 16 and fontWeight 400 when omitted", () => {
  const { input } = analyze({ foreground: "#000", background: "#fff" });
  assert.equal(input.fontSizePx, 16);
  assert.equal(input.fontWeight, 400);
});

test("accepts hex/rgb/hsl/oklch foreground forms against white", () => {
  for (const fg of ["#000", "#000000ff", "rgb(0,0,0)", "hsl(0 0% 0%)", "oklch(0 0 0)"]) {
    const result = analyze({ foreground: fg, background: "#ffffff" });
    assert.ok(result.valid, `${fg} should be valid`);
    closeTo(result.wcag.ratio, 21, WCAG_TOL, `ratio ${fg}/#fff`);
  }
});

test("invalid color: valid=false, helpful error, zeroed sub-results", () => {
  const result = analyze({ foreground: "not-a-color", background: "#fff" });
  assert.equal(result.valid, false);
  assert.match(result.error ?? "", /foreground/);
  assert.equal(result.wcag.ratio, 0);
  assert.equal(result.apca.lc, 0);
  assert.equal(result.fixForWcagAA.hex, "");
});
