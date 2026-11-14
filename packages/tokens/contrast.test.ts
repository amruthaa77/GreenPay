/**
 * WCAG 2.2 AA Automated Color Contrast Unit Test
 * Verifies that all foreground/background token pairs meet required contrast ratios:
 * - Normal text >= 4.5:1
 * - UI components / Large text >= 3.0:1
 */

import { colors, brand } from './index';

function hexToRgb(hex: string): [number, number, number] {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(val => {
    const s = val / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function getContrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const lum1 = getLuminance(r1, g1, b1);
  const lum2 = getLuminance(r2, g2, b2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export function testContrastTokens(): { passed: boolean; results: { pair: string; ratio: number; required: number; pass: boolean }[] } {
  const pairs: { name: string; fg: string; bg: string; required: number }[] = [
    // Dark Theme Text
    { name: 'Dark Theme: Primary Text on Background (#041B15)', fg: colors.dark.textPrimary, bg: colors.dark.bg, required: 4.5 },
    { name: 'Dark Theme: Primary Text on Surface (#0D4935)', fg: colors.dark.textPrimary, bg: colors.dark.surface, required: 4.5 },
    { name: 'Dark Theme: Secondary Text on Background', fg: colors.dark.textSecondary, bg: colors.dark.bg, required: 4.5 },
    { name: 'Dark Theme: Secondary Text on Surface', fg: colors.dark.textSecondary, bg: colors.dark.surface, required: 4.5 },
    { name: 'Dark Theme: Signal Lime Accent on Background (#041B15)', fg: colors.dark.accent, bg: colors.dark.bg, required: 3.0 },
    { name: 'Dark Theme: Signal Lime Accent on Surface (#0D4935)', fg: colors.dark.accent, bg: colors.dark.surface, required: 3.0 },
    { name: 'Dark Theme: Dark Text on Signal Lime Button', fg: colors.dark.bg, bg: colors.dark.accent, required: 4.5 },

    // Light Theme Text (Soft White)
    { name: 'Light Theme: Primary Text on Background (#F4F7F0)', fg: colors.light.textPrimary, bg: colors.light.bg, required: 4.5 },
    { name: 'Light Theme: Primary Text on Surface (#FFFFFF)', fg: colors.light.textPrimary, bg: colors.light.surface, required: 4.5 },
    { name: 'Light Theme: Secondary Text on Background', fg: colors.light.textSecondary, bg: colors.light.bg, required: 4.5 },
    { name: 'Light Theme: Secondary Text on Surface', fg: colors.light.textSecondary, bg: colors.light.surface, required: 4.5 },
    { name: 'Light Theme: White Text on Emerald Button', fg: '#FFFFFF', bg: colors.light.accent, required: 4.5 },
  ];

  let allPassed = true;
  const results = pairs.map(p => {
    const ratio = Math.round(getContrastRatio(p.fg, p.bg) * 100) / 100;
    const pass = ratio >= p.required;
    if (!pass) allPassed = false;
    return {
      pair: p.name,
      ratio,
      required: p.required,
      pass
    };
  });

  return { passed: allPassed, results };
}

// CLI runner
if (require.main === module || process.argv[1]?.endsWith('contrast.test.ts')) {
  console.log('Running WCAG 2.2 AA Contrast Verification over GreenPay 2.0 Design Tokens...\n');
  const { passed, results } = testContrastTokens();

  for (const r of results) {
    const icon = r.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${icon} | ${r.pair.padEnd(54)} | Ratio: ${r.ratio}:1 (Required: >=${r.required}:1)`);
  }

  if (!passed) {
    console.error('\n❌ Contrast test failed: Some token combinations do not satisfy WCAG 2.2 AA.');
    process.exit(1);
  } else {
    console.log('\n✅ All token pairs satisfy WCAG 2.2 AA contrast requirements.');
    process.exit(0);
  }
}
