import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, ScrollView, StyleSheet, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const DEAL_TYPES = ['All', 'BTL', 'Flip', 'HMO', 'Commercial', 'Serviced Accommodation'];

const SAMPLE_DEALS = [
  {
    id: '1', address: '14 Maple Street, Manchester, M14', price: 180000,
    type: 'BTL', bedrooms: 3, description: 'Terraced house, below market value. Motivated seller.',
    rentalEstimate: 1050, favourite: false,
  },
  {
    id: '2', address: '7 Oak Avenue, Leeds, LS6', price: 145000,
    type: 'HMO', bedrooms: 5, description: 'Near university, strong rental demand.',
    rentalEstimate: 2200, favourite: false,
  },
  {
    id: '3', address: '22 Church Road, Birmingham, B15', price: 210000,
    type: 'Flip', bedrooms: 4, description: 'Needs full refurb. ARV estimated £285k.',
    rentalEstimate: 0, favourite: false,
  },
];

export default function DealsScreen() {
  const [deals, setDeals] = useState(SAMPLE_DEALS);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeal, setNewDeal] = useState({ address: '', price: '', type: 'BTL', bedrooms: '', description: '', rentalEstimate: '' });

  const filtered = deals.filter(d => {
    const matchType = filter === 'All' || d.type === filter;
    const matchSearch = d.address.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const toggleFavourite = (id) => {
    setDeals(deals.map(d => d.id === id ? { ...d, favourite: !d.favourite } : d));
  };

  const addDeal = () => {
    if (!newDeal.address || !newDeal.price) {
      Alert.alert('Missing info', 'Please enter at least an address and price.');
      return;
    }
    setDeals([...deals, { ...newDeal, id: Date.now().toString(), price: parseInt(newDeal.price), bedrooms: parseInt(newDeal.bedrooms), rentalEstimate: parseInt(newDeal.rentalEstimate) || 0, favourite: false }]);
    setShowAddModal(false);
    setNewDeal({ address: '', price: '', type: 'BTL', bedrooms: '', description: '', rentalEstimate: '' });
  };

  const yieldPct = (deal) => deal.rentalEstimate > 0
    ? ((deal.rentalEstimate * 12 / deal.price) * 100).toFixed(1)
    : null;

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search by location..."
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {DEAL_TYPES.map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.filterChip, filter === t && styles.filterChipActive]}
            onPress={() => setFilter(t)}
          >
            <Text style={[styles.filterChipText, filter === t && styles.filterChipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={d => d.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardType}>{item.type}</Text>
              <TouchableOpacity onPress={() => toggleFavourite(item.id)}>
                <Ionicons name={item.favourite ? 'heart' : 'heart-outline'} size={22} color={item.favourite ? '#e74c3c' : '#999'} />
              </TouchableOpacity>
            </View>
            <Text style={styles.cardAddress}>{item.address}</Text>
            <Text style={styles.cardPrice}>£{item.price.toLocaleString()}</Text>
            {item.bedrooms > 0 && <Text style={styles.cardDetail}>{item.bedrooms} bed</Text>}
            {yieldPct(item) && (
              <Text style={styles.cardYield}>Rental Yield: {yieldPct(item)}%</Text>
            )}
            <Text style={styles.cardDesc}>{item.description}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No deals found.</Text>}
      />

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      <Modal visible={showAddModal} animationType="slide">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>Add a Deal</Text>
          {[
            { label: 'Address', key: 'address', placeholder: 'e.g. 14 Maple St, Manchester' },
            { label: 'Price (£)', key: 'price', placeholder: 'e.g. 180000', keyboard: 'numeric' },
            { label: 'Bedrooms', key: 'bedrooms', placeholder: 'e.g. 3', keyboard: 'numeric' },
            { label: 'Monthly Rental Estimate (£)', key: 'rentalEstimate', placeholder: 'e.g. 1050', keyboard: 'numeric' },
            { label: 'Description', key: 'description', placeholder: 'Key deal details...' },
          ].map(f => (
            <View key={f.key}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                keyboardType={f.keyboard || 'default'}
                value={newDeal[f.key]}
                onChangeText={v => setNewDeal({ ...newDeal, [f.key]: v })}
              />
            </View>
          ))}
          <Text style={styles.label}>Deal Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {DEAL_TYPES.filter(t => t !== 'All').map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.filterChip, newDeal.type === t && styles.filterChipActive]}
                onPress={() => setNewDeal({ ...newDeal, type: t })}
              >
                <Text style={[styles.filterChipText, newDeal.type === t && styles.filterChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.saveBtn} onPress={addDeal}>
            <Text style={styles.saveBtnText}>Save Deal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAddModal(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 12 },
  search: { backgroundColor: '#fff', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15, borderWidth: 1, borderColor: '#ddd' },
  filterRow: { marginBottom: 10, flexGrow: 0 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#eee', marginRight: 8 },
  filterChipActive: { backgroundColor: '#2c3e50' },
  filterChipText: { color: '#555', fontSize: 13 },
  filterChipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 6, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cardType: { backgroundColor: '#2c3e50', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 12, fontWeight: 'bold' },
  cardAddress: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardPrice: { fontSize: 20, fontWeight: 'bold', color: '#27ae60', marginBottom: 2 },
  cardDetail: { color: '#888', fontSize: 13, marginBottom: 2 },
  cardYield: { color: '#2980b9', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardDesc: { color: '#555', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, color: '#aaa' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2c3e50', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modal: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 15 },
  saveBtn: { backgroundColor: '#27ae60', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 40 },
  cancelBtnText: { color: '#e74c3c', fontSize: 16 },
});
