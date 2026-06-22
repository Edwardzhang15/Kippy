import * as SQLite from 'expo-sqlite';
import { getCachedRates, convertAmount } from './currencyRates';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Group = {
  id: number;
  name: string;
  currency: string;
  is_archived: number;  // 0 = active/planning, 1 = archived
  is_planning: number;  // 1 = trip-in-planning, 0 = active or archived
  destination: string | null;
  destination_photo_url: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  budget_per_person: number | null;
};

export type Member = {
  id: number;
  group_id: number;
  name: string;
};

export type MemberWithBalance = Member & {
  balance: number;
};

export type Expense = {
  id: number;
  group_id: number;
  amount: number;
  currency: string;
  category: string;
  custom_category: string | null;
  paid_by: number;
  paid_by_name: string;
  date: string;
  note: string | null;
  receipt_photo_uri: string | null;
};

export type GroupDetails = Group & {
  totalSpent: number;
  members: MemberWithBalance[];
  expenses: Expense[];
};

export type Subgroup = {
  id: number;
  group_id: number;
  name: string;
};

export type SubgroupWithMembers = Subgroup & {
  members: Pick<Member, 'id' | 'name'>[];
};

export type Settlement = {
  id: number;
  group_id: number;
  member_id: number;
  amount: number;
  date: string;
};

export type SuggestedTransaction = {
  fromId:   number;
  fromName: string;
  toId:     number;
  toName:   string;
  amount:   number;
};

export type ItineraryItem = {
  id: number;
  group_id: number;
  day_number: number;
  title: string;
  start_time: number;
  duration_minutes: number;
  note: string | null;
  location_name: string | null;
  is_anchor: number;
  google_maps_url: string | null;
  activity_type: string | null;
};

export type PackingItem = {
  id: number;
  group_id: number;
  label: string;
  category: string;
  is_checked: number;
  label_key: string | null;
};

export type BudgetItem = {
  id: number;
  group_id: number;
  category: string;       // display name, e.g. "Flights"
  planned_amount: number;
  icon: string;            // Ionicons name
};

// ─── Connection ───────────────────────────────────────────────────────────────

let db: SQLite.SQLiteDatabase;

