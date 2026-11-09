import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSession } from '../../auth/session.js';
import { useLocale } from '../../i18n/locale.js';
import {
  cancelLearningPathPreview,
  completeLearningPathDay,
  confirmLearningPathPreview,
  generateLearningPath,
  getLatestLearningPath,
  getLearningPathHistory,
  getStandardRoadmap,
  previewLearningPath,
  startLearningPathDay,
} from '../../api/learningPathApi.js';

const focus =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#AD3155]/35 focus-visible:ring-offset-2';

export default function LearnerPathPanel() {
  const { tr } = useLocale();
  const client = useQueryClient();
  const signedIn = Boolean(getSession()?.accessToken);
  const [notice, setNotice] = useState('');

  const roadmapQuery = useQuery({
    queryKey: ['standard-roadmap'],
    queryFn: getStandardRoadmap,
    enabled: signedIn,
  });
  const pathQuery = useQuery({
    queryKey: ['learning-path'],
    queryFn: getLatestLearningPath,
    enabled: signedIn,
  });
  const historyQuery = useQuery({
    queryKey: ['learning-path-history'],
    queryFn: getLearningPathHistory,
    enabled: signedIn,
  });

  const roadmap = roadmapQuery.data;
  const path = pathQuery.data;
  const isDraft = path?.status === 'DRAFT';

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['learning-path'] });
    await client.invalidateQueries({ queryKey: ['learning-path-history'] });
  };

  const generate = useMutation({
    mutationFn: () => generateLearningPath(),
    onSuccess: async () => {
      setNotice(tr('Đã tạo lộ trình cá nhân.'));
      await refresh();
    },
  });

  const preview = useMutation({
    mutationFn: () => previewLearningPath({
      startingJlptLevelId: roadmap.currentStudyLevelId,
      targetJlptLevelId: roadmap.targetJlptLevelId || undefined,
    }),
    onSuccess: async () => {
      setNotice(tr('Đã tạo bản xem trước. Xác nhận nếu muốn dùng lộ trình này.'));
      await refresh();
    },
  });

  const confirm = useMutation({
    mutationFn: () => confirmLearningPathPreview(path.pathId),
    onSuccess: async () => {
      setNotice(tr('Đã dùng lộ trình mới.'));
      await refresh();
    },
  });

  const cancel = useMutation({
    mutationFn: () => cancelLearningPathPreview(path.pathId),
    onSuccess: async () => {
      setNotice(tr('Đã hủy bản xem trước.'));
      await refresh();
    },
  });

  const startDay = useMutation({
    mutationFn: startLearningPathDay,
    onSuccess: async () => {
      setNotice(tr('Đã mở ngày học.'));
      await refresh();
    },
  });

  const completeDay = useMutation({
    mutationFn: completeLearningPathDay,
    onSuccess: async () => {
      setNotice(tr('Đã hoàn thành ngày học.'));
      await refresh();
    },
  });

  const error = roadmapQuery.error || pathQuery.error || generate.error || preview.error || confirm.error || cancel.error || startDay.error || completeDay.error;
  const activePath = path?.status === 'ACTIVE';
  const history = (Array.isArray(historyQuery.data) ? historyQuery.data : []).filter((item) => item.pathId !== path?.pathId);

  return (
    <section className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <article className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">{tr('LỘ TRÌNH CHUẨN')}</p>
            <h2 className="mt-1 text-[16px] font-semibold">
              {roadmap?.currentStudyLevelName || tr('Cấp độ đang học')}
            </h2>
            <p className="mt-1 text-[12px] text-[#8C7782]">
              {!signedIn
                ? tr('Đăng nhập để xem tiến độ bài học và lộ trình cá nhân.')
                : roadmap
                ? `${roadmap.completedLessons}/${roadmap.totalLessons} ${tr('bài đã xong')}`
                : tr('Đang tải tiến độ bài học…')}
              {roadmap?.targetJlptLevelName ? ` · ${tr('Mục tiêu')} ${roadmap.targetJlptLevelName}` : ''}
            </p>
          </div>
          <Link
            to="/placement"
            className={`inline-flex h-9 items-center rounded-lg border border-[#E7D7DF] px-3 text-[12px] text-[#A47186] hover:bg-[#FFF3F7] ${focus}`}
          >
            {tr('Đánh giá năng lực')}
          </Link>
        </div>
        {roadmapQuery.isError && (
          <p className="mt-3 text-[13px] text-[#A33357]">{roadmapQuery.error.message}</p>
        )}
        {roadmap?.lessons?.length > 0 && (
          <ul className="mt-3 max-h-64 space-y-2 overflow-auto">
            {roadmap.lessons.map((lesson) => (
              <li key={lesson.lessonId}>
                <Link
                  to={`/lesson-player/?lessonId=${lesson.lessonId}`}
                  className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 hover:bg-[#FCF5F8]"
                >
                  <span className="text-[13px]">{lesson.title}</span>
                  <span className={`shrink-0 text-[11px] ${lesson.isCompleted ? 'text-[#2F6B45]' : 'text-[#8C7782]'}`}>
                    {lesson.isCompleted ? tr('Xong') : `${lesson.progressPercent}%`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {roadmap && roadmap.lessons?.length === 0 && (
          <p className="mt-3 text-[13px] text-[#8C7782]">{tr('Chưa có bài học cho cấp độ này.')}</p>
        )}
      </article>

      <article className="rounded-2xl border border-[#EADFE5] bg-white px-5 py-4">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[#AD3155]">{tr('LỘ TRÌNH CÁ NHÂN')}</p>
        <h2 className="mt-1 text-[16px] font-semibold">{tr('Gợi ý theo mục tiêu')}</h2>
        {path?.summary ? (
          <p className="mt-2 text-[13px] leading-6 text-[#6F5C66]">{path.summary}</p>
        ) : (
          <p className="mt-2 text-[13px] leading-6 text-[#8C7782]">
            {tr('Chưa có lộ trình cá nhân. Hệ thống dùng mục tiêu JLPT đã lưu trong hồ sơ.')}
          </p>
        )}
        {path?.strengths?.length > 0 && (
          <p className="mt-2 text-[12px] text-[#2F6B45]">{path.strengths.join(' · ')}</p>
        )}
        {path?.weaknesses?.length > 0 && (
          <p className="mt-1 text-[12px] text-[#A33357]">{path.weaknesses.join(' · ')}</p>
        )}
        {path?.dailySchedules?.length > 0 && (
          <ul className="mt-3 max-h-72 space-y-2 overflow-auto">
            {path.dailySchedules.map((day) => (
              <li key={day.day} className="rounded-xl bg-[#FCF7F9] px-3 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-medium">{tr('Ngày')} {day.day}: {day.title}</p>
                    {day.lessons?.length > 0 && (
                      <p className="mt-0.5 text-[12px] text-[#8C7782]">{day.lessons.join(', ')}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[11px] ${day.isCompleted ? 'text-[#2F6B45]' : 'text-[#8C7782]'}`}>
                    {day.isCompleted ? tr('Xong') : day.isStarted ? tr('Đang học') : day.canStart ? tr('Mở được') : tr('Chưa mở')}
                  </span>
                </div>
                {activePath && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {day.lessonIds?.[0] && (
                      <Link to={`/lesson-player/?lessonId=${day.lessonIds[0]}`} className={`text-[12px] text-[#AD3155] ${focus}`}>{tr('Mở bài')}</Link>
                    )}
                    {!day.isStarted && (
                      <button type="button" disabled={!day.canStart || startDay.isPending} onClick={() => { setNotice(''); startDay.mutate(day.day); }} className={`text-[12px] text-[#6E5360] disabled:opacity-40 ${focus}`}>{tr('Bắt đầu')}</button>
                    )}
                    {day.isStarted && !day.isCompleted && (
                      <button type="button" disabled={completeDay.isPending} onClick={() => { setNotice(''); completeDay.mutate(day.day); }} className={`text-[12px] text-[#2F6B45] disabled:opacity-40 ${focus}`}>{tr('Hoàn thành')}</button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 && (
          <p className="mt-3 text-[12px] text-[#8C7782]">
            {tr('Lộ trình trước')}: {history.slice(0, 3).map((item) => item.status).join(' · ')}
          </p>
        )}

        {(error || notice) && (
          <p role={error ? 'alert' : 'status'} className={`mt-3 text-[13px] ${error ? 'text-[#A33357]' : 'text-[#2F6B45]'}`}>
            {error?.message || notice}
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={generate.isPending}
            onClick={() => {
              setNotice('');
              generate.mutate();
            }}
            className={`h-9 rounded-lg bg-[#AD3155] px-3 text-[12px] font-medium text-white hover:bg-[#982B4B] disabled:opacity-50 ${focus}`}
          >
            {generate.isPending ? tr('Đang tạo…') : tr('Tạo lộ trình')}
          </button>
          <button
            type="button"
            disabled={preview.isPending || !roadmap?.currentStudyLevelId}
            onClick={() => {
              setNotice('');
              preview.mutate();
            }}
            className={`h-9 rounded-lg border border-[#E7DAE1] px-3 text-[12px] text-[#6E5360] disabled:opacity-50 ${focus}`}
          >
            {preview.isPending ? tr('Đang xem trước…') : tr('Xem trước')}
          </button>
          {isDraft && (
            <>
              <button
                type="button"
                disabled={confirm.isPending}
                onClick={() => confirm.mutate()}
                className={`h-9 rounded-lg bg-[#2F6B45] px-3 text-[12px] font-medium text-white disabled:opacity-50 ${focus}`}
              >
                {tr('Xác nhận')}
              </button>
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => cancel.mutate()}
                className={`h-9 rounded-lg px-3 text-[12px] text-[#8C7782] ${focus}`}
              >
                {tr('Hủy xem trước')}
              </button>
            </>
          )}
        </div>
      </article>
    </section>
  );
}
