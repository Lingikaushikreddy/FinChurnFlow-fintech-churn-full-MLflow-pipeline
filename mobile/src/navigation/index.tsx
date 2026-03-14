/**
 * Navigation Configuration
 * 
 * Phase 1: Added navigation ref for AI ActionHandler
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { RootState } from '../store';
import { colors, spacing, shadows } from '../theme';
import { setNavigationRef } from '../services/ActionHandler';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import OTPScreen from '../screens/auth/OTPScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Main Screens
import DashboardScreen from '../screens/home/DashboardScreen';
import QRCodeScreen from '../screens/payments/QRCodeScreen';
import PaymentLinksScreen from '../screens/payments/PaymentLinksScreen';
import PayoutScreen from '../screens/payouts/PayoutScreen';
import ContactsScreen from '../screens/payouts/ContactsScreen';
import TransactionListScreen from '../screens/transactions/TransactionListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

// Store Screens
import ProductListScreen from '../screens/store/ProductListScreen';
import AddProductScreen from '../screens/store/AddProductScreen';
import OrdersScreen from '../screens/store/OrdersScreen';
import CatalogPreviewScreen from '../screens/store/CatalogPreviewScreen';

// Payroll Screens
import EmployeeListScreen from '../screens/payroll/EmployeeListScreen';
import AddEmployeeScreen from '../screens/payroll/AddEmployeeScreen';
import SalaryProcessScreen from '../screens/payroll/SalaryProcessScreen';

// AI Screen
import ChatScreen from '../screens/ai/ChatScreen';

// Reports & Profile Screens
import ReportsScreen from '../screens/reports/ReportsScreen';
import AchievementsScreen from '../screens/profile/AchievementsScreen';

// Type definitions
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  Onboarding: undefined;
  StoreStack: undefined;
  PayrollStack: undefined;
  AIChat: undefined;
  Reports: undefined;
  Achievements: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  OTP: { phone: string };
};

export type MainTabParamList = {
  Home: undefined;
  Payments: undefined;
  Payouts: undefined;
  Transactions: undefined;
  Profile: undefined;
};

export type PaymentsStackParamList = {
  QRCode: undefined;
  PaymentLinks: undefined;
  CreateLink: undefined;
};

export type PayoutsStackParamList = {
  PayoutMain: undefined;
  Contacts: undefined;
  AddContact: undefined;
};

export type StoreStackParamList = {
  ProductList: undefined;
  AddProduct: { product?: any };
  Orders: undefined;
  CatalogPreview: undefined;
};

export type PayrollStackParamList = {
  EmployeeList: undefined;
  AddEmployee: { employee?: any };
  SalaryProcess: { employeeIds?: string[]; isAdvance?: boolean };
};

// Navigators
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const PaymentsStack = createNativeStackNavigator<PaymentsStackParamList>();
const PayoutsStack = createNativeStackNavigator<PayoutsStackParamList>();
const StoreStack = createNativeStackNavigator<StoreStackParamList>();
const PayrollStack = createNativeStackNavigator<PayrollStackParamList>();

// Auth Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="OTP" component={OTPScreen} />
  </AuthStack.Navigator>
);

// Payments Navigator
const PaymentsNavigator = () => (
  <PaymentsStack.Navigator>
    <PaymentsStack.Screen
      name="QRCode"
      component={QRCodeScreen}
      options={{ title: 'QR Code' }}
    />
    <PaymentsStack.Screen
      name="PaymentLinks"
      component={PaymentLinksScreen}
      options={{ title: 'Payment Links' }}
    />
  </PaymentsStack.Navigator>
);

// Payouts Navigator
const PayoutsNavigator = () => (
  <PayoutsStack.Navigator>
    <PayoutsStack.Screen
      name="PayoutMain"
      component={PayoutScreen}
      options={{ title: 'Send Money' }}
    />
    <PayoutsStack.Screen
      name="Contacts"
      component={ContactsScreen}
      options={{ title: 'Contacts' }}
    />
  </PayoutsStack.Navigator>
);

// Store Navigator
const StoreNavigator = () => (
  <StoreStack.Navigator>
    <StoreStack.Screen
      name="ProductList"
      component={ProductListScreen}
      options={{ title: 'My Store' }}
    />
    <StoreStack.Screen
      name="AddProduct"
      component={AddProductScreen}
      options={({ route }) => ({
        title: route.params?.product ? 'Edit Product' : 'Add Product',
      })}
    />
    <StoreStack.Screen
      name="Orders"
      component={OrdersScreen}
      options={{ title: 'Orders' }}
    />
    <StoreStack.Screen
      name="CatalogPreview"
      component={CatalogPreviewScreen}
      options={{ title: 'My Catalog' }}
    />
  </StoreStack.Navigator>
);

// Payroll Navigator
const PayrollNavigator = () => (
  <PayrollStack.Navigator>
    <PayrollStack.Screen
      name="EmployeeList"
      component={EmployeeListScreen}
      options={{ title: 'Employees' }}
    />
    <PayrollStack.Screen
      name="AddEmployee"
      component={AddEmployeeScreen}
      options={({ route }) => ({
        title: route.params?.employee ? 'Edit Employee' : 'Add Employee',
      })}
    />
    <PayrollStack.Screen
      name="SalaryProcess"
      component={SalaryProcessScreen}
      options={({ route }) => ({
        title: route.params?.isAdvance ? 'Give Advance' : 'Process Salary',
      })}
    />
  </PayrollStack.Navigator>
);

// Main Tab Navigator
const MainNavigator = () => (
  <MainTab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: string;

        switch (route.name) {
          case 'Home':
            iconName = focused ? 'home' : 'home-outline';
            break;
          case 'Payments':
            iconName = focused ? 'qrcode' : 'qrcode';
            break;
          case 'Payouts':
            iconName = focused ? 'send' : 'send-outline';
            break;
          case 'Transactions':
            iconName = focused ? 'history' : 'history';
            break;
          case 'Profile':
            iconName = focused ? 'account' : 'account-outline';
            break;
          default:
            iconName = 'circle';
        }

        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      headerShown: false,
    })}
  >
    <MainTab.Screen
      name="Home"
      component={DashboardScreen}
      options={{ title: 'Home' }}
    />
    <MainTab.Screen
      name="Payments"
      component={PaymentsNavigator}
      options={{ title: 'Collect' }}
    />
    <MainTab.Screen
      name="Payouts"
      component={PayoutsNavigator}
      options={{ title: 'Pay' }}
    />
    <MainTab.Screen
      name="Transactions"
      component={TransactionListScreen}
      options={{ title: 'History' }}
    />
    <MainTab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{ title: 'Profile' }}
    />
  </MainTab.Navigator>
);

// Floating AI Button Component
const FloatingAIButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity style={styles.floatingBtn} onPress={onPress} activeOpacity={0.8}>
    <Icon name="robot" size={28} color={colors.textInverse} />
  </TouchableOpacity>
);

// Root Navigator
const Navigation = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isOnboarded } = useSelector((state: RootState) => state.merchant);

  // In dev mode, skip auth/onboarding to go straight to dashboard
  const devBypass = __DEV__;
  const effectiveAuth = devBypass || isAuthenticated;
  const effectiveOnboarded = devBypass || isOnboarded;
  
  // Navigation ref for AI ActionHandler
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);

  // Wire up navigation ref for AI actions
  useEffect(() => {
    if (navigationRef.current) {
      setNavigationRef(navigationRef.current as any);
    }
  }, []);

  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!effectiveAuth ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : !effectiveOnboarded ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainNavigator} />
            <RootStack.Screen
              name="StoreStack"
              component={StoreNavigator}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="PayrollStack"
              component={PayrollNavigator}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="AIChat"
              component={ChatScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Reports"
              component={ReportsScreen}
              options={{ presentation: 'modal' }}
            />
            <RootStack.Screen
              name="Achievements"
              component={AchievementsScreen}
              options={{ presentation: 'modal' }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  floatingBtn: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.lg,
    zIndex: 999,
  },
});

export default Navigation;
