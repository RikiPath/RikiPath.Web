import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

describe('Global Smart Refresh System — Components, CSS Motion & Logic Contracts', () => {
  let viteServer;

  const loadModule = async (modPath) => {
    if (!viteServer) {
      viteServer = await createServer({
        root: ROOT,
        logLevel: 'silent',
        server: { middlewareMode: true },
        appType: 'custom',
      });
    }
    return viteServer.ssrLoadModule(modPath);
  };

  after(async () => {
    if (viteServer) await viteServer.close();
  });

  it('exports RefreshButton, SakuraLoading, DataRefreshBoundary, UnifiedToolbar, and useSmartRefresh', async () => {
    const adminPrimitives = readSrc('src/features/admin/components/AdminPrimitives.jsx');
    assert.ok(adminPrimitives.includes('refresh={refresh}'), 'AdminToolbar must forward refresh prop to UnifiedToolbar');

    const uiBarrel = await loadModule('/src/components/ui/index.js');
    for (const sym of ['RefreshButton', 'SakuraLoader', 'SakuraLoading', 'RefreshingIndicator', 'DataRefreshBoundary', 'UnifiedToolbar']) {
      assert.ok(uiBarrel[sym] != null, `components/ui barrel must export ${sym}`);
    }

    const { RefreshButton } = await loadModule('/src/components/ui/RefreshButton.jsx');
    const { SakuraLoader, SakuraLoading, RefreshingIndicator } = await loadModule('/src/components/ui/SakuraLoader.jsx');
    const { DataRefreshBoundary } = await loadModule('/src/components/ui/SmartDataBoundary.jsx');
    const { UnifiedToolbar } = await loadModule('/src/components/ui/UnifiedToolbar.jsx');
    const { useSmartRefresh } = await loadModule('/src/hooks/useSmartRefresh.js');

    assert.ok(typeof RefreshButton === 'function' || typeof RefreshButton === 'object');
    assert.equal(SakuraLoading, SakuraLoader);
    assert.equal(typeof RefreshingIndicator, 'function');
    assert.equal(typeof DataRefreshBoundary, 'function');
    assert.equal(typeof UnifiedToolbar, 'function');
    assert.equal(typeof useSmartRefresh, 'function');
  });

  it('renders RefreshButton with RefreshCw before label, real CSS spin class, aria-busy & iconOnly support', async () => {
    const { RefreshButton } = await loadModule('/src/components/ui/RefreshButton.jsx');

    const idleHtml = renderToStaticMarkup(
      React.createElement(RefreshButton, { onRefresh: () => {}, refreshing: false }),
    );
    assert.ok(idleHtml.includes('data-testid="refresh-button"'));
    assert.ok(idleHtml.includes('data-refreshing="false"'));
    assert.equal(idleHtml.includes('aria-busy="true"'), false);
    assert.ok(idleHtml.includes('<svg'));
    assert.ok(idleHtml.includes('Làm mới'));
    assert.ok(idleHtml.indexOf('<svg') < idleHtml.indexOf('Làm mới'), 'RefreshCw icon must render before "Làm mới" label');
    assert.equal(idleHtml.includes('rp-refresh-spin'), false);

    const activeHtml = renderToStaticMarkup(
      React.createElement(RefreshButton, { onRefresh: () => {}, refreshing: true }),
    );
    assert.ok(activeHtml.includes('data-refreshing="true"'));
    assert.ok(activeHtml.includes('aria-busy="true"'));
    assert.ok(activeHtml.includes('disabled'));
    assert.ok(activeHtml.includes('<svg'), 'RefreshCw icon must stay visible during loading');
    assert.ok(activeHtml.includes('rp-refresh-spin'), 'RefreshCw icon must apply .rp-refresh-spin class when refreshing');

    const iconOnlyHtml = renderToStaticMarkup(
      React.createElement(RefreshButton, { iconOnly: true, onRefresh: () => {}, refreshing: false }),
    );
    assert.ok(iconOnlyHtml.includes('aria-label="Làm mới"'));
    assert.equal(iconOnlyHtml.includes('>Làm mới<'), false);
  });

  it('renders UnifiedToolbar refresh slot and Sakura RefreshingIndicator without shifting layout', async () => {
    const { UnifiedToolbar } = await loadModule('/src/components/ui/UnifiedToolbar.jsx');
    const { RefreshingIndicator } = await loadModule('/src/components/ui/SakuraLoader.jsx');
    const { DataRefreshBoundary } = await loadModule('/src/components/ui/SmartDataBoundary.jsx');

    const toolbarHtml = renderToStaticMarkup(
      React.createElement(UnifiedToolbar, {
        search: { value: '', onChange: () => {}, placeholder: 'Tìm...' },
        refresh: { onRefresh: () => {}, refreshing: false },
      }),
    );
    assert.ok(toolbarHtml.includes('data-testid="refresh-button"'));
    assert.ok(toolbarHtml.includes('Làm mới'));

    const sakuraHtml = renderToStaticMarkup(
      React.createElement(RefreshingIndicator, { active: true, delay: 0 }),
    );
    assert.ok(sakuraHtml.includes('data-sakura-refreshing="true"'));
    assert.ok(sakuraHtml.includes('rp-bloom'));

    const refreshingDataHtml = renderToStaticMarkup(
      React.createElement(
        DataRefreshBoundary,
        {
          loading: false,
          refreshing: true,
          hasData: true,
          indicatorDelay: 0,
        },
        React.createElement('div', { 'data-testid': 'preserved-rows' }, 'Cached row data'),
      ),
    );
    assert.ok(refreshingDataHtml.includes('data-testid="preserved-rows"'), 'Refreshing must keep existing data visible');
    assert.ok(refreshingDataHtml.includes('Cached row data'));
    assert.ok(refreshingDataHtml.includes('data-sakura-refreshing="true"'));

    const staleErrorHtml = renderToStaticMarkup(
      React.createElement(
        DataRefreshBoundary,
        {
          loading: false,
          refreshing: false,
          error: new Error('Network fail'),
          hasData: true,
          onRetry: () => {},
        },
        React.createElement('div', { 'data-testid': 'stale-rows' }, 'Still usable cached rows'),
      ),
    );
    assert.ok(staleErrorHtml.includes('data-ui-state="stale-data"'), 'Error with cached data must show StaleDataBar instead of blanking content');
    assert.ok(staleErrorHtml.includes('Still usable cached rows'));
  });

  it('defines @keyframes rp-refresh-spin with reduced-motion safeguard in tokens.css', () => {
    const tokens = readSrc('src/styles/tokens.css');
    assert.ok(tokens.includes('@keyframes rp-refresh-spin'), 'missing @keyframes rp-refresh-spin');
    assert.match(tokens, /\.rp-refresh-spin\s*\{[\s\S]*animation:\s*rp-refresh-spin/);
    assert.match(
      tokens,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.rp-refresh-spin[\s\S]*animation:\s*none/,
      'prefers-reduced-motion must disable .rp-refresh-spin animation',
    );
  });

  it('implements deduplication, sequence protection & cancelRefetch in useSmartRefresh without blanket cache wipes', () => {
    const hookSrc = readSrc('src/hooks/useSmartRefresh.js');
    assert.ok(hookSrc.includes('inFlightPromiseRef'), 'Must deduplicate rapid refresh clicks via in-flight promise ref');
    assert.ok(hookSrc.includes('seqRef'), 'Must guard against out-of-order stale responses via sequence ref');
    assert.ok(hookSrc.includes('mountedRef'), 'Must guard async setState after unmount');
    assert.ok(hookSrc.includes('cancelRefetch: true'), 'Must use cancelRefetch: true for TanStack Query refetches');
    assert.equal(hookSrc.includes('queryClient.clear()'), false, 'Must NEVER wipe entire QueryClient cache');
  });

  it('never uses window.location.reload() or navigate(0) inside page or feature views', () => {
    const dirs = [
      ...listFiles(path.join(ROOT, 'src', 'pages')),
      ...listFiles(path.join(ROOT, 'src', 'features')),
    ].filter((f) => f.endsWith('.js') || f.endsWith('.jsx'));

    for (const file of dirs) {
      const content = fs.readFileSync(file, 'utf8');
      assert.equal(
        /location\.reload|navigate\(0\)/.test(content),
        false,
        `Forbidden full page reload found in ${path.relative(ROOT, file)}`,
      );
    }
  });

  it('integrates standardized RefreshButton across Admin, Content Author, and Mentor management/filter/queue workspaces and essential learning tools, while keeping Learner Dashboard and non-list views clean', () => {
    const adminFiles = [
      'src/pages/admin/AdminDashboard.jsx',
      'src/pages/admin/AdminUsers.jsx',
      'src/pages/admin/AdminPaymentsWorkspace.jsx',
      'src/pages/admin/AdminPlansWorkspace.jsx',
      'src/pages/admin/AdminStudyCatalog.jsx',
      'src/pages/admin/AdminCertificateSections.jsx',
      'src/pages/admin/AdminContentReview.jsx',
      'src/pages/admin/AdminGroupWorkspace.jsx',
      'src/pages/admin/AdminSlotReview.jsx',
      'src/features/complaints/components/AdminCohortComplaintsPanel.jsx',
      'src/features/cohorts/components/AdminCohortTransferQueuePanel.jsx',
      'src/features/scheduling/components/AdminCohortScheduleRequestsPanel.jsx',
      'src/features/scheduling/components/AdminTeachingProposalReviewPanel.jsx',
      'src/pages/admin/AdminRetakeSupport.jsx',
      'src/pages/admin/AdminMentorReplacements.jsx',
      'src/pages/admin/AdminConsultants.jsx',
      'src/pages/admin/AdminMentorVerifications.jsx',
      'src/pages/admin/AdminMentorQualifications.jsx',
      'src/pages/admin/AdminMentorQuality.jsx',
      'src/pages/admin/AdminMentorTemplate.jsx',
      'src/pages/admin/AdminMentorScheduleCalendar.jsx',
      'src/pages/admin/AdminMentorGroupPolicy.jsx',
      'src/features/scheduling/components/AvailabilityPlanner.jsx',
    ];
    for (const file of adminFiles) {
      const src = readSrc(file);
      assert.ok(
        src.includes('RefreshButton') || src.includes('refresh={') || src.includes('onRefresh={'),
        `${file} must wire standardized Smart Refresh`,
      );
    }

    // Verify Admin exception queues no longer remount/wipe filters via key=*-${refreshTick}
    for (const file of [
      'src/pages/admin/AdminComplaints.jsx',
      'src/pages/admin/AdminCohortTransfers.jsx',
      'src/pages/admin/AdminScheduleRequests.jsx',
    ]) {
      const src = readSrc(file);
      assert.equal(/key=\{\s*`[^}]*refreshTick/.test(src), false, `${file} must not remount child panels on refresh`);
      assert.ok(src.includes('refreshSignal'), `${file} must pass non-destructive refreshSignal`);
    }

    const authorFiles = [
      'src/pages/content-author/AuthorDashboard.jsx',
      'src/pages/content-author/QuestionBank.jsx',
      'src/pages/content-author/ApprovedBankPage.jsx',
      'src/pages/content-author/AuthorImportHistory.jsx',
      'src/pages/content-author/ManualContentPage.jsx',
    ];
    for (const file of authorFiles) {
      const src = readSrc(file);
      assert.ok(
        src.includes('RefreshButton') || src.includes('refresh={{'),
        `Author workspace ${file} must wire standardized RefreshButton / UnifiedToolbar.refresh`,
      );
    }

    const mentorFiles = [
      'src/pages/mentor/MentorClassWorkspace.jsx',
      'src/pages/mentor/MentorReviews.jsx',
      'src/pages/mentor/MentorAttendanceKpi.jsx',
      'src/pages/mentor/MentorShiftSchedule.jsx',
      'src/pages/mentor/WorkSchedule.jsx',
      'src/pages/learner/HomeworkPage.jsx',
      'src/features/complaints/components/CohortComplaintPanel.jsx',
      'src/features/scheduling/components/InteractiveSlotCalendar.jsx',
      'src/features/scheduling/components/SakuraCalendar.jsx',
    ];
    for (const file of mentorFiles) {
      const src = readSrc(file);
      assert.ok(
        src.includes('RefreshButton') || src.includes('refresh={') || src.includes('onRefresh={'),
        `Mentor workspace ${file} must wire standardized RefreshButton`,
      );
    }

    const learnerToolRefreshFiles = [
      'src/pages/learner/LearnerMyCoursesPage.jsx',
      'src/pages/learner/CohortDiscoveryPage.jsx',
      'src/pages/learner/LearnerCalendarPage.jsx',
      'src/pages/learner/LearnerEssayPage.jsx',
      'src/pages/shared/StudyCoursesPage.jsx',
      'src/features/calendar/components/HeaderCalendarPopover.jsx',
    ];
    for (const file of learnerToolRefreshFiles) {
      const src = readSrc(file);
      assert.ok(
        src.includes('RefreshButton') || src.includes('refresh={{'),
        `Learner tool ${file} must wire standardized Smart Refresh`,
      );
    }

    const noManualRefreshButtonFiles = [
      'src/pages/learner/HomeLearner.jsx',
      'src/pages/learner/Dashboard.jsx',
      'src/pages/learner/RoadmapJLPT.jsx',
      'src/pages/learner/PlacementTest.jsx',
      'src/pages/learner/PlacementResult.jsx',
      'src/pages/learner/LessonList.jsx',
      'src/pages/learner/GrammarBank.jsx',
      'src/pages/learner/DailySRS.jsx',
      'src/pages/learner/StudyPlans.jsx',
      'src/pages/learner/ExamResult.jsx',
      'src/pages/learner/MockTestPage.jsx',
      'src/pages/learner/GroupLearningProgressPage.jsx',
      'src/pages/learner/CohortWorkspacePage.jsx',
      'src/pages/learner/MentorDirectory.jsx',
      'src/pages/learner/MentorPublicProfile.jsx',
      'src/features/notebook/components/SmartNotebookWorkspace.jsx',
      'src/features/kanji/components/KanjiLesson.jsx',
      'src/pages/learner/KanjiWritingPracticePage.jsx',
      'src/pages/admin/AdminUserDetail.jsx',
      'src/pages/content-author/CMSStudio.jsx',
      'src/pages/mentor/ConsultantOverview.jsx',
      'src/pages/mentor/MentorProfile.jsx',
      'src/features/profile/components/ProfileWorkspace.jsx',
    ];
    for (const file of noManualRefreshButtonFiles) {
      const src = readSrc(file);
      assert.equal(
        src.includes('<RefreshButton'),
        false,
        `${file} must NOT render an unnecessary manual <RefreshButton>`,
      );
    }
  });

  it('never renders RefreshButton inside ContextualEmptyState/EmptyState or when UnifiedToolbar refresh.when is false', async () => {
    const { ContextualEmptyState } = await loadModule('/src/components/ui/SmartDataBoundary.jsx');
    const { EmptyState } = await loadModule('/src/components/ui/states.jsx');
    const { RefreshButton } = await loadModule('/src/components/ui/RefreshButton.jsx');
    const { UnifiedToolbar } = await loadModule('/src/components/ui/UnifiedToolbar.jsx');

    const directRefreshEmpty = renderToStaticMarkup(
      React.createElement(ContextualEmptyState, {
        title: 'Không có khiếu nại nào.',
        action: React.createElement(RefreshButton, { onRefresh: () => {} }),
      }),
    );
    assert.ok(directRefreshEmpty.includes('Không có khiếu nại nào.'));
    assert.equal(directRefreshEmpty.includes('data-testid="refresh-button"'), false);

    const mixedActionEmpty = renderToStaticMarkup(
      React.createElement(EmptyState, {
        title: 'Chưa có học liệu nào',
        action: React.createElement(
          'div',
          { className: 'flex gap-2' },
          React.createElement('button', { type: 'button' }, 'Tạo mới'),
          React.createElement(RefreshButton, { onRefresh: () => {} }),
        ),
      }),
    );
    assert.ok(mixedActionEmpty.includes('Tạo mới'));
    assert.equal(mixedActionEmpty.includes('data-testid="refresh-button"'), false);

    const emptyTabToolbar = renderToStaticMarkup(
      React.createElement(UnifiedToolbar, {
        tabs: {
          label: 'Tabs',
          value: 'a',
          onChange: () => {},
          tabs: [{ value: 'a', label: 'Mục A', count: 0 }],
        },
        refresh: { when: false, onRefresh: () => {}, refreshing: false },
      }),
    );
    assert.ok(emptyTabToolbar.includes('Mục A'));
    assert.equal(emptyTabToolbar.includes('data-testid="refresh-button"'), false);

    const emptyRefreshOnlyToolbar = renderToStaticMarkup(
      React.createElement(UnifiedToolbar, {
        refresh: { when: false, onRefresh: () => {}, refreshing: false },
      }),
    );
    assert.equal(emptyRefreshOnlyToolbar, '');

    const dirs = [
      ...listFiles(path.join(ROOT, 'src', 'pages')),
      ...listFiles(path.join(ROOT, 'src', 'features')),
    ].filter((f) => f.endsWith('.js') || f.endsWith('.jsx'));

    for (const file of dirs) {
      const content = fs.readFileSync(file, 'utf8');
      const openerRe = /<(?:ContextualEmptyState|EmptyState)\b/g;
      let match;
      while ((match = openerRe.exec(content)) !== null) {
        let i = match.index;
        let braceDepth = 0;
        let quote = null;
        while (i < content.length) {
          const ch = content[i];
          if (quote) {
            if (ch === '\\') i += 1;
            else if (ch === quote) quote = null;
          } else if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch;
          } else if (ch === '{') {
            braceDepth += 1;
          } else if (ch === '}') {
            braceDepth = Math.max(0, braceDepth - 1);
          } else if (braceDepth === 0 && ch === '/' && content[i + 1] === '>') {
            i += 2;
            break;
          } else if (braceDepth === 0 && ch === '>') {
            const closeIdx = content.indexOf(
              match[0].startsWith('<ContextualEmptyState') ? '</ContextualEmptyState>' : '</EmptyState>',
              i + 1,
            );
            i = closeIdx === -1 ? i + 1 : closeIdx;
            break;
          }
          i += 1;
        }
        const tagSlice = content.slice(match.index, i);
        assert.equal(
          /<RefreshButton\b/.test(tagSlice),
          false,
          `Empty state in ${path.relative(ROOT, file)} must NOT pass <RefreshButton>`,
        );
      }
    }
  });
});
