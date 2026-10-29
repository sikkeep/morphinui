'use client';

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type Ref,
} from 'react';
import { gsap } from 'gsap';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/registry/morphin/ui/card';
import {
  BarChartNumber,
  useBarChartFormatter,
  barChartMotion,
  barChartResizeEase,
} from '@/registry/morphin/ui/bar-chart-motion';
import {
  barChartColumnClasses,
  barChartDescriptionClasses,
  barChartFillClasses,
  barChartRingClasses,
  barChartSwapClasses,
  barChartTrackClasses,
  barChartVariants,
  type BarChartSize,
} from '@/registry/morphin/ui/bar-chart-variants';

export interface BarChartDatum {
  /** Stable across updates so a bar keeps its place. */
  id: string;
  label: string;
  /** Finite, nonnegative values. Invalid rows are omitted. */
  value: number;
  color?: string;
}

export interface BarChartProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title' | 'children'> {
  ref?: Ref<HTMLElement>;
  title: string;
  data: readonly BarChartDatum[];
  /** Numeric summaries count on updates and use `format`. Other React content renders unchanged. */
  value?: ReactNode;
  /** A badge or other summary detail beside the value. */
  description?: ReactNode;
  /** Period controls or another header action. */
  action?: ReactNode;
  size?: BarChartSize;
  /** Preferred upper bound; expands to include all values and supplied ticks. */
  max?: number;
  /** Explicit tick values. By default: zero, half the upper bound and the upper bound. */
  ticks?: readonly number[];
  format?: Intl.NumberFormatOptions;
  locale?: string;
  /** Overrides the compact axis formatter; exact values still use `format`. */
  formatTick?: (value: number) => string;
  /** CSS color, inherited by all bars unless a row supplies its own color. */
  color?: string;
  emptyLabel?: string;
  /** Localized accessible name for the horizontally scrollable plot. */
  scrollLabel?: string;
  categoryLabel?: string;
  valueLabel?: string;
  reduceMotion?: boolean;
}

function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  if (power === 0) return value;
  const step = [1, 2, 5, 10].find((step) => value / power <= step) ?? 10;
  const upper = step * power;
  return Number.isFinite(upper) ? upper : value;
}

function BarFill({
  percent,
  color,
  reduced,
  children,
}: {
  percent: number;
  color?: string;
  reduced: boolean;
  children?: ReactNode;
}) {
  const element = useRef<HTMLDivElement>(null);
  const drawn = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    const node = element.current;
    const from = drawn.current;
    drawn.current = percent;
    if (!node) return;
    // A previous context may have reverted after React wrote the new target. Restore it
    // before capturing the context, so completion always restores the current value.
    node.style.height = `${percent}%`;
    if (reduced || from === undefined || from === percent) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        node,
        { height: `${from}%` },
        {
          height: `${percent}%`,
          duration: barChartMotion.resize.duration,
          ease: barChartResizeEase,
          onUpdate: () => {
            drawn.current = Number.parseFloat(node.style.height);
          },
          onComplete: () => {
            context.revert();
            drawn.current = percent;
          },
        },
      );
    });
    return () => {
      // The drawn value is recorded by the tween, before React can write a new target.
      const height = drawn.current;
      context.revert();
      drawn.current = height;
    };
  }, [percent, reduced]);
  return (
    <div
      ref={element}
      data-slot="bar-chart-fill"
      className={barChartFillClasses}
      style={{
        height: `${percent}%`,
        backgroundColor: color,
        color: color ?? 'var(--bar-chart)',
      }}
    >
      {children}
    </div>
  );
}

function BarRing({ active, reduced }: { active: boolean; reduced: boolean }) {
  const ring = useRef<HTMLSpanElement>(null);
  const drawn = useRef(0);
  useLayoutEffect(() => {
    const node = ring.current;
    const to = active ? 1 : 0;
    const from = drawn.current;
    drawn.current = to;
    if (!node || reduced || from === to) return;
    const context = gsap.context(() => {
      gsap.fromTo(
        node,
        { opacity: from },
        {
          opacity: to,
          duration: active
            ? barChartMotion.hover.enter
            : barChartMotion.hover.exit,
          ease: barChartMotion.hover.ease,
          onUpdate: () => {
            drawn.current = Number.parseFloat(node.style.opacity);
          },
          onComplete: () => {
            context.revert();
            drawn.current = to;
          },
        },
      );
    });
    return () => {
      const opacity = drawn.current;
      context.revert();
      drawn.current = opacity;
    };
  }, [active, reduced]);
  return (
    <span
      ref={ring}
      data-slot="bar-chart-ring"
      data-active={active || undefined}
      className={barChartRingClasses}
    />
  );
}

