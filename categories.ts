import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export type Category = {
  id: string;
  label: string;
  icon: IoniconName;
  color: string;
  bg: string;
};

export const CATEGORIES: Category[] = [
  { id: 'food',          label: 'Food',          icon: 'restaurant-outline',                 color: '#FF6B5B', bg: '#FFF0EE' },
  { id: 'transport',     label: 'Transport',     icon: 'car-outline',                        color: '#6A9BD8', bg: '#EEF3FF' },
  { id: 'accommodation', label: 'Accommodation', icon: 'bed-outline',                        color: '#8B72BE', bg: '#F3F0FF' },
  { id: 'shopping',      label: 'Shopping',      icon: 'bag-outline',                        color: '#7FA68C', bg: '#F0F5F2' },
  { id: 'entertainment', label: 'Entertainment', icon: 'film-outline',                       color: '#F4A261', bg: '#FFF8EE' },
  { id: 'groceries',     label: 'Groceries',     icon: 'cart-outline',                       color: '#57A85B', bg: '#F0F8F0' },
  { id: 'drinks',        label: 'Drinks',        icon: 'wine-outline',                       color: '#E8A838', bg: '#FFF8E8' },
  { id: 'activities',    label: 'Activities',    icon: 'bicycle-outline',                    color: '#4BA3C3', bg: '#EEF8FF' },
  { id: 'tickets',       label: 'Tickets',       icon: 'pricetag-outline',                   color: '#C35A7A', bg: '#FFF0F5' },
  { id: 'health',        label: 'Health',        icon: 'heart-outline',                      color: '#E05E5E', bg: '#FFF0F0' },
  { id: 'tips',          label: 'Tips',          icon: 'cash-outline',                       color: '#9E8B6E', bg: '#FDF8F0' },
  { id: 'other',         label: 'Other',         icon: 'ellipsis-horizontal-circle-outline', color: '#A0A0A0', bg: '#F5F5F5' },
];

export const CATEGORY_MAP: Record<string, Category> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
);

export const FALLBACK_CATEGORY = {
  icon: 'receipt-outline' as IoniconName,
  color: '#A0A0A0',
  bg: '#F5F5F5',
};
