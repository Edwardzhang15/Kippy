import * as SQLite from 'expo-sqlite';
import { getCachedRates, convertAmount } from './currencyRates';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Group = {
  id: number;
  name: string;
  currency: string;
  is_archived: number;  // 0 = active/planning, 1 = archived
  is_planning: number;  // legacy column, always 0
  destination: string | null;
  destination_photo_url: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  budget_per_person: number | null;
  has_seen_itinerary_intro: number;
  has_seen_packing_intro: number;
  has_seen_budget_intro: number;
  vibe: string | null;
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

export type PlacesCacheRow = {
  id: number;
  group_id: number;
  category: string;
  data: string;
  fetched_at: string;
};

export type TripStop = {
  id: number;
  group_id: number;
  stop_name: string;
  order_index: number;
};

export type PersonalTrip = {
  id: number;
  name: string;
  budget_amount: number | null;
  currency: string;
  created_date: string;
  is_archived: number;
};

export type PersonalTripExpense = {
  id: number;
  personal_trip_id: number;
  amount: number;
  currency: string;
  category: string;
  date: string;
  note: string | null;
  receipt_photo_uri: string | null;
};

export type PersonalTripBudget = {
  id: number;
  personal_trip_id: number;
  category: string;
  planned_amount: number;
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

  // Migration v13: per-trip feature intro seen flags
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN has_seen_itinerary_intro INTEGER NOT NULL DEFAULT 0;');
  } catch { /* column already exists */ }
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN has_seen_packing_intro INTEGER NOT NULL DEFAULT 0;');
  } catch { /* column already exists */ }
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN has_seen_budget_intro INTEGER NOT NULL DEFAULT 0;');
  } catch { /* column already exists */ }

  // Migration v14: places cache table
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS places_cache (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id   INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        category   TEXT NOT NULL,
        data       TEXT NOT NULL,
        fetched_at TEXT NOT NULL,
        UNIQUE(group_id, category)
      );
    `);
  } catch { /* table already exists */ }

  // Migration v15: trip stops table
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS trip_stops (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id    INTEGER NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
        stop_name   TEXT    NOT NULL,
        order_index INTEGER NOT NULL DEFAULT 0
      );
    `);
  } catch { /* table already exists */ }

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

  // Migration v16: retire is_planning — treat all planning trips as active
  try {
    await db.execAsync('UPDATE groups SET is_planning = 0 WHERE is_planning = 1');
  } catch { /* ignore */ }

  // Migration v17: visited countries table for Been tab
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS visited_countries (
        iso2     TEXT    PRIMARY KEY,
        source   TEXT    NOT NULL DEFAULT 'manual',
        added_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
    `);
  } catch { /* table already exists */ }

  // Migration v18: personal expenses
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_expenses (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        amount           REAL    NOT NULL,
        currency         TEXT    NOT NULL DEFAULT 'CAD',
        category         TEXT    NOT NULL DEFAULT 'other',
        date             TEXT    NOT NULL,
        note             TEXT,
        receipt_photo_uri TEXT
      );
    `);
  } catch { /* table already exists */ }

  // Migration v19: personal monthly budgets
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_budgets (
        id                   INTEGER PRIMARY KEY AUTOINCREMENT,
        category             TEXT    NOT NULL UNIQUE,
        monthly_budget_amount REAL    NOT NULL DEFAULT 0
      );
    `);
  } catch { /* table already exists */ }

  // Migration v20: trip vibe stored on group
  try {
    await db.execAsync('ALTER TABLE groups ADD COLUMN vibe TEXT;');
  } catch { /* column already exists */ }

  // Migration v21: personal trips table
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_trips (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        name           TEXT    NOT NULL,
        budget_amount  REAL,
        currency       TEXT    NOT NULL DEFAULT 'CAD',
        created_date   TEXT    NOT NULL,
        is_archived    INTEGER NOT NULL DEFAULT 0
      );
    `);
  } catch { /* table already exists */ }

  // Migration v22: personal trip expenses table
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_trip_expenses (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        personal_trip_id INTEGER NOT NULL REFERENCES personal_trips(id) ON DELETE CASCADE,
        amount           REAL    NOT NULL,
        currency         TEXT    NOT NULL,
        category         TEXT    NOT NULL DEFAULT 'other',
        date             TEXT    NOT NULL,
        note             TEXT,
        receipt_photo_uri TEXT
      );
    `);
  } catch { /* table already exists */ }

  // Migration v23: personal trip category budgets
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS personal_trip_budgets (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        personal_trip_id INTEGER NOT NULL REFERENCES personal_trips(id) ON DELETE CASCADE,
        category         TEXT    NOT NULL,
        planned_amount   REAL    NOT NULL DEFAULT 0,
        UNIQUE(personal_trip_id, category)
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

export async function setGroupVibe(groupId: number, vibe: string | null): Promise<void> {
  await db.runAsync('UPDATE groups SET vibe = ? WHERE id = ?', vibe, groupId);
}

export async function markIntroSeen(
  groupId: number,
  feature: 'itinerary' | 'packing' | 'budget',
): Promise<void> {
  const col =
    feature === 'itinerary' ? 'has_seen_itinerary_intro' :
    feature === 'packing'   ? 'has_seen_packing_intro'   :
                              'has_seen_budget_intro';
  await db.runAsync(`UPDATE groups SET ${col} = 1 WHERE id = ?`, groupId);
}

export async function getPlacesCache(groupId: number, category: string, stopName?: string): Promise<string | null> {
  const cacheKey = stopName ? `${stopName}::${category}` : category;
  const row = await db.getFirstAsync<PlacesCacheRow>(
    'SELECT * FROM places_cache WHERE group_id = ? AND category = ?',
    groupId, cacheKey,
  );
  if (!row) return null;
  const age = Date.now() - new Date(row.fetched_at).getTime();
  if (age > 7 * 24 * 60 * 60 * 1000) return null;
  return row.data;
}

export async function setPlacesCache(groupId: number, category: string, data: string, stopName?: string): Promise<void> {
  const cacheKey = stopName ? `${stopName}::${category}` : category;
  await db.runAsync(
    `INSERT INTO places_cache (group_id, category, data, fetched_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(group_id, category) DO UPDATE SET data = excluded.data, fetched_at = excluded.fetched_at`,
    groupId, cacheKey, data, new Date().toISOString(),
  );
}

export async function clearPlacesCache(groupId: number): Promise<void> {
  await db.runAsync('DELETE FROM places_cache WHERE group_id = ?', groupId);
}

export async function addTripStop(groupId: number, stopName: string, orderIndex: number): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO trip_stops (group_id, stop_name, order_index) VALUES (?, ?, ?)',
    groupId, stopName, orderIndex,
  );
  return result.lastInsertRowId;
}

export async function getTripStops(groupId: number): Promise<TripStop[]> {
  return db.getAllAsync<TripStop>(
    'SELECT * FROM trip_stops WHERE group_id = ? ORDER BY order_index ASC, id ASC',
    groupId,
  );
}

export async function removeTripStop(stopId: number): Promise<void> {
  await db.runAsync('DELETE FROM trip_stops WHERE id = ?', stopId);
}

export async function reorderTripStops(stops: { id: number; orderIndex: number }[]): Promise<void> {
  for (const stop of stops) {
    await db.runAsync('UPDATE trip_stops SET order_index = ? WHERE id = ?', stop.orderIndex, stop.id);
  }
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
    'SELECT * FROM groups WHERE is_archived = ? ORDER BY id DESC',
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
    'SELECT * FROM groups ORDER BY is_archived ASC, id DESC',
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

// ─── Personal Expenses ────────────────────────────────────────────────────────

export type PersonalExpense = {
  id: number;
  amount: number;
  currency: string;
  category: string;
  date: string;
  note: string | null;
  receipt_photo_uri: string | null;
};

export type PersonalBudget = {
  id: number;
  category: string;
  monthly_budget_amount: number;
};

export async function getPersonalExpenses(): Promise<PersonalExpense[]> {
  return db.getAllAsync<PersonalExpense>(
    'SELECT * FROM personal_expenses ORDER BY date DESC, id DESC',
  );
}

export async function getPersonalExpense(id: number): Promise<PersonalExpense | null> {
  return db.getFirstAsync<PersonalExpense>(
    'SELECT * FROM personal_expenses WHERE id = ?', id,
  );
}

export async function addPersonalExpense(data: Omit<PersonalExpense, 'id'>): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO personal_expenses (amount, currency, category, date, note, receipt_photo_uri)
     VALUES (?, ?, ?, ?, ?, ?)`,
    data.amount, data.currency, data.category, data.date,
    data.note ?? null, data.receipt_photo_uri ?? null,
  );
  return r.lastInsertRowId;
}

