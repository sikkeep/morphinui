'use client';

import { createContext, use, type HTMLAttributes, type ReactNode, type Ref } from 'react';
import { Menu } from '@base-ui/react/menu';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Button } from '@/registry/morphin/ui/button';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { soundInput, useSound } from '@/registry/morphin/lib/sound';
import {
  dropdownContentVariants, dropdownItemVariants, dropdownRadioGroupVariants, dropdownSegmentVariants,
  type DropdownActionItemOptions, type DropdownItemOptions, type DropdownRadioGroupVariant, type DropdownSegmentSize,
} from '@/registry/morphin/ui/dropdown-variants';
import { DropdownHighlight, DropdownHighlightContext, useHighlightedItem } from '@/registry/morphin/ui/dropdown-highlight';

export { dropdownContentVariants, dropdownItemVariants, dropdownRadioGroupVariants, dropdownSegmentVariants } from '@/registry/morphin/ui/dropdown-variants';
// The sliding surface, for custom lists: render it inside a `data-highlight-scope` element.
export { DropdownHighlight, useHighlightedElement, type DropdownHighlightProps } from '@/registry/morphin/ui/dropdown-highlight';
export type { DropdownActionItemOptions, DropdownItemOptions, DropdownRadioGroupVariant, DropdownSegmentSize } from '@/registry/morphin/ui/dropdown-variants';

function stateClasses<State>(base: string, custom?: string | ((state: State) => string | undefined)) {
  return typeof custom === 'function' ? (state: State) => cn(base, custom(state)) : cn(base, custom);
}

/**
 * Opening sounds like picking an item (`select`); closing is a quiet `close`. Both follow the caller's handler and
 * stay silent when it canceled the change or `actions.close()` made it.
 */
function useOpenSound<Details extends { isCanceled: boolean; reason: string }>(onOpenChange?: (open: boolean, details: Details) => void) {
  const play = useSound();
  return (open: boolean, details: Details) => {
    onOpenChange?.(open, details);
    if (details.isCanceled || details.reason === 'imperative-action') return;
    if (open) play('select');
    else play('close', { emphasis: 'subtle' });
  };
}

export type DropdownProps<Payload = unknown> = Menu.Root.Props<Payload>;
/** Non-modal by default, so the page keeps scrolling while a menu is open; pass `modal` to lock it. */
export function Dropdown<Payload = unknown>({ onItemHighlighted, onOpenChange, modal = false, ...props }: DropdownProps<Payload>) {
  const [item, onHighlight] = useHighlightedItem(onItemHighlighted);
  const handleOpenChange = useOpenSound(onOpenChange);
  return <DropdownHighlightContext value={item}>
    <Menu.Root {...props} modal={modal} onItemHighlighted={onHighlight} onOpenChange={handleOpenChange} />
  </DropdownHighlightContext>;
}

export function DropdownSub({ onItemHighlighted, onOpenChange, ...props }: Menu.SubmenuRoot.Props) {
  const [item, onHighlight] = useHighlightedItem(onItemHighlighted);
  const handleOpenChange = useOpenSound(onOpenChange);
  return <DropdownHighlightContext value={item}>
    <Menu.SubmenuRoot {...props} onItemHighlighted={onHighlight} onOpenChange={handleOpenChange} />
  </DropdownHighlightContext>;
}

/** The size of a segmented group's items, or false outside one. */
const SegmentedContext = createContext<DropdownSegmentSize | false>(false);

export interface DropdownRadioGroupProps extends Menu.RadioGroup.Props {
  /** `segmented` lays choices out in a row with its own sliding highlight that rests on the checked item. */
  variant?: DropdownRadioGroupVariant;
  /** The segments' size in a `segmented` group: `xs` 24, `sm` 28 or `md` 32 px (default). */
  size?: DropdownSegmentSize;
}
export function DropdownRadioGroup({
  ref, variant = 'default', size = 'md', className, children, ...props
}: DropdownRadioGroupProps) {
  const item = use(DropdownHighlightContext);
  const segmented = variant === 'segmented';
  return <Menu.RadioGroup
    data-slot="dropdown-radio-group"
    data-variant={variant}
    data-highlight-scope={segmented || undefined}
    data-size={segmented ? size : undefined}
    {...props}
    ref={ref}
    className={stateClasses(dropdownRadioGroupVariants({ variant }), className)}
  >
    {segmented && item !== undefined && <DropdownHighlight item={item} rest className="rounded-[999px] bg-foreground/12" />}
    <SegmentedContext value={segmented ? size : false}>{children}</SegmentedContext>
  </Menu.RadioGroup>;
}

