import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  AlertTriangle,
  CopyCheck,
  FilePlus2,
  Plus,
  Save,
  Send,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';

import {
  checkQuestionDuplicatesV2,
  createQuestionNewVersionV2,
  savePassageGroupDraftV2,
  saveQuestionDraftV2,
  submitPassageGroupV2,
  submitQuestionV2,
  uploadAuthorMedia,
} from '@/features/content-author/api/contentAuthoringV2Api.js';
import InlineAiAssistantDrawer from './InlineAiAssistantDrawer.jsx';
import {
  SKILL_TEMPLATES,
  blankOption,
  createBlankCanonicalQuestion,
  createBlankPassageGroup,
} from '@/features/content-author/utils/canonicalQuestionTemplates.js';
import {
  Badge,
  Banner,
  Button,
  Card,
  Checkbox,
  CustomSelect,
  Input,
  Textarea,
  notify,
} from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

export default function SkillQuestionEditor({
  initialQuestion = null,
  initialPassageGroup = null,
  mode = 'question', // 'question' | 'passage'
  onSaved,
  onSubmitted,
}) {
  const { tr, trf } = useLocale();
  const [editorMode, setEditorMode] = useState(mode);
  const [question, setQuestion] = useState(() => initialQuestion || createBlankCanonicalQuestion());
  const [group, setGroup] = useState(() => initialPassageGroup || createBlankPassageGroup(mode === 'passage' ? 'Reading' : 'Listening'));
  const [aiOpen, setAiOpen] = useState(false);
  const [duplicates, setDuplicates] = useState(null);
  const [activeGroupQuestionIdx, setActiveGroupQuestionIdx] = useState(0);

  const isPassageMode = editorMode === 'passage' || question.skillName === 'Reading' || question.skillName === 'Listening';
  const activeLevel = isPassageMode ? group.passage.certificateLevelCode : question.certificateLevelCode;
  const activeSkill = isPassageMode ? group.passage.skillName : question.skillName;
  const isPublishedLocked = isPassageMode
    ? group.passage.publishStatus === 'Published'
    : question.publishStatus === 'Published';

  const currentAiTarget = useMemo(() => {
    if (isPassageMode) return group.questions[activeGroupQuestionIdx] || group.questions[0];
    return question;
  }, [isPassageMode, group.questions, activeGroupQuestionIdx, question]);

  const setQuestionField = (patch) => setQuestion((prev) => ({ ...prev, ...patch }));
  const setMetaField = (patch) =>
    setQuestion((prev) => ({ ...prev, skillMetadata: { ...(prev.skillMetadata || {}), ...patch } }));

  const setGroupPassageField = (patch) =>
    setGroup((prev) => ({ ...prev, passage: { ...prev.passage, ...patch } }));

  const updateGroupQuestion = (idx, patch) =>
    setGroup((prev) => ({
      ...prev,
      questions: prev.questions.map((item, i) => (i === idx ? { ...item, ...patch } : item)),
    }));

  const saveQuestion = useMutation({
    mutationFn: () => saveQuestionDraftV2(question),
    onSuccess: (saved) => {
      setQuestion(saved);
      notify.success(tr('Đã lưu nháp câu hỏi vào Ngân hàng câu hỏi.'), '', { key: 'qb-save-ok' });
      onSaved?.(saved);
    },
    onError: (err) => notify.apiError(err, tr('Không lưu được nháp câu hỏi'), { key: 'qb-save-err' }),
  });

  const createVersion = useMutation({
    mutationFn: () => createQuestionNewVersionV2(question.id, { ...question, id: null }),
    onSuccess: (created) => {
      setQuestion(created);
      notify.success(trf('Đã tạo phiên bản nháp v{0}.', { 0: created.version }), '', { key: 'qb-ver-ok' });
      onSaved?.(created);
    },
    onError: (err) => notify.apiError(err, tr('Không tạo được phiên bản mới'), { key: 'qb-ver-err' }),
  });

  const submitQuestion = useMutation({
    mutationFn: async () => {
      const saved = await saveQuestionDraftV2(question);
      return submitQuestionV2(saved.id);
    },
    onSuccess: (submitted) => {
      setQuestion(submitted);
      notify.success(tr('Đã gửi câu hỏi cho Admin xét duyệt.'), '', { key: 'qb-sub-ok' });
      onSubmitted?.(submitted);
    },
    onError: (err) => notify.apiError(err, tr('Chưa thể gửi duyệt câu hỏi'), { key: 'qb-sub-err' }),
  });

  const saveGroup = useMutation({
    mutationFn: () => savePassageGroupDraftV2(group),
    onSuccess: (saved) => {
      setGroup(saved);
      notify.success(tr('Đã lưu nháp đoạn/nhóm câu hỏi.'), '', { key: 'pg-save-ok' });
      onSaved?.(saved);
    },
    onError: (err) => notify.apiError(err, tr('Không lưu được nhóm câu hỏi'), { key: 'pg-save-err' }),
  });

  const submitGroup = useMutation({
    mutationFn: async () => {
      const saved = await savePassageGroupDraftV2(group);
      return submitPassageGroupV2(saved.passage.id);
    },
    onSuccess: (submitted) => {
      setGroup(submitted);
      notify.success(tr('Đã gửi nhóm câu hỏi cho Admin xét duyệt.'), '', { key: 'pg-sub-ok' });
      onSubmitted?.(submitted);
    },
    onError: (err) => notify.apiError(err, tr('Chưa thể gửi duyệt nhóm câu hỏi'), { key: 'pg-sub-err' }),
  });

  const dupCheck = useMutation({
    mutationFn: () => checkQuestionDuplicatesV2(currentAiTarget, currentAiTarget?.id),
    onSuccess: (res) => {
      setDuplicates(res);
      if (res?.matches?.length) {
        notify.info(trf('Phát hiện {0} câu hỏi tương tự trong ngân hàng.', { 0: res.matches.length }), '', { key: 'dup-hit' });
      } else {
        notify.success(tr('Không phát hiện trùng lặp câu hỏi.'), '', { key: 'dup-clear' });
      }
    },
    onError: (err) => notify.apiError(err, tr('Không kiểm tra trùng lặp được'), { key: 'dup-err' }),
  });

  const mediaUpload = useMutation({
    mutationFn: ({ file, folder }) => uploadAuthorMedia(file, folder),
    onError: (err) => notify.apiError(err, tr('Không tải lên được tệp media'), { key: 'media-up-err' }),
  });

  const handleUploadGroupAudio = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await mediaUpload.mutateAsync({ file, folder: 'jlpt-listening' });
    if (uploaded?.url) {
      setGroupPassageField({ audioUrl: uploaded.url });
      notify.success(tr('Đã tải audio lên bộ lưu trữ cục bộ an toàn.'), '', { key: 'audio-up-ok' });
    }
  };

  const handleUploadGroupImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const uploaded = await mediaUpload.mutateAsync({ file, folder: 'jlpt-images' });
    if (uploaded?.url) {
      setGroupPassageField({ imageUrl: uploaded.url });
      notify.success(tr('Đã tải ảnh minh họa thành công.'), '', { key: 'img-up-ok' });
    }
  };

  const handleApplyAiSuggestions = (pickedList, actionName) => {
    if (!pickedList?.length) return;
    if (isPassageMode) {
      if (actionName === 'GenerateQuestions' || actionName === 'SuggestReadingQuestionsFromPassage' || actionName === 'SuggestListeningQuestionsFromTranscript') {
        setGroup((prev) => ({
          ...prev,
          questions: [
            ...prev.questions.filter((q) => q.questionText.trim().length > 0),
            ...pickedList.map((p) => ({ ...createBlankCanonicalQuestion(activeSkill, activeLevel), ...p })),
          ],
        }));
      } else {
        const first = pickedList[0];
        updateGroupQuestion(activeGroupQuestionIdx, {
          ...group.questions[activeGroupQuestionIdx],
          ...first,
          id: group.questions[activeGroupQuestionIdx]?.id ?? null,
        });
      }
      return;
    }

    const first = pickedList[0];
    setQuestion((prev) => ({
      ...prev,
      ...first,
      id: prev.id,
      version: prev.version,
      skillMetadata: { ...(prev.skillMetadata || {}), ...(first.skillMetadata || {}) },
    }));
  };

  const renderSingleQuestionFields = (qObj, onChangeQ, onChangeMeta) => (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium text-rp-text-2">
          <span>{tr('Mẫu kỹ năng')}</span>
          <CustomSelect
            size="sm"
            value={qObj.templateKind}
            onChange={(v) => onChangeQ({ templateKind: v })}
            options={(SKILL_TEMPLATES[qObj.skillName] || SKILL_TEMPLATES.Vocabulary).map((t) => ({ value: t.value, label: tr(t.label) }))}
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-rp-text-2">
          <span>{tr('Dạng câu hỏi')}</span>
          <CustomSelect
            size="sm"
            value={qObj.questionType}
            onChange={(v) => onChangeQ({ questionType: v })}
            options={[
              { value: 'SingleChoice', label: tr('Trắc nghiệm 1 đáp án') },
              { value: 'MultipleChoice', label: tr('Trắc nghiệm nhiều đáp án') },
              ...(qObj.skillName === 'Vocabulary' || qObj.skillName === 'Grammar'
                ? [{ value: 'FillBlank', label: tr('Điền vào chỗ trống') }]
                : []),
              ...(qObj.skillName === 'Grammar'
                ? [{ value: 'Ordering', label: tr('Sắp xếp câu (★)') }]
                : []),
              ...(qObj.skillName === 'Listening'
                ? [{ value: 'VisualMultipleChoice', label: tr('Trắc nghiệm hình ảnh') }]
                : []),
            ]}
          />
        </label>

        <label className="space-y-1 text-xs font-medium text-rp-text-2">
          <span>{tr('Chủ đề / Độ khó')}</span>
          <Input
            size="sm"
            value={qObj.topic || ''}
            onChange={(e) => onChangeQ({ topic: e.target.value })}
            placeholder={tr('VD: Đời sống, Công sở…')}
          />
        </label>
      </div>

      {/* Skill-specific fields */}
      {qObj.skillName === 'Vocabulary' && (
        <div className="grid gap-3 rounded-xl border border-rp-line bg-rp-bg/50 p-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Từ / Cụm từ')}</span>
            <Input size="sm" value={qObj.skillMetadata?.word || ''} onChange={(e) => onChangeMeta({ word: e.target.value })} placeholder="図書館" />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Cách đọc (Kana)')}</span>
            <Input size="sm" value={qObj.skillMetadata?.reading || ''} onChange={(e) => onChangeMeta({ reading: e.target.value })} placeholder="としょかん" />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Nghĩa')}</span>
            <Input size="sm" value={qObj.skillMetadata?.meaning || ''} onChange={(e) => onChangeMeta({ meaning: e.target.value })} placeholder={tr('Thư viện')} />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2 sm:col-span-3">
            <span>{tr('Câu ví dụ')}</span>
            <Input size="sm" value={qObj.skillMetadata?.exampleSentence || ''} onChange={(e) => onChangeMeta({ exampleSentence: e.target.value })} placeholder="毎日図書館で勉強します。" />
          </label>
        </div>
      )}

      {qObj.skillName === 'Kanji' && (
        <div className="grid gap-3 rounded-xl border border-rp-line bg-rp-bg/50 p-3 sm:grid-cols-5">
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Hán tự')}</span>
            <Input size="sm" value={qObj.skillMetadata?.kanjiCharacter || ''} onChange={(e) => onChangeMeta({ kanjiCharacter: e.target.value })} placeholder="休" />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Nghĩa')}</span>
            <Input size="sm" value={qObj.skillMetadata?.meaning || ''} onChange={(e) => onChangeMeta({ meaning: e.target.value })} placeholder={tr('Nghỉ ngơi')} />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Âm On')}</span>
            <Input size="sm" value={qObj.skillMetadata?.onYomi || ''} onChange={(e) => onChangeMeta({ onYomi: e.target.value })} placeholder="キュウ" />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Âm Kun')}</span>
            <Input size="sm" value={qObj.skillMetadata?.kunYomi || ''} onChange={(e) => onChangeMeta({ kunYomi: e.target.value })} placeholder="やす.む" />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Số nét')}</span>
            <Input
              size="sm"
              type="number"
              min={1}
              max={40}
              value={qObj.skillMetadata?.strokeCount ?? ''}
              onChange={(e) => onChangeMeta({ strokeCount: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
        </div>
      )}

      {qObj.skillName === 'Grammar' && (
        <div className="grid gap-3 rounded-xl border border-rp-line bg-rp-bg/50 p-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Mẫu ngữ pháp')}</span>
            <Input size="sm" value={qObj.skillMetadata?.grammarPattern || ''} onChange={(e) => onChangeMeta({ grammarPattern: e.target.value })} placeholder="～てみる" />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Cấu trúc')}</span>
            <Input size="sm" value={qObj.skillMetadata?.structure || ''} onChange={(e) => onChangeMeta({ structure: e.target.value })} placeholder="Vて + みる" />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2 sm:col-span-2">
            <span>{tr('Giải thích cách dùng')}</span>
            <Input size="sm" value={qObj.skillMetadata?.usageExplanation || ''} onChange={(e) => onChangeMeta({ usageExplanation: e.target.value })} />
          </label>
        </div>
      )}

      <label className="block space-y-1 text-xs font-medium text-rp-text-2">
        <span>{tr('Nội dung câu hỏi (Question Prompt)')}</span>
        <Textarea
          rows={3}
          value={qObj.questionText}
          onChange={(e) => onChangeQ({ questionText: e.target.value })}
          placeholder={tr('Nhập đề bài tiếng Nhật hoặc hướng dẫn trả lời…')}
        />
      </label>

      {qObj.questionType === 'FillBlank' && (
        <div className="space-y-2 rounded-xl border border-rp-line p-3">
          <span className="text-xs font-semibold text-rp-text">{tr('Danh sách đáp án đúng được chấp nhận (phân cách bằng dấu |)')}</span>
          <Input
            size="sm"
            value={(qObj.skillMetadata?.acceptedAnswers || []).join(' | ')}
            onChange={(e) =>
              onChangeMeta({
                acceptedAnswers: e.target.value.split('|').map((s) => s.trim()),
              })
            }
            placeholder="なり | 成り"
          />
        </div>
      )}

      {qObj.questionType === 'Ordering' && (
        <div className="grid gap-3 rounded-xl border border-rp-line p-3 sm:grid-cols-2">
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Các cụm từ cho sẵn (phân cách bằng dấu |)')}</span>
            <Input
              size="sm"
              value={(qObj.skillMetadata?.orderingTokens || []).join(' | ')}
              onChange={(e) => onChangeMeta({ orderingTokens: e.target.value.split('|').map((s) => s.trim()) })}
              placeholder="この料理 | 食べて | おいしそう | みませんか"
            />
          </label>
          <label className="space-y-1 text-xs font-medium text-rp-text-2">
            <span>{tr('Thứ tự đáp án đúng (phân cách bằng dấu |)')}</span>
            <Input
              size="sm"
              value={(qObj.skillMetadata?.orderingAnswer || []).join(' | ')}
              onChange={(e) => onChangeMeta({ orderingAnswer: e.target.value.split('|').map((s) => s.trim()) })}
              placeholder="おいしそう | この料理 | 食べて | みませんか"
            />
          </label>
        </div>
      )}

      {(qObj.questionType === 'SingleChoice' || qObj.questionType === 'MultipleChoice' || qObj.questionType === 'VisualMultipleChoice') && (
        <div className="space-y-2 rounded-xl border border-rp-line p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rp-text">{tr('Các phương án trả lời')}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={Plus}
              onClick={() => onChangeQ({ options: [...(qObj.options || []), blankOption((qObj.options?.length || 0) + 1, false)] })}
            >
              {tr('Thêm phương án')}
            </Button>
          </div>
          {(qObj.options || []).map((opt, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <Checkbox
                checked={Boolean(opt.isCorrect)}
                onChange={() => {
                  const isSingle = qObj.questionType === 'SingleChoice' || qObj.questionType === 'VisualMultipleChoice';
                  onChangeQ({
                    options: qObj.options.map((o, oIdx) => ({
                      ...o,
                      isCorrect: isSingle ? oIdx === idx : oIdx === idx ? !o.isCorrect : o.isCorrect,
                    })),
                  });
                }}
                label={`${String.fromCharCode(65 + idx)}`}
              />
              <div className="min-w-[200px] flex-1">
                <Input
                  size="sm"
                  value={opt.optionText}
                  onChange={(e) =>
                    onChangeQ({
                      options: qObj.options.map((o, oIdx) => (oIdx === idx ? { ...o, optionText: e.target.value } : o)),
                    })
                  }
                  placeholder={trf('Phương án {0}', { 0: idx + 1 })}
                />
              </div>
              {qObj.questionType === 'VisualMultipleChoice' && (
                <div className="w-56">
                  <Input
                    size="sm"
                    value={opt.imageUrl || ''}
                    onChange={(e) =>
                      onChangeQ({
                        options: qObj.options.map((o, oIdx) => (oIdx === idx ? { ...o, imageUrl: e.target.value } : o)),
                      })
                    }
                    placeholder="URL ảnh phương án"
                  />
                </div>
              )}
              {qObj.options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon={Trash2}
                  aria-label={tr('Xóa phương án')}
                  onClick={() => onChangeQ({ options: qObj.options.filter((_, oIdx) => oIdx !== idx) })}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-xs font-medium text-rp-text-2 sm:col-span-2">
          <span>{tr('Giải thích đáp án (tiếng Việt + tiếng Nhật)')}</span>
          <Textarea
            rows={2}
            value={qObj.explanation || ''}
            onChange={(e) => onChangeQ({ explanation: e.target.value })}
            placeholder={tr('Giải thích ngắn gọn, rõ ràng tại sao đáp án đúng và các phương án còn lại sai…')}
          />
        </label>
        <label className="block space-y-1 text-xs font-medium text-rp-text-2">
          <span>{tr('Nguồn tham khảo')}</span>
          <Input size="sm" value={qObj.sourceReference || ''} onChange={(e) => onChangeQ({ sourceReference: e.target.value })} placeholder={tr('VD: Biên soạn nội bộ')} />
        </label>
        <label className="block space-y-1 text-xs font-medium text-rp-text-2">
          <span>{tr('Tình trạng bản quyền')}</span>
          <CustomSelect
            size="sm"
            value={qObj.rightsStatus || 'Owned'}
            onChange={(v) => onChangeQ({ rightsStatus: v })}
            options={[
              { value: 'Owned', label: tr('Tự biên soạn / Sở hữu') },
              { value: 'Licensed', label: tr('Có bản quyền sử dụng') },
              { value: 'PublicDomain', label: tr('Nguồn mở hợp lệ') },
            ]}
          />
        </label>
      </div>
    </div>
  );

  return (
    <div className={`grid gap-4 ${aiOpen ? 'lg:grid-cols-[minmax(0,1fr)_400px]' : ''}`}>
      <Card className="space-y-4">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rp-line pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <CustomSelect
              size="sm"
              value={activeSkill}
              onChange={(nextSkill) => {
                if (nextSkill === 'Reading' || nextSkill === 'Listening') {
                  setEditorMode('passage');
                  setGroup(createBlankPassageGroup(nextSkill, activeLevel));
                } else {
                  setEditorMode('question');
                  setQuestion(createBlankCanonicalQuestion(nextSkill, activeLevel));
                }
              }}
              options={[
                { value: 'Vocabulary', label: tr('Kỹ năng: Từ vựng') },
                { value: 'Kanji', label: tr('Kỹ năng: Hán tự') },
                { value: 'Grammar', label: tr('Kỹ năng: Ngữ pháp') },
                { value: 'Reading', label: tr('Kỹ năng: Đọc hiểu (Passage)') },
                { value: 'Listening', label: tr('Kỹ năng: Nghe hiểu (Audio)') },
              ]}
            />
            <CustomSelect
              size="sm"
              value={activeLevel}
              onChange={(lvl) => {
                if (isPassageMode) setGroupPassageField({ certificateLevelCode: lvl });
                else setQuestionField({ certificateLevelCode: lvl });
              }}
              options={['N5', 'N4', 'N3', 'N2'].map((c) => ({ value: c, label: `JLPT ${c}` }))}
            />
            <Badge tone="neutral" size="sm" icon={false}>
              {isPassageMode ? `v${group.passage.version || 1} · ${group.passage.publishStatus || 'Draft'}` : `v${question.version || 1} · ${question.publishStatus || 'Draft'}`}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              icon={CopyCheck}
              loading={dupCheck.isPending}
              onClick={() => dupCheck.mutate()}
            >
              {tr('Dò trùng')}
            </Button>
            <Button
              type="button"
              variant={aiOpen ? 'primary' : 'secondary'}
              size="sm"
              icon={Sparkles}
              onClick={() => setAiOpen((o) => !o)}
            >
              {tr('AI hỗ trợ biên soạn')}
            </Button>
          </div>
        </div>

        {isPublishedLocked && (
          <Banner
            tone="warning"
            title={tr('Nội dung đã xuất bản đang được khóa')}
            action={
              !isPassageMode ? (
                <Button type="button" size="sm" icon={FilePlus2} loading={createVersion.isPending} onClick={() => createVersion.mutate()}>
                  {tr('Tạo phiên bản mới')}
                </Button>
              ) : null
            }
          >
            {tr('Để bảo toàn các lượt làm bài của học viên trước đây, hãy tạo phiên bản mới trước khi chỉnh sửa.')}
          </Banner>
        )}

        {duplicates?.matches?.length > 0 && (
          <Banner tone="warning" title={trf('Phát hiện {0} câu hỏi trùng / tương tự', { 0: duplicates.matches.length })}>
            <ul className="space-y-1 text-xs">
              {duplicates.matches.slice(0, 4).map((m) => (
                <li key={m.questionId}>
                  <strong>#{m.questionId}</strong> ({m.levelCode} · {m.matchKind} · {Math.round(m.similarityScore * 100)}%): {m.questionText}
                </li>
              ))}
            </ul>
          </Banner>
        )}

        {/* Single Skill Mode: Vocabulary / Kanji / Grammar */}
        {!isPassageMode && renderSingleQuestionFields(question, setQuestionField, setMetaField)}

        {/* Relational Group Mode: Reading Passage OR Listening Audio + Multiple Linked Questions */}
        {isPassageMode && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-xl border border-rp-line bg-rp-bg/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-rp-text">
                  {activeSkill === 'Reading' ? tr('1. Đoạn văn Đọc hiểu dùng chung') : tr('1. Tài nguyên & Chính sách phát Nghe hiểu')}
                </h4>
                {activeSkill === 'Listening' && !group.passage.audioUrl && (
                  <Badge tone="warning" size="sm" icon={AlertTriangle}>
                    {tr('Chưa có file audio · Chỉ lưu Nháp')}
                  </Badge>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-medium text-rp-text-2">
                  <span>{tr('Tiêu đề đoạn / bài nghe')}</span>
                  <Input size="sm" value={group.passage.title} onChange={(e) => setGroupPassageField({ title: e.target.value })} placeholder={tr('VD: Thông báo nhà ga N4')} />
                </label>
                <label className="space-y-1 text-xs font-medium text-rp-text-2">
                  <span>{activeSkill === 'Reading' ? tr('Chủ đề') : tr('Mục JLPT Nghe hiểu')}</span>
                  <Input
                    size="sm"
                    value={activeSkill === 'Reading' ? (group.passage.topic || '') : (group.passage.listeningSection || '')}
                    onChange={(e) => setGroupPassageField(activeSkill === 'Reading' ? { topic: e.target.value } : { listeningSection: e.target.value })}
                    placeholder={activeSkill === 'Reading' ? tr('Đời sống / Thông báo…') : 'Mondai 1: Task Comprehension'}
                  />
                </label>
              </div>

              {activeSkill === 'Reading' ? (
                <>
                  <label className="block space-y-1 text-xs font-medium text-rp-text-2">
                    <span>{tr('Toàn văn đoạn đọc (chỉ lưu 1 bản cho toàn nhóm câu hỏi)')}</span>
                    <Textarea
                      rows={5}
                      value={group.passage.passageText || ''}
                      onChange={(e) => setGroupPassageField({ passageText: e.target.value })}
                      placeholder={tr('Nhập hoặc dán đoạn văn tiếng Nhật…')}
                    />
                  </label>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rp-line bg-white px-3 py-1.5 text-xs font-medium text-rp-text hover:bg-rp-brand-tint/40">
                      <Upload className="h-3.5 w-3.5" />
                      {tr('Tải ảnh minh họa đoạn đọc')}
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadGroupImage} />
                    </label>
                    {group.passage.imageUrl && (
                      <span className="text-xs text-rp-success">{tr('Đã đính kèm ảnh')}</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-rp-line bg-white px-3 py-1.5 text-xs font-medium text-rp-text hover:bg-rp-brand-tint/40">
                      <Upload className="h-3.5 w-3.5" />
                      {tr('Upload file Audio (.mp3, .wav, .m4a)')}
                      <input type="file" accept="audio/*" className="hidden" onChange={handleUploadGroupAudio} />
                    </label>
                    <div className="min-w-[220px] flex-1">
                      <Input
                        size="sm"
                        value={group.passage.audioUrl || ''}
                        onChange={(e) => setGroupPassageField({ audioUrl: e.target.value })}
                        placeholder={tr('Hoặc dán URL audio hợp lệ…')}
                      />
                    </div>
                  </div>

                  {group.passage.audioUrl && (
                    <audio controls preload="none" src={group.passage.audioUrl} className="w-full" />
                  )}

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1 text-xs font-medium text-rp-text-2">
                      <span>{tr('Số lần nghe tối đa')}</span>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        max={10}
                        value={group.passage.playbackPolicy?.maxReplays ?? 2}
                        onChange={(e) =>
                          setGroupPassageField({
                            playbackPolicy: {
                              ...(group.passage.playbackPolicy || {}),
                              maxReplays: e.target.value ? Number(e.target.value) : null,
                            },
                          })
                        }
                      />
                    </label>
                    <div className="flex items-end pb-1.5">
                      <Checkbox
                        checked={group.passage.playbackPolicy?.allowPause !== false}
                        onChange={(e) =>
                          setGroupPassageField({
                            playbackPolicy: { ...(group.passage.playbackPolicy || {}), allowPause: e.target.checked },
                          })
                        }
                        label={tr('Cho phép tạm dừng')}
                      />
                    </div>
                    <div className="flex items-end pb-1.5">
                      <Checkbox
                        checked={group.passage.playbackPolicy?.showTranscriptAfterSubmit !== false}
                        onChange={(e) =>
                          setGroupPassageField({
                            playbackPolicy: { ...(group.passage.playbackPolicy || {}), showTranscriptAfterSubmit: e.target.checked },
                          })
                        }
                        label={tr('Hiện transcript sau khi nộp')}
                      />
                    </div>
                  </div>

                  <label className="block space-y-1 text-xs font-medium text-rp-text-2">
                    <span>{tr('Transcript (ẩn khỏi học viên khi đang thi)')}</span>
                    <Textarea
                      rows={3}
                      value={group.passage.audioTranscript || ''}
                      onChange={(e) => setGroupPassageField({ audioTranscript: e.target.value })}
                      placeholder={tr('Lời thoại hội thoại Nghe hiểu (dùng cho Admin duyệt & AI gợi ý câu hỏi)…')}
                    />
                  </label>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-rp-text">
                  {trf('2. Các câu hỏi gắn với đoạn/bài này ({0})', { 0: group.questions.length })}
                </h4>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  icon={Plus}
                  onClick={() =>
                    setGroup((prev) => ({
                      ...prev,
                      questions: [...prev.questions, createBlankCanonicalQuestion(activeSkill, activeLevel)],
                    }))
                  }
                >
                  {tr('Thêm câu hỏi trong nhóm')}
                </Button>
              </div>

              {group.questions.map((gq, qIdx) => (
                <div
                  key={qIdx}
                  onClick={() => setActiveGroupQuestionIdx(qIdx)}
                  className={`space-y-3 rounded-xl border p-3.5 ${
                    activeGroupQuestionIdx === qIdx ? 'border-rp-brand-border bg-white' : 'border-rp-line bg-white/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-rp-brand-strong">{trf('Câu hỏi #{0}', { 0: qIdx + 1 })}</span>
                    {group.questions.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() =>
                          setGroup((prev) => ({ ...prev, questions: prev.questions.filter((_, i) => i !== qIdx) }))
                        }
                      >
                        {tr('Xóa câu')}
                      </Button>
                    )}
                  </div>
                  {renderSingleQuestionFields(
                    gq,
                    (patch) => updateGroupQuestion(qIdx, patch),
                    (metaPatch) => updateGroupQuestion(qIdx, { skillMetadata: { ...(gq.skillMetadata || {}), ...metaPatch } }),
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!isPublishedLocked && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-rp-line pt-3">
            {isPassageMode ? (
              <>
                <Button type="button" variant="secondary" icon={Save} loading={saveGroup.isPending} onClick={() => saveGroup.mutate()}>
                  {tr('Lưu Nháp nhóm câu hỏi')}
                </Button>
                <Button type="button" variant="primary" icon={Send} loading={submitGroup.isPending} onClick={() => submitGroup.mutate()}>
                  {tr('Gửi Admin duyệt')}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" icon={Save} loading={saveQuestion.isPending} onClick={() => saveQuestion.mutate()}>
                  {tr('Lưu Nháp vào Ngân hàng')}
                </Button>
                <Button type="button" variant="primary" icon={Send} loading={submitQuestion.isPending} onClick={() => submitQuestion.mutate()}>
                  {tr('Gửi Admin duyệt')}
                </Button>
              </>
            )}
          </div>
        )}
      </Card>

      {aiOpen && (
        <InlineAiAssistantDrawer
          open={aiOpen}
          onClose={() => setAiOpen(false)}
          levelCode={activeLevel}
          skillName={activeSkill}
          templateKind={currentAiTarget?.templateKind}
          questionType={currentAiTarget?.questionType}
          currentQuestion={currentAiTarget}
          passageTitle={isPassageMode ? group.passage.title : ''}
          passageText={isPassageMode ? group.passage.passageText : ''}
          listeningTranscript={isPassageMode ? group.passage.audioTranscript : question.audioTranscript}
          onApplySuggestions={handleApplyAiSuggestions}
        />
      )}
    </div>
  );
}
