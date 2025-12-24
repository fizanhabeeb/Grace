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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import useOrientation from '../utils/useOrientation';
import { getTodaysSales, loadOrderHistory } from '../utils/storage';

export default function HomeScreen({ navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { isLandscape, isSmallScreen, isTablet } = useOrientation();
  
  const [todaySales, setTodaySales] = useState({ count: 0, total: 0 });
  const [recentOrders, setRecentOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const sales = await getTodaysSales();
    setTodaySales(sales);
    const history = await loadOrderHistory();
    setRecentOrders(history.slice(0, 5));
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

  const getCurrentDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-IN', options);
  };

  // Dynamic styles based on orientation
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
    },
    statsRow: {
      flexDirection: isLandscape && !isTablet ? 'column' : 'row',
    },
    actionButton: {
      paddingVertical: isLandscape ? 12 : 16,
    },
  };

  return (
    <View style={styles.mainWrapper}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={dynamicStyles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B0000']} />
        }
      >
        {/* Header */}
        <View style={[styles.header, dynamicStyles.header]}>
          <View style={isLandscape ? {} : { alignItems: 'center' }}>
            <Text style={styles.welcomeText}>{t('welcomeTo')}</Text>
            <Text style={[styles.hotelName, dynamicStyles.hotelName]}>🏨 {t('hotelName')}</Text>
            <Text style={styles.location}>📍 {t('location')}</Text>
          </View>
          <Text style={[styles.date, isLandscape && { marginTop: 0 }]}>{getCurrentDate()}</Text>
        </View>

        {/* Content Container */}
        <View style={dynamicStyles.contentContainer}>
          {/* Today's Summary */}
          <View style={[styles.card, dynamicStyles.card]}>
            <Text style={styles.sectionTitle}>📊 {t('todaysSummary')}</Text>
            <View style={[styles.statsRow, dynamicStyles.statsRow]}>
              <View style={[styles.statBox, isLandscape && !isTablet && { marginBottom: 8 }]}>
                <Text style={styles.statNumber}>{todaySales.count}</Text>
                <Text style={styles.statLabel}>{t('orders')}</Text>
              </View>
              <View style={[styles.statBox, styles.statBoxHighlight]}>
                <Text style={[styles.statNumber, styles.statNumberHighlight]}>
                  ₹{todaySales.total.toFixed(2)}
                </Text>
                <Text style={[styles.statLabel, styles.statLabelHighlight]}>{t('totalSales')}</Text>
              </View>
            </View>
          </View>

          {/* Quick Actions */}
          <View style={[styles.card, dynamicStyles.card]}>
            <Text style={styles.sectionTitle}>⚡ {t('quickActions')}</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, dynamicStyles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => navigation.navigate('Order')}
              >
                <Text style={styles.actionEmoji}>🛒</Text>
                <Text style={styles.actionText}>{t('newOrder')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, dynamicStyles.actionButton, { backgroundColor: '#2196F3' }]}
                onPress={() => navigation.navigate('Menu')}
              >
                <Text style={styles.actionEmoji}>📋</Text>
                <Text style={styles.actionText}>{t('editMenu')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={[styles.actionButton, dynamicStyles.actionButton, { backgroundColor: '#FF9800' }]}
                onPress={() => navigation.navigate('Bill')}
              >
                <Text style={styles.actionEmoji}>🧾</Text>
                <Text style={styles.actionText}>{t('viewBill')}</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, dynamicStyles.actionButton, { backgroundColor: '#9C27B0' }]}
                onPress={() => navigation.navigate('History')}
              >
                <Text style={styles.actionEmoji}>📊</Text>
                <Text style={styles.actionText}>{t('history')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Orders */}
          <View style={[styles.card, dynamicStyles.card, isLandscape && isTablet && { width: '32%' }]}>
            <Text style={styles.sectionTitle}>🕐 {t('recentOrders')}</Text>
            {recentOrders.length === 0 ? (
              <Text style={styles.noOrders}>{t('noOrdersYet')}</Text>
            ) : (
              recentOrders.slice(0, isLandscape ? 3 : 5).map((order, index) => (
                <View key={order.id} style={styles.orderItem}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderNumber}>{t('order')} #{order.billNumber || index + 1}</Text>
                    <Text style={styles.orderTime}>{order.time}</Text>
                  </View>
                  <Text style={styles.orderAmount}>₹{order.grandTotal.toFixed(2)}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: { 
    flex: 1, 
  },
  header: {
    backgroundColor: '#8B0000',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  welcomeText: { 
    color: '#ffcccc', 
    fontSize: 14,
  },
  hotelName: { 
    color: '#fff', 
    fontWeight: 'bold', 
    marginTop: 5,
  },
  location: { 
    color: '#ffcccc', 
    fontSize: 13, 
    marginTop: 5,
  },
  date: {
    color: '#fff',
    fontSize: 12,
    marginTop: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 12,
  },
  statsRow: { 
    justifyContent: 'space-between',
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statBoxHighlight: { 
    backgroundColor: '#8B0000',
  },
  statNumber: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333',
  },
  statNumberHighlight: { 
    color: '#fff',
  },
  statLabel: { 
    fontSize: 12, 
    color: '#666', 
    marginTop: 4,
  },
  statLabelHighlight: { 
    color: '#ffcccc',
  },
  actionRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionEmoji: { 
    fontSize: 26,
  },
  actionText: { 
    color: '#fff', 
    fontSize: 12, 
    fontWeight: 'bold', 
    marginTop: 4,
    textAlign: 'center',
  },
  noOrders: { 
    textAlign: 'center', 
    color: '#999', 
    fontStyle: 'italic',
    fontSize: 13,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  orderInfo: { 
    flex: 1,
  },
  orderNumber: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#333',
  },
  orderTime: { 
    fontSize: 11, 
    color: '#999', 
    marginTop: 2,
  },
  orderAmount: { 
    fontSize: 17, 
    fontWeight: 'bold', 
    color: '#8B0000',
  },
  footer: { 
    padding: 20, 
    alignItems: 'center',
  },
  footerText: { 
    color: '#999', 
    fontSize: 11,
  },
});