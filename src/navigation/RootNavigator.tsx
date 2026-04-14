import React from 'react';
import {Text, View, StyleSheet} from 'react-native';
import {NavigationContainer, DefaultTheme} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {colors, fontSizes} from '../theme/colors';
import ChatScreen from '../screens/ChatScreen';
import FeedScreen from '../screens/FeedScreen';
import BriefingScreen from '../screens/BriefingScreen';
import DevicesScreen from '../screens/DevicesScreen';

const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: colors.bg,
    card: colors.bgElevated,
    primary: colors.accent,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.accent,
  },
};

const ICONS: Record<string, string> = {
  Chat: '◎',
  Feed: '≡',
  Briefing: '✶',
  Devices: '⌘',
};

export default function RootNavigator() {
  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({route}) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({color}) => (
            <View style={styles.iconWrap}>
              <Text style={[styles.icon, {color}]}>
                {ICONS[route.name] ?? '•'}
              </Text>
            </View>
          ),
        })}>
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen name="Feed" component={FeedScreen} />
        <Tab.Screen name="Briefing" component={BriefingScreen} />
        <Tab.Screen name="Devices" component={DevicesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.bgElevated,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
    paddingTop: 6,
  },
  tabLabel: {fontSize: fontSizes.xs, fontWeight: '600', letterSpacing: 0.5},
  iconWrap: {alignItems: 'center', justifyContent: 'center'},
  icon: {fontSize: 20, lineHeight: 22},
});
