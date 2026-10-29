import { useState } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import {
  DataTable, DataTableFacetFilter, createDataTableColumnHelper, type DataTableProps, type SortingState,
} from '@/registry/morphin/ui/data-table';
import { MotionProvider } from '@/registry/morphin/lib/motion';

type Person = { id: string; name: string; role: string; status: 'active' | 'inactive' | 'invited'; commits: number };

const people: Person[] = [
  { id: 'p1', name: 'Mira', role: 'Design', status: 'active', commits: 42 },
  { id: 'p2', name: 'Oskar', role: 'Engineering', status: 'inactive', commits: 7 },
  { id: 'p3', name: 'Lena', role: 'Engineering', status: 'active', commits: 128 },
  { id: 'p4', name: 'Theo', role: 'Research', status: 'invited', commits: 0 },
];

const helper = createDataTableColumnHelper<Person>();
const columns = helper.columns([
  helper.accessor('name', { header: 'Name' }),
  helper.accessor('role', { header: 'Role' }),
  helper.accessor('status', { header: 'Status', filterFn: 'oneOf', enableSorting: false }),
  helper.accessor('commits', { header: 'Commits', meta: { align: 'end' } }),
]);

const rowId = (row: Person) => row.id;

function Table(props: Partial<DataTableProps<Person>>) {
  return <DataTable label="Team" data={people} columns={columns} getRowId={rowId} {...props} />;
}

const names = () => screen.getAllByRole('row').slice(1).map(row => within(row).queryAllByRole('cell')[0]?.textContent);
const header = (name: string) => screen.getByRole('columnheader', { name: new RegExp(name) });

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
});

afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('DataTable', () => {
  it('renders a named table with column headers and one row per item', () => {
    render(<Table />);
    expect(screen.getByRole('table', { name: 'Team' })).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Name', 'Role', 'Status', 'Commits']);
    expect(names()).toEqual(['Mira', 'Oskar', 'Lena', 'Theo']);
    expect(screen.getByText('128').closest('td')).toHaveAttribute('data-align', 'end');
  });

  it('sorts from a header button, sets aria-sort and turns the order over on a second click', async () => {
    const user = userEvent.setup();
    render(<Table />);
    const sort = within(header('Commits')).getByRole('button', { name: 'Commits' });
    expect(header('Commits')).not.toHaveAttribute('aria-sort');
    expect(within(header('Status')).queryByRole('button')).toBeNull();

    // Numbers start descending (TanStack's default for them); a second click turns the order over.
    await user.click(sort);
    expect(header('Commits')).toHaveAttribute('aria-sort', 'descending');
    expect(sort).toHaveAttribute('data-sorted', 'desc');
    expect(names()).toEqual(['Lena', 'Mira', 'Oskar', 'Theo']);
    await user.click(sort);
    expect(header('Commits')).toHaveAttribute('aria-sort', 'ascending');
    expect(names()).toEqual(['Theo', 'Oskar', 'Mira', 'Lena']);
    expect(screen.getByRole('status')).toHaveTextContent('Sorted by Commits, ascending');
  });

  it('adds a second sort column with Shift and numbers the columns', async () => {
    const user = userEvent.setup();
    render(<Table />);
    await user.click(within(header('Role')).getByRole('button'));
    await user.keyboard('{Shift>}');
    await user.click(within(header('Name')).getByRole('button'));
    await user.keyboard('{/Shift}');
    expect(names()).toEqual(['Mira', 'Lena', 'Oskar', 'Theo']);
    expect(within(header('Name')).getByText('2')).toBeInTheDocument();
  });

  it('reports sorting to a controlled owner and follows its state', async () => {
    const user = userEvent.setup();
    const changes: SortingState[] = [];
    function Controlled() {
      const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }]);
      return <Table sorting={sorting} onSortingChange={next => {
        changes.push(next);
        setSorting(next);
      }} />;
    }
    render(<Controlled />);
    expect(names()).toEqual(['Lena', 'Mira', 'Oskar', 'Theo']);
    await user.click(within(header('Name')).getByRole('button'));
    expect(changes.at(-1)).toEqual([{ id: 'name', desc: true }]);
    expect(names()).toEqual(['Theo', 'Oskar', 'Mira', 'Lena']);
  });

  it('searches every text column and shows the no-results state', async () => {
    const user = userEvent.setup();
    render(<Table search />);
    const field = screen.getByRole('searchbox', { name: 'Search' });
    await user.type(field, 'engin');
    expect(names()).toEqual(['Oskar', 'Lena']);
    expect(screen.getByRole('status')).toHaveTextContent('2 results');
    await user.clear(field);
    await user.type(field, 'nobody');
    expect(screen.getByText('No rows match.')).toBeInTheDocument();
  });

  it('shows the empty state when there is no data', () => {
    render(<Table data={[]} empty="No teammates yet." />);
    expect(screen.getByText('No teammates yet.').closest('td')).toHaveAttribute('colspan', '4');
  });

  it('filters a column with the facet menu and counts each value', async () => {
    const user = userEvent.setup();
    render(<Table toolbar={table => <DataTableFacetFilter table={table} column="status" title="Status" options={[
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
      { value: 'invited', label: 'Invited' },
    ]} />} />);
    await user.click(screen.getByRole('button', { name: 'Status' }));
    const active = await screen.findByRole('menuitemcheckbox', { name: /Active/ });
    expect(active).toHaveTextContent('2');
    // "active" must not match "inactive": the filter compares whole values.
    await user.click(active);
    expect(names()).toEqual(['Mira', 'Lena']);
    expect(screen.getByRole('button', { name: 'Status · 1' })).toBeInTheDocument();
  });

  it('pages through rows and changes the page size', async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 25 }, (_, index) => ({ ...people[index % 4], id: `r${index}`, name: `Person ${index + 1}` }));
    render(<Table data={many} pagination={{ pageSize: 10 }} />);
    expect(names()).toHaveLength(10);
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(names()[0]).toBe('Person 11');
    await user.click(screen.getByRole('button', { name: 'Last page' }));
    expect(names()).toEqual(['Person 21', 'Person 22', 'Person 23', 'Person 24', 'Person 25']);
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
    expect(screen.getByText('25 rows')).toBeInTheDocument();
  });

  it('selects rows, a page at once and a range with Shift', async () => {
    const user = userEvent.setup();
    const onRowSelectionChange = vi.fn();
    render(<Table selectable onRowSelectionChange={onRowSelectionChange} rowLabel={person => `Select ${person.name}`} />);
    const all = screen.getByRole('checkbox', { name: 'Select all rows on this page' });
    await user.click(screen.getByRole('checkbox', { name: 'Select Mira' }));
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ p1: true });
    expect(all).toHaveAttribute('aria-checked', 'mixed');
    expect(screen.getByText('Mira').closest('tr')).toHaveAttribute('data-selected');

    await user.keyboard('{Shift>}');
    await user.click(screen.getByRole('checkbox', { name: 'Select Lena' }));
    await user.keyboard('{/Shift}');
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({ p1: true, p2: true, p3: true });
    expect(screen.getByText('3 of 4 selected')).toBeInTheDocument();

    await user.click(all);
    expect(all).toHaveAttribute('aria-checked', 'true');
    await user.click(all);
    expect(onRowSelectionChange).toHaveBeenLastCalledWith({});
  });

  it('disables every checkbox while the selection is frozen', () => {
    render(<Table selectable selectionDisabled />);
    for (const box of screen.getAllByRole('checkbox')) expect(box).toHaveAttribute('aria-disabled', 'true');
  });

  it('swaps the toolbar for the selection actions while rows are selected', async () => {
    const user = userEvent.setup();
    const archive = vi.fn();
    render(<Table selectable search selectionActions={(selected, clear) => <button type="button" onClick={() => {
      archive(selected.map(person => person.name));
      clear();
    }}>Archive</button>} />);
    const controls = document.querySelector('[data-slot=data-table-controls]');
    const bar = document.querySelector('[data-slot=data-table-selection-bar]');
    expect(bar).toHaveAttribute('inert');
    await user.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
    expect(controls).toHaveAttribute('inert');
    expect(bar).not.toHaveAttribute('inert');
    await user.click(screen.getByRole('button', { name: 'Archive' }));
    expect(archive).toHaveBeenCalledWith(['Oskar']);
    expect(bar).toHaveAttribute('inert');
  });

  it('hides and shows columns from the columns menu', async () => {
    const user = userEvent.setup();
    render(<Table columnsMenu />);
    await user.click(screen.getByRole('button', { name: 'Columns' }));
    await user.click(await screen.findByRole('menuitemcheckbox', { name: 'Role' }));
    expect(screen.getAllByRole('columnheader').map(cell => cell.textContent)).toEqual(['Name', 'Status', 'Commits']);
  });

  it('shows skeleton rows and marks the table busy while loading', () => {
    // jsdom has no canvas for the skeleton's sweep.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    render(<Table loading pagination={{ pageSize: 5 }} />);
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true');
    expect(document.querySelectorAll('[data-slot=data-table-skeleton-row]')).toHaveLength(5);
    expect(screen.getByRole('status')).toHaveTextContent('Loading rows');
  });

  it('leaves sorting and paging to the server in manual mode', async () => {
    const user = userEvent.setup();
    const onSortingChange = vi.fn();
    const onPaginationChange = vi.fn();
    render(<Table manual={{ rowCount: 40 }} pagination={{ pageSize: 4, pageSizes: [] }}
      onSortingChange={onSortingChange} onPaginationChange={onPaginationChange} />);
    expect(screen.getByText('Page 1 of 10')).toBeInTheDocument();
    await user.click(within(header('Name')).getByRole('button'));
    expect(onSortingChange).toHaveBeenLastCalledWith([{ id: 'name', desc: false }]);
    // The data is the server's page: the table does not reorder it.
    expect(names()).toEqual(['Mira', 'Oskar', 'Lena', 'Theo']);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPaginationChange).toHaveBeenLastCalledWith({ pageIndex: 1, pageSize: 4 });
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '41');
  });
});

