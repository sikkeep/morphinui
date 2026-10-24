'use client';

import { useId, type AnchorHTMLAttributes, type MouseEvent, type ReactNode, type Ref } from 'react';
import { Button as BaseButton } from '@base-ui/react/button';
import { useRender } from '@base-ui/react/use-render';
import { cn } from '@/lib/utils';
import { ButtonContent, buttonIconClasses } from '@/registry/morphin/ui/button-content';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { soundInput, useSound, type SoundOptions } from '@/registry/morphin/lib/sound';
import { buttonClasses, type ButtonOptions, type ButtonVariant } from '@/registry/morphin/ui/button-variants';

export { buttonClasses, buttonVariants, buttonVariantNames, buttonSizes } from '@/registry/morphin/ui/button-variants';
export type { ButtonOptions, ButtonVariant, ButtonSize } from '@/registry/morphin/ui/button-variants';

export interface ButtonProps extends Omit<BaseButton.Props, 'children'>, ButtonOptions {
  children?: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Shows a spinner in place of the leading icon and disables the button while keeping it focusable. */
  loading?: boolean;
  /** Replaces the label while `loading`. */
  loadingLabel?: string;
}

// Filled actions sound at normal weight; quiet surfaces and icon-only buttons (toolbars, dismiss) stay subtle.
const soundEmphasis = (variant: ButtonVariant, iconOnly?: boolean): SoundOptions['emphasis'] =>
  !iconOnly && (variant === 'primary' || variant === 'accent' || variant === 'destructive') ? 'normal' : 'subtle';

/** A Base UI button with variants, sizes, icons, a loading state and animated content changes. */
export function Button({
  ref, variant = 'primary', size = 'md', iconOnly, fullWidth, static: staticMotion, reduceMotion,
  loading = false, loadingLabel, leadingIcon, trailingIcon,
  className, children, disabled, focusableWhenDisabled, onClick, ...props
}: ButtonProps) {
  const labelId = useId();
  const play = useSound();
  const reduced = useReducedMotion() || reduceMotion === true;
  const classes = buttonClasses({ variant, size, iconOnly, fullWidth, static: staticMotion, reduceMotion: reduced });
  const customLabel = props['aria-label'] || props['aria-labelledby'];

  return (
    <BaseButton
      data-slot="button"
      {...props}
      ref={ref}
      disabled={disabled || loading}
      focusableWhenDisabled={loading || focusableWhenDisabled}
      aria-busy={loading || props['aria-busy'] || undefined}
      aria-labelledby={customLabel ? props['aria-labelledby'] : labelId}
      data-loading={loading || undefined}
      data-variant={variant}
      data-size={size}
      data-reduced-motion={reduced || undefined}
      // Base UI calls this only while the button is enabled.
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) play('tap', { input: soundInput(event), emphasis: soundEmphasis(variant, iconOnly) });
      }}
      className={typeof className === 'function'
        ? state => cn(classes, className(state))
        : cn(classes, className)}
    >
      <ButtonContent labelId={labelId} iconOnly={iconOnly} leadingIcon={leadingIcon} trailingIcon={trailingIcon} loading={loading} loadingLabel={loadingLabel} reduced={reduced}>{children}</ButtonContent>
    </BaseButton>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, 'iconOnly' | 'leadingIcon' | 'trailingIcon'> {
  /** Accessible name. Required, since the button has no visible text. */
  label: string;
  children: ReactNode;
}

/** A square button that holds only an icon. */
export function IconButton({
  ref, label, children, ...props
}: IconButtonProps) {
  return <Button {...props} ref={ref} iconOnly aria-label={label}>
    <span data-slot="button-icon" className={buttonIconClasses} aria-hidden="true">{children}</span>
  </Button>;
}

interface ButtonLinkBaseProps extends AnchorHTMLAttributes<HTMLAnchorElement>, Omit<ButtonOptions, 'iconOnly'> {
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  /** Renders a framework link instead of a plain anchor, e.g. `render={<Link href="/pricing" />}`. */
  render?: useRender.RenderProp;
  ref?: Ref<HTMLAnchorElement>;
}

// An icon-only link has no visible text, so it must be named.
export type ButtonLinkProps = ButtonLinkBaseProps & ({ iconOnly?: false } | { iconOnly: true; 'aria-label': string });

/** A link styled as a button, for navigation. Pass `render` to use your router's link. */
export function ButtonLink({
  ref, variant = 'primary', size = 'md', iconOnly, fullWidth, static: staticMotion, reduceMotion,
  leadingIcon, trailingIcon, className, children, render, onClick, ...props
}: ButtonLinkProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  const play = useSound();
  return useRender({
    defaultTagName: 'a',
    render,
    ref,
    props: {
      'data-slot': 'button-link',
      ...props,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        if (!event.defaultPrevented) play('navigate', { input: soundInput(event), emphasis: soundEmphasis(variant, iconOnly) });
      },
      'data-variant': variant,
      'data-size': size,
      'data-reduced-motion': reduced || undefined,
      className: cn(buttonClasses({ variant, size, iconOnly, fullWidth, static: staticMotion, reduceMotion: reduced }), className),
      children: <ButtonContent iconOnly={iconOnly} leadingIcon={leadingIcon} trailingIcon={trailingIcon} reduced={reduced}>{children}</ButtonContent>,
    },
  });
}
