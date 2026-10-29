'use client';

import { createContext, use, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Menu } from '@base-ui/react/menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { Button, ButtonLink, type ButtonLinkProps, type ButtonProps, type ButtonSize, type ButtonVariant } from '@/registry/morphin/ui/button';
import { buttonIconClasses } from '@/registry/morphin/ui/button-content';
import { Dropdown, type DropdownProps } from '@/registry/morphin/ui/dropdown';
import { useReducedMotion } from '@/registry/morphin/lib/motion';

type SplitContext = { variant: ButtonVariant; size: ButtonSize };
const SplitButtonContext = createContext<SplitContext>({ variant: 'primary', size: 'md' });

export interface SplitButtonProps extends HTMLAttributes<HTMLDivElement> {
  /** Variant of both segments. Default `primary`. */
  variant?: ButtonVariant;
  /** Size of both segments. Default `md`. */
  size?: ButtonSize;
  ref?: Ref<HTMLDivElement>;
}

/**
 * One pill in two segments: a main action and a menu that opens from the arrow next to it, on hover
 * as well as on click. Put a `SplitButtonAction` and a `SplitButtonMenu` inside.
 */
export function SplitButton({
  ref, variant = 'primary', size = 'md', className, ...props
}: SplitButtonProps) {
  return <SplitButtonContext value={{ variant, size }}>
    <div
      role="group"
      data-slot="split-button"
      data-variant={variant}
      data-size={size}
      {...props}
      ref={ref}
      className={cn('relative isolate inline-flex items-stretch rounded-[999px] [corner-shape:var(--corner-shape)]', className)}
    />
  </SplitButtonContext>;
}

// Only the outer corners are round. Filled segments are divided by an inset hairline of the label color;
// outlined segments share one border.
const actionClasses = (variant: ButtonVariant) => cn(
  'rounded-e-none focus-visible:z-10',
  variant !== 'outline' && 'border-e-0',
);
const triggerClasses = (variant: ButtonVariant) => cn(
  'w-[calc(var(--button-height)*0.9)] rounded-s-none focus-visible:z-10',
  variant === 'outline' ? '-ms-px' : 'border-s-0 shadow-[inset_1px_0_0_color-mix(in_oklab,currentColor_22%,transparent)]',
);

export type SplitButtonActionProps = Omit<ButtonProps, 'variant' | 'size' | 'iconOnly' | 'fullWidth' | 'static'>;

/** The main action: a `Button` that takes the group's variant and size. Use `render` for a link. */
export function SplitButtonAction({
  ref, className, ...props
}: SplitButtonActionProps) {
  const { variant, size } = use(SplitButtonContext);
  return <Button
    data-slot="split-button-action"
    {...props}
    ref={ref}
    variant={variant}
    size={size}
    static
    className={typeof className === 'function'
      ? state => cn(actionClasses(variant), className(state))
      : cn(actionClasses(variant), className)}
  />;
}

export type SplitButtonLinkProps = Omit<ButtonLinkProps, 'variant' | 'size' | 'iconOnly' | 'fullWidth' | 'static'>;

/**
 * The main action as a link, for navigation: a real anchor (a `ButtonLink`) that takes the group's variant and
 * size. Pass `href`, or `render={<Link href="/pricing" />}` for your router.
 */
export function SplitButtonLink({
  ref, className, ...props
}: SplitButtonLinkProps) {
  const { variant, size } = use(SplitButtonContext);
  return <ButtonLink
    data-slot="split-button-action"
    {...props}
    ref={ref}
    variant={variant}
    size={size}
    static
    className={cn(actionClasses(variant), className)}
  />;
}

export interface SplitButtonMenuProps extends DropdownProps {
  /** Accessible name of the arrow button. */
  label: string;
  /** Open when the pointer rests on the arrow. Click, Enter and the arrow keys always work. Default: true. */
  openOnHover?: boolean;
  /** Milliseconds the pointer rests on the arrow before the menu opens. Default: 80. */
  delay?: number;
  /** Milliseconds before the menu closes after the pointer leaves the arrow and the menu. Default: 120. */
  closeDelay?: number;
  /** Replaces the chevron. It turns upside down while the menu is open. */
  icon?: ReactNode;
  disabled?: boolean;
  /** Classes for the arrow button. */
  triggerClassName?: string;
  /** A `DropdownContent` and its items. */
  children: ReactNode;
}

/** The arrow segment and the menu it opens. Children are a `DropdownContent` with its items. */
export function SplitButtonMenu({
  label, openOnHover = true, delay = 80, closeDelay = 120, icon, disabled, triggerClassName, children, ...props
}: SplitButtonMenuProps) {
  const { variant, size } = use(SplitButtonContext);
  const reduced = useReducedMotion();
  return <Dropdown {...props}>
    <Menu.Trigger
      data-slot="split-button-trigger"
      openOnHover={openOnHover}
      delay={delay}
      closeDelay={closeDelay}
      disabled={disabled}
      aria-label={label}
      render={<Button variant={variant} size={size} iconOnly static className={cn(triggerClasses(variant), triggerClassName)} />}
    >
      <span
        data-slot="button-icon"
        aria-hidden="true"
        className={cn(
          buttonIconClasses,
          'in-data-popup-open:rotate-180',
          !reduced && 'transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
        )}
      >
        {icon ?? <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} aria-hidden="true" />}
      </span>
    </Menu.Trigger>
    {children}
  </Dropdown>;
}
