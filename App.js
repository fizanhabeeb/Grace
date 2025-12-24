// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity, Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Context
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import MenuScreen from './src/screens/MenuScreen';
import OrderScreen from './src/screens/OrderScreen';
import BillScreen from './src/screens/BillScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { t, language, setLanguage } = useLanguage();
  const insets = useSafeAreaInsets(); // Hook to get safe area measurements

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // Dynamic Icons
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Menu') iconName = focused ? 'restaurant' : 'restaurant-outline';
          else if (route.name === 'Order') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Bill') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'History') iconName = focused ? 'time' : 'time-outline';
          else if (route.name === 'Reports') iconName = focused ? 'bar-chart' : 'bar-chart-outline';

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        // SAFE AREA FIX: Dynamic height based on system bars
        tabBarActiveTintColor: '#8B0000',
        tabBarInactiveTintColor: '#888',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopWidth: 1,
          borderTopColor: '#eeeeee',
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          // Fixed height calculation to avoid system buttons
          height: Platform.OS === 'ios' ? 85 + insets.bottom : 70 + insets.bottom,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginBottom: 5,
        },
        headerStyle: {
          backgroundColor: '#8B0000',
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={() => setLanguage(language === 'en' ? 'ml' : 'en')}
            style={styles.langButton}
          >
            <Text style={styles.langButtonText}>
              {language === 'en' ? 'മലയാളം' : 'English'}
            </Text>
          </TouchableOpacity>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: t('hotelName') }} />
      <Tab.Screen name="Menu" component={MenuScreen} options={{ title: t('manageMenu') }} />
      <Tab.Screen name="Order" component={OrderScreen} options={{ title: t('newOrder') }} />
      <Tab.Screen name="Bill" component={BillScreen} options={{ title: t('generateBill') }} />
      <Tab.Screen name="History" component={HistoryScreen} options={{ title: t('orderHistory') }} />
      <Tab.Screen name="Reports" component={ReportsScreen} options={{ title: t('reports') }} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <TabNavigator />
        </NavigationContainer>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  langButton: {
    marginRight: 15,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  langButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});