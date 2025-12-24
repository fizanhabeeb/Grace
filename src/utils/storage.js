// src/utils/storage.js
// Central storage: menu, orders, settings, expenses, backup tracking

import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys
const MENU_KEY = 'hotel_grace_menu';
const ORDERS_KEY = 'hotel_grace_orders';
const CURRENT_ORDER_KEY = 'hotel_grace_current_order';
const SETTINGS_KEY = 'hotel_grace_settings';
const EXPENSES_KEY = 'hotel_grace_expenses';
const LAST_BACKUP_KEY = 'hotel_grace_last_backup';

// ============ SETTINGS ============

const getDefaultSettings = () => ({
  gstEnabled: true,
  gstPercentage: 5,
  hotelName: 'HOTEL GRACE',
  hotelAddress: 'Wayanad, Kerala',
  hotelPhone: '+91 XXXXXXXXXX',
});

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    console.log('Error saving settings:', error);
    return false;
  }
};

export const loadSettings = async () => {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return { ...getDefaultSettings(), ...parsed };
    }
    return getDefaultSettings();
  } catch (error) {
    console.log('Error loading settings:', error);
    return getDefaultSettings();
  }
};

export const updateSetting = async (key, value) => {
  try {
    const current = await loadSettings();
    const updated = { ...current, [key]: value };
    await saveSettings(updated);
    return updated;
  } catch (error) {
    console.log('Error updating setting:', error);
    return null;
  }
};

// ============ DEFAULT MENU ============

const getDefaultMenu = () => {
  return [
    { id: '1', name: 'Appam', price: 15, category: 'Breakfast', image: null, hasVariants: false, variants: [] },
    { id: '2', name: 'Puttu', price: 25, category: 'Breakfast', image: null, hasVariants: true,
      variants: [
        { id: 'v2a', name: 'Puttu - Kadala', price: 40 },
        { id: 'v2b', name: 'Puttu - Parippu', price: 35 },
      ]
    },
    { id: '3', name: 'Idli (2 pcs)', price: 30, category: 'Breakfast', image: null, hasVariants: false, variants: [] },
    { id: '4', name: 'Dosa', price: 40, category: 'Breakfast', image: null, hasVariants: true,
      variants: [
        { id: 'v4a', name: 'Plain Dosa', price: 40 },
        { id: 'v4b', name: 'Masala Dosa', price: 60 },
        { id: 'v4c', name: 'Ghee Roast', price: 70 },
      ]
    },
    { id: '5', name: 'Idiyappam (3 pcs)', price: 30, category: 'Breakfast', image: null, hasVariants: false, variants: [] },
    { id: '6', name: 'Chapati', price: 15, category: 'Breakfast', image: null, hasVariants: false, variants: [] },
    { id: '7', name: 'Meals', price: 60, category: 'Rice', image: null, hasVariants: true,
      variants: [
        { id: 'v7a', name: 'Veg Meals', price: 60 },
        { id: 'v7b', name: 'Fish Meals', price: 90 },
        { id: 'v7c', name: 'Chicken Meals', price: 100 },
      ]
    },
    { id: '8', name: 'Biriyani', price: 120, category: 'Rice', image: null, hasVariants: true,
      variants: [
        { id: 'v8a', name: 'Chicken Biriyani', price: 150 },
        { id: 'v8b', name: 'Beef Biriyani', price: 180 },
        { id: 'v8c', name: 'Fish Biriyani', price: 160 },
        { id: 'v8d', name: 'Egg Biriyani', price: 100 },
      ]
    },
    { id: '9', name: 'Fried Rice', price: 90, category: 'Rice', image: null, hasVariants: true,
      variants: [
        { id: 'v9a', name: 'Veg Fried Rice', price: 90 },
        { id: 'v9b', name: 'Chicken Fried Rice', price: 120 },
        { id: 'v9c', name: 'Egg Fried Rice', price: 100 },
      ]
    },
    { id: '10', name: 'Ghee Rice', price: 80, category: 'Rice', image: null, hasVariants: false, variants: [] },
    { id: '11', name: 'Egg Curry', price: 40, category: 'Curry', image: null, hasVariants: false, variants: [] },
    { id: '12', name: 'Chicken Curry', price: 100, category: 'Curry', image: null, hasVariants: true,
      variants: [
        { id: 'v12a', name: 'Chicken Curry', price: 100 },
        { id: 'v12b', name: 'Chicken Fry', price: 120 },
        { id: 'v12c', name: 'Chicken Roast', price: 130 },
      ]
    },
    { id: '13', name: 'Fish Curry', price: 80, category: 'Curry', image: null, hasVariants: true,
      variants: [
        { id: 'v13a', name: 'Fish Curry', price: 80 },
        { id: 'v13b', name: 'Fish Fry', price: 100 },
      ]
    },
    { id: '14', name: 'Beef', price: 120, category: 'Curry', image: null, hasVariants: true,
      variants: [
        { id: 'v14a', name: 'Beef Curry', price: 120 },
        { id: 'v14b', name: 'Beef Fry', price: 140 },
        { id: 'v14c', name: 'Beef Roast', price: 150 },
      ]
    },
    { id: '15', name: 'Kadala Curry', price: 35, category: 'Curry', image: null, hasVariants: false, variants: [] },
    { id: '16', name: 'Sambar', price: 25, category: 'Curry', image: null, hasVariants: false, variants: [] },
    { id: '17', name: 'Parotta', price: 20, category: 'Snacks', image: null, hasVariants: true,
      variants: [
        { id: 'v17a', name: 'Plain Parotta', price: 20 },
        { id: 'v17b', name: 'Egg Parotta', price: 40 },
        { id: 'v17c', name: 'Chicken Parotta', price: 60 },
      ]
    },
    { id: '18', name: 'Egg Puffs', price: 25, category: 'Snacks', image: null, hasVariants: false, variants: [] },
    { id: '19', name: 'Pazham Pori', price: 20, category: 'Snacks', image: null, hasVariants: false, variants: [] },
    { id: '20', name: 'Uzhunnu Vada', price: 15, category: 'Snacks', image: null, hasVariants: false, variants: [] },
    { id: '21', name: 'Chai', price: 15, category: 'Beverages', image: null, hasVariants: true,
      variants: [
        { id: 'v21a', name: 'Chai', price: 15 },
        { id: 'v21b', name: 'Special Chai', price: 25 },
        { id: 'v21c', name: 'Ginger Chai', price: 20 },
      ]
    },
    { id: '22', name: 'Coffee', price: 20, category: 'Beverages', image: null, hasVariants: false, variants: [] },
    { id: '23', name: 'Fresh Lime', price: 30, category: 'Beverages', image: null, hasVariants: true,
      variants: [
        { id: 'v23a', name: 'Fresh Lime Soda', price: 35 },
        { id: 'v23b', name: 'Fresh Lime Water', price: 30 },
      ]
    },
    { id: '24', name: 'Buttermilk', price: 20, category: 'Beverages', image: null, hasVariants: false, variants: [] },
    { id: '25', name: 'Water Bottle', price: 20, category: 'Beverages', image: null, hasVariants: false, variants: [] },
  ];
};

