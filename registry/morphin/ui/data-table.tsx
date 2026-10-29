'use client';

import {
  useEffect, useId, useLayoutEffect, useRef, useState,
  type CSSProperties, type HTMLAttributes, type ReactNode, type RefObject,
} from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import {
  FlexRender, columnFilteringFeature, columnVisibilityFeature, createColumnHelper, createFilteredRowModel,
  createPaginatedRowModel, createSortedRowModel, filterFn_equals, filterFn_inNumberRange, filterFn_includesString,
  globalFilteringFeature, rowPaginationFeature, rowSelectionFeature, rowSortingFeature, sortFn_alphanumeric, sortFn_basic,
  sortFn_datetime, sortFn_text, tableFeatures, useTable,
  type Column, type ColumnDef, type ColumnFiltersState, type ColumnVisibilityState, type PaginationState,
  type ReactTable, type Row, type RowData, type RowSelectionState, type SortingState, type Updater,
} from '@tanstack/react-table';
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowLeftDoubleIcon, ArrowRight01Icon, ArrowRightDoubleIcon, ArrowUp02Icon, Cancel01Icon, FilterHorizontalIcon, InboxIcon, LayoutThreeColumnIcon, Search01Icon, SearchRemoveIcon, UnfoldMoreIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { soundInput, useSound } from '@/registry/morphin/lib/sound';
import { Button, IconButton } from '@/registry/morphin/ui/button';
import { Checkbox } from '@/registry/morphin/ui/checkbox';
import {
  Dropdown, DropdownCheckboxItem, DropdownContent, DropdownGroup, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger,
} from '@/registry/morphin/ui/dropdown';
import { Input } from '@/registry/morphin/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/registry/morphin/ui/select';
import { Skeleton } from '@/registry/morphin/ui/skeleton';
import {
  dataTableCellClasses, dataTableClasses, dataTableEmptyClasses, dataTableEmptyIconClasses, dataTableFooterClasses,
  dataTableHeadCellClasses, dataTableHeadClasses, dataTableLiveClasses, dataTablePageClasses, dataTablePageSizeClasses,
  dataTablePagerClasses, dataTableRootClasses, dataTableRowClasses, dataTableScrollClasses, dataTableSearchClasses,
  dataTableSelectCellClasses, dataTableSelectionBarClasses, dataTableSelectionCountClasses, dataTableSortButtonClasses,
  dataTableSortIconClasses, dataTableSortIndexClasses, dataTableSurfaceVariants, dataTableToolbarClasses,
  dataTableToolbarLayerClasses, type DataTableSize, type DataTableVariant,
} from '@/registry/morphin/ui/data-table-variants';

export { dataTableSurfaceVariants } from '@/registry/morphin/ui/data-table-variants';
export type { DataTableSize, DataTableVariant } from '@/registry/morphin/ui/data-table-variants';
export type {
  ColumnFiltersState, ColumnVisibilityState, PaginationState, RowSelectionState, SortingState,
} from '@tanstack/react-table';

const useClientLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** What a column can say about itself through `meta`. */
export interface DataTableColumnMeta {
  /** The column's name in the columns menu and announcements. Defaults to a string `header`, then the id. */
  label?: string;
  /** `end` for numbers: the cell is right-aligned with tabular figures, and so is its header. */
  align?: 'start' | 'center' | 'end';
  /** Any CSS width for the column (`120`, `'30%'`). */
  width?: number | string;
  headerClassName?: string;
  cellClassName?: string;
}

/** Keeps the rows whose value is one of the filter's values; an empty list keeps every row. */
export const filterFn_oneOf = Object.assign(
  (row: { getValue: (columnId: string) => unknown }, columnId: string, values: unknown[]) =>
    values.length === 0 || values.includes(row.getValue(columnId)),
  { autoRemove: (value: unknown) => !Array.isArray(value) || value.length === 0 },
);

