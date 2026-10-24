import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// The standard shadcn/ui helper. Registry items import it as `@/lib/utils`, and the shadcn CLI
// installs the same file in a project through the built-in `utils` item.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
