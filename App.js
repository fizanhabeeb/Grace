// App.js
import React from 'react';
import { StatusBar } from 'expo-status-bar'; // Restored this import
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { TouchableOpacity, Text, View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Context
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext'; 

// Screens
import HomeScreen from './src/screens/HomeScreen';
import MenuScreen from './src/screens/MenuScreen';
import OrderScreen from './src/screens/OrderScreen';
import BillScreen from './src/screens/BillScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ReportsScreen from './src/screens/ReportsScreen';

const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { t, language, toggleLanguage } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
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
        // Dynamic Theme Colors
        tabBarActiveTintColor: theme.primary, 
        tabBarInactiveTintColor: isDark ? '#888' : '#888',
        tabBarStyle: {
          backgroundColor: theme.card, 
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
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
          backgroundColor: theme.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: theme.headerText,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 18,
        },
        // Combined Header Right: Theme Toggle + Language Toggle
        headerRight: () => (
          <View style={styles.headerRightContainer}>
            {/* Theme Toggle */}
            <TouchableOpacity onPress={toggleTheme} style={styles.iconButton}>
              <Ionicons name={isDark ? "sunny" : "moon"} size={20} color="#fff" />
            </TouchableOpacity>

            {/* Language Toggle */}
            <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
              <Text style={styles.langButtonText}>
                {language === 'en' ? 'മലയാളം' : 'ENG'}
              </Text>
            </TouchableOpacity>
          </View>
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
      <ThemeProvider>
        <LanguageProvider>
          <NavigationContainer>
            {/* Restored StatusBar with light style (white text) for the dark header */}
            <StatusBar style="light" /> 
            <TabNavigator />
          </NavigationContainer>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  iconButton: {
    padding: 8,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  langButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  langButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
});