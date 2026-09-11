/**
 * Unify page chrome: strip inline aside/header chrome and wrap with shared shells.
 * Also fix common HTML→JSX attribute mistakes.
 *
 * Usage: node scripts/unify-shells.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src/pages');

const PAGE_SHELL = {
  // CMS
  'cms/CMSStudio.jsx': { shell: 'CmsShell', breadcrumb: 'Tổng quan CMS' },
  'cms/LessonCMS.jsx': { shell: 'CmsShell', breadcrumb: 'Quản lý Bài học' },
  'cms/KanjiEditor.jsx': { shell: 'CmsShell', breadcrumb: 'Hán tự' },
  'cms/VocabularyEditor.jsx': { shell: 'CmsShell', breadcrumb: 'Từ vựng' },
  'cms/VideoLessonEditor.jsx': { shell: 'CmsShell', breadcrumb: 'Video' },
  'cms/BulkImport.jsx': { shell: 'CmsShell', breadcrumb: 'Import hàng loạt' },
  'cms/ExamBuilder.jsx': { shell: 'CmsShell', breadcrumb: 'Xây đề thi' },
  'cms/QuestionBank.jsx': { shell: 'CmsShell', breadcrumb: 'Ngân hàng câu hỏi' },
  'cms/AuthorDashboard.jsx': { shell: 'CmsShell', breadcrumb: 'Bảng tác giả' },
  'cms/ContentLibrary.jsx': { shell: 'CmsShell', breadcrumb: 'Kho học liệu' },
  // Admin
  'admin/AdminOverview.jsx': { shell: 'AdminShell', breadcrumb: 'Tổng quan' },
  'admin/AdminUsers.jsx': { shell: 'AdminShell', breadcrumb: 'Người dùng' },
  'admin/AdminRoles.jsx': { shell: 'AdminShell', breadcrumb: 'Vai trò & quyền' },
  'admin/AdminContentReview.jsx': { shell: 'AdminShell', breadcrumb: 'Duyệt nội dung' },
  // Learner (app sidebar family)
  'learner/Dashboard.jsx': { shell: 'LearnerShell', breadcrumb: 'Tổng quan' },
  'learner/HomeLearner.jsx': { shell: 'LearnerShell', breadcrumb: 'Trang chủ HV' },
  'learner/MultiColumnDashboard.jsx': { shell: 'LearnerShell', breadcrumb: 'Cổng học tập' },
  'learner/LessonList.jsx': { shell: 'LearnerShell', breadcrumb: 'Bài học' },
  'learner/LessonPlayer.jsx': { shell: 'LearnerShell', breadcrumb: 'Player' },
  'learner/LessonComplete.jsx': { shell: 'LearnerShell', breadcrumb: 'Hoàn thành' },
  'learner/RoadmapJLPT.jsx': { shell: 'LearnerShell', breadcrumb: 'Lộ trình' },
  'learner/SentenceStudio.jsx': { shell: 'LearnerShell', breadcrumb: 'Viết câu' },
  'learner/KanjiStudio.jsx': { shell: 'LearnerShell', breadcrumb: 'Kanji AI' },
  'learner/AICounselor.jsx': { shell: 'LearnerShell', breadcrumb: 'Cố vấn AI' },
  'learner/AIScoringResult.jsx': { shell: 'LearnerShell', breadcrumb: 'Chấm AI' },
  // Consult
  'consultation/ConsultationPrep.jsx': { shell: 'ConsultShell', breadcrumb: 'Chuẩn bị buổi' },
  'consultation/TextConsultationReply.jsx': { shell: 'ConsultShell', breadcrumb: 'Trả lời văn bản' },
  'consultation/WorkSchedule.jsx': { shell: 'ConsultShell', breadcrumb: 'Lịch làm việc' },
  'consultation/ConsultantOverview.jsx': { shell: 'ConsultShell', breadcrumb: 'Tổng quan CG' },
  'consultation/ConsultationQueue.jsx': { shell: 'ConsultShell', breadcrumb: 'Hàng đợi' },
  'consultation/BookingSchedule.jsx': { shell: 'ConsultShell', breadcrumb: 'Đặt lịch' },
  'consultation/Consultation.jsx': { shell: 'ConsultShell', breadcrumb: 'Tư vấn' },
  'consultation/ConsultationHub.jsx': { shell: 'ConsultShell', breadcrumb: 'Hub' },
  'consultation/ConsultationCenter.jsx': { shell: 'ConsultShell', breadcrumb: 'Trung tâm' },
  'consultation/ConsultationRequestDetail.jsx': { shell: 'ConsultShell', breadcrumb: 'Yêu cầu' },
  // Learner top-nav family → same app shell
  'learner/KanjiNotebook.jsx': { shell: 'LearnerShell', breadcrumb: 'Sổ Kanji' },
  'learner/VocabularyNotebook.jsx': { shell: 'LearnerShell', breadcrumb: 'Sổ từ' },
  'learner/DailySRS.jsx': { shell: 'LearnerShell', breadcrumb: 'Ôn SRS' },
  'learner/ExamN3.jsx': { shell: 'LearnerShell', breadcrumb: 'Thi N3' },
  // Marketing
  'marketing/HomeLanding.jsx': { shell: 'MarketingShell', breadcrumb: '' },
  'marketing/CourseCatalog.jsx': { shell: 'MarketingShell', breadcrumb: '' },
  'marketing/CourseDetail.jsx': { shell: 'MarketingShell', breadcrumb: '' },
};

function findMatchingClose(src, openIdx, tagName) {
  const openRe = new RegExp(`<${tagName}\\b`, 'g');
  const closeRe = new RegExp(`</${tagName}>`, 'g');
  let i = openIdx;
  let depth = 0;
  while (i < src.length) {
    openRe.lastIndex = i;
    closeRe.lastIndex = i;
    const o = openRe.exec(src);
    const c = closeRe.exec(src);
    if (!c) return -1;
    if (o && o.index < c.index) {
      // self-closing?
      const slice = src.slice(o.index, o.index + 400);
      const gt = slice.indexOf('>');
      if (gt !== -1 && slice[gt - 1] === '/') {
        i = o.index + gt + 1;
        continue;
      }
      depth += 1;
      i = o.index + 1;
    } else {
      depth -= 1;
      i = c.index + c[0].length;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function findFirstTag(src, tagName, from = 0) {
  const re = new RegExp(`<${tagName}\\b`, 'g');
  re.lastIndex = from;
  const m = re.exec(src);
  return m ? m.index : -1;
}

function stripFirstAside(src) {
  const idx = findFirstTag(src, 'aside');
  if (idx === -1) return { src, stripped: false };
  const end = findMatchingClose(src, idx, 'aside');
  if (end === -1) return { src, stripped: false };
  return { src: src.slice(0, idx) + src.slice(end), stripped: true };
}

/** Strip fixed/sticky sidebar <nav ...> used by AdminOverview */
function stripSidebarNav(src) {
  const re = /<nav\b[^>]*(?:w-sidebar-width|fixed left-0)[^>]*>/g;
  const m = re.exec(src);
  if (!m) return { src, stripped: false };
  const end = findMatchingClose(src, m.index, 'nav');
  if (end === -1) return { src, stripped: false };
  return { src: src.slice(0, m.index) + src.slice(end), stripped: true };
}

