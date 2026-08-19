import React, { Component, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows, MONO } from './theme';
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
          <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
          <View style={eb.iconBadge}>
            <Text style={eb.icon}>⚠️</Text>
          </View>
          <Text style={eb.title}>SYSTEM RECOVERY</Text>
          <Text style={eb.subtitle}>An unexpected runtime exception was intercepted.</Text>
          <ScrollView style={eb.scroll} contentContainerStyle={eb.scrollContent}>
            <Text style={eb.msg}>{this.state.error.message}</Text>
            <Text style={eb.stack}>{this.state.error.stack?.slice(0, 800)}</Text>
          </ScrollView>
          <TouchableOpacity style={eb.btn} onPress={() => this.setState({ error: null, info: '' })} activeOpacity={0.8}>
            <Text style={eb.btnText}>RESTART INTERFACE</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const eb = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl, justifyContent: 'center', alignItems: 'center' },
  iconBadge: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.dangerDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.danger, ...shadows.md,
  },
  icon: { fontSize: 32 },
  title: { ...typography.h2, color: colors.danger, marginTop: spacing.lg, letterSpacing: 1.5 },
  subtitle: { ...typography.bodySmall, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },
  scroll: { maxHeight: 260, marginTop: spacing.lg, width: '100%', backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.line },
  scrollContent: { padding: spacing.md },
  msg: { fontFamily: MONO, fontSize: 13, color: colors.danger, marginBottom: spacing.md, fontWeight: '700' },
  stack: { fontFamily: MONO, fontSize: 10, color: colors.textDim, lineHeight: 16 },
  btn: { backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, marginTop: spacing.xl, ...shadows.glowAccent },
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
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
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
          <Stack.Screen name="Enroll" component={EnrollScreen} options={{ title: 'ENROL WORKER' }} />
          <Stack.Screen name="Authenticate" component={AuthScreen} options={{ title: 'BIOMETRIC SCAN' }} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'ATTENDANCE LOG' }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'SYSTEM ANALYTICS' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'AUDIT TRAIL' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'SYSTEM SETTINGS' }} />
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ title: 'ADMIN SECURITY' }} />
          <Stack.Screen name="AdminDashboardScreen" component={AdminDashboardScreen} options={{ title: 'ADMIN DASHBOARD', headerShown: false }} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'ADMIN DASHBOARD', headerShown: false }} />
          <Stack.Screen name="WorkerList" component={WorkerListScreen} options={{ title: 'WORKER DIRECTORY' }} />
          <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'ATTENDANCE CALENDAR' }} />
          <Stack.Screen name="PPECheck" component={PPECheckScreen} options={{ title: 'PPE SAFETY CHECK' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}
