import '@expo/metro-runtime';
import 'react-native-gesture-handler';
import React from 'react';
import { Platform } from 'react-native';
import { enableScreens } from 'react-native-screens';

if (Platform.OS !== 'web') enableScreens(true);
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { palette } from './src/theme';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { CaptureScreen } from './src/screens/CaptureScreen';
import { CompaniesScreen } from './src/screens/CompaniesScreen';
import { CompanyCardScreen } from './src/screens/CompanyCardScreen';
import { MatchResultScreen } from './src/screens/MatchResultScreen';
import { ContactsScreen } from './src/screens/ContactsScreen';
import { ContactDetailScreen } from './src/screens/ContactDetailScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: palette.bg,
    card: palette.bgElevated,
    text: palette.text,
    border: palette.border,
    primary: palette.accent,
  },
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: palette.bg },
        headerTitleStyle: { color: palette.text },
        tabBarStyle: { backgroundColor: palette.bgElevated, borderTopColor: palette.border },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.textDim,
      }}
    >
      <Tab.Screen name="Capture" component={CaptureScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Companies" component={CompaniesScreen} />
      <Tab.Screen name="Contacts" component={ContactsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.bg }}>
      <SafeAreaProvider>
        <NavigationContainer theme={navTheme}>
          <StatusBar style="light" />
          <Stack.Navigator
            screenOptions={{
              headerStyle: { backgroundColor: palette.bg },
              headerTitleStyle: { color: palette.text },
              headerTintColor: palette.accent,
              contentStyle: { backgroundColor: palette.bg },
            }}
          >
            <Stack.Screen name="Main" component={Tabs} options={{ headerShown: false }} />
            <Stack.Screen name="CompanyCard" component={CompanyCardScreen} options={{ title: '' }} />
            <Stack.Screen name="MatchResult" component={MatchResultScreen} options={{ title: 'Match' }} />
            <Stack.Screen name="ContactDetail" component={ContactDetailScreen} options={{ title: 'Contact' }} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
