/**
 * Fix leftover layout offsets after shell unification.
 * - Remove double sidebar padding (pl-[260px] etc.)
 * - Drop redundant topbar padding inside shells
 * - Soften h-screen overflow traps that clip under PreviewNav
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/pages');

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (ent.name.endsWith('.jsx')) out.push(p);
  }
  return out;
}

function fixFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  if (!src.includes('data-shell-unified="1"') && !src.includes('Shell pathname=')) {
    // still fix common issues on non-shelled pages
  }
  const before = src;

  // Double sidebar offsets left by unify script
  // NOTE: do not use trailing \b after ] — word-boundary fails there
  src = src
    .replace(/\bpl-\[260px\]/g, 'pl-0')
    .replace(/\bpl-\[280px\]/g, 'pl-0')
    .replace(/\bpl-72\b/g, 'pl-0')
    .replace(/\bpl-64\b/g, 'pl-0')
    .replace(/\bml-\[240px\]/g, 'ml-0')
    .replace(/\bml-\[260px\]/g, 'ml-0')
    .replace(/\bml-sidebar-width\b/g, 'ml-0')
    .replace(/\bleft-\[260px\]/g, 'left-0')
    .replace(/\bleft-\[280px\]/g, 'left-0')
    .replace(/\bleft-72\b/g, 'left-0')
    .replace(/\bleft-64\b/g, 'left-0')
    .replace(/\bleft-sidebar-width\b/g, 'left-0')
    .replace(/\bw-\[calc\(100%-240px\)\]/g, 'w-full')
    .replace(/\bw-\[calc\(100%-260px\)\]/g, 'w-full')
    .replace(/\bw-\[calc\(100%-280px\)\]/g, 'w-full');

  // Shell already provides top header clearance on <main> chrome
  src = src
    .replace(/(<main\b[^>]*?)\bpt-topbar-height\b/g, '$1pt-0')
    .replace(/(<main\b[^>]*?)\bpt-16\b/g, '$1pt-0')
    .replace(/(<main\b[^>]*?)\bpt-20\b/g, '$1pt-0');

  // Do NOT strip wrapper tags (would unbalance JSX) — pl-0 is enough

  // Collapse empty sidebar comment leftovers + flex wrappers that force h-screen clip
  src = src.replace(
    /\bh-screen flex overflow-hidden\b/g,
    'min-h-screen flex overflow-x-hidden',
  );
  src = src.replace(
    /\bh-full flex overflow-hidden\b/g,
    'min-h-screen flex overflow-x-hidden',
  );
  src = src.replace(/\bh-screen overflow-hidden\b/g, 'min-h-screen overflow-x-hidden');

  // Duplicate min-h-screen
  src = src.replace(/\bmin-h-screen min-h-screen\b/g, 'min-h-screen');

  // Fix literal newline junk inside text nodes from Stitch conversion
  src = src.replace(/\{"\\n\s+/g, '{"');
  src = src.replace(/\s+\\n\s*"\}/g, '"}');

  if (src !== before) {
    fs.writeFileSync(file, src);
    return true;
  }
  return false;
}

let n = 0;
for (const f of walk(ROOT)) {
  if (fixFile(f)) {
    n += 1;
    console.log('fixed', path.relative(ROOT, f));
  }
}
console.log(`done — ${n} files`);
