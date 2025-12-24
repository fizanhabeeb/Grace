// src/screens/ReportsScreen.js
// Sales & profit summary + expenses + backup/restore, language aware + Unified Search

import React, { useState, useCallback, useMemo } from 'react';
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
import { loadOrderHistory, loadExpenses, addExpense, removeExpense } from '../utils/storage';
import { backupAllData, restoreAllData } from '../utils/backup';

export default function ReportsScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState('today'); // 'today' | 'week' | 'month' | 'all'
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [searchText, setSearchText] = useState(''); // Unified Search State
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [isAmountValid, setIsAmountValid] = useState(true);

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
        return d >= weekAgo;
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
  
  // Standardized Search Logic for Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesPeriod = filterByPeriod(e.date);
      const matchesSearch = e.category.toLowerCase().includes(searchText.toLowerCase()) || 
                            e.description.toLowerCase().includes(searchText.toLowerCase());
      return matchesPeriod && matchesSearch;
    });
  }, [expenses, period, searchText]);

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
    setIsAmountValid(true);
    setExpenseModalVisible(true);
  };

  const handleSaveExpense = async () => {
    const amountNum = parseFloat(expenseAmount);
    if (!expenseAmount || isNaN(amountNum)) {
      setIsAmountValid(false);
      Alert.alert(t('error'), t('invalidAmountMessage'));
      return;
    }
    await addExpense({
      category: expenseCategory || 'General',
      description: expenseDescription || '',
      amount: amountNum,
    });
    setExpenseModalVisible(false);
    await loadData();
  };

  const handleDeleteExpense = (id) => {
    Alert.alert(
      t('delete'),
      t('deleteConfirm') || 'Are you sure you want to delete this expense?',
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            await removeExpense(id);
            await loadData();
          },
        },
      ]
    );
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
    <View style={styles.container}>
      {/* Unified Search Header */}
      <View style={styles.headerContainer}>
        <View style={styles.searchWrapper}>
          <Text style={{ marginRight: 8 }}>🔍</Text>
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search expenses..." 
            value={searchText} 
            onChangeText={setSearchText} 
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
          {['today', 'week', 'month', 'all'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && { color: '#fff' }]}>
                {t(p === 'all' ? 'allTime' : p === 'week' ? 'thisWeek' : p === 'month' ? 'thisMonth' : 'today')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomPadding }}
        showsVerticalScrollIndicator={false}
      >
        {/* Sales Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 {t('salesSummary')} ({periodLabel})</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('orders')}:</Text>
            <Text style={styles.bold}>{totalOrders}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('totalSales')}:</Text>
            <Text style={styles.bold}>₹{totalSales.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>GST:</Text>
            <Text style={styles.bold}>₹{totalGst.toFixed(2)}</Text>
          </View>
        </View>

        {/* Profit Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 {t('expensesProfit')} ({periodLabel})</Text>
          <View style={styles.row}>
            <Text style={styles.label}>{t('totalExpensesLabel')}:</Text>
            <Text style={styles.bold}>₹{totalExpenses.toFixed(2)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>{t('profitLabel')}:</Text>
            <Text style={[styles.bold, { color: profit >= 0 ? '#2E7D32' : '#C62828' }]}>
              ₹{profit.toFixed(2)}
            </Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={openExpenseModal}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ {t('addExpenseLabel')}</Text>
          </TouchableOpacity>
        </View>

        {/* Expense List */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📑 {t('expensesLabel')}</Text>
          {filteredExpenses.length === 0 ? (
            <Text style={styles.emptyText}>{t('noExpensesRecorded')}</Text>
          ) : (
            filteredExpenses.map((exp) => (
              <TouchableOpacity
                key={exp.id}
                style={styles.expenseItem}
                onLongPress={() => handleDeleteExpense(exp.id)}
                delayLongPress={500}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.bold}>{exp.category}</Text>
                  {exp.description ? (
                    <Text style={styles.small}>{exp.description}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.bold}>₹{exp.amount.toFixed(2)}</Text>
                  <Text style={styles.small}>{exp.date}</Text>
                  <Text style={styles.deleteHint}>(Hold to delete)</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Backup Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💾 {t('backupRestore')}</Text>
          <Text style={styles.infoText}>{t('backupInfo1')}</Text>
          <TouchableOpacity style={styles.backupBtn} onPress={handleBackup}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('backupDataLabel')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.backupBtn, { backgroundColor: '#FF7043', marginTop: 10 }]} 
            onPress={handleRestore}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>{t('restoreDataLabel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
                style={[styles.modalInput, !isAmountValid && styles.inputError]}
                value={expenseAmount}
                onChangeText={(val) => {
                  setExpenseAmount(val);
                  setIsAmountValid(true);
                }}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  headerContainer: { backgroundColor: '#fff', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f0f0', borderRadius: 20, paddingHorizontal: 15, height: 45, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  clearIcon: { fontWeight: 'bold', color: '#999', padding: 5, fontSize: 18 },
  periodScroll: { flexDirection: 'row' },
  periodBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 10 },
  periodBtnActive: { backgroundColor: '#8B0000' },
  periodText: { fontSize: 12, color: '#666', fontWeight: '600' },
  card: { backgroundColor: '#fff', margin: 10, borderRadius: 15, padding: 15, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  label: { fontSize: 14, color: '#555' },
  bold: { fontWeight: 'bold', color: '#333' },
  small: { fontSize: 11, color: '#999' },
  addBtn: { backgroundColor: '#FF9800', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  expenseItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backupBtn: { backgroundColor: '#2196F3', padding: 12, borderRadius: 10, alignItems: 'center' },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
  deleteHint: { fontSize: 10, color: '#C62828', textAlign: 'right', marginTop: 2 },
  infoText: { fontSize: 13, color: '#666', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 15, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B0000', textAlign: 'center', marginBottom: 10 },
  modalLabel: { fontSize: 14, color: '#666', marginTop: 10, marginBottom: 4 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fafafa' },
  inputError: { borderColor: '#C62828', backgroundColor: '#FFFEEB' },
  modalButtons: { flexDirection: 'row', marginTop: 20 },
  modalCancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', marginRight: 8 },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalSaveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#8B0000', alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: 'bold' },
});