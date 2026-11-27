import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowDownUp,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  Eye,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { Popover } from '@/components/ui/overlay.jsx';
import { formatIsoDateDisplay, formatTimeRange } from '@/components/ui';
import { ContextualEmptyState } from '@/components/ui/SmartDataBoundary.jsx';
import Pagination from '@/components/ui/Pagination.jsx';
import { useLocale } from '@/locales/locale.js';
import { formatShortDateVn } from '@/features/scheduling/utils/calendarGeometry.js';
import { formatWeekdayVn } from '@/features/scheduling/utils/registrationTableModel.js';

function statusBadgeStyle(row) {
  if (row.isSelectedDraft) {
    return {
      pill: 'border border-dashed border-[#4ADE80] bg-[#E3FCE9] text-[#15803D]',
      dot: 'bg-[#22C55E]',
    };
  }
  if (row.isChangesRequested || row.statusGroup === 'needsRevision') {
    return {
      pill: 'border border-orange-200 bg-orange-50 text-orange-800',
      dot: 'bg-[#EA580C]',
    };
  }
  if (row.statusGroup === 'pending') {
    return {
      pill: 'border border-[#F3D7A4] bg-[#FFF5E2] text-[#8E5306]',
      dot: 'bg-[#E4A020]',
    };
  }
  if (row.statusGroup === 'approved') {
    return {
      pill: 'border border-[#86EFAC] bg-[#DCFCE7] text-[#15803D]',
      dot: 'bg-[#16A34A]',
    };
  }
  return {
    pill: 'border border-[#F5C2C7] bg-[#FDECEC] text-[#B42318]',
    dot: 'bg-[#DC3545]',
  };
}