// ─── Init ─────────────────────────────────────────────────────────────────────

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('expense_splitter.db');

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS groups (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      name     TEXT    NOT NULL,
      currency TEXT    NOT NULL DEFAULT 'CAD'
    );

    CREATE TABLE IF NOT EXISTS members (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
      amount   REAL    NOT NULL,
      currency TEXT    NOT NULL,
      category TEXT    NOT NULL,
      paid_by  INTEGER NOT NULL REFERENCES members(id),
      date     TEXT    NOT NULL,
      note     TEXT
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id   INTEGER NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      member_id    INTEGER NOT NULL REFERENCES members(id),
      share_amount REAL    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id  INTEGER NOT NULL REFERENCES groups(id)  ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      amount    REAL    NOT NULL,
      date      TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subgroups (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
      name     TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS subgroup_members (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      subgroup_id INTEGER NOT NULL REFERENCES subgroups(id) ON DELETE CASCADE,
      member_id   INTEGER NOT NULL REFERENCES members(id)   ON DELETE CASCADE
    );
  `);

  // Migration v1: add custom_category to expenses
  try {
    await db.execAsync('ALTER TABLE expenses ADD COLUMN custom_category TEXT;');
  } catch { /* column already exists */ }

  // Migration v2: add is_archived to groups
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0;');
  } catch { /* column already exists */ }

  // Migration v3: add destination columns to groups
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN destination TEXT;');
  } catch { /* column already exists */ }
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN destination_photo_url TEXT;');
  } catch { /* column already exists */ }

  // Migration v4: add planning columns to groups
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN is_planning INTEGER NOT NULL DEFAULT 0;');
  } catch { /* column already exists */ }
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN planned_start_date TEXT;');
  } catch { /* column already exists */ }
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN planned_end_date TEXT;');
  } catch { /* column already exists */ }
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN budget_per_person REAL;');
  } catch { /* column already exists */ }

  // Migration v5: itinerary items
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS itinerary_items (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id         INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        day_number       INTEGER NOT NULL,
        title            TEXT    NOT NULL,
        start_time       INTEGER NOT NULL DEFAULT 540,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        note             TEXT,
        location_name    TEXT,
        is_anchor        INTEGER NOT NULL DEFAULT 0
      );
    `);
  } catch { /* table already exists */ }

  // Migration v6: packing list items
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS packing_items (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        label      TEXT    NOT NULL,
        category   TEXT    NOT NULL,
        is_checked INTEGER NOT NULL DEFAULT 0
      );
    `);
  } catch { /* table already exists */ }

  // Migration v8: google maps URL on itinerary items
  try {
    await db.execAsync('ALTER TABLE itinerary_items ADD COLUMN google_maps_url TEXT;');
  } catch { /* column already exists */ }

  // Migration v9: activity type on itinerary items
  try {
    await db.execAsync('ALTER TABLE itinerary_items ADD COLUMN activity_type TEXT;');
  } catch { /* column already exists */ }

  // Migration v10: label_key for i18n on packing items
  try {
    await db.execAsync('ALTER TABLE packing_items ADD COLUMN label_key TEXT;');
  } catch { /* column already exists */ }

  // Migration v11: receipt photo URI on expenses
  try {
    await db.execAsync('ALTER TABLE expenses ADD COLUMN receipt_photo_uri TEXT;');
  } catch { /* column already exists */ }

  // Migration v12: paid_currency and paid_amount on settlements (for cross-currency settle-up)
  try {
    await db.execAsync('ALTER TABLE settlements ADD COLUMN paid_currency TEXT;');
  } catch { /* column already exists */ }
  try {
    await db.execAsync('ALTER TABLE settlements ADD COLUMN paid_amount REAL;');
  } catch { /* column already exists */ }

  // Migration v7: budget plan items
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS budget_items (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id       INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        category       TEXT    NOT NULL,
        planned_amount REAL    NOT NULL DEFAULT 0,
        icon           TEXT    NOT NULL
      );
    `);
  } catch { /* table already exists */ }
}

// ─── Writes ───────────────────────────────────────────────────────────────────

export async function archiveGroup(groupId: number): Promise<void> {
  await db.runAsync('UPDATE groups SET is_archived = 1 WHERE id = ?', groupId);
}

export async function unarchiveGroup(groupId: number): Promise<void> {
  await db.runAsync('UPDATE groups SET is_archived = 0 WHERE id = ?', groupId);
}

export async function deleteGroup(groupId: number): Promise<void> {
  // PRAGMA foreign_keys = ON (set at init) cascades to members, expenses,
  // expense_splits, settlements, subgroups, and subgroup_members automatically.
  await db.runAsync('DELETE FROM groups WHERE id = ?', groupId);
}

export async function getGroup(groupId: number): Promise<Group | null> {
  return db.getFirstAsync<Group>('SELECT * FROM groups WHERE id = ?', groupId);
}

export type GroupUpdates = {
  name?: string;
  destination?: string | null;
  destination_photo_url?: string | null;
  currency?: string;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  budget_per_person?: number | null;
};

export async function updateGroup(groupId: number, updates: GroupUpdates): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if ('name' in updates)                  { fields.push('name = ?');                  values.push(updates.name!); }
  if ('destination' in updates)           { fields.push('destination = ?');           values.push(updates.destination ?? null); }
  if ('destination_photo_url' in updates) { fields.push('destination_photo_url = ?'); values.push(updates.destination_photo_url ?? null); }
  if ('currency' in updates)              { fields.push('currency = ?');              values.push(updates.currency!); }
  if ('planned_start_date' in updates)    { fields.push('planned_start_date = ?');    values.push(updates.planned_start_date ?? null); }
  if ('planned_end_date' in updates)      { fields.push('planned_end_date = ?');      values.push(updates.planned_end_date ?? null); }
  if ('budget_per_person' in updates)     { fields.push('budget_per_person = ?');     values.push(updates.budget_per_person ?? null); }
  if (fields.length === 0) return;
  await db.runAsync(`UPDATE groups SET ${fields.join(', ')} WHERE id = ?`, ...values, groupId);
}

