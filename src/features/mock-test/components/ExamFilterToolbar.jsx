import { RotateCcw } from 'lucide-react';
import { Button, CustomSelect, UnifiedToolbar } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';

/**
 * Shared filter toolbar powered directly by RikiPath's built-in UnifiedToolbar,
 * Tabs (pill), SearchInput, CustomSelect, and Button primitives.
 */
export default function ExamFilterToolbar({
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Tìm kiếm…',
  levels = [],
  activeLevel = 'ALL',
  onLevelChange,
  selects = [],
  onReset,
  hasActiveFilters = false,
  className,
}) {
  const { tr } = useLocale();

  const tabsConfig =
    levels.length > 0 && typeof onLevelChange === 'function'
      ? {
          label: tr('Lọc theo cấp độ JLPT'),
          variant: 'pill',
          size: 'md',
          value: activeLevel,
          onChange: onLevelChange,
          tabs: levels.map((lvl) => {
            const code = typeof lvl === 'string' ? lvl : lvl.code;
            const label =
              typeof lvl === 'string' ? (lvl === 'ALL' ? tr('Tất cả') : lvl) : tr(lvl.label || lvl.code);
            return { value: code, label };
          }),
        }
      : undefined;

  const searchConfig =
    typeof onSearchChange === 'function'
      ? {
          value: searchValue,
          onChange: (e) => onSearchChange(e.target.value),
          onClear: () => onSearchChange(''),
          placeholder: searchPlaceholder,
          size: 'md',
          fitContent: false,
          className: 'w-full sm:w-[220px] lg:w-[240px]',
        }
      : undefined;

  const filtersNode =
    selects.length > 0 ? (
      <>
        {selects.map((sel) => (
          <CustomSelect
            key={sel.key}
            fitContent
            size="md"
            aria-label={tr(sel.label)}
            value={sel.value}
            onChange={sel.onChange}
            options={(sel.options || []).map((opt) => ({
              value: opt.value,
              label: tr(opt.label),
            }))}
          />
        ))}
      </>
    ) : null;

  const actionsNode =
    hasActiveFilters && typeof onReset === 'function' ? (
      <Button type="button" variant="outline" size="md" icon={RotateCcw} onClick={onReset}>
        {tr('Đặt lại')}
      </Button>
    ) : null;

  return (
    <UnifiedToolbar
      ariaLabel={tr('Bộ lọc bộ đề và đề thi')}
      tabs={tabsConfig}
      search={searchConfig}
      filters={filtersNode}
      actions={actionsNode}
      className={className}
    />
  );
}
