import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { gsap } from 'gsap';
import { SoundProvider } from '@/registry/morphin/lib/sound';
import { Button, ButtonLink, IconButton } from '@/registry/morphin/ui/button';
import { LinkButton } from '@/registry/morphin/ui/link-button';
import { Chip } from '@/registry/morphin/ui/chip';
import { ActionCard } from '@/registry/morphin/ui/action-card';
import { ActionCardMenu } from '@/registry/morphin/ui/action-card-menu';
import { ButtonGroup, ButtonGroupItem } from '@/registry/morphin/ui/button-group';
import { Announcement } from '@/registry/morphin/ui/announcement';
import { SplitButton, SplitButtonAction } from '@/registry/morphin/ui/split-button';

// The queue keeps its clock between tests, so every test starts well after the last cue.
beforeAll(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }); });
afterAll(() => { vi.useRealTimers(); });
beforeEach(() => { vi.advanceTimersByTime(1000); });
afterEach(() => {
  gsap.globalTimeline.clear();
  gsap.ticker.sleep();
});

function withSound(ui: ReactNode) {
  const player = vi.fn();
  render(<SoundProvider player={player}>{ui}</SoundProvider>);
  return player;
}

// `detail` 1 is a pointer click, 0 a keyboard activation. Each click flushes the queue and then waits past
// the gesture window, so the next one in the same test is a new interaction.
function click(element: Element, detail = 1) {
  act(() => {
    fireEvent.click(element, { detail });
    vi.advanceTimersByTime(1);
  });
  vi.advanceTimersByTime(1000);
}

const prevent = (event: { preventDefault(): void }) => event.preventDefault();

