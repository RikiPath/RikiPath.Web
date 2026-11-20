import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

describe('Unified UI Component System — Core Primitives & Contracts', () => {
  it('exports CustomSelect, Select, and Radio from core.jsx and index.js', () => {
    const coreSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/core.jsx'), 'utf8');
    const indexSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/index.js'), 'utf8');

    assert.ok(coreSrc.includes('export const CustomSelect ='), 'core.jsx must export CustomSelect');
    assert.ok(coreSrc.includes('export const Select ='), 'core.jsx must export Select');
    assert.ok(coreSrc.includes('export function Radio('), 'core.jsx must export Radio');
    assert.ok(indexSrc.includes("export * from './core.jsx';"), 'index.js must re-export core.jsx');
  });

  it('CustomSelect provides accessible combobox and listbox ARIA attributes with keyboard support', () => {
    const coreSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/core.jsx'), 'utf8');

    assert.ok(coreSrc.includes('role="combobox"'), 'CustomSelect trigger must declare role="combobox"');
    assert.ok(coreSrc.includes('aria-haspopup="listbox"'), 'CustomSelect trigger must declare aria-haspopup="listbox"');
    assert.ok(coreSrc.includes('role="listbox"'), 'CustomSelect popover menu must have role="listbox"');
    assert.ok(coreSrc.includes('role="option"'), 'CustomSelect items must have role="option"');
    assert.ok(coreSrc.includes('ArrowDown'), 'CustomSelect must handle ArrowDown');
    assert.ok(coreSrc.includes('ArrowUp'), 'CustomSelect must handle ArrowUp');
    assert.ok(coreSrc.includes('Escape'), 'CustomSelect must handle Escape');
  });

  it('Tabs in overlay.jsx supports smooth sliding active pill indicator with transition-transform and hardware acceleration', () => {
    const overlaySrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/overlay.jsx'), 'utf8');

    assert.ok(overlaySrc.includes("variant === 'pill' && indicator"), 'Tabs must support sliding indicator for pill variant');
    assert.ok(overlaySrc.includes('translate3d'), 'Tabs sliding indicator must use hardware-accelerated translate3d');
    assert.ok(overlaySrc.includes('transition-[transform,width]'), 'Tabs sliding indicator must transition transform and width');
    assert.ok(overlaySrc.includes('motion-reduce:transition-none'), 'Tabs sliding indicator must respect prefers-reduced-motion');
  });

  it('AdminStudyCatalog and AdminCertificateSections use CustomSelect instead of native select', () => {
    const catalogSrc = fs.readFileSync(path.join(ROOT, 'src/pages/admin/AdminStudyCatalog.jsx'), 'utf8');
    const sectionsSrc = fs.readFileSync(path.join(ROOT, 'src/pages/admin/AdminCertificateSections.jsx'), 'utf8');

    assert.ok(catalogSrc.includes('<CustomSelect'), 'AdminStudyCatalog must use <CustomSelect> for certificate filter/modal');
    assert.ok(sectionsSrc.includes('<CustomSelect'), 'AdminCertificateSections must use <CustomSelect> for level modal selection');
  });

  it('StatusDotListbox in ScheduleFilterControls uses the unified CustomSelect component', () => {
    const filterSrc = fs.readFileSync(path.join(ROOT, 'src/features/scheduling/components/ScheduleFilterControls.jsx'), 'utf8');

    assert.ok(filterSrc.includes('<CustomSelect'), 'StatusDotListbox must be backed by the unified CustomSelect component');
    assert.ok(filterSrc.includes('status-filter-listbox-trigger'), 'Must preserve status-filter-listbox-trigger data-testid');
  });

  it('AdminStudyCatalog enforces positive >=1 ordering, normalized duplicates, atomic reorder controls, and shift preview', () => {
    const catalogSrc = fs.readFileSync(path.join(ROOT, 'src/pages/admin/AdminStudyCatalog.jsx'), 'utf8');

    assert.ok(catalogSrc.includes('/study-courses/${targetKind}/${row.id}/reorder'), 'AdminStudyCatalog must call dedicated atomic reorder API');
    assert.ok(catalogSrc.includes('collapseSpaces'), 'AdminStudyCatalog must normalize consecutive whitespace on duplicate checks');
    assert.ok(catalogSrc.includes('parsedOrder < 1'), 'AdminStudyCatalog must enforce positive sortOrder >= 1');
    assert.ok(catalogSrc.includes('shiftPreviewTarget'), 'AdminStudyCatalog must show shift preview when colliding with an existing position');
    assert.ok(catalogSrc.includes('ORDER_REVISION_CONFLICT'), 'AdminStudyCatalog must handle ORDER_REVISION_CONFLICT concurrency errors cleanly');
  });
});
