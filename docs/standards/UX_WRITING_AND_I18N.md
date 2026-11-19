# UX writing & i18n (vi-VN, ja-JP)

## How localization works in RikiPath.Web

- `useLocale()` (`src/locales/locale.js`) returns `{ locale, setLocale, t, tr, trf, fmt }`.
  - `tr('Câu tiếng Việt')` — the Vietnamese source string is the key; Japanese comes from the dictionaries.
  - `trf('Còn {count} chỗ trống', { count })` — templates with named placeholders. The JA entry carries its own
    word order (`'残り{count}席'`). **Never build a sentence by concatenating translated fragments.**
  - `t('key')` — keyed copy for auth screens (`copy` table in `locale.js`).
  - `fmt` (`src/locales/format.js`) — `date`, `time`, `dateTime`, `weekdayDate`, `weekday`, `monthYear`,
    `number`, `percent`, `currency` (VND), `duration`, `relative`. Schedules are always shown in
    `Asia/Ho_Chi_Minh`; changing language never changes a time zone or an event's time.
- Japanese dictionaries: `src/locales/ja/*.js`, registered in `ja/index.js` (lookup order: `ui.ja` in
  `locale.js` → `ja/appCore` → `ja/errors` → `ja/landing` → `ja/workspace` → `learnerRest`).
  One area per file; **a key may exist in only one dictionary.**
- Locale switches live (window event `rikipath-locale`): no reload, no remount, form state and route are kept.
  Every component reading text must call `useLocale()` (or `translateText` outside React).
- Non-React code (toasts, error mapping) stays in Vietnamese source text and is translated at display time:
  `feedbackStore` and `SmartDataBoundary` call `translateText`. `src/api/apiErrors.js` maps **stable backend
  error codes** to Vietnamese messages; every message there must have a `ja/errors.js` entry.

## Tooling

- `node scripts/check-locales.mjs --strict` — fails on a `tr`/`trf` literal or nav label without Japanese, or a key
  duplicated across `src/locales/ja/*.js`.
- `node scripts/i18n-codemod.mjs extract <files…>` — lists Vietnamese strings (JSX text, display attributes, rendered
  literals, display templates) that still lack a JA entry.
- `node scripts/i18n-codemod.mjs apply <files…>` — wraps JSX text/attributes/rendered literals in `tr()`, turns
  "text {expr} text" elements into one `trf('… {0} …', { 0: expr })`, adds `useLocale()` to components.
- `node scripts/i18n-codemod.mjs templates <files…>` — converts display template literals (`` `Buổi ${n}` ``) to
  `trf`/`translateTemplate`; `templates-all` converts every Vietnamese template in files you have checked are
  display-only. Neither touches API payloads, keys or URLs in `templates` mode.
- Dictionaries by area: `appCore`, `errors`, `landing`, `workspace` (nav + calendar), `groupLearning`, `courses`,
  `mentor`, `admin`, `author`, `publicPages`, `learnerScreens`, `templates`.

## Rules for every new screen / feature

1. No hard-coded user-facing text outside `tr()` / `trf()` / `t()`; add the JA entry in the same change.
2. Dynamic values go through `trf` placeholders and `fmt` — never `toLocaleString('vi-VN')` in components.
3. Errors: map by `errorCode`, never by raw exception text; unknown codes fall back to the HTTP-status message.
   401/403 are not purchase prompts; 500 is not an empty state; never show success when the API failed.
4. Do not show internal ids, UUIDs, QA codes or stack traces in primary UI; keep correlation ids under
   "Chi tiết hỗ trợ" (support details).
5. Every data view handles: initial loading, background refresh, empty, error (with retry), offline,
   unauthorized/forbidden, not entitled, conflict.
6. Layout must survive longer Japanese labels: no fixed widths on labels/buttons, no `truncate` on essential
   text without a way to read it all, no blanket `whitespace-nowrap`.
7. Run the dictionary check before merging (no missing JA for `tr()` literals, no duplicate keys).
8. Never hard-code `'vi-VN'` for display formatting: use `fmt` (in components) or `currentIntlTag()` (helpers).
   `toLocaleLowerCase('vi-VN')` for search matching is fine. Module-level `Intl` formatters must be lazy
   (`{ format: (v) => new Intl.DateTimeFormat(currentIntlTag(), opts).format(v) }`) so a language switch applies.
9. Never build a display name from an id ("Lớp #12"); use the name the API provides (cohort/course/plan name).
10. Learning content is not UI copy: Vietnamese meanings of Japanese study items and example-sentence translations
    are not added to the dictionaries.
11. Developer-only details (provider names, IAM, localhost URLs, "Backend không có API…") never appear in messages.

## Vietnamese voice

Short, polite, specific: "Đã nộp bài tập thành công." · "Không thể kết nối đến hệ thống. Vui lòng thử lại."
Explain what happened and what to do next. Avoid jargon (`entitlement`, `cohort id`), abbreviations such as
"BTVN" in UI, and English status words.

## Japanese voice

です・ます調, product-education register, natural rather than literal:
"ログインしました。" · "宿題を提出しました。" · "授業スケジュールを更新しました。" ·
"サーバーに接続できません。しばらくしてからもう一度お試しください。"
Use terminology from `PRODUCT_TERMINOLOGY.md`; full-width punctuation （）「」、。; half-width digits.
