import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { getPaginationRange, getSmartPaginationModel } from '../src/components/ui/paginationLogic.js';

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
    const examSrc = fs.readFileSync(path.join(ROOT, 'src/features/mock-test/components/ExamWorkspace.jsx'), 'utf8');
    const nbSrc = fs.readFileSync(path.join(ROOT, 'src/features/notebook/components/SmartNotebookWorkspace.jsx'), 'utf8');

    assert.ok(overlaySrc.includes("variant === 'pill' && indicator"), 'Tabs must support sliding indicator for pill variant');
    assert.ok(overlaySrc.includes("tone === 'segmented'"), 'Tabs must support segmented surface tone');
    assert.ok(overlaySrc.includes('translate3d'), 'Tabs sliding indicator must use hardware-accelerated translate3d');
    assert.ok(overlaySrc.includes('transition-[transform,width]'), 'Tabs sliding indicator must transition transform and width');
    assert.ok(overlaySrc.includes('motion-reduce:transition-none'), 'Tabs sliding indicator must respect prefers-reduced-motion');
    assert.match(examSrc, /<Tabs[\s\S]*variant="pill"[\s\S]*tone="segmented"/, 'ExamWorkspace mode switch must use sliding segmented Tabs');
    assert.match(nbSrc, /<Tabs[\s\S]*variant="pill"[\s\S]*tone="segmented"/, 'SmartNotebookWorkspace mode switch must use sliding segmented Tabs');
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

  it('CustomSelect, SearchInput, and TimeInput support fitContent intrinsic sizing for compact filter toolbars', () => {
    const coreSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/core.jsx'), 'utf8');
    const discoverySrc = fs.readFileSync(
      path.join(ROOT, 'src/features/cohorts/components/LearnerCohortDiscoveryPanel.jsx'),
      'utf8',
    );

    assert.ok(coreSrc.includes('fitContent = false'), 'core.jsx filter controls must support fitContent prop');
    assert.ok(coreSrc.includes('inline-grid'), 'fitContent sizing must use CSS inline-grid intrinsic sizing');
    assert.match(discoverySrc, /<SearchInput[\s\S]*fitContent/, 'Cohort discovery search input must use compact fitContent');
    assert.match(discoverySrc, /<CustomSelect[\s\S]*fitContent/, 'Cohort discovery dropdown filters must use fitContent');
    assert.match(discoverySrc, /<TimeInput[\s\S]*fitContent/, 'Cohort discovery time filters must use fitContent');
  });

  it('AdminStudyCatalog enforces positive >=1 ordering, normalized duplicates, atomic reorder controls, and shift preview', () => {
    const catalogSrc = fs.readFileSync(path.join(ROOT, 'src/pages/admin/AdminStudyCatalog.jsx'), 'utf8');

    assert.ok(catalogSrc.includes('/study-courses/${targetKind}/${row.id}/reorder'), 'AdminStudyCatalog must call dedicated atomic reorder API');
    assert.ok(catalogSrc.includes('collapseSpaces'), 'AdminStudyCatalog must normalize consecutive whitespace on duplicate checks');
    assert.ok(catalogSrc.includes('parsedOrder < 1'), 'AdminStudyCatalog must enforce positive sortOrder >= 1');
    assert.ok(catalogSrc.includes('shiftPreviewTarget'), 'AdminStudyCatalog must show shift preview when colliding with an existing position');
    assert.ok(catalogSrc.includes('ORDER_REVISION_CONFLICT'), 'AdminStudyCatalog must handle ORDER_REVISION_CONFLICT concurrency errors cleanly');
  });

  it('Switch, WeekdayPicker, and custom 24h Portal TimeInput adhere to system-wide UI standardization contracts', () => {
    const coreSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/core.jsx'), 'utf8');
    const overlaySrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/overlay.jsx'), 'utf8');
    const prefsSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsPreferencesModal.jsx'), 'utf8');
    const slotCalSrc = fs.readFileSync(path.join(ROOT, 'src/features/scheduling/components/InteractiveSlotCalendar.jsx'), 'utf8');

    // 1. Switch centered OY layout without top nudge
    assert.match(coreSrc, /export function Switch\([\s\S]*items-center gap-3\.5 py-1[\s\S]*min-w-0 flex-1 space-y-0\.5/);
    assert.ok(!/export function Switch\([\s\S]{0,600}mt-0\.5/.test(coreSrc), 'Switch track must not have top margin offset');

    // 2. WeekdayPicker exported cleanly with empty default, clear check indicator, and free deselect
    assert.ok(coreSrc.includes('export function WeekdayPicker('), 'core.jsx must export WeekdayPicker');
    assert.ok(coreSrc.includes('aria-pressed={selected}'), 'WeekdayPicker chips must expose aria-pressed');
    assert.ok(coreSrc.includes('data-selected={selected ?'), 'WeekdayPicker chips must expose data-selected');
    assert.ok(prefsSrc.includes('<WeekdayPicker'), 'SrsPreferencesModal must use shared WeekdayPicker');
    assert.ok(!prefsSrc.includes('[1, 2, 3, 4, 5, 6, 0]'), 'SrsPreferencesModal must NOT pre-select all weekdays by default');

    // 3. TimeInput custom 24h Portal dropdown + nested Popover/Modal compatibility
    assert.match(coreSrc, /export const TimeInput =[\s\S]*normalizeClock24[\s\S]*CLOCK_HOURS[\s\S]*data-rp-floating-portal="true"/);
    assert.ok(overlaySrc.includes('[data-rp-floating-portal="true"]'), 'Popover must ignore pointerdown inside nested floating portals');
    assert.ok(!slotCalSrc.includes('type="time"'), 'InteractiveSlotCalendar adjust modal must use shared TimeInput instead of raw input[type=time]');
  });

  it('DailySRS and AppNav simplify review modes with distinct icons, no duplicate mode card, and clean queue copy', () => {
    const appNavSrc = fs.readFileSync(path.join(ROOT, 'src/layouts/appNav.js'), 'utf8');
    const dailySrsSrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/DailySRS.jsx'), 'utf8');
    const libSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsCardLibraryTab.jsx'), 'utf8');
    const progSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsProgressAnalyticsTab.jsx'), 'utf8');

    for (const iconName of ['Layers3', 'Keyboard', 'ListChecks', 'Shuffle']) {
      assert.ok(appNavSrc.includes(iconName), `appNav.js must import/use ${iconName}`);
      assert.ok(dailySrsSrc.includes(iconName), `DailySRS.jsx must use ${iconName}`);
    }
    assert.ok(!appNavSrc.includes("description: 'Chưa nhớ / Đã nhớ'"), 'Sidebar must not show redundant subtitle under Lật thẻ');
    assert.ok(!appNavSrc.includes('dividerAfter: true'), 'SRS sidebar must not include decorative dividerAfter');
    assert.ok(!dailySrsSrc.includes('(2 mức đánh giá)'), 'DailySRS must remove "(2 mức đánh giá)" banner jargon');
    assert.ok(!dailySrsSrc.includes('Chế độ Lật thẻ'), 'DailySRS must remove duplicate "Chế độ Lật thẻ" banner/card title');
    assert.ok(!dailySrsSrc.includes('Thẻ bấm “Chưa nhớ”'), 'DailySRS must remove technical queue repetition explanation');
    assert.ok(dailySrsSrc.includes("tr('Thẻ cần ôn')"), 'DailySRS queue section must be titled "Thẻ cần ôn"');
    assert.ok(!libSrc.includes("tr('Độ dễ')"), 'SrsCardLibraryTab must not expose internal Ease Factor metric');
    assert.ok(!progSrc.includes("tr('Độ dễ')"), 'SrsProgressAnalyticsTab must not expose internal Ease Factor metric');
  });

  it('SRS cards, forms, filters, templates, and approvals omit JLPT level classification across Web', () => {
    const paths = [
      'src/pages/learner/DailySRS.jsx',
      'src/features/srs/components/SrsReviewPlayer.jsx',
      'src/features/srs/components/SrsCardLibraryTab.jsx',
      'src/features/srs/components/SrsTemplateCatalogTab.jsx',
      'src/features/srs/components/LessonSrsSuggestionsModal.jsx',
      'src/features/notebook/components/SelectionSrsModal.jsx',
      'src/pages/content-author/SrsTemplatesPage.jsx',
      'src/features/admin/components/AdminSrsTemplatesPanel.jsx',
    ];
    for (const rel of paths) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      assert.ok(!code.includes('SUPPORTED_JLPT_LEVELS'), `${rel} must not use SUPPORTED_JLPT_LEVELS for SRS`);
      assert.ok(!code.includes('jlptLevel'), `${rel} must not display or require jlptLevel on SRS UI`);
    }
  });

  it('SrsCardLibraryTab presents a clean flashcard library without admin/algorithm controls', () => {
    const libSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsCardLibraryTab.jsx'), 'utf8');
    const dailySrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/DailySRS.jsx'), 'utf8');
    const tplSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsTemplateCatalogTab.jsx'), 'utf8');

    const appNavSrc = fs.readFileSync(path.join(ROOT, 'src/layouts/appNav.js'), 'utf8');
    assert.ok(!appNavSrc.includes('Lịch ôn & tiến độ'), 'Sidebar must remove separate Lịch ôn & tiến độ item after merging into Tổng quan');
    assert.ok(dailySrc.includes("tr('Thẻ của tôi')"), 'DailySRS must title personal cards section cleanly as "Thẻ của tôi"');
    assert.ok(
      dailySrc.includes("tr('Quản lý những thẻ bạn đã lưu và tự tạo.')"),
      'DailySRS must show updated description for Thẻ của tôi',
    );
    assert.ok(dailySrc.includes("tr('Thư viện thẻ mẫu')"), 'DailySRS must title template catalog section cleanly as "Thư viện thẻ mẫu"');
    assert.ok(
      dailySrc.includes("tr('Khám phá và thêm thẻ có sẵn vào bộ thẻ của bạn.')"),
      'DailySRS must show updated description for Thư viện thẻ mẫu',
    );
    assert.ok(
      dailySrc.includes('<SrsProgressAnalyticsTab') && dailySrc.includes('embedded'),
      'DailySRS must merge SrsProgressAnalyticsTab into Tổng quan without duplicating top KPIs',
    );
    assert.ok(libSrc.includes("tr('Tạo thẻ')"), 'SrsCardLibraryTab must label create button as "Tạo thẻ"');
    assert.ok(
      libSrc.includes('currentPage={Math.min(page, totalPages)}') && libSrc.includes('LIBRARY_PAGE_SIZE = 20'),
      'SrsCardLibraryTab must pass clamped currentPage to Pagination and use 20-card pages matching 1/2/4/5-col grids',
    );
    assert.ok(tplSrc.includes("tr('Thêm thẻ')") && tplSrc.includes("tr('Đã thêm')"), 'SrsTemplateCatalogTab must use "Thêm thẻ" and "Đã thêm" labels');
    assert.ok(libSrc.includes("tr('Tìm thẻ...')"), 'Card library must render single concise search input');
    assert.ok(libSrc.includes("tr('Xóa thẻ')"), 'Card library 3-dot menu must expose "Xóa thẻ" action');
    assert.ok(libSrc.includes('MoreVertical'), 'Card library must render compact 3-dot Popover action trigger');
    assert.ok(libSrc.includes("tr('Chưa có thẻ nào')"), 'Empty card library must show concise empty state');
    assert.ok(!libSrc.includes('Tạm ngừng'), 'Card library must not expose Suspend control');
    assert.ok(!libSrc.includes('Chu kỳ'), 'Card library must not display interval metadata');
    assert.ok(!libSrc.includes('Ôn tiếp'), 'Card library must not display next review metadata');
    assert.ok(!libSrc.includes('Độ dễ'), 'Card library must not display ease factor metadata');
    assert.ok(!libSrc.includes('setStatusFilter'), 'Card library must not render Status filter');
    assert.ok(!libSrc.includes('setStateFilter'), 'Card library must not render LearningState progress filter');
    assert.ok(!tplSrc.includes('tác giả'), 'Learner template catalog must not leak Content Author origin labels');
    assert.ok(
      !tplSrc.includes('ChevronDown') && !tplSrc.includes('ChevronUp') && !tplSrc.includes('ExampleToggleButton'),
      'SrsTemplateCatalogTab must display full example sentences directly without collapse/expand chevron buttons',
    );

    // 5-field Quizlet-style CreateSrsCardModal contract
    for (const label of ["tr('Mặt trước')", "tr('Cách đọc')", "tr('Nghĩa')", "tr('Câu ví dụ')", "tr('Dịch câu ví dụ')"]) {
      assert.ok(libSrc.includes(label), `CreateSrsCardModal must include ${label}`);
    }
    assert.ok(!libSrc.includes('Ghi chú cá nhân'), 'CreateSrsCardModal must not include personal note field');
    assert.ok(!libSrc.includes('Các nghĩa đồng nghĩa'), 'CreateSrsCardModal must not include synonyms field');

    // 4 dedicated 3D clay icons on SRS mode banner & no decorative 2D icon in Thẻ cần ôn
    const claySrc = fs.readFileSync(path.join(ROOT, 'src/features/learner-ui/WebClayIcon.jsx'), 'utf8');
    const illSrc = fs.readFileSync(path.join(ROOT, 'src/features/landing/components/StudyIllustrations.jsx'), 'utf8');
    for (const key of ['srs_flip', 'srs_typing', 'srs_mcq', 'srs_mixed']) {
      assert.ok(claySrc.includes(`'${key}'`), `WebClayIcon must register 3D key ${key}`);
      assert.ok(illSrc.includes(`${key}:`), `StudyIllustrations must draw 3D illustration ${key}`);
      assert.ok(dailySrc.includes(`'${key}'`), `DailySRS must assign 3D clayIcon ${key} to review mode`);
    }
    assert.ok(!dailySrc.includes('QueueIcon'), 'DueQueueSection (Thẻ cần ôn) must not render a decorative 2D QueueIcon');
  });

  it('Button inner span aligns text and inline icons horizontally and Learner UI omits technical SMTP/token jargon', () => {
    const coreSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/core.jsx'), 'utf8');
    const prefsSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsPreferencesModal.jsx'), 'utf8');
    const secSrc = fs.readFileSync(path.join(ROOT, 'src/features/profile/components/AccountSecuritySection.jsx'), 'utf8');
    const selModalSrc = fs.readFileSync(path.join(ROOT, 'src/features/notebook/components/SelectionSrsModal.jsx'), 'utf8');

    assert.ok(
      coreSrc.includes("cx('inline-flex items-center gap-1.5', wrap ? 'leading-snug' : 'truncate'"),
      'Button children wrapper must use inline-flex items-center so inline icons never wrap onto a second line',
    );
    assert.ok(!prefsSrc.includes('SMTP'), 'SrsPreferencesModal must not expose technical SMTP jargon to learners');
    assert.ok(!secSrc.includes('token cũ'), 'AccountSecuritySection must use user-friendly session sign-out copy instead of token jargon');
    assert.ok(!selModalSrc.includes('Tạm ngừng'), 'SelectionSrsModal must keep existing-card actions concise without Suspend button');
    assert.ok(
      selModalSrc.includes("exampleSentence: ''") && selModalSrc.includes('placeholder="毎日日本語を勉強しています。"'),
      'SelectionSrsModal must keep exampleSentence empty by default and show a placeholder when adding a card to SRS',
    );
    assert.ok(
      selModalSrc.includes('<span className="text-rp-danger" aria-hidden="true">*</span>'),
      'SelectionSrsModal required asterisks must use red text-rp-danger',
    );
    assert.ok(
      coreSrc.includes('showRequiredStar && <span className="ml-0.5 text-rp-danger" aria-hidden="true">*</span>'),
      'Shared Field primitive must render required asterisks in red text-rp-danger',
    );

    // Ensure no JSX form label or span anywhere in src renders an unstyled/black required asterisk (*).
    const jsxFiles = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith('.jsx')) jsxFiles.push(full);
      }
    };
    walk(path.join(ROOT, 'src'));
    for (const filePath of jsxFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      assert.equal(
        /(\}\s*\*<\/(?:label|span)>|['"][^'"]*\s+\*['"])/.test(content),
        false,
        `${path.relative(ROOT, filePath)} must render required * in red (<span className="text-rp-danger">*</span>), never unstyled text`,
      );
    }
  });

  it('DailySRS and SrsReviewPlayer support inline review, all 4 modes, safe MCQ/Typing/Mixed contracts, and step idempotency', () => {
    const dailySrc = fs.readFileSync(path.join(ROOT, 'src/pages/learner/DailySRS.jsx'), 'utf8');
    const playerSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsReviewPlayer.jsx'), 'utf8');

    // SRS V5: Scheduled review (system-picked due cards, start modal) vs Free practice (direct player, no schedule change)
    assert.ok(dailySrc.includes("sessionKind: 'Scheduled'") && dailySrc.includes('StartReviewSessionModal'),
      'Due review must start Scheduled sessions from the mode modal');
    assert.ok(dailySrc.includes("sessionKind: 'Practice'") && dailySrc.includes("selectionScope: 'all'"),
      'Free practice must open straight into an automatic practice round over all active cards');
    assert.ok(!dailySrc.includes('selectedMap') && !dailySrc.includes('Chọn trang này'),
      'SRS pages must not require manual card selection');
    assert.ok(dailySrc.includes('isResumable'), 'DailySRS must resume unfinished sessions of the same kind');
    assert.ok(
      dailySrc.includes("tr('Đang có phiên ôn tập chưa hoàn thành')"),
      'DailySRS must still prompt confirmation before replacing an active session from another mode',
    );
    assert.ok(dailySrc.includes('DailyLimitReached') && dailySrc.includes('NoCardsYet'),
      'DailySRS must differentiate empty due-queue reasons');
    assert.ok(playerSrc.includes('handlePracticeNext') && playerSrc.includes('handlePracticePrev'),
      'Free practice flashcards navigate previous/next without remembered/forgot rating');

    // Flashcards minimal UI (white front face, no interval numbers on buttons, Chạm để lật, minimal top progress bar)
    assert.ok(playerSrc.includes("tr('Chạm để lật')"), 'Flip front face must show concise tap prompt');
    assert.ok(!playerSrc.includes('intervalPreviews'), 'Flip grading buttons must not expose SM-2 interval badges');
    assert.ok(
      !playerSrc.includes('getCardTypeLabel')
      && !playerSrc.includes('getStudyModeLabel')
      && !playerSrc.includes("'{0} cần ôn lại'"),
      'SrsReviewPlayer top progress bar must omit retry/mode/card-type chips across all 4 modes',
    );

    // Typing IME guard & feedback copy
    assert.ok(playerSrc.includes('lastCompositionEndRef'), 'Typing mode must protect Japanese IME Enter confirmation');
    assert.ok(
      playerSrc.includes("tr('Kiểm tra')")
      && playerSrc.includes("tr('Chính xác!')")
      && playerSrc.includes("tr('Chưa đúng.')"),
      'Typing mode must show clear Check and feedback copy',
    );

    // MCQ reads server-returned feedback.expectedAnswer (no pre-submit answer key dependency)
    assert.ok(playerSrc.includes('feedback.expectedAnswer'), 'MCQ feedback must compare against server-returned expectedAnswer');

    // Mixed reads assignedStudyMode & step idempotency reuses per-step key on retry
    assert.ok(playerSrc.includes('card?.assignedStudyMode'), 'Mixed mode must use Backend-assigned study mode');
    assert.ok(playerSrc.includes('stepIdempotencyRef'), 'Review submission must reuse step idempotency key across retries');
  });

  it('Smart Pagination adapts across 0, 1, 2, 3, 5, 6, 10, 50, 100 pages and responsive widths without redundant First/Last buttons', () => {
    // 0 or 1 page -> hidden
    assert.equal(getSmartPaginationModel({ currentPage: 1, totalPages: 0 }).visible, false);
    assert.equal(getSmartPaginationModel({ currentPage: 1, totalPages: 1 }).visible, false);

    // 2-5 pages -> all pages visible, no ellipsis, no First/Last, no page jump clutter
    for (const total of [2, 3, 5]) {
      const mFirst = getSmartPaginationModel({ currentPage: 1, totalPages: total });
      const mLast = getSmartPaginationModel({ currentPage: total, totalPages: total });
      assert.equal(mFirst.visible, true);
      assert.equal(mFirst.items.length, total);
      assert.equal(mFirst.items.includes('...'), false);
      assert.equal(mFirst.showFirst, false);
      assert.equal(mFirst.showLast, false);
      assert.equal(mFirst.showJump, false);
      assert.equal(mFirst.canPrev, false);
      assert.equal(mFirst.canNext, true);
      assert.equal(mLast.canPrev, true);
      assert.equal(mLast.canNext, false);
    }

    // 6+ pages -> ellipses + contextual First/Last only when jumping past ellipsis
    const p6Start = getSmartPaginationModel({ currentPage: 1, totalPages: 6 });
    assert.deepEqual(p6Start.items, [1, 2, 3, '...', 6]);
    assert.equal(p6Start.showFirst, false);
    assert.equal(p6Start.showLast, true);

    const p6Mid = getSmartPaginationModel({ currentPage: 3, totalPages: 6 });
    assert.deepEqual(p6Mid.items, [1, 2, 3, 4, 5, 6]);
    assert.equal(p6Mid.showFirst, false);
    assert.equal(p6Mid.showLast, false);

    const p10Mid = getSmartPaginationModel({ currentPage: 5, totalPages: 10 });
    assert.deepEqual(p10Mid.items, [1, '...', 4, 5, 6, '...', 10]);
    assert.equal(p10Mid.showFirst, true);
    assert.equal(p10Mid.showLast, true);

    const p50End = getSmartPaginationModel({ currentPage: 50, totalPages: 50 });
    assert.deepEqual(p50End.items, [1, '...', 48, 49, 50]);
    assert.equal(p50End.showFirst, true);
    assert.equal(p50End.showLast, false);
    assert.equal(p50End.canNext, false);

    // Compact / mobile mode reduces visible siblings cleanly
    const p100Desktop = getSmartPaginationModel({ currentPage: 50, totalPages: 100, compact: false });
    const p100Mobile = getSmartPaginationModel({ currentPage: 50, totalPages: 100, compact: true });
    assert.deepEqual(p100Desktop.items, [1, '...', 49, 50, 51, '...', 100]);
    assert.deepEqual(p100Mobile.items, [1, '...', 50, '...', 100]);
    assert.ok(p100Mobile.items.length < p100Desktop.items.length);

    // Clamping out-of-range currentPage
    const clamped = getSmartPaginationModel({ currentPage: 99, totalPages: 6 });
    assert.equal(clamped.currentPage, 6);
    assert.equal(getPaginationRange(1, 2).length, 2);

    // Shared Pagination component contract: ResizeObserver adaptive width, Sakura active, aria-label, nav landmark
    const pagSrc = fs.readFileSync(path.join(ROOT, 'src/components/ui/Pagination.jsx'), 'utf8');
    assert.ok(pagSrc.includes('ResizeObserver'), 'Pagination must adapt to container width');
    assert.ok(pagSrc.includes('bg-rp-brand-pressed text-white'), 'Active page must use Sakura brand color');
    assert.ok(pagSrc.includes('<nav') && pagSrc.includes('aria-current={isActive'), 'Pagination must expose accessible nav and aria-current');
  });

  it('Content Author, Admin, and Learner share 2-type SRS card structure and interactive preview modal', () => {
    const authorPageSrc = fs.readFileSync(path.join(ROOT, 'src/pages/content-author/SrsTemplatesPage.jsx'), 'utf8');
    const adminPanelSrc = fs.readFileSync(path.join(ROOT, 'src/features/admin/components/AdminSrsTemplatesPanel.jsx'), 'utf8');
    const libraryTabSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsCardLibraryTab.jsx'), 'utf8');
    const previewModalSrc = fs.readFileSync(path.join(ROOT, 'src/features/srs/components/SrsCardPreviewModal.jsx'), 'utf8');

    // Only 2 primary SRS card types (Vocabulary, Kanji) in Author & Admin UI; no Grammar/Custom/UsageNotes bloat
    assert.ok(!authorPageSrc.includes("id: 'Grammar'") && !authorPageSrc.includes("value: 'Grammar'"), 'SrsTemplatesPage must not expose Grammar card type');
    assert.ok(!authorPageSrc.includes("id: 'Custom'") && !authorPageSrc.includes("value: 'Custom'"), 'SrsTemplatesPage must not expose Custom card type');
    assert.ok(!authorPageSrc.includes('usageNotes') && !authorPageSrc.includes('acceptedReadings') && !authorPageSrc.includes('synonymsText'), 'SrsTemplatesPage form must stay unified without legacy extra fields');
    assert.ok(authorPageSrc.includes('showExamples: false'), 'Author example toggle must default to unchecked');

    // Shared interactive preview modal reused across Author, Admin, and Learner Library
    assert.ok(authorPageSrc.includes('SrsCardPreviewModal'), 'Author page must use shared SrsCardPreviewModal');
    assert.ok(adminPanelSrc.includes('SrsCardPreviewModal'), 'Admin panel must use shared SrsCardPreviewModal');
    assert.ok(libraryTabSrc.includes('SrsCardPreviewModal'), 'Learner Library must use shared SrsCardPreviewModal');
    assert.ok(previewModalSrc.includes('ChevronDown') && (previewModalSrc.includes('ChevronUp') || previewModalSrc.includes('rp-disclosure-chevron')), 'Shared preview modal must toggle optional examples with arrow chevron only');
    assert.ok(!previewModalSrc.includes('useState(true)') || previewModalSrc.includes('const [exampleOpen, setExampleOpen] = useState(false)'), 'Shared preview modal must default examples to collapsed');
  });
});
