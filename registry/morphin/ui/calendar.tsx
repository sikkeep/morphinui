'use client';

import { createContext, use, useCallback, useEffect, useLayoutEffect, useMemo, useRef, type Ref, type RefObject } from 'react';
import {
  DayPicker, Nav as DayPickerNav, useDayPicker,
  type ChevronProps, type ClassNames, type CustomComponents, type DayButtonProps, type DayPickerProps, type DayProps,
  type FooterProps, type MonthCaptionProps, type MonthGridProps, type MonthProps, type MonthsProps, type NavProps,
  type NextMonthButtonProps, type PreviousMonthButtonProps, type RootProps, type WeekProps, type WeekdaysProps, type WeeksProps,
} from 'react-day-picker';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound } from '@/registry/morphin/lib/sound';
import { IconButton } from '@/registry/morphin/ui/button';
import { calendarClassNames, calendarVariants, type CalendarOptions, type CalendarSize } from '@/registry/morphin/ui/calendar-variants';

export { calendarClassNames, calendarVariants, calendarSizes } from '@/registry/morphin/ui/calendar-variants';
export type { CalendarOptions, CalendarSize } from '@/registry/morphin/ui/calendar-variants';
export type { DateRange, Matcher } from 'react-day-picker';

gsap.registerPlugin(CustomEase);
const smooth = CustomEase.create('morphin-calendar', '0.22,1,0.36,1');

/** The month change: the grid slides `distance` px in the direction of travel and cross-blurs. Duration in seconds. */
export const calendarMotion = { duration: 0.25, distance: 8, blur: 2 } as const;

/** `shownMonthRef` holds the first displayed month's time, so a month change can tell which way it went. */
type CalendarContextValue = { size: CalendarSize; reduced: boolean; ref?: Ref<HTMLDivElement>; shownMonthRef?: RefObject<number | undefined> };
const CalendarContext = createContext<CalendarContextValue>({ size: 'md', reduced: true });

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) ref.current = value;
}

/** Drops react-day-picker's data props before they reach the DOM. */
function omit<Props extends object, Key extends keyof Props>(props: Props, ...keys: Key[]): Omit<Props, Key> {
  const rest = { ...props };
  for (const key of keys) delete rest[key];
  return rest;
}

const animatedProps = ['opacity', 'transform', 'translate', 'rotate', 'scale', 'filter'];

/** A detached copy of a month at rest, with no ids, live regions or animation styles, for the cross-fade. */
function snapshotOf(month: HTMLElement) {
  const copy = month.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('[data-calendar-outgoing]').forEach(node => node.remove());
  copy.querySelectorAll<HTMLElement>('[id], [role=status], [data-slot=calendar-caption], [data-slot=calendar-weeks]').forEach(node => {
    node.removeAttribute('id');
    if (node.getAttribute('role') === 'status') {
      node.removeAttribute('role');
      node.removeAttribute('aria-live');
    }
    for (const property of animatedProps) node.style.removeProperty(property);
  });
  return copy;
}

/** The parts of a live month that slide in: its caption and its weeks, never the weekday header. */
function incomingParts(month: HTMLElement) {
  return Array.from(month.children).flatMap(child => {
    const slot = child.getAttribute('data-slot');
    if (slot === 'calendar-caption') return [child as HTMLElement];
    if (slot === 'calendar-grid') return Array.from(child.querySelectorAll<HTMLElement>(':scope > [data-slot=calendar-weeks]'));
    return [];
  });
}

/**
 * Slides and cross-blurs each month when the displayed month changes: a copy of the old month leaves
 * while the new caption and weeks arrive. Never on the first render; inline styles are reverted on settle,
 * interruption and unmount.
 */
