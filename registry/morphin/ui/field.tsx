'use client';

import type { ComponentProps } from 'react';
import { Field as BaseField } from '@base-ui/react/field';
import { cn } from '@/lib/utils';

function classes<State>(base: string, custom?: string | ((state: State) => string | undefined)) {
  return typeof custom === 'function' ? (state: State) => cn(base, custom(state)) : cn(base, custom);
}

export function Field({ className, ...props }: BaseField.Root.Props) {
  return <BaseField.Root data-slot="field" {...props} className={classes('group/field flex min-w-0 flex-col gap-2', className)} />;
}

export function FieldGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="field-group" {...props} className={cn('flex w-full min-w-0 flex-col gap-6', className)} />;
}

export function FieldLabel({ className, ...props }: BaseField.Label.Props) {
  return <BaseField.Label data-slot="field-label" {...props} className={classes('text-sm font-medium text-foreground group-data-disabled/field:text-disabled-foreground', className)} />;
}

export function FieldDescription({ className, ...props }: BaseField.Description.Props) {
  return <BaseField.Description data-slot="field-description" {...props} className={classes('text-xs text-muted-foreground group-data-disabled/field:text-disabled-foreground', className)} />;
}

export function FieldError({ className, ...props }: BaseField.Error.Props) {
  return <BaseField.Error data-slot="field-error" {...props} className={classes('text-xs text-destructive', className)} />;
}