export async function getItineraryItems(groupId: number, dayNumber: number): Promise<ItineraryItem[]> {
  return db.getAllAsync<ItineraryItem>(
    'SELECT * FROM itinerary_items WHERE group_id = ? AND day_number = ? ORDER BY start_time ASC',
    groupId, dayNumber,
  );
}

export async function addItineraryItem(item: Omit<ItineraryItem, 'id'>): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO itinerary_items (group_id, day_number, title, start_time, duration_minutes, note, location_name, is_anchor, google_maps_url, activity_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    item.group_id, item.day_number, item.title, item.start_time, item.duration_minutes,
    item.note ?? null, item.location_name ?? null, item.is_anchor, item.google_maps_url ?? null,
    item.activity_type ?? null,
  );
  return result.lastInsertRowId;
}

export async function updateItineraryItem(id: number, updates: Partial<Omit<ItineraryItem, 'id' | 'group_id'>>): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if ('title' in updates)            { fields.push('title = ?');            values.push(updates.title!); }
  if ('start_time' in updates)       { fields.push('start_time = ?');       values.push(updates.start_time!); }
  if ('duration_minutes' in updates) { fields.push('duration_minutes = ?'); values.push(updates.duration_minutes!); }
  if ('note' in updates)             { fields.push('note = ?');             values.push(updates.note ?? null); }
  if ('location_name' in updates)    { fields.push('location_name = ?');    values.push(updates.location_name ?? null); }
  if ('is_anchor' in updates)        { fields.push('is_anchor = ?');        values.push(updates.is_anchor!); }
  if ('google_maps_url' in updates)  { fields.push('google_maps_url = ?');  values.push(updates.google_maps_url ?? null); }
  if ('activity_type' in updates)    { fields.push('activity_type = ?');    values.push(updates.activity_type ?? null); }
  if (fields.length === 0) return;
  await db.runAsync(`UPDATE itinerary_items SET ${fields.join(', ')} WHERE id = ?`, ...values, id);
}

export async function deleteItineraryItem(id: number): Promise<void> {
  await db.runAsync('DELETE FROM itinerary_items WHERE id = ?', id);
}

// ─── Packing items ────────────────────────────────────────────────────────────

export async function getPackingItems(groupId: number): Promise<PackingItem[]> {
  return db.getAllAsync<PackingItem>(
    'SELECT * FROM packing_items WHERE group_id = ? ORDER BY category ASC, id ASC',
    groupId,
  );
}

export async function setPackingItems(
  groupId: number,
  items: { label: string; category: string; labelKey?: string }[],
): Promise<void> {
  await db.runAsync('DELETE FROM packing_items WHERE group_id = ?', groupId);
  for (const item of items) {
    await db.runAsync(
      'INSERT INTO packing_items (group_id, label, category, label_key) VALUES (?, ?, ?, ?)',
      groupId, item.label, item.category, item.labelKey ?? null,
    );
  }
}

export async function togglePackingItem(id: number, checked: boolean): Promise<void> {
  await db.runAsync('UPDATE packing_items SET is_checked = ? WHERE id = ?', checked ? 1 : 0, id);
}

export async function addPackingItem(
  groupId: number,
  label: string,
  category: string,
  labelKey?: string,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO packing_items (group_id, label, category, label_key) VALUES (?, ?, ?, ?)',
    groupId, label, category, labelKey ?? null,
  );
  return result.lastInsertRowId;
}

export async function deletePackingItem(id: number): Promise<void> {
  await db.runAsync('DELETE FROM packing_items WHERE id = ?', id);
}

// ─── Budget items ─────────────────────────────────────────────────────────────

