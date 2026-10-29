'use client';

import { useCallback, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { useLabelableContext, useLabelableId } from '@base-ui/react/internals/labelable-provider';
import { HugeiconsIcon } from '@hugeicons/react';
import { Calendar03Icon } from '@hugeicons/core-free-icons';
import type { DateRange, DayPickerLocale, PropsBase, PropsRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound } from '@/registry/morphin/lib/sound';
import { Calendar, type CalendarOptions } from '@/registry/morphin/ui/calendar';
import { dropdownContentVariants } from '@/registry/morphin/ui/dropdown-variants';
import { selectTriggerClasses, type SelectTriggerOptions } from '@/registry/morphin/ui/select-variants';

export type { DateRange } from 'react-day-picker';

function stateClasses<State>(base: string, custom?: string | ((state: State) => string | undefined)) {
  return typeof custom === 'function' ? (state: State) => cn(base, custom(state)) : cn(base, custom);
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');
/** The local calendar date as `yyyy-mm-dd`, the value a native date input submits. */
export function toISODate(date: Date) {
  return `${pad(date.getFullYear(), 4)}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Calendar props a date picker passes through. Selection (`mode`, `selected`, `onSelect`) belongs to the picker. */
export type DatePickerCalendarProps = Omit<PropsBase, 'animate' | 'className'> & Partial<Pick<PropsRange, 'min' | 'max' | 'excludeDisabled' | 'resetOnSelect'>> & CalendarOptions & {
  className?: string;
};

type Selection = Date | DateRange;

interface DatePickerSingleProps {
  mode?: 'single';
  /** The chosen date. `null` keeps the picker controlled with no date. */
  value?: Date | null;
  defaultValue?: Date | null;
  onValueChange?: (value: Date | undefined) => void;
}

interface DatePickerRangeProps {
  mode: 'range';
  /** The chosen range. `null` keeps the picker controlled with no range. */
  value?: DateRange | null;
  defaultValue?: DateRange | null;
  onValueChange?: (value: DateRange | undefined) => void;
}

type TriggerProps = Omit<Popover.Trigger.Props, 'children' | 'value' | 'defaultValue' | 'name' | 'handle' | 'payload' | 'openOnHover' | 'delay' | 'closeDelay'>;

export interface DatePickerBaseProps extends TriggerProps, SelectTriggerOptions {
  /** Shown while nothing is chosen. */
  placeholder?: ReactNode;
  /** How the trigger writes a date, as `Intl.DateTimeFormat` options. Default `{ dateStyle: 'medium' }`. */
  format?: Intl.DateTimeFormatOptions;
  /**
   * A BCP 47 tag for the trigger's text, or a date-fns locale (`import { de } from 'react-day-picker/locale'`),
   * which also localizes the calendar. Default `en-US`.
   */
  locale?: string | DayPickerLocale;
  /** Submits the value with a form, as `yyyy-mm-dd` (a range as `yyyy-mm-dd/yyyy-mm-dd`). */
  name?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: Popover.Root.Props['onOpenChange'];
  /** Passed to the `Calendar`: `disabled` dates, `startMonth`, `endMonth`, `numberOfMonths`, `weekStartsOn`, `size`… */
  calendarProps?: DatePickerCalendarProps;
  /** The dialog's accessible name. Default "Choose a date" (or "Choose a date range"). */
  dialogLabel?: string;
  /** Set `container` to render the popup under a themed (`.dark`) element. */
  portalProps?: Popover.Portal.Props;
  positionerProps?: Omit<Popover.Positioner.Props, 'children'>;
  /** Turns motion off. `false` cannot override `prefers-reduced-motion` or `MotionProvider`. */
  reduceMotion?: boolean;
}

export type DatePickerProps = DatePickerBaseProps & (DatePickerSingleProps | DatePickerRangeProps);

const isRange = (value: Selection | undefined): value is DateRange => Boolean(value) && !(value instanceof Date);

/**
 * A field-like button that opens a `Calendar` in a Base UI Popover. Choosing a date closes it and
 * returns focus to the button; in `mode="range"` it closes once both ends are chosen. Name it with a
 * Base UI `FieldLabel` or `aria-label`; the chosen date is part of the name. `ref` targets the button.
 */
export function DatePicker(props: DatePickerProps) {
  const {
    mode = 'single', value, defaultValue, onValueChange,
    variant, size = 'md', fullWidth, placeholder = mode === 'range' ? 'Pick a date range' : 'Pick a date',
    format, locale, name, open, defaultOpen, onOpenChange, calendarProps, dialogLabel, portalProps, positionerProps,
    reduceMotion, disabled, className, id: idProp, ref, 'aria-labelledby': labelledBy, 'aria-describedby': describedBy, ...triggerProps
  } = props as DatePickerBaseProps & {
    mode?: 'single' | 'range';
    value?: Selection | null;
    defaultValue?: Selection | null;
    onValueChange?: (value: Selection | undefined) => void;
  };
  const reduced = useReducedMotion() || reduceMotion === true;
  const play = useSound();

  const [uncontrolled, setUncontrolled] = useState<Selection | undefined>(defaultValue ?? undefined);
  const selected = value === undefined ? uncontrolled : value ?? undefined;
  const setSelected = useCallback((next: Selection | undefined) => {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  }, [value, onValueChange]);

  const tag = typeof locale === 'string' ? locale : locale?.code ?? 'en-US';
  const formatter = useMemo(() => new Intl.DateTimeFormat(tag, format ?? { dateStyle: 'medium' }), [tag, format]);
  let text: string | undefined;
  if (selected instanceof Date) text = formatter.format(selected);
  else if (selected?.from && selected.to) text = formatter.formatRange(selected.from, selected.to);
  else if (selected?.from) text = `${formatter.format(selected.from)} –`;

  let submitted: string | undefined;
  if (selected instanceof Date) submitted = toISODate(selected);
  else if (selected?.from) submitted = selected.to ? `${toISODate(selected.from)}/${toISODate(selected.to)}` : toISODate(selected.from);

  // A Base UI Field label points at the trigger and names it together with the value.
  const triggerId = useLabelableId({ id: idProp });
  const { labelId, messageIds } = useLabelableContext();
  const valueId = useId();
  const ariaLabelledBy = labelledBy
    ?? (labelId ? `${labelId} ${valueId}` : triggerProps['aria-label'] ? `${triggerId} ${valueId}` : undefined);
  const ariaDescribedBy = [describedBy, ...messageIds].filter(Boolean).join(' ') || undefined;

  const actions = useRef<Popover.Root.Actions | null>(null);
  const popup = useRef<HTMLDivElement | null>(null);
  // Focus lands on the chosen day (or today) rather than the month arrows.
  const initialFocus = useCallback(() => popup.current?.querySelector<HTMLElement>('[data-slot=calendar-day-button][tabindex="0"]') ?? true, []);

  const { className: calendarClassName, locale: calendarLocale, defaultMonth, ...calendarRest } = calendarProps ?? {};
  const first = selected instanceof Date ? selected : selected?.from;
  const shared = {
    ...calendarRest,
    locale: calendarLocale ?? (typeof locale === 'object' ? locale : undefined),
    defaultMonth: first ?? defaultMonth,
    reduceMotion: reduced,
    className: calendarClassName,
  };

  return <Popover.Root
    open={open}
    defaultOpen={defaultOpen}
    onOpenChange={(next, details) => {
      onOpenChange?.(next, details);
      // Picking a day closes through `actions.close()`; the calendar's select cue covers that.
      if (!details.isCanceled && details.reason !== 'imperative-action') play(next ? 'open' : 'close', { emphasis: 'subtle' });
    }}
    actionsRef={actions}
  >
    <Popover.Trigger
      data-slot="date-picker-trigger"
      data-size={size}
      data-placeholder={text ? undefined : ''}
      {...triggerProps}
      ref={ref}
      id={triggerId}
      disabled={disabled}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      className={stateClasses(selectTriggerClasses({ variant, size, fullWidth }, 'justify-start'), className)}
    >
      <span data-slot="date-picker-icon" data-icon="inline-start" className="pointer-events-none inline-flex shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
        <HugeiconsIcon icon={Calendar03Icon} aria-hidden="true" strokeWidth={1.8} />
      </span>
      <span id={valueId} data-slot="date-picker-value" className="min-w-0 flex-1 truncate text-start">{text ?? placeholder}</span>
    </Popover.Trigger>
    {name && <input type="hidden" name={name} value={submitted ?? ''} disabled={disabled} />}
    <Popover.Portal {...portalProps}>
      <Popover.Positioner
        data-slot="date-picker-positioner"
        align="start"
        sideOffset={6}
        collisionPadding={12}
        {...positionerProps}
        className={stateClasses('isolate z-50 outline-none', positionerProps?.className)}
      >
        <Popover.Popup
          data-slot="date-picker-content"
          ref={popup}
          initialFocus={initialFocus}
          aria-label={dialogLabel ?? (mode === 'range' ? 'Choose a date range' : 'Choose a date')}
          data-reduced-motion={reduced || undefined}
          className={cn(dropdownContentVariants({ reduceMotion: reduced }), 'w-auto p-0')}
        >
          {mode === 'range'
            ? <Calendar
              resetOnSelect
              {...shared}
              mode="range"
              selected={isRange(selected) ? selected : undefined}
              onSelect={range => {
                setSelected(range);
                if (range?.from && range.to) actions.current?.close();
              }}
            />
            : <Calendar
              {...shared}
              mode="single"
              required
              selected={selected instanceof Date ? selected : undefined}
              onSelect={date => {
                setSelected(date);
                actions.current?.close();
              }}
            />}
        </Popover.Popup>
      </Popover.Positioner>
    </Popover.Portal>
  </Popover.Root>;
}
