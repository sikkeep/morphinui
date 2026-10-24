'use client';

import { useCallback, useRef, type ReactNode } from 'react';
import { Input as BaseInput } from '@base-ui/react/input';
import { cn } from '@/lib/utils';
import { useTypingSound } from '@/registry/morphin/lib/sound';
import { textFieldControlClasses, textFieldVariants, type TextFieldOptions } from '@/registry/morphin/ui/text-field-variants';
import { TextFieldFeedback, useTextFieldFeedback, type TextFieldFeedbackOptions } from '@/registry/morphin/ui/text-field-feedback';

export interface InputProps extends Omit<BaseInput.Props, 'size' | 'className'>, TextFieldOptions, TextFieldFeedbackOptions {
  /** Layout classes for the shell. The ref points to the native input. */
  className?: string;
  /** Classes for the native input. */
  inputClassName?: BaseInput.Props['className'];
  /** Decorative icons. Use a separate labelled button for an interactive action. */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export function Input({
  ref, size = 'md', className, inputClassName, leadingIcon, trailingIcon,
  hint, showCount, value, defaultValue, maxLength, onChange, onKeyDown, 'aria-describedby': describedBy, ...props
}: InputProps) {
  const typing = useTypingSound();
  const localRef = useRef<HTMLInputElement | null>(null);
  const feedback = useTextFieldFeedback(localRef, { value, defaultValue, hint, showCount, maxLength });
  const setRefs = useCallback((node: HTMLElement | null) => {
    localRef.current = node as HTMLInputElement | null;
    if (typeof ref === 'function') ref(node as HTMLInputElement | null);
    else if (ref) ref.current = node as HTMLInputElement | null;
  }, [localRef, ref]);
  const control = cn(textFieldControlClasses, 'h-[calc(var(--field-height)-2px)] py-0');
  return <span data-slot="input-field" className={cn('group/text-field flex w-full min-w-0 flex-col gap-2', className)}>
    <span data-slot="input-wrapper" data-size={size} className={textFieldVariants({ size })}>
      {leadingIcon && <span data-slot="input-icon" data-icon="inline-start" aria-hidden="true">{leadingIcon}</span>}
      <BaseInput
        data-slot="input"
        {...typing.fieldProps}
        {...props}
        ref={setRefs}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-describedby={[describedBy, feedback.feedbackId].filter(Boolean).join(' ') || undefined}
        onChange={event => {
          onChange?.(event);
          if (value === undefined) feedback.setText(event.currentTarget.value);
        }}
        onKeyDown={event => {
          onKeyDown?.(event);
          if (!event.defaultPrevented) typing.onKeyDown?.(event);
        }}
        className={typeof inputClassName === 'function' ? state => cn(control, inputClassName(state)) : cn(control, inputClassName)}
      />
      {trailingIcon && <span data-slot="input-icon" data-icon="inline-end" aria-hidden="true">{trailingIcon}</span>}
    </span>
    <TextFieldFeedback id={feedback.feedbackId} slot="input" hint={hint} count={feedback.count} length={feedback.length} maxLength={maxLength} />
  </span>;
}
