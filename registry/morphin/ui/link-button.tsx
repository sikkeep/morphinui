'use client';

import { type AnchorHTMLAttributes, type ButtonHTMLAttributes, type MouseEvent, type ReactNode, type Ref } from 'react';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/utils';
import { soundInput, useSound } from '@/registry/morphin/lib/sound';
import { linkButtonClasses, type LinkButtonOptions } from '@/registry/morphin/ui/link-button-variants';

export { linkButtonVariants, linkButtonClasses } from '@/registry/morphin/ui/link-button-variants';
export type { LinkButtonOptions } from '@/registry/morphin/ui/link-button-variants';

/** A disabled link must not navigate, even when `render` gives it its own href. */
const preventNavigation = (event: { preventDefault(): void }) => event.preventDefault();

interface CommonProps extends LinkButtonOptions {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  disabled?: boolean;
  /** Renders your framework's link, e.g. `render={<Link href="/changelog" />}`. */
  render?: useRender.RenderProp;
  ref?: Ref<HTMLElement>;
}

type AnchorProps = CommonProps & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & { href: string };
type ActionProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
export type LinkButtonProps = AnchorProps | ActionProps;

function Icon({ side, children }: { side: 'inline-start' | 'inline-end'; children: ReactNode }) {
  return <span data-slot="link-button-icon" data-icon={side} className="pointer-events-none inline-flex shrink-0 items-center justify-center" aria-hidden="true">{children}</span>;
}

/**
 * An inline text action. It renders a link when `href` (or `render`) is given and a button otherwise,
 * so the same component navigates or runs a handler.
 */
export function LinkButton({
  ref, variant, size, underline, leadingIcon, trailingIcon, disabled, render, className, children, href, onClick, ...props
}: LinkButtonProps) {
  const play = useSound();
  const isLink = href !== undefined || render !== undefined;
  const disabledProps = disabled
    ? isLink
      // A disabled link must not navigate: drop the href and keep it announced as a link.
      ? { 'aria-disabled': true, role: 'link', tabIndex: -1, 'data-disabled': '', onClick: preventNavigation }
      : { disabled: true, 'data-disabled': '' }
    : {
      href,
      onClick: (event: MouseEvent<HTMLAnchorElement & HTMLButtonElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) play(isLink ? 'navigate' : 'tap', { input: soundInput(event), emphasis: 'subtle' });
      },
    };
  return useRender({
    defaultTagName: href !== undefined ? 'a' : 'button',
    render,
    ref,
    props: {
      'data-slot': 'link-button',
      ...(!isLink && { type: 'button' }),
      ...props,
      ...disabledProps,
      className: cn(linkButtonClasses({ variant, size, underline }), className),
      children: <>
        {leadingIcon && <Icon side="inline-start">{leadingIcon}</Icon>}
        {children}
        {trailingIcon && <Icon side="inline-end">{trailingIcon}</Icon>}
      </>,
    },
  });
}