export type DropdownGroupProps = Menu.Group.Props;
export function DropdownGroup(props: DropdownGroupProps) {
  return <Menu.Group data-slot="dropdown-group" {...props} />;
}

export type DropdownTriggerProps = Menu.Trigger.Props;
export function DropdownTrigger(props: DropdownTriggerProps) {
  return <Menu.Trigger data-slot="dropdown-trigger" render={<Button variant="outline" />} {...props} />;
}

type Placement = Pick<Menu.Positioner.Props, 'align' | 'side' | 'alignOffset' | 'sideOffset' | 'collisionPadding'>;
export interface DropdownContentProps extends Menu.Popup.Props, Placement {
  /** Set `container` to render the menu under a themed (`.dark`) element. */
  portalProps?: Menu.Portal.Props;
  positionerProps?: Omit<Menu.Positioner.Props, keyof Placement | 'children'>;
  /** Turns motion off. `false` cannot override `prefers-reduced-motion` or `MotionProvider`. */
  reduceMotion?: boolean;
  /** When no row is highlighted, the sliding highlight returns to the checked radio item. Defaults to true. */
  restOnChecked?: boolean;
  /**
   * The menu's width: a number of pixels, any CSS length, or `"trigger"` to match the element that opened it.
   * Without it the menu is 14rem wide, and `className` (`w-80`) still overrides.
   */
  width?: number | string;
  /**
   * Where the items' `leadingIcon` sits. `"end"` puts every icon after its label, aligned to the right edge,
   * and `trailingIcon` then sits just before it. A submenu inherits it. Default `"start"`.
   */
  iconPosition?: 'start' | 'end';
}

/** The menu popup, with portal and collision-aware positioning included. Refs target the popup. */
export function DropdownContent({
  ref, align = 'end', side, sideOffset = 8, alignOffset, collisionPadding = 12,
  portalProps, positionerProps, reduceMotion, restOnChecked = true, width, iconPosition, className, children, style, ...props
}: DropdownContentProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  const inherited = use(IconPositionContext);
  const position = iconPosition ?? inherited;
  const widthValue = width === 'trigger' ? 'var(--anchor-width)' : typeof width === 'number' ? `${width}px` : width;
  const sized = widthValue === undefined ? style
    : typeof style === 'function' ? (state: Parameters<typeof style>[0]) => ({ ...style(state), width: widthValue })
      : { ...style, width: widthValue };
  const item = use(DropdownHighlightContext);
  const movingHighlight = item !== undefined && !reduced;
  return <Menu.Portal {...portalProps}>
    <Menu.Positioner
      data-slot="dropdown-positioner"
      {...positionerProps}
      className={stateClasses('isolate z-50 outline-none', positionerProps?.className)}
      align={align} side={side} sideOffset={sideOffset} alignOffset={alignOffset} collisionPadding={collisionPadding}
    >
      <Menu.Popup
        data-slot="dropdown-content"
        {...props}
        ref={ref}
        data-reduced-motion={reduced || undefined}
        data-moving-highlight={movingHighlight || undefined}
        data-highlight-scope=""
        data-icon-position={position === 'end' ? 'end' : undefined}
        style={sized}
        className={stateClasses(dropdownContentVariants({ reduceMotion: reduced }), className)}
      >
        {movingHighlight && <DropdownHighlight item={item} rest={restOnChecked} />}
        <IconPositionContext value={position}>
          <DropdownHighlightContext value={movingHighlight ? item : undefined}>{children}</DropdownHighlightContext>
        </IconPositionContext>
      </Menu.Popup>
    </Menu.Positioner>
  </Menu.Portal>;
}

