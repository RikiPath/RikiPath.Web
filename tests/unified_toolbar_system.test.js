import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('UnifiedToolbar & Compact Workspace Layout Contracts', () => {
  it('exports UnifiedToolbar and FilterToolbar alias and delegates AdminToolbar to UnifiedToolbar', () => {
    const toolbarSrc = readSrc('src/components/ui/UnifiedToolbar.jsx');
    const uiIndex = readSrc('src/components/ui/index.js');
    const adminPrimitives = readSrc('src/features/admin/components/AdminPrimitives.jsx');

    assert.ok(toolbarSrc.includes('export function UnifiedToolbar('), 'UnifiedToolbar must be named-exported');
    assert.ok(uiIndex.includes("from './UnifiedToolbar.jsx'") && uiIndex.includes('UnifiedToolbar'), 'components/ui/index.js must export UnifiedToolbar');
    assert.ok(uiIndex.includes('FilterToolbar'), 'components/ui/index.js must export FilterToolbar alias');
    assert.ok(adminPrimitives.includes('<UnifiedToolbar'), 'AdminToolbar must delegate to UnifiedToolbar');
  });

  it('keeps Tabs, Search, Filters, and Actions aligned on one row with matched 36px height and no outer overflow clipping', () => {
    const toolbarSrc = readSrc('src/components/ui/UnifiedToolbar.jsx');
    const tokensCss = readSrc('src/styles/tokens.css');

    assert.ok(toolbarSrc.includes('lg:flex-row lg:items-center lg:justify-between'), 'Must align left/right zones on one desktop row');
    assert.ok(toolbarSrc.includes('aria-hidden="true" className="hidden h-6 w-px shrink-0 bg-rp-line lg:block"'), 'Must include vertical separator divider on desktop when both zones present');
    assert.ok(toolbarSrc.includes('fitContent={search.fitContent ?? true}'), 'Embedded search must default to compact fitContent sizing');
    assert.equal(toolbarSrc.includes('overflow-hidden'), false, 'Toolbar root must never clip dropdown menus');
    assert.ok(tokensCss.includes('.rp-unified-toolbar'), 'tokens.css must define .rp-unified-toolbar sizing rules');
    assert.ok(tokensCss.includes('--rp-control-h-md: 2.5rem'), 'tokens.css must align default interactive controls to 40px (2.5rem)');
  });

  it('unifies Admin workspace toolbars (Plans, SlotReview, StudyCatalog, GroupWorkspace, MentorCases, Policies, ContentReview)', () => {
    const plans = readSrc('src/pages/admin/AdminPlansWorkspace.jsx');
    assert.ok(plans.includes('<UnifiedToolbar'), 'AdminPlansWorkspace must use UnifiedToolbar');
    assert.equal(plans.includes('<Tabs'), false, 'AdminPlansWorkspace must not stack standalone Tabs above AdminToolbar');

    const slotReview = readSrc('src/pages/admin/AdminSlotReview.jsx');
    assert.ok(slotReview.includes('toolbarTabs'), 'AdminSlotReview must merge tabs into toolbar');
    assert.equal(slotReview.includes('<Tabs'), false, 'AdminSlotReview must not stack standalone Tabs above AdminToolbar');

    const proposalPanel = readSrc('src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx');
    assert.ok(proposalPanel.includes('tabs={toolbarTabs}'), 'AdminTeachingProposalReviewPanel must accept toolbarTabs');

    const catalog = readSrc('src/pages/admin/AdminStudyCatalog.jsx');
    assert.ok(catalog.includes('<UnifiedToolbar'), 'AdminStudyCatalog must use UnifiedToolbar');
    assert.ok(catalog.includes('<CustomSelect'), 'AdminStudyCatalog must preserve CustomSelect filter');

    const groups = readSrc('src/pages/admin/AdminGroupWorkspace.jsx');
    assert.ok(groups.includes('primaryToolbarTabs'), 'AdminGroupWorkspace must integrate section tabs with UnifiedToolbar');
    assert.equal(groups.includes('<Tabs'), false, 'AdminGroupWorkspace must not render separate stacked Tabs row');

    const cases = readSrc('src/pages/admin/AdminMentorCases.jsx');
    assert.ok(cases.includes('caseToolbarTabs'), 'AdminMentorCases must pass tabs into panel AdminToolbar');
    assert.equal(cases.includes('<Tabs'), false, 'AdminMentorCases must not render separate Tabs row above filter toolbar');

    const contentReview = readSrc('src/pages/admin/AdminContentReview.jsx');
    assert.ok(contentReview.includes('<UnifiedToolbar'), 'AdminContentReview must use UnifiedToolbar');

    const policies = readSrc('src/pages/admin/AdminLearningPolicies.jsx');
    assert.ok(policies.includes('<UnifiedToolbar'), 'AdminLearningPolicies must use UnifiedToolbar');

    const schedReqs = readSrc('src/pages/admin/AdminScheduleRequests.jsx');
    assert.ok(schedReqs.includes('toolbarTabs'), 'AdminScheduleRequests must pass unified toolbarTabs into active panel');
    assert.equal(schedReqs.includes('<Tabs'), false, 'AdminScheduleRequests must not render separate stacked Tabs row');
  });

  it('unifies Content Author, Mentor, and Learner toolbars onto single-row UnifiedToolbar without double cards', () => {
    const authorDash = readSrc('src/pages/content-author/AuthorDashboard.jsx');
    assert.ok(authorDash.includes('<UnifiedToolbar'), 'AuthorDashboard must merge status tabs, view mode, search, and selects into UnifiedToolbar');

    const questionBank = readSrc('src/pages/content-author/QuestionBank.jsx');
    assert.ok(questionBank.includes('<UnifiedToolbar'), 'QuestionBank must merge tabs and filters into UnifiedToolbar');
    assert.equal(questionBank.includes('<Tabs'), false, 'QuestionBank must not stack Tabs above filter card');

    const approvedBank = readSrc('src/pages/content-author/ApprovedBankPage.jsx');
    assert.ok(approvedBank.includes('<UnifiedToolbar'), 'ApprovedBankPage must use UnifiedToolbar');

    const importHistory = readSrc('src/pages/content-author/AuthorImportHistory.jsx');
    assert.ok(importHistory.includes('<UnifiedToolbar'), 'AuthorImportHistory BatchContents must use UnifiedToolbar');

    const mentorClasses = readSrc('src/pages/mentor/MentorClassWorkspace.jsx');
    assert.ok(mentorClasses.includes('<UnifiedToolbar'), 'MentorClassWorkspace directory must use UnifiedToolbar (tabs left, search right)');

    const mentorReviews = readSrc('src/pages/mentor/MentorReviews.jsx');
    assert.ok(mentorReviews.includes('<UnifiedToolbar'), 'MentorReviews must use UnifiedToolbar');
    assert.equal(mentorReviews.includes('<Tabs'), false, 'MentorReviews must not render nested custom flex wrapper');

    const kanjiLesson = readSrc('src/features/kanji/components/KanjiLesson.jsx');
    assert.ok(kanjiLesson.includes('<IllustratedPageHeader'), 'KanjiLesson must place JLPT tabs and practice status filter inside IllustratedPageHeader actions');
    assert.equal(kanjiLesson.includes('count: lvl.count'), false, 'KanjiLesson must not render redundant item counts inside JLPT filter tabs');

    const homework = readSrc('src/pages/learner/HomeworkPage.jsx');
    assert.ok(homework.includes('<UnifiedToolbar'), 'HomeworkPage must unify status tabs, cohort select, and workspace link into UnifiedToolbar');

    const myCourses = readSrc('src/pages/learner/LearnerMyCoursesPage.jsx');
    assert.ok(myCourses.includes('<UnifiedToolbar'), 'LearnerMyCoursesPage must use UnifiedToolbar');

    const studyPlans = readSrc('src/pages/learner/StudyPlans.jsx');
    assert.ok(studyPlans.includes('<IllustratedPageHeader'), 'StudyPlans must place package category tabs inside IllustratedPageHeader actions');
    assert.ok(studyPlans.includes('<Modal'), 'StudyPlans must render purchase history inside a Modal');
  });

  it('enforces Smart Empty State & Conditional Filter UI: hides Search/Filter/Sort toolbars when baseline source dataset is empty while preserving filters on 0-result filter queries', () => {
    const checks = [
      ['src/features/cohorts/components/AdminCohortTransferQueuePanel.jsx', 'hasRecords'],
      ['src/features/complaints/components/AdminCohortComplaintsPanel.jsx', 'hasRecords'],
      ['src/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx', 'hasRecords'],
      ['src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx', 'hasAnyProposals'],
      ['src/features/cohorts/components/AdminCohortConsolePanel.jsx', 'hasAnyCohorts'],
      ['src/features/cohorts/components/AdminRetakeSupportPanel.jsx', 'courses.length === 0'],
      ['src/pages/admin/AdminUsers.jsx', 'hasToolbar'],
      ['src/pages/admin/AdminConsultants.jsx', 'rawMentors.length > 0'],
      ['src/pages/admin/AdminMentorVerifications.jsx', 'rows.length > 0'],
      ['src/pages/admin/AdminMentorQualifications.jsx', 'mentors.length > 0'],
      ['src/pages/admin/AdminMentorQuality.jsx', 'showToolbar'],
      ['src/pages/admin/AdminPaymentsWorkspace.jsx', 'showToolbar'],
      ['src/pages/admin/AdminCertificateSections.jsx', 'showFilterToolbar'],
      ['src/pages/admin/AdminContentReview.jsx', 'showToolbar'],
      ['src/pages/content-author/AuthorDashboard.jsx', 'mineQuery.isSuccess && items.length > 0'],
      ['src/pages/content-author/QuestionBank.jsx', 'totalCount > 0 || hasFilters'],
      ['src/pages/content-author/ApprovedBankPage.jsx', 'showToolbar'],
      ['src/pages/content-author/ManualContentPage.jsx', 'showFilterControls'],
      ['src/pages/content-author/AuthorImportHistory.jsx', '(items.data || []).length > 0'],
      ['src/pages/mentor/MentorReviews.jsx', 'rows.length > 0'],
      ['src/pages/mentor/MentorClassWorkspace.jsx', 'mentorCohortEntries.length > 0'],
      ['src/features/complaints/components/CohortComplaintPanel.jsx', 'rows.length > 0'],
      ['src/features/cohorts/components/LearnerCohortDiscoveryPanel.jsx', 'isSourceEmpty'],
      ['src/pages/learner/MentorDirectory.jsx', 'showDirectoryToolbar'],
      ['src/pages/learner/LearnerMyCoursesPage.jsx', 'courses.length > 0'],
      ['src/pages/learner/HomeworkPage.jsx', 'cohorts.length === 0'],
      ['src/pages/learner/ExamResult.jsx', 'hasAnyHistory'],
      ['src/pages/learner/MockTestPage.jsx', 'levels.data?.length > 0'],
      ['src/features/kanji/components/KanjiLesson.jsx', 'items.length > 0'],
      ['src/features/notebook/components/SmartNotebookWorkspace.jsx', 'hasEntriesInScope'],
    ];

    for (const [file, conditionToken] of checks) {
      const src = readSrc(file);
      assert.ok(
        src.includes(conditionToken),
        `${file} must conditionally gate Search/Filter UI on real data presence (${conditionToken})`,
      );
    }
  });

  it('enforces Learner UI Standardization V2: 44px controls, 36px CounterPill, LevelTabs without JLPT prefix, and N5–N2 only (no N1)', () => {
    const core = readSrc('src/components/ui/core.jsx');
    const overlay = readSrc('src/components/ui/overlay.jsx');
    const tokens = readSrc('src/features/learner-ui/learnerTokens.js');
    const controls = readSrc('src/features/learner-ui/LearnerControls.jsx');
    const productionLessons = readSrc('src/pages/learner/productionPracticeLessons.js');
    const lessonList = readSrc('src/pages/learner/LessonList.jsx');
    const grammarBank = readSrc('src/pages/learner/GrammarBank.jsx');
    const mockTest = readSrc('src/pages/learner/MockTestPage.jsx');
    const placementTest = readSrc('src/pages/learner/PlacementTest.jsx');
    const roadmap = readSrc('src/pages/learner/RoadmapJLPT.jsx');
    const mentors = readSrc('src/pages/learner/MentorDirectory.jsx');

    assert.match(core, /md:\s*'h-10 px-4 text-sm gap-2 rounded-xl'/);
    assert.match(core, /lg:\s*'h-12 px-5 text-\[15px\] gap-2 rounded-xl'/);
    assert.match(overlay, /w-fit h-10 rounded-2xl border border-rp-line bg-rp-surface p-\[3px\]/);
    assert.ok(tokens.includes("SUPPORTED_JLPT_LEVELS = ['N5', 'N4', 'N3', 'N2']"), 'Must restrict SUPPORTED_JLPT_LEVELS to N5-N2');
    assert.ok(controls.includes('export function LevelTabs(') && controls.includes('export function CounterPill('));

    for (const [label, src] of [
      ['productionPracticeLessons.js', productionLessons],
      ['PlacementTest.jsx', placementTest],
      ['RoadmapJLPT.jsx', roadmap],
      ['MentorDirectory.jsx', mentors],
    ]) {
      assert.equal(/\bN1\b/.test(src), false, `${label} must not contain N1`);
    }

    assert.ok(lessonList.includes('<LevelTabs'), 'LessonList must use LevelTabs (no "JLPT " tab prefix)');
    assert.equal(lessonList.includes('`JLPT ${code}`'), false, 'LessonList level tabs must show N5..N2 without JLPT prefix');
    assert.ok(grammarBank.includes('<LevelTabs'), 'GrammarBank must use unified LevelTabs (N5-N2)');
    assert.ok(mockTest.includes('<LevelTabs'), 'MockTestPage must use unified LevelTabs (N5-N2)');
    assert.ok(mockTest.includes('variant="primary"'), 'MockTestPage history CTA must match primary Sakura button style');

    const dailySrs = readSrc('src/pages/learner/DailySRS.jsx');
    assert.equal(dailySrs.includes('<SegmentedControl'), false, 'DailySRS must control study modes via Sidebar instead of duplicate SegmentedControl');
    assert.equal(dailySrs.includes('<Tabs'), false, 'DailySRS must navigate SRS sections via Sidebar instead of duplicate top Tabs');
  });
});
