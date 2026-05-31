import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import DealsScreen from './screens/DealsScreen';
import AreaScoreScreen from './screens/AreaScoreScreen';
import TrendsScreen from './screens/TrendsScreen';
import FavouritesScreen from './screens/FavouritesScreen';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons = {
              Deals: focused ? 'home' : 'home-outline',
              'Area Score': focused ? 'map' : 'map-outline',
              'Yields & Trends': focused ? 'trending-up' : 'trending-up-outline',
              Favourites: focused ? 'heart' : 'heart-outline',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#2c3e50',
          tabBarInactiveTintColor: '#aaa',
          headerStyle: { backgroundColor: '#2c3e50' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        })}
      >
        <Tab.Screen name="Deals" component={DealsScreen} options={{ title: 'Property Deals' }} />
        <Tab.Screen name="Area Score" component={AreaScoreScreen} />
        <Tab.Screen name="Yields & Trends" component={TrendsScreen} />
        <Tab.Screen name="Favourites" component={FavouritesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