function BarColumn({
  row,
  percent,
  formatted,
  reduced,
  hovered,
  dimmed,
  onHover,
}: {
  row: BarChartDatum;
  percent: number;
  formatted: string;
  reduced: boolean;
  hovered: boolean;
  dimmed: boolean;
  onHover: (id: string | null) => void;
}) {
  return (
    <div
      data-slot="bar-chart-column"
      data-bar-id={row.id}
      data-highlighted={hovered || undefined}
      data-dimmed={dimmed || undefined}
      className={barChartColumnClasses}
      title={`${row.label}: ${formatted}`}
      onPointerEnter={(event) => {
        if (
          event.pointerType !== 'touch' &&
          window.matchMedia('(hover: hover) and (pointer: fine)').matches
        )
          onHover(row.id);
      }}
      onPointerLeave={() => onHover(null)}
      onPointerCancel={() => onHover(null)}
    >
      <div className="h-(--bar-chart-height)">
        <div data-slot="bar-chart-track" className={barChartTrackClasses}>
          <BarFill percent={percent} color={row.color} reduced={reduced}>
            <BarRing active={hovered && percent > 0} reduced={reduced} />
          </BarFill>
        </div>
      </div>
      <div
        data-slot="bar-chart-label"
        className="mt-2 truncate text-center text-xs text-muted-foreground"
      >
        {row.label}
      </div>
    </div>
  );
}

