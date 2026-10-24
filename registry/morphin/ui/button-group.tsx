'use client';

import { createContext, use, type HTMLAttributes, type Ref } from 'react';
import { cn } from '@/lib/utils';
import { soundInput, useSound } from '@/registry/morphin/lib/sound';
import { Button, type ButtonProps, type ButtonSize } from '@/registry/morphin/ui/button';
import { buttonIconClasses } from '@/registry/morphin/ui/button-content';

const ButtonGroupContext = createContext<ButtonSize>('md');

export interface ButtonGroupProps extends HTMLAttributes<HTMLDivElement> {
  /** Size of every item. Default `md`. */
  size?: ButtonSize;
  ref?: Ref<HTMLDivElement>;
}

/** Buttons joined into one control with a shared outline: filters, view switches, formatting toolbars. */
export function ButtonGroup({
  ref, size = 'md', className, ...props
}: ButtonGroupProps) {
  return <ButtonGroupContext value={size}>
    <div
      role="group"
      data-slot="button-group"
      data-size={size}
      {...props}
      ref={ref}
      className={cn('relative isolate inline-flex items-stretch rounded-[999px] [corner-shape:var(--corner-shape)]', className)}
    />
  </ButtonGroupContext>;
}

type ItemProps = Omit<ButtonProps, 'variant' | 'size' | 'iconOnly' | 'fullWidth' | 'loading' | 'loadingLabel' | 'className'> & {
  /** Marks the item as the current choice: sets `aria-pressed` and a filled surface. */
  selected?: boolean;
  className?: string;
};

// An icon-only item has no visible text, so it must be named.
export type ButtonGroupItemProps = ItemProps & ({ iconOnly?: false } | { iconOnly: true; 'aria-label': string });

/** An outlined button inside a `ButtonGroup`. It takes the group's size. */
export function ButtonGroupItem({
  ref, selected, iconOnly, className, children, onClick, ...props
}: ButtonGroupItemProps) {
  const size = use(ButtonGroupContext);
  const play = useSound();
  return <Button
    data-slot="button-group-item"
    data-selected={selected || undefined}
    aria-pressed={selected}
    {...props}
    ref={ref}
    // A choice outranks the Button's own tap. The click flips the state, so a selected item is turning off.
    onClick={(event) => {
      onClick?.(event);
      if (selected !== undefined && !event.defaultPrevented) {
        play('toggle', { input: soundInput(event), emphasis: 'subtle', direction: selected ? 'back' : 'forward' });
      }
    }}
    variant="outline"
    size={size}
    iconOnly={iconOnly}
    static
    className={cn(
      // Items share edges: only the group's outer corners are round, and neighbors overlap by one border.
      'relative -ms-px rounded-none first:ms-0 first:rounded-s-[999px] last:rounded-e-[999px] focus-visible:z-10',
      // A solid surface, so the group looks the same on any background.
      'bg-card',
      selected && 'bg-accent',
      className,
    )}
  >
    {iconOnly ? <span data-slot="button-icon" className={buttonIconClasses} aria-hidden="true">{children}</span> : children}
  </Button>;
}
