// Nearest passing foreground color for a target WCAG ratio.
//
// Strategy: hold the foreground's chroma and hue, move its OKLCH lightness toward
// the extreme that increases contrast (darken on a light bg, lighten on a dark bg),
// and binary-search for the lightness closest to the original that still meets the
// target. Every candidate is gamut-mapped back into sRGB before it is measured or
// emitted, so the suggestion is always a real, displayable color.

import { luminance, toOklch, gamutMapOklch, toHex, formatOklch } from "./color";
import { rawRatio } from "./wcag";
import type { FixResult } from "./contrast";

const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Backgrounds lighter than this (WCAG luminance) call for darkening the text. */
const LIGHT_BG_LUMINANCE = 0.18;

/** Default WCAG AA target for normal text. */
export const DEFAULT_TARGET = 4.5;

export function nearestPassing(fg: string, bg: string, target = DEFAULT_TARGET): FixResult {
  const origin = toOklch(fg);
  const goDarker = luminance(bg) > LIGHT_BG_LUMINANCE;

  // Search window: from the original lightness toward the contrast-increasing extreme.
  let lo = goDarker ? 0 : origin.l;
  let hi = goDarker ? origin.l : 1;

  const measure = (l: number) => {
    const candidate = gamutMapOklch(l, origin.c, origin.h ?? 0);
    return { candidate, ratio: rawRatio(candidate, bg) };
  };

  // If even the most extreme lightness can't reach the target, return that best effort.
  const extreme = measure(goDarker ? 0 : 1);
  if (extreme.ratio < target) {
    return {
      hex: toHex(extreme.candidate),
      oklch: formatOklch(extreme.candidate),
      ratio: round2(extreme.ratio),
      achievable: false,
    };
  }

  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const { ratio } = measure(mid);
    if (goDarker) {
      if (ratio >= target) lo = mid;
      else hi = mid;
    } else {
      if (ratio >= target) hi = mid;
      else lo = mid;
    }
  }

  const best = measure(goDarker ? lo : hi);
  return {
    hex: toHex(best.candidate),
    oklch: formatOklch(best.candidate),
    ratio: round2(best.ratio),
    achievable: true,
  };
}