/** A single-series bar chart with rounded tracks, a summary and a readable data table. */
export function BarChart({
  ref,
  title,
  data,
  value,
  description,
  action,
  size = 'md',
  max,
  ticks,
  format,
  locale = 'en-US',
  formatTick,
  color,
  emptyLabel = 'No data yet',
  scrollLabel,
  categoryLabel = 'Category',
  valueLabel = 'Value',
  reduceMotion = false,
  className,
  style,
  ...props
}: BarChartProps) {
  const titleId = useId();
  const reduced = useReducedMotion() || reduceMotion;
  const rows = data.filter(
    (row) => Number.isFinite(row.value) && row.value >= 0,
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const hoveredRow = rows.find((row) => row.id === hoveredId);
  // The readout keeps the last bar's name while it fades out, so the swap never shows an empty label.
  const [lastRow, setLastRow] = useState<BarChartDatum | null>(null);
  if (hoveredRow && hoveredRow !== lastRow) setLastRow(hoveredRow);
  // With a numeric summary, pointing at a bar turns the header into that bar's name and value.
  const reading = typeof value === 'number' && hoveredRow ? hoveredRow : null;
  const validTicks = ticks?.filter(
    (tick) => Number.isFinite(tick) && tick >= 0,
  );
  const largest = rows.reduce(
    (largest, row) => Math.max(largest, row.value),
    0,
  );
  const domain = (validTicks ?? []).reduce(
    (largest, tick) => Math.max(largest, tick),
    largest,
  );
  const upper =
    Math.max(
      max !== undefined && Number.isFinite(max) && max > 0
        ? max
        : niceMax(domain),
      domain,
    ) || 1;
  const axis = [
    ...new Set(validTicks?.length ? validTicks : [0, upper / 2, upper]),
  ].sort((a, b) => a - b);
  const exact = useBarChartFormatter(locale, format);
  const compactFormat: Intl.NumberFormatOptions = {
    ...format,
    notation: 'compact',
    maximumFractionDigits: 1,
  };
  return (
    <Card
      render={<figure />}
      interactive={false}
      size={size === 'lg' ? 'md' : size === 'sm' ? 'xs' : 'sm'}
      {...props}
      ref={ref}
      data-slot="bar-chart"
      data-size={size}
      data-reduced-motion={reduced || undefined}
      aria-labelledby={titleId}
      className={cn(barChartVariants({ size }), className)}
      style={
        {
          ...style,
          ...(color ? { '--bar-chart': color } : {}),
        } as CSSProperties
      }
    >
      <CardHeader
        render={<figcaption />}
        data-slot="bar-chart-header"
        className="flex flex-wrap items-start justify-between gap-3"
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="grid">
            <CardTitle
              render={<span />}
              id={titleId}
              data-slot="bar-chart-title"
              data-hidden={reading ? true : undefined}
              className={cn('text-sm text-muted-foreground', barChartSwapClasses)}
            >
              {title}
            </CardTitle>
            <span
              aria-hidden="true"
              data-slot="bar-chart-readout-label"
              data-hidden={reading ? undefined : true}
              className={cn(
                'truncate text-sm text-muted-foreground',
                barChartSwapClasses,
              )}
            >
              {lastRow?.label}
            </span>
          </div>
          {(value != null || description != null) && (
            <div className="flex flex-wrap items-center gap-2">
              {value != null && (
                <span
                  data-slot="bar-chart-value"
                  className="text-2xl font-medium tracking-tight tabular-nums"
                >
                  {typeof value === 'number' ? (
                    <BarChartNumber
                      value={reading ? reading.value : value}
                      format={format}
                      locale={locale}
                      reduceMotion={reduced}
                    />
                  ) : (
                    value
                  )}
                </span>
              )}
              {description != null && (
                <div
                  data-slot="bar-chart-description"
                  data-hidden={reading ? true : undefined}
                  className={barChartDescriptionClasses}
                >
                  {description}
                </div>
              )}
            </div>
          )}
        </div>
        {action != null && (
          <CardAction data-slot="bar-chart-action" className="max-w-full">
            {action}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p
            data-slot="bar-chart-empty"
            className="flex h-(--bar-chart-height) items-center justify-center text-sm text-muted-foreground"
          >
            {emptyLabel}
          </p>
        ) : (
          <>
            <div className="flex gap-3 pt-3" data-slot="bar-chart-plot">
              <div
                aria-hidden="true"
                data-slot="bar-chart-axis"
                className="relative mt-1 mb-7 h-(--bar-chart-height) w-10 shrink-0 text-end text-xs tabular-nums text-muted-foreground"
              >
                {axis.map((tick, index) => (
                  <span
                    key={index}
                    className="absolute end-0 whitespace-nowrap"
                    style={{
                      bottom: `${(tick / upper) * 100}%`,
                      transform: 'translateY(50%)',
                    }}
                  >
                    {formatTick ? (
                      formatTick(tick)
                    ) : (
                      <BarChartNumber
                        value={tick}
                        format={compactFormat}
                        locale={locale}
                        reduceMotion={reduced}
                      />
                    )}
                  </span>
                ))}
              </div>
              <div
                tabIndex={0}
                role="region"
                aria-label={
                  scrollLabel ?? `${title}: scroll to see all categories`
                }
                data-slot="bar-chart-scroller"
                className="-mx-1 min-w-0 flex-1 overflow-x-auto rounded-sm px-1 py-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <div
                  aria-hidden="true"
                  className="flex gap-(--bar-chart-gap)"
                  style={{
                    minWidth: `calc(${rows.length} * var(--bar-chart-width) + ${Math.max(0, rows.length - 1)} * var(--bar-chart-gap))`,
                  }}
                >
                  {rows.map((row) => (
                    <BarColumn
                      key={row.id}
                      row={row}
                      percent={(row.value / upper) * 100}
                      formatted={exact.format(row.value)}
                      reduced={reduced}
                      hovered={row.id === hoveredId}
                      dimmed={hoveredId !== null && row.id !== hoveredId}
                      onHover={setHoveredId}
                    />
                  ))}
                </div>
              </div>
            </div>
            <table className="sr-only" data-slot="bar-chart-table">
              <caption>{title}</caption>
              <thead>
                <tr>
                  <th scope="col">{categoryLabel}</th>
                  <th scope="col">{valueLabel}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{row.label}</th>
                    <td>{exact.format(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export { BarChartNumber } from '@/registry/morphin/ui/bar-chart-motion';
export type { BarChartNumberProps } from '@/registry/morphin/ui/bar-chart-motion';
