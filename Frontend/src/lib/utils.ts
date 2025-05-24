import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Map backend content style to frontend category
export function mapContentStyleToCategory(contentStyle: string): string {
  switch (contentStyle.toLowerCase()) {
    case 'blog post':
      return 'blog-style';
    case 'detailed report':
      return 'detailed-report';
    case 'executive summary':
      return 'executive-summary';
    default:
      return 'blog-style';
  }
}

// Map frontend category to backend style number
export function mapCategoryToStyleNumber(category: string): number {
  switch (category) {
    case 'blog-style':
      return 1;
    case 'detailed-report':
      return 2;
    case 'executive-summary':
      return 3;
    default:
      return 1;
  }
}
