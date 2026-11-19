import AudioTranscriptPanel from '../../components/AudioTranscriptPanel.jsx';
import { useRef, useState } from 'react';
import { Link, useLocation, useMatch, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext.jsx';
import AuthorImportHistory from './AuthorImportHistory.jsx';
import WorkbookPreview, { workbookEditKey } from './WorkbookPreview.jsx';

import { CmsShell } from '../../components/shells';
import {
    CONTENT_IMPORT_TYPES, editExcelWorkbook, getMyAudioUploads, previewExcelWorkbook, submitAuthorImportBatch, uploadListeningAudio,
} from '../../api/contentImportApi.js';
import {
    usePreviewContentImportMutation,
    useConfirmContentImportMutation,
} from '../../hooks/usePreviewContentImport.js';

const ACTIONS = ['New', 'Modified', 'Unchanged', 'Error'];

const ACTION_META = {
    New: { label: 'Mới', countKey: 'newCount', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200', num: 'text-emerald-600' },
    Modified: { label: 'Thay đổi', countKey: 'modifiedCount', badge: 'bg-amber-50 text-amber-800 ring-amber-200', num: 'text-amber-600' },
    Unchanged: { label: 'Không đổi', countKey: 'unchangedCount', badge: 'bg-slate-100 text-slate-600 ring-slate-200', num: 'text-slate-500' },
    Error: { label: 'Lỗi dữ liệu', countKey: 'errorCount', badge: 'bg-rose-50 text-rose-700 ring-rose-200', num: 'text-rose-600' },
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

                                                        {q.InteractionData?.jlptItemType && <p className="font-medium text-sky-700">{q.InteractionData.jlptItemType}</p>}
                                                        {q.InteractionData?.passage && <p className="whitespace-pre-wrap">{q.InteractionData.passage}</p>}
                                                        {q.InteractionData?.secondPassage && <p className="whitespace-pre-wrap">{q.InteractionData.secondPassage}</p>}
                                                        {q.InteractionData?.starPosition && <p>Vị trí ★ · {q.InteractionData.starPosition}</p>}
                                                        {q.ImageUrl && <img src={q.ImageUrl} alt="Ảnh câu hỏi" className="max-h-40 max-w-full rounded-md object-contain" />}
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
                                                                            <span>{opt.OptionText}
                                                                                {(opt.ImageUrl ?? opt.imageUrl) && <img src={opt.ImageUrl ?? opt.imageUrl} alt="Hình đáp án" className="max-h-32 max-w-full rounded-md" />}
                                                                            </span>
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

function ListeningAudioUpload() {
    const { user } = useAuth();
    const client = useQueryClient();
    const savedUploads = useQuery({
        queryKey: ['content-audio-uploads', user?.userId],
        queryFn: getMyAudioUploads, enabled: Boolean(user?.userId), retry: false,
    });
    const [showFormats, setShowFormats] = useState(false);
    const formatLookup = useQuery({
        queryKey: ['manual-content-lookups'],
        queryFn: () => api.get('/content-author/manual/lookups'),
        enabled: showFormats,
    });
    const [uploading, setUploading] = useState(false);
    const [files, setFiles] = useState([]);

    async function uploadSelected(event) {
        const selected = Array.from(event.target.files ?? []);
        event.target.value = '';
        if (!selected.length || uploading) return;
        setUploading(true);
        try {
            for (const file of selected) {
                try {
                    const { url } = await uploadListeningAudio(file);
                    setFiles((current) => [...current, { name: file.name, url }]);
                    void client.invalidateQueries({ queryKey: ['content-audio-uploads', user?.userId] });
                } catch (error) {
                    setFiles((current) => [...current, { name: file.name, error: getErrorMessage(error) }]);
                }
            }
        } finally {
            setUploading(false);
        }
    }

    const visibleUploads = [...new Map([
        ...(savedUploads.data ?? []).map(entry => [entry.audioUrl, {
            url: entry.audioUrl, name: decodeURIComponent(entry.audioUrl.split('/').at(-1)),
        }]),
        ...files.map((file, index) => [file.url ?? 'error-' + index, file]),
    ]).values()];

    return <section className="rounded-xl border border-[#E8DFDC] bg-white p-5">
        <h2 className="font-semibold text-[#2D282A]">Định dạng đề JLPT N5–N2</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
            <li>Gắn mã dạng câu ở JlptItemType. Ví dụ ReadingShort kèm nội dung ở Passage, hoặc ReadingIntegrated kèm thêm SecondPassage.</li>
            <li>Với SentenceComposition, nhập bốn cụm đúng thứ tự vào OrderingParts, ngăn bằng |, rồi điền vị trí ★ từ 1 đến 4 vào StarPosition.</li>
            <li>Với lựa chọn phát qua audio, đặt OptionsInAudio thành true, điền số vào Option1 đến Option4 và đánh dấu đáp án bằng CorrectOptionNumber.</li>
        </ul>
        <p className="mt-1 text-sm text-slate-600">
            Trong sheet Mock Test, dùng AudioUrl cho MP3, ImageUrl cho ảnh câu hỏi và Option1ImageUrl đến Option4ImageUrl cho ảnh đáp án.
        </p>
        <details className="mt-3 text-sm" onToggle={event => setShowFormats(event.currentTarget.open)}>
            <summary className="cursor-pointer font-medium text-[#AD3155]">Mã JlptItemType theo cấp độ</summary>
            {showFormats && formatLookup.isPending && <p className="mt-2">Đang tải mã dạng câu…</p>}
            {formatLookup.isError && <p className="mt-2 text-rose-700">{formatLookup.error.message}</p>}
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                {(formatLookup.data?.jlptQuestionFormats ?? []).map(format => <li key={format.code}>
                    <code className="font-semibold">{format.code}</code> · {format.label} · {format.levels.join(', ')}
                </li>)}
            </ul>
        </details>
        <label className="mt-3 block text-sm font-medium text-slate-700">
            Chọn file MP3
            <input type="file" accept=".mp3,audio/mpeg" multiple disabled={uploading}
                onChange={uploadSelected} className="ml-3 max-w-full text-sm" />
        </label>
        {uploading && <p role="status" className="mt-2 text-sm text-slate-600">Đang tải audio…</p>}
        <p className="mt-2 text-sm text-slate-600">MP3 tối đa 25 MB. Hệ thống tự tạo bản chép lời tiếng Nhật để giải thích câu nghe.</p>
        {savedUploads.isError && <p role="alert" className="mt-2 text-sm text-rose-700">Chưa tải được danh sách audio đã lưu.</p>}
        {visibleUploads.length > 0 && <ul className="mt-3 space-y-2 text-sm">
            {visibleUploads.map((file, index) => <li key={index} className="rounded-lg bg-[#FBF8F7] p-2">
                <span className="font-medium">{file.name}</span>
                {file.error
                    ? <p role="alert" className="mt-1 text-rose-700">{file.error}</p>
                    : <input readOnly aria-label={'AudioUrl của ' + file.name} value={file.url}
                        onFocus={(event) => event.target.select()} className="mt-1 w-full rounded border border-slate-300 bg-white p-2" />}
                {file.url && <AudioTranscriptPanel audioUrl={file.url} />}
            </li>)}
        </ul>}
    </section>;
}

function mediaUrlsFromSheets(sheets, kind) {
    const urls = new Set();
    function visit(value) {
        if (!value || typeof value !== 'object') return;
        for (const [key, item] of Object.entries(value)) {
            if ((kind === 'audio' ? key.toLowerCase() === 'audiourl' : key.toLowerCase().endsWith('imageurl')) && typeof item === 'string' && item) urls.add(item);
            else if (item && typeof item === 'object') visit(item);
        }
    }
    for (const sheet of sheets) for (const row of sheet.rows ?? []) {
        try { visit(typeof row.payloadJson === 'string' ? JSON.parse(row.payloadJson) : row.payloadJson); }
        catch { /* Invalid payloads already appear in the row's import errors. */ }
    }
    return [...urls];
}

function ContentImportPreviewPage() {
    const { pathname } = useLocation();
    const { user } = useAuth();
    const queryClient = useQueryClient();
    const [batchId, setBatchId] = useState(null);
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [audioFiles, setAudioFiles] = useState([]);
    const [imageFiles, setImageFiles] = useState([]);
    const [entityType, setEntityType] = useState(''); // '' = Bulk (mọi sheet)
    const [fileError, setFileError] = useState('');
    const [dragOver, setDragOver] = useState(false);
    const [activeSheet, setActiveSheet] = useState(0);
    const [actionFilter, setActionFilter] = useState('All');
    const [selectedDiffRow, setSelectedDiffRow] = useState(null);

    const preview = usePreviewContentImportMutation();
    const confirmImport = useConfirmContentImportMutation();
    const workbookPreview = useMutation({ mutationFn: previewExcelWorkbook });
    const [showWorkbook, setShowWorkbook] = useState(false);
    const [changes, setChanges] = useState({});
    const [hasEditedFile, setHasEditedFile] = useState(false);
    const [confirmResult, setConfirmResult] = useState(null);
    const [confirmError, setConfirmError] = useState('');

    function refreshAuthorContent(savedBatchId) {
        void queryClient.invalidateQueries({ queryKey: ['author-import-batches', user?.userId] });
        void queryClient.invalidateQueries({ queryKey: ['author-import-batch', user?.userId, savedBatchId] });
        void queryClient.invalidateQueries({ queryKey: ['manual-content-items', user?.userId] });
    }

    const submitReview = useMutation({
        mutationFn: submitAuthorImportBatch,
        onSuccess: (_, savedBatchId) => refreshAuthorContent(savedBatchId),
    });
    const applyWorkbook = useMutation({
        mutationFn: () => editExcelWorkbook(file, Object.values(changes)),
        onSuccess: (edited) => {
            setFile(edited);
            setHasEditedFile(true);
            setChanges({});
            setBatchId(null);
            setConfirmResult(null);
            setConfirmError('');
            setSelectedDiffRow(null);
            preview.reset();
            confirmImport.reset();
            submitReview.reset();
            workbookPreview.mutate(edited);
        },
    });
    const hasChanges = Object.keys(changes).length > 0;
    const busy = preview.isPending || confirmImport.isPending || submitReview.isPending ||
        workbookPreview.isPending || applyWorkbook.isPending;

    function changeCell(edit, original) {
        applyWorkbook.reset();
        const key = workbookEditKey(edit.sheetName, edit.row, edit.column);
        setChanges(previous => {
            const next = { ...previous };
            if (edit.value === original) delete next[key];
            else next[key] = edit;
            return next;
        });
    }

    function downloadEditedFile() {
        const url = URL.createObjectURL(file);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.name.replace(/\.xlsx$/i, '-da-sua.xlsx');
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function openWorkbook() {
        if (!file || busy) return;
        setShowWorkbook(true);
        if (!workbookPreview.data) workbookPreview.mutate(file);
    }

    function saveDraft(sendForReview = false) {
        if (!canSaveDraft) return;

        setConfirmError('');
        confirmImport.mutate(
            {
                batchId,
                sourceFileName: result.fileName || file.name,
                rows: confirmableRows,
            },
            {
                onSuccess: (data) => {
                    const saved = data?.result ?? data;
                    setConfirmResult(saved);
                    refreshAuthorContent(saved.batchId);
                    if (sendForReview) submitReview.mutate(saved.batchId);
                },
                onError: (err) => setConfirmError(getErrorMessage(err)),
            }
        );
    }

    function sendForReview() {
        if (!canSendForReview) return;
        if (confirmResult?.batchId) submitReview.mutate(confirmResult.batchId);
        else saveDraft(true);
    }

    // Unwrap response an toàn: hỗ trợ cả { isSuccess, result } lẫn trực tiếp result
    const rawData = preview.data;
    const result = rawData?.result ?? rawData;
    const sheets = result?.sheets ?? [];
    const importedAudioUrls = mediaUrlsFromSheets(sheets, 'audio');
    const importedImageUrls = mediaUrlsFromSheets(sheets, 'image');
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

    const canSaveDraft = !busy && !hasChanges && Boolean(batchId && file && !confirmResult) && confirmableRows.length > 0;
    const canSendForReview = !busy && !hasChanges && !submitReview.isSuccess &&
        (Boolean(confirmResult?.batchId) || canSaveDraft);

    function pickFile(f) {
        if (busy) return;
        if (hasChanges && !window.confirm('Đổi file sẽ bỏ các ô chưa áp dụng. Tiếp tục?')) return;
        setChanges({});
        setHasEditedFile(false);
        applyWorkbook.reset();
        workbookPreview.reset();
        setShowWorkbook(false);
        preview.reset();
        confirmImport.reset();
        submitReview.reset();
        setBatchId(null);
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

    function selectAudioFiles(event) {
        const selected = Array.from(event.target.files ?? []).filter(item => /\.mp3$/i.test(item.name));
        event.target.value = '';
        if (selected.length > 100 || selected.reduce((sum, item) => sum + item.size, 0) + imageFiles.reduce((sum, item) => sum + item.size, 0) > 250 * 1024 * 1024) {
            setFileError('Mỗi lần import tối đa 100 MP3, tổng dung lượng tối đa 250 MB.');
            return;
        }
        if (selected.some(item => item.size < 4 || item.size > 25 * 1024 * 1024)) {
            setFileError('Mỗi file MP3 phải có dữ liệu và tối đa 25 MB.');
            return;
        }
        setAudioFiles(selected);
        setFileError('');
        preview.reset();
        confirmImport.reset();
        submitReview.reset();
        setBatchId(null);
        setConfirmResult(null);
        setConfirmError('');
    }

    function selectImageFiles(event) {
        const selected = Array.from(event.target.files ?? []).filter(item => /\.(jpe?g|png|webp|gif)$/i.test(item.name));
        event.target.value = '';
        if (selected.length > 200 || selected.reduce((sum, item) => sum + item.size, 0) + audioFiles.reduce((sum, item) => sum + item.size, 0) > 250 * 1024 * 1024) {
            setFileError('Mỗi lần tối đa 200 ảnh; tổng ảnh và MP3 tối đa 250 MB.');
            return;
        }
        if (selected.some(item => item.size < 12 || item.size > 10 * 1024 * 1024)) {
            setFileError('Mỗi ảnh phải có dữ liệu và tối đa 10 MB.');
            return;
        }
        setImageFiles(selected);
        setFileError('');
        preview.reset();
        confirmImport.reset();
        submitReview.reset();
        setBatchId(null);
        setConfirmResult(null);
        setConfirmError('');
    }

    function handleSubmit(e) {
        e.preventDefault();
        if (!file || busy || hasChanges) return;
        setShowWorkbook(false);
        setBatchId(null);
        setConfirmResult(null);
        setConfirmError('');
        submitReview.reset();
        preview.mutate(
            { file, entityType, audioFiles, imageFiles },
            {
                onSuccess: () => {
                    setBatchId(crypto.randomUUID());
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
                <h1 className="text-[22px] font-medium tracking-tight text-[#2D282A]">Nhập Excel</h1>
                <p className="mt-1 text-[13px] text-[#967F8A]">Tải file .xlsx để kiểm tra, lưu bản nháp hoặc gửi admin duyệt.</p>
                <div className="mt-2 flex flex-wrap gap-4 text-sm font-semibold text-[#AD3155] underline">
                    <Link to="?view=history">Lô Excel đã lưu</Link>
                    <Link to="/content-manual/">Tạo và sửa học liệu trực tiếp</Link>
                </div>
            </header>

            {(!entityType || entityType === 'MockTest') && <ListeningAudioUpload />}

            {/* ---- Upload Card ---- */}
            <form onSubmit={handleSubmit} className="rounded-xl border border-[#E8DFDC] bg-white p-5">
                <section className="mb-5 space-y-3 rounded-xl bg-[#FBF8F7] p-4 text-sm">
                    <h2 className="font-semibold text-[#2D282A]">Ảnh và audio đi kèm file Excel</h2>
                    <p className="text-slate-600">Trong AudioUrl, nhập URL S3 hoặc đường dẫn/tên file MP3. Bạn cũng có thể dùng hai cột AudioDirectory và AudioFileName.</p>
                    <p className="text-slate-600">Nếu dùng file trên máy, chọn thư mục hoặc các MP3 bên dưới. Khi xem trước, hệ thống tự lấy đúng file được nhắc trong Excel, tải lên S3 và tạo bản chép lời tiếng Nhật.</p>
                    <div className="flex flex-wrap gap-4">
                        <label className="font-medium">Chọn thư mục MP3
                            <input type="file" webkitdirectory="" directory="" multiple disabled={busy}
                                onChange={selectAudioFiles} className="mt-1 block max-w-full text-sm" />
                        </label>
                        <label className="font-medium">Hoặc chọn các file MP3
                            <input type="file" accept=".mp3,audio/mpeg" multiple disabled={busy}
                                onChange={selectAudioFiles} className="mt-1 block max-w-full text-sm" />
                        </label>
                    </div>
                    {audioFiles.length > 0 && <div className="flex items-center gap-3 text-slate-600">
                        <span>Đã chọn {audioFiles.length} MP3 · {(audioFiles.reduce((sum, item) => sum + item.size, 0) / 1024 / 1024).toFixed(1)} MB</span>
                        <button type="button" disabled={busy} className="font-semibold text-primary underline"
                            onClick={() => { setAudioFiles([]); preview.reset(); setBatchId(null); setConfirmResult(null); }}>Bỏ chọn</button>
                    </div>}
                    <div className="border-t border-[#E8DFDC] pt-3">
                        <p className="text-slate-600">Ảnh dùng ImageUrl hoặc ImageDirectory + ImageFileName. Ảnh đáp án dùng Option1ImageUrl đến Option4ImageUrl; ảnh chung của bài tập dùng ExerciseImageUrl. Các cột này dùng được trên các sheet tương ứng.</p>
                        <div className="mt-3 flex flex-wrap gap-4">
                            <label className="font-medium">Chọn thư mục ảnh
                                <input type="file" webkitdirectory="" directory="" multiple disabled={busy}
                                    onChange={selectImageFiles} className="mt-1 block max-w-full text-sm" />
                            </label>
                            <label className="font-medium">Hoặc chọn các file ảnh
                                <input type="file" accept=".jpg,.jpeg,.png,.webp,.gif" multiple disabled={busy}
                                    onChange={selectImageFiles} className="mt-1 block max-w-full text-sm" />
                            </label>
                        </div>
                        {imageFiles.length > 0 && <div className="mt-2 flex items-center gap-3 text-slate-600">
                            <span>Đã chọn {imageFiles.length} ảnh · {(imageFiles.reduce((sum, item) => sum + item.size, 0) / 1024 / 1024).toFixed(1)} MB</span>
                            <button type="button" disabled={busy} className="font-semibold text-primary underline"
                                onClick={() => { setImageFiles([]); preview.reset(); setBatchId(null); setConfirmResult(null); }}>Bỏ chọn ảnh</button>
                        </div>}
                        <p className="mt-2 text-slate-600">Khi xem trước, ảnh được tự tải lên Supabase; MP3 được tự tải lên AWS S3. File dùng nhiều lần chỉ tải một lần trong lô import.</p>
                    </div>
                    <p className="text-xs text-slate-500">Tối đa 100 MP3 (25 MB/file), 200 ảnh JPG/PNG/WebP/GIF (10 MB/file); tổng mỗi lần tối đa 250 MB. URL ảnh đã có sẵn được giữ lại.</p>
                </section>
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
                                disabled={busy}
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
                            disabled={!file || busy || hasChanges}
                            className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 shadow-sm"
                        >
                            {preview.isPending ? 'Đang kiểm tra & so sánh…' : 'Xem trước & So sánh'}
                        </button>
                        <button type="button" disabled={!file || busy} aria-expanded={showWorkbook}
                            onClick={() => showWorkbook ? setShowWorkbook(false) : openWorkbook()}
                            className="w-full rounded-xl border border-[#E7D7DF] bg-white px-4 py-2.5 text-sm font-semibold text-[#9E2A4B] disabled:opacity-50">
                            {showWorkbook ? 'Ẩn nội dung Excel' : 'Xem nội dung Excel'}
                        </button>
                        {hasEditedFile && <button type="button" disabled={hasChanges || busy} onClick={downloadEditedFile}
                            className="w-full rounded-xl border border-[#E7D7DF] px-4 py-2 text-sm font-semibold text-[#9E2A4B] disabled:opacity-50">
                            Tải file đã sửa
                        </button>}
                        {hasChanges && !showWorkbook && <p className="text-sm text-amber-800">Mở nội dung Excel để áp dụng các ô đã sửa.</p>}
                    </div>
                </div>

                {(fileError || preview.isError) && (
                    <div role="alert" className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
                        {fileError || getErrorMessage(preview.error)}
                    </div>
                )}
            </form>

            {importedImageUrls.length > 0 && <details className="rounded-xl border border-[#E8DFDC] bg-white p-4 text-sm">
                <summary className="cursor-pointer font-semibold text-primary">Ảnh đã gắn trong Excel ({importedImageUrls.length})</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {importedImageUrls.map(url => <figure key={url} className="rounded-lg border border-card-border p-2">
                        <img src={url} alt="Ảnh nội dung import" loading="lazy" className="max-h-48 w-full object-contain" />
                        <figcaption className="mt-1 break-all text-xs text-slate-500">{url}</figcaption>
                    </figure>)}
                </div>
            </details>}

            {importedAudioUrls.length > 0 && <details className="rounded-xl border border-[#E8DFDC] bg-white p-4 text-sm">
                <summary className="cursor-pointer font-semibold text-primary">Bản chép lời audio trong Excel ({importedAudioUrls.length})</summary>
                <p className="mt-2 text-slate-600">Bản chép lời được lưu theo câu nghe để AI phân tích và giải thích đáp án.</p>
                {importedAudioUrls.map(url => <div key={url} className="mt-3">
                    <p className="break-all text-xs text-slate-500">{url}</p>
                    <AudioTranscriptPanel audioUrl={url} />
                </div>)}
            </details>}

            <div hidden={!showWorkbook}>
                {workbookPreview.isPending && <p role="status" className="text-sm text-slate-600">Đang đọc các sheet…</p>}
                {workbookPreview.isError && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                    {getErrorMessage(workbookPreview.error)}
                    <button type="button" onClick={openWorkbook} className="ml-2 font-semibold underline">Thử lại</button>
                </div>}
                {workbookPreview.data && <WorkbookPreview workbook={workbookPreview.data} changes={changes} onCellChange={changeCell}
                    busy={busy} applyError={applyWorkbook.error} onApply={() => applyWorkbook.mutate()}
                    onDiscard={() => { setChanges({}); applyWorkbook.reset(); }} />}
            </div>

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
                            {submitReview.isSuccess ? 'Đã gửi duyệt' : confirmResult ? 'Đã lưu bản nháp' : 'Chưa lưu bản nháp'}
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

                    {/* Lưu bản nháp và gửi lô cho admin */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Lưu vào học liệu của tôi</h3>
                                <p className="mt-1 text-xs text-slate-500">
                                    {confirmableRows.length} dòng mới hoặc thay đổi đủ điều kiện lưu bản nháp.
                                    Các dòng lỗi và không đổi được bỏ qua.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {!confirmResult && <button
                                    type="button"
                                    onClick={() => saveDraft()}
                                    disabled={!canSaveDraft}
                                    className="rounded-xl border border-[#E7D7DF] px-4 py-2.5 text-sm font-semibold text-[#9E2A4B] hover:bg-[#FFF7F9] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {confirmImport.isPending ? 'Đang lưu…' : 'Lưu bản nháp'}
                                </button>}
                                {!submitReview.isSuccess && <button
                                    type="button"
                                    onClick={sendForReview}
                                    disabled={!canSendForReview}
                                    className="rounded-xl bg-[#AD3155] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#932844] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {submitReview.isPending ? 'Đang gửi duyệt…' : 'Gửi admin duyệt'}
                                </button>}
                            </div>
                        </div>
                        {confirmError && (
                            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                {confirmError}
                            </div>
                        )}
                        {submitReview.isError && (
                            <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                                Đã lưu bản nháp. Gửi duyệt chưa thành công. {getErrorMessage(submitReview.error)}
                            </div>
                        )}
                        {confirmResult && (
                            <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                                <p className="font-semibold">
                                    {submitReview.isSuccess
                                        ? submitReview.data > 0
                                            ? 'Đã gửi ' + submitReview.data + ' nội dung cho admin duyệt.'
                                            : 'Lô này đã được gửi duyệt.'
                                        : 'Đã lưu ' + (confirmResult.draftsCreatedCount ?? 0) + ' bản nháp.'}
                                    {confirmResult.skippedCount > 0 && ' Đã bỏ qua ' + confirmResult.skippedCount + ' dòng khi lưu.'}
                                </p>
                                <Link to={'?view=history&batchId=' + confirmResult.batchId} className="mt-2 inline-block font-semibold underline">
                                    Mở lô và xem trạng thái
                                </Link>
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
                                            {s.errorCount} lỗi
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

function ImportWorkspace({ visible }) {
    const [opened, setOpened] = useState(visible);
    if (visible && !opened) setOpened(true);
    if (!visible && !opened) return null;

    // Keep the file, edits, and pending requests mounted when the author switches pages.
    return <div hidden={!visible}><ContentImportPreviewPage /></div>;
}

export function PersistentContentImport() {
    const { isAuthenticated, user, hasAnyRole } = useAuth();
    const bulkImport = useMatch('/bulk-import');
    const contentStudio = useMatch('/content-studio');
    const [params] = useSearchParams();
    if (!isAuthenticated || !hasAnyRole(['ContentAuthor', 'Admin'])) return null;

    const visible = Boolean(bulkImport || contentStudio) && params.get('view') !== 'history';
    return <ImportWorkspace key={user?.userId} visible={visible} />;
}

export default function ContentImportPage() {
    const [params] = useSearchParams();
    return params.get('view') === 'history' ? <AuthorImportHistory /> : null;
}
