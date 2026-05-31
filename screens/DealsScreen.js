import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  Modal, ScrollView, StyleSheet, Alert, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

const DEAL_TYPES = ['All', 'BTL', 'Flip', 'HMO', 'Commercial', 'Serviced Accommodation'];

const SAMPLE_DEALS = [
  {
    id: '1', address: '14 Maple Street, Manchester, M14', price: 180000,
    type: 'BTL', bedrooms: 3, description: 'Terraced house, below market value. Motivated seller.',
    rentalEstimate: 1050, favourite: false, sourceUrl: '',
  },
  {
    id: '2', address: '7 Oak Avenue, Leeds, LS6', price: 145000,
    type: 'HMO', bedrooms: 5, description: 'Near university, strong rental demand.',
    rentalEstimate: 2200, favourite: false, sourceUrl: '',
  },
  {
    id: '3', address: '22 Church Road, Birmingham, B15', price: 210000,
    type: 'Flip', bedrooms: 4, description: 'Needs full refurb. ARV estimated £285k.',
    rentalEstimate: 0, favourite: false, sourceUrl: '',
  },
];

// Extract postcode from URL or text
function extractPostcode(text) {
  const match = text.match(/[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}/i);
  return match ? match[0].toUpperCase() : '';
}

// Detect which portal the URL is from
function detectPortal(url) {
  if (url.includes('rightmove.co.uk')) return 'Rightmove';
  if (url.includes('zoopla.co.uk')) return 'Zoopla';
  if (url.includes('espc.com')) return 'ESPC';
  if (url.includes('onthemarket.com')) return 'OnTheMarket';
  if (url.includes('primelocation.com')) return 'PrimeLocation';
  if (url.includes('s1homes.com')) return 'S1Homes';
  return 'Property Listing';
}

const EMPTY_DEAL = {
  address: '', price: '', type: 'BTL', bedrooms: '',
  description: '', rentalEstimate: '', sourceUrl: '',
};