export async function getBudgetItems(groupId: number): Promise<BudgetItem[]> {
  return db.getAllAsync<BudgetItem>(
    'SELECT * FROM budget_items WHERE group_id = ? ORDER BY id ASC',
    groupId,
  );
}

export async function addBudgetItem(
  groupId: number,
  category: string,
  plannedAmount: number,
  icon: string,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO budget_items (group_id, category, planned_amount, icon) VALUES (?, ?, ?, ?)',
    groupId, category, plannedAmount, icon,
  );
  return result.lastInsertRowId;
}

export async function updateBudgetItem(id: number, plannedAmount: number): Promise<void> {
  await db.runAsync('UPDATE budget_items SET planned_amount = ? WHERE id = ?', plannedAmount, id);
}

export async function deleteBudgetItem(id: number): Promise<void> {
  await db.runAsync('DELETE FROM budget_items WHERE id = ?', id);
}

export async function createGroup(
  name: string,
  currency: string,
  destination?: string,
  destinationPhotoUrl?: string,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO groups (name, currency, destination, destination_photo_url) VALUES (?, ?, ?, ?)',
    name, currency, destination ?? null, destinationPhotoUrl ?? null,
  );
  return result.lastInsertRowId;
}

export async function addMember(groupId: number, name: string): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO members (group_id, name) VALUES (?, ?)',
    groupId, name,
  );
  return result.lastInsertRowId;
}

export async function getMembers(groupId: number): Promise<{ id: number; name: string }[]> {
  return db.getAllAsync<{ id: number; name: string }>(
    'SELECT id, name FROM members WHERE group_id = ? ORDER BY id ASC',
    groupId,
  );
}

export async function updateMemberName(memberId: number, name: string): Promise<void> {
  await db.runAsync('UPDATE members SET name = ? WHERE id = ?', name, memberId);
}

export async function getMemberHasExpenses(memberId: number): Promise<boolean> {
  const row = await db.getFirstAsync<{ cnt: number }>(
    `SELECT (
      (SELECT COUNT(*) FROM expenses WHERE paid_by = ?) +
      (SELECT COUNT(*) FROM expense_splits WHERE member_id = ?)
    ) AS cnt`,
    memberId, memberId,
  );
  return (row?.cnt ?? 0) > 0;
}

export async function deleteMember(memberId: number): Promise<void> {
  await db.runAsync('DELETE FROM members WHERE id = ?', memberId);
}

export async function addExpense(
  groupId: number,
  amount: number,
  currency: string,
  category: string,
  paidBy: number,
  date: string,
  splitMemberIds: number[],
  note?: string,
  customCategory?: string,
  receiptPhotoUri?: string,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO expenses (group_id, amount, currency, category, paid_by, date, note, custom_category, receipt_photo_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    groupId, amount, currency, category, paidBy, date, note ?? null, customCategory ?? null, receiptPhotoUri ?? null,
  );
  const expenseId = result.lastInsertRowId;

  const shareAmount = round2(amount / splitMemberIds.length);

  for (const memberId of splitMemberIds) {
    await db.runAsync(
      'INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES (?, ?, ?)',
      expenseId, memberId, shareAmount,
    );
  }

  return expenseId;
}

export type ExpenseDetail = Expense & { splitMemberIds: number[] };

export async function getExpense(expenseId: number): Promise<ExpenseDetail | null> {
  const expense = await db.getFirstAsync<Expense>(
    `SELECT e.*, m.name AS paid_by_name
     FROM expenses e
     JOIN members m ON e.paid_by = m.id
     WHERE e.id = ?`,
    expenseId,
  );
  if (!expense) return null;
  const splitRows = await db.getAllAsync<{ member_id: number }>(
    'SELECT member_id FROM expense_splits WHERE expense_id = ?',
    expenseId,
  );
  return { ...expense, splitMemberIds: splitRows.map((r) => r.member_id) };
}

