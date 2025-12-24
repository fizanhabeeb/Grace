// src/screens/ReportsScreen.js
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
import { loadOrderHistory, loadExpenses, addExpense, removeExpense, createBackupObject } from '../utils/storage';
import { restoreAllData } from '../utils/backup';

import * as Sharing from 'expo-sharing';
// UPDATED: Import from legacy to fix the deprecation error
import * as FileSystem from 'expo-file-system/legacy'; 

export default function ReportsScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState('today');
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [searchText, setSearchText] = useState('');
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
    setOrders(history || []);
    setExpenses(exp || []);
  };

  const filterByPeriod = (dateStr) => {
    if (!dateStr) return false;
    const today = new Date().toLocaleDateString('en-IN');
    if (period === 'today') return dateStr === today;
    
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const d = new Date(parts[2], parts[1] - 1, parts[0]);
    const now = new Date();

    if (period === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return d >= weekAgo;
    }
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredOrders = orders.filter((o) => filterByPeriod(o.date));
  
  // Sales split for reconciliation
  const cashSales = filteredOrders.filter(o => o.paymentMode === 'Cash' || !o.paymentMode).reduce((s, o) => s + (o.grandTotal || 0), 0);
  const upiSales = filteredOrders.filter(o => o.paymentMode === 'UPI').reduce((s, o) => s + (o.grandTotal || 0), 0);
  const cardSales = filteredOrders.filter(o => o.paymentMode === 'Card').reduce((s, o) => s + (o.grandTotal || 0), 0);

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
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const profit = totalSales - totalExpenses;

  // FIX: Cloud Backup logic using Legacy FileSystem
  const handleCloudBackup = async () => {
    try {
      const backupData = await createBackupObject();
      
      if (!backupData || Object.keys(backupData).length === 0) {
        Alert.alert("No Data", "There is no data to back up yet.");
        return;
      }

      // Generate file path
      const fileName = `Grace_POS_Backup_${new Date().getTime()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      
      // Convert data to string
      const jsonString = JSON.stringify(backupData);
      
      // Write file using legacy method
      await FileSystem.writeAsStringAsync(fileUri, jsonString, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Backup Hotel Grace Data',
          UTI: 'public.json'
        });
      } else {
        Alert.alert("Error", "Sharing is not supported on this device.");
      }
    } catch (error) {
      console.log("Backup Error Detail:", error);
      Alert.alert("Backup Failed", "Please check permissions and try again.");
    }
  };

  const handleSaveExpense = async () => {
    const amountNum = parseFloat(expenseAmount);
    if (!expenseAmount || isNaN(amountNum)) {
      setIsAmountValid(false);
      Alert.alert(t('error'), t('invalidAmountMessage'));
      return;
    }
    await addExpense({ category: expenseCategory || 'General', description: expenseDescription || '', amount: amountNum });
    setExpenseModalVisible(false);
    loadData();
  };

  const handleDeleteExpense = (id) => {
    Alert.alert(t('delete'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await removeExpense(id); loadData(); } },
    ]);
  };

  return (
    <View style={styles.container}>
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

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💰 {t('salesSummary')}</Text>
          <View style={styles.row}><Text>Cash Sales:</Text><Text style={styles.bold}>₹{cashSales.toFixed(2)}</Text></View>
          <View style={styles.row}><Text>UPI Sales:</Text><Text style={styles.bold}>₹{upiSales.toFixed(2)}</Text></View>
          <View style={styles.row}><Text>Card Sales:</Text><Text style={styles.bold}>₹{cardSales.toFixed(2)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.grandBold}>{t('totalSales')}:</Text>
            <Text style={styles.grandBold}>₹{totalSales.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📉 Profit Analysis</Text>
          <View style={styles.row}><Text>Total Expenses:</Text><Text style={styles.bold}>₹{totalExpenses.toFixed(2)}</Text></View>
          <View style={styles.row}>
            <Text>Net Profit:</Text>
            <Text style={[styles.bold, { color: profit >= 0 ? '#2E7D32' : '#C62828' }]}>₹{profit.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setExpenseModalVisible(true)}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ {t('addExpenseLabel')}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📑 Expense List</Text>
          {filteredExpenses.length === 0 ? (
            <Text style={styles.emptyText}>{t('noExpensesRecorded')}</Text>
          ) : (
            filteredExpenses.map((exp) => (
              <TouchableOpacity key={exp.id} style={styles.expenseItem} onLongPress={() => handleDeleteExpense(exp.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bold}>{exp.category}</Text>
                  {exp.description ? <Text style={styles.small}>{exp.description}</Text> : null}
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

        <View style={styles.card}>
          <Text style={styles.cardTitle}>☁️ Backup & Sync</Text>
          <Text style={styles.infoText}>Save your data to Google Drive, WhatsApp, or Email to prevent loss.</Text>
          <TouchableOpacity style={styles.cloudBtn} onPress={handleCloudBackup}>
            <Text style={styles.cloudBtnText}>Backup to Cloud / Google Drive</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={[styles.backupBtn, {backgroundColor: '#FF7043'}]} onPress={restoreAllData}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>⏪ {t('restoreDataLabel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={expenseModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>{t('addExpenseLabel')}</Text>
              <TextInput style={styles.modalInput} value={expenseCategory} onChangeText={setExpenseCategory} placeholder="Category" />
              <TextInput style={styles.modalInput} value={expenseDescription} onChangeText={setExpenseDescription} placeholder="Description" />
              <TextInput style={[styles.modalInput, !isAmountValid && styles.inputError]} value={expenseAmount} onChangeText={(v) => {setExpenseAmount(v); setIsAmountValid(true);}} placeholder="Amount" keyboardType="numeric" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.modalCancelButton} onPress={() => setExpenseModalVisible(false)}><Text>{t('cancel')}</Text></TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveExpense}><Text>{t('save')}</Text></TouchableOpacity>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  bold: { fontWeight: 'bold', color: '#333' },
  grandBold: { fontSize: 18, fontWeight: 'bold', color: '#8B0000' },
  small: { fontSize: 11, color: '#999' },
  addBtn: { backgroundColor: '#FF9800', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  expenseItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  cloudBtn: { backgroundColor: '#4285F4', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  cloudBtnText: { color: '#fff', fontWeight: 'bold' },
  backupBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  emptyText: { color: '#999', fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
  deleteHint: { fontSize: 10, color: '#C62828', textAlign: 'right', marginTop: 2 },
  infoText: { fontSize: 13, color: '#666', marginBottom: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 15, padding: 15, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#8B0000', textAlign: 'center', marginBottom: 10 },
  modalInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, backgroundColor: '#fafafa', marginBottom: 10 },
  inputError: { borderColor: '#C62828', backgroundColor: '#FFFEEB' },
  modalButtons: { flexDirection: 'row', marginTop: 20 },
  modalCancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', marginRight: 8 },
  modalSaveButton: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#8B0000', alignItems: 'center' },
});