export default function DealsScreen() {
  const [deals, setDeals] = useState(SAMPLE_DEALS);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [newDeal, setNewDeal] = useState(EMPTY_DEAL);
  const [pastedUrl, setPastedUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  const filtered = deals.filter(d => {
    const matchType = filter === 'All' || d.type === filter;
    const matchSearch = d.address.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const toggleFavourite = (id) => {
    setDeals(deals.map(d => d.id === id ? { ...d, favourite: !d.favourite } : d));
  };

  const openUrl = (url) => {
    if (url) Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open link.'));
  };

  const handlePasteFromClipboard = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) setPastedUrl(text);
  };

  const handleImportUrl = () => {
    const url = pastedUrl.trim();
    if (!url) { setUrlError('Please paste a listing URL.'); return; }
    if (!url.startsWith('http')) { setUrlError('Please enter a valid URL starting with http.'); return; }
    setUrlError('');
    const postcode = extractPostcode(url);
    const portal = detectPortal(url);
    setNewDeal({
      ...EMPTY_DEAL,
      sourceUrl: url,
      description: `Imported from ${portal}${postcode ? ` — Postcode: ${postcode}` : ''}`,
      address: postcode || '',
    });
    setShowUrlModal(false);
    setPastedUrl('');
    setShowAddModal(true);
  };

  const addDeal = () => {
    if (!newDeal.address || !newDeal.price) {
      Alert.alert('Missing info', 'Please enter at least an address and price.');
      return;
    }
    setDeals([...deals, {
      ...newDeal,
      id: Date.now().toString(),
      price: parseInt(newDeal.price),
      bedrooms: parseInt(newDeal.bedrooms) || 0,
      rentalEstimate: parseInt(newDeal.rentalEstimate) || 0,
      favourite: false,
    }]);
    setShowAddModal(false);
    setNewDeal(EMPTY_DEAL);
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
              <View style={styles.cardHeaderLeft}>
                <Text style={styles.cardType}>{item.type}</Text>
                {item.sourceUrl ? (
                  <View style={styles.portalBadge}>
                    <Ionicons name="link" size={11} color="#fff" />
                    <Text style={styles.portalBadgeText}>{detectPortal(item.sourceUrl)}</Text>
                  </View>
                ) : null}
              </View>
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

            {item.sourceUrl ? (
              <TouchableOpacity style={styles.viewListingBtn} onPress={() => openUrl(item.sourceUrl)}>
                <Ionicons name="open-outline" size={14} color="#2980b9" />
                <Text style={styles.viewListingText}>View original listing</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No deals found.</Text>}
      />

      {/* FAB buttons */}
      <TouchableOpacity style={styles.fabSecondary} onPress={() => setShowUrlModal(true)}>
        <Ionicons name="link" size={22} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.fab} onPress={() => { setNewDeal(EMPTY_DEAL); setShowAddModal(true); }}>
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* URL Import Modal */}
      <Modal visible={showUrlModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.urlModal}>
            <Text style={styles.modalTitle}>Import from Listing</Text>
            <Text style={styles.urlHint}>
              Copy a listing URL from Rightmove, ESPC, Zoopla or any property site, then paste it below.
            </Text>
            <TextInput
              style={styles.urlInput}
              placeholder="Paste URL here..."
              value={pastedUrl}
              onChangeText={setPastedUrl}
              autoCapitalize="none"
              autoCorrect={false}
              multiline
            />
            {urlError ? <Text style={styles.urlError}>{urlError}</Text> : null}
            <TouchableOpacity style={styles.pasteBtn} onPress={handlePasteFromClipboard}>
              <Ionicons name="clipboard-outline" size={16} color="#2980b9" />
              <Text style={styles.pasteBtnText}>Paste from clipboard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.importBtn} onPress={handleImportUrl}>
              <Text style={styles.importBtnText}>Continue →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowUrlModal(false); setPastedUrl(''); setUrlError(''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add/Edit Deal Modal */}
      <Modal visible={showAddModal} animationType="slide">
        <ScrollView style={styles.modal}>
          <Text style={styles.modalTitle}>
            {newDeal.sourceUrl ? 'Complete Deal Details' : 'Add a Deal'}
          </Text>

          {newDeal.sourceUrl ? (
            <View style={styles.urlPreview}>
              <Ionicons name="link" size={14} color="#2980b9" />
              <Text style={styles.urlPreviewText} numberOfLines={1}>{newDeal.sourceUrl}</Text>
            </View>
          ) : null}

          {[
            { label: 'Address / Area', key: 'address', placeholder: 'e.g. 14 Maple St, Manchester, M14' },
            { label: 'Price (£)', key: 'price', placeholder: 'e.g. 180000', keyboard: 'numeric' },
            { label: 'Bedrooms', key: 'bedrooms', placeholder: 'e.g. 3', keyboard: 'numeric' },
            { label: 'Monthly Rental Estimate (£)', key: 'rentalEstimate', placeholder: 'e.g. 1050', keyboard: 'numeric' },
            { label: 'Description / Notes', key: 'description', placeholder: 'Key deal details...' },
          ].map(f => (
            <View key={f.key}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                keyboardType={f.keyboard || 'default'}
                value={String(newDeal[f.key])}
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardType: { backgroundColor: '#2c3e50', color: '#fff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 12, fontWeight: 'bold' },
  portalBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2980b9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, gap: 3 },
  portalBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardAddress: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  cardPrice: { fontSize: 20, fontWeight: 'bold', color: '#27ae60', marginBottom: 2 },
  cardDetail: { color: '#888', fontSize: 13, marginBottom: 2 },
  cardYield: { color: '#2980b9', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  cardDesc: { color: '#555', fontSize: 13 },
  viewListingBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4 },
  viewListingText: { color: '#2980b9', fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, color: '#aaa' },
  fab: { position: 'absolute', bottom: 24, right: 24, backgroundColor: '#2c3e50', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  fabSecondary: { position: 'absolute', bottom: 24, right: 92, backgroundColor: '#2980b9', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', elevation: 5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  urlModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modal: { flex: 1, padding: 20, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 12, marginTop: 40 },
  urlHint: { color: '#666', fontSize: 14, marginBottom: 14, lineHeight: 20 },
  urlInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 8 },
  urlError: { color: '#e74c3c', fontSize: 13, marginBottom: 8 },
  pasteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  pasteBtnText: { color: '#2980b9', fontSize: 14 },
  importBtn: { backgroundColor: '#2c3e50', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  importBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  urlPreview: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eaf4fb', padding: 10, borderRadius: 8, marginBottom: 14, gap: 6 },
  urlPreviewText: { color: '#2980b9', fontSize: 12, flex: 1 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 4, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 14, fontSize: 15 },
  saveBtn: { backgroundColor: '#27ae60', padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cancelBtn: { padding: 14, borderRadius: 10, alignItems: 'center', marginBottom: 40 },
  cancelBtnText: { color: '#e74c3c', fontSize: 16 },
});