export async function updateExpense(
  expenseId: number,
  updates: {
    amount: number;
    currency?: string;
    category: string;
    paidBy: number;
    date: string;
    splitMemberIds: number[];
    customCategory?: string;
    receiptPhotoUri: string | null;
  },
): Promise<void> {
  const currencyClause = updates.currency ? ', currency = ?' : '';
  const currencyArg    = updates.currency ? [updates.currency] : [];
  await db.runAsync(
    `UPDATE expenses
     SET amount = ?, category = ?, paid_by = ?, date = ?, custom_category = ?, receipt_photo_uri = ?${currencyClause}
     WHERE id = ?`,
    updates.amount, updates.category, updates.paidBy, updates.date,
    updates.customCategory ?? null, updates.receiptPhotoUri,
    ...currencyArg,
    expenseId,
  );
  await db.runAsync('DELETE FROM expense_splits WHERE expense_id = ?', expenseId);
  const shareAmount = round2(updates.amount / updates.splitMemberIds.length);
  for (const memberId of updates.splitMemberIds) {
    await db.runAsync(
      'INSERT INTO expense_splits (expense_id, member_id, share_amount) VALUES (?, ?, ?)',
      expenseId, memberId, shareAmount,
    );
  }
}

export async function deleteExpense(expenseId: number): Promise<void> {
  await db.runAsync('DELETE FROM expenses WHERE id = ?', expenseId);
}

export async function createSubgroup(
  groupId: number,
  name: string,
  memberIds: number[],
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO subgroups (group_id, name) VALUES (?, ?)',
    groupId, name,
  );
  const subgroupId = result.lastInsertRowId;
  for (const memberId of memberIds) {
    await db.runAsync(
      'INSERT INTO subgroup_members (subgroup_id, member_id) VALUES (?, ?)',
      subgroupId, memberId,
    );
  }
  return subgroupId;
}

export async function deleteSubgroup(subgroupId: number): Promise<void> {
  await db.runAsync('DELETE FROM subgroups WHERE id = ?', subgroupId);
}

export async function getSubgroups(groupId: number): Promise<SubgroupWithMembers[]> {
  const subgroups = await db.getAllAsync<Subgroup>(
    'SELECT * FROM subgroups WHERE group_id = ? ORDER BY id ASC',
    groupId,
  );
  return Promise.all(
    subgroups.map(async (sg) => {
      const members = await db.getAllAsync<Pick<Member, 'id' | 'name'>>(
        `SELECT m.id, m.name FROM members m
         JOIN subgroup_members sm ON sm.member_id = m.id
         WHERE sm.subgroup_id = ?
         ORDER BY m.id ASC`,
        sg.id,
      );
      return { ...sg, members };
    }),
  );
}

export async function recordSettlement(
  groupId: number,
  memberId: number,
  amount: number,
  date: string,
  paidCurrency?: string,
  paidAmount?: number,
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO settlements (group_id, member_id, amount, date, paid_currency, paid_amount) VALUES (?, ?, ?, ?, ?, ?)',
    groupId, memberId, amount, date, paidCurrency ?? null, paidAmount ?? null,
  );
  return result.lastInsertRowId;
}

// ─── Insights reads ───────────────────────────────────────────────────────────

export type ExpenseForInsights = {
  id: number;
  amount: number;
  currency: string;
  category: string;
  custom_category: string | null;
  date: string;
  note: string | null;
  group_name: string;
  paid_by_name: string;
};

export async function getExpensesForMonth(
  year: number,
  month: number,
): Promise<ExpenseForInsights[]> {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db.getAllAsync<ExpenseForInsights>(
    `SELECT e.id, e.amount, e.currency, e.category, e.custom_category,
            e.date, e.note, g.name AS group_name, m.name AS paid_by_name
     FROM expenses e
     JOIN groups g ON e.group_id = g.id
     JOIN members m ON e.paid_by = m.id
     WHERE e.date LIKE ?
     ORDER BY e.date ASC`,
    `${prefix}%`,
  );
}

// ─── Reads ────────────────────────────────────────────────────────────────────