function stripFirstChromeHeader(src) {
  // Prefer fixed/sticky headers that look like app chrome
  const re =
    /<header\b[^>]*(?:fixed|sticky|h-16|h-topbar-height|TopNav|topbar)[^>]*>/gi;
  const m = re.exec(src);
  if (!m) {
    const idx = findFirstTag(src, 'header');
    if (idx === -1) return { src, stripped: false };
    const end = findMatchingClose(src, idx, 'header');
    if (end === -1) return { src, stripped: false };
    // only strip if it looks like chrome (search / notifications / breadcrumb)
    const block = src.slice(idx, end);
    if (!/search|notifications|chevron_right|breadcrumb|profile|Thông báo/i.test(block)) {
      return { src, stripped: false };
    }
    return { src: src.slice(0, idx) + src.slice(end), stripped: true };
  }
  const end = findMatchingClose(src, m.index, 'header');
  if (end === -1) return { src, stripped: false };
  return { src: src.slice(0, m.index) + src.slice(end), stripped: true };
}

function fixJsxAttrs(src) {
  return src
    .replace(/\bviewbox=/gi, 'viewBox=')
    .replace(/\bpreserveaspectratio=/gi, 'preserveAspectRatio=')
    .replace(/\bstrokewidth=/gi, 'strokeWidth=')
    .replace(/\bstrokelinecap=/gi, 'strokeLinecap=')
    .replace(/\bstrokelinejoin=/gi, 'strokeLinejoin=')
    .replace(/\bclip-path=/gi, 'clipPath=')
    .replace(/\bfill-rule=/gi, 'fillRule=')
    .replace(/\bclip-rule=/gi, 'clipRule=')
    .replace(/\bstroke-width=/gi, 'strokeWidth=')
    .replace(/\bstroke-linecap=/gi, 'strokeLinecap=')
    .replace(/\bstroke-linejoin=/gi, 'strokeLinejoin=')
    .replace(/\bautocomplete=/gi, 'autoComplete=')
    .replace(/\btabindex=/gi, 'tabIndex=')
    .replace(/\breadonly\b/gi, 'readOnly')
    .replace(/\bonclick=/gi, 'onClick=')
    .replace(/\bonchange=/gi, 'onChange=')
    .replace(/\bonsubmit=/gi, 'onSubmit=')
    .replace(/\bclass="/g, 'className="');
}

function ensureImport(src, shell) {
  if (src.includes(`from '../../components/shells`)) return src;
  if (src.includes(`from "../components/shells`)) return src;
  const importLine = `import { ${shell} } from '../../components/shells';\nimport { useLocation } from 'react-router-dom';\n`;
  // insert after existing imports or at top
  const m = src.match(/^(?:import .+;\n)+/);
  if (m) return src.slice(0, m[0].length) + importLine + src.slice(m[0].length);
  return importLine + src;
}

function wrapWithShell(src, shell, breadcrumb) {
  if (src.includes(`<${shell}`)) return src;

  // Find: export default function X() { ... return (
  const retRe = /export default function \w+\([^)]*\) \{[\s\S]*?\n\s*return\s*\(\s*/;
  const m = src.match(retRe);
  if (!m) {
    console.warn('  ! cannot find return ( — skip wrap');
    return src;
  }

  const insertAt = m.index + m[0].length;
  const props =
    shell === 'MarketingShell'
      ? 'pathname={pathname}'
      : `pathname={pathname} breadcrumb="${breadcrumb}"`;

  let out = src.slice(0, insertAt);
  out += `<${shell} ${props}>\n`;
  const rest = src.slice(insertAt);
  const closeIdx = rest.lastIndexOf(');\n}');
  if (closeIdx === -1) {
    const alt = rest.lastIndexOf(');');
    if (alt === -1) return src;
    out += rest.slice(0, alt);
    out += `\n</${shell}>\n);`;
    out += rest.slice(alt + 2);
  } else {
    out += rest.slice(0, closeIdx);
    out += `\n</${shell}>\n);`;
    out += rest.slice(closeIdx + 2);
  }

  out = out.replace(
    /export default function (\w+)\(([^)]*)\) \{/,
    (full, name, args) => {
      if (out.includes('const { pathname } = useLocation()')) return full;
      return `export default function ${name}(${args}) {\n  const { pathname } = useLocation();`;
    },
  );

  return out;
}

function stripFirstFooter(src) {
  const idx = src.lastIndexOf('<footer');
  if (idx === -1) return { src, stripped: false };
  const end = findMatchingClose(src, idx, 'footer');
  if (end === -1) return { src, stripped: false };
  return { src: src.slice(0, idx) + src.slice(end), stripped: true };
}

function neutralizeLegacyOffsets(src) {
  // After stripping aside, leftover pl-[260px] / ml-sidebar-width would double-pad with shell.
  return src
    .replace(/\bpl-\[260px\]\b/g, 'pl-0')
    .replace(/\bpl-\[280px\]\b/g, 'pl-0')
    .replace(/\bpl-72\b/g, 'pl-0')
    .replace(/\bpl-64\b/g, 'pl-0')
    .replace(/\bpl-sidebar-width\b/g, 'pl-0')
    .replace(/\bml-sidebar-width\b/g, 'ml-0')
    .replace(/\bml-\[240px\]\b/g, 'ml-0')
    .replace(/\bml-\[260px\]\b/g, 'ml-0')
    .replace(/\bleft-\[260px\]\b/g, 'left-0')
    .replace(/\bleft-\[280px\]\b/g, 'left-0')
    .replace(/\bleft-72\b/g, 'left-0')
    .replace(/\bleft-64\b/g, 'left-0')
    .replace(/\bleft-sidebar-width\b/g, 'left-0')
    .replace(/\bw-\[calc\(100%-240px\)\]/g, 'w-full')
    .replace(/\bw-\[calc\(100%-260px\)\]/g, 'w-full')
    .replace(/\bpt-16\b/g, 'pt-0')
    .replace(/\bpt-20\b/g, 'pt-0');
}

function processPage(rel, meta) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.warn('missing', rel);
    return;
  }
  let src = fs.readFileSync(file, 'utf8');
  if (src.includes('data-shell-unified="1"')) {
    console.log('skip (already)', rel);
    return;
  }

  src = fixJsxAttrs(src);

  let aside = stripFirstAside(src);
  src = aside.src;
  if (!aside.stripped) {
    const nav = stripSidebarNav(src);
    src = nav.src;
    aside = nav;
  }

  const header = stripFirstChromeHeader(src);
  src = header.src;

  let footer = { stripped: false };
  if (meta.shell === 'MarketingShell' || meta.shell === 'AdminShell') {
    footer = stripFirstFooter(src);
    src = footer.src;
  }

  src = neutralizeLegacyOffsets(src);
  src = ensureImport(src, meta.shell);
  src = wrapWithShell(src, meta.shell, meta.breadcrumb);

  // mark
  src = src.replace(
    /data-page="([^"]+)"/,
    'data-page="$1" data-shell-unified="1"',
  );

  fs.writeFileSync(file, src);
  console.log(
    `ok ${rel} — aside:${aside.stripped} header:${header.stripped} → ${meta.shell}`,
  );
}

// Fix JSX attrs on ALL pages (even those not wrapped)
function walkFix(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walkFix(p);
    else if (ent.name.endsWith('.jsx')) {
      const before = fs.readFileSync(p, 'utf8');
      const after = fixJsxAttrs(before);
      if (after !== before) {
        fs.writeFileSync(p, after);
        console.log('attrs', path.relative(ROOT, p));
      }
    }
  }
}

walkFix(ROOT);

for (const [rel, meta] of Object.entries(PAGE_SHELL)) {
  processPage(rel, meta);
}

console.log('done');
