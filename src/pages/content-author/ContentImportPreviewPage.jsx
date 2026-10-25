import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

import { CmsShell } from '../../components/shells';
import { CONTENT_IMPORT_TYPES } from '../../api/contentImportApi.js';
import {
    usePreviewContentImportMutation,
    useConfirmContentImportMutation,
} from '../../hooks/usePreviewContentImport.js';

const ACTIONS = ['New', 'Modified', 'Unchanged', 'Error'];

const ACTION_META = {
    New: { label: 'Mới', countKey: 'newCount', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', num: 'text-emerald-600' },
    Modified: { label: 'Thay đổi', countKey: 'modifiedCount', badge: 'bg-amber-50 text-amber-800 ring-amber-200', num: 'text-amber-600' },
    Unchanged: { label: 'Không đổi', countKey: 'unchangedCount', badge: 'bg-slate-100 text-slate-600 ring-slate-200', num: 'text-slate-500' },
    Error: { label: 'Đã có', countKey: 'errorCount', badge: 'bg-rose-50 text-rose-700 ring-rose-200', num: 'text-rose-600' },
};

const ENTITY_LABELS = {
    Kanji: 'Hán tự (Kanji)',
    Vocabulary: 'Từ vựng (Vocabulary)',
    Grammar: 'Ngữ pháp (Grammar)',
    Lesson: 'Bài học (Lesson)',
    MockTest: 'Đề thi thử (Mock Test)',
    PracticeExercise: 'Bài tập luyện tập (Practice Exercise)',
    ...Object.fromEntries(CONTENT_IMPORT_TYPES.map((t) => [t.value, t.label])),
};

const FIELD_LABELS = {
    // Kanji
    character: 'Chữ Kanji',
    meaning: 'Nghĩa',
    sinoVietnamese: 'Âm Hán Việt',
    onYomi: 'Âm On',
    kunYomi: 'Âm Kun',
    strokeCount: 'Số nét',
    certificateLevelCode: 'Level',
    certificateLevelId: 'ID Cấp độ',
    lessonTitle: 'Bài học',
    // Vocabulary
    word: 'Từ',
    reading: 'Cách đọc',
    exampleSentence: 'Câu ví dụ',
    exampleSentenceMeaning: 'Nghĩa câu ví dụ',
    audioUrl: 'Audio',
    // Grammar & Lesson
    title: 'Tiêu đề',
    structure: 'Cấu trúc',
    usageNotes: 'Cách dùng',
    description: 'Mô tả',
    languageSkillName: 'Kỹ năng',
    languageSkillCode: 'Mã kỹ năng',
    sortOrder: 'Thứ tự',
    // Mock Test
    mockTestTitle: 'Tên đề thi thử',
    mockTestDescription: 'Mô tả đề thi thử',
    timeLimitMinutes: 'Thời gian làm bài (phút)',
    sections: 'Các phần thi',
    rows: 'Phạm vi dòng',
    // Practice Exercise
    exerciseTitle: 'Tên bài tập',
    exerciseDescription: 'Mô tả bài tập',
    exerciseSortOrder: 'Thứ tự bài tập',
};

const fieldLabel = (key) => FIELD_LABELS[key] ?? key;

/** "giá trị cũ → giá trị mới" (do backend ghép sẵn) -> { from, to }. */
function splitChange(text) {
    if (!text || typeof text !== 'string') return { from: '', to: String(text ?? '') };
    const i = text.indexOf(' → ');
    return i === -1 ? { from: '', to: text } : { from: text.slice(0, i), to: text.slice(i + 3) };
}

function getErrorMessage(err) {
    return (
        err?.response?.data?.errorMessage ??
        err?.data?.errorMessage ??
        err?.errorMessage ??
        err?.message ??
        'Không thể xem trước file này.'
    );
}

function ActionBadge({ action }) {
    const meta = ACTION_META[action];
    return (
        <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${meta?.badge ?? ''}`}
        >
            {meta?.label ?? action}
        </span>
    );
}

/** Component modal/drawer hiển thị so sánh chi tiết giữa Hệ thống (DB) và File Excel */
function DiffModal({ row, entityType, onClose }) {
    if (!row) return null;

    const changes = Object.entries(row.changedFields ?? {});
    const parsedFields = row.parsedFields ?? {};
    const hasChanges = changes.length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
                    <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-100 text-sky-700 font-bold text-base">
                            {row.rowKey?.slice(0, 2) || '#'}
                        </span>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-base font-bold text-slate-900">
                                    So sánh dữ liệu: <span className="text-sky-700">{row.rowKey}</span>
                                </h3>
                                <ActionBadge action={row.action} />
                            </div>
                            <p className="text-xs text-slate-500">
                                Dòng {row.sourceRowNumber} trong file • Sheet {ENTITY_LABELS[entityType] ?? entityType}
                                {row.targetEntityId && (
                                    <span className="ml-2 font-mono text-slate-400">
                                        (Entity ID trong DB: #{row.targetEntityId})
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
                        title="Đóng (Esc)"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Thông báo lỗi nếu có */}
                    {row.errors?.length > 0 && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                            <div className="flex items-center gap-2 text-rose-800 font-semibold text-sm mb-1">
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span>Phát hiện lỗi không thể import:</span>
                            </div>
                            <ul className="list-disc list-inside text-sm text-rose-700 space-y-0.5 pl-2">
                                {row.errors.map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Bảng so sánh 2 cột: Hiện có trong hệ thống (DB) vs File Excel sắp ghi đè */}
                    {hasChanges ? (
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                    <span className="flex h-2 w-2 rounded-full bg-amber-500"></span>
                                    Các trường có sự thay đổi ({changes.length})
                                </h4>
                                <span className="text-xs text-slate-500">
                                    Giá trị từ DB sẽ được cập nhật bằng giá trị từ File Excel
                                </span>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                            <th className="w-36 px-4 py-3">Trường dữ liệu</th>
                                            <th className="px-4 py-3 bg-slate-100/70 border-r border-slate-200 text-slate-700">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-block w-2 h-2 rounded-full bg-slate-400"></span>
                                                    Hiện tại trong DB (Cũ)
                                                </div>
                                            </th>
                                            <th className="px-4 py-3 bg-amber-50/50 text-amber-900">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
                                                    Trong file Excel (Mới)
                                                </div>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {changes.map(([field, changeText]) => {
                                            const { from, to } = splitChange(changeText);
                                            return (
                                                <tr key={field} className="hover:bg-slate-50/50 transition">
                                                    <td className="px-4 py-3 font-semibold text-slate-700 align-top bg-slate-50/40">
                                                        {fieldLabel(field)}
                                                    </td>
                                                    <td className="px-4 py-3 align-top bg-slate-100/40 border-r border-slate-200 font-mono text-xs text-slate-600 break-words whitespace-pre-wrap">
                                                        {from ? (
                                                            <span className="line-through decoration-rose-400 text-slate-500">
                                                                {from}
                                                            </span>
                                                        ) : (
                                                            <span className="italic text-slate-400 font-sans">(Trống)</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 align-top bg-amber-50/20 font-mono text-xs text-amber-900 font-semibold break-words whitespace-pre-wrap">
                                                        {to ? (
                                                            <span className="rounded bg-amber-100/80 px-1.5 py-0.5 text-amber-900">
                                                                {to}
                                                            </span>
                                                        ) : (
                                                            <span className="italic text-slate-400 font-sans">(Trống)</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : row.action === 'New' ? (
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-800">
                            <strong>Mục mới:</strong> Bản ghi này chưa tồn tại trong cơ sở dữ liệu. Sau khi import sẽ được thêm mới toàn bộ.
                        </div>
                    ) : row.action === 'Unchanged' ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                            <strong>Không đổi:</strong> Dữ liệu trong file Excel hoàn toàn trùng khớp với cơ sở dữ liệu hiện tại.
                        </div>
                    ) : null}

                    {/* Toàn bộ dữ liệu được parse từ file Excel */}
                    <div>
                        <h4 className="text-sm font-bold text-slate-800 mb-2">
                            Toàn bộ trường dữ liệu đọc từ file Excel ({Object.keys(parsedFields).length})
                        </h4>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/30 p-4">
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                                {Object.entries(parsedFields).map(([k, v]) => {
                                    const isChanged = changes.some(([chKey]) => chKey === k);
                                    return (
                                        <div
                                            key={k}
                                            className={`rounded-lg p-2.5 border transition ${isChanged
                                                ? 'bg-amber-50/70 border-amber-200'
                                                : 'bg-white border-slate-200'
                                                }`}
                                        >
                                            <dt className="text-slate-500 font-medium flex items-center justify-between">
                                                <span>{fieldLabel(k)}</span>
                                                {isChanged && (
                                                    <span className="text-[10px] font-semibold text-amber-700 uppercase bg-amber-100 rounded px-1">
                                                        Đổi
                                                    </span>
                                                )}
                                            </dt>
                                            <dd className="mt-1 font-mono text-slate-800 break-words whitespace-pre-wrap font-semibold">
                                                {v !== null && v !== undefined && String(v) !== '' ? (
                                                    String(v)
                                                ) : (
                                                    <span className="text-slate-400 italic font-sans font-normal">(Trống)</span>
                                                )}
                                            </dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        </div>
                    </div>

                    {/* Hiển thị chi tiết cấu trúc Sections/Questions đối với MockTest & PracticeExercise */}
                    {(() => {
                        let parsedPayload = null;
                        if (typeof row.payloadJson === 'string') {
                            try {
                                parsedPayload = JSON.parse(row.payloadJson);
                            } catch {
                                parsedPayload = null;
                            }
                        }
                        if (!parsedPayload) return null;

                        const sections = parsedPayload.Sections ?? (parsedPayload.Questions ? [{ Title: 'Danh sách câu hỏi', Questions: parsedPayload.Questions }] : []);
                        if (!Array.isArray(sections) || sections.length === 0) return null;

                        const totalQuestions = sections.reduce((sum, sec) => sum + (sec.Questions?.length ?? 0), 0);

                        return (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                        </svg>
                                        Nội dung đề/bài tập chi tiết ({sections.length} phần · {totalQuestions} câu hỏi)
                                    </h4>
                                    <span className="text-xs text-slate-500">
                                        Trích xuất từ Payload JSON tạo bản nháp
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    {sections.map((section, sIdx) => (
                                        <div key={sIdx} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
                                            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                                                <div className="font-semibold text-slate-800 text-xs flex items-center gap-2">
                                                    <span className="flex h-5 w-5 items-center justify-center rounded bg-sky-100 text-sky-700 text-[11px] font-bold">
                                                        {sIdx + 1}
                                                    </span>
                                                    <span>{section.Title || `Phần ${sIdx + 1}`}</span>
                                                    {section.LanguageSkillName && (
                                                        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                                            {section.LanguageSkillName}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-slate-400">
                                                    {section.Questions?.length ?? 0} câu
                                                </span>
                                            </div>

                                            <div className="space-y-2.5">
                                                {(section.Questions ?? []).map((q, qIdx) => (
                                                    <div key={qIdx} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 text-xs space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="font-semibold text-slate-900 leading-snug">
                                                                <span className="text-sky-600 mr-1.5">Câu {q.SortOrder ?? (qIdx + 1)}:</span>
                                                                {q.QuestionText}
                                                            </div>
                                                            {q.AudioUrl && (
                                                                <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700 shrink-0">
                                                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                                                    </svg>
                                                                    Audio
                                                                </span>
                                                            )}
                                                        </div>

                                                        {Array.isArray(q.Options) && q.Options.length > 0 && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                                                                {q.Options.map((opt, oIdx) => (
                                                                    <div
                                                                        key={oIdx}
                                                                        className={`flex items-center justify-between rounded-md px-2.5 py-1.5 border text-[11px] ${opt.IsCorrect
                                                                            ? 'border-emerald-300 bg-emerald-50/80 font-bold text-emerald-800'
                                                                            : 'border-slate-200 bg-white text-slate-700'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${opt.IsCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                                                {String.fromCharCode(65 + oIdx)}
                                                                            </span>
                                                                            <span>{opt.OptionText}</span>
                                                                        </div>
                                                                        {opt.IsCorrect && (
                                                                            <span className="text-[10px] text-emerald-600 font-bold uppercase">
                                                                                Đáp án
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {q.Explanation && (
                                                            <div className="text-[11px] text-slate-500 bg-white rounded p-1.5 border border-slate-100">
                                                                <strong className="text-slate-600">Giải thích:</strong> {q.Explanation}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end border-t border-slate-200 px-6 py-3 bg-slate-50">
                    <button
                        onClick={onClose}
                        className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition"
                    >
                        Đóng
                    </button>
                </div>
            </div>
        </div>
    );
}

/** Hiển thị tóm tắt ngắn gọn các trường đã thay đổi trong cột Chi tiết */
function RowDetail({ row, onOpenDiff }) {
    const changes = Object.entries(row.changedFields ?? {});
    const fields = Object.entries(row.parsedFields ?? {}).filter(([, v]) => v);

    return (
        <div className="space-y-2 text-sm">
            {/* Danh sách lỗi nếu có */}
            {row.errors?.length > 0 && (
                <ul className="space-y-1 text-rose-700">
                    {row.errors.map((e, i) => (
                        <li key={i} className="flex gap-1.5 items-start">
                            <span className="text-rose-500 font-bold leading-none mt-1">•</span>
                            <span className="text-xs font-medium">{e}</span>
                        </li>
                    ))}
                </ul>
            )}

            {/* Khối so sánh nhanh: Cũ (DB) -> Mới (Excel) */}
            {changes.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 text-xs">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="font-semibold text-amber-900 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            So sánh DB ➔ Excel ({changes.length} thay đổi):
                        </span>
                        {onOpenDiff && (
                            <button
                                type="button"
                                onClick={onOpenDiff}
                                className="font-bold text-sky-700 hover:text-sky-900 hover:underline inline-flex items-center gap-1"
                            >
                                So sánh đầy đủ
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </button>
                        )}
                    </div>
                    <div className="space-y-1.5">
                        {changes.map(([field, text]) => {
                            const { from, to } = splitChange(text);
                            return (
                                <div key={field} className="grid grid-cols-[100px_1fr] items-start gap-1">
                                    <span className="font-medium text-slate-600 truncate" title={fieldLabel(field)}>
                                        {fieldLabel(field)}:
                                    </span>
                                    <div className="flex flex-wrap items-baseline gap-1 break-words">
                                        <span className="rounded bg-slate-200/70 px-1 py-0.5 text-slate-500 line-through">
                                            {from || '(trống)'}
                                        </span>
                                        <span className="text-amber-600 font-bold">➔</span>
                                        <span className="rounded bg-amber-100 px-1 py-0.5 font-semibold text-amber-900">
                                            {to || '(trống)'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Chi tiết dữ liệu đọc từ file */}
            {fields.length > 0 && changes.length === 0 && (
                <div className="flex items-center gap-3">
                    <details className="group">
                        <summary className="cursor-pointer text-xs text-slate-500 hover:text-slate-700 select-none">
                            Xem dữ liệu trong file ({fields.length} trường)
                        </summary>
                        <dl className="mt-1.5 grid grid-cols-[max-content_1fr] gap-x-3 gap-y-0.5 text-xs bg-slate-50 p-2 rounded border border-slate-100">
                            {fields.map(([k, v]) => (
                                <div key={k} className="contents">
                                    <dt className="text-slate-500 font-medium">{fieldLabel(k)}:</dt>
                                    <dd className="break-words text-slate-800 font-mono">{String(v)}</dd>
                                </div>
                            ))}
                        </dl>
                    </details>
                    {onOpenDiff && (
                        <button
                            type="button"
                            onClick={onOpenDiff}
                            className="text-xs text-sky-600 hover:text-sky-800 hover:underline"
                        >
                            Xem chi tiết
                        </button>
                    )}
                </div>
            )}

            {row.action === 'Unchanged' && (
                <p className="text-xs text-slate-500">Đã có trong cơ sở dữ liệu, giá trị giống hệt trong file Excel.</p>
            )}
        </div>
    );
}

function SummaryCard({ action, value, active, onClick }) {
    const meta = ACTION_META[action];
    return (
        <button
            type="button"
            onClick={onClick}
            className={`text-left rounded-xl border p-4 transition-all ${active
                ? 'border-sky-500 ring-2 ring-sky-200 bg-white shadow-sm'
                : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500">{meta.label}</span>
                <span className={`h-2.5 w-2.5 rounded-full ${action === 'New'
                    ? 'bg-emerald-500'
                    : action === 'Modified'
                        ? 'bg-amber-500'
                        : action === 'Error'
                            ? 'bg-rose-500'
                            : 'bg-slate-400'
                    }`} />
            </div>
            <div className={`mt-1.5 text-2xl font-bold tabular-nums ${meta.num}`}>{value ?? 0}</div>
        </button>
    );
}

export default function ContentImportPreviewPage() {
    const { pathname } = useLocation();
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [entityType, setEntityType] = useState(''); // '' = Bulk (mọi sheet)
    const [fileError, setFileError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [activeSheet, setActiveSheet] = useState(0);
    const [actionFilter, setActionFilter] = useState('All');
    const [selectedDiffRow, setSelectedDiffRow] = useState(null);

    const preview = usePreviewContentImportMutation();
    const confirmImport = useConfirmContentImportMutation();
    const [confirmResult, setConfirmResult] = useState(null);
    const [confirmError, setConfirmError] = useState('');

    function handleConfirmImport() {
        if (!result || !file || confirmableRows.length === 0 || confirmImport.isPending) return;
        const ok = window.confirm(
            `Xác nhận gửi ${confirmableRows.length} dòng hợp lệ để tạo bản nháp chờ Admin duyệt? Các dòng “Đã có”/lỗi và “Không đổi” sẽ không được gửi.`
        );
        if (!ok) return;

        setConfirmError('');
        setConfirmResult(null);
        confirmImport.mutate(
            {
                sourceFileName: result.fileName || file.name,
                rows: confirmableRows,
            },
            {
                onSuccess: (data) => setConfirmResult(data?.result ?? data),
                onError: (err) => setConfirmError(getErrorMessage(err)),
            }
        );
    }

    // Unwrap response an toàn: hỗ trợ cả { isSuccess, result } lẫn trực tiếp result
    const rawData = preview.data;
    const result = rawData?.result ?? rawData;
    const sheets = result?.sheets ?? [];
    const sheet = sheets[activeSheet];

    const totals = Object.fromEntries(
        ACTIONS.map((a) => [a, sheets.reduce((sum, s) => sum + (s[ACTION_META[a].countKey] ?? 0), 0)])
    );

    const visibleRows = (sheet?.rows ?? []).filter((r) => actionFilter === 'All' || r.action === actionFilter);

    const confirmableRows = sheets.flatMap((s) =>
        (s.rows ?? [])
            .filter((row) =>
                (row.action === 'New' || row.action === 'Modified') &&
                typeof row.payloadJson === 'string' &&
                row.payloadJson.length > 0
            )
            .map((row) => ({
                entityType: s.entityType,
                action: row.action,
                targetEntityId: row.targetEntityId ?? 0,
                rowKey: row.rowKey ?? '',
                sourceRowNumber: row.sourceRowNumber ?? 0,
                payloadJson: row.payloadJson,
                changedFields: row.changedFields ?? {},
            }))
    );

    function pickFile(f) {
        preview.reset();
        confirmImport.reset();
        setConfirmResult(null);
        setConfirmError('');
        setFileError('');
        if (!f) return setFile(null);
        if (!/\.xlsx$/i.test(f.name)) {
            setFile(null);
            return setFileError('Chỉ hỗ trợ file Excel .xlsx.');
        }
        setFile(f);
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!file) return;
        preview.mutate(
            { file, entityType },
            {
                onSuccess: () => {
                    setActiveSheet(0);
                    setActionFilter('All');
                },
            }
        );
    }

    return (
        <CmsShell pathname={pathname} breadcrumb="Xem trước import">
        <div className="mx-auto max-w-6xl space-y-6 px-6 py-7 sm:px-8">
            <header>
                <h1 className="text-[22px] font-medium tracking-tight text-[#2D282A]">Xem trước import</h1>
                <p className="mt-1 text-[13px] text-[#967F8A]">
                    Tải file .xlsx để đối chiếu. Bước này chưa ghi vào kho.
                </p>
            </header>

            {/* ---- Upload Card ---- */}
            <form onSubmit={handleSubmit} className="rounded-xl border border-[#E8DFDC] bg-white p-5">
                <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => inputRef.current?.click()}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
                        onDragOver={(e) => {
                            e.preventDefault();
                            setDragOver(true);
                        }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            pickFile(e.dataTransfer.files?.[0]);
                        }}
                        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${dragOver ? 'border-[#AD3155] bg-[#FFF7F9]' : 'border-[#E8DFDC] bg-[#FBF8F7]'
                            }`}
                    >
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".xlsx"
                            className="hidden"
                            onChange={(e) => {
                                pickFile(e.target.files?.[0]);
                                e.target.value = '';
                            }}
                        />
                        {file ? (
                            <div className="flex flex-col items-center">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-1">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                                <div className="text-sm font-semibold text-slate-900">{file.name}</div>
                                <div className="mt-0.5 text-xs text-slate-500">{(file.size / 1024).toFixed(0)} KB · Bấm để đổi file khác</div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600 mb-1">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <div className="text-sm font-medium text-slate-700">Kéo thả file .xlsx vào đây</div>
                                <div className="mt-0.5 text-xs text-slate-500">hoặc bấm vào khung để duyệt file từ máy tính</div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col justify-between gap-3">
                        <label className="text-sm">
                            <span className="mb-1 block font-medium text-slate-700">Loại nội dung</span>
                            <select
                                value={entityType}
                                onChange={(e) => {
                                    setEntityType(e.target.value);
                                    preview.reset();
                                }}
                                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
                            >
                                <option value="">Tất cả sheet trong file</option>
                                {CONTENT_IMPORT_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        Chỉ {t.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <button
                            type="submit"
                            disabled={!file || preview.isPending}
                            className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-sm"
                        >
                            {preview.isPending ? 'Đang kiểm tra & so sánh…' : 'Xem trước & So sánh'}
                        </button>
                    </div>
                </div>

                {(fileError || preview.isError) && (
                    <div role="alert" className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                        {fileError || getErrorMessage(preview.error)}
                    </div>
                )}
            </form>

            {/* ---- Kết quả & So sánh ---- */}
            {result && (
                <section className="space-y-5 animate-fade-in">
                    {/* Header kết quả */}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                                <h2 className="text-base font-bold text-slate-900">
                                    Kết quả kiểm tra: <span className="text-sky-700">{result.fileName}</span>
                                </h2>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Tổng số {sheets.length} sheet được phân tích • Mã xem trước: <span className="font-mono">{result.previewId?.slice(0, 8)}</span>
                            </p>
                        </div>
                        <span className="inline-flex items-center rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">
                            Chưa lưu vào DB
                        </span>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {ACTIONS.map((a) => (
                            <SummaryCard
                                key={a}
                                action={a}
                                value={totals[a]}
                                active={actionFilter === a}
                                onClick={() => setActionFilter(actionFilter === a ? 'All' : a)}
                            />
                        ))}
                    </div>

                    {/* Xác nhận gửi các dòng mới/thay đổi hợp lệ đến API confirm */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Xác nhận import</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    {confirmableRows.length} dòng Mới/Thay đổi có payload hợp lệ sẽ được gửi tạo bản nháp.
                                    Các dòng Đã có/lỗi và Không đổi được bỏ qua.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleConfirmImport}
                                disabled={confirmableRows.length === 0 || confirmImport.isPending || !file}
                                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {confirmImport.isPending ? 'Đang xác nhận…' : 'Xác nhận & tạo bản nháp'}
                            </button>
                        </div>
                        {confirmError && (
                            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {confirmError}
                            </div>
                        )}
                        {confirmResult && (
                            <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                                <p className="font-semibold">Đã gửi yêu cầu xác nhận import thành công.</p>
                                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                                    <span>Mã batch: <code>{confirmResult.batchId ?? '—'}</code></span>
                                    <span>Bản nháp tạo: <strong>{confirmResult.draftsCreatedCount ?? 0}</strong></span>
                                    <span>Bỏ qua: <strong>{confirmResult.skippedCount ?? 0}</strong></span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Tabs chuyển đổi giữa các sheet (Kanji, Vocabulary, Grammar, Lesson,...) */}
                    <div role="tablist" className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
                        {sheets.map((s, i) => {
                            const isSelected = i === activeSheet;
                            return (
                                <button
                                    key={s.sheetName}
                                    role="tab"
                                    aria-selected={isSelected}
                                    onClick={() => {
                                        setActiveSheet(i);
                                        setActionFilter('All');
                                    }}
                                    className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition-all border-b-2 ${isSelected
                                        ? 'border-sky-600 bg-sky-50/50 text-sky-800 border-b-2'
                                        : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                        }`}
                                >
                                    <span>{ENTITY_LABELS[s.entityType] ?? s.sheetName}</span>
                                    <span className={`rounded-full px-2 py-0.5 text-xs ${isSelected ? 'bg-sky-200/70 text-sky-800' : 'bg-slate-100 text-slate-600'}`}>
                                        {s.totalRows}
                                    </span>
                                    {s.errorCount > 0 && (
                                        <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-700">
                                            {s.errorCount} đã có
                                        </span>
                                    )}
                                    {s.modifiedCount > 0 && (
                                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">
                                            {s.modifiedCount} đổi
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Sheet chi tiết */}
                    {sheet && (
                        <div className="space-y-3">
                            {/* Bộ lọc trạng thái */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-2">
                                    {['All', ...ACTIONS].map((a) => {
                                        const count = a === 'All' ? sheet.totalRows : sheet[ACTION_META[a].countKey];
                                        const active = actionFilter === a;
                                        return (
                                            <button
                                                key={a}
                                                aria-pressed={active}
                                                onClick={() => setActionFilter(a)}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${active
                                                    ? 'bg-slate-900 text-white ring-slate-900'
                                                    : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {a === 'All' ? 'Tất cả' : ACTION_META[a].label} · {count}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="text-xs text-slate-500">
                                    Đang hiển thị {visibleRows.length}/{sheet.totalRows} dòng
                                </div>
                            </div>

                            {/* Bảng so sánh dữ liệu */}
                            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
                                            <tr>
                                                <th className="w-16 px-4 py-3 text-center">Dòng</th>
                                                <th className="w-44 px-4 py-3">Mã / Khóa</th>
                                                <th className="w-28 px-4 py-3">Trạng thái</th>
                                                <th className="px-4 py-3">So sánh DB ➔ File Excel / Chi tiết</th>
                                                <th className="w-24 px-4 py-3 text-right">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {visibleRows.map((row) => {
                                                const isModified = row.action === 'Modified';
                                                const isError = row.action === 'Error';
                                                return (
                                                    <tr
                                                        key={row.sourceRowNumber}
                                                        className={`transition-colors ${isError
                                                            ? 'bg-rose-50/30 hover:bg-rose-50/50'
                                                            : isModified
                                                                ? 'bg-amber-50/20 hover:bg-amber-50/40'
                                                                : 'hover:bg-slate-50/60'
                                                            }`}
                                                    >
                                                        <td className="px-4 py-3.5 align-top text-center tabular-nums text-xs font-mono text-slate-400">
                                                            {row.sourceRowNumber}
                                                        </td>
                                                        <td className="px-4 py-3.5 align-top">
                                                            <div className="font-bold text-slate-900 break-words text-base">
                                                                {row.rowKey}
                                                            </div>
                                                            {row.targetEntityId && (
                                                                <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                                    ID #{row.targetEntityId}
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3.5 align-top">
                                                            <ActionBadge action={row.action} />
                                                        </td>
                                                        <td className="px-4 py-3.5 align-top">
                                                            <RowDetail
                                                                row={row}
                                                                onOpenDiff={() => setSelectedDiffRow(row)}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3.5 align-top text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedDiffRow(row)}
                                                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-700 shadow-2xs"
                                                            >
                                                                So sánh
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {visibleRows.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                                                        Không có dòng nào phù hợp với bộ lọc này.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* Modal so sánh đối chiếu chi tiết */}
            {selectedDiffRow && (
                <DiffModal
                    row={selectedDiffRow}
                    entityType={sheet?.entityType}
                    onClose={() => setSelectedDiffRow(null)}
                />
            )}
        </div>
        </CmsShell>
    );
}