export type GroupSummary = Group & {
  totalSpent: number;
  members: Pick<Member, 'id' | 'name'>[];
};

export async function getGroups(): Promise<Group[]> {
  return db.getAllAsync<Group>('SELECT * FROM groups ORDER BY id DESC');
}

export async function getGroupSummaries(archived = false): Promise<GroupSummary[]> {
  const groups = await db.getAllAsync<Group>(
    'SELECT * FROM groups WHERE is_archived = ? AND is_planning = 0 ORDER BY id DESC',
    archived ? 1 : 0,
  );
  return Promise.all(
    groups.map(async (group) => {
      const members = await db.getAllAsync<Pick<Member, 'id' | 'name'>>(
        'SELECT id, name FROM members WHERE group_id = ? ORDER BY id ASC',
        group.id,
      );
      const expRows = await db.getAllAsync<{ amount: number; currency: string }>(
        'SELECT amount, currency FROM expenses WHERE group_id = ?',
        group.id,
      );
      const rates = getCachedRates();
      const totalSpent = round2(expRows.reduce((sum, e) =>
        sum + (rates ? convertAmount(e.amount, e.currency, group.currency, rates) : e.amount), 0));
      return { ...group, totalSpent, members };
    }),
  );
}

export async function getAllTripSummaries(): Promise<GroupSummary[]> {
  const groups = await db.getAllAsync<Group>(
    'SELECT * FROM groups WHERE is_planning = 0 ORDER BY is_archived ASC, id DESC',
  );
  return Promise.all(
    groups.map(async (group) => {
      const members = await db.getAllAsync<Pick<Member, 'id' | 'name'>>(
        'SELECT id, name FROM members WHERE group_id = ? ORDER BY id ASC',
        group.id,
      );
      const expRows = await db.getAllAsync<{ amount: number; currency: string }>(
        'SELECT amount, currency FROM expenses WHERE group_id = ?',
        group.id,
      );
      const rates = getCachedRates();
      const totalSpent = round2(expRows.reduce((sum, e) =>
        sum + (rates ? convertAmount(e.amount, e.currency, group.currency, rates) : e.amount), 0));
      return { ...group, totalSpent, members };
    }),
  );
}

export async function getPlanSummaries(): Promise<GroupSummary[]> {
  const groups = await db.getAllAsync<Group>(
    'SELECT * FROM groups WHERE is_planning = 1 ORDER BY id DESC',
  );
  return Promise.all(
    groups.map(async (group) => {
      const members = await db.getAllAsync<Pick<Member, 'id' | 'name'>>(
        'SELECT id, name FROM members WHERE group_id = ? ORDER BY id ASC',
        group.id,
      );
      const expRows = await db.getAllAsync<{ amount: number; currency: string }>(
        'SELECT amount, currency FROM expenses WHERE group_id = ?',
        group.id,
      );
      const rates = getCachedRates();
      const totalSpent = round2(expRows.reduce((sum, e) =>
        sum + (rates ? convertAmount(e.amount, e.currency, group.currency, rates) : e.amount), 0));
      return { ...group, totalSpent, members };
    }),
  );
}

