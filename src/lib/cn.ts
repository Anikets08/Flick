import { clsx, type ClassValue } from 'clsx';

// Plain clsx: no call site passes conflicting Tailwind classes, so
// tailwind-merge's conflict resolution (~26 KB) isn't needed.
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
