// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Text, View, StyleSheet, Dimensions, Platform } from 'react-native';
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
        headerStyle: { 
          backgroundColor: '#E31E24',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 20 },
        headerRight: () => <LanguageToggle />,
        tabBarActiveTintColor: '#E31E24',
        tabBarInactiveTintColor: '#ADB5BD',
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
    height: Platform.OS === 'ios' ? 90 : 70,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    backgroundColor: '#fff',
    borderTopWidth: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  iconContainer: {
    marginTop: 5,
  },
  iconText: {
    fontSize: 22,
  },
  langWrapper: {
    marginRight: 15,
  },
  langButton: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
});