/**
 * Everything a `DataTable` can do, wired once at module level. Columns name their sort and filter
 * functions by the keys here (`sortFn: 'datetime'`, `filterFn: 'oneOf'`).
 */
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, basic: sortFn_basic, datetime: sortFn_datetime, text: sortFn_text },
  filterFns: { includesString: filterFn_includesString, equals: filterFn_equals, inNumberRange: filterFn_inNumberRange, oneOf: filterFn_oneOf },
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each column keeps its own value type.
export type DataTableColumnDef<TData extends RowData> = ColumnDef<DataTableFeatures, TData, any>;
export type DataTableInstance<TData extends RowData> = ReactTable<DataTableFeatures, TData>;

/** A TanStack column helper bound to the table's features, so `meta`, `sortFn` and `filterFn` are typed. */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

/**
 * Seconds. Rows that stay glide to their new place on `move` when the order changes (a sort, a filter
 * that closes a gap); rows that arrive (a new page, data after loading) fade up `enter.y` px, one after
 * another. Rows that leave go at once, so the table never holds stale data. The move is a plain
 * ease-out cubic, not the menus' expo-out: a row crossing the table on an expo-out lands in a tenth of
 * a second and reads as a jump, then crawls.
 */
export const dataTableMotion = {
  move: { duration: 0.45, curve: '0.33,1,0.68,1' },
  enter: { duration: 0.28, y: 4, stagger: 0.02, maxStagger: 0.16 },
} as const;

gsap.registerPlugin(CustomEase);
const smoothEase = CustomEase.create('morphin-data-table', dataTableMotion.move.curve);

export interface DataTableLabels {
  search: string;
  columns: string;
  toggleColumns: string;
  rowsPerPage: string;
  page: (page: number, pages: number) => string;
  rows: (count: number) => string;
  selected: (selected: number, total: number) => string;
  selectAll: string;
  selectRow: (index: number) => string;
  clearSelection: string;
  first: string;
  previous: string;
  next: string;
  last: string;
  empty: string;
  noResults: string;
  loading: string;
  sorted: (column: string, direction: 'ascending' | 'descending') => string;
  results: (count: number) => string;
}

export const dataTableLabels: DataTableLabels = {
  search: 'Search',
  columns: 'Columns',
  toggleColumns: 'Show columns',
  rowsPerPage: 'Rows per page',
  page: (page, pages) => `Page ${page} of ${Math.max(pages, 1)}`,
  rows: count => `${count} ${count === 1 ? 'row' : 'rows'}`,
  selected: (selected, total) => `${selected} of ${total} selected`,
  selectAll: 'Select all rows on this page',
  selectRow: index => `Select row ${index}`,
  clearSelection: 'Clear selection',
  first: 'First page',
  previous: 'Previous page',
  next: 'Next page',
  last: 'Last page',
  empty: 'Nothing here yet.',
  noResults: 'No rows match.',
  loading: 'Loading rows',
  sorted: (column, direction) => `Sorted by ${column}, ${direction}`,
  results: count => `${count} ${count === 1 ? 'result' : 'results'}`,
};

/** A state slice that is controlled when its prop is set and kept here otherwise. */
function useSlice<T>(value: T | undefined, initial: T, onChange?: (value: T) => void) {
  const [inner, setInner] = useState(initial);
  const current = value === undefined ? inner : value;
  const set = (updater: Updater<T>) => {
    const next = typeof updater === 'function' ? (updater as (old: T) => T)(current) : updater;
    if (value === undefined) setInner(next);
    onChange?.(next);
  };
  return [current, set] as const;
}

function metaOf<TData extends RowData>(column: Column<DataTableFeatures, TData, unknown>) {
  return column.columnDef.meta as DataTableColumnMeta | undefined;
}

/** The name a column goes by outside its header: `meta.label`, a string `header`, or the id. */
export function columnLabel<TData extends RowData>(column: Column<DataTableFeatures, TData, unknown>) {
  const header = column.columnDef.header;
  return metaOf(column)?.label ?? (typeof header === 'string' ? header : column.id);
}

