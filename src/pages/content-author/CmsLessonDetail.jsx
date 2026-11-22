import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, PenLine } from 'lucide-react';
import { ContentAuthorShell } from '@/layouts';
import { Card, ContextualEmptyState, PageHeader } from '@/components/ui';
import { ManualContentWorkspace } from './ManualContentPage.jsx';
import { useLocale } from '@/locales/locale.js';

export default function CmsLessonDetail() {
  const { tr } = useLocale();
  const [params] = useSearchParams();
  const editId = params.get('id') || params.get('editId');

  if (editId) {
    return (
      <ContentAuthorShell breadcrumb={tr('Chi tiết bài học')}>
        <ManualContentWorkspace heading={tr('Bài học')} pageName="CmsLessonDetail" fixedType="Lesson" />
      </ContentAuthorShell>
    );
  }

  return (
    <ContentAuthorShell breadcrumb={tr('Chi tiết bài học')}>
      <main data-page="CmsLessonDetail" className="mx-auto w-full min-w-0 max-w-[1040px] space-y-5">
        <Link
          to="/lesson-cms"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-rp-text-2 hover:text-rp-brand-strong"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{tr('Quay lại danh sách Bài học')}</span>
        </Link>
        <PageHeader
          eyebrow={tr('Bài học')}
          title={tr('Trình biên soạn bài học')}
          description={tr('Mở một bài học từ danh sách Bài học để xem chi tiết hoặc chỉnh sửa trực tiếp dữ liệu trên hệ thống.')}
        />
        <Card className="p-6">
          <ContextualEmptyState
            compact
            title={tr('Chưa chọn bài học cần xem chi tiết.')}
            description={tr('Chọn một bài học từ danh sách Bài học để mở biểu mẫu chỉnh sửa và xem trước.')}
            action={
              <Link
                to="/lesson-cms"
                className="rp-focus inline-flex h-10 items-center gap-2 rounded-rp-input bg-rp-brand-pressed px-4 text-sm font-semibold text-white hover:bg-rp-brand-strong rp-press"
              >
                <PenLine className="h-4 w-4" />
                <span>{tr('Mở danh sách Bài học')}</span>
              </Link>
            }
          />
        </Card>
      </main>
    </ContentAuthorShell>
  );
}
