import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ActivityIndicator,
  ScrollView, StyleSheet, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

function Section({ title, icon, color, children }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name={icon} size={18} color={color} />
        <Text style={[styles.cardTitle, { color }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ label, value, highlight }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: highlight, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function Tag({ label, color }) {
  return (
    <View style={[styles.tag, { backgroundColor: color + '22', borderColor: color }]}>
      <Text style={[styles.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function SoldCard({ sale }) {
  return (
    <View style={styles.soldCard}>
      <Text style={styles.soldPrice}>£{parseInt(sale.amount).toLocaleString()}</Text>
      <Text style={styles.soldDate}>{sale.date}</Text>
      <Text style={styles.soldType}>{sale.propertyType} · {sale.tenure}</Text>
    </View>
  );
}

export default function PropertyIntelScreen() {
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const fetchIntel = async () => {
    const clean = postcode.trim().toUpperCase().replace(/\s+/g, ' ');
    const noSpace = clean.replace(/\s/g, '');
    if (!clean) { setError('Please enter a postcode.'); return; }
    setError('');
    setLoading(true);
    setData(null);

    try {
      // 1. Validate postcode
      const geoRes = await fetch(`https://api.postcodes.io/postcodes/${noSpace}`);
      const geoData = await geoRes.json();
      if (geoData.status !== 200) { setError('Invalid postcode. Please try again.'); setLoading(false); return; }

      const { latitude, longitude, admin_district, region } = geoData.result;
      const formattedPostcode = geoData.result.postcode;
      const district = formattedPostcode.split(' ')[0];

      // 2. Land Registry sold prices (last 10 sales in postcode)
      const lrUrl = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${encodeURIComponent(formattedPostcode)}&_pageSize=10&_sort=-transactionDate`;
      const lrRes = await fetch(lrUrl).catch(() => null);
      let soldPrices = [];
      if (lrRes && lrRes.ok) {
        const lrData = await lrRes.json();
        const items = lrData?.result?.items || [];
        soldPrices = items.map(item => ({
          amount: item.pricePaid,
          date: item.transactionDate?.split('T')[0] || 'Unknown',
          propertyType: formatPropertyType(item.propertyType?.prefLabel || ''),
          tenure: item.estateType?.prefLabel || '',
          address: [
            item.propertyAddress?.paon,
            item.propertyAddress?.street,
          ].filter(Boolean).join(' '),
        }));
      }

      // 3. Planning constraints — Article 4, Conservation Areas (DLUHC Planning Data)
      const planningUrl = `https://www.planning.data.gov.uk/entity.json?dataset=article-4-direction-area&geometry_reference=${encodeURIComponent(formattedPostcode)}&limit=10`;
      const article4Res = await fetch(planningUrl).catch(() => null);
      let article4 = false;
      if (article4Res && article4Res.ok) {
        const a4Data = await article4Res.json();
        article4 = (a4Data?.entities?.length || 0) > 0;
      }

      // Conservation areas
      const conservationUrl = `https://www.planning.data.gov.uk/entity.json?dataset=conservation-area&geometry_reference=${encodeURIComponent(formattedPostcode)}&limit=5`;
      const conservationRes = await fetch(conservationUrl).catch(() => null);
      let conservationArea = false;
      if (conservationRes && conservationRes.ok) {
        const cData = await conservationRes.json();
        conservationArea = (cData?.entities?.length || 0) > 0;
      }

      // Listed buildings nearby (Historic England)
      const listedUrl = `https://api.historicengland.org.uk/historicengland/buildings/v1.1/search?&lat=${latitude}&lng=${longitude}&radius=200&type=ListedBuilding&pageSize=5`;
      const listedRes = await fetch(listedUrl).catch(() => null);
      let listedBuildings = 0;
      if (listedRes && listedRes.ok) {
        const listedData = await listedRes.json();
        listedBuildings = listedData?.total || 0;
      }

      // 4. Flood risk (Environment Agency)
      const floodUrl = `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${latitude}&long=${longitude}&dist=1`;
      const floodRes = await fetch(floodUrl).catch(() => null);
      let floodZones = 0;
      let floodRisk = 'Very Low';
      if (floodRes && floodRes.ok) {
        const floodData = await floodRes.json();
        floodZones = floodData?.items?.length || 0;
        if (floodZones > 5) floodRisk = 'High';
        else if (floodZones > 2) floodRisk = 'Medium';
        else if (floodZones > 0) floodRisk = 'Low';
      }

      // 5. Avg sold price calculation
      const avgSold = soldPrices.length > 0
        ? Math.round(soldPrices.reduce((s, p) => s + parseInt(p.amount), 0) / soldPrices.length)
        : null;

      setData({
        postcode: formattedPostcode,
        district,
        area: admin_district,
        region,
        soldPrices,
        avgSold,
        article4,
        conservationArea,
        listedBuildings,
        floodRisk,
        floodZones,
        lat: latitude,
        lng: longitude,
      });
    } catch (e) {
      setError('Could not fetch data. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const floodColor = (risk) => ({ 'Very Low': '#27ae60', 'Low': '#f39c12', 'Medium': '#e67e22', 'High': '#e74c3c' }[risk] || '#27ae60');

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Property Intelligence</Text>
      <Text style={styles.subtitle}>Sold prices, planning constraints & flood risk</Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="e.g. EH1 1YZ"
          value={postcode}
          onChangeText={setPostcode}
          autoCapitalize="characters"
          onSubmitEditing={fetchIntel}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={fetchIntel}>
          <Ionicons name="search" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading && (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2c3e50" />
          <Text style={styles.loadingText}>Querying Land Registry, Planning Data & Environment Agency...</Text>
        </View>
      )}

      {data && (
        <View>
          <View style={styles.areaHeader}>
            <Text style={styles.areaTitle}>{data.postcode}</Text>
            <Text style={styles.areaSub}>{data.area} · {data.region}</Text>
          </View>

          {/* Planning Constraints */}
          <Section title="Planning Constraints" icon="business" color="#8e44ad">
            <View style={styles.tagRow}>
              {data.article4
                ? <Tag label="⚠️ Article 4 Direction" color="#e74c3c" />
                : <Tag label="✓ No Article 4" color="#27ae60" />}
              {data.conservationArea
                ? <Tag label="⚠️ Conservation Area" color="#e67e22" />
                : <Tag label="✓ No Conservation Area" color="#27ae60" />}
              {data.listedBuildings > 0
                ? <Tag label={`⚠️ ${data.listedBuildings} Listed Buildings nearby`} color="#e67e22" />
                : <Tag label="✓ No Listed Buildings" color="#27ae60" />}
            </View>
            {data.article4 && (
              <Text style={styles.constraintNote}>
                Article 4 direction in this area restricts permitted development rights. HMO conversions and some extensions may require full planning permission.
              </Text>
            )}
            {data.conservationArea && (
              <Text style={styles.constraintNote}>
                Conservation area restrictions apply. External alterations may need consent. Check with local council before works.
              </Text>
            )}
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL(`https://www.planning.data.gov.uk/map/#${data.lat},${data.lng},15z`)}
            >
              <Ionicons name="open-outline" size={13} color="#2980b9" />
              <Text style={styles.linkBtnText}>View full planning map</Text>
            </TouchableOpacity>
          </Section>

          {/* Flood Risk */}
          <Section title="Flood Risk" icon="water" color={floodColor(data.floodRisk)}>
            <Row label="Risk Level" value={data.floodRisk} highlight={floodColor(data.floodRisk)} />
            <Row label="Flood Alert Zones Nearby" value={`${data.floodZones} zone${data.floodZones !== 1 ? 's' : ''}`} />
            {data.floodRisk !== 'Very Low' && (
              <Text style={styles.constraintNote}>
                Flood risk may affect insurance costs and mortgage availability. Check Environment Agency maps for full detail.
              </Text>
            )}
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL(`https://check-long-term-flood-risk.service.gov.uk/postcode?postcode=${data.postcode.replace(' ', '+')}`)}
            >
              <Ionicons name="open-outline" size={13} color="#2980b9" />
              <Text style={styles.linkBtnText}>Check official flood risk</Text>
            </TouchableOpacity>
          </Section>

          {/* Sold Prices */}
          <Section title="Recent Sold Prices" icon="home" color="#27ae60">
            {data.avgSold && (
              <Row label="Average (this postcode)" value={`£${data.avgSold.toLocaleString()}`} highlight="#27ae60" />
            )}
            {data.soldPrices.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {data.soldPrices.map((s, i) => <SoldCard key={i} sale={s} />)}
              </ScrollView>
            ) : (
              <Text style={styles.noData}>No recent sales found in this postcode. Try a nearby postcode.</Text>
            )}
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => Linking.openURL(`https://landregistry.data.gov.uk/app/ukhpi/browse?location=http%3A%2F%2Flandregistry.data.gov.uk%2Fid%2Fregion%2Funited-kingdom`)}
            >
              <Ionicons name="open-outline" size={13} color="#2980b9" />
              <Text style={styles.linkBtnText}>Land Registry full data</Text>
            </TouchableOpacity>
          </Section>

          {/* Investor Summary */}
          <Section title="Investor Summary" icon="analytics" color="#2c3e50">
            <Text style={styles.summaryText}>
              {buildSummary(data)}
            </Text>
          </Section>

          <Text style={styles.disclaimer}>
            Data sourced from HM Land Registry, DLUHC Planning Data, Environment Agency and Historic England — all free public datasets. Always conduct full due diligence before investing.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function formatPropertyType(type) {
  const map = { 'Detached': 'Detached', 'Semi-Detached': 'Semi-Det', 'Terraced': 'Terraced', 'Flat/Maisonette': 'Flat', 'Other': 'Other' };
  return map[type] || type;
}

function buildSummary(data) {
  const lines = [];
  if (data.article4) lines.push('⚠️ Article 4 direction present — HMO conversions need full planning permission.');
  else lines.push('✓ No Article 4 restrictions — HMO conversion may be possible under permitted development.');
  if (data.conservationArea) lines.push('⚠️ Conservation area — external works may need consent.');
  if (data.floodRisk === 'High' || data.floodRisk === 'Medium') lines.push(`⚠️ ${data.floodRisk} flood risk — check insurance costs before proceeding.`);
  else lines.push('✓ Low flood risk area.');
  if (data.avgSold) lines.push(`✓ Average recent sold price: £${data.avgSold.toLocaleString()}.`);
  return lines.join('\n\n');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  subtitle: { color: '#666', marginBottom: 16 },
  inputRow: { flexDirection: 'row', marginBottom: 8 },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  searchBtn: { backgroundColor: '#2c3e50', borderRadius: 8, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#e74c3c', marginBottom: 10 },
  loadingBox: { alignItems: 'center', marginTop: 30, padding: 20 },
  loadingText: { color: '#888', marginTop: 12, textAlign: 'center', fontSize: 13 },
  areaHeader: { marginBottom: 14, marginTop: 6 },
  areaTitle: { fontSize: 20, fontWeight: 'bold' },
  areaSub: { color: '#888', fontSize: 14 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  rowLabel: { fontSize: 14, color: '#555', flex: 1 },
  rowValue: { fontSize: 14, color: '#333' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '600' },
  constraintNote: { fontSize: 12, color: '#666', marginTop: 8, lineHeight: 18, fontStyle: 'italic' },
  linkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  linkBtnText: { color: '#2980b9', fontSize: 13 },
  soldCard: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 12, marginRight: 10, minWidth: 130, borderWidth: 1, borderColor: '#eee' },
  soldPrice: { fontSize: 16, fontWeight: 'bold', color: '#27ae60' },
  soldDate: { fontSize: 12, color: '#888', marginTop: 2 },
  soldType: { fontSize: 11, color: '#aaa', marginTop: 2 },
  noData: { color: '#aaa', fontSize: 13, fontStyle: 'italic', marginTop: 8 },
  summaryText: { fontSize: 14, color: '#444', lineHeight: 22 },
  disclaimer: { fontSize: 11, color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginBottom: 30, marginTop: 4 },
});
