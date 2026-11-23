import { useMemo } from 'react';
import { ArrowRight, Package, ShieldCheck } from 'lucide-react';

import { Card } from '@/components/ui';
import { useLocale } from '@/locales/locale.js';
import { formatVnDateTime } from '@/utils/vnDateTime.js';
import { describeAuditLog, featureDisplayName } from './adminPlansModel.js';

/**
 * Human-readable history for plans and feature policies only (the query is scoped to those entity types).
 * Each entry: subject, a plain-language sentence, actor, time, reason, and a before → after list of the fields that
 * actually changed. Raw JSON and technical codes are never shown.
 */
export default function AdminPlansAuditPanel({ logs, plans, features }) {
  const { tr, trf } = useLocale();
  const planNamesById = useMemo(() => new Map(plans.map((p) => [p.id, p.name])), [plans]);
  const featureNamesById = useMemo(() => new Map(features.map((f) => [f.id, featureDisplayName(f)])), [features]);

  return (
    <Card className="min-h-0 flex-1 overflow-y-auto p-0">
      <ol className="divide-y divide-rp-line">
        {logs.map((log) => {
          const entry = describeAuditLog(log, { tr, trf, planNamesById, featureNamesById });
          const Icon = entry.kind === 'feature' ? ShieldCheck : Package;
          const sentence = entry.sentenceArgs ? trf(entry.sentence, entry.sentenceArgs) : tr(entry.sentence);
          return (
            <li key={log.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
              <span aria-hidden="true" className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rp-brand-tint text-rp-brand-strong">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-rp-text">{entry.kind === 'feature' ? tr(entry.subject) : entry.subject}</p>
                <p className="text-sm text-rp-text-2">{sentence}</p>
                {log.reason && (
                  <p className="text-xs text-rp-text-2">
                    {tr('Lý do')}: <span className="italic">“{log.reason}”</span>
                  </p>
                )}
                {entry.changes.length > 0 && (
                  <div className="mt-1.5 rounded-xl border border-rp-line bg-rp-bg-2/60 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-rp-text-muted">{tr('Thông tin đã thay đổi')}</p>
                    <dl className="mt-1 space-y-1 text-xs">
                      {entry.changes.map((change) => (
                        <div key={change.label} className="flex flex-wrap items-baseline gap-x-2">
                          <dt className="font-semibold text-rp-text-2">{change.label}:</dt>
                          <dd className="flex flex-wrap items-center gap-1.5 text-rp-text">
                            {change.from && <span className="text-rp-text-muted line-through decoration-rp-line">{change.from}</span>}
                            {change.from && change.to && <ArrowRight aria-label={tr('thành')} className="h-3 w-3 text-rp-text-muted" />}
                            {change.to && <span className="font-semibold">{change.to}</span>}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                )}
                <p className="text-xs text-rp-text-muted">
                  {tr('Thực hiện bởi')}: <strong className="text-rp-text-2">{log.actorName || tr('Quản trị viên')}</strong>
                  {' · '}{formatVnDateTime(log.createdAtUtc)}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
