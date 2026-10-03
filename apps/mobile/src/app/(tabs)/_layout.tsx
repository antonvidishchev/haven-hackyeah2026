import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FontSize } from '@/constants/theme';
import { useTheme } from '@/theme/ThemeProvider';

type IconName = ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  function TabIcon({
    color,
    focused,
    size,
  }: {
    color: ColorValue;
    focused: boolean;
    size: number;
  }) {
    return <Ionicons name={focused ? active : inactive} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: { backgroundColor: colors.backgroundElement, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: FontSize.tabLabel },
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: t('tabs.home'), tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="my-reports"
        options={{
          title: t('tabs.myReports'),
          tabBarIcon: tabIcon('document-text', 'document-text-outline'),
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{ title: t('tabs.capture'), tabBarIcon: tabIcon('videocam', 'videocam-outline') }}
      />
      <Tabs.Screen
        name="account"
        options={{ title: t('tabs.account'), tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}