describe('action sounds', () => {
  it('is silent without a provider', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Save</Button>);
    click(screen.getByRole('button', { name: 'Save' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('taps a Button after its handler, with emphasis from the variant and the input method', () => {
    const order: string[] = [];
    const player = vi.fn(() => { order.push('sound'); });
    render(<SoundProvider player={player}>
      <Button onClick={() => order.push('handler')}>Primary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="destructive">Delete</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <IconButton label="Close">x</IconButton>
    </SoundProvider>);
    click(screen.getByRole('button', { name: 'Primary' }));
    expect(order).toEqual(['handler', 'sound']);
    click(screen.getByRole('button', { name: 'Accent' }), 0);
    for (const name of ['Delete', 'Secondary', 'Outline', 'Ghost', 'Close']) click(screen.getByRole('button', { name }));
    expect(player.mock.calls).toEqual([
      ['tap', { input: 'mouse', emphasis: 'normal' }],
      ['tap', { input: 'keyboard', emphasis: 'normal' }],
      ['tap', { input: 'mouse', emphasis: 'normal' }],
      ['tap', { input: 'mouse', emphasis: 'subtle' }],
      ['tap', { input: 'mouse', emphasis: 'subtle' }],
      ['tap', { input: 'mouse', emphasis: 'subtle' }],
      ['tap', { input: 'mouse', emphasis: 'subtle' }],
    ]);
  });

  it('keeps a Button silent when it is disabled, loading or its click is prevented', () => {
    const onClick = vi.fn(prevent);
    const player = withSound(<>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
      <Button onClick={onClick}>Prevented</Button>
    </>);
    click(screen.getByRole('button', { name: 'Disabled' }));
    click(screen.getByRole('button', { name: 'Loading' }));
    click(screen.getByRole('button', { name: 'Prevented' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(player).not.toHaveBeenCalled();
  });

  it('plays navigate for a ButtonLink, subtle unless the variant is filled', () => {
    const player = withSound(<>
      <ButtonLink href="#pricing">Pricing</ButtonLink>
      <ButtonLink href="#docs" variant="ghost">Docs</ButtonLink>
      <ButtonLink href="#blocked" onClick={prevent}>Blocked</ButtonLink>
    </>);
    for (const name of ['Pricing', 'Docs', 'Blocked']) click(screen.getByRole('link', { name }));
    expect(player.mock.calls).toEqual([
      ['navigate', { input: 'mouse', emphasis: 'normal' }],
      ['navigate', { input: 'mouse', emphasis: 'subtle' }],
    ]);
  });

  it('plays navigate for a link LinkButton and tap for a button one, and nothing when disabled', () => {
    const onClick = vi.fn();
    const player = withSound(<>
      <LinkButton href="#changelog">Changelog</LinkButton>
      <LinkButton onClick={onClick}>Undo</LinkButton>
      <LinkButton href="#off" disabled>Off link</LinkButton>
      <LinkButton disabled>Off action</LinkButton>
    </>);
    click(screen.getByRole('link', { name: 'Changelog' }));
    click(screen.getByRole('button', { name: 'Undo' }));
    click(screen.getByRole('link', { name: 'Off link' }));
    click(screen.getByRole('button', { name: 'Off action' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(player.mock.calls).toEqual([
      ['navigate', { input: 'mouse', emphasis: 'subtle' }],
      ['tap', { input: 'mouse', emphasis: 'subtle' }],
    ]);
  });

  it('plays a chip by what it is: link, toggle, button or nothing', () => {
    const onClick = vi.fn();
    const player = withSound(<>
      <Chip href="#tags">Tags</Chip>
      <Chip selected={false}>Off</Chip>
      <Chip selected>On</Chip>
      <Chip onClick={onClick}>Add tag</Chip>
      <Chip>Static</Chip>
      <Chip selected disabled>Disabled</Chip>
      <Chip href="#gone" disabled>Gone</Chip>
      <Chip onClick={prevent}>Prevented</Chip>
    </>);
    click(screen.getByRole('link', { name: 'Tags' }));
    click(screen.getByRole('button', { name: 'Off' }));
    click(screen.getByRole('button', { name: 'On' }));
    click(screen.getByRole('button', { name: 'Add tag' }));
    click(screen.getByText('Static'));
    click(screen.getByRole('button', { name: 'Disabled' }));
    click(screen.getByRole('link', { name: 'Gone' }));
    click(screen.getByRole('button', { name: 'Prevented' }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(player.mock.calls).toEqual([
      ['navigate', { input: 'mouse', emphasis: 'subtle' }],
      ['toggle', { input: 'mouse', emphasis: 'subtle', direction: 'forward' }],
      ['toggle', { input: 'mouse', emphasis: 'subtle', direction: 'back' }],
      ['tap', { input: 'mouse', emphasis: 'subtle' }],
    ]);
  });

  it('plays an action card as a link, a toggle or a button, and nothing when disabled', () => {
    const player = withSound(<>
      <ActionCard href="#new">New</ActionCard>
      <ActionCard active={false}>Grid</ActionCard>
      <ActionCard active>List</ActionCard>
      <ActionCard>Import</ActionCard>
      <ActionCard href="#off" disabled>Off link</ActionCard>
      <ActionCard disabled>Off action</ActionCard>
      <ActionCard onClick={prevent}>Prevented</ActionCard>
    </>);
    click(screen.getByRole('link', { name: 'New' }));
    click(screen.getByRole('button', { name: 'Grid' }));
    click(screen.getByRole('button', { name: 'List' }));
    click(screen.getByRole('button', { name: 'Import' }), 0);
    click(screen.getByRole('link', { name: 'Off link' }));
    click(screen.getByRole('button', { name: 'Off action' }));
    click(screen.getByRole('button', { name: 'Prevented' }));
    expect(player.mock.calls).toEqual([
      ['navigate', { input: 'mouse' }],
      ['toggle', { input: 'mouse', direction: 'forward' }],
      ['toggle', { input: 'mouse', direction: 'back' }],
      ['tap', { input: 'keyboard' }],
    ]);
  });

  it('does not play an action card menu as a toggle', () => {
    const player = withSound(<ActionCardMenu title="Sort by" options={[{ value: 'new', label: 'New' }]} defaultValue="new" active reduceMotion />);
    click(screen.getByRole('button', { name: 'Sort by: New' }));
    expect(player).toHaveBeenCalled();
    expect(player.mock.calls.map(([cue]) => cue)).not.toContain('toggle');
  });

  it('plays toggle for a selected-aware group item and tap for a plain one', () => {
    const player = withSound(<ButtonGroup>
      <ButtonGroupItem selected>Day</ButtonGroupItem>
      <ButtonGroupItem selected={false}>Week</ButtonGroupItem>
      <ButtonGroupItem>Today</ButtonGroupItem>
      <ButtonGroupItem selected={false} onClick={prevent}>Month</ButtonGroupItem>
      <ButtonGroupItem selected={false} disabled>Year</ButtonGroupItem>
    </ButtonGroup>);
    for (const name of ['Day', 'Week', 'Today', 'Month', 'Year']) click(screen.getByRole('button', { name }));
    expect(player.mock.calls).toEqual([
      ['toggle', { input: 'mouse', emphasis: 'subtle', direction: 'back' }],
      ['toggle', { input: 'mouse', emphasis: 'subtle', direction: 'forward' }],
      ['tap', { input: 'mouse', emphasis: 'subtle' }],
    ]);
  });

  it('plays close, not tap, when an announcement is dismissed, and its action plays as a button', () => {
    const player = withSound(<Announcement title="New" dismissible actionLabel="Read more" onAction={() => {}} />);
    click(screen.getByRole('button', { name: 'Read more' }));
    click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(player.mock.calls).toEqual([
      ['tap', { input: 'mouse', emphasis: 'subtle' }],
      ['close', { input: 'mouse', emphasis: 'subtle' }],
    ]);
  });

  it('taps the split button action like a Button of the group variant', () => {
    const player = withSound(<SplitButton><SplitButtonAction>Merge</SplitButtonAction></SplitButton>);
    click(screen.getByRole('button', { name: 'Merge' }));
    expect(player.mock.calls).toEqual([['tap', { input: 'mouse', emphasis: 'normal' }]]);
  });
});
