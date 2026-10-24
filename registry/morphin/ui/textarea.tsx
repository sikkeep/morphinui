'use client';

import { useCallback, useLayoutEffect, useRef, type ComponentProps, type CSSProperties } from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { cn } from '@/lib/utils';
import { useTypingSound } from '@/registry/morphin/lib/sound';
import { textFieldControlClasses, textFieldVariants, type TextFieldOptions } from '@/registry/morphin/ui/text-field-variants';
import { TextFieldFeedback, useTextFieldFeedback, type TextFieldFeedbackOptions } from '@/registry/morphin/ui/text-field-feedback';

export interface TextareaProps extends Omit<ComponentProps<'textarea'>, 'size'>, TextFieldOptions, TextFieldFeedbackOptions {
  /** Layout classes for the shell (like Input's className). The ref points to the native textarea. */
  className?: string;
  /** Classes for the native textarea (like Input's inputClassName). */
  textareaClassName?: string;
  /** Grow and shrink with content, between rows and maxRows. */
  autoResize?: boolean;
  /** The tallest the field gets, in lines: autoResize grows up to it and the resize grip stops there. Default 8. */
  maxRows?: number;
  /** Whether the user can drag the height. Default `vertical`; `autoResize` turns the grip off. */
  resize?: 'vertical' | 'none';
  onValueChange?: BaseField.Control.Props['onValueChange'];
}

export function Textarea({
  ref, size = 'md', rows = 3, autoResize = false, maxRows = 8, resize = 'vertical',
  className, textareaClassName, value, defaultValue, onChange, onValueChange, onKeyDown, style,
  id, name, disabled, required,
  hint, showCount, maxLength, 'aria-describedby': describedBy, ...props
}: TextareaProps) {
  const typing = useTypingSound();
  const localRef = useRef<HTMLTextAreaElement | null>(null);
  const feedback = useTextFieldFeedback(localRef, { value, defaultValue, hint, showCount, maxLength });
  const minimum = Math.max(1, rows);
  const maximum = Math.max(minimum, maxRows);
  const measure = useCallback(() => {
    const node = localRef.current;
    if (!node || !autoResize) return;
    const computed = getComputedStyle(node);
    const line = Number.parseFloat(computed.lineHeight);
    if (!Number.isFinite(line)) return;
    const padding = Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom);
    // The textarea has no border and uses border-box; its shell carries the border.
    node.style.height = '0px';
    const height = Math.max(line * minimum + padding, Math.min(node.scrollHeight, line * maximum + padding));
    node.style.height = `${height}px`;
    node.style.overflowY = node.scrollHeight > height ? 'auto' : 'hidden';
  }, [autoResize, minimum, maximum]);

  useLayoutEffect(() => {
    const node = localRef.current;
    if (!node || !autoResize) return;
    const oldHeight = node.style.height;
    const oldOverflow = node.style.overflowY;
    let frame = 0;
    let active = true;
    const schedule = () => { if (active) { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); } };
    let width = node.getBoundingClientRect().width;
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(entries => {
      const nextWidth = entries[0]?.contentRect.width;
      if (nextWidth !== width) { width = nextWidth; schedule(); }
    });
    measure();
    observer?.observe(node);
    node.form?.addEventListener('reset', schedule);
    window.addEventListener('resize', schedule);
    void document.fonts?.ready.then(schedule);
    return () => {
      active = false;
      observer?.disconnect();
      node.form?.removeEventListener('reset', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      node.style.height = oldHeight;
      node.style.overflowY = oldOverflow;
    };
  }, [autoResize, measure]);

  useLayoutEffect(measure, [measure, value, defaultValue, size]);

  const setRefs = useCallback((node: HTMLElement | null) => {
    localRef.current = node as HTMLTextAreaElement | null;
    if (typeof ref === 'function') ref(node as HTMLTextAreaElement | null);
    else if (ref) ref.current = node as HTMLTextAreaElement | null;
  }, [localRef, ref]);

  // The radius is capped at 20 px so tall content stays inside the corner shape. The min and max
  // heights keep the resize grip between `rows` and `maxRows` lines.
  return <span data-slot="textarea-field" className={cn('group/text-field flex w-full min-w-0 flex-col gap-2', className)}>
    <span data-slot="textarea-wrapper" data-size={size} className={cn(textFieldVariants({ size }), 'items-start [--field-radius:20px] p-1.5')}>
      <BaseField.Control
        data-slot="textarea"
        ref={setRefs}
        // These belong to the control, so a Field label's `for`, the disabled state and form data follow it.
        id={id}
        name={name}
        disabled={disabled}
        required={required}
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        aria-describedby={[describedBy, feedback.feedbackId].filter(Boolean).join(' ') || undefined}
        render={<textarea
          {...typing.fieldProps}
          {...props}
          maxLength={maxLength}
          rows={minimum}
          style={{ ...style, '--textarea-rows': minimum, '--textarea-max-rows': maximum } as CSSProperties}
          onChange={event => {
            onChange?.(event);
            if (value !== undefined) return;
            feedback.setText(event.currentTarget.value);
            measure();
          }}
          onKeyDown={event => {
            onKeyDown?.(event);
            if (!event.defaultPrevented) typing.onKeyDown?.(event);
          }}
        />}
        className={cn(
          textFieldControlClasses,
          'box-border px-[calc(var(--field-inset)-6px)] [--textarea-pad:max(0px,calc(var(--field-padding)-6px))] py-(--textarea-pad)',
          'min-h-[calc(var(--textarea-rows)*1lh+2*var(--textarea-pad))] max-h-[calc(var(--textarea-max-rows)*1lh+2*var(--textarea-pad))]',
          autoResize || resize === 'none' ? 'resize-none' : 'resize-y',
          textareaClassName,
        )}
      />
    </span>
    <TextFieldFeedback id={feedback.feedbackId} slot="textarea" hint={hint} count={feedback.count} length={feedback.length} maxLength={maxLength} />
  </span>;
}
