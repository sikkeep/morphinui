import { createRef, forwardRef, useState, type ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Popover } from '@base-ui/react/popover';
import { Button, ButtonLink, IconButton, buttonClasses, buttonVariants } from '@/registry/morphin/ui/button';

describe('Morphin Button', () => {
  it('does not accidentally submit a form', async () => {
    const submit = vi.fn(event => event.preventDefault());
    render(<form onSubmit={submit}><Button>Cancel</Button></form>);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });

  it('preserves explicit submit behavior', async () => {
    const submit = vi.fn(event => event.preventDefault());
    render(<form onSubmit={submit}><Button type="submit">Submit</Button></form>);
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(submit).toHaveBeenCalledOnce();
  });

  it('uses native disabled behavior and suppresses activation', async () => {
    const click = vi.fn();
    render(<Button disabled onClick={click}>Delete</Button>);
    const button = screen.getByRole('button', { name: 'Delete' });
    await userEvent.click(button);
    expect(click).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('data-disabled');
  });

  it('retains keyboard focus and prevents repeat activation while loading', async () => {
    const click = vi.fn();
    function Example() {
      const [loading, setLoading] = useState(false);
      return <Button loading={loading} loadingLabel="Saving" onClick={() => { click(); setLoading(true); }}>Save</Button>;
    }
    render(<Example />);
    const button = screen.getByRole('button', { name: 'Save' });
    await userEvent.tab();
    expect(button).toHaveFocus();
    await userEvent.keyboard('{Enter}');
    expect(button).toHaveFocus();
    expect(button).toHaveAccessibleName('Saving');
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.keyboard('{Enter} ');
    fireEvent.click(button);
    expect(click).toHaveBeenCalledOnce();
  });

  it('supports icon-only loading without losing the accessible name', () => {
    render(<IconButton label="Upload file" loading><svg data-testid="upload-icon" /></IconButton>);
    const button = screen.getByRole('button', { name: 'Upload file' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveAttribute('data-loading');
    expect(screen.getByTestId('upload-icon').closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('forwards the DOM ref and Base UI state-based className', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<Button ref={ref} disabled className={state => state.disabled ? 'custom-disabled' : 'custom-ready'}>Continue</Button>);
    expect(ref.current).toBe(screen.getByRole('button'));
    expect(ref.current).toHaveClass('morphin-button', 'custom-disabled');
  });

  it('keeps custom aria labelling when provided', () => {
    render(<><span id="external-label">External action</span><Button aria-labelledby="external-label" loading loadingLabel="Loading">Continue</Button></>);
    expect(screen.getByRole('button')).toHaveAccessibleName('External action');
  });

  it('lets consumers override Tailwind styles including the custom radius', () => {
    render(<Button className="rounded-none bg-red-500 h-12 px-8">Custom button</Button>);
    const button = screen.getByRole('button', { name: 'Custom button' });
    expect(button).toHaveClass('rounded-none', 'bg-red-500', 'h-12', 'px-8');
    expect(button).not.toHaveClass('rounded-[999px]', 'bg-primary', 'h-(--button-height)', 'px-(--button-padding)');
  });

  it('lets custom elements reuse the recipe and merge conditional consumer classes', () => {
    render(<a href="/docs" className={buttonClasses({ variant: 'outline', size: 'sm', className: ['rounded-none', { 'h-12': true }] })}>Read docs</a>);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('bg-transparent', 'text-xs', 'rounded-none', 'h-12');
    expect(link).not.toHaveClass('rounded-[999px]', 'h-(--button-height)');
    expect(buttonVariants()).toContain('bg-primary');
    expect(buttonVariants()).toContain('active:scale-[0.97]');
    expect(buttonVariants({ static: true })).not.toContain('active:scale-[0.97]');
    expect(buttonVariants({ reduceMotion: true })).not.toContain('active:scale-[0.97]');
  });

  it('exposes stable slots, variant, size and logical icon positions', () => {
    render(<Button variant="outline" size="sm" leadingIcon={<svg />} trailingIcon={<svg className="size-5" />}>Details</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-slot', 'button');
    expect(button).toHaveAttribute('data-variant', 'outline');
    expect(button).toHaveAttribute('data-size', 'sm');
    expect(button.querySelector('[data-slot="button-label"]')).toHaveTextContent('Details');
    expect(button.querySelector('[data-icon="inline-start"]')).toHaveAttribute('aria-hidden', 'true');
    expect(button.querySelector('[data-icon="inline-end"] svg')).toHaveClass('size-5');
  });

  it('composes with a real Base UI trigger and preserves both event handlers', async () => {
    const buttonClick = vi.fn();
    const triggerClick = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(<Popover.Root><Popover.Trigger ref={ref} onClick={triggerClick} render={<Button variant="outline" onClick={buttonClick} />}>Options</Popover.Trigger></Popover.Root>);
    const button = screen.getByRole('button', { name: 'Options' });
    expect(ref.current).toBe(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(buttonClick).toHaveBeenCalledOnce();
    expect(triggerClick).toHaveBeenCalledOnce();
  });

  it('keeps Base UI render composition and keyboard semantics', async () => {
    const click = vi.fn();
    render(<Button nativeButton={false} render={<div />} onClick={click}>Custom action</Button>);
    const button = screen.getByRole('button', { name: 'Custom action' });
    expect(button.tagName).toBe('DIV');
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(click).toHaveBeenCalledOnce();
  });

  it('renders navigation links with native link semantics', () => {
    const ref = createRef<HTMLAnchorElement>();
    render(<ButtonLink ref={ref} href="https://morphin.dev" variant="outline" trailingIcon={<svg />}>Explore</ButtonLink>);
    const link = screen.getByRole('link', { name: 'Explore' });
    expect(link).toHaveAttribute('href', 'https://morphin.dev');
    expect(link).not.toHaveAttribute('role', 'button');
    expect(ref.current).toBe(link);
  });

  it('renders through a framework link and keeps link semantics, styling and the ref', async () => {
    const ref = createRef<HTMLAnchorElement>();
    const click = vi.fn((event: { preventDefault(): void }) => event.preventDefault());
    // Stands in for next/link or react-router's Link: a component that forwards props and ref to an anchor.
    const AppLink = forwardRef<HTMLAnchorElement, ComponentProps<'a'> & { to: string }>(function AppLink({ to, ...props }, forwardedRef) {
      return <a data-app-link="" {...props} ref={forwardedRef} href={`/app${to}`} />;
    });
    render(<ButtonLink ref={ref} render={<AppLink to="/pricing" />} variant="outline" size="sm" target="_blank" aria-label="Pricing page" onClick={click} trailingIcon={<svg />}>Pricing</ButtonLink>);
    const link = screen.getByRole('link', { name: 'Pricing page' });
    expect(link).toHaveAttribute('data-app-link');
    expect(link).toHaveAttribute('href', '/app/pricing');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).not.toHaveAttribute('role', 'button');
    expect(link).toHaveAttribute('data-slot', 'button-link');
    expect(link).toHaveAttribute('data-variant', 'outline');
    expect(link).toHaveClass('morphin-button', 'h-(--button-height)');
    expect(link.querySelector('[data-slot="button-label"]')).toHaveTextContent('Pricing');
    expect(ref.current).toBe(link);
    await userEvent.click(link);
    expect(click).toHaveBeenCalledOnce();
  });

  it('lets a rendered link add its own classes without losing the button recipe', () => {
    const AppLink = forwardRef<HTMLAnchorElement, ComponentProps<'a'>>(function AppLink(props, forwardedRef) {
      return <a {...props} ref={forwardedRef} className={`${props.className ?? ''} from-app`} href="/x" />;
    });
    render(<ButtonLink render={<AppLink />} className="w-full">Go</ButtonLink>);
    expect(screen.getByRole('link', { name: 'Go' })).toHaveClass('morphin-button', 'w-full', 'from-app');
  });
});