function useMonthMotion(root: RefObject<HTMLDivElement | null>, month: number | undefined, rtl: boolean, reduced: boolean) {
  const previous = useRef<number | undefined>(undefined);
  const snapshots = useRef<HTMLElement[]>([]);

  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = month;
    const element = root.current;
    if (reduced || !element || before === undefined || month === undefined || before === month) return;

    const direction = (month > before ? 1 : -1) * (rtl ? -1 : 1);
    const { duration, distance, blur } = calendarMotion;
    const months = Array.from(element.querySelectorAll<HTMLElement>('[data-slot=calendar-month]'));
    const copies: HTMLElement[] = [];
    let context: gsap.Context | undefined;
    const settle = () => {
      context?.revert();
      context = undefined;
      copies.forEach(copy => copy.remove());
    };

    context = gsap.context(() => {
      const timeline = gsap.timeline({ onComplete: settle });
      months.forEach((live, index) => {
        const parts = incomingParts(live);
        if (parts.length) {
          timeline.fromTo(parts,
            { x: direction * distance, opacity: 0, filter: `blur(${blur}px)` },
            { x: 0, opacity: 1, filter: 'blur(0px)', duration, ease: smooth }, 0);
        }
        const copy = snapshots.current[index];
        if (!copy) return;
        copy.setAttribute('data-slot', 'calendar-month-outgoing');
        copy.setAttribute('data-calendar-outgoing', '');
        copy.setAttribute('aria-hidden', 'true');
        copy.setAttribute('inert', '');
        copy.querySelectorAll<HTMLElement>('[data-slot=calendar-weekdays], [data-slot=calendar-nav-button]').forEach(node => { node.style.visibility = 'hidden'; });
        Object.assign(copy.style, { position: 'absolute', top: '0', insetInline: '0', margin: '0', pointerEvents: 'none' });
        live.append(copy);
        copies.push(copy);
        timeline.to(copy, { x: -direction * distance, opacity: 0, filter: `blur(${blur}px)`, duration, ease: smooth }, 0);
      });
    }, element);
    return settle;
  }, [root, month, rtl, reduced]);

  // Runs after every render: keeps a copy of each month at rest for the next change.
  useLayoutEffect(() => {
    const element = root.current;
    snapshots.current = reduced || !element ? [] : Array.from(element.querySelectorAll<HTMLElement>('[data-slot=calendar-month]'), snapshotOf);
  });
}

function CalendarRoot({ rootRef, className, children, ...props }: RootProps) {
  const { ref, reduced, shownMonthRef } = use(CalendarContext);
  const { months, dayPickerProps } = useDayPicker();
  const element = useRef<HTMLDivElement | null>(null);
  const setElement = useCallback((node: HTMLDivElement | null) => {
    element.current = node;
    assignRef(ref, node);
    assignRef(rootRef, node);
  }, [ref, rootRef]);
  const month = months[0]?.date.getTime();
  useLayoutEffect(() => {
    if (shownMonthRef) shownMonthRef.current = month;
  }, [shownMonthRef, month]);
  useMonthMotion(element, month, dayPickerProps.dir === 'rtl', reduced);
  return <div data-slot="calendar" {...props} ref={setElement} className={className}>{children}</div>;
}

function CalendarMonths(props: MonthsProps) {
  return <div data-slot="calendar-months" {...props} />;
}

function CalendarMonth(props: MonthProps) {
  return <div data-slot="calendar-month" {...omit(props, 'calendarMonth', 'displayIndex')} />;
}

function CalendarMonthCaption(props: MonthCaptionProps) {
  return <div data-slot="calendar-caption" {...omit(props, 'calendarMonth', 'displayIndex')} />;
}

function CalendarNav(props: NavProps) {
  return <DayPickerNav data-slot="calendar-nav" {...props} />;
}

function CalendarChevron({ orientation = 'left', className, style }: ChevronProps) {
  const Icon = { left: ChevronLeft, right: ChevronRight, up: ChevronUp, down: ChevronDown }[orientation];
  return <Icon className={className} style={style} strokeWidth={1.8} aria-hidden="true" />;
}

function CalendarNavButton({ children, className, style, onClick, tabIndex, 'aria-label': label, 'aria-disabled': unavailable }: PreviousMonthButtonProps | NextMonthButtonProps) {
  const { size, reduced } = use(CalendarContext);
  return <IconButton
    data-slot="calendar-nav-button"
    variant="ghost"
    size={size === 'sm' ? 'xs' : 'sm'}
    label={label ?? ''}
    reduceMotion={reduced}
    disabled={unavailable === true || unavailable === 'true'}
    tabIndex={tabIndex}
    onClick={onClick}
    className={className}
    style={style}
  >
    {children}
  </IconButton>;
}

function CalendarMonthGrid(props: MonthGridProps) {
  return <table data-slot="calendar-grid" {...props} />;
}