interface ItemContentProps {
  children?: ReactNode;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const IconPositionContext = createContext<'start' | 'end'>('start');

const iconClasses = 'pointer-events-none inline-flex shrink-0 items-center justify-center';

/** An item's own end-aligned element (a check, a chevron) takes the free space unless its icon already does. */
function useEndSpacer(leadingIcon: ReactNode) {
  return use(IconPositionContext) === 'end' && Boolean(leadingIcon) ? undefined : 'ms-auto';
}

function ItemContent({ leadingIcon, children, trailingIcon }: ItemContentProps) {
  const end = use(IconPositionContext) === 'end';
  const leading = leadingIcon && <span data-slot="dropdown-icon" data-icon={end ? 'inline-end' : 'inline-start'} className={cn(iconClasses, end && !trailingIcon && 'ms-auto')} aria-hidden="true">{leadingIcon}</span>;
  const trailing = trailingIcon && <span data-slot="dropdown-icon" data-icon="inline-end" className={cn(iconClasses, 'ms-auto')} aria-hidden="true">{trailingIcon}</span>;
  // At the end the label comes first, then the trailing icon (a count, say) and the leading icon last.
  return end ? <>{children}{trailing}{leading}</> : <>{leading}{children}{trailing}</>;
}

export interface DropdownItemProps extends Omit<Menu.Item.Props, 'ref'>, DropdownActionItemOptions, ItemContentProps {
  ref?: Ref<HTMLElement>;
}
export function DropdownItem({
  ref, variant, inset, size, leadingIcon, trailingIcon, children, className, onClick, ...props
}: DropdownItemProps) {
  const play = useSound();
  return <Menu.Item data-slot="dropdown-item" data-variant={variant ?? 'default'} data-highlight={size === 'icon' ? 'none' : undefined} {...props} ref={ref} onClick={(event) => {
    onClick?.(event);
    play('select', { input: soundInput(event) });
  }} className={stateClasses(dropdownItemVariants({ variant, inset, size }), className)}>
    <ItemContent leadingIcon={leadingIcon} trailingIcon={trailingIcon}>{children}</ItemContent>
  </Menu.Item>;
}

export interface DropdownLinkItemProps extends Omit<Menu.LinkItem.Props, 'ref'>, DropdownActionItemOptions, ItemContentProps {
  ref?: Ref<Element>;
}
export function DropdownLinkItem({
  ref, variant, inset, size, leadingIcon, trailingIcon, children, className, closeOnClick = true, onClick, ...props
}: DropdownLinkItemProps) {
  const play = useSound();
  // Unlike the Base UI default, a link item closes the menu on click.
  return <Menu.LinkItem data-slot="dropdown-link-item" data-variant={variant ?? 'default'} data-highlight={size === 'icon' ? 'none' : undefined} closeOnClick={closeOnClick} {...props} ref={ref} onClick={(event) => {
    onClick?.(event);
    play('select', { input: soundInput(event) });
  }} className={stateClasses(dropdownItemVariants({ variant, inset, size }), className)}>
    <ItemContent leadingIcon={leadingIcon} trailingIcon={trailingIcon}>{children}</ItemContent>
  </Menu.LinkItem>;
}

export interface DropdownRadioItemProps extends Omit<Menu.RadioItem.Props, 'ref'>, DropdownItemOptions {
  ref?: Ref<HTMLElement>;
  leadingIcon?: ReactNode;
  /** Shows a check on the checked item. Defaults to true, and to false inside a segmented group. */
  showIndicator?: boolean;
}
export function DropdownRadioItem({
  ref, variant, inset, leadingIcon, children, showIndicator, className, onClick, ...props
}: DropdownRadioItemProps) {
  const segment = use(SegmentedContext);
  const segmented = segment !== false;
  const spacer = useEndSpacer(leadingIcon);
  const play = useSound();
  const base = cn(dropdownItemVariants({ variant, inset }), segment !== false && dropdownSegmentVariants({ size: segment }));
  return <Menu.RadioItem data-slot="dropdown-radio-item" data-variant={variant ?? 'default'} {...props} ref={ref} onClick={(event) => {
    onClick?.(event);
    play('select', { input: soundInput(event) });
  }} className={stateClasses(base, className)}>
    <ItemContent leadingIcon={leadingIcon}>{children}</ItemContent>
    {(showIndicator ?? !segmented) && <span className={cn('inline-flex size-4 shrink-0 items-center justify-center', spacer)} aria-hidden="true">
      <Menu.RadioItemIndicator data-slot="dropdown-item-indicator"><HugeiconsIcon icon={Tick02Icon} aria-hidden="true" strokeWidth={1.8} /></Menu.RadioItemIndicator>
    </span>}
  </Menu.RadioItem>;
}

export interface DropdownCheckboxItemProps extends Omit<Menu.CheckboxItem.Props, 'ref'>, DropdownItemOptions {
  ref?: Ref<HTMLElement>;
  leadingIcon?: ReactNode;
}
export function DropdownCheckboxItem({
  ref, variant, inset, leadingIcon, children, className, onCheckedChange, ...props
}: DropdownCheckboxItemProps) {
  const spacer = useEndSpacer(leadingIcon);
  const play = useSound();
  return <Menu.CheckboxItem data-slot="dropdown-checkbox-item" data-variant={variant ?? 'default'} {...props} ref={ref} onCheckedChange={(checked, details) => {
    onCheckedChange?.(checked, details);
    if (!details.isCanceled) play('toggle', { direction: checked ? 'forward' : 'back' });
  }} className={stateClasses(dropdownItemVariants({ variant, inset }), className)}>
    <ItemContent leadingIcon={leadingIcon}>{children}</ItemContent>
    <span className={cn('inline-flex size-4 shrink-0 items-center justify-center', spacer)} aria-hidden="true">
      <Menu.CheckboxItemIndicator data-slot="dropdown-item-indicator"><HugeiconsIcon icon={Tick02Icon} aria-hidden="true" strokeWidth={1.8} /></Menu.CheckboxItemIndicator>
    </span>
  </Menu.CheckboxItem>;
}

export interface DropdownSubTriggerProps extends Omit<Menu.SubmenuTrigger.Props, 'ref'>, DropdownItemOptions {
  ref?: Ref<HTMLElement>;
  leadingIcon?: ReactNode;
}
export function DropdownSubTrigger({
  ref, variant, inset, leadingIcon, children, className, ...props
}: DropdownSubTriggerProps) {
  const spacer = useEndSpacer(leadingIcon);
  return <Menu.SubmenuTrigger data-slot="dropdown-sub-trigger" data-variant={variant ?? 'default'} {...props} ref={ref} className={stateClasses(dropdownItemVariants({ variant, inset }), className)}>
    <ItemContent leadingIcon={leadingIcon}>{children}</ItemContent>
    <HugeiconsIcon icon={ArrowRight01Icon} aria-hidden="true" className={cn(spacer, 'rtl:rotate-180')} strokeWidth={1.8} />
  </Menu.SubmenuTrigger>;
}

export type DropdownLabelProps = Menu.GroupLabel.Props;
export function DropdownLabel({ className, ...props }: DropdownLabelProps) {
  return <Menu.GroupLabel data-slot="dropdown-label" {...props} className={stateClasses('px-2.5 py-1.5 text-2xs leading-5 font-medium text-muted-foreground', className)} />;
}

export type DropdownSeparatorProps = Menu.Separator.Props;
export function DropdownSeparator({ className, ...props }: DropdownSeparatorProps) {
  return <Menu.Separator data-slot="dropdown-separator" {...props} className={stateClasses('mx-1 my-1 h-px bg-border/50', className)} />;
}

export function DropdownShortcut({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span data-slot="dropdown-shortcut" {...props} className={cn('ms-auto text-2xs text-muted-foreground', className)} />;
}
