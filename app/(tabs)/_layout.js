import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, tabIcon } from '../../src/context/ThemeContext';

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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: s.tabBar,
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
    </Tabs>
  );
}

const styles = (C) => StyleSheet.create({
  tabBar: {
    backgroundColor: C.white,
    borderTopColor: C.border,
    borderTopWidth: 1,
    height: 85,
    paddingBottom: 28,
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
