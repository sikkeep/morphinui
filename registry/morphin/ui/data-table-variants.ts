import { cva, type VariantProps } from 'class-variance-authority';

export const dataTableRootClasses = 'flex w-full min-w-0 flex-col gap-3';

/** The search, the caller's controls and the column menu, with the selection bar laid over them. */
export const dataTableToolbarClasses = 'grid min-h-8 items-center [&>*]:[grid-area:1/1]';

export const dataTableToolbarLayerClasses = [
  'flex min-w-0 flex-wrap items-center gap-2',
  'transition-[opacity,translate,filter] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'data-hidden:pointer-events-none data-hidden:opacity-0 data-hidden:blur-[2px]',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' ');

/** The selection bar arrives from 4 px below and leaves the same way, over the toolbar it replaces. */
export const dataTableSelectionBarClasses = [
  'flex min-w-0 items-center gap-2',
  'transition-[opacity,translate,filter] duration-250 ease-[cubic-bezier(0.22,1,0.36,1)]',
  'data-hidden:pointer-events-none data-hidden:translate-y-1 data-hidden:opacity-0 data-hidden:blur-[2px]',
  'motion-reduce:transition-none in-data-reduced-motion:transition-none',
].join(' ');

export const dataTableSelectionCountClasses = 'me-auto ps-1 text-sm font-medium text-foreground tabular-nums';

export const dataTableSearchClasses = 'w-full sm:w-64';

/**
 * `variant` is the surface: `card` a bordered card, `plain` rows straight on the page. `size` sets the
 * row height (`--row-height`), the header height and the cell padding.
 */
export const dataTableSurfaceVariants = cva('relative isolate w-full min-w-0 overflow-clip', {
  variants: {
    variant: {
      card: 'rounded-[20px] [corner-shape:var(--corner-shape)] border border-border bg-card text-card-foreground [--table-surface:var(--card)]',
      plain: '[--table-surface:var(--background)]',
    },
    size: {
      sm: '[--row-height:36px] [--head-height:36px] [--cell-x:10px]',
      md: '[--row-height:44px] [--head-height:40px] [--cell-x:12px]',
      lg: '[--row-height:52px] [--head-height:44px] [--cell-x:16px]',
    },
  },
  defaultVariants: { variant: 'card', size: 'md' },
});

export type DataTableSurfaceOptions = VariantProps<typeof dataTableSurfaceVariants>;
export type DataTableSize = NonNullable<DataTableSurfaceOptions['size']>;
export type DataTableVariant = NonNullable<DataTableSurfaceOptions['variant']>;

/** Scrolls both ways; `maxHeight` caps it and the header sticks. */
export const dataTableScrollClasses = 'w-full overflow-auto overscroll-x-contain';

export const dataTableClasses = 'w-full border-separate border-spacing-0 text-sm';

export const dataTableHeadClasses = 'sticky top-0 z-10 bg-(--table-surface)';

export const dataTableHeadCellClasses = [
  'h-(--head-height) px-(--cell-x) border-b border-border align-middle whitespace-nowrap',
  'text-start text-xs font-medium text-muted-foreground',
  'data-[align=end]:text-end data-[align=center]:text-center',
].join(' ');

/** The header of a sortable column is a button that keeps the column's alignment. */
export const dataTableSortButtonClasses = [
  'group/sort -mx-2 inline-flex h-7 max-w-[calc(100%+16px)] items-center gap-1.5 px-2',
  'rounded-[999px] [corner-shape:var(--corner-shape)] text-xs font-medium text-muted-foreground',
  'cursor-pointer select-none [-webkit-tap-highlight-color:transparent]',
  'transition-[background-color,color] duration-150 ease-out motion-reduce:transition-none in-data-reduced-motion:transition-none',
  'hover:bg-foreground/5 hover:text-foreground data-sorted:text-foreground',
  'outline-none focus-visible:outline-solid focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring',
  'data-[align=end]:flex-row-reverse',
].join(' ');

/**
 * Both icons share one cell. The unsorted one shows on hover and focus only; the arrow turns over for
 * descending and swaps with the unsorted one by scale and opacity.
 */
export const dataTableSortIconClasses = [
  'grid size-3.5 shrink-0 place-items-center [&>svg]:[grid-area:1/1] [&>svg]:size-3.5',
  '[&>svg]:transition-[opacity,scale,rotate] [&>svg]:duration-250 [&>svg]:ease-[cubic-bezier(0.22,1,0.36,1)]',
  'motion-reduce:[&>svg]:transition-none in-data-reduced-motion:[&>svg]:transition-none',
  '[&>[data-icon=unsorted]]:opacity-0 group-hover/sort:[&>[data-icon=unsorted]]:opacity-60 group-focus-visible/sort:[&>[data-icon=unsorted]]:opacity-60',
  '[&>[data-icon=sorted]]:scale-50 [&>[data-icon=sorted]]:opacity-0',
  'group-data-sorted/sort:[&>[data-icon=unsorted]]:scale-50 group-data-sorted/sort:[&>[data-icon=unsorted]]:opacity-0',
  'group-data-sorted/sort:[&>[data-icon=sorted]]:scale-100 group-data-sorted/sort:[&>[data-icon=sorted]]:opacity-100',
  'group-data-[sorted=desc]/sort:[&>[data-icon=sorted]]:rotate-180',
].join(' ');

/** The order a column takes in a multi-column sort, shown from the second column on. */
export const dataTableSortIndexClasses = 'text-2xs font-medium text-muted-foreground tabular-nums';

export const dataTableRowClasses = [
  'group/row transition-[background-color] duration-150 ease-out motion-reduce:transition-none in-data-reduced-motion:transition-none',
  // Stripes sit under `:where()`, so hover and selection (one attribute or pseudo-class each) still beat them.
  '[&:where([data-striped]:nth-child(even))]:bg-foreground/4 hover:bg-foreground/6 data-selected:bg-foreground/8 data-selected:hover:bg-foreground/10',
].join(' ');

export const dataTableCellClasses = [
  'h-(--row-height) px-(--cell-x) align-middle text-foreground',
  'border-b border-border group-last/row:border-b-0',
  'data-[align=end]:text-end data-[align=end]:tabular-nums data-[align=center]:text-center',
].join(' ');

/** The selection column: just wide enough for the box. */
export const dataTableSelectCellClasses = 'w-9 pe-0 [&>*]:align-middle';

export const dataTableEmptyClasses = 'h-40 px-(--cell-x) text-center align-middle text-sm text-muted-foreground';

export const dataTableEmptyIconClasses = 'mx-auto mb-2 size-5 text-muted-foreground';

export const dataTableFooterClasses = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-muted-foreground';

export const dataTablePagerClasses = 'flex flex-wrap items-center gap-x-4 gap-y-2';

export const dataTablePageSizeClasses = 'flex items-center gap-2 whitespace-nowrap';

export const dataTablePageClasses = 'min-w-24 text-center tabular-nums whitespace-nowrap';

export const dataTableLiveClasses = 'sr-only';
