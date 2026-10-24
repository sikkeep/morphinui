import { cn } from '@/lib/utils';
import { buttonClasses, type ButtonOptions } from '@/registry/morphin/ui/button-variants';

export type SelectTriggerOptions = Pick<ButtonOptions, 'variant' | 'size' | 'fullWidth'>;

/**
 * Trigger classes built on the button recipe, so a select matches the buttons beside it. The
 * `outline` trigger uses the text-field fill and border to match the inputs of a form.
 */
export function selectTriggerClasses({ variant = 'outline', size = 'md', fullWidth }: SelectTriggerOptions = {}, className?: string) {
  return cn(
    // A select does not shrink on press.
    buttonClasses({ variant, size, fullWidth, static: true }),
    // Like a text field: the fill stays constant and the border responds to hover and the open state.
    variant === 'outline' && 'border-field-border bg-field [--button-hover:var(--field)] [--button-active:var(--field)] not-data-disabled:hover:border-ring/50 aria-expanded:border-ring/50',
    'min-w-0 justify-between text-start data-placeholder:text-muted-foreground',
    className,
  );
}
