import fs from 'fs';
import path from 'path';
import { parseDocument } from 'htmlparser2';

const API_KEY = process.env.STITCH_API_KEY;
if (!API_KEY) {
  console.error('Missing STITCH_API_KEY env var');
  process.exit(1);
}
const PROJECT = '1305752429523066747';
const tmp = 'd:/RikiPath/_stitch_tmp';
const pagesDir = 'd:/RikiPath/src/pages';

fs.mkdirSync(tmp, { recursive: true });

/** @type {{id:string,name:string,route:string,group:string}[]} */
export const BATCH = [
  { id: '1a20bf4874e144a5947640410be57b20', name: 'ExamBuilder', route: '/exam-builder', group: 'cms' },
  { id: 'b80db45bb86f4b80be0e2750f08b47d8', name: 'QuestionBank', route: '/question-bank', group: 'cms' },
  { id: 'bb2faac404574d868ba45295356d9242', name: 'ContentLibrary', route: '/content-library', group: 'cms' },
  { id: '5ab62bde05af4c1eb562f2f66cedb5b6', name: 'MultiColumnDashboard', route: '/multi-dashboard', group: 'learner' },
  { id: 'febdf5ec892640dc8436acae837437a4', name: 'LessonPlayer', route: '/lesson-player', group: 'learner' },
  { id: 'f77ddae68191444cb338d078ff8670ca', name: 'ConsultationPrep', route: '/consultation-prep', group: 'consult' },
  { id: 'b4aa5d88d0334393878e1726a5f57566', name: 'AIScoringResult', route: '/ai-scoring', group: 'learner' },
  { id: 'af1803ca8c534bfc8e666b84ca0c521e', name: 'KanjiNotebook', route: '/kanji-notebook', group: 'learner' },
  { id: '74766e70095b4a70b5e4c9b6cf53fd3b', name: 'CMSStudio', route: '/cms-studio', group: 'cms' },
  { id: 'ad754bbf59bf4ffba02acc08be233c64', name: 'BulkImport', route: '/bulk-import', group: 'cms' },
  { id: '5c814b34fbb04f559be9b91d7c285e9b', name: 'ConsultationCenter', route: '/consultation-center', group: 'consult' },
  { id: '3bf2fd0695564a7b872ea9d43b9dff02', name: 'LessonCMS', route: '/lesson-cms', group: 'cms' },
  { id: '0f3de8ebc98d4fdaa2199b85a813e95b', name: 'VocabularyEditor', route: '/vocabulary-editor', group: 'cms' },
  { id: '28f2fc9d3201423986d8e74481e71f43', name: 'ConsultationRequestDetail', route: '/consultation-request', group: 'consult' },
  { id: 'e62bb93c1e3547ea8909ac11d2031380', name: 'WorkSchedule', route: '/work-schedule', group: 'consult' },
  { id: '7d6af714761f4c6886da6809813f480b', name: 'TextConsultationReply', route: '/consultation-reply', group: 'consult' },
  { id: 'c541200b519d436d923bb67532b95df0', name: 'AuthorDashboard', route: '/author-dashboard', group: 'cms' },
  { id: '75872b870f3743e28414f6ffca083238', name: 'VideoLessonEditor', route: '/video-editor', group: 'cms' },
  { id: 'b0f7257358724f589135c3c700c9f577', name: 'LessonComplete', route: '/lesson-complete', group: 'learner' },
  { id: '77147b7ab1e2470c97822f9a6d59986c', name: 'KanjiEditor', route: '/kanji-editor', group: 'cms' },
];

async function getScreen(id) {
  const res = await fetch('https://stitch.googleapis.com/mcp', {
    method: 'POST',
    headers: {
      'X-Goog-Api-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'get_screen',
        arguments: { name: `projects/${PROJECT}/screens/${id}` },
      },
    }),
  });
  const data = await res.json();
  return data.result.structuredContent;
}

function styleToJsx(styleStr) {
  if (!styleStr?.trim()) return null;
  const entries = styleStr
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':');
      if (i < 0) return null;
      let key = pair.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const val = pair.slice(i + 1).trim();
      return `${key}: ${JSON.stringify(val)}`;
    })
    .filter(Boolean);
  return entries.length ? `{{ ${entries.join(', ')} }}` : null;
}

function convertAttrs(attribs = {}) {
  const parts = [];
  for (const [rawKey, rawVal] of Object.entries(attribs)) {
    let key = rawKey;
    let val = rawVal ?? '';
    if (key === 'class') key = 'className';
    if (key === 'for') key = 'htmlFor';
    if (key === 'tabindex') key = 'tabIndex';
    if (key === 'readonly') key = 'readOnly';
    if (key === 'maxlength') key = 'maxLength';
    if (key === 'autocomplete') key = 'autoComplete';
    if (key === 'stroke-width') key = 'strokeWidth';
    if (key === 'stroke-linecap') key = 'strokeLinecap';
    if (key === 'stroke-linejoin') key = 'strokeLinejoin';
    if (key === 'fill-rule') key = 'fillRule';
    if (key === 'clip-rule') key = 'clipRule';
    if (key === 'xmlns:xlink') continue;
    if (['checked', 'disabled', 'selected', 'required', 'multiple'].includes(key) && (val === '' || val === key)) {
      parts.push(key);
      continue;
    }
    if (key === 'style') {
      const jsxStyle = styleToJsx(val);
      if (jsxStyle) parts.push(`style=${jsxStyle}`);
      continue;
    }
    parts.push(`${key}="${String(val).replace(/\\/g, '\\\\').replace(/"/g, '&quot;')}"`);
  }
  return parts.join(' ');
}