function widthStyle(width: number | string | undefined): CSSProperties | undefined {
  if (width === undefined) return undefined;
  return { width: typeof width === 'number' ? `${width}px` : width };
}

/**
 * Plays the order change. Every commit records where each row sits (`offsetTop`, which a scroll does not
 * change); when the order of row ids changes, rows that stayed start from where they were drawn (a row
 * still gliding starts from its current offset) and glide to their new place, and new rows fade up.
 * The first commit never animates, and every tween is reverted when the next one starts and on unmount.
 */
function useRowMotion(body: RefObject<HTMLTableSectionElement | null>, order: string, reduced: boolean) {
  const last = useRef<{ order: string; tops: Map<string, number> } | null>(null);
  const context = useRef<gsap.Context>(null);

  useClientLayoutEffect(() => {
    const node = body.current;
    if (!node) return;
    const rows = [...node.querySelectorAll<HTMLTableRowElement>(':scope > tr[data-row-id]')];
    const previous = last.current;
    if (previous?.order === order) return;
    const drawn = new Map<string, number>();
    if (previous) {
      for (const row of rows) {
        const id = row.dataset.rowId ?? '';
        const top = previous.tops.get(id);
        // A resting row is read without GSAP: getProperty would leave `translate: none` behind.
        if (top !== undefined) drawn.set(id, top + (gsap.getTweensOf(row).length > 0 ? Number(gsap.getProperty(row, 'y')) : 0));
      }
    }
    context.current?.revert();
    context.current = null;
    last.current = { order, tops: new Map(rows.map(row => [row.dataset.rowId ?? '', row.offsetTop])) };
    if (!previous || reduced) return;

    const { move, enter } = dataTableMotion;
    const reach = node.closest<HTMLElement>('[data-slot=data-table-scroll]')?.clientHeight || Infinity;
    context.current = gsap.context(() => {
      let entered = 0;
      for (const row of rows) {
        const id = row.dataset.rowId ?? '';
        const from = drawn.get(id);
        if (from === undefined) {
          const delay = Math.min(entered * enter.stagger, enter.maxStagger);
          entered += 1;
          gsap.fromTo(row, { opacity: 0, y: enter.y }, { opacity: 1, y: 0, duration: enter.duration, delay, ease: smoothEase, clearProps: 'opacity,transform,translate' });
          continue;
        }
        // A row from far away enters from just past the visible edge instead of crossing the whole table.
        const offset = Math.min(Math.max(from - row.offsetTop, -reach), reach);
        if (Math.abs(offset) < 0.5) continue;
        gsap.fromTo(row, { y: offset }, { y: 0, duration: move.duration, ease: smoothEase, clearProps: 'transform,translate' });
      }
    }, node);
  });

  useEffect(() => () => {
    context.current?.revert();
    context.current = null;
  }, []);
}

export interface DataTablePaginationOptions {
  /** Rows on a page. Default 10. */
  pageSize?: number;
  /** The choices of the rows-per-page select. Default `[10, 20, 50]`; an empty list hides the select. */
  pageSizes?: number[];
}

