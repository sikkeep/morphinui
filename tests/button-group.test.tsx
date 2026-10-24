import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ButtonGroup, ButtonGroupItem } from '@/registry/morphin/ui/button-group';

describe('ButtonGroup', () => {
  it('is a named group of buttons and shares its size with every item', () => {
    render(<ButtonGroup aria-label="Range" size="sm">
      <ButtonGroupItem>Day</ButtonGroupItem><ButtonGroupItem>Week</ButtonGroupItem><ButtonGroupItem>Month</ButtonGroupItem>
    </ButtonGroup>);
    const group = screen.getByRole('group', { name: 'Range' });
    expect(group).toHaveAttribute('data-slot', 'button-group');
    const items = screen.getAllByRole('button');
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item).toHaveAttribute('data-size', 'sm');
      expect(item).toHaveAttribute('data-variant', 'outline');
      // Only the outer corners are round, and neighbors overlap by one border.
      expect(item).toHaveClass('rounded-none', 'first:rounded-s-[999px]', 'last:rounded-e-[999px]', '-ms-px', 'first:ms-0');
    }
  });

  it('marks the selected item with aria-pressed and leaves the rest unmarked', async () => {
    const user = userEvent.setup();
    function Views() {
      const [view, setView] = useState('list');
      return <ButtonGroup aria-label="View">
        {['list', 'grid', 'table'].map(id => <ButtonGroupItem key={id} selected={view === id} onClick={() => setView(id)}>{id}</ButtonGroupItem>)}
      </ButtonGroup>;
    }
    render(<Views />);
    expect(screen.getByRole('button', { name: 'list' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'list' })).toHaveClass('bg-accent');
    expect(screen.getByRole('button', { name: 'grid' })).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button', { name: 'grid' }));
    expect(screen.getByRole('button', { name: 'grid' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'list' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not announce a pressed state for plain action items', () => {
    render(<ButtonGroup aria-label="Actions"><ButtonGroupItem>Copy</ButtonGroupItem></ButtonGroup>);
    expect(screen.getByRole('button', { name: 'Copy' })).not.toHaveAttribute('aria-pressed');
  });

  it('works with the keyboard and skips disabled items', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ButtonGroup aria-label="Actions">
      <ButtonGroupItem onClick={() => onClick('a')}>A</ButtonGroupItem>
      <ButtonGroupItem disabled onClick={() => onClick('b')}>B</ButtonGroupItem>
      <ButtonGroupItem onClick={() => onClick('c')}>C</ButtonGroupItem>
    </ButtonGroup>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'A' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.tab();
    expect(screen.getByRole('button', { name: 'C' })).toHaveFocus();
    await user.keyboard(' ');
    expect(onClick.mock.calls).toEqual([['a'], ['c']]);
  });

  it('renders square icon-only items that must be named, with leading icons on text items', () => {
    render(<ButtonGroup aria-label="Format">
      <ButtonGroupItem iconOnly aria-label="Bold"><svg data-testid="bold" /></ButtonGroupItem>
      <ButtonGroupItem leadingIcon={<svg data-testid="lead" />}>Italic</ButtonGroupItem>
      {/* @ts-expect-error an icon-only item needs an accessible name */}
      <ButtonGroupItem iconOnly><svg /></ButtonGroupItem>
    </ButtonGroup>);
    const bold = screen.getByRole('button', { name: 'Bold' });
    expect(bold).toHaveClass('w-(--button-height)');
    expect(bold.querySelector('[data-slot="button-icon"]')).toContainElement(screen.getByTestId('bold'));
    expect(screen.getByRole('button', { name: 'Italic' }).querySelector('[data-icon="inline-start"]')).toContainElement(screen.getByTestId('lead'));
  });
});
