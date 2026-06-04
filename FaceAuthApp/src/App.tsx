import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography } from './theme';
import { startWatching } from './services/connectivityWatcher';
import { shouldRunCleanup, performCleanup } from './services/dataRetention';
import { loadLanguage } from './services/i18n';
import HomeScreen from './screens/HomeScreen';
import EnrollScreen from './screens/EnrollScreen';
import AuthScreen from './screens/AuthScreen';
import AttendanceScreen from './screens/AttendanceScreen';
import DashboardScreen from './screens/DashboardScreen';
import HistoryScreen from './screens/HistoryScreen';
import SettingsScreen from './screens/SettingsScreen';
import AdminLoginScreen from './screens/AdminLoginScreen';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import WorkerListScreen from './screens/WorkerListScreen';
import CalendarScreen from './screens/CalendarScreen';
import PPECheckScreen from './screens/PPECheckScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    startWatching();
    loadLanguage();

    // Auto-cleanup on app start
    shouldRunCleanup().then(should => {
      if (should) performCleanup().catch(() => {});
    });
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { ...typography.h3, color: colors.white },
          headerShadowVisible: false,
          animation: 'slide_from_right',
        }}>
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Enroll"
          component={EnrollScreen}
          options={{ title: 'Enroll New User' }}
        />
        <Stack.Screen
          name="Authenticate"
          component={AuthScreen}
          options={{ title: 'Authenticate' }}
        />
        <Stack.Screen
          name="Attendance"
          component={AttendanceScreen}
          options={{ title: 'Attendance' }}
        />
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{ title: 'Dashboard' }}
        />
        <Stack.Screen
          name="History"
          component={HistoryScreen}
          options={{ title: 'Auth History' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
        <Stack.Screen
          name="AdminLogin"
          component={AdminLoginScreen}
          options={{ title: 'Admin Login' }}
        />
        <Stack.Screen
          name="AdminDashboard"
          component={AdminDashboardScreen}
          options={{ title: 'Admin Panel', headerShown: false }}
        />
        <Stack.Screen
          name="WorkerList"
          component={WorkerListScreen}
          options={{ title: 'Workers' }}
        />
        <Stack.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ title: 'Attendance Calendar' }}
        />
        <Stack.Screen
          name="PPECheck"
          component={PPECheckScreen}
          options={{ title: 'PPE Compliance' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
