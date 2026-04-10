import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { funboxColors } from '@/constants/funbox-theme';
import { funboxTypography } from '@/constants/funbox-typography';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: funboxColors.accent,
        tabBarInactiveTintColor: '#8b8b8b',
        tabBarLabelStyle: {
          fontSize: 10,
          letterSpacing: 1.4,
          textTransform: 'uppercase',
          fontFamily: funboxTypography.body.fontFamily,
        },
        tabBarStyle: {
          position: 'absolute',
          left: 16,
          right: 16,
          bottom: 12,
          height: 68,
          paddingTop: 8,
          paddingBottom: 10,
          borderTopWidth: 0,
          borderRadius: 24,
          backgroundColor: 'rgba(28,28,28,0.95)',
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size ?? 20} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} color={color} size={size ?? 20} />
          ),
        }}
      />
      <Tabs.Screen
        name="download"
        options={{
          title: 'Download',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'download' : 'download-outline'} color={color} size={size ?? 20} />
          ),
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          title: 'Me',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} color={color} size={size ?? 20} />
          ),
        }}
      />
    </Tabs>
  );
}