export async function updatePersonalExpense(id: number, data: Omit<PersonalExpense, 'id'>): Promise<void> {
  await db.runAsync(
    `UPDATE personal_expenses
     SET amount=?, currency=?, category=?, date=?, note=?, receipt_photo_uri=?
     WHERE id=?`,
    data.amount, data.currency, data.category, data.date,
    data.note ?? null, data.receipt_photo_uri ?? null, id,
  );
}

export async function deletePersonalExpense(id: number): Promise<void> {
  await db.runAsync('DELETE FROM personal_expenses WHERE id = ?', id);
}

export async function getPersonalBudgets(): Promise<PersonalBudget[]> {
  return db.getAllAsync<PersonalBudget>(
    'SELECT * FROM personal_budgets ORDER BY category ASC',
  );
}

export async function setPersonalBudget(category: string, amount: number): Promise<void> {
  if (amount <= 0) {
    await db.runAsync('DELETE FROM personal_budgets WHERE category = ?', category);
  } else {
    await db.runAsync(
      `INSERT INTO personal_budgets (category, monthly_budget_amount)
       VALUES (?, ?)
       ON CONFLICT(category) DO UPDATE SET monthly_budget_amount=excluded.monthly_budget_amount`,
      category, amount,
    );
  }
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
        planned_start_date, planned_end_date, budget_per_person)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    name, currency,
    destination ?? null,
    destinationPhotoUrl ?? null,
    plannedStartDate ?? null,
    plannedEndDate ?? null,
    budgetPerPerson ?? null,
  );
  return result.lastInsertRowId;
}

