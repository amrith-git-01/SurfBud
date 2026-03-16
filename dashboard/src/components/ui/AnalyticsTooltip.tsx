import React from 'react';
import type { ViewModeContainerItem } from './ViewModeContainer';

export interface AnalyticsTooltipProps {
  item: ViewModeContainerItem & { fill?: string };
  valueLabel: string;
  secondaryLabel?: string;
  formatValue: (n: number) => string;
  formatSecondary?: (n: number) => string;
}

/**
 * Tooltip for analytics charts (pie/bar) showing category/domain details.
 * Displays: item name, file/download count, size, new count, duplicates.
 */
export const AnalyticsTooltip: React.FC<AnalyticsTooltipProps> = ({
  item,
  valueLabel,
  secondaryLabel,
  formatValue,
  formatSecondary = (n) => n.toLocaleString(),
}) => {
  return (
    <div className="p-3 rounded-xl bg-white border border-gray-200 shadow-lg text-xs text-gray-900 min-w-[160px]">
      <div
        className="font-semibold mb-1.5 border-b border-gray-200 pb-1.5 truncate"
        title={item.name}
      >
        {item.name}
      </div>
      <div className="flex justify-between gap-4">
        <span className="text-gray-600">{valueLabel}</span>
        <span className="font-semibold font-tabular-nums">
          {formatValue(item.value)}
        </span>
      </div>
      {secondaryLabel != null && item.secondary != null && (
        <div className="flex justify-between gap-4 mt-1">
          <span className="text-gray-600">{secondaryLabel}</span>
          <span className="font-semibold font-tabular-nums">
            {formatSecondary(item.secondary)}
          </span>
        </div>
      )}
      {(item.newValue != null || item.duplicateValue != null) && (
        <>
          <div className="flex justify-between gap-4 mt-1">
            <span className="text-gray-600">New</span>
            <span className="font-semibold font-tabular-nums">
              {item.newValue?.toLocaleString() ?? 0}
            </span>
          </div>
          <div className="flex justify-between gap-4 mt-0.5">
            <span className="text-gray-600">Duplicates</span>
            <span className="font-semibold font-tabular-nums">
              {item.duplicateValue?.toLocaleString() ?? 0}
            </span>
          </div>
        </>
      )}
    </div>
  );
};
