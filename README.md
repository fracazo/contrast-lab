# Contrast Lab

A Raycast extension for checking color contrast with **both WCAG 2 and APCA**,
accepting **HEX / RGB / HSL / OKLCH**, and suggesting the **nearest passing color**.

## Project status

This repo is built logic-first: a pure, framework-free color library, fully
unit-tested against reference values, **before any UI**.

- **Spec 1 — Verified Core Library (this milestone):** a pure TypeScript color
  library under [`src/lib`](src/lib) that computes WCAG 2 ratios + AA/AAA levels,
  signed APCA Lc + font-size/weight thresholds, and the nearest passing
  foreground color (binary search in OKLCH). No UI. Every result is asserted
  against verified fixtures computed from the pinned dependency versions.
- **Spec 2 — UI (later):** a Raycast Form command for input and a Detail view
  for results, wiring `analyze()` into the extension.

The scaffolded `check-contrast` command is intentionally left untouched in this
milestone, so the extension still loads via `npm run dev`.

## The core library

Everything lives in [`src/lib`](src/lib) and is **pure** — it imports no
`@raycast/api`, React, or Raycast modules, so it is portable and testable with
Node's built-in test runner.

| File | Responsibility |
| --- | --- |
| [`color.ts`](src/lib/color.ts) | parse, OKLCH conversion, sRGB gamut mapping, hex/oklch formatting, luminance |
| [`wcag.ts`](src/lib/wcag.ts) | WCAG 2 contrast ratio + AA/AAA level checks |
| [`apca.ts`](src/lib/apca.ts) | signed APCA Lc + font size/weight threshold lookup |
| [`fix.ts`](src/lib/fix.ts) | nearest passing color (binary search in OKLCH) |
| [`contrast.ts`](src/lib/contrast.ts) | public surface: `analyze(input) -> ContrastResult` |

### Usage

```ts
import { analyze } from "./src/lib/contrast";

const result = analyze({
  foreground: "#ffa500",
  background: "#ffffff",
  fontSizePx: 16, // optional, default 16
  fontWeight: 400, // optional, default 400
});

result.wcag.ratio; // 1.97
result.apca.lc; // 37.69  (signed; negative = light text on dark bg)
result.fixForWcagAA.hex; // "#a66a00" (nearest foreground passing WCAG AA at 4.5)
```

`analyze()` accepts hex (3/4/6/8), `rgb()/rgba()`, `hsl()/hsla()`, and `oklch()`
for both colors. If either color fails to parse it returns `{ valid: false }`
with a helpful `error` and zeroed sub-results.

## Running the tests

The library is verified against reference values from the pinned dependency
versions (`culori@4.0.2`, `apca-w3@0.1.9`, `colorparsley@0.1.8`). Tests run on
Node's built-in test runner via `tsx`:

```sh
npm install
npm test
```

`npm test` runs `node --import tsx --test "src/lib/**/*.test.ts"`. The expected
fixture values are intentionally hard-coded; a mismatch indicates a dependency
version drifted rather than a test that needs editing.

## License

MIT
