import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateGroupColors(groupIds: string[]): Record<string, string> {
  const colors = [
    '#E0F2F1', // Teal Lighten 5
    '#FCE4EC', // Pink Lighten 5
    '#F1F8E9', // Light Green Lighten 5
    '#FFF8E1', // Amber Lighten 5
    '#E3F2FD', // Blue Lighten 5
    '#F3E5F5', // Purple Lighten 5
    '#FFF3E0', // Orange Lighten 5
    '#E8EAF6', // Indigo Lighten 5
  ];
  const groupColors: Record<string, string> = {};
  groupIds.forEach((id, index) => {
    groupColors[id] = colors[index % colors.length];
  });
  return groupColors;
}
