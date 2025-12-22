// App.js – main navigation with language toggle, including Reports tab

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LanguageProvider, useLanguage } from './src/context/LanguageContext';

import HomeScreen from './src/screens/HomeScreen';
import MenuScreen from './src/screens/MenuScreen';
import OrderScreen from './src/screens/OrderScreen';
import BillScreen from './src/screens/BillScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');
const isSmallScreen = width < 380;

function TabIcon({ emoji }) {
  return (
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>{emoji}</Text>
    </View>
  );
}

function LanguageToggle() {
  const { language, toggleLanguage } = useLanguage();
  return (
    <View style={styles.langWrapper}>
      <Text onPress={toggleLanguage} style={styles.langButton}>
        {language === 'en' ? 'മലയാളം' : 'EN'}
      </Text>
    </View>
  );
}

function MainTabs() {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#8B0000' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold', fontSize: 18 },
        headerRight: () => <LanguageToggle />,
        tabBarActiveTintColor: '#8B0000',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerTitle: t('hotelName'),
          tabBarLabel: t('home'),
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          headerTitle: t('manageMenu'),
          tabBarLabel: t('menu'),
          tabBarIcon: () => <TabIcon emoji="📋" />,
        }}
      />
      <Tab.Screen
        name="Order"
        component={OrderScreen}
        options={{
          headerTitle: t('newOrder'),
          tabBarLabel: t('order'),
          tabBarIcon: () => <TabIcon emoji="🛒" />,
        }}
      />
      <Tab.Screen
        name="Bill"
        component={BillScreen}
        options={{
          headerTitle: t('generateBill'),
          tabBarLabel: t('bill'),
          tabBarIcon: () => <TabIcon emoji="🧾" />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          headerTitle: t('orderHistory'),
          tabBarLabel: t('history'),
          tabBarIcon: () => <TabIcon emoji="📊" />,
        }}
      />
      <Tab.Screen
        name="Reports"
        component={ReportsScreen}
        options={{
          headerTitle: t('reports'),
          tabBarLabel: t('reports'),
          tabBarIcon: () => <TabIcon emoji="📈" />,
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <MainTabs />
        </NavigationContainer>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 88,
    paddingBottom: 18,
    paddingTop: 6,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    elevation: 8,
  },
  tabLabel: {
    fontSize: isSmallScreen ? 10 : 11,
    marginBottom: 2,
    fontWeight: '600',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  langWrapper: {
    marginRight: 10,
  },
  langButton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});