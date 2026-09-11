import fs from 'fs';
import path from 'path';
import { parseDocument } from 'htmlparser2';

const API_KEY = process.env.STITCH_API_KEY;
if (!API_KEY) {
  console.error('Missing STITCH_API_KEY env var');
  process.exit(1);
}
const PROJECT = '1305752429523066747';
const pagesDir = 'd:/RikiPath/src/pages';

const BATCH = [
  { id: '0ff1a9dc0f45419492fe159d0d4e5245', name: 'AdminOverview', route: '/admin', group: 'admin' },
  { id: '6b764292fc5449d7abaf9241b44135ef', name: 'AdminUsers', route: '/admin/users', group: 'admin' },
  { id: 'fb391a800acf4af8baab51ef0a67ca4a', name: 'AdminRoles', route: '/admin/roles', group: 'admin' },
  { id: 'ce343d2ca3894ef6a0f5cacad165a4dc', name: 'AdminContentReview', route: '/admin/content-review', group: 'admin' },
];

function styleToJsx(styleStr) {
  if (!styleStr?.trim()) return null;
  const entries = styleStr.split(';').map((s) => s.trim()).filter(Boolean).map((pair) => {
    const i = pair.indexOf(':');
    if (i < 0) return null;
    const key = pair.slice(0, i).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return `${key}: ${JSON.stringify(pair.slice(i + 1).trim())}`;
  }).filter(Boolean);
  return entries.length ? `{{ ${entries.join(', ')} }}` : null;
}
function convertAttrs(attribs = {}) {
  const parts = [];
  for (const [rawKey, rawVal] of Object.entries(attribs)) {
    let key = rawKey; let val = rawVal ?? '';
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
    if (['checked','disabled','selected','required','multiple'].includes(key) && (val === '' || val === key)) { parts.push(key); continue; }
    if (key === 'style') { const jsxStyle = styleToJsx(val); if (jsxStyle) parts.push(`style=${jsxStyle}`); continue; }
    parts.push(`${key}="${String(val).replace(/\\/g,'\\\\').replace(/"/g,'&quot;')}"`);
  }
  return parts.join(' ');
}
const VOID = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
function serialize(node) {
  if (!node) return '';
  if (node.type === 'text') {
    const t = node.data ?? '';
    if (!t.trim()) return t.includes('\n') ? '\n' : t;
    if (/[<>{}]/.test(t) && t.trim()) return `{${JSON.stringify(t)}}`;
    return t.replace(/&nbsp;/g,'\u00a0').replace(/&amp;/g,'&');
  }
  if (node.type === 'comment') return `{/* ${String(node.data||'').replace(/\*\//g,'* /')} */}`;
  if (node.type !== 'tag') return '';
  const tag = node.name;
  if (['script','style','link','meta','title'].includes(tag)) return '';
  const attrs = convertAttrs(node.attribs);
  const open = attrs ? `<${tag} ${attrs}` : `<${tag}`;
  if (VOID.has(tag)) return `${open} />`;
  return `${open}>${(node.children||[]).map(serialize).join('')}</${tag}>`;
}
function htmlToComponent(name, html) {
  const bodyMatch = html.match(/<body([^>]*)>([\s\S]*)<\/body>/i);
  let bodyHtml = html; let className = 'min-h-screen bg-background text-on-surface antialiased';
  if (bodyMatch) {
    bodyHtml = bodyMatch[2];
    const classM = bodyMatch[1].match(/class="([^"]*)"/);
    if (classM) className = `${classM[1]} min-h-screen`;
  }
  const scripts = [];
  const scriptRe = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m; while ((m = scriptRe.exec(html))) {
    const code = m[1].trim();
    if (code && !code.includes('tailwind.config') && !code.includes('cdn.tailwindcss')) scripts.push(code);
  }
  bodyHtml = bodyHtml.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'');
  let inner = (parseDocument(bodyHtml,{decodeEntities:false}).children||[]).map(serialize).join('\n');
  const map = { xs:'space-xxs', sm:'space-sm', md:'space-md', lg:'space-lg', xl:'space-xl' };
  const prefixes = 'p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|space-x|space-y';
  for (const k of ['xl','lg','md','sm','xs']) {
    inner = inner.replace(new RegExp(`(?<=(?:^|[\\s"'\\\`:]))(${prefixes})-${k}(?=(?:$|[\\s"'\\\`]))`,'g'), `$1-${map[k]}`);
  }
  let imports = ''; let effect = '';
  if (scripts.length) {
    imports = "import { useEffect } from 'react';\n";
    const joined = scripts.join('\n\n');
    effect = `\n  useEffect(() => {\n    const orig = document.addEventListener.bind(document);\n    document.addEventListener = (type, fn, opts) => {\n      if (type === 'DOMContentLoaded') { try { fn(); } catch (err) { console.warn(err); } return; }\n      return orig(type, fn, opts);\n    };\n    try {\n${joined.split('\n').map(l=>'      '+l).join('\n')}\n    } catch (err) { console.warn('Stitch script:', err); }\n    document.addEventListener = orig;\n  }, []);\n`;
  }
  return `${imports}export default function ${name}() {${effect}\n  return (\n    <div className=${JSON.stringify(className)} data-page="${name}">\n${inner}\n    </div>\n  );\n}\n`;
}

async function getScreen(id) {
  const res = await fetch('https://stitch.googleapis.com/mcp', {
    method: 'POST',
    headers: { 'X-Goog-Api-Key': API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'tools/call',
      params: { name: 'get_screen', arguments: { name: `projects/${PROJECT}/screens/${id}` } },
    }),
  });
  const data = await res.json();
  return data.result?.structuredContent;
}

async function sleep(ms){return new Promise(r=>setTimeout(r,ms))}

for (const item of BATCH) {
  for (let attempt=1; attempt<=3; attempt++) {
    try {
      console.log('Fetch', item.name, 'attempt', attempt);
      await sleep(800*attempt);
      const screen = await getScreen(item.id);
      if (!screen?.htmlCode?.downloadUrl) throw new Error('no html');
      const html = await (await fetch(screen.htmlCode.downloadUrl)).text();
      fs.writeFileSync(path.join(pagesDir, `${item.name}.jsx`), htmlToComponent(item.name, html));
      console.log('OK', item.name);
      break;
    } catch (e) {
      console.log('fail', e.message);
    }
  }
}
console.log(JSON.stringify(BATCH.map(b=>({name:b.name,route:b.route}))));