function CalendarWeekdays(props: WeekdaysProps) {
  return <thead aria-hidden="true" className="block">
    <tr data-slot="calendar-weekdays" {...props} />
  </thead>;
}

function CalendarWeeks(props: WeeksProps) {
  return <tbody data-slot="calendar-weeks" {...props} />;
}

function CalendarWeek(props: WeekProps) {
  return <tr data-slot="calendar-week" role="row" {...omit(props, 'week')} />;
}

function CalendarDay({ modifiers, ...props }: DayProps) {
  return <td
    data-slot="calendar-day"
    data-range-start={modifiers.range_start || undefined}
    data-range-middle={modifiers.range_middle || undefined}
    data-range-end={modifiers.range_end || undefined}
    {...omit(props, 'day')}
  />;
}

function CalendarDayButton({ modifiers, onClick, ...props }: DayButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const play = useSound();
  // react-day-picker moves keyboard focus by marking a day as focused.
  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);
  return <button
    data-slot="calendar-day-button"
    {...omit(props, 'day')}
    ref={ref}
    onClick={event => {
      onClick?.(event);
      if (!modifiers.disabled) play('select');
    }}
  />;
}

function CalendarFooter(props: FooterProps) {
  return <div data-slot="calendar-footer" {...props} />;
}

const calendarComponents: Partial<CustomComponents> = {
  Root: CalendarRoot,
  Months: CalendarMonths,
  Month: CalendarMonth,
  MonthCaption: CalendarMonthCaption,
  Nav: CalendarNav,
  Chevron: CalendarChevron,
  PreviousMonthButton: CalendarNavButton,
  NextMonthButton: CalendarNavButton,
  MonthGrid: CalendarMonthGrid,
  Weekdays: CalendarWeekdays,
  Weeks: CalendarWeeks,
  Week: CalendarWeek,
  Day: CalendarDay,
  DayButton: CalendarDayButton,
  Footer: CalendarFooter,
};

function mergeClassNames(custom?: Partial<ClassNames>) {
  if (!custom) return calendarClassNames;
  const merged: Partial<ClassNames> = { ...calendarClassNames };
  for (const key of Object.keys(custom) as (keyof ClassNames)[]) merged[key] = cn(calendarClassNames[key], custom[key]);
  return merged;
}

export type CalendarProps = DayPickerProps & CalendarOptions & {
  /** Turns the month change motion and the day transitions off. `false` cannot override `prefers-reduced-motion` or `MotionProvider`. */
  reduceMotion?: boolean;
  /** The root element. */
  ref?: Ref<HTMLDivElement>;
};

/**
 * A month grid on react-day-picker, in single, multiple or range `mode`. Every DayPicker prop passes
 * through (`selected`, `onSelect`, `disabled`, `defaultMonth`, `numberOfMonths`, `captionLayout`,
 * `locale`, `weekStartsOn`…). The month change slides and cross-blurs with GSAP; DayPicker's own
 * `animate` is not used.
 */
export function Calendar({
  size = 'md', reduceMotion = false, showOutsideDays = true, className, classNames, components, ref, ...props
}: CalendarProps) {
  const reduced = useReducedMotion() || reduceMotion;
  const play = useSound();
  const shownMonthRef = useRef<number | undefined>(undefined);
  const mergedClassNames = useMemo(() => mergeClassNames(classNames), [classNames]);
  const mergedComponents = useMemo(() => components ? { ...calendarComponents, ...components } : calendarComponents, [components]);
  const context = useMemo(() => ({ size, reduced, ref, shownMonthRef }), [size, reduced, ref]);

  return <CalendarContext value={context}>
    <DayPicker
      {...(props as DayPickerProps)}
      // react-day-picker calls this only for navigation by the user (arrows, the caption dropdowns, keyboard), never for a new `month` prop.
      onMonthChange={month => {
        props.onMonthChange?.(month);
        const before = shownMonthRef.current;
        if (before === undefined || before === month.getTime()) return;
        play('navigate', { emphasis: 'subtle', direction: month.getTime() > before ? 'forward' : 'back' });
      }}
      data-size={size}
      data-reduced-motion={reduced || undefined}
      showOutsideDays={showOutsideDays}
      className={cn(calendarVariants({ size }), className)}
      classNames={mergedClassNames}
      components={mergedComponents}
      animate={false}
    />
  </CalendarContext>;
}
