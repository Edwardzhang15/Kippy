export type HomeStackParamList = {
  HomeScreen: { initialTab?: 'active' | 'archived' };
  GroupDetail: { groupId: number };
  AddExpense:  { groupId: number; expenseId?: number };
  CreateGroup: undefined;
  CreateSubgroup: { groupId: number };
  SettleUp: {
    groupId: number;
    memberId: number;
    memberName: string;
    balance: number;
    avatarIndex: number;
    currency: string;
  };
  MemberExpenses: {
    groupId: number;
    memberId: number;
    memberName: string;
    avatarIndex: number;
    balance: number;
    groupCurrency: string;
  };
  EditTrip:    { groupId: number };
  Itinerary:   { groupId: number; totalDays: number };
  PackingList: { groupId: number };
  BudgetPlan:  { groupId: number };
  Explore:     { groupId: number; destination: string };
};

export type InsightsStackParamList = {
  InsightsScreen: undefined;
  EditTrip:       { groupId: number };
};

export type PersonalStackParamList = {
  PersonalMain:           undefined;
  CreatePersonalTrip:     { tripId?: number };
  PersonalTripDetail:     { tripId: number };
  AddPersonalTripExpense: { tripId: number; expenseId?: number };
  ManageCategoryBudgets:  { tripId: number };
};
