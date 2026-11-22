import {
  BookOpen,
  BookOpenText,
  CalendarDays,
  FileCheck2,
  FileText,
  Headphones,
  Languages,
  Mic,
  PenLine,
  Sparkles,
  SpellCheck,
  UsersRound,
} from 'lucide-react';
import {
  GroupClassIcon,
  JlptRoadmapIcon,
  KanaHiraganaIcon,
  KanjiBrushIcon,
  SrsLoopIcon,
} from './SakuraIcons.js';
import { describeApiError } from '@/api/apiErrors.js';
import { translateTemplate } from '@/locales/locale.js';

/**
 * Classifies an API error into the screen state it should render.
 * 401 → session expired (handled globally), 403 → forbidden (NOT a session problem),
 * 404 → not found, 409 → conflict, offline/timeout → offline, other → error.
 */
export function errorStateKind(error) {
  if (!error) return 'error';
  const info = describeApiError(error);
  if (info.offline) return 'offline';
  if (info.authExpired) return 'expired';
  if (info.status === 403) return 'forbidden';
  if (info.status === 404) return 'notFound';
  if (info.status === 409) return 'conflict';
  return 'error';
}

/** Pastel per-feature tones. Unified lucide-react + domain Sakura SVGs across the app. */
export const FEATURE_TONES = {
  vocabulary: { Icon: Languages, fg: 'text-tone-vocab', bg: 'bg-tone-vocab-bg', label: 'Từ vựng' },
  grammar: { Icon: SpellCheck, fg: 'text-tone-grammar', bg: 'bg-tone-grammar-bg', label: 'Ngữ pháp' },
  kanji: { Icon: KanjiBrushIcon, fg: 'text-tone-kanji', bg: 'bg-tone-kanji-bg', label: 'Hán tự' },
  kana: { Icon: KanaHiraganaIcon, fg: 'text-tone-kanji', bg: 'bg-tone-kanji-bg', label: 'Kana' },
  srs: { Icon: SrsLoopIcon, fg: 'text-tone-vocab', bg: 'bg-tone-vocab-bg', label: 'Ôn tập SRS' },
  roadmap: { Icon: JlptRoadmapIcon, fg: 'text-tone-calendar', bg: 'bg-tone-calendar-bg', label: 'Lộ trình JLPT' },
  group: { Icon: GroupClassIcon, fg: 'text-tone-mentor', bg: 'bg-tone-mentor-bg', label: 'Lớp nhóm' },
  listening: { Icon: Headphones, fg: 'text-tone-listening', bg: 'bg-tone-listening-bg', label: 'Nghe hiểu' },
  reading: { Icon: BookOpenText, fg: 'text-tone-reading', bg: 'bg-tone-reading-bg', label: 'Đọc hiểu' },
  writing: { Icon: PenLine, fg: 'text-tone-writing', bg: 'bg-tone-writing-bg', label: 'Luyện viết' },
  speaking: { Icon: Mic, fg: 'text-tone-speaking', bg: 'bg-tone-speaking-bg', label: 'Luyện nói' },
  mock: { Icon: FileCheck2, fg: 'text-tone-mock', bg: 'bg-tone-mock-bg', label: 'Thi thử' },
  mentor: { Icon: UsersRound, fg: 'text-tone-mentor', bg: 'bg-tone-mentor-bg', label: 'Mentor' },
  calendar: { Icon: CalendarDays, fg: 'text-tone-calendar', bg: 'bg-tone-calendar-bg', label: 'Lịch học' },
  haru: { Icon: Sparkles, fg: 'text-tone-haru', bg: 'bg-tone-haru-bg', label: 'Haru AI' },
  lesson: { Icon: BookOpen, fg: 'text-tone-reading', bg: 'bg-tone-reading-bg', label: 'Bài học' },
  neutral: { Icon: FileText, fg: 'text-tone-neutral', bg: 'bg-tone-neutral-bg', label: '' },
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Validates a file against size/type limits. Returns a Vietnamese error message or ''. */
export function validateUploadFile(file, { maxBytes = MAX_UPLOAD_BYTES, accept = [] } = {}) {
  if (!file) return 'Vui lòng chọn tệp.';
  if (file.size > maxBytes) return translateTemplate('Tệp "{0}" vượt quá {1}.', { 0: file.name, 1: formatBytes(maxBytes) });
  if (file.size === 0) return translateTemplate('Tệp "{0}" đang trống.', { 0: file.name });
  if (accept.length) {
    const name = (file.name || '').toLowerCase();
    const ok = accept.some((rule) => {
      const r = rule.trim().toLowerCase();
      if (r.startsWith('.')) return name.endsWith(r);
      if (r.endsWith('/*')) return (file.type || '').startsWith(r.slice(0, -1));
      return file.type === r;
    });
    if (!ok) return translateTemplate('Định dạng của "{0}" chưa được hỗ trợ.', { 0: file.name });
  }
  return '';
}

function ymdLocal(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export { ymdLocal as ymd };

/** Monday-first month grid; returns 6×7 dates covering `month`. */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

