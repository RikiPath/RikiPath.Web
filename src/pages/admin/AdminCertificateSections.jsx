import { useId, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Library, Plus } from 'lucide-react';

import {
  archiveCertificateSection,
  createCertificateSection,
  getCertificateSections,
  updateCertificateSection,
} from '@/features/admin/api/adminApi.js';
import { courseGet } from '@/features/cohorts/api/cohortApi.js';
import { AdminShell } from '@/layouts';
import { describeApiError } from '@/api/apiErrors.js';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Checkbox,
  ContextualEmptyState,
  CustomSelect,
  DataRefreshBoundary,
  Field,
  Input,
  Modal,
  Textarea,
  UnifiedToolbar,
} from '@/components/ui';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader.jsx';
import { AdminDataTable, AdminIconAction, AdminRowActions, AdminWorkspace } from '@/features/admin/components/AdminPrimitives.jsx';
import { notify } from '@/components/ui/feedbackStore.js';
import { useLocale } from '@/locales/locale.js';

const EMPTY_SECTION = Object.freeze({
  certificateLevelId: '',
  name: '',
  code: '',
  description: '',
  durationMinutes: '',
  maxScore: '',
  passingScore: '',
  sortOrder: '',
});

function bodyOf(form) {
  return {
    certificateLevelId: Number(form.certificateLevelId),
    name: form.name.trim(),
    code: form.code.trim(),
    description: form.description.trim() || null,
    durationMinutes: form.durationMinutes === '' ? null : Number(form.durationMinutes),
    maxScore: Number(form.maxScore),
    passingScore: Number(form.passingScore),
    sortOrder: Number(form.sortOrder),
  };
}

function normalizeSectionForm(form) {
  return JSON.stringify({
    certificateLevelId: String(form.certificateLevelId || ''),
    name: String(form.name || '').trim(),
    code: String(form.code || '').trim(),
    description: String(form.description || ''),
    durationMinutes: String(form.durationMinutes ?? ''),
    maxScore: String(form.maxScore ?? ''),
    passingScore: String(form.passingScore ?? ''),
    sortOrder: String(form.sortOrder ?? ''),
  });
}