export interface DataTableProps<TData extends RowData> extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  data: TData[];
  columns: DataTableColumnDef<TData>[];
  /** A stable id for each row. Selection and the order animation follow it; defaults to the row's index. */
  getRowId?: (row: TData, index: number) => string;
  /** The table's accessible name. */
  label: string;
  /** `card` (a bordered surface, the default) or `plain` (rows on the page). */
  variant?: DataTableVariant;
  /** Row height: `sm` 36, `md` 44 (default) or `lg` 52 px. */
  size?: DataTableSize;
  /** Shades every other row. */
  striped?: boolean;
  /** Caps the height (pixels or any CSS length); the body scrolls under a sticky header. */
  maxHeight?: number | string;
  /** A search field that filters every column that holds text or numbers. A string sets its placeholder. */
  search?: boolean | string;
  /** Adds a checkbox column. Shift-click selects a range. */
  selectable?: boolean;
  /** Disables every checkbox, for a moment the selection must not change (rows are being replaced). */
  selectionDisabled?: boolean;
  /** The accessible name of a row's checkbox. Defaults to "Select row N". */
  rowLabel?: (row: TData, index: number) => string;
  /** Actions for the selected rows. While rows are selected they replace the toolbar. */
  selectionActions?: (selected: TData[], clear: () => void) => ReactNode;
  /** A menu that shows and hides columns (those with `enableHiding: false` stay). */
  columnsMenu?: boolean;
  /** Your own controls, after the search. A function receives the table (for `DataTableFacetFilter`). */
  toolbar?: ReactNode | ((table: DataTableInstance<TData>) => ReactNode);
  /** Splits the rows into pages. `true` uses the defaults. */
  pagination?: boolean | DataTablePaginationOptions;
  /** Shows skeleton rows and marks the table busy. */
  loading?: boolean;
  /** Shown when there is no data. */
  empty?: ReactNode;
  /** Shown when the search or the filters leave no rows. */
  noResults?: ReactNode;
  /**
   * Server mode: sorting, filtering and pagination are yours. The table only reports the state (through
   * the `on…Change` callbacks); pass the current page as `data` and the total as `rowCount`.
   */
  manual?: { rowCount: number };
  sorting?: SortingState;
  defaultSorting?: SortingState;
  onSortingChange?: (sorting: SortingState) => void;
  globalFilter?: string;
  onGlobalFilterChange?: (filter: string) => void;
  columnFilters?: ColumnFiltersState;
  defaultColumnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  rowSelection?: RowSelectionState;
  onRowSelectionChange?: (selection: RowSelectionState) => void;
  columnVisibility?: ColumnVisibilityState;
  defaultColumnVisibility?: ColumnVisibilityState;
  onColumnVisibilityChange?: (visibility: ColumnVisibilityState) => void;
  paginationState?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  /** Words the table says, for translation. */
  labels?: Partial<DataTableLabels>;
  /** Turns the row motion and the transitions off. `false` cannot override `prefers-reduced-motion`. */
  reduceMotion?: boolean;
  tableClassName?: string;
}

/**
 * A data table on TanStack Table: sortable headers (Shift adds a column), search, column filters,
 * selection with bulk actions, a columns menu and pagination, client-side or on your server. Rows glide
 * to their new place when the order changes.
 */
