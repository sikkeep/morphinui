'use client';

import { useEffect, useId, useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';

export interface TextFieldFeedbackOptions {
  /** Help text below the control, associated with aria-describedby. */
  hint?: ReactNode;
  /** Defaults to true when maxLength is set. Can also show an unlimited count. */
  showCount?: boolean;
}

type TextControl = HTMLInputElement | HTMLTextAreaElement;

/** Mirrors uncontrolled edits and native form resets; controlled values remain authoritative. */
export function useTextFieldFeedback<T extends TextControl>(ref: RefObject<T | null>, { value, defaultValue, hint, maxLength, showCount }: TextFieldFeedbackOptions & {
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
  maxLength?: number;
}) {
  const id = useId();
  const [text, setText] = useState(() => String(defaultValue ?? ''));
  const count = showCount ?? (maxLength !== undefined && maxLength >= 0);
  const hasFeedback = hint != null || count;

  useLayoutEffect(() => {
    if (value === undefined && ref.current) setText(ref.current.value);
  }, [ref, value, defaultValue]);

  useEffect(() => {
    const node = ref.current;
    const form = node?.form;
    if (!node || !form || value !== undefined) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // A reset fires before the form restores its fields, and a microtask is not late enough, so read
    // the value on the next task.
    const reset = (event: Event) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (!event.defaultPrevented) setText(node.value);
      }, 0);
    };
    form.addEventListener('reset', reset);
    return () => { clearTimeout(timer); form.removeEventListener('reset', reset); };
  }, [ref, value]);

  return { feedbackId: hasFeedback ? id : undefined, count, length: String(value ?? text).length, setText };
}

export function TextFieldFeedback({ id, slot, hint, count, length, maxLength }: TextFieldFeedbackOptions & {
  id?: string;
  slot: 'input' | 'textarea';
  count: boolean;
  length: number;
  maxLength?: number;
}) {
  if (!id) return null;
  return <span id={id} data-slot={`${slot}-feedback`} className="flex min-w-0 items-start justify-between gap-3 px-1 text-xs text-muted-foreground group-has-[[aria-invalid=true]]/text-field:text-destructive group-has-[[data-invalid]]/text-field:text-destructive group-has-[:disabled]/text-field:text-disabled-foreground">
    {hint != null && <span data-slot={`${slot}-hint`} className="min-w-0">{hint}</span>}
    {hint != null && count ? ' ' : null}
    {count && <span data-slot={`${slot}-counter`} className="ms-auto shrink-0 tabular-nums">{length}{maxLength !== undefined && maxLength >= 0 ? `/${maxLength}` : ''}</span>}
  </span>;
}
