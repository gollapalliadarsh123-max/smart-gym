import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const legacyRoot = 'c:/Users/adars/OneDrive/Desktop/new version';
const outFile =
  'c:/Users/adars/OneDrive/Desktop/the final version/packages/shared/src/domain/diet/nutrition-catalog.ts';

const ndbSrc = fs
  .readFileSync(path.join(legacyRoot, 'nutrition-db.js'), 'utf8')
  .replaceAll('window.GYM_INDIAN_NUTRITION', 'globalThis.GYM_INDIAN_NUTRITION')
  .replaceAll('window.GYM_FOOD_ALIASES', 'globalThis.GYM_FOOD_ALIASES');

vm.runInThisContext(ndbSrc);

const script = fs.readFileSync(path.join(legacyRoot, 'script.js'), 'utf8');
const start = script.indexOf('const NUTRITION_DB = {');
const aliasStart = script.indexOf('const FOOD_ALIASES = {');
if (start < 0 || aliasStart < 0) throw new Error('NUTRITION_DB not found');

const nutrBlock = script.slice(start, aliasStart);
const aliasSlice = script.slice(aliasStart);
const aliasEnd = aliasSlice.indexOf('\n};');
if (aliasEnd < 0) throw new Error('FOOD_ALIASES end not found');
const aliasBlock = aliasSlice.slice(0, aliasEnd + 3);

const sandbox = { exports: {} };
vm.runInNewContext(
  `${nutrBlock.replace('const NUTRITION_DB', 'exports.NUTRITION_DB')}\n${aliasBlock.replace('const FOOD_ALIASES', 'exports.FOOD_ALIASES')}`,
  sandbox,
);

const base = sandbox.exports.NUTRITION_DB;
const aliases = {
  ...sandbox.exports.FOOD_ALIASES,
  ...globalThis.GYM_FOOD_ALIASES,
};
const indian = globalThis.GYM_INDIAN_NUTRITION;
const merged = { ...base, ...indian };

const header = `/** Offline nutrition catalog ported from legacy app (approx values). */

export interface NutritionMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionEntry {
  per100g?: NutritionMacros;
  perUnit?: NutritionMacros & { grams?: number };
  junk?: boolean;
  neutral?: boolean;
  label?: string;
}

`;

const helpers = `
export function normalizeFoodKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

export function resolveFoodKey(query: string): string | null {
  const key = normalizeFoodKey(query);
  if (!key) return null;
  if (NUTRITION_DB[key]) return key;
  const alias = FOOD_ALIASES[key];
  if (alias && NUTRITION_DB[alias]) return alias;
  return null;
}

export function searchNutritionCatalog(
  query: string,
  limit = 12,
): Array<{ key: string; label: string; entry: NutritionEntry }> {
  const q = normalizeFoodKey(query);
  if (!q) return [];
  const results: Array<{ key: string; label: string; entry: NutritionEntry; score: number }> = [];

  for (const [key, entry] of Object.entries(NUTRITION_DB)) {
    const label = entry.label ?? key.replace(/_/g, ' ');
    let score = 0;
    if (key === q) score = 100;
    else if (key.startsWith(q)) score = 80;
    else if (key.includes(q)) score = 60;
    else if (label.toLowerCase().includes(query.trim().toLowerCase())) score = 40;
    if (score > 0) results.push({ key, label, entry, score });
  }

  for (const [alias, target] of Object.entries(FOOD_ALIASES)) {
    if (!alias.includes(q) && alias !== q) continue;
    const entry = NUTRITION_DB[target];
    if (!entry) continue;
    if (results.some((r) => r.key === target)) continue;
    results.push({
      key: target,
      label: target.replace(/_/g, ' '),
      entry,
      score: alias === q ? 90 : 50,
    });
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ key, label, entry }) => ({ key, label, entry }));
}

export function scaleNutritionEntry(
  entry: NutritionEntry,
  grams: number,
): NutritionMacros & { junk?: boolean; neutral?: boolean } {
  const g = Math.max(0, Number(grams) || 0);
  if (entry.perUnit) {
    const unitGrams = entry.perUnit.grams && entry.perUnit.grams > 0 ? entry.perUnit.grams : g || 1;
    const units = unitGrams > 0 ? g / unitGrams : 1;
    return {
      calories: Math.round(entry.perUnit.calories * units * 10) / 10,
      protein: Math.round(entry.perUnit.protein * units * 10) / 10,
      carbs: Math.round(entry.perUnit.carbs * units * 10) / 10,
      fat: Math.round(entry.perUnit.fat * units * 10) / 10,
      junk: entry.junk,
      neutral: entry.neutral,
    };
  }
  const baseMacros = entry.per100g ?? { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const factor = g / 100;
  return {
    calories: Math.round(baseMacros.calories * factor * 10) / 10,
    protein: Math.round(baseMacros.protein * factor * 10) / 10,
    carbs: Math.round(baseMacros.carbs * factor * 10) / 10,
    fat: Math.round(baseMacros.fat * factor * 10) / 10,
    junk: entry.junk,
    neutral: entry.neutral,
  };
}

export function listPopularFoods(limit = 16): Array<{ key: string; label: string }> {
  const popular = [
    'egg',
    'chicken',
    'rice',
    'dal',
    'roti',
    'oats',
    'banana',
    'milk',
    'paneer',
    'curd',
    'whey_protein',
    'almonds',
    'apple',
    'potato',
    'fish',
    'spinach',
  ];
  return popular
    .filter((k) => NUTRITION_DB[k])
    .slice(0, limit)
    .map((key) => ({ key, label: key.replace(/_/g, ' ') }));
}
`;

const body =
  header +
  `export const NUTRITION_DB: Record<string, NutritionEntry> = ${JSON.stringify(merged, null, 2)} as const;\n\n` +
  `export const FOOD_ALIASES: Record<string, string> = ${JSON.stringify(aliases, null, 2)} as const;\n` +
  helpers;

fs.writeFileSync(outFile, body);
console.log('entries', Object.keys(merged).length, 'aliases', Object.keys(aliases).length);
console.log('wrote', outFile);
