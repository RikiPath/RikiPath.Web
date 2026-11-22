import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Award, Layers, Pencil, Plus } from 'lucide-react';
import { AdminShell } from '@/layouts';
import { api } from '@/api/client';
import { describeApiError } from '@/api/apiErrors.js';
import { courseGet } from '@/features/cohorts/api/cohortApi';
import {
  AlertDialog,
  Badge,
  Banner,
  Button,
  Checkbox,
  ContextualEmptyState,
  ContextualErrorState,
  CustomSelect,
  Field,
  IconButton,
  Input,
  Modal,
  PageHeader,
  RefreshingIndicator,
  SakuraLoader,
  StaleDataBar,
  Tabs,
  Textarea,
} from '@/components/ui';
import { notify } from '@/components/ui/feedbackStore.js';
import { useLocale } from '@/locales/locale.js';

const EMPTY_DRAFT = Object.freeze({
  id: null,
  revision: null,
  name: '',
  code: '',
  certificateTypeId: '',
  description: '',
  sortOrder: '1',
  isActive: true,
});

function collapseSpaces(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function createDraftFromRow(kind, row = null, defaultCertId = '', defaultSortOrder = '1') {
  if (!row) {
    return {
      ...EMPTY_DRAFT,
      certificateTypeId: kind === 'levels' ? String(defaultCertId || '') : '',
      sortOrder: String(defaultSortOrder || '1'),
    };
  }
  return {
    id: row.id ?? null,
    revision: row.revision ?? null,
    name: row.name || '',
    code: row.code || '',
    certificateTypeId: row.certificateTypeId != null ? String(row.certificateTypeId) : '',
    description: row.description || '',
    sortOrder: String(row.sortOrder ?? 1),
    isActive: row.isActive !== false,
  };
}

function normalizeForDirtyCheck(draft, modalKind) {
  if (!draft) return '';
  if (modalKind === 'certificates') {
    return JSON.stringify({
      name: collapseSpaces(draft.name),
      description: String(draft.description || '').trim(),
      sortOrder: String(draft.sortOrder ?? '1').trim(),
      isActive: Boolean(draft.isActive),
    });
  }
  return JSON.stringify({
    certificateTypeId: String(draft.certificateTypeId || ''),
    code: collapseSpaces(draft.code).toUpperCase(),
    description: String(draft.description || '').trim(),
    sortOrder: String(draft.sortOrder ?? '1').trim(),
    isActive: Boolean(draft.isActive),
  });
}

export default function AdminStudyCatalog() {
  const { tr, trf } = useLocale();
  const formId = useId();

  const nameInputRef = useRef(null);
  const certSelectRef = useRef(null);
  const codeInputRef = useRef(null);
  const descInputRef = useRef(null);
  const sortOrderInputRef = useRef(null);

  const [data, setData] = useState({ types: [], levels: [], typesOrderToken: '', levelsOrderTokens: {} });
  const [kind, setKind] = useState('certificates');
  const [certFilterId, setCertFilterId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [modalState, setModalState] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);
  const [reorderingKey, setReorderingKey] = useState('');
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false);

  const types = useMemo(() => {
    const raw = Array.isArray(data?.types) ? data.types : [];
    return [...raw].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
  }, [data]);

  const certById = useMemo(() => {
    const map = new Map();
    types.forEach((t) => map.set(Number(t.id), t));
    return map;
  }, [types]);

  const levels = useMemo(() => {
    const raw = Array.isArray(data?.levels) ? data.levels : [];
    return [...raw].sort((a, b) => {
      const certOrderA = certById.get(Number(a.certificateTypeId))?.sortOrder ?? 9999;
      const certOrderB = certById.get(Number(b.certificateTypeId))?.sortOrder ?? 9999;
      if (certOrderA !== certOrderB) return certOrderA - certOrderB;
      if ((a.certificateTypeId ?? 0) !== (b.certificateTypeId ?? 0)) {
        return Number(a.certificateTypeId) - Number(b.certificateTypeId);
      }
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id;
    });
  }, [data, certById]);

  const siblingsByCertId = useMemo(() => {
    const map = new Map();
    levels.forEach((lv) => {
      const cid = Number(lv.certificateTypeId);
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid).push(lv);
    });
    map.forEach((list) => {
      list.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.id - b.id);
    });
    return map;
  }, [levels]);

  const levelCountByCertId = useMemo(() => {
    const map = new Map();
    siblingsByCertId.forEach((list, cid) => map.set(cid, list.length));
    return map;
  }, [siblingsByCertId]);

  const filteredLevels = useMemo(() => {
    if (certFilterId === 'ALL' || types.length <= 1) return levels;
    return levels.filter((lv) => String(lv.certificateTypeId) === String(certFilterId));
  }, [levels, certFilterId, types.length]);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setLoadError(null);
    try {
      const d = await courseGet('/admin-catalog');
      setData(d || { types: [], levels: [], typesOrderToken: '', levelsOrderTokens: {} });
    } catch (e) {
      setLoadError(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => {
        if (!alive) return undefined;
        setLoading(true);
        setLoadError(null);
        return courseGet('/admin-catalog');
      })
      .then((d) => {
        if (alive && d !== undefined) {
          setData(d || { types: [], levels: [], typesOrderToken: '', levelsOrderTokens: {} });
        }
      })
      .catch((e) => alive && setLoadError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const nextSortOrderFor = useCallback(
    (targetKind, certTypeId) => {
      if (targetKind === 'certificates') return String(types.length + 1);
      const count = certTypeId ? (siblingsByCertId.get(Number(certTypeId))?.length || 0) : 0;
      return String(count + 1);
    },
    [types.length, siblingsByCertId],
  );

  const openCreateModal = (targetKind) => {
    const defaultCertId = targetKind === 'levels'
      ? (certFilterId !== 'ALL' ? certFilterId : (types.length > 0 ? String(types[0].id) : ''))
      : '';
    const defaultOrder = nextSortOrderFor(targetKind, defaultCertId);
    const initialDraft = createDraftFromRow(targetKind, null, defaultCertId, defaultOrder);
    setFieldErrors({});
    setSubmitError('');
    setConfirmDiscardOpen(false);
    setModalState({
      mode: 'create',
      kind: targetKind,
      sortOrderTouched: false,
      initialDraft,
      draft: { ...initialDraft },
    });
  };

  const openEditModal = (targetKind, row) => {
    const initialDraft = createDraftFromRow(targetKind, row);
    setFieldErrors({});
    setSubmitError('');
    setConfirmDiscardOpen(false);
    setModalState({
      mode: 'edit',
      kind: targetKind,
      sortOrderTouched: true,
      initialDraft,
      draft: { ...initialDraft },
    });
  };

  const updateDraft = (key, value) => {
    setModalState((prev) => {
      if (!prev) return prev;
      const nextDraft = { ...prev.draft, [key]: value };
      let nextTouched = prev.sortOrderTouched;
      if (key === 'sortOrder') nextTouched = true;
      if (key === 'certificateTypeId' && prev.mode === 'create' && prev.kind === 'levels' && !prev.sortOrderTouched) {
        nextDraft.sortOrder = nextSortOrderFor('levels', value);
      }
      return { ...prev, sortOrderTouched: nextTouched, draft: nextDraft };
    });
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (submitError) setSubmitError('');
  };

  const isDirty = useMemo(() => {
    if (!modalState) return false;
    return (
      normalizeForDirtyCheck(modalState.draft, modalState.kind) !==
      normalizeForDirtyCheck(modalState.initialDraft, modalState.kind)
    );
  }, [modalState]);

  const forceCloseModal = () => {
    if (busy) return;
    setConfirmDiscardOpen(false);
    setModalState(null);
    setFieldErrors({});
    setSubmitError('');
  };

  const requestCloseModal = () => {
    if (busy) return;
    if (isDirty) {
      setConfirmDiscardOpen(true);
      return;
    }
    forceCloseModal();
  };

  const modalScopeSiblings = useMemo(() => {
    if (!modalState) return [];
    if (modalState.kind === 'certificates') return types;
    const cid = Number(modalState.draft.certificateTypeId);
    return cid > 0 ? (siblingsByCertId.get(cid) || []) : [];
  }, [modalState, types, siblingsByCertId]);

  const maxAllowedOrder = useMemo(() => {
    if (!modalState) return 1;
    return modalState.mode === 'create'
      ? modalScopeSiblings.length + 1
      : Math.max(1, modalScopeSiblings.length);
  }, [modalState, modalScopeSiblings.length]);

  const shiftPreviewTarget = useMemo(() => {
    if (!modalState) return null;
    const rawOrder = String(modalState.draft.sortOrder ?? '').trim();
    if (!/^\d+$/.test(rawOrder)) return null;
    const parsed = Number(rawOrder);
    if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > maxAllowedOrder) return null;
    return modalScopeSiblings.find(
      (row) => Number(row.id) !== Number(modalState.draft.id) && Number(row.sortOrder) === parsed,
    ) || null;
  }, [modalState, modalScopeSiblings, maxAllowedOrder]);

  const validateModal = (state) => {
    const errors = {};
    const { draft, kind: mKind, mode } = state;
    const siblingList = mKind === 'certificates'
      ? types
      : (draft.certificateTypeId ? (siblingsByCertId.get(Number(draft.certificateTypeId)) || []) : []);
    const upperBound = mode === 'create' ? siblingList.length + 1 : Math.max(1, siblingList.length);

    if (mKind === 'certificates') {
      const normalizedName = collapseSpaces(draft.name);
      if (!normalizedName) {
        errors.name = tr('Vui lòng nhập tên chứng chỉ.');
      } else if (normalizedName.length > 100) {
        errors.name = tr('Tên chứng chỉ tối đa 100 ký tự.');
      } else if (
        types.some(
          (t) =>
            Number(t.id) !== Number(draft.id) &&
            collapseSpaces(t.name).toLowerCase() === normalizedName.toLowerCase(),
        )
      ) {
        errors.name = tr('Tên chứng chỉ đã tồn tại.');
      }
    } else {
      if (!draft.certificateTypeId) {
        errors.certificateTypeId = tr('Vui lòng chọn chứng chỉ.');
      }
      const normalizedCode = collapseSpaces(draft.code).toUpperCase();
      if (!normalizedCode) {
        errors.code = tr('Vui lòng nhập mã cấp độ.');
      } else if (normalizedCode.length > 50) {
        errors.code = tr('Mã cấp độ tối đa 50 ký tự.');
      } else if (
        draft.certificateTypeId &&
        levels.some(
          (lv) =>
            Number(lv.id) !== Number(draft.id) &&
            Number(lv.certificateTypeId) === Number(draft.certificateTypeId) &&
            collapseSpaces(lv.code).toUpperCase() === normalizedCode,
        )
      ) {
        errors.code = tr('Mã cấp độ đã tồn tại trong chứng chỉ này.');
      }
    }

    if (String(draft.description || '').trim().length > 2000) {
      errors.description = tr('Mô tả tối đa 2000 ký tự.');
    }

    const rawOrder = String(draft.sortOrder ?? '').trim();
    const parsedOrder = /^\d+$/.test(rawOrder) ? Number(rawOrder) : NaN;
    if (!Number.isSafeInteger(parsedOrder) || parsedOrder < 1) {
      errors.sortOrder = tr('Thứ tự hiển thị phải là số nguyên dương bắt đầu từ 1.');
    } else if (parsedOrder > upperBound) {
      errors.sortOrder = trf('Thứ tự hiển thị phải nằm trong khoảng từ 1 đến {0}.', { 0: upperBound });
    }

    const firstErrorKey = Object.keys(errors)[0] || null;
    return { valid: !firstErrorKey, errors, firstErrorKey, parsedOrder };
  };

  const focusField = (key) => {
    const map = {
      name: nameInputRef,
      certificateTypeId: certSelectRef,
      code: codeInputRef,
      description: descInputRef,
      sortOrder: sortOrderInputRef,
    };
    const target = map[key]?.current;
    if (target && typeof target.focus === 'function') {
      target.focus();
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!modalState || busy) return;

    const { valid, errors, firstErrorKey, parsedOrder } = validateModal(modalState);
    if (!valid) {
      setFieldErrors(errors);
      focusField(firstErrorKey);
      return;
    }

    const { draft, kind: mKind, mode } = modalState;
    setBusy(true);
    setSubmitError('');

    const expectedOrderToken = mKind === 'certificates'
      ? (data?.typesOrderToken || null)
      : (data?.levelsOrderTokens?.[draft.certificateTypeId] || data?.levelsOrderTokens?.[String(draft.certificateTypeId)] || null);

    try {
      const body = mKind === 'certificates'
        ? {
            name: collapseSpaces(draft.name),
            description: String(draft.description || '').trim() || null,
            sortOrder: parsedOrder,
            isActive: Boolean(draft.isActive),
            allowShift: true,
            expectedRevision: draft.revision ?? null,
            expectedOrderToken,
          }
        : {
            certificateTypeId: Number(draft.certificateTypeId),
            code: collapseSpaces(draft.code).toUpperCase(),
            description: String(draft.description || '').trim() || null,
            sortOrder: parsedOrder,
            isActive: Boolean(draft.isActive),
            allowShift: true,
            expectedRevision: draft.revision ?? null,
            expectedOrderToken,
          };

      const path = `/study-courses/${mKind}${draft.id ? `/${draft.id}` : ''}`;
      await (draft.id ? api.put(path, body) : api.post(path, body));
      await load({ silent: true });

      const msg = mode === 'edit'
        ? (mKind === 'levels' ? tr('Đã cập nhật cấp độ.') : tr('Đã cập nhật chứng chỉ.'))
        : (mKind === 'levels' ? tr('Đã thêm cấp độ mới.') : tr('Đã thêm chứng chỉ mới.'));

      setModalState(null);
      setFieldErrors({});
      notify.success(msg, '', { key: 'admin-study-catalog-save', replace: true });
    } catch (err) {
      const errInfo = describeApiError(err);
      const code = errInfo.code;
      const message = tr(errInfo.message);

      if (code === 'CERTIFICATE_ALREADY_EXISTS' || code === 'CERTIFICATE_NAME_INVALID') {
        setFieldErrors((prev) => ({ ...prev, name: message }));
        focusField('name');
      } else if (code === 'LEVEL_ALREADY_EXISTS' || code === 'LEVEL_CODE_INVALID') {
        setFieldErrors((prev) => ({ ...prev, code: message }));
        focusField('code');
      } else if (code === 'CERTIFICATE_NOT_FOUND') {
        setFieldErrors((prev) => ({ ...prev, certificateTypeId: message }));
        focusField('certificateTypeId');
      } else if (code === 'DISPLAY_ORDER_INVALID' || code === 'DISPLAY_ORDER_CONFLICT') {
        setFieldErrors((prev) => ({ ...prev, sortOrder: message }));
        focusField('sortOrder');
      } else if (code === 'CERTIFICATE_DESCRIPTION_TOO_LONG' || code === 'LEVEL_DESCRIPTION_TOO_LONG') {
        setFieldErrors((prev) => ({ ...prev, description: message }));
        focusField('description');
      } else {
        setSubmitError(message);
        if (code === 'ORDER_REVISION_CONFLICT') {
          load({ silent: true });
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReorder = async (targetKind, row, direction) => {
    if (busy || reorderingKey) return;
    const siblingList = targetKind === 'certificates'
      ? types
      : (siblingsByCertId.get(Number(row.certificateTypeId)) || []);
    const currentIndex = siblingList.findIndex((item) => Number(item.id) === Number(row.id));
    if (currentIndex < 0) return;

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= siblingList.length) return;

    const targetSortOrder = targetIndex + 1;
    const key = `${targetKind}-${row.id}`;
    setReorderingKey(key);

    const expectedOrderToken = targetKind === 'certificates'
      ? (data?.typesOrderToken || null)
      : (data?.levelsOrderTokens?.[row.certificateTypeId] || data?.levelsOrderTokens?.[String(row.certificateTypeId)] || null);

    try {
      await api.post(`/study-courses/${targetKind}/${row.id}/reorder`, {
        targetSortOrder,
        expectedRevision: row.revision ?? null,
        expectedOrderToken,
      });
      await load({ silent: true });
      notify.success(tr('Đã cập nhật thứ tự hiển thị.'), '', { key: 'admin-study-catalog-reorder', replace: true });
    } catch (err) {
      const errInfo = describeApiError(err);
      if (errInfo.code === 'ORDER_REVISION_CONFLICT') {
        await load({ silent: true });
      }
      notify.apiError(err, tr('Không thể cập nhật thứ tự hiển thị.'), { key: 'admin-study-catalog-reorder', replace: true });
    } finally {
      setReorderingKey('');
    }
  };

  const tabItems = useMemo(
    () => [
      { value: 'certificates', label: tr('Chứng chỉ'), icon: Award, count: types.length },
      { value: 'levels', label: tr('Cấp độ'), icon: Layers, count: levels.length },
    ],
    [tr, types.length, levels.length],
  );

  const hasInitialData = types.length > 0 || levels.length > 0;
  const isMutating = busy || Boolean(reorderingKey);

  return (
    <AdminShell breadcrumb={tr('Chứng chỉ & cấp độ')}>
      <main className="rp-container py-[var(--rp-space-page-y)] text-rp-text">
        <PageHeader
          title={tr('Chứng chỉ & cấp độ')}
          description={tr('Quản lý các chứng chỉ và cấp độ học tập.')}
          actions={(
            <div className="flex items-center gap-3">
              <RefreshingIndicator active={refreshing} />
              <Button
                variant="primary"
                icon={Plus}
                disabled={loading || isMutating || Boolean(loadError && !hasInitialData)}
                onClick={() => openCreateModal(kind)}
                data-testid="catalog-add-btn"
              >
                {kind === 'levels' ? tr('Thêm cấp độ') : tr('Thêm chứng chỉ')}
              </Button>
            </div>
          )}
        />

        {/* Segmented Tabs + Optional Multi-Certificate Filter */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs
            variant="pill"
            label={tr('Danh mục chứng chỉ và cấp độ')}
            value={kind}
            onChange={(nextKind) => setKind(nextKind)}
            tabs={tabItems}
          />

          {kind === 'levels' && types.length > 1 && (
            <div className="w-full sm:w-56">
              <CustomSelect
                aria-label={tr('Lọc theo chứng chỉ')}
                label={tr('Lọc theo chứng chỉ')}
                value={certFilterId}
                onChange={(nextId) => setCertFilterId(nextId)}
                options={[
                  { value: 'ALL', label: tr('Tất cả chứng chỉ') },
                  ...types.map((t) => ({ value: String(t.id), label: t.name })),
                ]}
                size="sm"
                className="w-full"
                triggerClassName="bg-white"
              />
            </div>
          )}
        </div>

        {/* Loading / Error / Data States */}
        {loading ? (
          <div className="rounded-rp-card border border-rp-line bg-rp-surface p-6 shadow-rp-xs">
            <SakuraLoader variant="section" context="data" label={tr('Đang tải danh mục JLPT')} delay={160} />
          </div>
        ) : loadError && !hasInitialData ? (
          <div className="rounded-rp-card border border-rp-line bg-rp-surface px-5 shadow-rp-xs">
            <ContextualErrorState
              compact
              error={loadError}
              title={tr('Chưa tải được danh mục JLPT')}
              onRetry={() => load()}
              retrying={loading}
            />
          </div>
        ) : (
          <div className="space-y-3">
            {loadError && <StaleDataBar onRetry={() => load({ silent: true })} retrying={refreshing} />}

            {/* ---------------- TAB 1: CERTIFICATES ---------------- */}
            {kind === 'certificates' && (
              types.length === 0 ? (
                <div className="rounded-rp-card border border-rp-line bg-rp-surface px-5 shadow-rp-xs">
                  <ContextualEmptyState
                    compact
                    title={tr('Chưa có chứng chỉ nào.')}
                    description={tr('Nhấn "Thêm chứng chỉ" để tạo chứng chỉ học tập đầu tiên.')}
                    actionLabel={tr('Thêm chứng chỉ')}
                    onAction={() => openCreateModal('certificates')}
                  />
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden overflow-hidden rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-xs md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm" data-testid="certificates-table">
                        <thead>
                          <tr className="border-b border-rp-line bg-rp-table-head text-xs font-semibold uppercase tracking-[0.04em] text-rp-text-muted">
                            <th scope="col" className="w-[18%] px-5 py-3">{tr('Tên chứng chỉ')}</th>
                            <th scope="col" className="px-4 py-3">{tr('Mô tả')}</th>
                            <th scope="col" className="w-[120px] px-4 py-3 text-center">{tr('Số cấp độ')}</th>
                            <th scope="col" className="w-[148px] px-4 py-3 text-center">{tr('Thứ tự')}</th>
                            <th scope="col" className="w-[152px] px-4 py-3">{tr('Trạng thái')}</th>
                            <th scope="col" className="w-[110px] px-5 py-3 text-right">{tr('Thao tác')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rp-line/70">
                          {types.map((cert, idx) => {
                            const levelCount = levelCountByCertId.get(Number(cert.id)) || 0;
                            const canMoveUp = idx > 0;
                            const canMoveDown = idx < types.length - 1;
                            return (
                              <tr key={cert.id} className="transition-colors duration-150 hover:bg-rp-row-hover">
                                <td className="px-5 py-3.5 font-semibold text-rp-text">{cert.name}</td>
                                <td className="px-4 py-3.5 text-rp-text-2">{cert.description ? tr(cert.description) : '—'}</td>
                                <td className="px-4 py-3.5 text-center tabular-nums text-rp-text-2">
                                  {trf('{0} cấp độ', { 0: levelCount })}
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <IconButton
                                      size="sm"
                                      variant="outline"
                                      icon={ArrowUp}
                                      label={tr('Di chuyển lên')}
                                      disabled={!canMoveUp || isMutating}
                                      onClick={() => handleReorder('certificates', cert, -1)}
                                      data-testid={`move-up-cert-${cert.id}`}
                                      className="!h-7 !w-7"
                                    />
                                    <span className="inline-block min-w-[24px] text-center font-semibold tabular-nums text-rp-text">
                                      {cert.sortOrder ?? idx + 1}
                                    </span>
                                    <IconButton
                                      size="sm"
                                      variant="outline"
                                      icon={ArrowDown}
                                      label={tr('Di chuyển xuống')}
                                      disabled={!canMoveDown || isMutating}
                                      onClick={() => handleReorder('certificates', cert, 1)}
                                      data-testid={`move-down-cert-${cert.id}`}
                                      className="!h-7 !w-7"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <Badge size="sm" tone={cert.isActive ? 'success' : 'neutral'}>
                                    {cert.isActive ? tr('Hoạt động') : tr('Ngừng sử dụng')}
                                  </Badge>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={Pencil}
                                    disabled={isMutating}
                                    onClick={() => openEditModal('certificates', cert)}
                                    data-testid={`edit-cert-${cert.id}`}
                                  >
                                    {tr('Sửa')}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile / Tablet Compact List */}
                  <div className="space-y-2.5 md:hidden" data-testid="certificates-mobile-list">
                    {types.map((cert, idx) => {
                      const levelCount = levelCountByCertId.get(Number(cert.id)) || 0;
                      const canMoveUp = idx > 0;
                      const canMoveDown = idx < types.length - 1;
                      return (
                        <article
                          key={cert.id}
                          className="rounded-rp-card border border-rp-line bg-rp-surface p-4 shadow-rp-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h2 className="text-[15px] font-semibold text-rp-text">{cert.name}</h2>
                              <p className="mt-1 text-[13px] text-rp-text-2">
                                {cert.description ? tr(cert.description) : '—'}
                              </p>
                            </div>
                            <Badge size="sm" tone={cert.isActive ? 'success' : 'neutral'}>
                              {cert.isActive ? tr('Hoạt động') : tr('Ngừng sử dụng')}
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rp-line/70 pt-3">
                            <div className="flex items-center gap-2 text-xs text-rp-text-muted tabular-nums">
                              <span>{trf('{0} cấp độ', { 0: levelCount })} · {tr('Thứ tự')}: {cert.sortOrder ?? idx + 1}</span>
                              <div className="flex items-center gap-1">
                                <IconButton
                                  size="sm"
                                  variant="outline"
                                  icon={ArrowUp}
                                  label={tr('Di chuyển lên')}
                                  disabled={!canMoveUp || isMutating}
                                  onClick={() => handleReorder('certificates', cert, -1)}
                                  className="!h-7 !w-7"
                                />
                                <IconButton
                                  size="sm"
                                  variant="outline"
                                  icon={ArrowDown}
                                  label={tr('Di chuyển xuống')}
                                  disabled={!canMoveDown || isMutating}
                                  onClick={() => handleReorder('certificates', cert, 1)}
                                  className="!h-7 !w-7"
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Pencil}
                              disabled={isMutating}
                              onClick={() => openEditModal('certificates', cert)}
                            >
                              {tr('Sửa')}
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )
            )}

            {/* ---------------- TAB 2: LEVELS ---------------- */}
            {kind === 'levels' && (
              filteredLevels.length === 0 ? (
                <div className="rounded-rp-card border border-rp-line bg-rp-surface px-5 shadow-rp-xs">
                  <ContextualEmptyState
                    compact
                    title={tr('Chưa có cấp độ nào.')}
                    description={tr('Nhấn "Thêm cấp độ" để bổ sung cấp độ cho chứng chỉ.')}
                    actionLabel={tr('Thêm cấp độ')}
                    onAction={() => openCreateModal('levels')}
                  />
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden overflow-hidden rounded-rp-card border border-rp-line bg-rp-surface shadow-rp-xs md:block">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-left text-sm" data-testid="levels-table">
                        <thead>
                          <tr className="border-b border-rp-line bg-rp-table-head text-xs font-semibold uppercase tracking-[0.04em] text-rp-text-muted">
                            <th scope="col" className="w-[14%] px-5 py-3">{tr('Cấp độ')}</th>
                            <th scope="col" className="w-[15%] px-4 py-3">{tr('Chứng chỉ')}</th>
                            <th scope="col" className="px-4 py-3">{tr('Mô tả')}</th>
                            <th scope="col" className="w-[148px] px-4 py-3 text-center">{tr('Thứ tự')}</th>
                            <th scope="col" className="w-[152px] px-4 py-3">{tr('Trạng thái')}</th>
                            <th scope="col" className="w-[110px] px-5 py-3 text-right">{tr('Thao tác')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rp-line/70">
                          {filteredLevels.map((lv) => {
                            const parentCert = certById.get(Number(lv.certificateTypeId));
                            const scopeSiblings = siblingsByCertId.get(Number(lv.certificateTypeId)) || [];
                            const scopeIndex = scopeSiblings.findIndex((item) => Number(item.id) === Number(lv.id));
                            const canMoveUp = scopeIndex > 0;
                            const canMoveDown = scopeIndex >= 0 && scopeIndex < scopeSiblings.length - 1;
                            return (
                              <tr key={lv.id} className="transition-colors duration-150 hover:bg-rp-row-hover">
                                <td className="px-5 py-3.5">
                                  <span className="inline-flex min-w-[44px] items-center justify-center rounded-lg border border-rp-brand-border bg-rp-brand-tint px-2.5 py-0.5 text-[13px] font-bold text-rp-brand-strong">
                                    {lv.code}
                                  </span>
                                </td>
                                <td className="px-4 py-3.5 font-medium text-rp-text">
                                  {parentCert?.name || '—'}
                                </td>
                                <td className="px-4 py-3.5 text-rp-text-2">
                                  {lv.description ? tr(lv.description) : '—'}
                                </td>
                                <td className="px-4 py-3.5">
                                  <div className="flex items-center justify-center gap-1.5">
                                    <IconButton
                                      size="sm"
                                      variant="outline"
                                      icon={ArrowUp}
                                      label={tr('Di chuyển lên')}
                                      disabled={!canMoveUp || isMutating}
                                      onClick={() => handleReorder('levels', lv, -1)}
                                      data-testid={`move-up-level-${lv.id}`}
                                      className="!h-7 !w-7"
                                    />
                                    <span className="inline-block min-w-[24px] text-center font-semibold tabular-nums text-rp-text">
                                      {lv.sortOrder ?? scopeIndex + 1}
                                    </span>
                                    <IconButton
                                      size="sm"
                                      variant="outline"
                                      icon={ArrowDown}
                                      label={tr('Di chuyển xuống')}
                                      disabled={!canMoveDown || isMutating}
                                      onClick={() => handleReorder('levels', lv, 1)}
                                      data-testid={`move-down-level-${lv.id}`}
                                      className="!h-7 !w-7"
                                    />
                                  </div>
                                </td>
                                <td className="px-4 py-3.5">
                                  <Badge size="sm" tone={lv.isActive ? 'success' : 'neutral'}>
                                    {lv.isActive ? tr('Hoạt động') : tr('Ngừng sử dụng')}
                                  </Badge>
                                </td>
                                <td className="px-5 py-3.5 text-right">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    icon={Pencil}
                                    disabled={isMutating}
                                    onClick={() => openEditModal('levels', lv)}
                                    data-testid={`edit-level-${lv.id}`}
                                  >
                                    {tr('Sửa')}
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile / Tablet Compact List */}
                  <div className="space-y-2.5 md:hidden" data-testid="levels-mobile-list">
                    {filteredLevels.map((lv) => {
                      const parentCert = certById.get(Number(lv.certificateTypeId));
                      const scopeSiblings = siblingsByCertId.get(Number(lv.certificateTypeId)) || [];
                      const scopeIndex = scopeSiblings.findIndex((item) => Number(item.id) === Number(lv.id));
                      const canMoveUp = scopeIndex > 0;
                      const canMoveDown = scopeIndex >= 0 && scopeIndex < scopeSiblings.length - 1;
                      return (
                        <article
                          key={lv.id}
                          className="rounded-rp-card border border-rp-line bg-rp-surface p-4 shadow-rp-xs"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="inline-flex min-w-[42px] items-center justify-center rounded-lg border border-rp-brand-border bg-rp-brand-tint px-2 py-0.5 text-[13px] font-bold text-rp-brand-strong">
                                {lv.code}
                              </span>
                              <span className="truncate text-sm font-semibold text-rp-text">
                                {parentCert?.name || '—'}
                              </span>
                            </div>
                            <Badge size="sm" tone={lv.isActive ? 'success' : 'neutral'}>
                              {lv.isActive ? tr('Hoạt động') : tr('Ngừng sử dụng')}
                            </Badge>
                          </div>
                          {lv.description && (
                            <p className="mt-2 text-[13px] text-rp-text-2">{tr(lv.description)}</p>
                          )}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-rp-line/70 pt-3">
                            <div className="flex items-center gap-2 text-xs text-rp-text-muted tabular-nums">
                              <span>{tr('Thứ tự')}: {lv.sortOrder ?? scopeIndex + 1}</span>
                              <div className="flex items-center gap-1">
                                <IconButton
                                  size="sm"
                                  variant="outline"
                                  icon={ArrowUp}
                                  label={tr('Di chuyển lên')}
                                  disabled={!canMoveUp || isMutating}
                                  onClick={() => handleReorder('levels', lv, -1)}
                                  className="!h-7 !w-7"
                                />
                                <IconButton
                                  size="sm"
                                  variant="outline"
                                  icon={ArrowDown}
                                  label={tr('Di chuyển xuống')}
                                  disabled={!canMoveDown || isMutating}
                                  onClick={() => handleReorder('levels', lv, 1)}
                                  className="!h-7 !w-7"
                                />
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="secondary"
                              icon={Pencil}
                              disabled={isMutating}
                              onClick={() => openEditModal('levels', lv)}
                            >
                              {tr('Sửa')}
                            </Button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )
            )}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {modalState && (
        <Modal
          open={Boolean(modalState)}
          onClose={requestCloseModal}
          size="md"
          title={
            modalState.kind === 'certificates'
              ? (modalState.mode === 'edit' ? tr('Chỉnh sửa chứng chỉ') : tr('Thêm chứng chỉ'))
              : (modalState.mode === 'edit' ? tr('Chỉnh sửa cấp độ') : tr('Thêm cấp độ'))
          }
          description={
            modalState.kind === 'certificates'
              ? tr('Vô hiệu hóa sẽ ngừng đăng ký mới và giữ dữ liệu lịch sử.')
              : modalState.mode === 'edit'
                ? tr('Mã cấp độ và chứng chỉ cha được giữ cố định để bảo toàn dữ liệu lịch sử.')
                : tr('Gắn cấp độ vào chứng chỉ học tập; mã cấp độ sẽ được giữ cố định sau khi tạo.')
          }
          footer={(
            <>
              <Button variant="secondary" onClick={requestCloseModal} disabled={busy}>
                {tr('Hủy')}
              </Button>
              <Button type="submit" form={formId} variant="primary" loading={busy} disabled={busy} data-testid="catalog-modal-save">
                {tr('Lưu thay đổi')}
              </Button>
            </>
          )}
        >
          <form id={formId} onSubmit={handleSave} noValidate className="space-y-4">
            {submitError && (
              <Banner tone="danger" role="alert">
                {submitError}
              </Banner>
            )}

            {modalState.kind === 'certificates' ? (
              <>
                <Field label="Tên chứng chỉ" required error={fieldErrors.name}>
                  {({ id, describedBy, invalid }) => (
                    <Input
                      ref={nameInputRef}
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      maxLength={100}
                      placeholder={tr('Ví dụ: JLPT')}
                      value={modalState.draft.name}
                      onChange={(e) => updateDraft('name', e.target.value)}
                      disabled={busy}
                      autoFocus
                    />
                  )}
                </Field>

                <Field
                  label="Mô tả"
                  error={fieldErrors.description}
                  counter={`${String(modalState.draft.description || '').length}/2000`}
                >
                  {({ id, describedBy, invalid }) => (
                    <Textarea
                      ref={descInputRef}
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      rows={3}
                      maxLength={2000}
                      placeholder={tr('Mô tả ngắn gọn về chứng chỉ (tùy chọn)…')}
                      value={modalState.draft.description}
                      onChange={(e) => updateDraft('description', e.target.value)}
                      disabled={busy}
                    />
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <Field
                    label="Thứ tự hiển thị"
                    required
                    error={fieldErrors.sortOrder}
                    hint={
                      shiftPreviewTarget
                        ? trf('Vị trí {0} đang thuộc về "{1}". Khi lưu, các mục liên quan sẽ tự động dịch chuyển xuống.', {
                            0: modalState.draft.sortOrder,
                            1: shiftPreviewTarget.name,
                          })
                        : trf('Số nguyên dương từ 1 đến {0}.', { 0: maxAllowedOrder })
                    }
                  >
                    {({ id, describedBy, invalid }) => (
                      <Input
                        ref={sortOrderInputRef}
                        id={id}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        type="number"
                        min={1}
                        max={maxAllowedOrder}
                        step={1}
                        value={modalState.draft.sortOrder}
                        onChange={(e) => updateDraft('sortOrder', e.target.value)}
                        disabled={busy}
                      />
                    )}
                  </Field>

                  <Field
                    label="Trạng thái"
                    hint={!modalState.draft.isActive ? tr('Ngừng sử dụng cho đăng ký mới.') : undefined}
                  >
                    <div className="flex min-h-11 items-center rounded-rp-input border border-rp-line bg-rp-bg-2/50 px-3.5">
                      <Checkbox
                        label="Hoạt động"
                        checked={Boolean(modalState.draft.isActive)}
                        onChange={(e) => updateDraft('isActive', e.target.checked)}
                        disabled={busy}
                      />
                    </div>
                  </Field>
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Chứng chỉ"
                    required
                    error={fieldErrors.certificateTypeId}
                    hint={modalState.mode === 'edit' ? tr('Giữ nguyên sau khi tạo') : undefined}
                  >
                    {({ id, describedBy, invalid }) => (
                      <CustomSelect
                        ref={certSelectRef}
                        id={id}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        value={modalState.draft.certificateTypeId ? String(modalState.draft.certificateTypeId) : ''}
                        onChange={(val) => updateDraft('certificateTypeId', val ? String(val) : '')}
                        disabled={busy || modalState.mode === 'edit'}
                        placeholder={tr('Chọn chứng chỉ')}
                        options={types.map((t) => ({ value: String(t.id), label: t.name }))}
                        size="md"
                      />
                    )}
                  </Field>

                  <Field
                    label="Mã cấp độ"
                    required
                    error={fieldErrors.code}
                    hint={modalState.mode === 'edit' ? tr('Giữ nguyên sau khi tạo') : tr('Ví dụ: N5, N4, N3')}
                  >
                    {({ id, describedBy, invalid }) => (
                      <Input
                        ref={codeInputRef}
                        id={id}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        maxLength={50}
                        placeholder="N5"
                        value={modalState.draft.code}
                        onChange={(e) => updateDraft('code', e.target.value)}
                        disabled={busy || modalState.mode === 'edit'}
                        autoFocus={modalState.mode === 'create'}
                      />
                    )}
                  </Field>
                </div>

                <Field
                  label="Mô tả"
                  error={fieldErrors.description}
                  counter={`${String(modalState.draft.description || '').length}/2000`}
                >
                  {({ id, describedBy, invalid }) => (
                    <Textarea
                      ref={descInputRef}
                      id={id}
                      aria-describedby={describedBy}
                      invalid={invalid}
                      rows={3}
                      maxLength={2000}
                      placeholder={tr('Ví dụ: JLPT N5 — Sơ cấp…')}
                      value={modalState.draft.description}
                      onChange={(e) => updateDraft('description', e.target.value)}
                      disabled={busy}
                    />
                  )}
                </Field>

                <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
                  <Field
                    label="Thứ tự hiển thị"
                    required
                    error={fieldErrors.sortOrder}
                    hint={
                      shiftPreviewTarget
                        ? trf('Vị trí {0} đang thuộc về "{1}". Khi lưu, các mục liên quan sẽ tự động dịch chuyển xuống.', {
                            0: modalState.draft.sortOrder,
                            1: shiftPreviewTarget.code,
                          })
                        : trf('Số nguyên dương từ 1 đến {0}.', { 0: maxAllowedOrder })
                    }
                  >
                    {({ id, describedBy, invalid }) => (
                      <Input
                        ref={sortOrderInputRef}
                        id={id}
                        aria-describedby={describedBy}
                        invalid={invalid}
                        type="number"
                        min={1}
                        max={maxAllowedOrder}
                        step={1}
                        value={modalState.draft.sortOrder}
                        onChange={(e) => updateDraft('sortOrder', e.target.value)}
                        disabled={busy}
                      />
                    )}
                  </Field>

                  <Field
                    label="Trạng thái"
                    hint={!modalState.draft.isActive ? tr('Ngừng sử dụng cho đăng ký mới.') : undefined}
                  >
                    <div className="flex min-h-11 items-center rounded-rp-input border border-rp-line bg-rp-bg-2/50 px-3.5">
                      <Checkbox
                        label="Hoạt động"
                        checked={Boolean(modalState.draft.isActive)}
                        onChange={(e) => updateDraft('isActive', e.target.checked)}
                        disabled={busy}
                      />
                    </div>
                  </Field>
                </div>
              </>
            )}
          </form>
        </Modal>
      )}

      {/* Unsaved Changes Confirmation */}
      <AlertDialog
        open={confirmDiscardOpen}
        tone="warning"
        title={tr('Bỏ thay đổi chưa lưu?')}
        description={tr('Các thay đổi bạn vừa nhập sẽ không được lưu nếu đóng cửa sổ này.')}
        confirmLabel={tr('Bỏ thay đổi')}
        cancelLabel={tr('Tiếp tục chỉnh sửa')}
        onConfirm={forceCloseModal}
        onCancel={() => setConfirmDiscardOpen(false)}
      />
    </AdminShell>
  );
}