const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

function serialize(node) {
  if (!node) return '';
  if (node.type === 'text') {
    const t = node.data ?? '';
    if (!t.trim()) return t.includes('\n') ? '\n' : t;
    // Escape < and > in text for JSX
    if (/[<>{}]/.test(t) && t.trim()) {
      return `{${JSON.stringify(t)}}`;
    }
    return t
      .replace(/&nbsp;/g, '\u00a0')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '&lt;')
      .replace(/&gt;/g, '&gt;')
      .replace(/&quot;/g, '"');
  }
  if (node.type === 'comment') {
    return `{/* ${String(node.data || '').replace(/\*\//g, '* /')} */}`;
  }
  if (node.type !== 'tag') return '';
  const tag = node.name;
  if (['script', 'style', 'link', 'meta', 'title'].includes(tag)) return '';
  const attrs = convertAttrs(node.attribs);
  const open = attrs ? `<${tag} ${attrs}` : `<${tag}`;
  if (VOID.has(tag)) return `${open} />`;
  const children = (node.children || []).map(serialize).join('');
  return `${open}>${children}</${tag}>`;
}

function htmlToComponent(name, html) {
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*)<\/body>/i);
  let bodyAttrs = {};
  let bodyHtml = html;
  if (bodyMatch) {
    bodyHtml = bodyMatch[2];
    const classM = bodyMatch[1].match(/class="([^"]*)"/);
    if (classM) bodyAttrs.className = classM[1];
  }
  const scripts = [];
  const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = scriptRe.exec(html))) {
    const code = m[1].trim();
    if (code && !code.includes('tailwind.config') && !code.includes('cdn.tailwindcss')) scripts.push(code);
  }
  bodyHtml = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
  const doc = parseDocument(bodyHtml, { decodeEntities: false });
  let inner = (doc.children || []).map(serialize).join('\n');

  // migrate spacing tokens that collide with max-w
  const map = { xs: 'space-xxs', sm: 'space-sm', md: 'space-md', lg: 'space-lg', xl: 'space-xl' };
  const prefixes = 'p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-x|space-y';
  for (const k of ['xl', 'lg', 'md', 'sm', 'xs']) {
    const re = new RegExp(`(?<=(?:^|[\\s"'\\\`:]))(${prefixes})-${k}(?=(?:$|[\\s"'\\\`]))`, 'g');
    inner = inner.replace(re, `$1-${map[k]}`);
  }

  const className = bodyAttrs.className
    ? `${bodyAttrs.className} min-h-screen`
    : 'min-h-screen bg-background text-on-surface antialiased';

  let imports = '';
  let effect = '';
  if (scripts.length) {
    imports = "import { useEffect } from 'react';\n";
    const joined = scripts.join('\n\n');
    effect = `
  useEffect(() => {
    const orig = document.addEventListener.bind(document);
    document.addEventListener = (type, fn, opts) => {
      if (type === 'DOMContentLoaded') {
        try { fn(); } catch (err) { console.warn(err); }
        return;
      }
      return orig(type, fn, opts);
    };
    try {
${joined.split('\n').map((l) => '      ' + l).join('\n')}
    } catch (err) {
      console.warn('Stitch script:', err);
    }
    document.addEventListener = orig;
  }, []);
`;
  }

  return `${imports}export default function ${name}() {${effect}
  return (
    <div className=${JSON.stringify(className)} data-page="${name}">
${inner}
    </div>
  );
}
`;
}

async function main() {
  const results = [];
  for (const item of BATCH) {
    process.stdout.write(`Fetching ${item.name}... `);
    try {
      const screen = await getScreen(item.id);
      const url = screen.htmlCode.downloadUrl;
      const htmlRes = await fetch(url);
      const html = await htmlRes.text();
      fs.writeFileSync(path.join(tmp, `${item.name}.html`), html);
      const jsx = htmlToComponent(item.name, html);
      fs.writeFileSync(path.join(pagesDir, `${item.name}.jsx`), jsx);
      console.log(`OK (${Math.round(jsx.length / 1024)}kb)`);
      results.push({ ...item, ok: true });
    } catch (e) {
      console.log('FAIL', e.message);
      results.push({ ...item, ok: false, error: e.message });
    }
  }
  fs.writeFileSync('d:/RikiPath/_batch_result.json', JSON.stringify(results, null, 2));
  console.log('Done', results.filter((r) => r.ok).length, '/', results.length);
}

main();
