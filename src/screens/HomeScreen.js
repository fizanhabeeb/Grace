// src/screens/HomeScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Platform,
  Modal,
  TextInput,
  Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import useOrientation from '../utils/useOrientation';
import { getTodaysSales, loadOrderHistory, getAllActiveOrders, getTableTotal, clearActiveTableOrder } from '../utils/storage';

export default function HomeScreen({ navigation }) {
  const { t } = useLanguage();
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape, isSmallScreen, isTablet } = useOrientation();
    
  const [todaySales, setTodaySales] = useState({ count: 0, total: 0 });
  const [dashboardTables, setDashboardTables] = useState([]); // Renamed for clarity
  const [recentOrders, setRecentOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');

  const loadData = async () => {
    // 1. Sales Data
    const sales = await getTodaysSales();
    setTodaySales(sales);

    // 2. Recent Orders Data
    const history = await loadOrderHistory();
    setRecentOrders(history.slice(0, 5));

    // 3. Visual Table Dashboard Data
    const activeOrdersMap = await getAllActiveOrders();
    
    // Define standard tables (1 to 12)
    const standardTables = Array.from({ length: 12 }, (_, i) => String(i + 1));
    
    // Combine standard tables with any other currently active tables (e.g., "Parcel", "20")
    const allTableKeys = new Set([...standardTables, ...Object.keys(activeOrdersMap)]);
    
    const tableList = Array.from(allTableKeys).map(tableNo => {
      const items = activeOrdersMap[tableNo] || [];
      return {
        tableNo,
        isOccupied: items.length > 0,
        itemsCount: items.reduce((s, i) => s + i.quantity, 0),
        total: getTableTotal(items)
      };
    });

    // Sort: Numeric sort for numbers, string sort for text
    tableList.sort((a, b) => {
      const numA = parseInt(a.tableNo);
      const numB = parseInt(b.tableNo);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.tableNo.localeCompare(b.tableNo);
    });

    setDashboardTables(tableList);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleNewOrder = () => {
    setNewTableNumber('');
    setModalVisible(true);
  };

  const startOrder = () => {
    if (!newTableNumber.trim()) {
      Alert.alert('Error', 'Please enter a table number');
      return;
    }
    setModalVisible(false);
    navigation.navigate('Order', { tableNo: newTableNumber.trim() });
  };

  // Handle Deletion
  const handleDeleteTable = (tableNo) => {
    Alert.alert(
        'Delete Order?',
        `Are you sure you want to clear the active order for Table ${tableNo}?`,
        [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive', 
                onPress: async () => {
                    await clearActiveTableOrder(tableNo);
                    await loadData(); // Refresh list immediately
                }
            }
        ]
    );
  };

  const getCurrentDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-IN', options);
  };
  
  const dynamicStyles = {
    container: {
      paddingBottom: Platform.OS === 'ios' ? insets.bottom + 20 : 30,
    },
    header: {
      paddingVertical: isLandscape ? 12 : 20,
      paddingHorizontal: isLandscape ? 30 : 20,
      flexDirection: isLandscape ? 'row' : 'column',
      justifyContent: isLandscape ? 'space-between' : 'center',
      alignItems: 'center',
    },
    hotelName: {
      fontSize: isLandscape ? 20 : (isSmallScreen ? 22 : 26),
    },
    contentContainer: {
      flexDirection: isLandscape ? 'row' : 'column',
      flexWrap: 'wrap',
      padding: isLandscape ? 8 : 12,
    },
    card: {
      width: isLandscape ? (isTablet ? '32%' : '48%') : '100%',
      marginHorizontal: isLandscape ? '0.5%' : 0,
      marginBottom: 12,
      backgroundColor: theme.card,
      shadowColor: isDark ? '#000' : '#000',
    },
    statsRow: {
        flexDirection: isLandscape && !isTablet ? 'column' : 'row',
    },
    actionButton: {
      paddingVertical: isLandscape ? 12 : 16,
    }
  };

  const textStyle = { color: theme.text };
  const subTextStyle = { color: theme.textSecondary };

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dynamicStyles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} tintColor={theme.primary} />}
      >
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header, { backgroundColor: theme.primary }]}>
          <View style={isLandscape ? {} : { alignItems: 'center' }}>
            <Text style={styles.welcomeText}>{t('welcomeTo')}</Text>
            <Text style={[styles.hotelName, dynamicStyles.hotelName]}>🏨 {t('hotelName')}</Text>
            <Text style={styles.location}>📍 {t('location')}</Text>
          </View>
          <Text style={[styles.date, isLandscape && { marginTop: 0 }]}>{getCurrentDate()}</Text>
        </View>

        {/* Content */}
        <View style={dynamicStyles.contentContainer}>
          
          {/* VISUAL TABLE DASHBOARD */}
          <View style={[styles.card, dynamicStyles.card, { width: '100%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>🪑 Table Dashboard</Text>
                <TouchableOpacity onPress={handleNewOrder} style={{ backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>+ Other</Text>
                </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {dashboardTables.map((table) => (
                    <TouchableOpacity 
                        key={table.tableNo}
                        style={[
                            styles.tableBox, 
                            { 
                                backgroundColor: table.isOccupied ? '#ff5252' : '#66bb6a', // Red if occupied, Green if empty
                                borderColor: table.isOccupied ? '#d32f2f' : '#43a047'
                            }
                        ]}
                        onPress={() => navigation.navigate('Order', { tableNo: table.tableNo })}
                        onLongPress={() => {
                            if(table.isOccupied) handleDeleteTable(table.tableNo);
                        }}
                        delayLongPress={500}
                    >
                        <Text style={[styles.tableNum, { color: '#fff' }]}>{table.tableNo}</Text>
                        {table.isOccupied ? (
                            <>
                                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11 }}>₹{table.total.toFixed(0)}</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>({table.itemsCount} itm)</Text>
                            </>
                        ) : (
                            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>Empty</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
          </View>

          {/* Today's Summary */}
          <View style={[styles.card, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>📊 {t('todaysSummary')}</Text>
            <View style={[styles.statsRow, dynamicStyles.statsRow]}>
              <View style={[styles.statBox, { backgroundColor: theme.statBox }]}>
                <Text style={[styles.statNumber, { color: theme.text }]}>{todaySales.count}</Text>
                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{t('orders')}</Text>
              </View>
              <View style={[styles.statBox, { backgroundColor: theme.primary }]}>
                <Text style={[styles.statNumber, { color: '#fff' }]}>₹{todaySales.total.toFixed(2)}</Text>
                <Text style={[styles.statLabel, { color: '#ffcccc' }]}>{t('totalSales')}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={[styles.card, dynamicStyles.card]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>⚡ {t('quickActions')}</Text>
            <View style={styles.actionRow}>
               <TouchableOpacity style={[styles.actionButton, dynamicStyles.actionButton, { backgroundColor: '#2196F3' }]} onPress={() => navigation.navigate('Menu')}>
                <Text style={styles.actionEmoji}>📋</Text>
                <Text style={styles.actionText}>{t('editMenu')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionButton, dynamicStyles.actionButton, { backgroundColor: '#FF9800' }]} onPress={() => navigation.navigate('Order', { tableNo: 'Counter' })}>
                <Text style={styles.actionEmoji}>🛒</Text>
                <Text style={styles.actionText}>Counter Order</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.actionRow}>
               <TouchableOpacity style={[styles.actionButton, dynamicStyles.actionButton, { backgroundColor: '#9C27B0' }]} onPress={() => navigation.navigate('History')}>
                <Text style={styles.actionEmoji}>📊</Text>
                <Text style={styles.actionText}>{t('history')}</Text>
              </TouchableOpacity>

               <TouchableOpacity style={[styles.actionButton, dynamicStyles.actionButton, { backgroundColor: '#607D8B' }]} onPress={() => navigation.navigate('Settings')}>
                <Text style={styles.actionEmoji}>⚙️</Text>
                <Text style={styles.actionText}>Settings</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Orders */}
          <View style={[styles.card, dynamicStyles.card, isLandscape && isTablet && { width: '32%' }]}>
            <Text style={[styles.sectionTitle, textStyle]}>🕐 {t('recentOrders')}</Text>
            {recentOrders.length === 0 ? (
              <Text style={styles.noOrders}>{t('noOrdersYet')}</Text>
            ) : (
              recentOrders.slice(0, isLandscape ? 3 : 5).map((order, index) => (
                <View key={order.id} style={[styles.orderItem, { borderBottomColor: theme.border }]}>
                  <View style={styles.orderInfo}>
                    <Text style={[styles.orderNumber, textStyle]}>{t('order')} #{order.billNumber || index + 1}</Text>
                    <Text style={[styles.orderTime, subTextStyle]}>{order.time}</Text>
                  </View>
                  <Text style={[styles.orderAmount, { color: theme.primary }]}>₹{order.grandTotal.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>

        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>{t('madeWithLove')}</Text>
        </View>
      </ScrollView>

      {/* New Table Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>Enter Table Number</Text>
                <TextInput 
                    style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                    placeholder="e.g., 20, Parcel"
                    placeholderTextColor={theme.textSecondary}
                    value={newTableNumber}
                    onChangeText={setNewTableNumber}
                    autoFocus={true}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.inputBackground }]} onPress={() => setModalVisible(false)}>
                        <Text style={{ color: theme.text }}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={startOrder}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Start Order</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1 },
  container: { flex: 1 },
  header: { borderBottomLeftRadius: 25, borderBottomRightRadius: 25 },
  welcomeText: { color: '#ffcccc', fontSize: 14 },
  hotelName: { color: '#fff', fontWeight: 'bold', fontSize: 24, marginTop: 5 },
  location: { color: '#ffcccc', fontSize: 13, marginTop: 5 },
  date: { color: '#fff', fontSize: 12, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 15 },
  card: { borderRadius: 12, padding: 15, elevation: 3, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  statsRow: { justifyContent: 'space-between' },
  statBox: { flex: 1, paddingVertical: 16, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  statNumber: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  actionButton: { flex: 1, borderRadius: 10, alignItems: 'center', marginHorizontal: 4 },
  actionEmoji: { fontSize: 26 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginTop: 4, textAlign: 'center' },
  footer: { padding: 20, alignItems: 'center' },
  footerText: { color: '#999', fontSize: 11 },
  
  // Table Dashboard Styles
  tableBox: {
      width: '22%', // Roughly 4 columns
      aspectRatio: 1,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 10,
      borderWidth: 1,
      elevation: 2
  },
  tableNum: { fontSize: 20, fontWeight: 'bold', marginBottom: 2 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: 300, padding: 20, borderRadius: 15, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  input: { width: '100%', height: 45, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  
  // Styles for Recent Orders
  noOrders: { textAlign: 'center', color: '#999', fontStyle: 'italic', fontSize: 13 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  orderInfo: { flex: 1 },
  orderNumber: { fontSize: 15, fontWeight: '600' },
  orderTime: { fontSize: 11, marginTop: 2 },
  orderAmount: { fontSize: 17, fontWeight: 'bold' },
});