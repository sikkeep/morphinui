'use client';

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type HTMLAttributes, type Ref, type RefObject } from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound, type SoundOptions } from '@/registry/morphin/lib/sound';
import {
  tabsFadeVariants, tabsIndicatorVariants, tabsListVariants, tabsPanelClasses, tabsRootClasses,
  tabsScrollButtonVariants, tabsScrollerVariants, tabsSeparatorClasses, tabsTabVariants,
  type TabsOptions,
} from '@/registry/morphin/ui/tabs-variants';

type Orientation = NonNullable<BaseTabs.Root.Props['orientation']>;
type TabsStyle = Required<TabsOptions> & { orientation: Orientation; reduced: boolean };
const TabsStyleContext = createContext<TabsStyle>({ variant: 'primary', size: 'md', align: 'center', orientation: 'horizontal', reduced: false });

export interface TabsProps extends Omit<BaseTabs.Root.Props, 'className'>, TabsOptions {
  className?: string;
  /** Turns the sliding indicator and the panel fade off. Also follows `prefers-reduced-motion` and `MotionProvider`. */
  reduceMotion?: boolean;
}

/** Which way the selection moved, from the DOM order of the tabs in the activated tab's list. */
function tabDirection(target: EventTarget | null): SoundOptions['direction'] {
  const tab = target instanceof Element ? target.closest('[role="tab"]') : null;
  const tabs = Array.from(tab?.closest('[role="tablist"]')?.querySelectorAll('[role="tab"]') ?? []);
  const next = tab ? tabs.indexOf(tab) : -1;
  const previous = tabs.findIndex(item => item.getAttribute('aria-selected') === 'true');
  if (next < 0 || previous < 0 || next === previous) return undefined;
  return next > previous ? 'forward' : 'back';
}

/** Groups tabs with their panels. `variant`, `size` and `align` apply to every tab inside. */
export function Tabs({
  variant = 'primary', size = 'md', align = 'center', orientation = 'horizontal', reduceMotion, className, onValueChange, ...props
}: TabsProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  const play = useSound();
  const style = useMemo(() => ({ variant, size, align, orientation, reduced }), [variant, size, align, orientation, reduced]);
  return <TabsStyleContext value={style}>
    <BaseTabs.Root
      data-slot="tabs"
      data-variant={variant}
      data-reduced-motion={reduced || undefined}
      orientation={orientation}
      className={cn(tabsRootClasses, className)}
      {...props}
      onValueChange={(value, details) => {
        const direction = tabDirection(details.event.target);
        onValueChange?.(value, details);
        // Base UI also reports the tab it picks on its own (initial, disabled, missing); only a tab the user activated plays.
        if (details.reason === 'none' && !details.isCanceled) play('select', { emphasis: 'subtle', ...(direction && { direction }) });
      }}
    />
  </TabsStyleContext>;
}

function axis(node: HTMLElement, orientation: Orientation) {
  return orientation === 'vertical'
    ? { scroll: node.scrollTop, client: node.clientHeight, size: node.scrollHeight }
    : { scroll: node.scrollLeft, client: node.clientWidth, size: node.scrollWidth };
}

/** Reports which edges of the list have hidden content. */
function useOverflow(list: RefObject<HTMLElement | null>, orientation: Orientation) {
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const node = list.current;
    if (!node) return;
    const read = () => {
      const { scroll, client, size } = axis(node, orientation);
      setEdges({ start: scroll > 1, end: scroll + client < size - 1 });
    };
    read();
    node.addEventListener('scroll', read, { passive: true });
    const resize = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(read);
    resize?.observe(node);
    // Tabs added, removed or relabelled change the content size without resizing the list itself.
    const content = typeof MutationObserver === 'undefined' ? undefined : new MutationObserver(read);
    content?.observe(node, { childList: true, subtree: true, characterData: true });
    return () => {
      node.removeEventListener('scroll', read);
      resize?.disconnect();
      content?.disconnect();
    };
  }, [list, orientation]);

  return edges;
}

