'use client';

import type { ComponentProps } from 'react';
import { Dialog } from '@base-ui/react/dialog';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useReducedMotion } from '@/registry/morphin/lib/motion';
import { useSound } from '@/registry/morphin/lib/sound';
import { Button, IconButton } from '@/registry/morphin/ui/button';
import {
  modalBackdropVariants, modalBodyClasses, modalCloseButtonClasses, modalDescriptionClasses, modalFooterClasses,
  modalHeaderClasses, modalIconClasses, modalPopupVariants, modalTitleClasses, modalViewportVariants,
  type ModalBackdrop, type ModalPlacement, type ModalScroll, type ModalSize,
} from '@/registry/morphin/ui/modal-variants';

export { modalSizes, modalPlacements, modalBackdrops, modalScrolls } from '@/registry/morphin/ui/modal-variants';
export type { ModalSize, ModalPlacement, ModalBackdrop, ModalScroll } from '@/registry/morphin/ui/modal-variants';

function stateClasses<State>(base: string, custom?: string | ((state: State) => string | undefined)) {
  return typeof custom === 'function' ? (state: State) => cn(base, custom(state)) : cn(base, custom);
}

export type ModalProps<Payload = unknown> = Dialog.Root.Props<Payload>;
/** Modal by default: focus is trapped, the page does not scroll and Escape or a backdrop press closes it. */
export function Modal<Payload = unknown>({ onOpenChange, ...props }: ModalProps<Payload>) {
  const play = useSound();
  return <Dialog.Root
    {...props}
    onOpenChange={(open, details) => {
      onOpenChange?.(open, details);
      // `actions.close()` is the app's doing, not the user's.
      if (!details.isCanceled && details.reason !== 'imperative-action') play(open ? 'open' : 'close');
    }}
  />;
}

export type ModalTriggerProps = Dialog.Trigger.Props;
export function ModalTrigger(props: ModalTriggerProps) {
  return <Dialog.Trigger data-slot="modal-trigger" render={<Button variant="outline" />} {...props} />;
}

export interface ModalContentProps extends Dialog.Popup.Props {
  /** `xs` to `lg` set the width; `cover` fills the screen inside its margin and `full` fills it edge to edge. */
  size?: ModalSize;
  placement?: ModalPlacement;
  /** `inside` keeps the popup on screen and scrolls `ModalBody`; `outside` lets the popup grow and the page layer scroll. */
  scroll?: ModalScroll;
  backdrop?: ModalBackdrop;
  /**
   * A close button in the corner, rendered after the content so initial focus lands on the first
   * control. Keep it unless the content has another close button. Defaults to true.
   */
  showCloseButton?: boolean;
  /** The close button's accessible name. Defaults to "Close". */
  closeLabel?: string;
  /** Set `container` to render the modal under a themed (`.dark`) element. */
  portalProps?: Dialog.Portal.Props;
  backdropProps?: Omit<Dialog.Backdrop.Props, 'children'>;
  viewportProps?: Omit<Dialog.Viewport.Props, 'children'>;
  /** Turns motion off. `false` cannot override `prefers-reduced-motion` or `MotionProvider`. */
  reduceMotion?: boolean;
}

/** The modal popup, with portal, backdrop and the scrolling viewport included. Refs target the popup. */
export function ModalContent({
  ref, size = 'md', placement = 'center', scroll = 'inside', backdrop = 'opaque',
  showCloseButton = true, closeLabel = 'Close', portalProps, backdropProps, viewportProps,
  reduceMotion, className, children, ...props
}: ModalContentProps) {
  const reduced = useReducedMotion() || reduceMotion === true;
  return <Dialog.Portal {...portalProps}>
    <Dialog.Backdrop
      data-slot="modal-backdrop"
      data-backdrop={backdrop}
      {...backdropProps}
      className={stateClasses(modalBackdropVariants({ backdrop, reduceMotion: reduced }), backdropProps?.className)}
    />
    <Dialog.Viewport
      data-slot="modal-viewport"
      {...viewportProps}
      className={stateClasses(modalViewportVariants({ size }), viewportProps?.className)}
    >
      <Dialog.Popup
        data-slot="modal-content"
        data-size={size}
        data-placement={placement}
        data-scroll={scroll}
        data-reduced-motion={reduced || undefined}
        {...props}
        ref={ref}
        className={stateClasses(modalPopupVariants({ size, placement, scroll, reduceMotion: reduced }), className)}
      >
        {children}
        {showCloseButton && <ModalCloseButton label={closeLabel} />}
      </Dialog.Popup>
    </Dialog.Viewport>
  </Dialog.Portal>;
}

/** The corner close button; `ModalContent` renders it unless `showCloseButton` is off. */
export function ModalCloseButton({ label = 'Close', className }: { label?: string; className?: string }) {
  return <Dialog.Close
    data-slot="modal-close-button"
    render={<IconButton label={label} variant="ghost" size="sm" className={cn(modalCloseButtonClasses, className)}><HugeiconsIcon icon={Cancel01Icon} aria-hidden="true" strokeWidth={2.2} /></IconButton>}
  />;
}

export type ModalCloseProps = Dialog.Close.Props;
/** Closes the modal. Renders an outline button; pass `render` to use another element. */
export function ModalClose(props: ModalCloseProps) {
  return <Dialog.Close data-slot="modal-close" render={<Button variant="outline" />} {...props} />;
}

export function ModalHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="modal-header" {...props} className={cn(modalHeaderClasses, className)} />;
}

export type ModalTitleProps = Dialog.Title.Props;
export function ModalTitle({ className, ...props }: ModalTitleProps) {
  return <Dialog.Title data-slot="modal-title" {...props} className={stateClasses(modalTitleClasses, className)} />;
}

export type ModalDescriptionProps = Dialog.Description.Props;
export function ModalDescription({ className, ...props }: ModalDescriptionProps) {
  return <Dialog.Description data-slot="modal-description" {...props} className={stateClasses(modalDescriptionClasses, className)} />;
}

export function ModalBody({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="modal-body" {...props} className={cn(modalBodyClasses, className)} />;
}

export function ModalFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="modal-footer" {...props} className={cn(modalFooterClasses, className)} />;
}

/** An optional round badge for an icon above the title. Decorative: the title names the modal. */
export function ModalIcon({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="modal-icon" aria-hidden="true" {...props} className={cn(modalIconClasses, className)} />;
}
