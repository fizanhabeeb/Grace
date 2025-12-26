// src/screens/HistoryScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { loadOrderHistory, clearOrderHistory, removeOrderFromHistory } from '../utils/storage';
import { exportSalesToLocalCsv } from '../utils/exportToCsv';
// --- IMPORT NEW HELPERS ---
import { safeDate, formatDateForDisplay, formatTimeForDisplay, isToday } from '../utils/dateHelpers';

export default function HistoryScreen() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterDate, setFilterDate] = useState('all'); 

  const bottomPadding = Platform.OS === 'ios'
    ? insets.bottom + 80
    : insets.bottom + 70;

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    const history = await loadOrderHistory();
    // Sort by date descending (newest first) using safeDate
    const sorted = (history || []).sort((a, b) => safeDate(b.date) - safeDate(a.date));
    setOrders(sorted);
  };

  const getFilteredOrders = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    switch (filterDate) {
      case 'today':
        return orders.filter((order) => isToday(order.date));
      case 'week':
        return orders.filter((order) => {
          const d = safeDate(order.date);
          return d >= weekAgo;
        });
      default:
        return orders;
    }
  };

  const calculateTotalSales = () => {
    return getFilteredOrders().reduce((sum, order) => sum + (order.grandTotal || order.total || 0), 0);
  };

  const handleDeleteBill = (orderId, billNumber) => {
    Alert.alert(
      t('deleteBill') || 'Delete Bill',
      `${t('deleteConfirm') || 'Delete'} #${billNumber}?`,
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: async () => {
            const success = await removeOrderFromHistory(orderId);
            if (success) {
              setModalVisible(false);
              loadOrders();
            }
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      t('clearAllHistory'),
      t('deleteAllConfirm'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('deleteAll'),
          style: 'destructive',
          onPress: async () => {
            await clearOrderHistory();
            setOrders([]);
          },
        },
      ]
    );
  };

  const filteredOrders = getFilteredOrders();

  const handleExportToCsv = async () => {
    if (filteredOrders.length === 0) {
      Alert.alert('No data', 'No orders for this period to export.');
      return;
    }
    const periodLabel = filterDate === 'today' ? 'today' : filterDate === 'week' ? 'week' : 'all';
    await exportSalesToLocalCsv({
      period: periodLabel,
      orders: filteredOrders,
    });
  };

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.orderCard, { backgroundColor: theme.card }]}
      onPress={() => {
        setSelectedOrder(item);
        setModalVisible(true);
      }}
      onLongPress={() => handleDeleteBill(item.id, item.billNumber)}
    >
      <View style={styles.orderHeader}>
        <Text style={[styles.billNumber, { color: theme.text }]}>{t('bill')} #{item.billNumber}</Text>
        <Text style={[styles.orderAmount, { color: theme.primary }]}>₹{item.grandTotal ? item.grandTotal.toFixed(2) : item.total.toFixed(2)}</Text>
      </View>
      <View style={styles.orderDetails}>
        {/* USES HELPERS TO DISPLAY DATE CORRECTLY */}
        <Text style={[styles.orderDate, { color: theme.textSecondary }]}>
            📅 {formatDateForDisplay(item.date)}  🕐 {formatTimeForDisplay(item.date)}
        </Text>
      </View>
      <View style={styles.orderMeta}>
        <Text style={[styles.orderItems, { color: theme.textSecondary }]}>
          {item.items.length} {t('items')} •{' '}
          {item.items.reduce((sum, i) => sum + i.quantity, 0)} {t('qty')}
        </Text>
        <Text style={{fontSize: 10, color: '#ff4444', fontStyle: 'italic'}}>(Hold to delete)</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={[styles.summaryCard, { backgroundColor: theme.card }]}>
          <Text style={[styles.summaryNumber, { color: theme.text }]}>{filteredOrders.length}</Text>
          <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{t('orders')}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
          <Text style={[styles.summaryNumber, { color: '#fff' }]}>
            ₹{calculateTotalSales().toFixed(0)}
          </Text>
          <Text style={[styles.summaryLabel, { color: 'rgba(255,255,255,0.8)' }]}>
            {t('totalSales')}
          </Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        {['all', 'today', 'week'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterButton, 
              filterDate === f ? { backgroundColor: theme.primary } : { backgroundColor: theme.card }
            ]}
            onPress={() => setFilterDate(f)}
          >
            <Text style={[
              styles.filterText, 
              filterDate === f ? { color: '#fff' } : { color: theme.text }
            ]}>
              {t(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Export Button */}
      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportToCsv}>
          <Text style={styles.exportButtonText}>⬆ Export CSV (Offline)</Text>
        </TouchableOpacity>
      </View>

      {/* Order List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('noOrdersFound')}</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>Completed orders will appear here</Text>
          </View>
        }
      />

      {/* Clear All Button */}
      {orders.length > 0 && (
        <View style={[styles.clearButtonContainer, { bottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={[styles.clearButton, { backgroundColor: '#ff4444' }]} onPress={handleClearHistory}>
            <Text style={styles.clearButtonText}>{t('clearHistory')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Detail Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                   <Text style={[styles.modalTitle, { color: theme.primary }]}>{t('bill')} #{selectedOrder.billNumber}</Text>
                   <TouchableOpacity onPress={() => handleDeleteBill(selectedOrder.id, selectedOrder.billNumber)}>
                      <Text style={{fontSize: 24}}>🗑️</Text>
                   </TouchableOpacity>
                </View>
                
                <View style={[styles.modalInfo, { backgroundColor: theme.inputBackground }]}>
                  {/* USES HELPERS TO DISPLAY DATE CORRECTLY */}
                  <Text style={[styles.modalInfoText, { color: theme.text }]}>📅 {formatDateForDisplay(selectedOrder.date)}</Text>
                  <Text style={[styles.modalInfoText, { color: theme.text }]}>🕐 {formatTimeForDisplay(selectedOrder.date)}</Text>
                  
                  {selectedOrder.tableNumber && <Text style={[styles.modalInfoText, { color: theme.text }]}>🪑 {t('table')}: {selectedOrder.tableNumber}</Text>}
                  {selectedOrder.customerName && <Text style={[styles.modalInfoText, { color: theme.text }]}>👤 {selectedOrder.customerName}</Text>}
                </View>

                <Text style={[styles.modalSectionTitle, { color: theme.text }]}>{t('items')}:</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} style={[styles.modalItem, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.modalItemName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.modalItemQty, { color: theme.textSecondary }]}>x{item.quantity}</Text>
                    <Text style={[styles.modalItemPrice, { color: theme.text }]}>₹{(item.price * item.quantity).toFixed(0)}</Text>
                  </View>
                ))}

                <View style={[styles.modalTotals, { borderTopColor: theme.border }]}>
                  <View style={styles.modalTotalRow}>
                      <Text style={[styles.modalTotalLabel, { color: theme.textSecondary }]}>{t('subtotal')}:</Text>
                      <Text style={[styles.modalTotalValue, { color: theme.text }]}>₹{selectedOrder.subtotal ? selectedOrder.subtotal.toFixed(2) : selectedOrder.total.toFixed(2)}</Text>
                  </View>
                  {selectedOrder.gstEnabled && (
                    <View style={styles.modalTotalRow}>
                        <Text style={[styles.modalTotalLabel, { color: theme.textSecondary }]}>{t('gst')} ({selectedOrder.gstPercentage}%):</Text>
                        <Text style={[styles.modalTotalValue, { color: theme.text }]}>₹{selectedOrder.gst.toFixed(2)}</Text>
                    </View>
                  )}
                  <View style={[styles.modalGrandTotal, { borderTopColor: theme.primary }]}>
                      <Text style={[styles.modalGrandTotalText, { color: theme.primary }]}>{t('grandTotal')}:</Text>
                      <Text style={[styles.modalGrandTotalValue, { color: theme.primary }]}>₹{selectedOrder.grandTotal ? selectedOrder.grandTotal.toFixed(2) : selectedOrder.total.toFixed(2)}</Text>
                  </View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={[styles.modalCloseButton, { backgroundColor: theme.primary }]} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryContainer: { flexDirection: 'row', padding: 12 },
  summaryCard: { flex: 1, paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
  summaryNumber: { fontSize: 22, fontWeight: 'bold' },
  summaryLabel: { fontSize: 13, marginTop: 4 },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 10 },
  filterButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginRight: 10, elevation: 1 },
  filterText: { fontWeight: '600', fontSize: 13 },
  exportContainer: { paddingHorizontal: 12, marginBottom: 5 },
  exportButton: { backgroundColor: '#4CAF50', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  exportButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  listContainer: { paddingHorizontal: 12 },
  orderCard: { padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  billNumber: { fontSize: 16, fontWeight: 'bold' },
  orderAmount: { fontSize: 18, fontWeight: 'bold' },
  orderDetails: { flexDirection: 'row', marginBottom: 6 },
  orderDate: { fontSize: 13, marginRight: 15 },
  orderMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderItems: { fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 20, fontWeight: '600' },
  emptySubtext: { fontSize: 14, marginTop: 8, textAlign: 'center' },
  clearButtonContainer: { position: 'absolute', left: 15, right: 15 },
  clearButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  clearButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center' },
  modalInfo: { padding: 15, borderRadius: 12, marginVertical: 15 },
  modalInfoText: { fontSize: 14, marginBottom: 5 },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  modalItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, alignItems: 'center' },
  modalItemName: { flex: 2, fontSize: 15 },
  modalItemQty: { flex: 0.5, fontSize: 14, textAlign: 'center' },
  modalItemPrice: { flex: 1, fontSize: 15, textAlign: 'right', fontWeight: '600' },
  modalTotals: { marginTop: 15, paddingTop: 15, borderTopWidth: 1 },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  modalTotalLabel: { fontSize: 15 },
  modalTotalValue: { fontSize: 15 },
  modalGrandTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, marginTop: 10, paddingTop: 12 },
  modalGrandTotalText: { fontSize: 18, fontWeight: 'bold' },
  modalGrandTotalValue: { fontSize: 20, fontWeight: 'bold' },
  modalCloseButton: { paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  modalCloseButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});