export type ExpenseWithSplits = Expense & { splitMemberNames: string[] };

export async function getGroupExpensesWithSplits(groupId: number): Promise<ExpenseWithSplits[]> {
  const expenses = await db.getAllAsync<Expense>(
    `SELECT e.*, m.name AS paid_by_name
     FROM expenses e
     JOIN members m ON e.paid_by = m.id
     WHERE e.group_id = ?
     ORDER BY e.date DESC`,
    groupId,
  );
  return Promise.all(
    expenses.map(async exp => {
      const splitRows = await db.getAllAsync<{ name: string }>(
        `SELECT m.name FROM expense_splits es JOIN members m ON es.member_id = m.id WHERE es.expense_id = ? ORDER BY m.name`,
        exp.id,
      );
      return { ...exp, splitMemberNames: splitRows.map(r => r.name) };
    }),
  );
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

// ─── Member expense breakdown ─────────────────────────────────────────────────

export type MemberExpenseRow = {
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
  share_amount: number | null;
};

export type MemberExpensesData = {
  member: Member;
  includedIn: MemberExpenseRow[];
  paidFor: MemberExpenseRow[];
  totalCharged: number;
  groupCurrency: string;
};

export async function getMemberExpenses(
  groupId: number,
  memberId: number,
): Promise<MemberExpensesData> {
  const member = await db.getFirstAsync<Member>(
    'SELECT * FROM members WHERE id = ?', memberId,
  );
  if (!member) throw new Error(`Member ${memberId} not found`);

  const group = await db.getFirstAsync<{ currency: string }>(
    'SELECT currency FROM groups WHERE id = ?', groupId,
  );
  const gc = group?.currency ?? 'CAD';

  const includedIn = await db.getAllAsync<MemberExpenseRow>(
    `SELECT e.*, m.name AS paid_by_name, es.share_amount
     FROM expenses e
     JOIN members m ON e.paid_by = m.id
     JOIN expense_splits es ON es.expense_id = e.id AND es.member_id = ?
     WHERE e.group_id = ?
     ORDER BY e.date DESC, e.id DESC`,
    memberId, groupId,
  );

  const paidFor = await db.getAllAsync<MemberExpenseRow>(
    `SELECT e.*, m.name AS paid_by_name, NULL AS share_amount
     FROM expenses e
     JOIN members m ON e.paid_by = m.id
     WHERE e.group_id = ? AND e.paid_by = ?
     ORDER BY e.date DESC, e.id DESC`,
    groupId, memberId,
  );

  const rates = getCachedRates();
  const totalCharged = round2(includedIn.reduce((sum, e) => {
    const share = e.share_amount ?? 0;
    return sum + (rates ? convertAmount(share, e.currency, gc, rates) : share);
  }, 0));

  return { member, includedIn, paidFor, totalCharged, groupCurrency: gc };
}

// ─── Personal Trips ───────────────────────────────────────────────────────────

export async function createPersonalTrip(
  name: string,
  currency: string,
  budgetAmount: number | null,
): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const r = await db.runAsync(
    'INSERT INTO personal_trips (name, currency, budget_amount, created_date) VALUES (?, ?, ?, ?)',
    name, currency, budgetAmount ?? null, today,
  );
  return r.lastInsertRowId;
}