// ============ MENU ============

export const saveMenu = async (menuItems) => {
  try {
    await AsyncStorage.setItem(MENU_KEY, JSON.stringify(menuItems));
    return true;
  } catch (error) {
    return false;
  }
};

export const loadMenu = async () => {
  try {
    const data = await AsyncStorage.getItem(MENU_KEY);
    if (data) {
      const menu = JSON.parse(data);
      return menu.map((item) => ({
        ...item,
        image: item.image || null,
        hasVariants: !!item.hasVariants,
        variants: item.variants || [],
      }));
    }
    return getDefaultMenu();
  } catch (error) {
    return getDefaultMenu();
  }
};

export const resetMenuToDefault = async () => {
  try {
    const def = getDefaultMenu();
    await AsyncStorage.setItem(MENU_KEY, JSON.stringify(def));
    return def;
  } catch (error) {
    return getDefaultMenu();
  }
};

// ============ CURRENT ORDER ============

export const saveCurrentOrder = async (orderItems) => {
  try {
    await AsyncStorage.setItem(CURRENT_ORDER_KEY, JSON.stringify(orderItems));
    return true;
  } catch (error) {
    return false;
  }
};

export const loadCurrentOrder = async () => {
  try {
    const data = await AsyncStorage.getItem(CURRENT_ORDER_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    return [];
  }
};

export const clearCurrentOrder = async () => {
  try {
    await AsyncStorage.removeItem(CURRENT_ORDER_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

// ============ ORDER HISTORY (OPTIMIZED) ============

export const saveOrderToHistory = async (order) => {
  try {
    const existing = await loadOrderHistory(true); // Load all for saving
    const now = new Date();
    
    // Applying Rounding Logic to Grand Total
    const rawTotal = order.grandTotal || 0;
    const roundedTotal = Math.round(rawTotal);
    const roundOffDiff = roundedTotal - rawTotal;

    const newOrder = {
      ...order,
      id: Date.now().toString(),
      date: now.toLocaleDateString('en-IN'),
      time: now.toLocaleTimeString('en-IN'),
      grandTotal: roundedTotal,
      roundOff: roundOffDiff, // Storing the difference for the Tax Invoice
    };
    const updated = [newOrder, ...existing];
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    return newOrder;
  } catch (error) {
    console.log('Error saving order:', error);
    return null;
  }
};

// IMPROVEMENT: Date-Limited Loading (Default: Last 30 Days)
export const loadOrderHistory = async (fetchAll = false) => {
  try {
    const data = await AsyncStorage.getItem(ORDERS_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    
    if (fetchAll) return parsed;

    // Filter logic: Return only last 30 days by default for performance
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return parsed.filter(order => {
      const parts = order.date.split('/');
      if (parts.length !== 3) return false;
      const orderDate = new Date(parts[2], parts[1] - 1, parts[0]);
      return orderDate >= thirtyDaysAgo;
    });
  } catch (error) {
    return [];
  }
};

export const clearOrderHistory = async () => {
  try {
    await AsyncStorage.removeItem(ORDERS_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

export const removeOrderFromHistory = async (orderId) => {
  try {
    const data = await AsyncStorage.getItem(ORDERS_KEY);
    if (!data) return false;
    const history = JSON.parse(data);
    const updated = history.filter((o) => o.id !== orderId);
    await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    return false;
  }
};

export const getTodaysSales = async () => {
  try {
    const orders = await loadOrderHistory();
    const today = new Date().toLocaleDateString('en-IN');
    const todays = orders.filter((o) => o.date === today);
    const total = todays.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
    return { count: todays.length, total };
  } catch (error) {
    return { count: 0, total: 0 };
  }
};

// ============ EXPENSES ============

export const addExpense = async ({ date, category, description, amount }) => {
  try {
    const current = await loadExpenses();
    const now = new Date();
    const dateStr = date || now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN');
    const newExpense = {
      id: Date.now().toString(),
      date: dateStr,
      time: timeStr,
      category: (category || 'General').trim(),
      description: (description || '').trim(),
      amount: Number(amount) || 0,
    };
    const updated = [newExpense, ...current];
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
    return newExpense;
  } catch (error) {
    return null;
  }
};

export const loadExpenses = async () => {
  try {
    const data = await AsyncStorage.getItem(EXPENSES_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const removeExpense = async (id) => {
  try {
    const current = await loadExpenses();
    const updated = current.filter((e) => e.id !== id);
    await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    return false;
  }
};

export const clearExpenses = async () => {
  try {
    await AsyncStorage.removeItem(EXPENSES_KEY);
    return true;
  } catch (error) {
    return false;
  }
};

// ============ BACKUP / RESTORE ============

export const createBackupObject = async () => {
  try {
    const [menu, orders, expenses, settings] = await Promise.all([
      loadMenu(),
      loadOrderHistory(true), // Full history for backup
      loadExpenses(),
      loadSettings(),
    ]);
    return {
      version: 1,
      createdAt: new Date().toISOString(),
      menu,
      orders,
      expenses,
      settings,
    };
  } catch (error) {
    throw error;
  }
};

export const restoreFromBackupObject = async (backup) => {
  try {
    if (!backup || typeof backup !== 'object') {
      throw new Error('Invalid backup file');
    }
    const menu = Array.isArray(backup.menu) ? backup.menu : getDefaultMenu();
    const orders = Array.isArray(backup.orders) ? backup.orders : [];
    const expenses = Array.isArray(backup.expenses) ? backup.expenses : [];
    const settings = backup.settings || getDefaultSettings();

    await AsyncStorage.multiSet([
      [MENU_KEY, JSON.stringify(menu)],
      [ORDERS_KEY, JSON.stringify(orders)],
      [EXPENSES_KEY, JSON.stringify(expenses)],
      [SETTINGS_KEY, JSON.stringify(settings)],
    ]);

    await AsyncStorage.removeItem(CURRENT_ORDER_KEY);
    return true;
  } catch (error) {
    throw error;
  }
};

// ============ BACKUP TRACKING ============

export const updateLastBackupTimestamp = async () => {
  await AsyncStorage.setItem(LAST_BACKUP_KEY, Date.now().toString());
};

export const getLastBackupTimestamp = async () => {
  const ts = await AsyncStorage.getItem(LAST_BACKUP_KEY);
  return ts ? parseInt(ts) : null;
};