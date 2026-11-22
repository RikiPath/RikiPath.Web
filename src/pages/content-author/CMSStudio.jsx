import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileSpreadsheet,
  FileText,
  History,
  Languages,
  Pencil,
  Sparkles,
  SpellCheck2,
  HelpCircle,
} from 'lucide-react';
import { api } from '@/api/client.js';
import { useAuth } from '@/app/auth/authContext.js';
import { ContentAuthorShell } from '@/layouts';
import {
  Badge,
  Banner,
  Card,
  ContextualEmptyState,
  ContextualErrorState,
  FeatureIcon,
  PageHeader,
  SakuraLoader,
} from '@/components/ui';
import { useAuthorLookups } from '@/features/content-author/hooks/useAuthorLookups.js';
import { statuses } from '@/features/content-author/utils/contentModel.js';
import { definitions } from '@/features/content-author/utils/contentDefinitions.js';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';

const AUTHORING_TOOLS = [
  {
    to: '/content-manual/',
    title: 'Biên soạn nội dung',
    description: 'Soạn từng từ vựng, Hán tự, ngữ pháp, bài học hoặc bài tập và xem trước trực tiếp.',
    icon: FileText,
    feature: 'writing',
  },
  {
    to: '/lesson-cms/',
    title: 'Bài học',
    description: 'Quản lý bài học theo chứng chỉ, cấp độ (N5–N1), gắn chủ đề và tệp âm thanh.',
    icon: BookOpen,
    feature: 'lesson',
  },
  {
    to: '/exam-builder/',
    title: 'Đề thi thử',
    description: 'Dựng cấu trúc đề thi theo phần thi Admin đã cấu hình, đáp án và lời giải.',
    icon: ClipboardList,
    feature: 'mock',
  },
  {
    to: '/content-plan/',
    title: 'Trợ lý biên soạn',
    description: 'Lập dàn ý bài học hoặc gợi ý Hán tự nhanh với AI, rồi lưu thành bản nháp kiểm duyệt.',
    icon: Sparkles,
    feature: 'ai',
  },
  {
    to: '/bulk-import/',
    title: 'Nhập Excel',
    description: 'Tải lên tệp .xlsx hàng loạt, xem trước bảng đối chiếu và lưu thành lô chờ duyệt.',
    icon: FileSpreadsheet,
    feature: 'overview',
  },
  {
    to: '/bulk-import/?view=history',
    title: 'Lịch sử nhập liệu',
    description: 'Theo dõi các lô Excel đã nhập, chỉnh sửa dòng lỗi và gửi Admin duyệt theo lô.',
    icon: History,
    feature: 'stats',
  },
];

const APPROVED_LIBRARIES = [
  { to: '/vocabulary-editor/', label: 'Từ vựng', note: 'Từ vựng đã duyệt theo cấp độ', icon: Languages },
  { to: '/kanji-editor/', label: 'Hán tự', note: 'Chữ Hán, số nét và âm đọc', icon: SpellCheck2 },
  { to: '/content-library/', label: 'Ngữ pháp', note: 'Mẫu câu và cách dùng đã duyệt', icon: BookOpen },
  { to: '/question-bank/', label: 'Ngân hàng câu hỏi', note: 'Câu hỏi thi & luyện tập đã xuất bản', icon: HelpCircle },
];

const STATUS_BADGE_TONES = {
  Draft: 'neutral',
  PendingReview: 'warning',
  Approved: 'success',
  Rejected: 'danger',
};

function resolveEditRoute(item) {
  if (!item?.targetEntityId) return '/author-dashboard/';
  if (item.entityType === 'MockTest') {
    return `/exam-builder/?editId=${item.targetEntityId}`;
  }
  if (item.entityType === 'Lesson') {
    return `/lesson-cms/?editId=${item.targetEntityId}`;
  }
  return `/content-manual/?type=${encodeURIComponent(item.entityType || 'Lesson')}&editId=${item.targetEntityId}`;
}

