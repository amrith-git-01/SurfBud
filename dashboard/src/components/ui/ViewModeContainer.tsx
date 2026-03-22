import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Globe } from 'lucide-react';
import { ViewModeToggle } from '@/components/ui/ViewModeToggle';
import { AnalyticsTooltip } from '@/components/ui/AnalyticsTooltip';
import { BrowsingCategoryIconBadge } from '@/components/ui/BrowsingCategoryIconBadge';
import type { ViewMode } from '@/types/ui.types';

const OTHERS_COLOR = '#9ca3af';

const DEFAULT_COLORS = [
  'var(--color-primary-500)',
  'var(--color-accent-500)',
  '#10b981',
  '#f97316',
  '#ec4899',
  '#06b6d4',
  '#f59e0b',
  '#84cc16',
  '#14b8a6',
  '#6366f1',
];

export interface ViewModeContainerItem {
  name: string;
  /** Optional muted part (e.g. domain) shown after · in list view; combined into chart labels. */
  nameSuffix?: string;
  value: number;
  secondary?: number;
  fill?: string;
  /** Brand / favicon URL — shown left of the title in list view when set. */
  iconUrl?: string;
  /** Lucide icon name (PascalCase) when `iconUrl` is missing — browsing list only. */
  categoryIcon?: string;
  /** Hex or CSS color for category fallback badge — browsing list only. */
  categoryColor?: string;
  newValue?: number;
  duplicateValue?: number;
  /** Domains that are in "Others" (rest after top N). Used for display. */
  othersKeys?: string[];
  /** Domains to exclude so the drawer shows only "Others" (top N names). Pass this to onSourceOthersClick. */
  othersExcludedKeys?: string[];
}

function combinedChartLabel(item: ViewModeContainerItem): string {
  if (item.nameSuffix != null && item.nameSuffix !== "") {
    return `${item.name} · ${item.nameSuffix}`;
  }
  return item.name;
}

function resolvedFill(
  item: ViewModeContainerItem,
  paletteIndex: number,
  palette: string[],
): string {
  const custom = item.fill?.trim();
  if (custom) return custom;
  return palette[paletteIndex % palette.length] ?? "#6b7280";
}

export interface ViewModeContainerProps {
  view: ViewMode;
  onViewChange: (mode: ViewMode) => void;
  data: ViewModeContainerItem[];
  title: string;
  valueLabel: string;
  secondaryLabel?: string;
  formatValue: (n: number) => string;
  formatSecondary?: (n: number) => string;
  colors?: string[];
  barDataKey?: 'value' | 'secondary';
  emptyMessage?: string;
  className?: string;
  minHeight?: string;
  totalRow?: ViewModeContainerItem | null;
  onTotalClick?: () => void;
  headerLeft?: React.ReactNode;
  onItemClick?: (item: ViewModeContainerItem) => void;
  onChartClick?: (item: ViewModeContainerItem) => void;
  /** When set (e.g. 7), show only top N items + "Others". Only Source Analytics uses this. */
  topN?: number;
  /** When true, bar chart X-axis shows every Nth label to avoid overlap. Only Source Analytics uses this. */
  barXAxisReduceLabels?: boolean;
  /** Optional formatter for bar chart X-axis labels (e.g. shorten domain names). */
  barXAxisFormatTick?: (label: string) => string;
  /** When set, formats Y-axis ticks (e.g. seconds → "2h 15m" for browsing time). */
  yAxisTickFormatter?: (value: number) => string;
  /**
   * `browsing`: title left, domain + duration on the right (no valueLabel suffix in list),
   * full-width text (no truncation), logo or category icon fallback.
   */
  listVariant?: 'default' | 'browsing';
}

