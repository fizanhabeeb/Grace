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
import { useTheme } from '../context/ThemeContext';
import { 
  loadOrderHistory, 
  loadExpenses, 
  addExpense, 
  removeExpense, 
  createBackupObject,
  updateLastBackupTimestamp 
} from '../utils/storage';
import { restoreAllData } from '../utils/backup';
import { exportSalesToLocalCsv } from '../utils/exportToCsv';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy'; 
// --- IMPORT NEW HELPERS ---
import { safeDate, isToday, formatDateForDisplay } from '../utils/dateHelpers';

export default function ReportsScreen() {
  const { t } = useLanguage();
  const { theme, isDark } = useTheme();
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

  // Safe Math Helper
  const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

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

  // --- UPDATED FILTER LOGIC USING SAFE DATE ---
  const filterByPeriod = (dateStr) => {
    if (!dateStr) return false;
    
    // Use safeDate to convert mixed formats (text or ISO) to a Date Object
    const dateObj = safeDate(dateStr);
    const now = new Date();

    if (period === 'today') {
        return isToday(dateObj);
    }
    if (period === 'week') {
        const weekAgo = new Date();
        weekAgo.setDate(now.getDate() - 7);
        return dateObj >= weekAgo;
    }
    if (period === 'month') {
        return dateObj.getMonth() === now.getMonth() && dateObj.getFullYear() === now.getFullYear();
    }
    // 'all'
    return true;
  };

  const filteredOrders = orders.filter((o) => filterByPeriod(o.date));
  
  const cashSales = round(filteredOrders.filter(o => o.paymentMode === 'Cash' || !o.paymentMode).reduce((s, o) => s + (o.grandTotal || 0), 0));
  const upiSales = round(filteredOrders.filter(o => o.paymentMode === 'UPI').reduce((s, o) => s + (o.grandTotal || 0), 0));
  const cardSales = round(filteredOrders.filter(o => o.paymentMode === 'Card').reduce((s, o) => s + (o.grandTotal || 0), 0));

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesPeriod = filterByPeriod(e.date);
      const matchesSearch = e.category.toLowerCase().includes(searchText.toLowerCase()) || 
                            e.description.toLowerCase().includes(searchText.toLowerCase());
      return matchesPeriod && matchesSearch;
    });
  }, [expenses, period, searchText]);

  const totalSales = round(filteredOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0));
  const totalExpenses = round(filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0));
  const profit = round(totalSales - totalExpenses);

  // Cloud Backup logic
  const handleCloudBackup = async () => {
    try {
      const backupData = await createBackupObject();
      if (!backupData || Object.keys(backupData).length === 0) {
        Alert.alert("No Data", "There is no data to back up yet.");
        return;
      }
      const fileName = `Grace_POS_Backup_${new Date().getTime()}.json`;
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      const jsonString = JSON.stringify(backupData);
      
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Backup Hotel Grace Data',
          UTI: 'public.json'
        });
        await updateLastBackupTimestamp();
      } else {
        Alert.alert("Error", "Sharing is not supported on this device.");
      }
    } catch (error) {
      Alert.alert("Backup Failed", "Please check permissions and try again.");
    }
  };

  const handleCloseDay = async () => {
    // Filter today's orders using safe helper
    const todayOrders = orders.filter(o => isToday(o.date));
    
    if (todayOrders.length === 0) {
      Alert.alert("No Sales", "No orders recorded for today yet.");
      return;
    }

    const total = round(todayOrders.reduce((s, o) => s + (o.grandTotal || 0), 0));
    const cash = round(todayOrders.filter(o => o.paymentMode === 'Cash' || !o.paymentMode).reduce((s, o) => s + (o.grandTotal || 0), 0));
    const upi = round(todayOrders.filter(o => o.paymentMode === 'UPI').reduce((s, o) => s + (o.grandTotal || 0), 0));

    Alert.alert(
      "🏁 Close Day & Export",
      `Total Sales: ₹${total.toFixed(2)}\nCash: ₹${cash.toFixed(2)}\nUPI: ₹${upi.toFixed(2)}\n\nThis will export today's bills to CSV and backup data.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Export & Close", 
          onPress: async () => {
            await exportSalesToLocalCsv({ period: 'today', orders: todayOrders });
            setTimeout(async () => {
                Alert.alert("Cloud Backup", "Do you want to save a full data backup to Google Drive?", [
                        { text: "No", style: "cancel" },
                        { text: "Yes, Backup", onPress: async () => await handleCloudBackup() }
                ]);
            }, 1000); 
          } 
        }
      ]
    );
  };

  const handleSaveExpense = async () => {
    const amountNum = parseFloat(expenseAmount);
    if (!expenseAmount || isNaN(amountNum)) {
      setIsAmountValid(false);
      Alert.alert(t('error'), t('invalidAmountMessage'));
      return;
    }
    // Save current time as ISO String
    await addExpense({ 
        category: expenseCategory || 'General', 
        description: expenseDescription || '', 
        amount: round(amountNum),
        date: new Date().toISOString() // Ensure ISO
    });
    setExpenseModalVisible(false);
    loadData();
    setExpenseCategory('');
    setExpenseDescription('');
    setExpenseAmount('');
  };

  const handleDeleteExpense = (id) => {
    Alert.alert(t('delete'), t('deleteConfirm'), [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: async () => { await removeExpense(id); loadData(); } },
    ]);
  };

  const cardStyle = [styles.card, { backgroundColor: theme.card }];
  const textPrimary = { color: theme.text };
  const textSecondary = { color: theme.textSecondary };
  const inputStyle = [styles.modalInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.headerContainer, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <View style={[styles.searchWrapper, { backgroundColor: theme.inputBackground }]}>
          <Text style={{ marginRight: 8 }}>🔍</Text>
          <TextInput 
            style={[styles.searchInput, { color: theme.text }]} 
            placeholder={t('search') || "Search..."} 
            placeholderTextColor={theme.textSecondary}
            value={searchText} 
            onChangeText={setSearchText} 
          />
          {searchText !== '' && (
            <TouchableOpacity onPress={() => setSearchText('')}>
              <Text style={[styles.clearIcon, { color: theme.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodScroll}>
          {['today', 'week', 'month', 'all'].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodBtn, 
                period === p ? { backgroundColor: theme.primary } : { backgroundColor: theme.inputBackground }
              ]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p ? { color: '#fff' } : { color: theme.text }]}>
                {t(p === 'all' ? 'allTime' : p === 'week' ? 'thisWeek' : p === 'month' ? 'thisMonth' : 'today')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        {/* Sales */}
        <View style={cardStyle}>
          <Text style={[styles.cardTitle, { color: theme.primary }]}>💰 {t('salesSummary')}</Text>
          <View style={styles.row}><Text style={textSecondary}>Cash Sales:</Text><Text style={[styles.bold, textPrimary]}>₹{cashSales.toFixed(2)}</Text></View>
          <View style={styles.row}><Text style={textSecondary}>UPI Sales:</Text><Text style={[styles.bold, textPrimary]}>₹{upiSales.toFixed(2)}</Text></View>
          <View style={styles.row}><Text style={textSecondary}>Card Sales:</Text><Text style={[styles.bold, textPrimary]}>₹{cardSales.toFixed(2)}</Text></View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.row}>
            <Text style={[styles.grandBold, { color: theme.primary }]}>{t('totalSales')}:</Text>
            <Text style={[styles.grandBold, { color: theme.primary }]}>₹{totalSales.toFixed(2)}</Text>
          </View>
        </View>

        {/* Profit */}
        <View style={cardStyle}>
          <Text style={[styles.cardTitle, { color: theme.primary }]}>📉 {t('profitAnalysis')}</Text>
          <View style={styles.row}><Text style={textSecondary}>Total Expenses:</Text><Text style={[styles.bold, textPrimary]}>₹{totalExpenses.toFixed(2)}</Text></View>
          <View style={styles.row}>
            <Text style={textSecondary}>Net Profit:</Text>
            <Text style={[styles.bold, { color: profit >= 0 ? '#4CAF50' : '#ff4444' }]}>₹{profit.toFixed(2)}</Text>
          </View>
          <TouchableOpacity style={[styles.addBtn, { backgroundColor: '#FF9800' }]} onPress={() => setExpenseModalVisible(true)}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ {t('addExpenseLabel')}</Text>
          </TouchableOpacity>
        </View>

        {/* Close Day */}
        <View style={[cardStyle, { borderTopWidth: 5, borderTopColor: theme.primary }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>🏁 {t('dayEndOperations')}</Text>
          <Text style={[styles.infoText, textSecondary]}>{t('dayEndSubtitle')}</Text>
          <TouchableOpacity style={[styles.closeDayBtn, { backgroundColor: theme.text, borderColor: theme.border }]} onPress={handleCloseDay}>
            <Text style={[styles.closeDayBtnText, { color: theme.background }]}>{t('closeBusiness')}</Text>
          </TouchableOpacity>
        </View>

        {/* Expenses */}
        <View style={cardStyle}>
          <Text style={[styles.cardTitle, { color: theme.primary }]}>📑 {t('expenseList')}</Text>
          {filteredExpenses.length === 0 ? (
            <Text style={[styles.emptyText, textSecondary]}>{t('noExpensesRecorded')}</Text>
          ) : (
            filteredExpenses.map((exp) => (
              <TouchableOpacity key={exp.id} style={[styles.expenseItem, { borderBottomColor: theme.border }]} onLongPress={() => handleDeleteExpense(exp.id)}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bold, textPrimary]}>{exp.category}</Text>
                  {exp.description ? <Text style={[styles.small, textSecondary]}>{exp.description}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.bold, textPrimary]}>₹{exp.amount.toFixed(2)}</Text>
                  {/* DISPLAY SAFE DATE */}
                  <Text style={[styles.small, textSecondary]}>{formatDateForDisplay(exp.date)}</Text>
                  <Text style={styles.deleteHint}>(Hold to delete)</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Backup */}
        <View style={cardStyle}>
          <Text style={[styles.cardTitle, { color: theme.primary }]}>☁️ {t('backupSync')}</Text>
          <Text style={[styles.infoText, textSecondary]}>{t('backupSubtitle')}</Text>
          <TouchableOpacity style={[styles.cloudBtn, { backgroundColor: '#4285F4' }]} onPress={handleCloudBackup}>
            <Text style={styles.cloudBtnText}>{t('backupDrive')}</Text>
          </TouchableOpacity>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <TouchableOpacity style={[styles.backupBtn, {backgroundColor: '#FF7043'}]} onPress={() => {
            Alert.alert(t('restoreConfirmTitle'), t('restoreConfirmMessage'), [
              { text: t('cancel'), style: 'cancel' },
              { text: t('restoreDataLabel'), style: 'destructive', onPress: async () => { await restoreAllData(); loadData(); } },
            ]);
          }}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>⏪ {t('restoreDataLabel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Expense Modal */}
      <Modal visible={expenseModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: theme.primary }]}>{t('addExpenseLabel')}</Text>
              <TextInput style={inputStyle} value={expenseCategory} onChangeText={setExpenseCategory} placeholder={t('category') || "Category"} placeholderTextColor={theme.textSecondary} />
              <TextInput style={inputStyle} value={expenseDescription} onChangeText={setExpenseDescription} placeholder="Description" placeholderTextColor={theme.textSecondary} />
              <TextInput style={[inputStyle, !isAmountValid && styles.inputError]} value={expenseAmount} onChangeText={(v) => {setExpenseAmount(v); setIsAmountValid(true);}} placeholder={t('price') || "Amount"} keyboardType="numeric" placeholderTextColor={theme.textSecondary} />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalCancelButton, { borderColor: theme.border }]} onPress={() => setExpenseModalVisible(false)}>
                    <Text style={{ color: theme.text }}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSaveButton, { backgroundColor: theme.primary }]} onPress={handleSaveExpense}>
                    <Text style={{ color: '#fff' }}>{t('save')}</Text>
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
  container: { flex: 1 },
  headerContainer: { padding: 10, borderBottomWidth: 1 },
  searchWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingHorizontal: 15, height: 45, marginBottom: 10 },
  searchInput: { flex: 1, fontSize: 15 },
  clearIcon: { fontWeight: 'bold', padding: 5, fontSize: 18 },
  periodScroll: { flexDirection: 'row' },
  periodBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10 },
  periodText: { fontSize: 12, fontWeight: '600' },
  card: { margin: 10, borderRadius: 15, padding: 15, elevation: 2 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  divider: { height: 1, marginVertical: 10 },
  bold: { fontWeight: 'bold' },
  grandBold: { fontSize: 18, fontWeight: 'bold' },
  small: { fontSize: 11 },
  addBtn: { padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  expenseItem: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1 },
  cloudBtn: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  cloudBtnText: { color: '#fff', fontWeight: 'bold' },
  backupBtn: { padding: 12, borderRadius: 10, alignItems: 'center' },
  emptyText: { fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
  deleteHint: { fontSize: 10, color: '#ff4444', textAlign: 'right', marginTop: 2 },
  infoText: { fontSize: 13, marginBottom: 10 },
  closeDayBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, borderWidth: 1 },
  closeDayBtnText: { fontWeight: '900', letterSpacing: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 15, padding: 15, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  modalInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 10 },
  inputError: { borderColor: '#C62828' },
  modalButtons: { flexDirection: 'row', marginTop: 20 },
  modalCancelButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, alignItems: 'center', marginRight: 8 },
  modalSaveButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
});