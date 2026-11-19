// Regression guards for the unified interactive design system (styles/design-system.css + ui/core).
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function listJsx(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listJsx(full));
    else if (entry.name.endsWith('.jsx')) out.push(full);
  }
  return out;
}

const ds = readSrc('src/styles/design-system.css');
const tokens = readSrc('src/styles/tokens.css');
const core = readSrc('src/components/ui/core.jsx');
const allJsx = listJsx(path.join(ROOT, 'src'));

describe('design system: tokens', () => {
  it('is imported once, right after tokens.css', () => {
    const index = readSrc('src/index.css');
    assert.match(index, /@import "\.\/styles\/tokens\.css";\s*@import "\.\/styles\/design-system\.css";/);
  });

  it('defines motion tokens in the agreed ranges and zeroes them for reduced motion', () => {
    const ms = (name) => Number(ds.match(new RegExp(`--rp-dur-${name}:\\s*(\\d+)ms`))[1]);
    assert.ok(ms('fast') >= 120 && ms('fast') <= 160, 'fast feedback 120–160ms');
    assert.ok(ms('standard') >= 180 && ms('standard') <= 240, 'standard 180–240ms');
    assert.ok(ms('overlay') >= 220 && ms('overlay') <= 300, 'overlay 220–300ms');
    assert.match(ds, /prefers-reduced-motion: reduce\)\s*\{\s*:root\s*\{[\s\S]*--rp-dur-standard:\s*0ms/);
  });

  it('defines control size, radius and focus ring tokens', () => {
    for (const token of ['--rp-control-h-md', '--rp-check-size', '--rp-radius-check', '--rp-focus-ring', '--rp-accent', '--rp-link', '--rp-link-danger']) {
      assert.match(ds, new RegExp(`${token}:`), token);
    }
  });
});

describe('design system: checkbox & radio', () => {
  it('styles every native checkbox/radio in the base layer, keeping native semantics', () => {
    assert.match(ds, /@layer base\s*\{[\s\S]*:is\(input\[type="checkbox"\]\)[\s\S]*appearance: none/);
    assert.match(ds, /:is\(input\[type="checkbox"\], input\[type="radio"\]\):checked/);
    assert.match(ds, /:is\(input\[type="checkbox"\], input\[type="radio"\]\):focus-visible[\s\S]*var\(--rp-focus-ring\)/);
    assert.match(ds, /:is\(input\[type="checkbox"\], input\[type="radio"\]\):disabled/);
    assert.match(ds, /:is\(input\[type="checkbox"\]\):indeterminate/);
  });

  it('keeps the shared Checkbox on a real <input type="checkbox"> with the animated tick', () => {
    assert.match(core, /<input id=\{id\} type="checkbox" className="rp-check peer/);
    assert.match(core, /className="rp-check-tick"/);
    assert.match(tokens, /\.rp-check:checked \+ \.rp-check-box \.rp-check-tick \{[^}]*animation: rp-check-draw/);
  });

  it('no page re-introduces the browser default checkbox tint', () => {
    for (const file of allJsx) {
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /accent-\[#/, `${path.relative(ROOT, file)} uses accent-[#…]; rely on the shared checkbox`);
    }
  });
});

describe('design system: links', () => {
  it('has no abrupt hover:underline links left; links use rp-link / rp-underline', () => {
    for (const file of allJsx) {
      assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /hover:underline/, `${path.relative(ROOT, file)} still uses hover:underline`);
    }
  });

  it('animates the underline with background-size (no text shift) and supports danger / external / disabled', () => {
    assert.match(tokens, /\.rp-link \{[\s\S]*background-size: 0% 1\.5px/);
    assert.match(ds, /\.rp-underline \{[\s\S]*background-size: 0% 1\.5px/);
    assert.match(ds, /\.rp-link-danger \{/);
    assert.match(ds, /\.rp-link-external::after/);
    assert.match(ds, /\[aria-disabled="true"\] \{\s*pointer-events: none;/);
  });
});

describe('design system: buttons & fields', () => {
  it('Button primary scales gently on hover and never rotates', () => {
    assert.match(core, /enabled:hover:scale-\[1\.02\]/);
    assert.doesNotMatch(core.match(/const BUTTON_VARIANTS = \{[\s\S]*?\};/)[0], /rotate/);
  });

  it('shared press feedback lifts and presses, without rotation', () => {
    const press = ds.slice(ds.indexOf('.rp-press {'));
    assert.match(press, /transform: var\(--rp-hover-lift\)/);
    assert.match(press, /transform: var\(--rp-press-scale\)/);
    assert.doesNotMatch(press, /rotate/);
  });

  it('every bordered text field shares one focus treatment, with a danger ring when invalid', () => {
    assert.match(ds, /\[class\*="border"\]:not\(\[class\*="border-0"\][^)]*\):focus \{\s*outline: none;\s*border-color: var\(--rp-accent\);\s*box-shadow: var\(--rp-focus-ring\);/);
    assert.match(ds, /\[aria-invalid="true"\]\[class\*="border"\]:not\(\[class\*="border-0"\]\):focus \{ box-shadow: var\(--rp-focus-ring-danger\)/);
    assert.match(ds, /:-webkit-autofill/);
  });

  it('Input supports a leading icon and keeps native props (autocomplete etc.) via rest spread', () => {
    assert.match(core, /export const Input = forwardRef\(function Input\(\{ invalid, className, icon: LeadIcon, \.\.\.rest \}/);
    assert.match(core, /\{\.\.\.rest\}/);
  });

  it('keyboard focus is visible on every interactive element', () => {
    assert.match(ds, /:where\(a, button, \[role="button"\][^)]*\):focus-visible \{\s*outline: 2px solid var\(--rp-accent\)/);
  });
});
