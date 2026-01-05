// src/utils/storage.js
// STORAGE V2: Powered by SQLite (The "Real Database" Upgrade)
// Handles Menu, Orders, Settings, Expenses, Backup with unlimited storage capacity.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';

// --- DATABASE CONFIGURATION ---
const db = SQLite.openDatabase('hotel_grace.db');

// Keys for Key-Value Store (Legacy compatibility)
const MENU_KEY = 'hotel_grace_menu';
const SETTINGS_KEY = 'hotel_grace_settings';
const ACTIVE_ORDERS_KEY = 'hotel_grace_active_orders';
const CATEGORIES_KEY = 'hotel_grace_categories';
const LAST_BACKUP_KEY = 'hotel_grace_last_backup';

// --- INITIALIZATION & MIGRATION ---

// This function creates tables and migrates old data if needed
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // 1. Create Key-Value Table (For Menu, Settings, Categories)
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT);`
      );

      // 2. Create Orders Table (Optimized for performance)
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS orders (
          id TEXT PRIMARY KEY, 
          dateText TEXT, 
          timestamp INTEGER, 
          grandTotal REAL, 
          data TEXT
        );`
      );

      // 3. Create Expenses Table
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS expenses (
          id TEXT PRIMARY KEY, 
          dateText TEXT, 
          timestamp INTEGER, 
          data TEXT
        );`
      );
    }, 
    (error) => { console.error("DB Init Error:", error); reject(error); },
    () => { 
      // Success: Check for migration
      migrateFromAsyncStorage().then(resolve).catch(resolve);
    });
  });
};

// Auto-Migration: Moves data from "Old Storage" to "New Database" once.
const migrateFromAsyncStorage = async () => {
  const isMigrated = await AsyncStorage.getItem('SQLITE_MIGRATION_COMPLETED');
  if (isMigrated) return;

  console.log("Starting Migration to SQLite...");
  
  // 1. Migrate Orders
  const oldOrders = await AsyncStorage.getItem('hotel_grace_orders');
  if (oldOrders) {
    const orders = JSON.parse(oldOrders);
    db.transaction(tx => {
      orders.forEach(o => {
        const ts = new Date().getTime(); // Fallback
        tx.executeSql(
          `INSERT OR REPLACE INTO orders (id, dateText, timestamp, grandTotal, data) VALUES (?, ?, ?, ?, ?);`,
          [o.id, o.date, new Date().getTime(), o.grandTotal, JSON.stringify(o)]
        );
      });
    });
  }

  // 2. Migrate Expenses
  const oldExpenses = await AsyncStorage.getItem('hotel_grace_expenses');
  if (oldExpenses) {
    const expenses = JSON.parse(oldExpenses);
    db.transaction(tx => {
      expenses.forEach(e => {
        tx.executeSql(
          `INSERT OR REPLACE INTO expenses (id, dateText, timestamp, data) VALUES (?, ?, ?, ?);`,
          [e.id, e.date, new Date().getTime(), JSON.stringify(e)]
        );
      });
    });
  }

  // 3. Migrate Key-Value items (Menu, Settings, etc.)
  const keys = [MENU_KEY, SETTINGS_KEY, ACTIVE_ORDERS_KEY, CATEGORIES_KEY];
  const pairs = await AsyncStorage.multiGet(keys);
  
  db.transaction(tx => {
    pairs.forEach(([key, value]) => {
      if (value) {
        tx.executeSql(
          `INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?);`,
          [key, value]
        );
      }
    });
  });

  // Mark as Done
  await AsyncStorage.setItem('SQLITE_MIGRATION_COMPLETED', 'true');
  console.log("Migration Completed Successfully.");
};

// --- HELPER: Execute SQL Promise ---
const executeSql = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        query,
        params,
        (_, { rows, rowsAffected }) => resolve({ rows: rows._array, rowsAffected }),
        (_, error) => { console.error("SQL Error:", query, error); reject(error); return false; }
      );
    });
  });
};

// --- KEY-VALUE HELPERS (For Menu, Settings, etc.) ---
const getKV = async (key, defaultValue) => {
  try {
    const result = await executeSql(`SELECT value FROM kv_store WHERE key = ?;`, [key]);
    if (result.rows.length > 0) {
      return JSON.parse(result.rows[0].value);
    }
    return defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setKV = async (key, value) => {
  try {
    const json = JSON.stringify(value);
    await executeSql(`INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?);`, [key, json]);
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
    // ... (Your default menu items can remain short here, the main data comes from DB)
];

export const saveMenu = async (menuItems) => setKV(MENU_KEY, menuItems);
export const loadMenu = async () => {
    const menu = await getKV(MENU_KEY, null);
    if (!menu) return getDefaultMenu(); // First run
    return menu;
};
export const resetMenuToDefault = async () => {
    const def = getDefaultMenu();
    await saveMenu(def);
    return def;
};

// ============ ACTIVE ORDERS (MULTI-TABLE) ============
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

// ============ ORDER HISTORY (THE DATA BOMB FIX) ============

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

  await executeSql(
    `INSERT INTO orders (id, dateText, timestamp, grandTotal, data) VALUES (?, ?, ?, ?, ?);`,
    [newOrder.id, newOrder.date, now.getTime(), newOrder.grandTotal, JSON.stringify(newOrder)]
  );
  return newOrder;
};

// Optimized Load: Default last 30 days, or fetchAll for backup
export const loadOrderHistory = async (fetchAll = false) => {
  try {
    let query = `SELECT data FROM orders ORDER BY timestamp DESC`;
    let params = [];

    if (!fetchAll) {
      // Data Bomb Prevention: Only load last 30 days for UI
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query += ` WHERE timestamp >= ?`;
      params = [thirtyDaysAgo.getTime()];
    }

    const result = await executeSql(query, params);
    return result.rows.map(row => JSON.parse(row.data));
  } catch (error) {
    console.error("Load History Error", error);
    return [];
  }
};

export const clearOrderHistory = async () => {
  await executeSql(`DELETE FROM orders;`);
  return true;
};

export const removeOrderFromHistory = async (orderId) => {
  await executeSql(`DELETE FROM orders WHERE id = ?;`, [orderId]);
  return true;
};

export const getTodaysSales = async () => {
  const today = new Date().toLocaleDateString('en-IN');
  const result = await executeSql(
    `SELECT grandTotal FROM orders WHERE dateText = ?;`,
    [today]
  );
  
  const total = result.rows.reduce((sum, row) => sum + (row.grandTotal || 0), 0);
  return { count: result.rows.length, total };
};

// ============ EXPENSES ============

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

  await executeSql(
    `INSERT INTO expenses (id, dateText, timestamp, data) VALUES (?, ?, ?, ?);`,
    [newExpense.id, dateStr, now.getTime(), JSON.stringify(newExpense)]
  );
  return newExpense;
};

export const loadExpenses = async () => {
  const result = await executeSql(`SELECT data FROM expenses ORDER BY timestamp DESC;`);
  return result.rows.map(row => JSON.parse(row.data));
};

export const removeExpense = async (id) => {
  await executeSql(`DELETE FROM expenses WHERE id = ?;`, [id]);
  return true;
};

export const clearExpenses = async () => {
  await executeSql(`DELETE FROM expenses;`);
  return true;
};

// ============ BACKUP / RESTORE ============

export const createBackupObject = async () => {
  const [menu, orders, expenses, settings, categories] = await Promise.all([
    loadMenu(),
    loadOrderHistory(true), // Fetch ALL orders for backup
    loadExpenses(),
    loadSettings(),
    loadCategories(),
  ]);
  return {
    version: 2, // Bumped version for SQLite backup
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
        await executeSql("BEGIN TRANSACTION"); // Start atomic operation

        if (backupData.menu) await setKV(MENU_KEY, backupData.menu);
        if (backupData.settings) await setKV(SETTINGS_KEY, backupData.settings);
        if (backupData.categories) await setKV(CATEGORIES_KEY, backupData.categories);

        // Restore Orders
        if (backupData.orders) {
            await executeSql(`DELETE FROM orders;`); // Clear existing before restore
            for (const o of backupData.orders) {
               // Ensure timestamp exists
               const ts = o.timestamp || new Date().getTime(); 
               await executeSql(
                   `INSERT INTO orders (id, dateText, timestamp, grandTotal, data) VALUES (?, ?, ?, ?, ?);`,
                   [o.id, o.date, ts, o.grandTotal, JSON.stringify(o)]
               );
            }
        }

        // Restore Expenses
        if (backupData.expenses) {
             await executeSql(`DELETE FROM expenses;`);
             for (const e of backupData.expenses) {
                const ts = e.timestamp || new Date().getTime();
                await executeSql(
                    `INSERT INTO expenses (id, dateText, timestamp, data) VALUES (?, ?, ?, ?);`,
                    [e.id, e.date, ts, JSON.stringify(e)]
                );
             }
        }

        await executeSql("COMMIT");
        return true;
    } catch (error) {
        await executeSql("ROLLBACK");
        console.error("Restore Failed", error);
        return false;
    }
};