describe('DataTable motion', () => {
  function rowTops() {
    // jsdom has no layout: a row sits at its index × 44 px.
    vi.spyOn(HTMLElement.prototype, 'offsetTop', 'get').mockImplementation(function (this: HTMLElement) {
      if (this.tagName !== 'TR') return 0;
      return [...(this.parentElement?.children ?? [])].indexOf(this) * 44;
    });
  }

  it('glides rows that stay from their old place and never animates the first render', async () => {
    rowTops();
    const fromTo = vi.spyOn(gsap, 'fromTo');
    const user = userEvent.setup();
    render(<Table />);
    expect(fromTo).not.toHaveBeenCalled();
    await user.click(within(header('Commits')).getByRole('button'));
    // Descending commits: Lena moves up two rows, Mira down one, Oskar down one, Theo stays.
    const moves = new Map(fromTo.mock.calls.map(([target, from]) => [(target as HTMLElement).textContent?.slice(0, 4), (from as unknown as { y: number }).y]));
    expect(moves.get('Lena')).toBe(88);
    expect(moves.get('Mira')).toBe(-44);
    expect(moves.has('Theo')).toBe(false);
  });

  it('fades new rows in and plays nothing under reduced motion', async () => {
    rowTops();
    const fromTo = vi.spyOn(gsap, 'fromTo');
    const many = Array.from({ length: 6 }, (_, index) => ({ ...people[index % 4], id: `r${index}`, name: `Person ${index + 1}` }));
    const user = userEvent.setup();
    const { unmount } = render(<Table data={many} pagination={{ pageSize: 3 }} />);
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(fromTo).toHaveBeenCalledTimes(3);
    expect(fromTo.mock.calls[0][1]).toMatchObject({ opacity: 0 });
    unmount();

    fromTo.mockClear();
    render(<MotionProvider reducedMotion="always"><Table /></MotionProvider>);
    await user.click(within(header('Commits')).getByRole('button'));
    expect(fromTo).not.toHaveBeenCalled();
  });

  it('starts an interrupted glide from where the row is drawn', async () => {
    rowTops();
    const user = userEvent.setup();
    render(<Table />);
    const sort = within(header('Commits')).getByRole('button');
    await user.click(sort);
    const lena = screen.getByText('Lena').closest('tr') as HTMLElement;
    const glide = gsap.getTweensOf(lena)[0];
    glide.pause().progress(0.5);
    const drawn = Number(gsap.getProperty(lena, 'y'));
    const fromTo = vi.spyOn(gsap, 'fromTo');
    await act(async () => {
      sort.click();
    });
    // Lena was drawn at row 0 + drawn; ascending puts her last (row 3).
    const call = fromTo.mock.calls.find(([target]) => target === lena);
    expect((call?.[1] as unknown as { y: number }).y).toBeCloseTo(drawn - 132);
    await waitFor(() => expect(gsap.getTweensOf(lena)).toHaveLength(1));
  });
});
