#!/usr/bin/env node
/**
 * Regenerates Supabase TypeScript types from the linked remote project.
 * Requires: npx supabase login && npm run db:link
 */
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ID = 'rbtfjshktqabnswvxrmi';
const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, '../packages/supabase/src/types/database.generated.ts');

const types = execSync(`npx supabase gen types typescript --project-id ${PROJECT_ID}`, {
  encoding: 'utf8',
  stdio: ['pipe', 'pipe', 'inherit'],
});

const banner = `/**
 * AUTO-GENERATED — do not edit manually.
 * Run: npm run db:types
 * Project: ${PROJECT_ID}
 */\n\n`;

writeFileSync(outPath, banner + types);
console.log(`Wrote ${outPath}`);
