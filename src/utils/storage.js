// src/utils/storage.js
// STORAGE V3: Modern SQLite API (Fixes "db.transaction" error)
// Uses openDatabaseSync, runSync, getAllSync

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

// --- 1. OPEN DATABASE (New API) ---
const db = SQLite.openDatabaseSync('hotel_grace.db');

// Keys for Key-Value Store
const MENU_KEY = 'hotel_grace_menu';
const SETTINGS_KEY = 'hotel_grace_settings';
const ACTIVE_ORDERS_KEY = 'hotel_grace_active_orders';
const CATEGORIES_KEY = 'hotel_grace_categories';

// --- 2. INITIALIZATION ---

export const initDatabase = async () => {
  try {
    // Enable Write-Ahead Logging for speed
    db.execSync('PRAGMA journal_mode = WAL;');

    // Create Tables (Synchronous & Fast)
    db.execSync(`
      CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT);
      
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY, 
        dateText TEXT, 
        timestamp INTEGER, 
        grandTotal REAL, 
        data TEXT
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY, 
        dateText TEXT, 
        timestamp INTEGER, 
        data TEXT
      );
    `);

    // Check for Migration
    await migrateFromAsyncStorage();
    return true;

  } catch (error) {
    console.error("DB Init Error:", error);
    throw error;
  }
};

// --- 3. MIGRATION (Old Storage -> New DB) ---
const migrateFromAsyncStorage = async () => {
  const isMigrated = await AsyncStorage.getItem('SQLITE_MIGRATION_COMPLETED_V2');
  if (isMigrated) return;

  console.log("Starting Migration...");

  try {
    // Migrate Orders
    const oldOrders = await AsyncStorage.getItem('hotel_grace_orders');
    if (oldOrders) {
      const orders = JSON.parse(oldOrders);
      db.withTransactionSync(() => {
        orders.forEach(o => {
          db.runSync(
            `INSERT OR REPLACE INTO orders (id, dateText, timestamp, grandTotal, data) VALUES (?, ?, ?, ?, ?);`,
            [o.id, o.date, new Date().getTime(), o.grandTotal, JSON.stringify(o)]
          );
        });
      });
    }

    // Migrate Expenses
    const oldExpenses = await AsyncStorage.getItem('hotel_grace_expenses');
    if (oldExpenses) {
      const expenses = JSON.parse(oldExpenses);
      db.withTransactionSync(() => {
        expenses.forEach(e => {
          db.runSync(
            `INSERT OR REPLACE INTO expenses (id, dateText, timestamp, data) VALUES (?, ?, ?, ?);`,
            [e.id, e.date, new Date().getTime(), JSON.stringify(e)]
          );
        });
      });
    }

    // Migrate KV Store
    const keys = [MENU_KEY, SETTINGS_KEY, ACTIVE_ORDERS_KEY, CATEGORIES_KEY];
    const pairs = await AsyncStorage.multiGet(keys);
    
    db.withTransactionSync(() => {
      pairs.forEach(([key, value]) => {
        if (value) {
          db.runSync(
            `INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?);`,
            [key, value]
          );
        }
      });
    });

    await AsyncStorage.setItem('SQLITE_MIGRATION_COMPLETED_V2', 'true');
    console.log("Migration Completed.");
  } catch (e) {
    console.error("Migration Failed:", e);
  }
};

