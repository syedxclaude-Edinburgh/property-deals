import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FavouritesScreen() {
  return (
    <View style={styles.container}>
      <Ionicons name="heart" size={60} color="#e74c3c" style={{ marginBottom: 16 }} />
      <Text style={styles.title}>Your Favourites</Text>
      <Text style={styles.subtitle}>
        Tap the heart icon on any deal to save it here.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f5', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 15, textAlign: 'center' },
});