export async function createPlanTrip(
  name: string,
  currency: string,
  destination?: string,
  destinationPhotoUrl?: string,
  plannedStartDate?: string,
  plannedEndDate?: string,
  budgetPerPerson?: number,
): Promise<number> {
  const result = await db.runAsync(
    `INSERT INTO groups
       (name, currency, destination, destination_photo_url,
        planned_start_date, planned_end_date, budget_per_person, is_planning)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    name, currency,
    destination ?? null,
    destinationPhotoUrl ?? null,
    plannedStartDate ?? null,
    plannedEndDate ?? null,
    budgetPerPerson ?? null,
  );
  return result.lastInsertRowId;
}

export async function activatePlanTrip(groupId: number): Promise<void> {
  await db.runAsync('UPDATE groups SET is_planning = 0 WHERE id = ?', groupId);
}

export async function getGroupDetails(groupId: number): Promise<GroupDetails | null> {
  const group = await db.getFirstAsync<Group>(
    'SELECT * FROM groups WHERE id = ?', groupId,
  );
  if (!group) return null;

  const members = await db.getAllAsync<Member>(
    'SELECT * FROM members WHERE group_id = ? ORDER BY id ASC', groupId,
  );

  const expenses = await db.getAllAsync<Expense>(
    `SELECT e.*, m.name AS paid_by_name
     FROM expenses e
     JOIN members m ON e.paid_by = m.id
     WHERE e.group_id = ?
     ORDER BY e.date DESC, e.id DESC`,
    groupId,
  );

  const rates = getCachedRates();
  const gc    = group.currency;

  // paid map: total paid by each member, converted to group currency
  const paidMap = new Map<number, number>();
  for (const e of expenses) {
    const amt = rates ? convertAmount(e.amount, e.currency, gc, rates) : e.amount;
    paidMap.set(e.paid_by, (paidMap.get(e.paid_by) ?? 0) + amt);
  }

  // owed map: total owed by each member via expense splits, converted to group currency
  type SplitRow = { member_id: number; share_amount: number; currency: string };
  const splitRows = await db.getAllAsync<SplitRow>(
    `SELECT es.member_id, es.share_amount, e.currency
     FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.group_id = ?`,
    groupId,
  );
  const owedMap = new Map<number, number>();
  for (const s of splitRows) {
    const amt = rates ? convertAmount(s.share_amount, s.currency, gc, rates) : s.share_amount;
    owedMap.set(s.member_id, (owedMap.get(s.member_id) ?? 0) + amt);
  }

  // settled map: settlements are stored in group currency (balance value at settle time)
  const settleRows = await db.getAllAsync<{ member_id: number; total: number }>(
    'SELECT member_id, SUM(amount) AS total FROM settlements WHERE group_id = ? GROUP BY member_id',
    groupId,
  );
  const settledMap = new Map(settleRows.map((r) => [r.member_id, r.total]));

  const balanceMap: Record<number, number> = {};
  for (const m of members) {
    balanceMap[m.id] = round2(
      (paidMap.get(m.id) ?? 0) - (owedMap.get(m.id) ?? 0) - (settledMap.get(m.id) ?? 0),
    );
  }

  return {
    ...group,
    totalSpent: round2(expenses.reduce((sum, e) =>
      sum + (rates ? convertAmount(e.amount, e.currency, gc, rates) : e.amount), 0)),
    members: members.map((m) => ({ ...m, balance: balanceMap[m.id] ?? 0 })),
    expenses,
  };
}

// ─── Debt simplification ──────────────────────────────────────────────────────

// Greedy algorithm: repeatedly match the largest debtor with the largest
// creditor until all balances are zeroed. Produces the minimum number of
// transactions needed to settle the group.
export function simplifyDebts(members: MemberWithBalance[]): SuggestedTransaction[] {
  const EPSILON = 0.005; // treat sub-cent differences as zero

  const creditors = members
    .filter((m) => m.balance > EPSILON)
    .map((m) => ({ id: m.id, name: m.name, remaining: m.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const debtors = members
    .filter((m) => m.balance < -EPSILON)
    .map((m) => ({ id: m.id, name: m.name, remaining: -m.balance }))
    .sort((a, b) => b.remaining - a.remaining);

  const transactions: SuggestedTransaction[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const amount = round2(Math.min(creditors[ci].remaining, debtors[di].remaining));

    transactions.push({
      fromId:   debtors[di].id,
      fromName: debtors[di].name,
      toId:     creditors[ci].id,
      toName:   creditors[ci].name,
      amount,
    });

    creditors[ci].remaining = round2(creditors[ci].remaining - amount);
    debtors[di].remaining   = round2(debtors[di].remaining   - amount);

    if (creditors[ci].remaining < EPSILON) ci++;
    if (debtors[di].remaining   < EPSILON) di++;
  }

  return transactions;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
