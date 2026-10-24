import { createRef, forwardRef, type ComponentProps } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LinkButton, linkButtonClasses, linkButtonVariants } from '@/registry/morphin/ui/link-button';

describe('LinkButton', () => {
  it('renders a link when href is given and a button otherwise', async () => {
    const onClick = vi.fn();
    render(<><LinkButton href="/changelog" target="_blank">View changelog</LinkButton><LinkButton onClick={onClick}>Download</LinkButton></>);
    const link = screen.getByRole('link', { name: 'View changelog' });
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '/changelog');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('data-slot', 'link-button');
    const button = screen.getByRole('button', { name: 'Download' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies variant, size and underline recipes and merges custom classes', () => {
    render(<>
      <LinkButton>Default</LinkButton>
      <LinkButton variant="secondary" size="xs" underline="always" className="font-bold">Quiet</LinkButton>
    </>);
    const plain = screen.getByRole('button', { name: 'Default' });
    expect(plain).toHaveClass('text-foreground', 'text-sm', 'hover:underline', 'no-underline');
    const quiet = screen.getByRole('button', { name: 'Quiet' });
    expect(quiet).toHaveClass('text-muted-foreground', 'text-2xs', 'underline', 'font-bold');
    expect(quiet).not.toHaveClass('font-medium');
    expect(linkButtonVariants({ size: 'sm' })).toContain('[--link-icon:14px]');
    expect(linkButtonClasses({ underline: 'none', className: 'underline' })).toContain('underline');
  });

  it('places decorative icons before and after the label', () => {
    render(<LinkButton href="/x" leadingIcon={<svg data-testid="lead" />} trailingIcon={<svg data-testid="trail" />}>See all</LinkButton>);
    const link = screen.getByRole('link', { name: 'See all' });
    expect(link.querySelector('[data-icon="inline-start"]')).toContainElement(screen.getByTestId('lead'));
    expect(link.querySelector('[data-icon="inline-end"]')).toContainElement(screen.getByTestId('trail'));
    expect(link.querySelector('[data-icon="inline-start"]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders through a framework link and forwards the ref', async () => {
    const ref = createRef<HTMLElement>();
    const AppLink = forwardRef<HTMLAnchorElement, ComponentProps<'a'> & { to: string }>(function AppLink({ to, ...props }, forwarded) {
      return <a data-app-link="" {...props} ref={forwarded} href={`/app${to}`} />;
    });
    render(<LinkButton ref={ref} render={<AppLink to="/pricing" />} variant="secondary">Pricing</LinkButton>);
    const link = screen.getByRole('link', { name: 'Pricing' });
    expect(link).toHaveAttribute('data-app-link');
    expect(link).toHaveAttribute('href', '/app/pricing');
    expect(link).toHaveClass('text-muted-foreground');
    expect(ref.current).toBe(link);
  });

  it('disables a button natively and a link without letting it navigate', async () => {
    const onClick = vi.fn();
    render(<><LinkButton disabled onClick={onClick}>Unavailable</LinkButton><LinkButton disabled href="/never">Locked</LinkButton></>);
    const button = screen.getByRole('button', { name: 'Unavailable' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    const link = screen.getByRole('link', { name: 'Locked' });
    expect(link).not.toHaveAttribute('href');
    expect(link).toHaveAttribute('aria-disabled', 'true');
    expect(link).toHaveAttribute('tabindex', '-1');
    expect(link).toHaveClass('data-disabled:opacity-50');
  });
});
