'use client';

import { Children, isValidElement, useCallback, useState, type ReactNode, type Ref } from 'react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowDown01Icon, Tick02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound } from '@/registry/morphin/lib/sound';
import { DropdownHighlight, useHighlightedElement } from '@/registry/morphin/ui/dropdown-highlight';
import { dropdownContentVariants, dropdownItemVariants } from '@/registry/morphin/ui/dropdown-variants';
import { selectTriggerClasses, type SelectTriggerOptions } from '@/registry/morphin/ui/select-variants';

function stateClasses<State>(base: string, custom?: string | ((state: State) => string | undefined)) {
  return typeof custom === 'function' ? (state: State) => cn(base, custom(state)) : cn(base, custom);
}

type ItemEntry = { value: unknown; label: ReactNode };

/** Collects the `SelectItem`s in the JSX so the trigger can show a label while the list is closed. */
function collectItems(children: ReactNode, found: ItemEntry[] = []) {
  Children.forEach(children, child => {
    if (!isValidElement<{ value?: unknown; label?: string; children?: ReactNode }>(child)) return;
    if (child.type === SelectItem) found.push({ value: child.props.value, label: child.props.label ?? child.props.children });
    else if (child.props.children) collectItems(child.props.children, found);
  });
  return found;
}

export type SelectProps<Value = unknown, Multiple extends boolean | undefined = false> = BaseSelect.Root.Props<Value, Multiple>;
/**
 * Non-modal by default, so the page keeps scrolling while the list is open; pass `modal` to lock it.
 * The trigger's labels come from the `SelectItem`s in the JSX. If your own component renders the
 * items, pass `items` (Base UI's label map) instead.
 */
export function Select<Value = unknown, Multiple extends boolean | undefined = false>({
  modal = false, items, onOpenChange, onValueChange, children, ...props
}: SelectProps<Value, Multiple>) {
  const play = useSound();
  return <BaseSelect.Root
    modal={modal}
    items={items ?? (collectItems(children) as SelectProps<Value, Multiple>['items'])}
    {...props}
    onOpenChange={(open, details) => {
      onOpenChange?.(open, details);
      if (details.isCanceled || details.reason === 'imperative-action') return;
      // Opening sounds like picking an item.
      if (open) play('select');
      else play('close', { emphasis: 'subtle' });
    }}
    onValueChange={(value, details) => {
      onValueChange?.(value, details);
      // Only a pick: Base UI also changes the value when the items change or the closed trigger is typed on.
      if (!details.isCanceled && details.reason === 'item-press') play('select');
    }}
  >{children}</BaseSelect.Root>;
}

export interface SelectTriggerProps extends Omit<BaseSelect.Trigger.Props, 'children'>, SelectTriggerOptions {
  /** Shown while nothing is selected. Ignored when you pass your own children. */
  placeholder?: ReactNode;
  leadingIcon?: ReactNode;
  children?: ReactNode;
}

/** Shows the selected value (or the placeholder) and a chevron. Pass children to lay it out yourself. */
export function SelectTrigger({
  ref, variant, size, fullWidth, placeholder, leadingIcon, className, children, ...props
}: SelectTriggerProps) {
  return <BaseSelect.Trigger
    data-slot="select-trigger"
    data-size={size ?? 'md'}
    {...props}
    ref={ref}
    className={stateClasses(selectTriggerClasses({ variant, size, fullWidth }), className)}
  >
    {leadingIcon && <span data-slot="select-icon" data-icon="inline-start" className="pointer-events-none inline-flex shrink-0 items-center justify-center" aria-hidden="true">{leadingIcon}</span>}
    {children ?? <BaseSelect.Value data-slot="select-value" placeholder={placeholder} className="min-w-0 flex-1 truncate" />}
    <BaseSelect.Icon data-slot="select-chevron" data-icon="inline-end" className="pointer-events-none inline-flex shrink-0 items-center justify-center text-muted-foreground"><HugeiconsIcon icon={ArrowDown01Icon} aria-hidden="true" strokeWidth={1.8} /></BaseSelect.Icon>
  </BaseSelect.Trigger>;
}

export type SelectValueProps = BaseSelect.Value.Props;
export function SelectValue({ className, ...props }: SelectValueProps) {
  return <BaseSelect.Value data-slot="select-value" {...props} className={stateClasses('min-w-0 flex-1 truncate', className)} />;
}

