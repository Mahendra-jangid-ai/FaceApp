import React, { Component, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, MONO } from './theme';
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

interface EBState { error: Error | null; info: string }

class ErrorBoundary extends Component<{ children: React.ReactNode }, EBState> {
  state: EBState = { error: null, info: '' };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack || '' });
  }

  render() {
    if (this.state.error) {
      return (
        <View style={eb.root}>
          <Text style={eb.icon}>!</Text>
          <Text style={eb.title}>APP ERROR</Text>
          <ScrollView style={eb.scroll}>
            <Text style={eb.msg}>{this.state.error.message}</Text>
            <Text style={eb.stack}>{this.state.error.stack?.slice(0, 800)}</Text>
          </ScrollView>
          <TouchableOpacity style={eb.btn} onPress={() => this.setState({ error: null, info: '' })}>
            <Text style={eb.btnText}>RETRY</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 48, color: colors.danger, fontWeight: '800' },
  title: { fontSize: 20, color: colors.danger, fontWeight: '800', marginTop: spacing.md, letterSpacing: 2 },
  scroll: { maxHeight: 300, marginTop: spacing.lg, width: '100%' },
  msg: { fontFamily: MONO, fontSize: 14, color: colors.text, marginBottom: spacing.md },
  stack: { fontFamily: MONO, fontSize: 10, color: colors.textDim },
  btn: { backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, marginTop: spacing.xl },
  btnText: { ...typography.button, color: colors.onAccent },
});

export default function App() {
  useEffect(() => {
    try {
      const { startWatching } = require('./services/connectivityWatcher');
      startWatching();
    } catch {}
    try {
      const { loadLanguage } = require('./services/i18n');
      loadLanguage();
    } catch {}
    try {
      const { shouldRunCleanup, performCleanup } = require('./services/dataRetention');
      shouldRunCleanup().then((should: boolean) => {
        if (should) performCleanup().catch(() => {});
      });
    } catch {}
  }, []);

  return (
    <ErrorBoundary>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.accent,
            headerTitleStyle: { ...typography.h3, color: colors.text },
            headerShadowVisible: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Enroll" component={EnrollScreen} options={{ title: 'ENROL' }} />
          <Stack.Screen name="Authenticate" component={AuthScreen} options={{ title: 'SCAN' }} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'ATTENDANCE' }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'DASHBOARD' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'HISTORY' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'SYSTEM' }} />
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ title: 'ADMIN' }} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'ADMIN', headerShown: false }} />
          <Stack.Screen name="WorkerList" component={WorkerListScreen} options={{ title: 'PEOPLE' }} />
          <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'CALENDAR' }} />
          <Stack.Screen name="PPECheck" component={PPECheckScreen} options={{ title: 'PPE CHECK' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
