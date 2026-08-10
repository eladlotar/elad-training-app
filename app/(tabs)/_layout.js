import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, tabIcon } from '../../src/context/ThemeContext';
import LicenseRenewalPrompt from '../../src/components/LicenseRenewalPrompt';
import { refreshMe, getUser } from '../../src/services/auth';

function HomeButton({ focused, C, iconSet }) {
  const s = styles(C);
  return (
    <View style={[s.homeBtn, focused && s.homeBtnFocused]}>
      <Ionicons name={tabIcon('home', iconSet, true)} size={26} color={C.white} />
    </View>
  );
}

export default function TabsLayout() {
  const { C, iconSet } = useTheme();
  const s = styles(C);
  // פופ-אפ חידוש רישיון — נבדק פעם אחת בכל כניסה לאפליקציה (אפיון אלעד 10/08).
  // מרענן מהשרת כדי שהמצב יהיה עדכני גם אם התוקף שונה במערכת הניהול.
  const [licensePrompt, setLicensePrompt] = useState(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      let u = null;
      try { u = await refreshMe(); } catch (_) { /* אופליין */ }
      if (!u) { try { u = await getUser(); } catch (_) { /* אין משתמש */ } }
      if (alive && u?.license?.prompt_renewal) setLicensePrompt(u.license);
    })();
    return () => { alive = false; };
  }, []);
  // Respect the device's bottom safe area (home indicator / gesture bar)
  // instead of a fixed height that fits only notched iPhones.
  const insets = useSafeAreaInsets();

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          s.tabBar,
          { height: 57 + insets.bottom, paddingBottom: Math.max(insets.bottom, 8) },
        ],
        tabBarActiveTintColor: C.black,
        tabBarInactiveTintColor: C.mutedLt,
        tabBarLabelStyle: s.tabLabel,
      }}
    >
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'אימונים',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={tabIcon('calendar', iconSet, focused)} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="registrations"
        options={{
          title: 'הרשמות',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={tabIcon('myregs', iconSet, focused)} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'חנות',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'bag-handle' : 'bag-handle-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: '',
          tabBarLabel: () => null,
          tabBarIcon: ({ focused }) => <HomeButton focused={focused} C={C} iconSet={iconSet} />,
        }}
      />
      <Tabs.Screen
        name="folder"
        options={{
          title: 'תיקייה',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'folder' : 'folder-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'פרופיל',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={tabIcon('person', iconSet, focused)} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'הגדרות',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={tabIcon('settings', iconSet, focused)} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen name="license" options={{ href: null }} />
      <Tabs.Screen name="shooter" options={{ href: null }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
    </Tabs>
    <LicenseRenewalPrompt
      visible={!!licensePrompt}
      license={licensePrompt}
      onDone={() => setLicensePrompt(null)}
    />
    </>
  );
}

const styles = (C) => StyleSheet.create({
  tabBar: {
    backgroundColor: C.white,
    borderTopColor: C.border,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: '600' },
  homeBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: C.black,
    justifyContent: 'center', alignItems: 'center',
    marginTop: -24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
    borderWidth: 3, borderColor: C.white,
  },
  homeBtnFocused: { backgroundColor: C.accent2, transform: [{ scale: 1.05 }] },
});
