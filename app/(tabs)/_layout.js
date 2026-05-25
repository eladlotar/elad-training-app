import { Tabs } from 'expo-router';
import { Text, StyleSheet } from 'react-native';
import { C } from '../../src/constants/theme';

function TabIcon({ label, focused }) {
  return (
    <Text style={[s.icon, focused && s.iconActive]}>{label}</Text>
  );
}

export default function TabsLayout() {
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
        name="home"
        options={{
          title: 'ראשי',
          tabBarIcon: ({ focused }) => (
            <TabIcon label={focused ? '◉' : '○'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'אימונים',
          tabBarIcon: ({ focused }) => (
            <TabIcon label={focused ? '▣' : '▢'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="license"
        options={{
          title: 'רישיון',
          tabBarIcon: ({ focused }) => (
            <TabIcon label={focused ? '◆' : '◇'} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'פרופיל',
          tabBarIcon: ({ focused }) => (
            <TabIcon label={focused ? '●' : '○'} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const s = StyleSheet.create({
  tabBar: {
    backgroundColor: C.white,
    borderTopColor: C.border,
    borderTopWidth: 1,
    height: 85,
    paddingBottom: 28,
    paddingTop: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  icon: {
    fontSize: 22,
    color: C.mutedLt,
  },
  iconActive: {
    color: C.black,
  },
});