type Placement = Pick<BaseSelect.Positioner.Props, 'align' | 'side' | 'alignOffset' | 'sideOffset' | 'collisionPadding' | 'alignItemWithTrigger'>;
export interface SelectContentProps extends BaseSelect.Popup.Props, Placement {
  /** Set `container` to render the list under a themed (`.dark`) element. */
  portalProps?: BaseSelect.Portal.Props;
  positionerProps?: Omit<BaseSelect.Positioner.Props, keyof Placement | 'children'>;
  /** Turns motion off. `false` cannot override `prefers-reduced-motion` or `MotionProvider`. */
  reduceMotion?: boolean;
}

/** The list popup, with portal, collision-aware positioning and the dropdown's sliding highlight. Refs target the popup. */
export function SelectContent({
  ref, align = 'start', side, sideOffset = 6, alignOffset, collisionPadding = 12,
  // Opens below the trigger like a dropdown, instead of covering it like a native select.
  alignItemWithTrigger = false,
  portalProps, positionerProps, reduceMotion, className, children, ...props
}: SelectContentProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  const [popup, setPopup] = useState<HTMLDivElement | null>(null);
  const item = useHighlightedElement(popup);
  const setRefs = useCallback((node: HTMLDivElement | null) => {
    setPopup(node);
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  return <BaseSelect.Portal {...portalProps}>
    <BaseSelect.Positioner
      data-slot="select-positioner"
      {...positionerProps}
      className={stateClasses('isolate z-50 outline-none', positionerProps?.className)}
      align={align} side={side} sideOffset={sideOffset} alignOffset={alignOffset}
      collisionPadding={collisionPadding} alignItemWithTrigger={alignItemWithTrigger}
    >
      <BaseSelect.Popup
        data-slot="select-content"
        {...props}
        ref={setRefs}
        data-reduced-motion={reduced || undefined}
        data-moving-highlight={!reduced || undefined}
        data-highlight-scope=""
        className={stateClasses(cn(dropdownContentVariants({ reduceMotion: reduced }), 'w-auto min-w-(--anchor-width)'), className)}
      >
        {!reduced && <DropdownHighlight item={item} rest />}
        <BaseSelect.List data-slot="select-list" className="outline-none">{children}</BaseSelect.List>
      </BaseSelect.Popup>
    </BaseSelect.Positioner>
  </BaseSelect.Portal>;
}

export interface SelectItemProps extends Omit<BaseSelect.Item.Props, 'ref'> {
  ref?: Ref<HTMLElement>;
  leadingIcon?: ReactNode;
  /** A second, muted line under the label. */
  description?: ReactNode;
}

/** `label` is the text the trigger shows and type-ahead matches; it defaults to the item's text. */
export function SelectItem({
  ref, leadingIcon, description, children, className, ...props
}: SelectItemProps) {
  return <BaseSelect.Item data-slot="select-item" {...props} ref={ref} className={stateClasses(cn(dropdownItemVariants(), description && 'items-start'), className)}>
    {leadingIcon && <span data-slot="select-icon" data-icon="inline-start" className="pointer-events-none inline-flex shrink-0 items-center justify-center" aria-hidden="true">{leadingIcon}</span>}
    <span className="flex min-w-0 flex-col">
      <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
      {description && <span className="text-xs font-normal text-muted-foreground">{description}</span>}
    </span>
    <span className="ms-auto inline-flex size-4 shrink-0 items-center justify-center" aria-hidden="true">
      <BaseSelect.ItemIndicator data-slot="select-item-indicator"><HugeiconsIcon icon={Tick02Icon} aria-hidden="true" strokeWidth={1.8} /></BaseSelect.ItemIndicator>
    </span>
  </BaseSelect.Item>;
}

export type SelectGroupProps = BaseSelect.Group.Props;
export function SelectGroup(props: SelectGroupProps) {
  return <BaseSelect.Group data-slot="select-group" {...props} />;
}

export type SelectLabelProps = BaseSelect.GroupLabel.Props;
/** A group heading. It belongs inside a `SelectGroup`. */
export function SelectLabel({ className, ...props }: SelectLabelProps) {
  return <BaseSelect.GroupLabel data-slot="select-label" {...props} className={stateClasses('px-2.5 py-1.5 text-2xs font-medium text-muted-foreground', className)} />;
}

export type SelectSeparatorProps = BaseSelect.Separator.Props;
export function SelectSeparator({ className, ...props }: SelectSeparatorProps) {
  return <BaseSelect.Separator data-slot="select-separator" {...props} className={stateClasses('mx-1 my-1 h-px bg-border/50', className)} />;
}
