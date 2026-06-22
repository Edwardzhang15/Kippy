export type Member = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  balance: number;
};

export type Expense = {
  id: string;
  title: string;
  category: 'food' | 'transport' | 'shopping' | 'entertainment';
  amount: number;
  currency: string;
  paidBy: string;
  date: string;
};

export type Group = {
  id: string;
  name: string;
  totalSpent: number;
  currency: string;
  members: Member[];
  expenses: Expense[];
};

export const MOCK_GROUPS: Group[] = [
  {
    id: '1',
    name: 'Tokyo Trip',
    totalSpent: 1234,
    currency: 'CAD',
    members: [
      { id: 'm1', name: 'Alex',   initials: 'AL', avatarColor: '#FF6B5B', balance: 150 },
      { id: 'm2', name: 'Jordan', initials: 'JO', avatarColor: '#7FA68C', balance: -75 },
      { id: 'm3', name: 'Sam',    initials: 'SA', avatarColor: '#6A9BD8', balance: -75 },
    ],
    expenses: [
      { id: 'e1', title: 'Dinner at Ramen House', category: 'food',          amount: 120, currency: 'CAD', paidBy: 'Alex',   date: 'Dec 14' },
      { id: 'e2', title: 'Train tickets',          category: 'transport',     amount: 45,  currency: 'CAD', paidBy: 'Jordan', date: 'Dec 15' },
      { id: 'e3', title: 'Convenience store',      category: 'shopping',      amount: 30,  currency: 'CAD', paidBy: 'Sam',    date: 'Dec 15' },
      { id: 'e4', title: 'Karaoke night',          category: 'entertainment', amount: 180, currency: 'CAD', paidBy: 'Alex',   date: 'Dec 16' },
    ],
  },
  {
    id: '2',
    name: 'Roommates',
    totalSpent: 567,
    currency: 'CAD',
    members: [
      { id: 'm1', name: 'Alex', initials: 'AL', avatarColor: '#FF6B5B', balance: 120 },
      { id: 'm2', name: 'Sam',  initials: 'SA', avatarColor: '#6A9BD8', balance: -120 },
    ],
    expenses: [
      { id: 'e1', title: 'Groceries',    category: 'shopping', amount: 95,  currency: 'CAD', paidBy: 'Alex', date: 'Dec 10' },
      { id: 'e2', title: 'Uber Eats',    category: 'food',     amount: 42,  currency: 'CAD', paidBy: 'Sam',  date: 'Dec 12' },
      { id: 'e3', title: 'Internet bill', category: 'shopping', amount: 80, currency: 'CAD', paidBy: 'Alex', date: 'Dec 13' },
      { id: 'e4', title: 'Movie night',  category: 'entertainment', amount: 35, currency: 'CAD', paidBy: 'Sam', date: 'Dec 18' },
    ],
  },
];
