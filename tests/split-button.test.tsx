import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DropdownContent, DropdownItem } from '@/registry/morphin/ui/dropdown';
import { SplitButton, SplitButtonAction, SplitButtonLink, SplitButtonMenu } from '@/registry/morphin/ui/split-button';
import { MotionProvider } from '@/registry/morphin/lib/motion';

function Example({ onJoin = () => {}, ...menu }: { onJoin?: () => void } & Partial<Parameters<typeof SplitButtonMenu>[0]>) {
  return <SplitButton aria-label="Account">
    <SplitButtonAction onClick={onJoin}>Join for free</SplitButtonAction>
    <SplitButtonMenu label="More options" {...menu}>
      <DropdownContent>
        <DropdownItem>Docs</DropdownItem>
        <DropdownItem>Contact us</DropdownItem>
      </DropdownContent>
    </SplitButtonMenu>
  </SplitButton>;
}

afterEach(() => vi.unstubAllGlobals());

describe('SplitButton', () => {
  it('takes a link as its main action: a real anchor in the group variant and size, round on the outer edge only', () => {
    render(<SplitButton variant="secondary" size="sm" aria-label="Account">
      <SplitButtonLink href="/pricing">Get Pro</SplitButtonLink>
      <SplitButtonMenu label="More options"><DropdownContent><DropdownItem>Docs</DropdownItem></DropdownContent></SplitButtonMenu>
    </SplitButton>);
    const link = screen.getByRole('link', { name: 'Get Pro' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/pricing');
    expect(link).toHaveAttribute('data-slot', 'split-button-action');
    expect(link).toHaveAttribute('data-variant', 'secondary');
    expect(link).toHaveAttribute('data-size', 'sm');
    expect(link).toHaveClass('rounded-e-none');
    expect(screen.getByRole('button', { name: 'More options' })).toBeInTheDocument();
  });

  it('renders a router link through render', () => {
    render(<SplitButton aria-label="Account">
      <SplitButtonLink render={<a href="/register" data-router="" />}>Join for free</SplitButtonLink>
      <SplitButtonMenu label="More options"><DropdownContent><DropdownItem>Docs</DropdownItem></DropdownContent></SplitButtonMenu>
    </SplitButton>);
    expect(screen.getByRole('link', { name: 'Join for free' })).toHaveAttribute('data-router');
  });

  it('is a group of two segments that share a variant and size, round only on the outer edges', () => {
    render(<SplitButton variant="secondary" size="sm" aria-label="Account">
      <SplitButtonAction>Join for free</SplitButtonAction>
      <SplitButtonMenu label="More options"><DropdownContent><DropdownItem>Docs</DropdownItem></DropdownContent></SplitButtonMenu>
    </SplitButton>);
    expect(screen.getByRole('group', { name: 'Account' })).toHaveAttribute('data-slot', 'split-button');
    const action = screen.getByRole('button', { name: 'Join for free' });
    const trigger = screen.getByRole('button', { name: 'More options' });
    for (const segment of [action, trigger]) {
      expect(segment).toHaveAttribute('data-variant', 'secondary');
      expect(segment).toHaveAttribute('data-size', 'sm');
    }
    expect(action).toHaveClass('rounded-e-none', 'border-e-0');
    expect(trigger).toHaveClass('rounded-s-none', 'border-s-0');
    expect(trigger).toHaveAttribute('data-slot', 'split-button-trigger');
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shares one border between the segments of an outline split button', () => {
    render(<SplitButton variant="outline">
      <SplitButtonAction>Export</SplitButtonAction>
      <SplitButtonMenu label="More options"><DropdownContent><DropdownItem>CSV</DropdownItem></DropdownContent></SplitButtonMenu>
    </SplitButton>);
    expect(screen.getByRole('button', { name: 'Export' })).not.toHaveClass('border-e-0');
    expect(screen.getByRole('button', { name: 'More options' })).toHaveClass('-ms-px');
    expect(screen.getByRole('button', { name: 'More options' })).not.toHaveClass('border-s-0');
  });

  it('runs the main action without opening the menu', async () => {
    const user = userEvent.setup();
    const onJoin = vi.fn();
    render(<Example onJoin={onJoin} />);
    await user.click(screen.getByRole('button', { name: 'Join for free' }));
    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens the menu when the pointer rests on the arrow, and not on the main action', async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.hover(screen.getByRole('button', { name: 'Join for free' }));
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(screen.queryByRole('menu')).toBeNull();

    await user.hover(screen.getByRole('button', { name: 'More options' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Docs' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: 'More options' })).toHaveAttribute('data-popup-open');
  });

  it('closes the menu again when the pointer leaves', async () => {
    const user = userEvent.setup();
    render(<Example closeDelay={20} />);
    await user.hover(screen.getByRole('button', { name: 'More options' }));
    await screen.findByRole('menu');
    await user.unhover(screen.getByRole('button', { name: 'More options' }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('opens with a click and the keyboard too, and runs an item', async () => {
    const user = userEvent.setup();
    render(<Example openOnHover={false} />);
    await user.hover(screen.getByRole('button', { name: 'More options' }));
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(screen.queryByRole('menu')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'More options' }));
    expect(await screen.findByRole('menu')).toBeInTheDocument();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());

    screen.getByRole('button', { name: 'More options' }).focus();
    await user.keyboard('{ArrowDown}');
    await user.click(await screen.findByRole('menuitem', { name: 'Contact us' }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('turns the arrow over while open, and keeps it still under reduced motion', async () => {
    // jsdom has no matchMedia, which the motion policy reads as "reduce".
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    const user = userEvent.setup();
    const { unmount } = render(<Example />);
    const icon = () => screen.getByRole('button', { name: 'More options' }).querySelector('[data-slot=button-icon]')!;
    expect(icon()).toHaveClass('in-data-popup-open:rotate-180', 'transition-transform');
    expect(icon().querySelector('svg')).toBeInTheDocument();
    unmount();

    render(<MotionProvider reducedMotion="always"><Example /></MotionProvider>);
    await user.click(screen.getByRole('button', { name: 'More options' }));
    expect(icon()).toHaveClass('in-data-popup-open:rotate-180');
    expect(icon()).not.toHaveClass('transition-transform');
  });

  it('disables only the arrow when asked, and forwards a custom icon', () => {
    render(<Example disabled icon={<span data-testid="dots">…</span>} />);
    expect(screen.getByRole('button', { name: 'More options' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Join for free' })).toBeEnabled();
    expect(screen.getByTestId('dots').closest('[data-slot=button-icon]')).toHaveAttribute('aria-hidden', 'true');
  });
});
