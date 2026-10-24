import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActionCard } from '@/registry/morphin/ui/action-card';
import { Announcement } from '@/registry/morphin/ui/announcement';
import { Card } from '@/registry/morphin/ui/card';
import { Chip } from '@/registry/morphin/ui/chip';
import { LinkButton } from '@/registry/morphin/ui/link-button';

// A router link rendered through `render` keeps its own href, so disabling must stop the click itself.
function RouterLink({ href, onClick, ...props }: React.ComponentProps<'a'>) {
  return <a href={href} {...props} onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) navigate(href); event.preventDefault(); }} />;
}
const navigate = vi.fn();

describe('disabled links', () => {
  it.each([
    ['LinkButton', <LinkButton key="l" disabled render={<RouterLink href="/x" />}>Go</LinkButton>],
    ['Chip', <Chip key="c" disabled render={<RouterLink href="/x" />}>Go</Chip>],
    ['ActionCard', <ActionCard key="a" disabled render={<RouterLink href="/x" />}>Go</ActionCard>],
    ['Card', <Card key="k" disabled render={<RouterLink href="/x" />}>Go</Card>],
  ])('%s does not navigate, and leaves the tab order', async (_name, element) => {
    navigate.mockClear();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(element);
    const link = screen.getByText('Go').closest('a')!;
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    await user.click(link);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('a link that is not disabled still navigates', async () => {
    navigate.mockClear();
    const user = userEvent.setup();
    render(<LinkButton render={<RouterLink href="/y" />}>Go</LinkButton>);
    await user.click(screen.getByText('Go'));
    expect(navigate).toHaveBeenCalledWith('/y');
  });
});

describe('Announcement action', () => {
  it('renders no action for action={null}, even with an actionLabel', () => {
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    render(<Announcement title="Note" action={null} actionLabel="Ignored" />);
    expect(screen.queryByRole('button')).toBeNull();
    vi.unstubAllGlobals();
  });
});