export default function AdminCertificateSections() {
  const { tr, trf } = useLocale();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();
  const formId = useId();

  const [levelId, setLevelId] = useState('');
  const [query, setQuery] = useState('');
  const [includeArchived, setIncludeArchived] = useState(false);
  const [modalState, setModalState] = useState(null); // null | { editId: number|null, initialForm, form }
  const [fieldErrors, setFieldErrors] = useState({});
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [notice, setNotice] = useState('');

  const sections = useQuery({
    queryKey: ['certificate-sections', includeArchived],
    queryFn: () => getCertificateSections({ includeArchived }),
  });

  const catalog = useQuery({
    queryKey: ['admin-study-catalog-levels'],
    queryFn: () => courseGet('/admin-catalog'),
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: () => {
      if (!modalState) return Promise.resolve();
      const payload = bodyOf(modalState.form);
      return modalState.editId
        ? updateCertificateSection(modalState.editId, payload)
        : createCertificateSection(payload);
    },
    onSuccess: async () => {
      const msg = modalState?.editId ? 'Đã cập nhật phần thi.' : 'Đã tạo phần thi mới.';
      setNotice(msg);
      notify.success(msg, '', { key: 'admin-cert-section-save' });
      setModalState(null);
      await queryClient.invalidateQueries({ queryKey: ['certificate-sections'] });
    },
    onError: (err) => notify.apiError(err, 'Chưa lưu được phần thi', { key: 'admin-cert-section-save-err' }),
  });

  const archive = useMutation({
    mutationFn: archiveCertificateSection,
    onSuccess: async () => {
      setArchiveTarget(null);
      setNotice('Đã lưu trữ phần thi.');
      notify.success('Đã lưu trữ phần thi.', '', { key: 'admin-cert-section-archive' });
      await queryClient.invalidateQueries({ queryKey: ['certificate-sections'] });
    },
    onError: (err) => {
      setArchiveTarget(null);
      notify.apiError(err, 'Không thể lưu trữ phần thi', { key: 'admin-cert-section-archive-err' });
    },
  });

  const allRows = useMemo(() => Array.isArray(sections.data) ? sections.data : [], [sections.data]);

  const levelOptions = useMemo(() => {
    const map = new Map();
    const catalogLevels = Array.isArray(catalog.data?.levels) ? catalog.data.levels : [];
    catalogLevels.forEach((lv) => {
      if (lv.isActive !== false) {
        map.set(lv.id, lv.code || trf('Cấp {0}', { 0: lv.id }));
      }
    });
    allRows.forEach((row) => {
      if (!map.has(row.certificateLevelId)) {
        map.set(row.certificateLevelId, row.certificateLevelCode || trf('Cấp {0}', { 0: row.certificateLevelId }));
      }
    });
    return [...map.entries()].map(([id, code]) => ({ id, code }));
  }, [allRows, catalog.data, trf]);

  const filterLevelOptions = useMemo(
    () =>
      [
        ...new Map(
          allRows.map((row) => [
            row.certificateLevelId,
            row.certificateLevelCode || trf('Cấp {0}', { 0: row.certificateLevelId }),
          ]),
        ).entries(),
      ].map(([id, code]) => ({ id, code })),
    [allRows, trf],
  );
  const levelTabs = useMemo(() => [
    { value: '', label: 'Tất cả' },
    ...filterLevelOptions.map((level) => ({ value: String(level.id), label: level.code })),
  ], [filterLevelOptions]);

  // One table for every level. Order = level order as the API returns it (N5 → N2), then each section's SortOrder,
  // never an alphabetical sort of names or codes.
  const rows = useMemo(() => {
    const levelRank = new Map();
    allRows.forEach((row) => {
      if (!levelRank.has(row.certificateLevelId)) levelRank.set(row.certificateLevelId, levelRank.size);
    });
    const q = query.trim().toLowerCase();
    return allRows
      .filter((row) => !levelId || String(row.certificateLevelId) === levelId)
      .filter((row) => !q || String(row.name || '').toLowerCase().includes(q) || String(row.code || '').toLowerCase().includes(q))
      .sort((a, b) => (levelRank.get(a.certificateLevelId) - levelRank.get(b.certificateLevelId))
        || (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
        || a.id - b.id);
  }, [allRows, levelId, query]);

  const sectionColumns = [
    {
      key: 'level',
      header: tr('Cấp độ'),
      width: 'w-[8%]',
      sortable: false,
      render: (row) => (
        <span className="inline-flex min-w-[40px] items-center justify-center rounded-lg border border-rp-brand-border bg-rp-brand-tint px-2 py-0.5 text-[12.5px] font-bold text-rp-brand-strong">
          {row.certificateLevelCode || trf('Cấp {0}', { 0: row.certificateLevelId })}
        </span>
      ),
    },
    {
      key: 'name',
      header: tr('Phần thi'),
      width: 'w-[34%]',
      sortable: false,
      render: (row) => (
        <div className="min-w-[220px]">
          <p className="line-clamp-2 font-semibold text-rp-text" title={row.name}>{row.name}</p>
          <p className="mt-0.5 text-xs text-rp-text-muted">{row.code}</p>
        </div>
      ),
    },
    {
      key: 'score',
      header: tr('Điểm đạt / tối đa'),
      width: 'w-[19%]',
      align: 'center',
      sortable: false,
      render: (row) => <span className="tabular-nums text-rp-text-2">{row.passingScore}/{row.maxScore}</span>,
    },
    {
      key: 'durationMinutes',
      header: tr('Phút'),
      width: 'w-[12%]',
      align: 'center',
      sortable: false,
      render: (row) => <span className="tabular-nums text-rp-text-2">{row.durationMinutes ?? '—'}</span>,
    },
    {
      key: 'status',
      header: tr('Trạng thái'),
      width: 'w-[17%]',
      align: 'center',
      sortable: false,
      render: (row) => (
        <Badge size="sm" tone={row.isArchived ? 'neutral' : 'success'}>
          {row.isArchived ? tr('Đã lưu trữ') : tr('Hoạt động')}
        </Badge>
      ),
    },
  ];

  const nextOrderForLevel = (targetLevelId) => {
    const rowsInLevel = allRows.filter((row) => String(row.certificateLevelId) === String(targetLevelId));
    const maxOrder = rowsInLevel.reduce((max, row) => Math.max(max, Number(row.sortOrder) || 0), 0);
    return String(maxOrder + 1);
  };

  const openCreate = () => {
    setNotice('');
    setFieldErrors({});
    const initialLevelId = levelId || '';
    const initialForm = {
      ...EMPTY_SECTION,
      certificateLevelId: initialLevelId,
      sortOrder: nextOrderForLevel(initialLevelId),
    };
    setModalState({ editId: null, sortOrderTouched: false, initialForm, form: { ...initialForm } });
  };

  const openEdit = (row) => {
    setNotice('');
    setFieldErrors({});
    const initialForm = {
      certificateLevelId: String(row.certificateLevelId),
      name: row.name || '',
      code: row.code || '',
      description: row.description || '',
      durationMinutes: row.durationMinutes ?? '',
      maxScore: row.maxScore ?? '',
      passingScore: row.passingScore ?? '',
      sortOrder: row.sortOrder ?? '1',
    };
    setModalState({ editId: row.id, sortOrderTouched: true, initialForm, form: { ...initialForm } });
  };

  const updateField = (key, value) => {
    setModalState((cur) => {
      if (!cur) return cur;
      const nextForm = { ...cur.form, [key]: value };
      let nextTouched = cur.sortOrderTouched;
      if (key === 'sortOrder') nextTouched = true;
      if (key === 'certificateLevelId' && !cur.editId && !cur.sortOrderTouched) {
        nextForm.sortOrder = nextOrderForLevel(value);
      }
      return { ...cur, sortOrderTouched: nextTouched, form: nextForm };
    });
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validateSectionModal = (form) => {
    const errors = {};
    if (!form.certificateLevelId) {
      errors.certificateLevelId = tr('Vui lòng chọn cấp độ.');
    }
    const trimmedName = String(form.name || '').trim();
    if (!trimmedName) {
      errors.name = tr('Vui lòng nhập tên phần thi.');
    } else if (trimmedName.length > 200) {
      errors.name = tr('Tên phần thi tối đa 200 ký tự.');
    }
    const trimmedCode = String(form.code || '').trim();
    if (!trimmedCode) {
      errors.code = tr('Vui lòng nhập mã phần thi.');
    } else if (trimmedCode.length > 50) {
      errors.code = tr('Mã phần thi tối đa 50 ký tự.');
    }
    const rawOrder = String(form.sortOrder ?? '').trim();
    const parsedOrder = /^\d+$/.test(rawOrder) ? Number(rawOrder) : NaN;
    if (!Number.isSafeInteger(parsedOrder) || parsedOrder < 1) {
      errors.sortOrder = tr('Thứ tự hiển thị phải là số nguyên dương bắt đầu từ 1.');
    }
    const rawMax = String(form.maxScore ?? '').trim();
    const parsedMax = /^\d+$/.test(rawMax) ? Number(rawMax) : NaN;
    if (!Number.isSafeInteger(parsedMax) || parsedMax < 1) {
      errors.maxScore = tr('Điểm tối đa phải là số nguyên dương.');
    }
    const rawPassing = String(form.passingScore ?? '').trim();
    const parsedPassing = /^\d+$/.test(rawPassing) ? Number(rawPassing) : NaN;
    if (!Number.isSafeInteger(parsedPassing) || parsedPassing < 0) {
      errors.passingScore = tr('Điểm đạt phải là số nguyên từ 0 trở lên.');
    } else if (Number.isSafeInteger(parsedMax) && parsedPassing > parsedMax) {
      errors.passingScore = tr('Điểm đạt không được lớn hơn điểm tối đa.');
    }
    const rawDuration = String(form.durationMinutes ?? '').trim();
    if (rawDuration !== '') {
      const parsedDuration = /^\d+$/.test(rawDuration) ? Number(rawDuration) : NaN;
      if (!Number.isSafeInteger(parsedDuration) || parsedDuration < 1) {
        errors.durationMinutes = tr('Số phút phải là số nguyên dương.');
      }
    }
    if (String(form.description || '').trim().length > 1000) {
      errors.description = tr('Mô tả tối đa 1000 ký tự.');
    }
    return errors;
  };

  const isDirty = useMemo(() => {
    if (!modalState) return false;
    return normalizeSectionForm(modalState.form) !== normalizeSectionForm(modalState.initialForm);
  }, [modalState]);

  const forceClose = () => {
    if (save.isPending) return;
    setConfirmDiscardOpen(false);
    setModalState(null);
    save.reset();
  };

  const requestClose = () => {
    if (save.isPending) return;
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    forceClose();
  };

  const refreshSections = () =>
    Promise.all([
      sections.refetch({ cancelRefetch: true }),
      catalog.refetch({ cancelRefetch: true }),
    ]);
  const isRefreshingSections = (sections.isFetching && !sections.isLoading) || (catalog.isFetching && !catalog.isLoading);
  const showFilterToolbar = allRows.length > 0;
  const filtersActive = Boolean(levelId || query.trim());

  return (
    <AdminShell pathname={pathname} breadcrumb={tr('Phần thi')}>
      <AdminWorkspace viewportLocked page="AdminCertificateSections">
        <AdminPageHeader icon={Library} title="Phần thi" className="mb-0 shrink-0" />

        {/* One toolbar: level pills, search, archived toggle, refresh, create. Hidden while the dataset is empty. */}
        {showFilterToolbar && (
          <UnifiedToolbar
            className="shrink-0"
            tabs={{
              label: tr('Lọc theo cấp độ'),
              value: levelId,
              onChange: setLevelId,
              tabs: levelTabs,
            }}
            search={{
              value: query,
              onChange: (e) => setQuery(e.target.value),
              onClear: () => setQuery(''),
              placeholder: 'Tìm phần thi hoặc mã phần thi…',
              ariaLabel: tr('Tìm phần thi'),
            }}
            filters={
              <Checkbox
                label="Hiện phần đã lưu trữ"
                checked={includeArchived}
                onChange={(event) => setIncludeArchived(event.target.checked)}
              />
            }
            refresh={{ onRefresh: refreshSections, refreshing: isRefreshingSections }}
            actions={
              <Button variant="primary" size="md" icon={Plus} onClick={openCreate}>
                {tr('Thêm phần thi')}
              </Button>
            }
          />
        )}

        {archive.error && (
          <Banner tone="danger" role="alert" className="shrink-0">
            {tr(describeApiError(archive.error).message)}
          </Banner>
        )}

        {notice && (
          <Banner tone="success" role="status" className="shrink-0" onDismiss={() => setNotice('')}>
            {tr(notice)}
          </Banner>
        )}

        <DataRefreshBoundary
          fillHeight
          queries={[sections]}
          loading={sections.isLoading}
          refreshing={isRefreshingSections}
          error={sections.error}
          hasData={allRows.length > 0}
          isEmpty={allRows.length === 0}
          loadingContext="data"
          loadingLabel={tr('Đang tải danh sách phần thi')}
          errorTitle={tr('Chưa tải được danh sách phần thi')}
          onRetry={refreshSections}
          emptyIllustration="certificate"
          emptyTitle={tr('Chưa có phần thi.')}
          emptyAction={
            <Button variant="primary" size="sm" icon={Plus} onClick={openCreate}>
              {tr('Thêm phần thi')}
            </Button>
          }
          compact
        >
          <AdminDataTable
            fillHeight
            keyField="id"
            columns={sectionColumns}
            rows={rows}
            pageSize={10}
            resetPageKey={`${levelId}|${query}|${includeArchived}`}
            align="left"
            minTableWidth="min-w-[720px]"
            itemLabel="phần thi"
            caption={tr('Danh sách phần thi theo cấp độ')}
            empty={
              <ContextualEmptyState
                variant="search"
                illustration="certificate"
                title={tr('Không tìm thấy kết quả phù hợp.')}
                description=""
                action={filtersActive ? (
                  <Button size="sm" variant="outline" onClick={() => { setLevelId(''); setQuery(''); }}>
                    {tr('Xóa bộ lọc')}
                  </Button>
                ) : undefined}
              />
            }
            rowActions={(row) => (!row.isArchived ? (
              <AdminRowActions className="w-full">
                <AdminIconAction kind="edit" tone="brand" tooltip="Chỉnh sửa phần thi" onClick={() => openEdit(row)} />
                <AdminIconAction kind="archive" tone="danger" tooltip="Lưu trữ phần thi" onClick={() => setArchiveTarget(row)} />
              </AdminRowActions>
            ) : (
              <span className="block text-center text-xs text-rp-text-muted">—</span>
            ))}
          />
        </DataRefreshBoundary>
      </AdminWorkspace>

      {/* Create / Edit Modal */}
      {modalState && (
        <Modal
          open={Boolean(modalState)}
          onClose={requestClose}
          size="md"
          title={modalState.editId ? tr('Sửa phần thi') : tr('Phần thi mới')}
          footer={(
            <>
              <Button variant="secondary" onClick={requestClose} disabled={save.isPending}>
                {tr('Hủy')}
              </Button>
              <Button type="submit" form={formId} variant="primary" loading={save.isPending}>
                {modalState.editId ? tr('Lưu phần thi') : tr('Tạo phần thi')}
              </Button>
            </>
          )}
        >
          <form
            id={formId}
            noValidate
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!modalState || save.isPending) return;
              const errs = validateSectionModal(modalState.form);
              if (Object.keys(errs).length > 0) {
                setFieldErrors(errs);
                return;
              }
              setNotice('');
              save.mutate();
            }}
          >
            {save.error && (
              <Banner tone="danger" role="alert">
                {tr(describeApiError(save.error).message)}
              </Banner>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cấp độ" required error={fieldErrors.certificateLevelId}>
                {({ id, describedBy, invalid }) => (
                  <CustomSelect
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    value={modalState.form.certificateLevelId ? String(modalState.form.certificateLevelId) : ''}
                    onChange={(val) => updateField('certificateLevelId', val ? Number(val) : '')}
                    disabled={save.isPending}
                    placeholder={tr('Chọn cấp')}
                    options={levelOptions.map((level) => ({ value: String(level.id), label: level.code }))}
                    size="md"
                  />
                )}
              </Field>

              <Field label="Tên phần" required error={fieldErrors.name}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    maxLength={200}
                    value={modalState.form.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    placeholder={tr('Ví dụ: Nghe hiểu')}
                    disabled={save.isPending}
                  />
                )}
              </Field>

              <Field label="Mã" required error={fieldErrors.code}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    maxLength={50}
                    value={modalState.form.code}
                    onChange={(event) => updateField('code', event.target.value)}
                    placeholder="N3_LISTENING"
                    disabled={save.isPending}
                  />
                )}
              </Field>

              <Field label="Thứ tự" required error={fieldErrors.sortOrder}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    min="1"
                    step={1}
                    type="number"
                    value={modalState.form.sortOrder}
                    onChange={(event) => updateField('sortOrder', event.target.value)}
                    disabled={save.isPending}
                  />
                )}
              </Field>

              <Field label="Điểm tối đa" required error={fieldErrors.maxScore}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    min="1"
                    step={1}
                    type="number"
                    value={modalState.form.maxScore}
                    onChange={(event) => updateField('maxScore', event.target.value)}
                    disabled={save.isPending}
                  />
                )}
              </Field>

              <Field label="Điểm đạt" required error={fieldErrors.passingScore}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    min="0"
                    step={1}
                    type="number"
                    value={modalState.form.passingScore}
                    onChange={(event) => updateField('passingScore', event.target.value)}
                    disabled={save.isPending}
                  />
                )}
              </Field>

              <Field label="Số phút" error={fieldErrors.durationMinutes}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    invalid={invalid}
                    min="1"
                    step={1}
                    type="number"
                    value={modalState.form.durationMinutes}
                    onChange={(event) => updateField('durationMinutes', event.target.value)}
                    disabled={save.isPending}
                  />
                )}
              </Field>
            </div>

            <Field label="Mô tả" error={fieldErrors.description}>
              {({ id, describedBy, invalid }) => (
                <Textarea
                  id={id}
                  aria-describedby={describedBy}
                  invalid={invalid}
                  rows={3}
                  maxLength={1000}
                  value={modalState.form.description}
                  onChange={(event) => updateField('description', event.target.value)}
                  disabled={save.isPending}
                />
              )}
            </Field>
          </form>
        </Modal>
      )}

      {/* Unsaved Changes Guard */}
      <AlertDialog
        open={confirmDiscardOpen}
        tone="warning"
        title={tr('Bỏ thay đổi chưa lưu?')}
        description={tr('Các thay đổi bạn vừa nhập sẽ không được lưu nếu đóng cửa sổ này.')}
        confirmLabel={tr('Bỏ thay đổi')}
        cancelLabel={tr('Tiếp tục chỉnh sửa')}
        onConfirm={forceClose}
        onCancel={() => setConfirmDiscardOpen(false)}
      />

      {/* Safe Archive Confirmation */}
      <AlertDialog
        open={Boolean(archiveTarget)}
        tone="warning"
        title={tr('Lưu trữ phần thi này?')}
        description={
          archiveTarget
            ? trf('Phần thi "{0}" sẽ ngừng xuất hiện khi tạo đề mới nhưng vẫn giữ dữ liệu lịch sử.', {
                0: archiveTarget.name,
              })
            : ''
        }
        confirmLabel={tr('Lưu trữ')}
        cancelLabel={tr('Hủy')}
        busy={archive.isPending}
        onConfirm={() => archiveTarget && archive.mutate(archiveTarget.id)}
        onCancel={() => !archive.isPending && setArchiveTarget(null)}
      />
    </AdminShell>
  );
}