export function DataTable<TData extends RowData>({
  data, columns, getRowId, label, variant = 'card', size = 'md', striped = false, maxHeight,
  search, selectable = false, selectionDisabled = false, rowLabel, selectionActions, columnsMenu = false, toolbar, pagination, loading = false,
  empty, noResults, manual,
  sorting: sortingProp, defaultSorting = [], onSortingChange,
  globalFilter: globalFilterProp, onGlobalFilterChange,
  columnFilters: columnFiltersProp, defaultColumnFilters = [], onColumnFiltersChange,
  rowSelection: rowSelectionProp, onRowSelectionChange,
  columnVisibility: columnVisibilityProp, defaultColumnVisibility = {}, onColumnVisibilityChange,
  paginationState: paginationProp, onPaginationChange,
  labels: labelsProp, reduceMotion, tableClassName, className, ...props
}: DataTableProps<TData>) {
  const words = { ...dataTableLabels, ...labelsProp };
  const reduced = useReducedMotion() || reduceMotion === true;
  const play = useSound();
  const id = useId();
  const paged = Boolean(pagination);
  const pageOptions = typeof pagination === 'object' ? pagination : {};
  const pageSizes = pageOptions.pageSizes ?? [10, 20, 50];

  const [sorting, setSorting] = useSlice(sortingProp, defaultSorting, onSortingChange);
  const [globalFilter, setGlobalFilter] = useSlice(globalFilterProp, '', onGlobalFilterChange);
  const [columnFilters, setColumnFilters] = useSlice(columnFiltersProp, defaultColumnFilters, onColumnFiltersChange);
  const [rowSelection, setRowSelection] = useSlice(rowSelectionProp, {}, onRowSelectionChange);
  const [columnVisibility, setColumnVisibility] = useSlice(columnVisibilityProp, defaultColumnVisibility, onColumnVisibilityChange);
  const [page, setPage] = useSlice(paginationProp, { pageIndex: 0, pageSize: pageOptions.pageSize ?? 10 }, onPaginationChange);

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data,
    getRowId,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      rowSelection,
      columnVisibility,
      // Without pagination one page holds every row.
      pagination: paged ? page : { pageIndex: 0, pageSize: Number.MAX_SAFE_INTEGER },
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: paged ? setPage : undefined,
    globalFilterFn: 'includesString',
    enableRowSelection: selectable,
    manualSorting: Boolean(manual),
    manualFiltering: Boolean(manual),
    manualPagination: Boolean(manual),
    rowCount: manual?.rowCount,
    autoResetPageIndex: !manual,
  });

  const rows = table.getRowModel().rows;
  const body = useRef<HTMLTableSectionElement>(null);
  useRowMotion(body, loading ? '' : rows.map(row => row.id).join('\n'), reduced);
  // The row a Shift-click extends from: set by clicks, read by clicks.
  const anchor = useRef<string | null>(null);

  const visibleColumns = table.getVisibleLeafColumns();
  const span = visibleColumns.length + (selectable ? 1 : 0);
  const total = manual ? manual.rowCount : table.getFilteredRowModel().rows.length;
  const selectedRows = selectable ? table.getSelectedRowModel().rows : [];
  const selectedCount = Object.keys(rowSelection).filter(key => rowSelection[key]).length;
  const filtered = globalFilter !== '' || columnFilters.length > 0;
  const pageCount = table.getPageCount();
  const allOnPage = rows.length > 0 && table.getIsAllPageRowsSelected();
  const someOnPage = table.getIsSomePageRowsSelected();
  const clear = () => table.resetRowSelection(true);
  const showBar = Boolean(selectionActions) && selectedCount > 0;
  const toolbarContent = typeof toolbar === 'function' ? toolbar(table) : toolbar;
  const hasToolbar = Boolean(search || toolbarContent || columnsMenu || selectionActions);

  const selectRow = (row: Row<DataTableFeatures, TData>, checked: boolean, shift: boolean) => {
    const from = anchor.current;
    anchor.current = row.id;
    if (!shift || from === null || from === row.id) {
      row.toggleSelected(checked);
      return;
    }
    const ids = rows.map(item => item.id);
    const start = ids.indexOf(from);
    const end = ids.indexOf(row.id);
    if (start < 0) {
      row.toggleSelected(checked);
      return;
    }
    const range = ids.slice(Math.min(start, end), Math.max(start, end) + 1);
    table.setRowSelection(old => {
      const next = { ...old };
      for (const key of range) {
        if (checked) next[key] = true;
        else delete next[key];
      }
      return next;
    });
  };

  const sortedColumn = sorting[0] ? table.getColumn(sorting[0].id) : undefined;
  const announcement = sortedColumn
    ? words.sorted(columnLabel(sortedColumn), sorting[0].desc ? 'descending' : 'ascending')
    : '';
  const live = [announcement, filtered && !loading ? words.results(total) : ''].filter(Boolean).join('. ');

  return <div data-slot="data-table" data-reduced-motion={reduced || undefined} {...props} className={cn(dataTableRootClasses, className)}>
    {hasToolbar && <div data-slot="data-table-toolbar" className={dataTableToolbarClasses}>
      <div data-slot="data-table-controls" data-hidden={showBar || undefined} inert={showBar || undefined} className={dataTableToolbarLayerClasses}>
        {search && <Input
          type="search"
          size="sm"
          aria-label={words.search}
          placeholder={typeof search === 'string' ? search : `${words.search}…`}
          leadingIcon={<HugeiconsIcon icon={Search01Icon} aria-hidden="true" className="size-4" strokeWidth={1.8} />}
          value={globalFilter}
          onChange={event => setGlobalFilter(event.target.value)}
          className={dataTableSearchClasses}
        />}
        {toolbarContent}
        {columnsMenu && <Dropdown>
          <DropdownTrigger render={<Button variant="outline" size="sm" leadingIcon={<HugeiconsIcon icon={LayoutThreeColumnIcon} aria-hidden="true" strokeWidth={1.8} />} />} className="ms-auto">
            {words.columns}
          </DropdownTrigger>
          <DropdownContent width={208}>
            <DropdownGroup>
              <DropdownLabel>{words.toggleColumns}</DropdownLabel>
              {table.getAllLeafColumns().filter(column => column.getCanHide()).map(column => <DropdownCheckboxItem
                key={column.id}
                checked={column.getIsVisible()}
                onCheckedChange={checked => column.toggleVisibility(checked)}
              >{columnLabel(column)}</DropdownCheckboxItem>)}
            </DropdownGroup>
          </DropdownContent>
        </Dropdown>}
      </div>
      {selectionActions && <div
        data-slot="data-table-selection-bar"
        data-hidden={!showBar || undefined}
        inert={!showBar || undefined}
        className={dataTableSelectionBarClasses}
      >
        <IconButton label={words.clearSelection} variant="ghost" size="sm" onClick={clear}><HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" strokeWidth={1.8} /></IconButton>
        <span className={dataTableSelectionCountClasses}>{words.selected(selectedCount, total)}</span>
        {selectionActions(selectedRows.map(row => row.original), clear)}
      </div>}
    </div>}

    <div data-slot="data-table-surface" data-size={size} className={dataTableSurfaceVariants({ variant, size })}>
      <div
        data-slot="data-table-scroll"
        className={dataTableScrollClasses}
        style={maxHeight === undefined ? undefined : { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight }}
      >
        <table
          data-slot="data-table-table"
          aria-label={label}
          aria-busy={loading || undefined}
          aria-rowcount={manual ? manual.rowCount + 1 : undefined}
          className={cn(dataTableClasses, tableClassName)}
        >
          <thead data-slot="data-table-head" className={dataTableHeadClasses}>
            {table.getHeaderGroups().map(group => <tr key={group.id}>
              {selectable && <th scope="col" className={cn(dataTableHeadCellClasses, dataTableSelectCellClasses)}>
                <Checkbox
                  size="sm"
                  aria-label={words.selectAll}
                  checked={allOnPage}
                  indeterminate={someOnPage && !allOnPage}
                  disabled={loading || selectionDisabled || rows.length === 0}
                  onCheckedChange={checked => table.toggleAllPageRowsSelected(checked)}
                />
              </th>}
              {group.headers.map(header => {
                const column = header.column;
                const meta = metaOf(column);
                const sortable = column.getCanSort();
                const sorted = column.getIsSorted();
                const index = sorting.length > 1 && sorted ? column.getSortIndex() + 1 : 0;
                const content = header.isPlaceholder ? null : <FlexRender header={header} />;
                return <th
                  key={header.id}
                  scope="col"
                  colSpan={header.colSpan > 1 ? header.colSpan : undefined}
                  data-align={meta?.align}
                  aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
                  style={widthStyle(meta?.width)}
                  className={cn(dataTableHeadCellClasses, meta?.headerClassName)}
                >
                  {sortable && !header.isPlaceholder ? <BaseButton
                    data-slot="data-table-sort"
                    data-sorted={sorted || undefined}
                    data-align={meta?.align}
                    className={dataTableSortButtonClasses}
                    onClick={event => {
                      column.getToggleSortingHandler()?.(event);
                      play('tap', { input: soundInput(event), emphasis: 'subtle' });
                    }}
                  >
                    <span className="truncate">{content}</span>
                    <span data-slot="data-table-sort-icon" className={dataTableSortIconClasses} aria-hidden="true">
                      <HugeiconsIcon icon={UnfoldMoreIcon} aria-hidden="true" data-icon="unsorted" strokeWidth={1.8} />
                      <HugeiconsIcon icon={ArrowUp02Icon} aria-hidden="true" data-icon="sorted" strokeWidth={1.8} />
                    </span>
                    {index > 0 && <span className={dataTableSortIndexClasses} aria-hidden="true">{index}</span>}
                  </BaseButton> : content}
                </th>;
              })}
            </tr>)}
          </thead>
          <tbody ref={body} data-slot="data-table-body">
            {loading ? Array.from({ length: Math.min(paged ? page.pageSize : 6, 8) }, (_, rowIndex) => <tr
              key={`skeleton-${rowIndex}`}
              data-slot="data-table-skeleton-row"
              aria-hidden="true"
              className={dataTableRowClasses}
            >
              {selectable && <td className={cn(dataTableCellClasses, dataTableSelectCellClasses)} />}
              {visibleColumns.map((column, columnIndex) => <td key={column.id} data-align={metaOf(column)?.align} className={dataTableCellClasses}>
                <Skeleton lines={1} widths={[`${50 + ((rowIndex * 7 + columnIndex * 13) % 4) * 12}%`]} seed={rowIndex * 31 + columnIndex} className="block w-full" />
              </td>)}
            </tr>) : rows.length === 0 ? <tr data-slot="data-table-empty">
              <td colSpan={span} className={dataTableEmptyClasses}>
                {filtered
                  ? noResults ?? <><HugeiconsIcon icon={SearchRemoveIcon} className={dataTableEmptyIconClasses} strokeWidth={1.6} aria-hidden="true" />{words.noResults}</>
                  : empty ?? <><HugeiconsIcon icon={InboxIcon} className={dataTableEmptyIconClasses} strokeWidth={1.6} aria-hidden="true" />{words.empty}</>}
              </td>
            </tr> : rows.map((row, rowIndex) => {
              const selected = row.getIsSelected();
              const position = page.pageIndex * page.pageSize + rowIndex + 1;
              return <tr
                key={row.id}
                data-row-id={row.id}
                data-slot="data-table-row"
                data-selected={selected || undefined}
                data-striped={striped || undefined}
                aria-rowindex={manual ? position + 1 : undefined}
                className={dataTableRowClasses}
              >
                {selectable && <td className={cn(dataTableCellClasses, dataTableSelectCellClasses)}>
                  <Checkbox
                    size="sm"
                    aria-label={rowLabel ? rowLabel(row.original, position) : words.selectRow(position)}
                    checked={selected}
                    disabled={selectionDisabled || !row.getCanSelect()}
                    onCheckedChange={(checked, details) => {
                      const event = details.event as { shiftKey?: boolean } | undefined;
                      selectRow(row, checked, Boolean(event?.shiftKey));
                    }}
                  />
                </td>}
                {row.getVisibleCells().map(cell => {
                  const meta = metaOf(cell.column);
                  return <td
                    key={cell.id}
                    data-align={meta?.align}
                    className={cn(dataTableCellClasses, meta?.cellClassName)}
                  ><FlexRender cell={cell} /></td>;
                })}
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>

    {(paged || selectable) && <div data-slot="data-table-footer" className={dataTableFooterClasses}>
      <span className="tabular-nums">{selectable ? words.selected(selectedCount, total) : words.rows(total)}</span>
      {paged && <div data-slot="data-table-pagination" className={dataTablePagerClasses}>
        {pageSizes.length > 0 && <div className={dataTablePageSizeClasses}>
          <span id={`${id}-page-size`}>{words.rowsPerPage}</span>
          <Select<number> value={page.pageSize} onValueChange={value => value !== null && table.setPageSize(value)}>
            <SelectTrigger size="sm" aria-labelledby={`${id}-page-size`} className="w-18" />
            <SelectContent>{pageSizes.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
          </Select>
        </div>}
        <span className={dataTablePageClasses}>{words.page(page.pageIndex + 1, pageCount)}</span>
        <div className="flex items-center gap-1">
          <IconButton label={words.first} variant="ghost" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.firstPage()} className="max-sm:hidden"><HugeiconsIcon icon={ArrowLeftDoubleIcon} aria-hidden="true" strokeWidth={1.8} /></IconButton>
          <IconButton label={words.previous} variant="outline" size="sm" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><HugeiconsIcon icon={ArrowLeft01Icon} aria-hidden="true" strokeWidth={1.8} /></IconButton>
          <IconButton label={words.next} variant="outline" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" strokeWidth={1.8} /></IconButton>
          <IconButton label={words.last} variant="ghost" size="sm" disabled={!table.getCanNextPage()} onClick={() => table.lastPage()} className="max-sm:hidden"><HugeiconsIcon icon={ArrowRightDoubleIcon} aria-hidden="true" strokeWidth={1.8} /></IconButton>
        </div>
      </div>}
    </div>}

    <div role="status" aria-live="polite" className={dataTableLiveClasses}>{loading ? words.loading : live}</div>
  </div>;
}

export interface DataTableFacetOption {
  value: string;
  label: ReactNode;
  icon?: ReactNode;
}

export interface DataTableFacetFilterProps<TData extends RowData> {
  table: DataTableInstance<TData>;
  /** The column to filter. Give it `filterFn: 'oneOf'`. */
  column: string;
  title: string;
  options: DataTableFacetOption[];
  /** Label of the item that clears the filter. */
  clearLabel?: string;
}

/**
 * A toolbar menu that keeps the rows whose `column` holds one of the checked values, with each value's
 * count among the rows the other filters leave.
 */
export function DataTableFacetFilter<TData extends RowData>({
  table, column: columnId, title, options, clearLabel = 'Clear filter',
}: DataTableFacetFilterProps<TData>) {
  const column = table.getColumn(columnId);
  if (!column) return null;
  const chosen = (column.getFilterValue() as string[] | undefined) ?? [];
  const counts = new Map<unknown, number>();
  for (const row of table.getPreFilteredRowModel().rows) {
    const value = row.getValue(columnId);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const toggle = (value: string, checked: boolean) => {
    const next = checked ? [...chosen, value] : chosen.filter(item => item !== value);
    column.setFilterValue(next.length > 0 ? next : undefined);
  };
  return <Dropdown>
    <DropdownTrigger
      data-slot="data-table-facet"
      data-active={chosen.length > 0 || undefined}
      render={<Button variant="outline" size="sm" leadingIcon={<HugeiconsIcon icon={FilterHorizontalIcon} aria-hidden="true" strokeWidth={1.8} />} />}
    >
      {chosen.length > 0 ? `${title} · ${chosen.length}` : title}
    </DropdownTrigger>
    <DropdownContent align="start" width={220}>
      <DropdownGroup>
        <DropdownLabel>{title}</DropdownLabel>
        {options.map(option => <DropdownCheckboxItem
          key={option.value}
          leadingIcon={option.icon}
          checked={chosen.includes(option.value)}
          onCheckedChange={checked => toggle(option.value, checked)}
        >
          {/* The row takes the free space itself: a second auto margin would split it with the check's. */}
          <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
            <span className="truncate">{option.label}</span>
            <span data-slot="data-table-facet-count" className="text-xs text-muted-foreground tabular-nums">{counts.get(option.value) ?? 0}</span>
          </span>
        </DropdownCheckboxItem>)}
      </DropdownGroup>
      {chosen.length > 0 && <>
        <DropdownSeparator />
        <DropdownItem onClick={() => column.setFilterValue(undefined)}>{clearLabel}</DropdownItem>
      </>}
    </DropdownContent>
  </Dropdown>;
}
