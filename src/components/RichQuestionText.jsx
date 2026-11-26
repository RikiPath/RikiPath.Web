import { createElement } from 'react';
import { renderRichQuestionText } from '@/utils/richQuestionHtml.js';

/**
 * Shared safe HTML/Japanese markup renderer for exam, practice, placement, review, and authoring previews.
 * Parses strings via htmlparser2 against a strict tag whitelist — never uses `dangerouslySetInnerHTML`,
 * strips dangerous tags/events, and renders `<u>`, `<b>`, `<i>`, `<br>`, `<ruby>`, `<rt>`, tables, and lists cleanly.
 */
export default function RichQuestionText({
  text,
  as: Wrapper = 'span',
  className = '',
  fallback = '',
}) {
  const raw = text == null ? '' : String(text);
  if (!raw) {
    return fallback ? createElement(Wrapper, { className }, fallback) : null;
  }
  return createElement(Wrapper, { className }, renderRichQuestionText(raw));
}