export async function getPersonalTrips(): Promise<PersonalTrip[]> {
  return db.getAllAsync<PersonalTrip>(
    'SELECT * FROM personal_trips WHERE is_archived = 0 ORDER BY id DESC',
  );
}

export async function getPersonalTrip(id: number): Promise<PersonalTrip | null> {
  return db.getFirstAsync<PersonalTrip>('SELECT * FROM personal_trips WHERE id = ?', id);
}

export async function updatePersonalTrip(
  id: number,
  name: string,
  currency: string,
  budgetAmount: number | null,
): Promise<void> {
  await db.runAsync(
    'UPDATE personal_trips SET name=?, currency=?, budget_amount=? WHERE id=?',
    name, currency, budgetAmount ?? null, id,
  );
}

export async function deletePersonalTrip(id: number): Promise<void> {
  await db.runAsync('DELETE FROM personal_trips WHERE id = ?', id);
}

export async function addPersonalTripExpense(
  data: Omit<PersonalTripExpense, 'id'>,
): Promise<number> {
  const r = await db.runAsync(
    `INSERT INTO personal_trip_expenses
       (personal_trip_id, amount, currency, category, date, note, receipt_photo_uri)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    data.personal_trip_id, data.amount, data.currency, data.category,
    data.date, data.note ?? null, data.receipt_photo_uri ?? null,
  );
  return r.lastInsertRowId;
}

export async function getPersonalTripExpenses(tripId: number): Promise<PersonalTripExpense[]> {
  return db.getAllAsync<PersonalTripExpense>(
    'SELECT * FROM personal_trip_expenses WHERE personal_trip_id = ? ORDER BY date DESC, id DESC',
    tripId,
  );
}

export async function getPersonalTripExpense(id: number): Promise<PersonalTripExpense | null> {
  return db.getFirstAsync<PersonalTripExpense>(
    'SELECT * FROM personal_trip_expenses WHERE id = ?', id,
  );
}

export async function updatePersonalTripExpense(
  id: number,
  data: Omit<PersonalTripExpense, 'id' | 'personal_trip_id'>,
): Promise<void> {
  await db.runAsync(
    `UPDATE personal_trip_expenses
     SET amount=?, currency=?, category=?, date=?, note=?, receipt_photo_uri=?
     WHERE id=?`,
    data.amount, data.currency, data.category, data.date,
    data.note ?? null, data.receipt_photo_uri ?? null, id,
  );
}

export async function deletePersonalTripExpense(id: number): Promise<void> {
  await db.runAsync('DELETE FROM personal_trip_expenses WHERE id = ?', id);
}

export async function getPersonalTripBudgets(tripId: number): Promise<PersonalTripBudget[]> {
  return db.getAllAsync<PersonalTripBudget>(
    'SELECT * FROM personal_trip_budgets WHERE personal_trip_id = ? ORDER BY category ASC',
    tripId,
  );
}

export async function setPersonalTripBudget(
  tripId: number,
  category: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) {
    await db.runAsync(
      'DELETE FROM personal_trip_budgets WHERE personal_trip_id = ? AND category = ?',
      tripId, category,
    );
  } else {
    await db.runAsync(
      `INSERT INTO personal_trip_budgets (personal_trip_id, category, planned_amount)
       VALUES (?, ?, ?)
       ON CONFLICT(personal_trip_id, category) DO UPDATE SET planned_amount=excluded.planned_amount`,
      tripId, category, amount,
    );
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
