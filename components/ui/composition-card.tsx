"use client";

import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface CompositionRow {
  /** Group name — breed, crop type, whatever the card is split by. */
  label: string;
  /** Drives both the bar width and the share percentage. */
  value: number;
  /** Small muted line under the bar, e.g. "deployed 500 · mortality 30". */
  detail?: string;
}

interface CompositionCardProps {
  title: string;
  /** Font Awesome class, e.g. "fa-kiwi-bird". */
  icon?: string;
  total: number;
  /** Noun for the total, e.g. "birds on hand". */
  unitLabel: string;
  /** Optional extra line under the total, e.g. "8 does · 4 bucks". */
  subLine?: string;
  rows: CompositionRow[];
  emptyMessage: string;
  /** Makes the header a button, so the card drills into its section. */
  onTitleClick?: () => void;
}

/**
 * A titled card showing how a total splits across categories, one bar per row.
 *
 * Rows at zero are kept rather than filtered: an empty row answers "are we
 * running any Broilers?" as usefully as a populated one does, and dropping them
 * would make the card silently change shape as stock comes and goes.
 */
export function CompositionCard({
  title,
  icon,
  total,
  unitLabel,
  subLine,
  rows,
  emptyMessage,
  onTitleClick,
}: CompositionCardProps) {
  const heading = (
    <span className="flex items-center gap-2">
      {icon ? <i className={`fas ${icon} text-accent`} /> : null}
      <span className="text-xl font-semibold">{title}</span>
      {onTitleClick ? <i className="fas fa-chevron-right text-muted text-xs" /> : null}
    </span>
  );

  return (
    <Card>
      <div className="flex justify-between items-start gap-4 mb-5">
        {onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            aria-label={`${title}: ${total} ${unitLabel}. View section.`}
            className="text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-primary hover:text-primary transition-colors"
          >
            {heading}
          </button>
        ) : (
          heading
        )}
        <div className="text-right shrink-0">
          <div className="text-2xl font-bold leading-none">{total.toLocaleString()}</div>
          <div className="text-[0.7rem] text-muted uppercase tracking-wide mt-1">{unitLabel}</div>
          {subLine ? <div className="text-[0.7rem] text-muted mt-0.5">{subLine}</div> : null}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-muted text-center py-6">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((r) => {
            // Guarded: a sector that has sold out entirely is a real state, and
            // 0/0 would otherwise render a NaN-width bar.
            const pct = total > 0 ? (r.value / total) * 100 : 0;
            return (
              <div key={r.label} className={r.value === 0 ? "opacity-50" : undefined}>
                <div className="flex justify-between items-baseline mb-1.5 gap-3">
                  <span className="font-medium truncate">{r.label}</span>
                  <span className="text-sm shrink-0">
                    <strong>{r.value.toLocaleString()}</strong>
                    <span className="text-muted ml-2 tabular-nums">{pct.toFixed(0)}%</span>
                  </span>
                </div>
                <ProgressBar value={pct} />
                {r.detail ? (
                  <div className="text-[0.7rem] text-muted mt-1.5">{r.detail}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
