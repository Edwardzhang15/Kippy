export type PlanStackParamList = {
  PlanScreen:   undefined;
  CreatePlan:   undefined;
  PlanDetail:   { groupId: number };
  TripWizard:   undefined;
  EditTrip:     { groupId: number };
  Itinerary:    { groupId: number; totalDays: number };
  PackingList:  { groupId: number };
  BudgetPlan:   { groupId: number };
};

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
  EditTrip:    { groupId: number };
  Itinerary:   { groupId: number; totalDays: number };
  PackingList: { groupId: number };
  BudgetPlan:  { groupId: number };
};

export type InsightsStackParamList = {
  InsightsScreen: undefined;
  EditTrip:       { groupId: number };
};
