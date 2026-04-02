import React from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import LoginScreen from '../screens/LoginScreen';
import DashboardScreen from '../screens/DashboardScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import AddTransactionScreen from '../screens/AddTransactionScreen';
import StatisticsScreen from '../screens/StatisticsScreen';
import ShiftsScreen from '../screens/ShiftsScreen';
import InventoryScreen from '../screens/InventoryScreen';
import OrdersScreen from '../screens/OrdersScreen';
import NewOrderScreen from '../screens/NewOrderScreen';
import MoreScreen from '../screens/MoreScreen';
import PurchaseOrdersScreen from '../screens/PurchaseOrdersScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  Dashboard:    { active: 'home',                   inactive: 'home-outline' },
  Orders:       { active: 'receipt',                inactive: 'receipt-outline' },
  Inventory:    { active: 'cube',                   inactive: 'cube-outline' },
  Transactions: { active: 'swap-vertical',          inactive: 'swap-vertical-outline' },
  More:         { active: 'ellipsis-horizontal',    inactive: 'ellipsis-horizontal-outline' },
};

function MainTabs() {
  const { t } = useSettings();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        // ── Header ──────────────────────────────────────────────
        headerStyle: {
          backgroundColor: '#fff',
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: '#F3F4F6',
        },
        headerTintColor: '#1F2937',
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },

        // ── Tab bar ─────────────────────────────────────────────
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 0,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarActiveTintColor: '#6B4E2E',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },

        // ── Icon ────────────────────────────────────────────────
        tabBarIcon: ({ focused, color }) => {
          const icons = TAB_ICONS[route.name];
          const name = focused ? icons?.active : icons?.inactive;
          return <Ionicons name={name ?? 'ellipse-outline'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: t('tabDashboard') }}
      />
      <Tab.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: t('tabOrders') }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{ title: t('tabInventory') }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionsScreen}
        options={{ title: t('tabTransactions') }}
      />
      <Tab.Screen
        name="More"
        component={MoreScreen}
        options={{ title: t('tabMore'), headerShown: false }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { session, loading } = useAuth();
  const { t } = useSettings();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }}>
        <ActivityIndicator size="large" color="#6B4E2E" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen
              name="AddTransaction"
              component={AddTransactionScreen}
              options={{
                headerShown: true,
                title: 'Add Transaction',
                presentation: 'modal',
                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                headerTintColor: '#6B4E2E',
                headerTitleStyle: { fontWeight: '700', color: '#1F2937' },
              }}
            />
            <Stack.Screen
              name="NewOrder"
              component={NewOrderScreen}
              options={{
                headerShown: true,
                title: 'New Order',
                presentation: 'modal',
                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                headerTintColor: '#6B4E2E',
                headerTitleStyle: { fontWeight: '700', color: '#1F2937' },
              }}
            />
            <Stack.Screen
              name="Statistics"
              component={StatisticsScreen}
              options={{
                headerShown: true,
                title: t('statisticsMenuItem'),
                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                headerTintColor: '#6B4E2E',
                headerTitleStyle: { fontWeight: '700', color: '#1F2937' },
              }}
            />
            <Stack.Screen
              name="Staff"
              component={ShiftsScreen}
              options={{
                headerShown: true,
                title: t('staffMenuItem'),
                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                headerTintColor: '#6B4E2E',
                headerTitleStyle: { fontWeight: '700', color: '#1F2937' },
              }}
            />
            <Stack.Screen
              name="PurchaseOrders"
              component={PurchaseOrdersScreen}
              options={{
                headerShown: true,
                title: t('purchaseOrdersMenuItem'),
                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                headerTintColor: '#6B4E2E',
                headerTitleStyle: { fontWeight: '700', color: '#1F2937' },
              }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: t('settingsTitle'),
                headerStyle: { backgroundColor: '#fff' },
                headerShadowVisible: false,
                headerTintColor: '#6B4E2E',
                headerTitleStyle: { fontWeight: '700', color: '#1F2937' },
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