/** Scrolls the list (not the page, as `scrollIntoView` would) to bring the active tab into view. */
function revealInList(node: HTMLElement, tab: HTMLElement, orientation: Orientation, behavior: ScrollBehavior) {
  const { scroll, client, size } = axis(node, orientation);
  if (size <= client + 1) return;
  const list = node.getBoundingClientRect();
  const item = tab.getBoundingClientRect();
  const vertical = orientation === 'vertical';
  const start = (vertical ? item.top - list.top : item.left - list.left) + scroll;
  const end = start + (vertical ? item.height : item.width);
  const target = start < scroll ? start : end > scroll + client ? end - client : scroll;
  if (Math.abs(target - scroll) < 1) return;
  node.scrollTo({ [vertical ? 'top' : 'left']: target, behavior });
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

function ScrollButton({
  edge, variant, orientation, label, onClick,
}: {
  edge: 'start' | 'end';
  variant: TabsStyle['variant'];
  orientation: Orientation;
  label: string;
  onClick: () => void;
}) {
  const Icon = orientation === 'vertical'
    ? (edge === 'start' ? ChevronUp : ChevronDown)
    : (edge === 'start' ? ChevronLeft : ChevronRight);
  return <button
    type="button"
    tabIndex={-1}
    data-slot="tabs-scroll"
    data-edge={edge}
    aria-label={label}
    className={tabsScrollButtonVariants({ variant, edge })}
    onClick={onClick}
  >
    <Icon strokeWidth={2.2} />
  </button>;
}

export interface TabsListProps extends Omit<BaseTabs.List.Props, 'className'> {
  className?: string;
  /** The sliding indicator under the active tab. Defaults to true. */
  indicator?: boolean;
  /** Chevrons and edge fades when the list overflows. Defaults to true. */
  overflow?: boolean;
  /** The chevrons' accessible names. Default to "Show previous tabs" and "Show next tabs" ("above" and "below" when vertical). */
  previousLabel?: string;
  nextLabel?: string;
}

export function TabsList({
  indicator = true, overflow = true, previousLabel, nextLabel, className, children, ref, ...props
}: TabsListProps) {
  const { variant, size, orientation, reduced } = use(TabsStyleContext);
  const list = useRef<HTMLDivElement>(null);
  // Merge with the caller's ref (a prop in React 19); the overflow handling needs its own.
  const setList = useCallback((node: HTMLDivElement | null) => {
    list.current = node;
    assignRef(ref as Ref<HTMLDivElement> | undefined, node);
  }, [ref]);
  const edges = useOverflow(list, orientation);
  const overflowing = overflow && (edges.start || edges.end);

  useEffect(() => {
    const node = list.current;
    if (!node || !overflow) return;
    let first = true;
    const reveal = () => {
      const tab = node.querySelector<HTMLElement>('[data-slot="tabs-tab"][data-active]');
      if (tab) revealInList(node, tab, orientation, first || reduced ? 'auto' : 'smooth');
      first = false;
    };
    reveal();
    const observer = new MutationObserver(reveal);
    observer.observe(node, { subtree: true, attributes: true, attributeFilter: ['data-active'] });
    return () => observer.disconnect();
  }, [overflow, reduced, orientation]);

  const vertical = orientation === 'vertical';
  const labels = {
    start: previousLabel ?? `Show ${vertical ? 'above' : 'previous'} tabs`,
    end: nextLabel ?? `Show ${vertical ? 'below' : 'next'} tabs`,
  };

  const scroll = (direction: 1 | -1) => {
    const node = list.current;
    if (!node) return;
    const { client } = axis(node, orientation);
    const distance = client * 0.75 * direction;
    node.scrollBy({
      left: orientation === 'horizontal' ? distance : 0,
      top: orientation === 'vertical' ? distance : 0,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  return <div
    data-slot="tabs-scroller"
    data-size={size}
    data-orientation={orientation}
    data-overflow-start={edges.start || undefined}
    data-overflow-end={edges.end || undefined}
    className={tabsScrollerVariants({ variant })}
  >
    {overflowing && edges.start && <ScrollButton edge="start" variant={variant} orientation={orientation} label={labels.start} onClick={() => scroll(-1)} />}
    {overflowing && edges.start && <span aria-hidden="true" data-slot="tabs-fade" data-edge="start" className={tabsFadeVariants({ variant, edge: 'start' })} />}
    <BaseTabs.List
      data-slot="tabs-list"
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
      ref={setList}
    >
      {children}
      {indicator && <TabsIndicator />}
    </BaseTabs.List>
    {overflowing && edges.end && <span aria-hidden="true" data-slot="tabs-fade" data-edge="end" className={tabsFadeVariants({ variant, edge: 'end' })} />}
    {overflowing && edges.end && <ScrollButton edge="end" variant={variant} orientation={orientation} label={labels.end} onClick={() => scroll(1)} />}
  </div>;
}

export interface TabsTabProps extends Omit<BaseTabs.Tab.Props, 'className'> {
  className?: string;
}

export function TabsTab({ className, ...props }: TabsTabProps) {
  const { variant, size, align } = use(TabsStyleContext);
  return <BaseTabs.Tab data-slot="tabs-tab" className={cn(tabsTabVariants({ variant, size, align }), className)} {...props} />;
}

export function TabsIndicator({ className, ...props }: Omit<BaseTabs.Indicator.Props, 'className'> & { className?: string }) {
  const { variant } = use(TabsStyleContext);
  return <BaseTabs.Indicator data-slot="tabs-indicator" className={cn(tabsIndicatorVariants({ variant }), className)} {...props} />;
}

export function TabsSeparator({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span role="presentation" data-slot="tabs-separator" className={cn(tabsSeparatorClasses, className)} {...props} />;
}

export interface TabsPanelProps extends Omit<BaseTabs.Panel.Props, 'className'> {
  className?: string;
}

export function TabsPanel({ className, ...props }: TabsPanelProps) {
  return <BaseTabs.Panel data-slot="tabs-panel" className={cn(tabsPanelClasses, className)} {...props} />;
}
