import { cva, type VariantProps } from 'class-variance-authority';
import type { ClassNames } from 'react-day-picker';

/** The calendar's root: the day cell, the navigation row and the text size per size. */
export const calendarVariants = cva('relative w-fit p-3 text-foreground select-none', {
  variants: {
    size: {
      sm: '[--calendar-cell:32px] [--calendar-nav:28px] text-xs',
      md: '[--calendar-cell:36px] [--calendar-nav:32px] text-sm',
    },
  },
  defaultVariants: { size: 'md' },
});

export type CalendarOptions = { size?: Exclude<VariantProps<typeof calendarVariants>['size'], null> };
export type CalendarSize = NonNullable<CalendarOptions['size']>;
export const calendarSizes: CalendarSize[] = ['sm', 'md'];

/**
 * The day cell. Its state comes from react-day-picker's data attributes and the range attributes the
 * calendar adds; it hands the button its fill (`--day-fill`, 0 or 1) and text color (`--day-fg`), and
 * draws the range band as a `::before` that runs from the middle of the first day to the middle of the last.
 */
export const calendarDayClasses = [
  'relative size-(--calendar-cell) p-0 text-center',
  '[--day-fill:0] [--day-fg:var(--foreground)] [--band-start:0px] [--band-end:0px]',
  'data-today:font-medium',
  'data-outside:not-data-selected:[--day-fg:var(--muted-foreground)]',
  'data-disabled:not-data-selected:[--day-fg:var(--disabled-foreground)]',
  'data-selected:[--day-fill:1] data-selected:[--day-fg:var(--primary-foreground)]',
  'data-selected:data-range-middle:[--day-fill:0] data-selected:data-range-middle:[--day-fg:var(--accent-foreground)]',
  'data-hidden:invisible',
  "before:pointer-events-none before:absolute before:inset-y-0 before:start-(--band-start) before:end-(--band-end) before:bg-accent before:opacity-0 before:content-['']",
  'before:transition-opacity before:duration-150 before:ease-out motion-reduce:before:transition-none in-data-reduced-motion:before:transition-none',
  'data-range-start:[--band-start:50%] data-range-end:[--band-end:50%]',
  'data-range-start:before:opacity-100 data-range-middle:before:opacity-100 data-range-end:before:opacity-100',
  'first:before:rounded-s-[999px] last:before:rounded-e-[999px]',
].join(' ');

/**
 * The day button: a circle in the signature shape. The selected fill is a `::before` under the number
 * that scales in from 0.75 as it fades in; hover lights the button itself on `--accent`.
 */
export const calendarDayButtonClasses = [
  'relative isolate inline-flex size-(--calendar-cell) items-center justify-center',
  'rounded-[999px] [corner-shape:var(--corner-shape)] border-0 bg-transparent p-0',
  'leading-none tabular-nums text-(--day-fg) cursor-pointer outline-none',
  'transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none in-data-reduced-motion:transition-none',
  'hover:bg-accent focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
  'disabled:cursor-not-allowed disabled:hover:bg-transparent aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent',
  "before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:[corner-shape:inherit] before:bg-primary before:content-['']",
  'before:opacity-(--day-fill) before:scale-[calc(0.75+var(--day-fill)*0.25)]',
  'before:transition-[opacity,scale,background-color] before:duration-200 before:ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:before:transition-none in-data-reduced-motion:before:transition-none',
  'hover:before:bg-primary-hover',
  // Today: a small dot under the number, in the text color.
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-1 after:mx-auto after:size-1 after:rounded-full after:bg-current after:opacity-0 after:content-['']",
  'in-data-today:after:opacity-100',
].join(' ');

/** Class names for every react-day-picker part. Pass `classNames` to the calendar to add your own. */
export const calendarClassNames: Partial<ClassNames> = {
  root: '',
  months: 'relative flex flex-col gap-4 sm:flex-row',
  month: 'relative flex flex-col gap-3',
  nav: 'pointer-events-none absolute inset-x-0 top-0 z-10 flex h-(--calendar-nav) items-center justify-between',
  button_previous: 'pointer-events-auto',
  button_next: 'pointer-events-auto',
  chevron: '',
  month_caption: 'flex h-(--calendar-nav) items-center justify-center px-(--calendar-nav)',
  caption_label: 'inline-flex items-center gap-1 font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:text-muted-foreground',
  dropdowns: 'flex items-center justify-center gap-1.5',
  dropdown_root: [
    'relative inline-flex h-(--calendar-nav) items-center rounded-[999px] [corner-shape:var(--corner-shape)] border border-field-border bg-field px-2.5',
    'transition-[border-color] duration-150 ease-out motion-reduce:transition-none hover:border-ring/50',
    'has-focus-visible:border-ring has-focus-visible:outline-solid has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
  ].join(' '),
  dropdown: 'absolute inset-0 z-[1] w-full cursor-pointer appearance-none opacity-0 bg-popover text-popover-foreground',
  months_dropdown: '',
  years_dropdown: '',
  month_grid: 'block border-collapse',
  weekdays: 'flex',
  weekday: 'flex h-6 w-(--calendar-cell) items-center justify-center p-0 text-xs font-normal text-muted-foreground',
  week_number_header: 'flex h-6 w-(--calendar-cell) items-center justify-center p-0 text-xs font-normal text-muted-foreground',
  weeks: 'mt-1 flex flex-col gap-0.5',
  week: 'flex',
  week_number: 'flex size-(--calendar-cell) items-center justify-center p-0 text-xs font-normal tabular-nums text-muted-foreground',
  day: calendarDayClasses,
  day_button: calendarDayButtonClasses,
  footer: 'mt-3 text-xs text-muted-foreground',
  // States travel as data attributes; the cell and the button read them above.
  selected: '',
  today: '',
  outside: '',
  disabled: '',
  hidden: '',
  focused: '',
  range_start: '',
  range_middle: '',
  range_end: '',
};