export default function CMSStudio() {
  const { tr, trf } = useLocale();
  const { user } = useAuth();
  const { levelById } = useAuthorLookups();

  const mineQuery = useQuery({
    queryKey: ['content-approvals-mine'],
    queryFn: async () => {
      const response = await api.get('/content-approvals/mine');
      return Array.isArray(response) ? response : response?.result || [];
    },
  });

  const stats = useMemo(() => {
    const items = mineQuery.data || [];
    return {
      total: items.length,
      draft: items.filter((item) => item.status === 'Draft').length,
      pending: items.filter((item) => item.status === 'PendingReview').length,
      rejected: items.filter((item) => item.status === 'Rejected').length,
      approved: items.filter((item) => item.status === 'Approved').length,
    };
  }, [mineQuery.data]);

  const actionableItems = useMemo(() => {
    const items = mineQuery.data || [];
    const priority = { Rejected: 0, Draft: 1, PendingReview: 2, Approved: 3 };
    return [...items]
      .filter((item) => item.status === 'Rejected' || item.status === 'Draft' || item.status === 'PendingReview')
      .sort((a, b) => (priority[a.status] ?? 9) - (priority[b.status] ?? 9))
      .slice(0, 6);
  }, [mineQuery.data]);

  const displayName = user?.fullName || user?.userName || tr('Tác giả nội dung');

  return (
    <ContentAuthorShell breadcrumb={tr('Tổng quan')}>
      <main data-page="content-studio" className="mx-auto w-full min-w-0 max-w-[1280px] space-y-6">
        <PageHeader
          eyebrow={tr('RikiPath Content Studio')}
          title={trf('Xin chào, {0}', { 0: displayName })}
          description={tr('Không gian biên soạn, rà soát và đưa học liệu tiếng Nhật qua quy trình kiểm duyệt trước khi xuất bản cho người học.')}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/author-dashboard/"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input border border-rp-line bg-white px-4 text-sm font-medium text-rp-text hover:border-rp-brand-border"
              >
                <span>{tr('Nội dung của tôi')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/content-manual/"
                className="rp-focus inline-flex h-10 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-sm font-semibold text-white hover:bg-rp-brand-deep"
              >
                <Pencil className="h-4 w-4" />
                <span>{tr('Soạn nội dung mới')}</span>
              </Link>
            </div>
          }
        />

        {/* Pipeline Status Overview */}
        <section aria-label={tr('Tình trạng quy trình nội dung')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              key: 'Draft',
              label: tr('Bản nháp'),
              count: stats.draft,
              icon: Pencil,
              toneClass: 'bg-rp-bg-2 text-rp-text-2',
              to: '/author-dashboard/?status=Draft',
            },
            {
              key: 'PendingReview',
              label: tr('Chờ Admin duyệt'),
              count: stats.pending,
              icon: Clock3,
              toneClass: 'bg-amber-50 text-amber-700',
              to: '/author-dashboard/?status=PendingReview',
            },
            {
              key: 'Rejected',
              label: tr('Cần chỉnh sửa'),
              count: stats.rejected,
              icon: AlertCircle,
              toneClass: 'bg-rose-50 text-rp-brand-strong',
              to: '/author-dashboard/?status=Rejected',
            },
            {
              key: 'Approved',
              label: tr('Đã duyệt'),
              count: stats.approved,
              icon: CheckCircle2,
              toneClass: 'bg-emerald-50 text-emerald-700',
              to: '/author-dashboard/?status=Approved',
            },
          ].map((stat) => {
            const IconComp = stat.icon;
            return (
              <Link key={stat.key} to={stat.to} className="rp-focus block rounded-rp-card">
                <Card className="flex h-full items-center justify-between gap-3 p-4 transition-colors hover:border-rp-brand-border">
                  <div>
                    <p className="text-xs font-medium text-rp-text-muted">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-rp-text">
                      {mineQuery.isPending ? '—' : stat.count}
                    </p>
                  </div>
                  <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.toneClass}`}>
                    <IconComp className="h-5 w-5" />
                  </span>
                </Card>
              </Link>
            );
          })}
        </section>

        {stats.rejected > 0 && (
          <Banner
            tone="warning"
            title={trf('Bạn có {0} mục bị Admin từ chối cần chỉnh sửa', { 0: stats.rejected })}
            actions={
              <Link
                to="/author-dashboard/?status=Rejected"
                className="rp-focus inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-semibold text-amber-900 shadow-xs hover:bg-amber-50"
              >
                {tr('Xem & sửa ngay')}
              </Link>
            }
          >
            {tr('Mở từng mục bị từ chối để đọc góp ý của Admin, chỉnh sửa nội dung và gửi duyệt lại.')}
          </Banner>
        )}

        {/* Actionable Recent Work */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-rp-text">{tr('Cần xử lý & bản nháp gần đây')}</h2>
              <p className="text-xs text-rp-text-muted">
                {tr('Ưu tiên hiển thị các mục bị từ chối, bản nháp đang dở và mục đang chờ duyệt trên máy chủ.')}
              </p>
            </div>
            <Link to="/author-dashboard/" className="rp-link text-sm font-medium text-rp-brand-strong">
              {tr('Xem toàn bộ nội dung')} →
            </Link>
          </div>

          {mineQuery.isPending ? (
            <SakuraLoader variant="section" context="lesson" delay={150} />
          ) : mineQuery.isError ? (
            <ContextualErrorState
              compact
              error={mineQuery.error}
              title={tr('Chưa tải được danh sách công việc')}
              onRetry={() => mineQuery.refetch()}
            />
          ) : actionableItems.length === 0 ? (
            <ContextualEmptyState
              compact
              icon={CheckCircle2}
              title={tr('Chưa có mục nháp hay mục chờ xử lý nào')}
              description={tr('Hãy bắt đầu bằng cách soạn một bài học, bộ từ vựng hoặc nhập hàng loạt từ Excel.')}
              action={
                <Link
                  to="/content-manual/"
                  className="rp-focus inline-flex h-9 items-center gap-1.5 rounded-rp-input bg-rp-brand-strong px-4 text-xs font-semibold text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span>{tr('Tạo học liệu đầu tiên')}</span>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {actionableItems.map((item) => {
                const levelCode = item.certificateLevelCode || levelById.get(Number(item.certificateLevelId))?.code;
                const entityLabel = tr(definitions[item.entityType]?.label || item.entityType);
                return (
                  <Card key={item.id} className="flex flex-col justify-between gap-3 p-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="brand" size="sm" icon={false}>{entityLabel}</Badge>
                          {levelCode && <Badge tone="neutral" size="sm" icon={false}>{levelCode}</Badge>}
                        </div>
                        <Badge tone={STATUS_BADGE_TONES[item.status] || 'neutral'} size="sm" icon={false}>
                          {tr(statuses[item.status]?.label ?? item.status)}
                        </Badge>
                      </div>
                      <h3 className="rp-jp line-clamp-1 text-sm font-semibold text-rp-text">{item.rowKey || '—'}</h3>
                      {item.status === 'Rejected' && item.reviewNote && (
                        <p className="line-clamp-2 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs text-rose-800">
                          {item.reviewNote}
                        </p>
                      )}
                      {item.sourceFileName && (
                        <p className="truncate text-xs text-rp-text-muted">{item.sourceFileName}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-rp-line pt-2.5 text-xs text-rp-text-muted">
                      <span>{formatVnDateTime(item.updatedAt || item.submittedAt)}</span>
                      <Link
                        to={resolveEditRoute(item)}
                        className="rp-link inline-flex items-center gap-1 font-semibold text-rp-brand-strong"
                      >
                        <span>{item.status === 'PendingReview' ? tr('Xem') : tr('Mở trình soạn')}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Authoring Tools */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-rp-text">{tr('Công cụ biên soạn')}</h2>
            <p className="text-xs text-rp-text-muted">{tr('Chọn công cụ phù hợp theo quy mô học liệu bạn đang chuẩn bị.')}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {AUTHORING_TOOLS.map((tool) => (
              <Link key={tool.to} to={tool.to} className="rp-focus block rounded-rp-card">
                <Card className="flex h-full items-start gap-3.5 p-4 transition-colors hover:border-rp-brand-border">
                  <FeatureIcon feature={tool.feature} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-rp-text">{tr(tool.title)}</h3>
                    <p className="mt-1 text-xs leading-5 text-rp-text-muted">{tr(tool.description)}</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Approved Libraries */}
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-bold text-rp-text">{tr('Kho học liệu đã duyệt')}</h2>
            <p className="text-xs text-rp-text-muted">{tr('Tra cứu nội dung đã phát hành để tránh trùng lặp khi biên soạn.')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {APPROVED_LIBRARIES.map((lib) => {
              const LibIcon = lib.icon;
              return (
                <Link key={lib.to} to={lib.to} className="rp-focus block rounded-rp-card">
                  <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-rp-brand-border">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rp-brand-tint text-rp-brand-strong">
                      <LibIcon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-rp-text">{tr(lib.label)}</p>
                      <p className="mt-0.5 truncate text-xs text-rp-text-muted">{tr(lib.note)}</p>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
    </ContentAuthorShell>
  );
}
