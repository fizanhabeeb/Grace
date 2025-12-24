// src/screens/HistoryScreen.js
// Shows order history + export to CSV + Remove individual bills

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
import { loadOrderHistory, clearOrderHistory, removeOrderFromHistory } from '../utils/storage';
import { exportSalesToLocalCsv } from '../utils/exportToCsv';

export default function HistoryScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filterDate, setFilterDate] = useState('all'); // 'all' | 'today' | 'week'

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
    setOrders(history);
  };

  const getFilteredOrders = () => {
    const todayStr = new Date().toLocaleDateString('en-IN'); // dd/mm/yyyy
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    switch (filterDate) {
      case 'today':
        return orders.filter((order) => order.date === todayStr);
      case 'week':
        return orders.filter((order) => {
          if (!order.date) return false;
          const parts = order.date.split('/');
          if (parts.length !== 3) return false;
          const orderDate = new Date(parts[2], parts[1] - 1, parts[0]);
          return orderDate >= weekAgo;
        });
      default:
        return orders;
    }
  };

  const calculateTotalSales = () => {
    return getFilteredOrders().reduce((sum, order) => sum + order.grandTotal, 0);
  };

  // Handler for deleting a single bill
  const handleDeleteBill = (orderId, billNumber) => {
    Alert.alert(
      t('deleteBill') || 'Delete Bill',
      `${t('deleteConfirm') || 'Are you sure you want to delete bill'} #${billNumber}?`,
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
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setModalVisible(true);
      }}
      onLongPress={() => handleDeleteBill(item.id, item.billNumber)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.billNumber}>{t('bill')} #{item.billNumber}</Text>
        <Text style={styles.orderAmount}>₹{item.grandTotal.toFixed(2)}</Text>
      </View>
      <View style={styles.orderDetails}>
        <Text style={styles.orderDate}>📅 {item.date}</Text>
        <Text style={styles.orderTime}>🕐 {item.time}</Text>
      </View>
      <View style={styles.orderMeta}>
        <Text style={styles.orderItems}>
          {item.items.length} {t('items')} •{' '}
          {item.items.reduce((sum, i) => sum + i.quantity, 0)} {t('qty')}
        </Text>
        <Text style={{fontSize: 10, color: '#C62828', fontStyle: 'italic'}}>(Hold to delete)</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryNumber}>{filteredOrders.length}</Text>
          <Text style={styles.summaryLabel}>{t('orders')}</Text>
        </View>
        <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
          <Text style={[styles.summaryNumber, styles.summaryNumberHighlight]}>
            ₹{calculateTotalSales().toFixed(0)}
          </Text>
          <Text style={[styles.summaryLabel, styles.summaryLabelHighlight]}>
            {t('totalSales')}
          </Text>
        </View>
      </View>

      <View style={styles.filterContainer}>
        {['all', 'today', 'week'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterButton, filterDate === f && styles.filterButtonActive]}
            onPress={() => setFilterDate(f)}
          >
            <Text style={[styles.filterText, filterDate === f && styles.filterTextActive]}>
              {t(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.exportContainer}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExportToCsv}>
          <Text style={styles.exportButtonText}>⬆ Export CSV (Offline)</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredOrders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContainer, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>{t('noOrdersFound')}</Text>
            <Text style={styles.emptySubtext}>Completed orders will appear here</Text>
          </View>
        }
      />

      {orders.length > 0 && (
        <View style={[styles.clearButtonContainer, { bottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
            <Text style={styles.clearButtonText}>{t('clearHistory')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15}}>
                   <Text style={styles.modalTitle}>{t('bill')} #{selectedOrder.billNumber}</Text>
                   <TouchableOpacity onPress={() => handleDeleteBill(selectedOrder.id, selectedOrder.billNumber)}>
                      <Text style={{fontSize: 24}}>🗑️</Text>
                   </TouchableOpacity>
                </View>
                
                <View style={styles.modalInfo}>
                  <Text style={styles.modalInfoText}>📅 {selectedOrder.date}</Text>
                  <Text style={styles.modalInfoText}>🕐 {selectedOrder.time}</Text>
                  {selectedOrder.tableNumber && <Text style={styles.modalInfoText}>🪑 {t('table')}: {selectedOrder.tableNumber}</Text>}
                  {selectedOrder.customerName && <Text style={styles.modalInfoText}>👤 {selectedOrder.customerName}</Text>}
                </View>

                <Text style={styles.modalSectionTitle}>{t('items')}:</Text>
                {selectedOrder.items.map((item, index) => (
                  <View key={index} style={styles.modalItem}>
                    <Text style={styles.modalItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.modalItemQty}>x{item.quantity}</Text>
                    <Text style={styles.modalItemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
                  </View>
                ))}

                <View style={styles.modalTotals}>
                  <View style={styles.modalTotalRow}><Text style={styles.modalTotalLabel}>{t('subtotal')}:</Text><Text style={styles.modalTotalValue}>₹{selectedOrder.subtotal.toFixed(2)}</Text></View>
                  {selectedOrder.gstEnabled !== false && (
                    <View style={styles.modalTotalRow}><Text style={styles.modalTotalLabel}>{t('gst')} ({selectedOrder.gstPercentage || 5}%):</Text><Text style={styles.modalTotalValue}>₹{selectedOrder.gst.toFixed(2)}</Text></View>
                  )}
                  <View style={styles.modalGrandTotal}><Text style={styles.modalGrandTotalText}>{t('grandTotal')}:</Text><Text style={styles.modalGrandTotalValue}>₹{selectedOrder.grandTotal.toFixed(2)}</Text></View>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCloseButtonText}>{t('close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  summaryContainer: { flexDirection: 'row', padding: 12 },
  summaryCard: { flex: 1, backgroundColor: '#fff', paddingVertical: 18, borderRadius: 12, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
  summaryCardHighlight: { backgroundColor: '#8B0000' },
  summaryNumber: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  summaryNumberHighlight: { color: '#fff' },
  summaryLabel: { fontSize: 13, color: '#666', marginTop: 4 },
  summaryLabelHighlight: { color: '#ffcccc' },
  filterContainer: { flexDirection: 'row', paddingHorizontal: 12, marginBottom: 10 },
  filterButton: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', marginRight: 10, elevation: 1 },
  filterButtonActive: { backgroundColor: '#8B0000' },
  filterText: { color: '#666', fontWeight: '600', fontSize: 13 },
  filterTextActive: { color: '#fff' },
  exportContainer: { paddingHorizontal: 12, marginBottom: 5 },
  exportButton: { backgroundColor: '#4CAF50', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  exportButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  listContainer: { paddingHorizontal: 12 },
  orderCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  billNumber: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  orderAmount: { fontSize: 18, fontWeight: 'bold', color: '#8B0000' },
  orderDetails: { flexDirection: 'row', marginBottom: 6 },
  orderDate: { fontSize: 13, color: '#666', marginRight: 15 },
  orderTime: { fontSize: 13, color: '#666' },
  orderMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderItems: { fontSize: 13, color: '#999' },
  emptyContainer: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 20, color: '#999', fontWeight: '600' },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 8, textAlign: 'center' },
  clearButtonContainer: { position: 'absolute', left: 15, right: 15 },
  clearButton: { backgroundColor: '#ff4444', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  clearButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#8B0000', textAlign: 'center' },
  modalInfo: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, marginVertical: 15 },
  modalInfoText: { fontSize: 14, color: '#555', marginBottom: 5 },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  modalItem: { flexDirection: 'row', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee', alignItems: 'center' },
  modalItemName: { flex: 2, fontSize: 15, color: '#333' },
  modalItemQty: { flex: 0.5, fontSize: 14, textAlign: 'center', color: '#666' },
  modalItemPrice: { flex: 1, fontSize: 15, textAlign: 'right', fontWeight: '600', color: '#333' },
  modalTotals: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#ddd' },
  modalTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  modalTotalLabel: { fontSize: 15, color: '#666' },
  modalTotalValue: { fontSize: 15, color: '#333' },
  modalGrandTotal: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#8B0000', marginTop: 10, paddingTop: 12 },
  modalGrandTotalText: { fontSize: 18, fontWeight: 'bold', color: '#8B0000' },
  modalGrandTotalValue: { fontSize: 20, fontWeight: 'bold', color: '#8B0000' },
  modalCloseButton: { backgroundColor: '#8B0000', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 15 },
  modalCloseButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});