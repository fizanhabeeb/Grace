// src/screens/ReportsScreen.js
// Sales & profit summary + expenses + backup/restore, language aware

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { loadOrderHistory, loadExpenses, addExpense } from '../utils/storage';
import { backupAllData, restoreAllData } from '../utils/backup';

export default function ReportsScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'all'
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [history, exp] = await Promise.all([loadOrderHistory(), loadExpenses()]);
    setOrders(history);
    setExpenses(exp);
  };

  const filterByPeriod = (dateStr) => {
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    const today = new Date();

    switch (period) {
      case 'today': {
        const todayStr = today.toLocaleDateString('en-IN');
        return dateStr === todayStr;
      }
      case 'week': {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo && d <= today;
      }
      case 'month': {
        return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      }
      case 'all':
      default:
        return true;
    }
  };

  const filteredOrders = orders.filter((o) => filterByPeriod(o.date));
  const filteredExpenses = expenses.filter((e) => filterByPeriod(e.date));

  const totalSales = filteredOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalGst = filteredOrders.reduce((sum, o) => sum + (o.gst || 0), 0);
  const totalOrders = filteredOrders.length;
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const profit = totalSales - totalExpenses;

  const bottomPadding = Platform.OS === 'ios' ? insets.bottom + 20 : 20;

  const periodLabel = (() => {
    switch (period) {
      case 'today': return t('today');
      case 'week': return t('thisWeek');
      case 'month': return t('thisMonth');
      case 'all': return t('allTime');
      default: return '';
    }
  })();

  const openExpenseModal = () => {
    setExpenseCategory('');
    setExpenseDescription('');
    setExpenseAmount('');
    setExpenseModalVisible(true);
  };

  const handleSaveExpense = async () => {
    if (!expenseAmount || isNaN(parseFloat(expenseAmount))) {
      Alert.alert(t('invalidAmountTitle'), t('invalidAmountMessage'));
      return;
    }
    const amountNum = parseFloat(expenseAmount);
    await addExpense({
      category: expenseCategory || 'General',
      description: expenseDescription || '',
      amount: amountNum,
    });
    setExpenseModalVisible(false);
    await loadData();
  };

  const handleBackup = async () => {
    await backupAllData();
  };

  const handleRestore = async () => {
    Alert.alert(
      t('restoreConfirmTitle'),
      t('restoreConfirmMessage'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('restoreDataLabel'),
          style: 'destructive',
          onPress: async () => {
            await restoreAllData();
            await loadData();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: bottomPadding }}
      showsVerticalScrollIndicator={false}
    >
      {/* Period Selector */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, period === 'today' && styles.filterButtonActive]}
          onPress={() => setPeriod('today')}
        >
          <Text style={[styles.filterText, period === 'today' && styles.filterTextActive]}>
            {t('today')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, period === 'week' && styles.filterButtonActive]}
          onPress={() => setPeriod('week')}
        >
          <Text style={[styles.filterText, period === 'week' && styles.filterTextActive]}>
            {t('thisWeek')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, period === 'month' && styles.filterButtonActive]}
          onPress={() => setPeriod('month')}
        >
          <Text style={[styles.filterText, period === 'month' && styles.filterTextActive]}>
            {t('thisMonth')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, period === 'all' && styles.filterButtonActive]}
          onPress={() => setPeriod('all')}
        >
          <Text style={[styles.filterText, period === 'all' && styles.filterTextActive]}>
            {t('allTime')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sales Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {t('salesSummary')} ({periodLabel})
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('orders')}:</Text>
          <Text style={styles.value}>{totalOrders}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('totalSales')}:</Text>
          <Text style={styles.value}>₹{totalSales.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>GST:</Text>
          <Text style={styles.value}>₹{totalGst.toFixed(2)}</Text>
        </View>
      </View>

      {/* Expense & Profit Summary */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {t('expensesProfit')} ({periodLabel})
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>{t('totalExpensesLabel')}:</Text>
          <Text style={styles.value}>₹{totalExpenses.toFixed(2)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('profitLabel')}:</Text>
          <Text style={[styles.value, { color: profit >= 0 ? '#2E7D32' : '#C62828' }]}>
            ₹{profit.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity style={styles.addExpenseButton} onPress={openExpenseModal}>
          <Text style={styles.addExpenseButtonText}>{t('addExpenseLabel')}</Text>
        </TouchableOpacity>
      </View>

      {/* Expense List */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          {t('expensesLabel')} ({periodLabel})
        </Text>
        {filteredExpenses.length === 0 ? (
          <Text style={styles.emptyText}>{t('noExpensesRecorded')}</Text>
        ) : (
          filteredExpenses.map((exp) => (
            <View key={exp.id} style={styles.expenseItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expenseCategory}>
                  {exp.category} • ₹{exp.amount.toFixed(2)}
                </Text>
                {exp.description ? (
                  <Text style={styles.expenseDescription}>{exp.description}</Text>
                ) : null}
              </View>
              <View>
                <Text style={styles.expenseDate}>{exp.date}</Text>
                <Text style={styles.expenseTime}>{exp.time}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Backup / Restore */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('backupRestore')}</Text>
        <Text style={styles.infoText}>{t('backupInfo1')}</Text>
        <Text style={styles.infoText}>{t('backupInfo2')}</Text>
        <View style={styles.backupRow}>
          <TouchableOpacity style={styles.backupButton} onPress={handleBackup}>
            <Text style={styles.backupButtonText}>💾 {t('backupDataLabel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.backupButton, { backgroundColor: '#FF7043', marginRight: 0 }]}
            onPress={handleRestore}
          >
            <Text style={styles.backupButtonText}>⏪ {t('restoreDataLabel')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add Expense Modal */}
      <Modal
        visible={expenseModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setExpenseModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>{t('addExpenseLabel')}</Text>

              <Text style={styles.modalLabel}>{t('expenseCategoryLabel')}</Text>
              <TextInput
                style={styles.modalInput}
                value={expenseCategory}
                onChangeText={setExpenseCategory}
                placeholder="e.g., Vegetables, Salary, Rent"
                placeholderTextColor="#999"
              />

              <Text style={styles.modalLabel}>{t('expenseDescriptionLabel')}</Text>
              <TextInput
                style={styles.modalInput}
                value={expenseDescription}
                onChangeText={setExpenseDescription}
                placeholder="Short note"
                placeholderTextColor="#999"
              />

              <Text style={styles.modalLabel}>{t('expenseAmountLabel')}</Text>
              <TextInput
                style={styles.modalInput}
                value={expenseAmount}
                onChangeText={setExpenseAmount}
                placeholder="0"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setExpenseModalVisible(false)}
                >
                  <Text style={styles.modalCancelText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveExpense}>
                  <Text style={styles.modalSaveText}>{t('save')}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// styles stay the same as earlier
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },

  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 10,
    marginBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    elevation: 1,
  },
  filterButtonActive: {
    backgroundColor: '#8B0000',
  },
  filterText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 13,
  },
  filterTextActive: {
    color: '#fff',
  },

  card: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginBottom: 10,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  label: {
    fontSize: 14,
    color: '#555',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },

  addExpenseButton: {
    marginTop: 12,
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addExpenseButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

  emptyText: {
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },

  expenseItem: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 8,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  expenseDescription: {
    fontSize: 13,
    color: '#777',
    marginTop: 2,
  },
  expenseDate: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
  },
  expenseTime: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'right',
  },

  infoText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 6,
  },
  backupRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  backupButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  backupButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B0000',
    textAlign: 'center',
    marginBottom: 10,
  },
  modalLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#fafafa',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
    marginRight: 8,
  },
  modalCancelText: {
    color: '#666',
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#8B0000',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});