// --- 4. KEY-VALUE HELPERS ---
const getKV = async (key, defaultValue) => {
  try {
    const result = db.getAllSync(`SELECT value FROM kv_store WHERE key = ?;`, [key]);
    if (result.length > 0) {
      return JSON.parse(result[0].value);
    }
    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setKV = async (key, value) => {
  try {
    const json = JSON.stringify(value);
    db.runSync(`INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?);`, [key, json]);
    return true;
  } catch (e) {
    return false;
  }
};

// ============ SETTINGS ============
export const getDefaultSettings = () => ({
  gstEnabled: true,
  gstPercentage: 5,
  hotelName: 'HOTEL GRACE',
  hotelAddress: 'Wayanad, Kerala',
  hotelPhone: '+91 XXXXXXXXXX',
});
export const saveSettings = async (settings) => setKV(SETTINGS_KEY, settings);
export const loadSettings = async () => getKV(SETTINGS_KEY, getDefaultSettings());
export const updateSetting = async (key, value) => {
  const current = await loadSettings();
  const updated = { ...current, [key]: value };
  await saveSettings(updated);
  return updated;
};

// ============ CATEGORIES ============
export const getDefaultCategories = () => ['All', 'Breakfast', 'Rice', 'Curry', 'Snacks', 'Beverages'];
export const saveCategories = async (categories) => setKV(CATEGORIES_KEY, categories);
export const loadCategories = async () => getKV(CATEGORIES_KEY, getDefaultCategories());

// ============ MENU ============
const getDefaultMenu = () => [
    { id: '1', name: 'Appam', price: 15, category: 'Breakfast', image: null, hasVariants: false, variants: [] },
];
export const saveMenu = async (menuItems) => setKV(MENU_KEY, menuItems);
export const loadMenu = async () => {
    const menu = await getKV(MENU_KEY, null);
    if (!menu) return getDefaultMenu(); 
    return menu;
};
export const resetMenuToDefault = async () => {
    const def = getDefaultMenu();
    await saveMenu(def);
    return def;
};

// ============ ACTIVE ORDERS ============
export const getAllActiveOrders = async () => getKV(ACTIVE_ORDERS_KEY, {});
export const saveActiveTableOrder = async (tableNo, items) => {
  const allOrders = await getAllActiveOrders();
  if (items.length === 0) delete allOrders[tableNo];
  else allOrders[tableNo] = items;
  return setKV(ACTIVE_ORDERS_KEY, allOrders);
};
export const getActiveTableOrder = async (tableNo) => {
  const allOrders = await getAllActiveOrders();
  return allOrders[tableNo] || [];
};
export const clearActiveTableOrder = async (tableNo) => {
  const allOrders = await getAllActiveOrders();
  delete allOrders[tableNo];
  return setKV(ACTIVE_ORDERS_KEY, allOrders);
};
export const getTableTotal = (items) => {
    if (!items) return 0;
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
};

// ============ ORDER HISTORY (Modern API) ============

export const saveOrderToHistory = async (order) => {
  const now = new Date();
  const rawTotal = order.grandTotal || 0;
  const roundedTotal = Math.round(rawTotal);
  const roundOffDiff = roundedTotal - rawTotal;

  const newOrder = {
    ...order,
    id: Date.now().toString(),
    date: now.toLocaleDateString('en-IN'),
    time: now.toLocaleTimeString('en-IN'),
    grandTotal: roundedTotal,
    roundOff: roundOffDiff,
  };

  db.runSync(
    `INSERT INTO orders (id, dateText, timestamp, grandTotal, data) VALUES (?, ?, ?, ?, ?);`,
    [newOrder.id, newOrder.date, now.getTime(), newOrder.grandTotal, JSON.stringify(newOrder)]
  );
  return newOrder;
};

// --- CORRECTED FUNCTION (Fixes SQL Syntax Error) ---
export const loadOrderHistory = async (fetchAll = false) => {
  try {
    // 1. Start with the base query
    let query = `SELECT data FROM orders`;
    let params = [];

    // 2. Add WHERE clause (Must be BEFORE 'ORDER BY')
    if (!fetchAll) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query += ` WHERE timestamp >= ?`;
      params = [thirtyDaysAgo.getTime()];
    }

    // 3. Add ORDER BY at the very end
    query += ` ORDER BY timestamp DESC`;

    const result = db.getAllSync(query, params);
    return result.map(row => JSON.parse(row.data));
  } catch (error) {
    console.error("Load History Error", error);
    return [];
  }
};

export const clearOrderHistory = async () => {
  db.runSync(`DELETE FROM orders;`);
  return true;
};

export const removeOrderFromHistory = async (orderId) => {
  db.runSync(`DELETE FROM orders WHERE id = ?;`, [orderId]);
  return true;
};

export const getTodaysSales = async () => {
  const today = new Date().toLocaleDateString('en-IN');
  const result = db.getAllSync(
    `SELECT grandTotal FROM orders WHERE dateText = ?;`,
    [today]
  );
  const total = result.reduce((sum, row) => sum + (row.grandTotal || 0), 0);
  return { count: result.length, total };
};

// ============ EXPENSES (Modern API) ============

export const addExpense = async ({ date, category, description, amount }) => {
  const now = new Date();
  const dateStr = date || now.toLocaleDateString('en-IN');
  const newExpense = {
    id: Date.now().toString(),
    date: dateStr,
    time: now.toLocaleTimeString('en-IN'),
    category: (category || 'General').trim(),
    description: (description || '').trim(),
    amount: Number(amount) || 0,
  };

  db.runSync(
    `INSERT INTO expenses (id, dateText, timestamp, data) VALUES (?, ?, ?, ?);`,
    [newExpense.id, dateStr, now.getTime(), JSON.stringify(newExpense)]
  );
  return newExpense;
};

export const loadExpenses = async () => {
  const result = db.getAllSync(`SELECT data FROM expenses ORDER BY timestamp DESC;`);
  return result.map(row => JSON.parse(row.data));
};

export const removeExpense = async (id) => {
  db.runSync(`DELETE FROM expenses WHERE id = ?;`, [id]);
  return true;
};

// ============ BACKUP / RESTORE ============
export const createBackupObject = async () => {
  const [menu, orders, expenses, settings, categories] = await Promise.all([
    loadMenu(),
    loadOrderHistory(true),
    loadExpenses(),
    loadSettings(),
    loadCategories(),
  ]);
  return {
    version: 3,
    createdAt: new Date().toISOString(),
    menu,
    orders,
    expenses,
    settings,
    categories,
  };
};

export const restoreFullBackup = async (backupData) => {
    try {
        db.withTransactionSync(() => {
            if (backupData.menu) setKV(MENU_KEY, backupData.menu); 
            
            // For restore, we run queries directly:
            if (backupData.menu) db.runSync(`INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?);`, [MENU_KEY, JSON.stringify(backupData.menu)]);
            if (backupData.settings) db.runSync(`INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?);`, [SETTINGS_KEY, JSON.stringify(backupData.settings)]);
            if (backupData.categories) db.runSync(`INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?);`, [CATEGORIES_KEY, JSON.stringify(backupData.categories)]);

            if (backupData.orders) {
                db.runSync(`DELETE FROM orders;`);
                for (const o of backupData.orders) {
                   const ts = o.timestamp || new Date().getTime(); 
                   db.runSync(
                       `INSERT INTO orders (id, dateText, timestamp, grandTotal, data) VALUES (?, ?, ?, ?, ?);`,
                       [o.id, o.date, ts, o.grandTotal, JSON.stringify(o)]
                   );
                }
            }

            if (backupData.expenses) {
                 db.runSync(`DELETE FROM expenses;`);
                 for (const e of backupData.expenses) {
                    const ts = e.timestamp || new Date().getTime();
                    db.runSync(
                        `INSERT INTO expenses (id, dateText, timestamp, data) VALUES (?, ?, ?, ?);`,
                        [e.id, e.date, ts, JSON.stringify(e)]
                    );
                 }
            }
        });
        return true;
    } catch (error) {
        console.error("Restore Failed", error);
        return false;
    }
};