function ListLeadingVisualBrowsing({ item }: { item: ViewModeContainerItem }) {
  const url = item.iconUrl?.trim();
  if (url) {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
        <img
          src={url}
          alt=""
          className="h-full w-full object-contain"
          referrerPolicy="no-referrer"
        />
      </span>
    );
  }
  const icon = item.categoryIcon?.trim();
  const col = item.categoryColor?.trim();
  if (icon && col) {
    return <BrowsingCategoryIconBadge iconName={icon} color={col} size="sm" />;
  }
  return (
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
      <Globe className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
    </span>
  );
}

export const ViewModeContainer: React.FC<ViewModeContainerProps> = ({
  view,
  onViewChange,
  data,
  title,
  valueLabel,
  secondaryLabel,
  formatValue,
  formatSecondary = (n) => n.toLocaleString(),
  colors = DEFAULT_COLORS,
  barDataKey = 'value',
  emptyMessage = 'No data available',
  className = '',
  minHeight,
  totalRow,
  onTotalClick,
  headerLeft,
  onItemClick,
  onChartClick,
  topN,
  barXAxisReduceLabels,
  barXAxisFormatTick,
  yAxisTickFormatter,
  listVariant = 'default',
}) => {
  const hasData = data.length > 0;
  const listNumericSuffix =
    listVariant === 'browsing' ? '' : ` ${valueLabel.toLowerCase()}`;
  const totalValue = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const chartWrapperRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState(260);

  useEffect(() => {
    const el = chartWrapperRef.current;
    if (!el) return;
    const setHeight = () => setChartHeight(el.offsetHeight);
    setHeight();
    const ro = new ResizeObserver(setHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, [view]);

  const chartData = useMemo(() => {
    const sorted = data
      .map((d, i) => ({
        ...d,
        fill: d.fill ?? colors[i % colors.length],
      }))
      .sort((a, b) => b.value - a.value);

    if (topN == null || topN <= 0 || sorted.length <= topN) return sorted;

    const top = sorted.slice(0, topN);
    const rest = sorted.slice(topN);
    const othersValue = rest.reduce((s, d) => s + d.value, 0);
    const othersSecondary = rest.reduce((s, d) => s + (d.secondary ?? 0), 0);
    const othersNew = rest.reduce((s, d) => s + (d.newValue ?? 0), 0);
    const othersDup = rest.reduce((s, d) => s + (d.duplicateValue ?? 0), 0);
    const topNames = top.map((d) => d.name);
    const restNames = rest.map((d) => d.name);
    const othersItem: ViewModeContainerItem = {
      name: 'Others',
      value: othersValue,
      secondary: othersSecondary > 0 ? othersSecondary : undefined,
      newValue: othersNew > 0 ? othersNew : undefined,
      duplicateValue: othersDup > 0 ? othersDup : undefined,
      fill: OTHERS_COLOR,
      othersKeys: restNames,
      othersExcludedKeys: topNames,
    };
    return [...top, othersItem];
  }, [data, colors, topN]);

  const chartDataForCharts = useMemo(
    () =>
      chartData.map((d) => ({
        ...d,
        name: combinedChartLabel(d),
      })),
    [chartData],
  );

  const barChartData = useMemo(
    () => {
      const mapped = chartData.map((d) => ({
        ...d,
        name: combinedChartLabel(d),
      }));
      return totalRow != null
        ? [{ ...totalRow, fill: totalRow.fill ?? "#6b7280" }, ...mapped]
        : mapped;
    },
    [totalRow, chartData],
  );

  const listContent = (
    <div
      className="space-y-4 h-[300px] min-h-[300px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar"
    >
      {totalRow != null && (
        <div
          role={onTotalClick ? 'button' : undefined}
          onClick={onTotalClick}
          className={`rounded-lg py-1 -mx-1 px-1 ${onTotalClick ? 'ui-hover-row cursor-pointer' : 'ui-hover-row cursor-default'}`}
        >
          <div className="mb-1.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
            <span className="text-xs font-semibold text-gray-700">{totalRow.name}</span>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <span className="text-xs text-gray-500">
                {formatValue(totalRow.value)}
                {listNumericSuffix}
                {(totalRow.newValue != null || totalRow.duplicateValue != null) && (
                  <>
                    {' '}
                    ({totalRow.newValue?.toLocaleString() ?? 0} new,{' '}
                    {totalRow.duplicateValue?.toLocaleString() ?? 0} dup)
                  </>
                )}
              </span>
              {secondaryLabel != null && totalRow.secondary != null && (
                <span className="min-w-[60px] text-right text-xs font-bold text-gray-900">
                  {formatSecondary(totalRow.secondary)}
                </span>
              )}
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className="anim-bar-fill anim-bar-fill--fast h-full w-full bg-gray-400"
              style={{ transformOrigin: 'left' }}
            />
          </div>
        </div>
      )}
      {chartData.map((item, rowIndex) => {
        const pct = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
        const listTitle = combinedChartLabel(item);
        return (
          <div
            key={`${item.name}-${item.nameSuffix ?? ""}-${rowIndex}`}
            role={onItemClick ? 'button' : undefined}
            onClick={() => onItemClick?.(item)}
            className={`ui-hover-row rounded-lg py-1 -mx-1 px-1 ${onItemClick ? 'cursor-pointer' : ''}`}
          >
            {listVariant === 'browsing' ? (
              <div className="mb-1.5 flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ListLeadingVisualBrowsing item={item} />
                  <span
                    className="break-words text-xs font-medium text-gray-700"
                    title={listTitle}
                  >
                    {item.name}
                  </span>
                </div>
                <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-x-2 text-xs text-gray-500">
                  {item.nameSuffix != null && item.nameSuffix !== '' ? (
                    <>
                      <span
                        className="break-all text-right font-mono text-gray-500"
                        title={item.nameSuffix}
                      >
                        {item.nameSuffix}
                      </span>
                      <span className="shrink-0 select-none text-gray-300" aria-hidden>
                        ·
                      </span>
                    </>
                  ) : null}
                  <span className="shrink-0 whitespace-nowrap font-tabular-nums">
                    {formatValue(item.value)}
                    {listNumericSuffix}
                  </span>
                  {secondaryLabel != null && item.secondary != null && (
                    <span className="min-w-[60px] shrink-0 text-right text-xs font-bold text-gray-900">
                      {formatSecondary(item.secondary)}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="mb-1.5 flex items-center justify-between">
                <span
                  className="flex min-w-0 max-w-[60%] items-center gap-2 text-xs font-medium text-gray-700"
                  title={listTitle}
                >
                  {item.iconUrl?.trim() ?
                    <img
                      src={item.iconUrl.trim()}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-md object-contain"
                      referrerPolicy="no-referrer"
                    />
                  : null}
                  <span className="truncate">{item.name}</span>
                  {item.nameSuffix != null && item.nameSuffix !== '' ? (
                    <>
                      <span className="shrink-0 select-none text-gray-300" aria-hidden>
                        ·
                      </span>
                      <span className="min-w-0 truncate font-mono text-xs font-normal text-gray-500">
                        {item.nameSuffix}
                      </span>
                    </>
                  ) : null}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">
                    {formatValue(item.value)}
                    {listNumericSuffix}
                    {(item.newValue != null || item.duplicateValue != null) && (
                      <>
                        {' '}
                        ({item.newValue?.toLocaleString() ?? 0} new,{' '}
                        {item.duplicateValue?.toLocaleString() ?? 0} dup)
                      </>
                    )}
                  </span>
                  {secondaryLabel != null && item.secondary != null && (
                    <span className="min-w-[60px] text-right text-xs font-bold text-gray-900">
                      {formatSecondary(item.secondary)}
                    </span>
                  )}
                </div>
              </div>
            )}
            <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full overflow-hidden" style={{ width: `${pct}%` }}>
                <div
                  className="anim-bar-fill anim-bar-fill--fast h-full w-full"
                  style={{ transformOrigin: 'left', backgroundColor: item.fill }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const pieContent = (
    <div ref={chartWrapperRef} className="flex-1 min-h-[260px]">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <PieChart>
          <Pie
            data={chartDataForCharts}
            cx="50%"
            cy="50%"
            outerRadius={80}
            dataKey="value"
            nameKey="name"
            stroke="none"
            label={({ name, percent }) =>
              (percent ?? 0) > 0.05 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : ''
            }
            labelLine={false}
            cursor="pointer"
            onClick={(data) => {
              if (!data) return;
              const fullItem = chartData.find(
                (c) => combinedChartLabel(c) === data.name,
              ) ?? {
                name: data.name,
                value: data.value,
                secondary: data.secondary,
                fill: data.fill,
              };
              onChartClick?.(fullItem);
            }}
          >
            {chartDataForCharts.map((entry, index) => (
              <Cell key={index} fill={entry.fill ?? '#6b7280'} />
            ))}
          </Pie>
          <Tooltip
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const item = props.payload[0]?.payload as ViewModeContainerItem & { fill?: string };
              if (!item) return null;
              return (
                <AnalyticsTooltip
                  item={item}
                  valueLabel={valueLabel}
                  secondaryLabel={secondaryLabel}
                  formatValue={formatValue}
                  formatSecondary={formatSecondary}
                />
              );
            }}
            wrapperStyle={{ zIndex: 9999 }}
            allowEscapeViewBox={{ x: true, y: true }}
            offset={15}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );

  const barContent = (
    <div ref={chartWrapperRef} className="flex-1 min-h-[260px]">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={barChartData}
          margin={{
            top: 5,
            right: 5,
            bottom: 20,
            left: yAxisTickFormatter ? 4 : -10,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            interval={
              barXAxisReduceLabels && barChartData.length >= 8
                ? Math.max(0, Math.floor(barChartData.length / 8))
                : 0
            }
            tickFormatter={barXAxisFormatTick}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            width={yAxisTickFormatter ? 72 : undefined}
            allowDecimals={false}
            tickFormatter={
              yAxisTickFormatter
                ? (v: number | string) => yAxisTickFormatter(Number(v))
                : undefined
            }
          />
          <Tooltip
            content={(props) => {
              if (!props.active || !props.payload?.length) return null;
              const row = props.payload[0]?.payload as (typeof chartData)[0];
              if (!row) return null;
              return (
                <AnalyticsTooltip
                  item={row}
                  valueLabel={valueLabel}
                  secondaryLabel={secondaryLabel}
                  formatValue={formatValue}
                  formatSecondary={formatSecondary}
                />
              );
            }}
            offset={15}
          />
          <Bar
            dataKey={barDataKey}
            radius={[4, 4, 0, 0]}
            barSize={28}
            cursor={onChartClick ? 'pointer' : undefined}
            onClick={(data: unknown) => {
              const row = data as ViewModeContainerItem & { fill?: string };
              if (row?.name == null) return;
              if (row.name === "Total" && totalRow != null) {
                onChartClick?.(totalRow);
                return;
              }
              const original =
                chartData.find((c) => combinedChartLabel(c) === row.name) ??
                row;
              onChartClick?.(original);
            }}
          >
            {barChartData.map((entry, index) => (
              <Cell key={index} fill={entry.fill ?? '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div
      className={`chart-glass flex flex-col ${className}`}
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          {headerLeft ?? (
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              {title}
            </span>
          )}
        </div>
        <ViewModeToggle value={view} onChange={onViewChange} />
      </div>
      <div className="flex-1 flex flex-col min-h-0">
        {!hasData ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-xs italic">
            {emptyMessage}
          </div>
        ) : (
          <>
            {view === 'list' && listContent}
            {view === 'pie' && pieContent}
            {view === 'bar' && barContent}
          </>
        )}
      </div>
    </div>
  );
};
