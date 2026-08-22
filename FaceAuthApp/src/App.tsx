import React, { Component, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors, typography, spacing, borderRadius, shadows, MONO } from './theme';
import OnboardingScreen from './screens/OnboardingScreen';
import OrgAuthScreen from './screens/OrgAuthScreen';
import OrganizationAdminScreen from './screens/OrganizationAdminScreen';
import AddOrganizationScreen from './screens/AddOrganizationScreen';
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
import LocationPickerScreen from './screens/LocationPickerScreen';
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
          <StatusBar barStyle="dark-content" backgroundColor={colors.bg} />
          <View style={eb.iconBadge}>
            <Text style={eb.icon}>⚠️</Text>
          </View>
          <Text style={eb.title}>Something went wrong</Text>
          <Text style={eb.subtitle}>An unexpected error occurred in the application.</Text>
          <ScrollView style={eb.scroll} contentContainerStyle={eb.scrollContent}>
            <Text style={eb.msg}>{this.state.error.message}</Text>
            <Text style={eb.stack}>{this.state.error.stack?.slice(0, 800)}</Text>
          </ScrollView>
          <TouchableOpacity style={eb.btn} onPress={() => this.setState({ error: null, info: '' })} activeOpacity={0.8}>
            <Text style={eb.btnText}>Restart App</Text>
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
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.dangerDim, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FECACA',
  },
  icon: { fontSize: 28 },
  title: { ...typography.h2, color: colors.danger, marginTop: spacing.lg },
  subtitle: { ...typography.bodySmall, color: colors.textDim, marginTop: spacing.xs, textAlign: 'center' },
  scroll: { maxHeight: 240, marginTop: spacing.lg, width: '100%', backgroundColor: colors.surface, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.line },
  scrollContent: { padding: spacing.md },
  msg: { fontFamily: MONO, fontSize: 13, color: colors.danger, marginBottom: spacing.md, fontWeight: '600' },
  stack: { fontFamily: MONO, fontSize: 11, color: colors.textDim, lineHeight: 16 },
  btn: { backgroundColor: colors.accent, paddingVertical: spacing.md, paddingHorizontal: spacing.xxl, borderRadius: borderRadius.md, marginTop: spacing.xl, ...shadows.sm },
  btnText: { ...typography.button, color: colors.onAccent },
});

export default function App() {
  const [initialRoute, setInitialRoute] =
    React.useState<'OrgAuth' | 'OrganizationAdmin'>('OrgAuth');
  const [ready, setReady] = React.useState(false);

  useEffect(() => {
    // On startup: check if any organization exists → decide initial screen
    const { getOrganizations } = require('./services/api');
    getOrganizations()
      .then((res: any) => {
        setInitialRoute(
          res?.organizations?.length > 0 ? 'OrganizationAdmin' : 'OrgAuth',
        );
      })
      .catch(() => setInitialRoute('OrgAuth'))
      .finally(() => setReady(true));

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

  // Splash screen while checking DB
  if (!ready) {
    return (
      <View style={splash.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={splash.logoBox}>
          <Text style={splash.logoText}>FA</Text>
        </View>
        <Text style={splash.appName}>FaceApp</Text>
        <Text style={splash.loading}>Loading...</Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{
            headerStyle: { backgroundColor: '#FFFFFF' },
            headerTintColor: colors.accent,
            headerTitleStyle: { ...typography.h3, color: colors.text, fontSize: 16 },
            headerBackButtonDisplayMode: 'minimal',
            headerShadowVisible: false,
            animation: 'slide_from_right',
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="OrgAuth" component={OrgAuthScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          <Stack.Screen name="OrganizationAdmin" component={OrganizationAdminScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AddOrganization" component={AddOrganizationScreen} options={{ title: 'Add Organization' }} />
          <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Enroll" component={EnrollScreen} options={{ title: 'Worker Enrolment' }} />
          <Stack.Screen name="Authenticate" component={AuthScreen} options={{ title: 'Face Scan Verification' }} />
          <Stack.Screen name="Attendance" component={AttendanceScreen} options={{ title: 'Attendance Log' }} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'System Analytics' }} />
          <Stack.Screen name="History" component={HistoryScreen} options={{ title: 'Audit Trail' }} />
          <Stack.Screen name="Settings" component={SettingsScreen} options={{ title: 'Settings' }} />
          <Stack.Screen name="AdminLogin" component={AdminLoginScreen} options={{ title: 'Admin Login' }} />
          <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Admin Dashboard', headerShown: false }} />
          <Stack.Screen name="WorkerList" component={WorkerListScreen} options={{ title: 'Worker Directory' }} />
          <Stack.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Attendance Calendar' }} />
          <Stack.Screen name="PPECheck" component={PPECheckScreen} options={{ title: 'PPE Safety Check' }} />
          <Stack.Screen
            name="LocationPicker"
            component={LocationPickerScreen}
            options={{ title: 'Assign Work Location', presentation: 'modal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ErrorBoundary>
  );
}

const splash = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
  },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: '#1B4F72',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontFamily: 'Poppins-Bold', fontSize: 28,
    color: '#FFFFFF', letterSpacing: 1,
  },
  appName: {
    fontFamily: 'Poppins-SemiBold', fontSize: 22, color: '#1B4F72',
  },
  loading: {
    fontFamily: 'Poppins-Regular', fontSize: 13,
    color: '#5B6570', marginTop: 8,
  },
});
