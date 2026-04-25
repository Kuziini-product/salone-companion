import '@expo/metro-runtime';
import 'react-native-gesture-handler';
import React from 'react';
import { Platform, ActivityIndicator, View, Text } from 'react-native';
import { enableScreens } from 'react-native-screens';
if (Platform.OS !== 'web') enableScreens(true);

import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
  Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useTheme, accents } from './src/theme';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { AuthProvider, useAuth } from './src/lib/auth';

import { AuthScreen }              from './src/screens/AuthScreen';
import { CaptureScreen }           from './src/screens/CaptureScreen';
import { CategoriesScreen }        from './src/screens/CategoriesScreen';
import { CompaniesByCategoryScreen } from './src/screens/CompaniesByCategoryScreen';
import { CompaniesScreen }         from './src/screens/CompaniesScreen';
import { CompanyCardScreen }       from './src/screens/CompanyCardScreen';
import { MatchResultScreen }       from './src/screens/MatchResultScreen';
import { ContactsScreen }          from './src/screens/ContactsScreen';
import { ContactDetailScreen }     from './src/screens/ContactDetailScreen';
import { ProfileScreen }           from './src/screens/ProfileScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

// ---------------------------------------------------------------------------
// Tabs (only shown when authenticated)
// ---------------------------------------------------------------------------
function Tabs() {
  const { palette } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        // Each tab gets its own accent color when active.
        const accent =
          route.name === 'Categories' ? accents.profile.base   :
          route.name === 'Companies'  ? accents.companies.base :
          route.name === 'Contacts'   ? accents.contacts.base  :
          accents.profile.base;
        return {
          headerStyle:           { backgroundColor: palette.bg },
          headerTitleStyle:      { color: palette.text },
          headerShadowVisible:   false,
          tabBarStyle: {
            backgroundColor:   palette.bg,
            borderTopColor:    palette.border,
            borderTopWidth:    0.5,
            height:            Platform.OS === 'ios' ? 84 : 64,
            paddingTop:        6,
          },
          tabBarLabelStyle:        { fontSize: 11, fontWeight: '600' },
          tabBarActiveTintColor:   accent,
          tabBarInactiveTintColor: palette.textFaint,
          tabBarIcon: ({ focused }) => {
            const emoji =
              route.name === 'Categories' ? '🎨' :
              route.name === 'Companies'  ? '🏛️' :
              route.name === 'Contacts'   ? '💼' :
                                            '👤';
            return (
              <Text style={{
                fontSize: focused ? 24 : 22,
                opacity:  focused ? 1   : 0.6,
              }}>
                {emoji}
              </Text>
            );
          },
        };
      }}
    >
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ headerShown: false, title: 'Categorii' }}
      />
      <Tab.Screen
        name="Companies"
        component={CompaniesScreen}
        options={{ headerShown: false, title: 'Toți' }}
      />
      <Tab.Screen
        name="Contacts"
        component={ContactsScreen}
        options={{ headerShown: false, title: 'Contacte' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerShown: false, title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

// ---------------------------------------------------------------------------
// Auth-aware root navigator
// ---------------------------------------------------------------------------
function RootNavigator() {
  const { palette } = useTheme();
  const { session, loading } = useAuth();

  const navTheme: Theme = {
    ...(palette.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(palette.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      background:   palette.bg,
      card:         palette.bg,
      text:         palette.text,
      border:       palette.border,
      primary:      palette.accent,
      notification: palette.accent,
    },
  };

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.bg }}>
        <ActivityIndicator color={palette.text} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={palette.mode === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator
        screenOptions={{
          headerStyle:         { backgroundColor: palette.bg },
          headerTitleStyle:    { color: palette.text },
          headerTintColor:     palette.text,
          headerShadowVisible: false,
          contentStyle:        { backgroundColor: palette.bg },
        }}
      >
        {session ? (
          <>
            <Stack.Screen
              name="Main"
              component={Tabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Capture"
              component={CaptureScreen}
              options={{ title: 'Scanare', headerShown: true }}
            />
            <Stack.Screen
              name="CompanyCard"
              component={CompanyCardScreen}
              options={{ title: '' }}
            />
            <Stack.Screen
              name="CompaniesByCategory"
              component={CompaniesByCategoryScreen}
              options={{ title: '' }}
            />
            <Stack.Screen
              name="MatchResult"
              component={MatchResultScreen}
              options={{ title: 'Recunoaștere' }}
            />
            <Stack.Screen
              name="ContactDetail"
              component={ContactDetailScreen}
              options={{ title: 'Contact' }}
            />
          </>
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ---------------------------------------------------------------------------
// App entry
// ---------------------------------------------------------------------------
export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
