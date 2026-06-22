// Expense category IDs come from categories.ts (food, transport, accommodation, etc.)
// matchKeys links each budget category to the expense.category values that count toward it.

export type BudgetCategoryDef = {
  name: string;
  icon: string;   // Ionicons name
  color: string;
  bg: string;
  matchKeys: string[];  // expense.category IDs that count toward this budget line
};

export const BUDGET_CATEGORIES: BudgetCategoryDef[] = [
  {
    name: 'Flights',
    icon: 'airplane-outline',
    color: '#6A9BD8',
    bg: '#EEF3FF',
    matchKeys: [],  // flights are usually booked outside the trip tracker
  },
  {
    name: 'Accommodation',
    icon: 'bed-outline',
    color: '#8B72BE',
    bg: '#F3F0FF',
    matchKeys: ['accommodation'],
  },
  {
    name: 'Airbnb',
    icon: 'home-outline',
    color: '#F4A261',
    bg: '#FFF8EE',
    matchKeys: ['accommodation'],
  },
  {
    name: 'Food & Dining',
    icon: 'restaurant-outline',
    color: '#FF6B5B',
    bg: '#FFF0EE',
    matchKeys: ['food', 'drinks'],
  },
  {
    name: 'Groceries',
    icon: 'cart-outline',
    color: '#57A85B',
    bg: '#F0F8F0',
    matchKeys: ['groceries'],
  },
  {
    name: 'Transportation',
    icon: 'car-outline',
    color: '#6A9BD8',
    bg: '#EEF3FF',
    matchKeys: ['transport'],
  },
  {
    name: 'Activities & Tours',
    icon: 'pricetag-outline',
    color: '#4BA3C3',
    bg: '#EEF8FF',
    matchKeys: ['activities', 'entertainment', 'tickets'],
  },
  {
    name: 'Shopping',
    icon: 'bag-outline',
    color: '#7FA68C',
    bg: '#F0F5F2',
    matchKeys: ['shopping'],
  },
  {
    name: 'Travel Insurance',
    icon: 'shield-checkmark-outline',
    color: '#5BC4C4',
    bg: '#EEFAFA',
    matchKeys: [],
  },
  {
    name: 'Miscellaneous',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#A0A0A0',
    bg: '#F5F5F5',
    matchKeys: ['other', 'tips', 'health'],
  },
  {
    name: 'Other',
    icon: 'ellipsis-horizontal-outline',
    color: '#A0A0A0',
    bg: '#F5F5F5',
    matchKeys: [],
  },
];

export const DEFAULT_BUDGET_CATEGORIES = ['Flights', 'Accommodation', 'Food & Dining'];

export function getBudgetCategoryDef(name: string): BudgetCategoryDef | undefined {
  return BUDGET_CATEGORIES.find((c) => c.name === name);
}