function RegistrationActionMenu({ items = [], triggerLabel }) {
  if (!items || items.length === 0) return null;
  return (
    <Popover
      align="end"
      label={triggerLabel}
      panelClassName="w-56 p-1.5"
      trigger={({ props, toggle }) => (
        <button
          {...props}
          type="button"
          aria-label={triggerLabel}
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-rp-line bg-white text-rp-text-muted transition-colors hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}
    >
      {({ close }) => (
        <div role="menu" className="space-y-0.5" onClick={(e) => e.stopPropagation()}>
          {items.map((item) => {
            const Icon = item.icon;
            if (item.to) {
              return (
                <Link
                  key={item.id}
                  to={item.to}
                  role="menuitem"
                  onClick={(e) => {
                    e.stopPropagation();
                    close();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold text-rp-text transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                >
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span>{item.label}</span>
                </Link>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                title={item.title}
                onClick={(e) => {
                  e.stopPropagation();
                  close();
                  item.onClick?.();
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                  item.danger
                    ? 'text-red-700 hover:bg-red-50'
                    : 'text-rp-text hover:bg-rp-brand-tint hover:text-rp-brand-strong'
                }`}
              >
                {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </Popover>
  );
}

function ExpandedRegistrationDetail({
  row,
  detailOpen,
  onToggleDetail,
  onEditWeeklyPattern,
  onDeselectWeeklyPattern,
  onJumpToPatternOnCalendar,
  onJumpToOccurrenceOnCalendar,
  onOpenCourseInfo,
  onClearSelection,
  capacityLocked = false,
  capacityLockedMessage = '',
  busy = false,
}) {
  const { tr, trf } = useLocale();
  const hasDetailSchedule = row.occurrences.length > 0;
  const distinctYears = useMemo(() => {
    const set = new Set();
    for (const occ of row.occurrences) {
      if (occ.year) set.add(occ.year);
    }
    return [...set];
  }, [row.occurrences]);
  const spansMultipleYears = distinctYears.length > 1;
  const singleYearHeader = distinctYears.length === 1 ? distinctYears[0] : null;

  return (
    <div
      id={`reg-expanded-${row.rowKey}`}
      data-testid={`reg-expanded-${row.rowKey}`}
      className="space-y-3 bg-[#FAF9FB] px-5 py-3.5 text-[12.5px]"
    >
      {/* Contextual status notices (capacity lock / review feedback / linked class / expired start date) */}
      {row.isSelectedDraft && capacityLocked && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-rp-text-2"
        >
          <span className="inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-slate-600" aria-hidden="true" />
            <span>{tr(capacityLockedMessage || 'Bạn đã đăng ký đủ các cấp độ giảng dạy.')}</span>
          </span>
          {onClearSelection && (
            <button
              type="button"
              disabled={busy}
              onClick={(e) => {
                e.stopPropagation();
                onClearSelection();
              }}
              className="rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              {tr('Bỏ chọn tất cả')}
            </button>
          )}
        </div>
      )}
      {row.hasInvalidStartDate && row.startDateWarningMessage && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950"
        >
          <span className="inline-flex items-center gap-1.5 font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-700" aria-hidden="true" />
            <span>{tr(row.startDateWarningMessage)}</span>
          </span>
          {!capacityLocked && onOpenCourseInfo && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenCourseInfo();
              }}
              className="rounded-lg border border-amber-300 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-amber-900 hover:bg-amber-100/70"
            >
              {tr('Chọn ngày bắt đầu mới')}
            </button>
          )}
        </div>
      )}

      {row.reviewReason && (
        <div
          className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${
            row.isChangesRequested || row.statusGroup === 'needsRevision'
              ? 'border-orange-200 bg-orange-50/90 text-orange-950'
              : 'border-red-200 bg-red-50/90 text-red-900'
          }`}
        >
          <AlertTriangle
            className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
              row.isChangesRequested || row.statusGroup === 'needsRevision'
                ? 'text-[#EA580C]'
                : 'text-red-600'
            }`}
            aria-hidden="true"
          />
          <span>
            <span className="font-semibold">
              {row.isChangesRequested || row.statusGroup === 'needsRevision'
                ? tr('Yêu cầu từ quản trị viên')
                : tr('Phản hồi quản trị viên')}:
            </span>{' '}
            {row.reviewReason}
          </span>
        </div>
      )}

      {row.linkedCohortName && (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs ${
            row.linkedCohortStatus === 'Cancelled'
              ? 'border-red-200 bg-red-50/75 text-red-900'
              : 'border-emerald-200 bg-emerald-50/75 text-emerald-900'
          }`}
        >
          <span className="inline-flex flex-wrap items-center gap-1.5 font-semibold">
            <CheckCircle2
              className={`h-3.5 w-3.5 shrink-0 ${row.linkedCohortStatus === 'Cancelled' ? 'text-red-700' : 'text-emerald-700'}`}
              aria-hidden="true"
            />
            <span>
              {row.linkedCohortStatus === 'Cancelled'
                ? `${tr('Lớp đã mở')}: ${row.linkedCohortName} (${tr('Đã hủy')})`
                : `${tr('Đã gắn lớp nhóm')}: ${row.linkedCohortName}`}
            </span>
            {row.linkedCohortStatus === 'Cancelled' && row.linkedCohortCancellationReason && (
              <span className="font-normal text-red-800">· {row.linkedCohortCancellationReason}</span>
            )}
          </span>
          {row.linkedCohortHref && (
            <Link
              to={row.linkedCohortHref}
              className={`inline-flex items-center gap-1 font-semibold ${
                row.linkedCohortStatus === 'Cancelled' ? 'text-red-800 hover:text-red-950' : 'text-emerald-800 hover:text-emerald-950'
              }`}
            >
              <span>{tr('Mở lớp phụ trách')}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      )}

      {/* Level 2 — Weekly Schedule Patterns */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[12.5px] font-semibold text-rp-text-2">
            {trf('Khung giờ hằng tuần ({0} buổi/tuần · {1} phút/buổi)', {
              0: row.weeklyPatterns.length,
              1: row.sessionDurationMinutes,
            })}
          </span>
          {row.status !== 'Approved' && (
            <span className="text-[12px] text-rp-text-muted">
              {tr('Lịch học sẽ được xác lập khi đề xuất được duyệt.')}
            </span>
          )}
        </div>

        <div className="divide-y divide-rp-line/60 overflow-hidden rounded-xl border border-rp-line/80 bg-white">
          {row.weeklyPatterns.map((pat) => (
            <div
              key={pat.key}
              data-testid={`weekly-pattern-row-${row.rowKey}-${pat.key}`}
              className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 transition-colors hover:bg-[#FFFBFD]"
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className="min-w-[68px] font-bold text-rp-text">
                  {tr(formatWeekdayVn(pat.weekday))}
                </span>
                <span className="text-rp-text-muted" aria-hidden="true">·</span>
                <span className="font-semibold tabular-nums text-rp-text">
                  {formatTimeRange(pat.startClock, pat.endClock)}
                </span>
                {pat.invalidReason && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    <span>{pat.invalidReason}</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {pat.dayKeyHint && !row.hasInvalidStartDate && (
                  <button
                    type="button"
                    data-testid={`pattern-view-calendar-${pat.key}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onJumpToPatternOnCalendar?.(row, pat);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-rp-text-2 transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                  >
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tr('Xem trên lịch')}</span>
                  </button>
                )}
                {row.isSelectedDraft && !row.hasInvalidStartDate && !capacityLocked && (
                  <button
                    type="button"
                    data-testid={`pattern-edit-${pat.key}`}
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditWeeklyPattern?.(row, pat);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-rp-text-2 transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{tr('Đổi giờ')}</span>
                  </button>
                )}
                {row.isSelectedDraft && !capacityLocked && (
                  <button
                    type="button"
                    data-testid={`pattern-deselect-${pat.key}`}
                    disabled={busy}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeselectWeeklyPattern?.(row, pat);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-lg px-2 text-[11.5px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{tr('Bỏ chọn')}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Level 3 — Detailed 10-Week Schedule (collapsed by default, shown only when actual/valid preview occurrences exist) */}
      {hasDetailSchedule && (
        <div className="pt-0.5">
          <button
            type="button"
            data-testid={`toggle-detail-schedule-${row.rowKey}`}
            aria-expanded={detailOpen}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDetail?.();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-semibold text-rp-brand-strong transition-colors hover:bg-rp-brand-tint"
          >
            {detailOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
              <span>
                {detailOpen
                  ? tr('Thu gọn lịch chi tiết')
                  : trf('Lịch giảng dạy chi tiết ({0} buổi)', { 0: row.occurrences.length })}
              </span>
            {singleYearHeader && !detailOpen && (
              <span className="text-[11px] font-normal text-rp-text-muted">
                ({trf('Năm {0}', { 0: singleYearHeader })})
              </span>
            )}
          </button>

          {detailOpen && (
            <div
              data-testid={`detail-schedule-panel-${row.rowKey}`}
              className="mt-2 overflow-hidden rounded-xl border border-rp-line/80 bg-white"
            >
              {singleYearHeader && (
                <div className="border-b border-rp-line/60 bg-[#FAF7F9] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wide text-rp-text-muted">
                  {trf('Lịch chi tiết {0} buổi · Năm {1}', { 0: row.occurrences.length, 1: singleYearHeader })}
                </div>
              )}
              <div
                className="grid max-h-[256px] min-w-0 gap-2 overflow-y-auto p-2.5"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}
              >
                {row.occurrences.map((occ, idx) => {
                  const prevYear = idx > 0 ? row.occurrences[idx - 1].year : null;
                  const showYearSeparator = spansMultipleYears && occ.year !== prevYear;
                  return [
                    showYearSeparator && (
                      <div
                        key={`yr-${row.rowKey}-${occ.year}-${idx}`}
                        className="col-span-full flex items-center gap-2 pt-1 first:pt-0 text-[11px] font-bold uppercase tracking-wide text-rp-text-muted"
                      >
                        <span>{trf('Năm {0}', { 0: occ.year })}</span>
                        <span className="h-px flex-1 bg-rp-line/70" />
                      </div>
                    ),
                    <div
                      key={occ.id}
                      className="group box-border flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-lg border border-rp-line/80 bg-rp-bg-2/25 px-2.5 py-1.5 text-[12px] transition-colors hover:border-rp-brand-border/60 hover:bg-[#FFFBFD]"
                    >
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5 tabular-nums">
                        <span className="font-semibold text-rp-text-muted">
                          {trf('Buổi {0}', { 0: occ.sessionNumber })}
                        </span>
                        <span className="text-rp-text-muted" aria-hidden="true">·</span>
                        <span className="font-semibold text-rp-text">
                          {tr(formatWeekdayVn(occ.weekday))} - {formatShortDateVn(occ.dayKey)}
                        </span>
                        <span className="text-rp-text-2">
                          ({formatTimeRange(occ.startClock, occ.endClock)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onJumpToOccurrenceOnCalendar?.(row, occ);
                        }}
                        className="inline-flex h-6.5 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-semibold text-rp-text-muted opacity-80 transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong group-hover:opacity-100"
                      >
                        <CalendarDays className="h-3 w-3" />
                        <span>{tr('Xem trên lịch')}</span>
                      </button>
                    </div>,
                  ];
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Three-Level Expandable Grouped Registration Table for `/mentor-shift-schedule/` List View:
 * - Level 1: 1 row per registration (active selection or official proposal)
 * - Level 2: weekly recurring schedule patterns
 * - Level 3: Detailed official class schedule (collapsed by default)
 */
export default function ExpandableRegistrationTable({
  rows = [],
  totalUnfilteredCount = 0,
  sortBy = 'default',
  onToggleSort,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  busy = false,
  capacityLocked = false,
  capacityLockedMessage = '',
  onContinueSelection,
  onEditSelectionSchedule,
  onOpenCourseInfo,
  onClearSelection,
  onInspectProposal,
  onEditRevisionProposal,
  onWithdrawProposal,
  onReregisterProposal,
  onRequestApprovedSlotAction,
  onEditWeeklyPattern,
  onDeselectWeeklyPattern,
  onJumpToRegistrationOnCalendar,
  onJumpToPatternOnCalendar,
  onJumpToOccurrenceOnCalendar,
}) {
  const { tr, trf } = useLocale();
  // Map of rowKey -> explicit boolean override; default: 'active-selection' = true, others = false
  const [expandedOverrides, setExpandedOverrides] = useState({});
  // Set of rowKeys whose Level 3 detailed official schedule is expanded (always collapsed by default)
  const [detailExpandedMap, setDetailExpandedMap] = useState({});

  const visibleRowKeySet = useMemo(() => new Set(rows.map((r) => r.rowKey)), [rows]);

  const isRowExpanded = (rowKey) => {
    if (!visibleRowKeySet.has(rowKey)) return false;
    if (Object.prototype.hasOwnProperty.call(expandedOverrides, rowKey)) {
      return Boolean(expandedOverrides[rowKey]);
    }
    return rowKey === 'active-selection';
  };

  const toggleRowExpanded = (rowKey) => {
    const cur = isRowExpanded(rowKey);
    setExpandedOverrides((prev) => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (visibleRowKeySet.has(k)) next[k] = v;
      }
      next[rowKey] = !cur;
      return next;
    });
    if (cur) {
      // Collapsing Level 1 also collapses Level 3 cleanly and prunes stale keys
      setDetailExpandedMap((prev) => {
        const next = {};
        for (const [k, v] of Object.entries(prev)) {
          if (k !== rowKey && visibleRowKeySet.has(k)) next[k] = v;
        }
        return next;
      });
    }
  };

  const toggleDetailExpanded = (rowKey) => {
    setDetailExpandedMap((prev) => {
      const next = {};
      for (const [k, v] of Object.entries(prev)) {
        if (visibleRowKeySet.has(k)) next[k] = v;
      }
      next[rowKey] = !prev[rowKey];
      return next;
    });
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => rows.slice((safePage - 1) * pageSize, safePage * pageSize),
    [rows, safePage, pageSize]
  );

  const buildRowActions = (row) => {
    let primaryAction;
    const menuItems = [];

    if (row.isSelectedDraft) {
      primaryAction = {
        id: 'continue',
        testId: `reg-action-primary-${row.rowKey}`,
        label: tr('Tiếp tục'),
        iconRight: ArrowRight,
        variant: 'primary',
        disabled: busy || capacityLocked || !row.canProceed,
        title: capacityLocked
          ? tr(capacityLockedMessage || 'Bạn chưa đủ điều kiện mở lớp.')
          : row.canProceed
            ? tr('Bước tiếp theo: Thông tin lớp dự kiến')
            : tr('Vui lòng chọn ít nhất một khung giờ.'),
        onClick: () => {
          if (!capacityLocked) onContinueSelection?.();
        },
      };
      if (!capacityLocked) {
        menuItems.push({
          id: 'edit-schedule',
          label: tr('Chỉnh sửa lịch'),
          icon: Pencil,
          onClick: () => onEditSelectionSchedule?.(row),
        });
      }
      if (!row.hasInvalidStartDate) {
        menuItems.push({
          id: 'view-on-calendar',
          label: tr('Xem trên lịch'),
          icon: CalendarDays,
          onClick: () => onJumpToRegistrationOnCalendar?.(row),
        });
      }
      if (!capacityLocked) {
        menuItems.push({
          id: 'edit-course-info',
          label: tr('Chỉnh sửa thông tin lớp'),
          icon: Eye,
          onClick: () => onOpenCourseInfo?.(),
        });
      }
      menuItems.push({
        id: 'clear-all',
        label: tr('Bỏ chọn tất cả'),
        icon: Trash2,
        danger: true,
        disabled: busy,
        onClick: () => onClearSelection?.(),
      });
    } else if (row.isChangesRequested || row.statusGroup === 'needsRevision') {
      const handleEdit = () => (onEditRevisionProposal ? onEditRevisionProposal(row.proposalId) : onInspectProposal?.(row.proposalId));
      primaryAction = {
        id: 'edit-proposal',
        testId: `reg-action-primary-${row.rowKey}`,
        label: tr('Chỉnh sửa đề xuất'),
        icon: Pencil,
        variant: 'primary',
        onClick: handleEdit,
      };
      menuItems.push({
        id: 'edit-revision',
        label: tr('Chỉnh sửa đề xuất'),
        icon: Pencil,
        onClick: handleEdit,
      });
      menuItems.push({
        id: 'view-detail',
        label: tr('Xem chi tiết'),
        icon: Eye,
        onClick: () => onInspectProposal?.(row.proposalId),
      });
      menuItems.push({
        id: 'view-on-calendar',
        label: tr('Xem trên lịch'),
        icon: CalendarDays,
        onClick: () => onJumpToRegistrationOnCalendar?.(row),
      });
      if (row.proposalId && onWithdrawProposal) {
        menuItems.push({
          id: 'withdraw',
          label: tr('Hủy đề xuất'),
          icon: Trash2,
          danger: true,
          onClick: () => onWithdrawProposal(row.proposalId),
        });
      }
    } else if (row.statusGroup === 'pending') {
      primaryAction = {
        id: 'view',
        testId: `reg-action-primary-${row.rowKey}`,
        label: tr('Xem'),
        icon: Eye,
        onClick: () => onInspectProposal?.(row.proposalId),
      };
      menuItems.push({
        id: 'view-detail',
        label: tr('Xem chi tiết'),
        icon: Eye,
        onClick: () => onInspectProposal?.(row.proposalId),
      });
      menuItems.push({
        id: 'view-on-calendar',
        label: tr('Xem trên lịch'),
        icon: CalendarDays,
        onClick: () => onJumpToRegistrationOnCalendar?.(row),
      });
      if (row.proposalId && onWithdrawProposal) {
        menuItems.push({
          id: 'withdraw',
          label: tr('Hủy đề xuất'),
          icon: Trash2,
          danger: true,
          onClick: () => onWithdrawProposal(row.proposalId),
        });
      }
    } else if (row.statusGroup === 'approved') {
      primaryAction = {
        id: 'view',
        testId: `reg-action-primary-${row.rowKey}`,
        label: tr('Xem'),
        icon: Eye,
        onClick: () => onInspectProposal?.(row.proposalId),
      };
      menuItems.push({
        id: 'view-detail',
        label: tr('Xem chi tiết'),
        icon: Eye,
        onClick: () => onInspectProposal?.(row.proposalId),
      });
      menuItems.push({
        id: 'view-on-calendar',
        label: tr('Xem trên lịch'),
        icon: CalendarDays,
        onClick: () => onJumpToRegistrationOnCalendar?.(row),
      });
      if (row.linkedCohortHref) {
        menuItems.push({
          id: 'open-cohort',
          label: tr('Xem lớp phụ trách'),
          icon: ExternalLink,
          to: row.linkedCohortHref,
        });
      }
      if (row.eligibleApprovedSlot && onRequestApprovedSlotAction) {
        menuItems.push({
          id: 'request-slot-action',
          label: tr('Yêu cầu đổi/hủy lịch'),
          icon: Clock,
          onClick: () => onRequestApprovedSlotAction(row.eligibleApprovedSlot),
        });
      }
    } else {
      // Rejected
      primaryAction = {
        id: 'view-reason',
        testId: `reg-action-primary-${row.rowKey}`,
        label: tr('Xem lý do'),
        icon: Eye,
        onClick: () => onInspectProposal?.(row.proposalId),
      };
      menuItems.push({
        id: 'view-detail',
        label: tr('Xem chi tiết'),
        icon: Eye,
        onClick: () => onInspectProposal?.(row.proposalId),
      });
      menuItems.push({
        id: 'view-on-calendar',
        label: tr('Xem lịch đã đề xuất'),
        icon: CalendarDays,
        onClick: () => onJumpToRegistrationOnCalendar?.(row),
      });
      if (row.proposalId && onReregisterProposal) {
        menuItems.push({
          id: 'reregister',
          label: tr('Đăng ký lại'),
          icon: RotateCcw,
          disabled: busy || capacityLocked,
          title: capacityLocked
            ? tr(capacityLockedMessage || 'Bạn đã đăng ký đủ các cấp độ giảng dạy.')
            : undefined,
          onClick: () => {
            if (!capacityLocked) onReregisterProposal(row.proposalId);
          },
        });
      }
    }

    return { primaryAction, menuItems };
  };

  if (rows.length === 0) {
    return (
      <div className="p-8" data-testid="registration-table-empty">
        <ContextualEmptyState
          variant="compact"
          context="calendar"
          illustration="calendar"
          title={totalUnfilteredCount > 0
            ? tr('Chưa có đăng ký nào khớp điều kiện đang lọc')
            : tr('Chưa có đăng ký mở lớp nào')}
          description={totalUnfilteredCount > 0
            ? tr('Hãy điều chỉnh hoặc xóa bộ lọc để xem toàn bộ danh sách đăng ký của bạn.')
            : tr('Chọn trực tiếp ít nhất một khung giờ trên Lịch để bắt đầu tạo đề xuất mở lớp.')}
        />
      </div>
    );
  }

  return (
    <div data-testid="expandable-registration-table" className="bg-white">
      {/* Mobile Compact Expandable Cards (<768px) */}
      <div className="divide-y divide-rp-line md:hidden">
        {pagedRows.map((row) => {
          const expanded = isRowExpanded(row.rowKey);
          const badge = statusBadgeStyle(row);
          const { primaryAction, menuItems } = buildRowActions(row);
          const PrimaryIcon = primaryAction?.icon;
          const PrimaryRightIcon = primaryAction?.iconRight;

          return (
            <div key={`m-${row.rowKey}`} data-testid={`reg-card-${row.rowKey}`} className="bg-white">
              <div className="space-y-2.5 p-3.5 text-[13px]">
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`reg-expanded-${row.rowKey}`}
                    onClick={() => toggleRowExpanded(row.rowKey)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-rp-text-muted hover:bg-rp-brand-tint hover:text-rp-brand-strong">
                      {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {row.showLevelBadge && row.jlptLevelCode && (
                        <>
                          <span className="shrink-0 text-[13px] font-semibold text-rp-text">
                            {row.jlptLevelCode}
                          </span>
                          <span aria-hidden="true" className="text-rp-text-muted">·</span>
                        </>
                      )}
                      <span className="truncate font-bold text-rp-text">{tr(row.displayTitle)}</span>
                    </div>
                  </button>
                  <span
                    data-status-key={row.statusGroup}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${badge.pill}`}
                  >
                    <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                    {tr(row.statusLabel)}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-8 text-xs text-rp-text-2 tabular-nums">
                  <span className="font-semibold text-rp-text">
                    {trf('{0} buổi/tuần', { 0: row.weeklyCount })}
                  </span>
                  <span>
                    {row.isEstimatedTotal
                      ? trf('{0} buổi dự kiến', { 0: row.expectedTotalSessions })
                      : trf('{0} buổi', { 0: row.expectedTotalSessions })}
                  </span>
                  <span>
                    {tr('Ngày bắt đầu')}:{' '}
                    <span className={row.expectedStartDate ? 'font-semibold text-rp-text' : 'text-rp-text-muted'}>
                      {row.expectedStartDate ? formatIsoDateDisplay(row.expectedStartDate) : tr('Chờ xác lập')}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-end gap-1.5 pl-8">
                  {primaryAction && (
                    <button
                      type="button"
                      disabled={primaryAction.disabled}
                      title={primaryAction.title}
                      onClick={(e) => {
                        e.stopPropagation();
                        primaryAction.onClick?.();
                      }}
                      className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                        primaryAction.variant === 'primary'
                          ? 'border-transparent bg-rp-brand-pressed text-white hover:bg-rp-brand-strong'
                          : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong'
                      }`}
                    >
                      {PrimaryIcon && <PrimaryIcon className="h-3.5 w-3.5" />}
                      <span>{primaryAction.label}</span>
                      {PrimaryRightIcon && <PrimaryRightIcon className="h-3.5 w-3.5" />}
                    </button>
                  )}
                  <RegistrationActionMenu items={menuItems} triggerLabel={tr('Thao tác khác')} />
                </div>
              </div>

              {expanded && (
                <div className="border-t border-rp-line/70">
                  <ExpandedRegistrationDetail
                    row={row}
                    detailOpen={Boolean(detailExpandedMap[row.rowKey])}
                    onToggleDetail={() => toggleDetailExpanded(row.rowKey)}
                    onEditWeeklyPattern={onEditWeeklyPattern}
                    onDeselectWeeklyPattern={onDeselectWeeklyPattern}
                    onJumpToPatternOnCalendar={onJumpToPatternOnCalendar}
                    onJumpToOccurrenceOnCalendar={onJumpToOccurrenceOnCalendar}
                    onOpenCourseInfo={onOpenCourseInfo}
                    busy={busy}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop 6-Column Expandable Table (zero excess height when few rows) */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
          <thead className="border-b border-rp-brand-border/80 bg-rp-table-head text-[12.5px] font-semibold text-rp-brand-strong">
            <tr>
              <th className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => onToggleSort?.('jlpt')}
                  className={`inline-flex items-center gap-1 font-semibold uppercase transition-colors hover:text-rp-brand-strong ${
                    sortBy === 'jlpt' ? 'text-rp-brand-strong' : 'text-rp-text-muted'
                  }`}
                >
                  <span>{tr('Lớp đăng ký')}</span>
                  <ArrowDownUp className="h-3 w-3 opacity-70" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onToggleSort?.('frequency')}
                  className={`inline-flex items-center justify-center gap-1 font-semibold uppercase transition-colors hover:text-rp-brand-strong ${
                    sortBy === 'frequency' ? 'text-rp-brand-strong' : 'text-rp-text-muted'
                  }`}
                >
                  <span>{tr('Tần suất')}</span>
                  <ArrowDownUp className="h-3 w-3 opacity-70" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">
                {tr('Tổng số buổi')}
              </th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onToggleSort?.('startDate')}
                  className={`inline-flex items-center justify-center gap-1 font-semibold uppercase transition-colors hover:text-rp-brand-strong ${
                    sortBy === 'startDate' ? 'text-rp-brand-strong' : 'text-rp-text-muted'
                  }`}
                >
                  <span>{tr('Ngày bắt đầu')}</span>
                  <ArrowDownUp className="h-3 w-3 opacity-70" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">
                <button
                  type="button"
                  onClick={() => onToggleSort?.('status')}
                  className={`inline-flex items-center justify-center gap-1 font-semibold uppercase transition-colors hover:text-rp-brand-strong ${
                    sortBy === 'status' ? 'text-rp-brand-strong' : 'text-rp-text-muted'
                  }`}
                >
                  <span>{tr('Trạng thái')}</span>
                  <ArrowDownUp className="h-3 w-3 opacity-70" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-center whitespace-nowrap">{tr('Thao tác')}</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-rp-line/70">
            {pagedRows.map((row) => {
              const expanded = isRowExpanded(row.rowKey);
              const badge = statusBadgeStyle(row);
              const { primaryAction, menuItems } = buildRowActions(row);
              const PrimaryIcon = primaryAction?.icon;
              const PrimaryRightIcon = primaryAction?.iconRight;

              return [
                <tr
                  key={row.rowKey}
                  data-testid={`reg-row-${row.rowKey}`}
                  onClick={() => toggleRowExpanded(row.rowKey)}
                  className={`cursor-pointer transition-colors ${
                    expanded ? 'bg-[#FFFBFD]' : 'hover:bg-rp-bg-2/45'
                  }`}
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        data-testid={`reg-expand-btn-${row.rowKey}`}
                        aria-expanded={expanded}
                        aria-controls={`reg-expanded-${row.rowKey}`}
                        aria-label={expanded ? tr('Thu gọn lịch hằng tuần') : tr('Mở rộng lịch hằng tuần')}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRowExpanded(row.rowKey);
                        }}
                        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-rp-text-muted transition-colors hover:bg-rp-brand-tint hover:text-rp-brand-strong"
                      >
                        <ChevronRight
                          className={`h-4 w-4 transition-transform duration-150 motion-reduce:transition-none ${
                            expanded ? 'rotate-90 text-rp-brand-strong' : ''
                          }`}
                        />
                      </button>
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        {row.showLevelBadge && row.jlptLevelCode && (
                          <>
                            <span className="shrink-0 text-[13px] font-semibold text-rp-text">
                              {row.jlptLevelCode}
                            </span>
                            <span aria-hidden="true" className="text-rp-text-muted">·</span>
                          </>
                        )}
                        <span className="truncate font-bold text-rp-text">
                          {tr(row.displayTitle)}
                        </span>
                        {row.hasInvalidStartDate && (
                          <span
                            title={tr(row.startDateWarningMessage || 'Ngày bắt đầu không còn phù hợp.')}
                            className="inline-flex items-center text-amber-600"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center align-middle whitespace-nowrap font-semibold tabular-nums text-rp-text">
                    {trf('{0} buổi/tuần', { 0: row.weeklyCount })}
                  </td>

                  <td className="px-4 py-3 text-center align-middle whitespace-nowrap tabular-nums">
                    <span className="font-semibold text-rp-text">{row.expectedTotalSessions}</span>
                    <span className="ml-1 text-[11.5px] text-rp-text-muted">
                      {row.isEstimatedTotal ? tr('buổi dự kiến') : tr('buổi')}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center align-middle whitespace-nowrap tabular-nums">
                    {row.expectedStartDate ? (
                      <span className="font-semibold text-rp-text">
                        {formatIsoDateDisplay(row.expectedStartDate)}
                      </span>
                    ) : (
                      <span
                        title={tr('Lịch học sẽ được xác lập khi đề xuất được duyệt.')}
                        className="text-rp-text-muted"
                      >
                        {tr('Chờ xác lập')}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                    <span
                      data-status-key={row.statusGroup}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold ${badge.pill}`}
                    >
                      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                      {tr(row.statusLabel)}
                    </span>
                  </td>

                  <td
                    className="px-4 py-3 text-center align-middle whitespace-nowrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex flex-nowrap items-center justify-center gap-1.5 whitespace-nowrap">
                      {primaryAction && (
                        <button
                          type="button"
                          data-testid={primaryAction.testId}
                          disabled={primaryAction.disabled}
                          title={primaryAction.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            primaryAction.onClick?.();
                          }}
                          className={`inline-flex h-7.5 items-center gap-1 rounded-lg border px-2.5 text-[11.5px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                            primaryAction.variant === 'primary'
                              ? 'border-transparent bg-rp-brand-pressed text-white hover:bg-rp-brand-strong'
                              : 'border-rp-line bg-white text-rp-text-2 hover:border-rp-brand-border hover:bg-rp-brand-tint hover:text-rp-brand-strong'
                          }`}
                        >
                          {PrimaryIcon && <PrimaryIcon className="h-3.5 w-3.5" />}
                          <span>{primaryAction.label}</span>
                          {PrimaryRightIcon && <PrimaryRightIcon className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <RegistrationActionMenu items={menuItems} triggerLabel={tr('Thao tác khác')} />
                    </div>
                  </td>
                </tr>,
                expanded && (
                  <tr key={`exp-${row.rowKey}`}>
                    <td colSpan={6} className="p-0">
                      <ExpandedRegistrationDetail
                        row={row}
                        detailOpen={Boolean(detailExpandedMap[row.rowKey])}
                        onToggleDetail={() => toggleDetailExpanded(row.rowKey)}
                        onEditWeeklyPattern={onEditWeeklyPattern}
                        onDeselectWeeklyPattern={onDeselectWeeklyPattern}
                        onJumpToPatternOnCalendar={onJumpToPatternOnCalendar}
                        onJumpToOccurrenceOnCalendar={onJumpToOccurrenceOnCalendar}
                        onOpenCourseInfo={onOpenCourseInfo}
                        onClearSelection={onClearSelection}
                        capacityLocked={capacityLocked}
                        capacityLockedMessage={capacityLockedMessage}
                        busy={busy}
                      />
                    </td>
                  </tr>
                ),
              ];
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination strictly by parent registration — hidden when all rows fit on 1 page */}
      {rows.length > pageSize && (
        <Pagination
          variant="sakura"
          currentPage={safePage}
          totalPages={totalPages}
          totalItems={rows.length}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={onPageChange}
          onPageSizeChange={(nextSize) => {
            onPageSizeChange?.(nextSize);
          }}
          itemLabel={tr('đăng ký')}
        />
      )}
    </div>
  );
}
