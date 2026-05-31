import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// SDLT (England & NI) for additional property
function calcSDLT(price) {
  if (price <= 0) return 0;
  const bands = [
    { limit: 250000, rate: 0.03 },
    { limit: 925000, rate: 0.08 },
    { limit: 1500000, rate: 0.13 },
    { limit: Infinity, rate: 0.15 },
  ];
  let tax = 0;
  let prev = 0;
  for (const band of bands) {
    if (price > prev) {
      tax += (Math.min(price, band.limit) - prev) * band.rate;
      prev = band.limit;
    }
  }
  return Math.round(tax);
}

// LBTT (Scotland) for additional property (ADS surcharge 6%)
function calcLBTT(price) {
  if (price <= 0) return 0;
  const bands = [
    { limit: 145000, rate: 0.00 },
    { limit: 250000, rate: 0.02 },
    { limit: 325000, rate: 0.05 },
    { limit: 750000, rate: 0.10 },
    { limit: Infinity, rate: 0.12 },
  ];
  let tax = 0;
  let prev = 0;
  for (const band of bands) {
    if (price > prev) {
      tax += (Math.min(price, band.limit) - prev) * band.rate;
      prev = band.limit;
    }
  }
  // ADS (Additional Dwelling Supplement) = 6%
  const ads = price * 0.06;
  return Math.round(tax + ads);
}

function calcMortgagePayment(loanAmount, annualRate, years, interestOnly) {
  if (loanAmount <= 0) return 0;
  if (interestOnly) return Math.round((loanAmount * (annualRate / 100)) / 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  if (r === 0) return Math.round(loanAmount / n);
  return Math.round(loanAmount * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1));
}

function currency(n) {
  return '£' + Math.round(n).toLocaleString();
}

function pct(n) {
  return n.toFixed(2) + '%';
}

function ResultRow({ label, value, color, bold, sub }) {
  return (
    <View style={[styles.resultRow, sub && { paddingLeft: 12 }]}>
      <Text style={[styles.resultLabel, bold && { fontWeight: '700' }, sub && { color: '#888', fontSize: 13 }]}>{label}</Text>
      <Text style={[styles.resultValue, bold && { fontWeight: '700' }, color && { color }]}>{value}</Text>
    </View>
  );
}

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function InputRow({ label, value, onChange, prefix = '£', keyboard = 'numeric', suffix }) {
  return (
    <View style={styles.inputRow}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputWrap}>
        {prefix ? <Text style={styles.inputPrefix}>{prefix}</Text> : null}
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          keyboardType={keyboard}
          placeholder="0"
        />
        {suffix ? <Text style={styles.inputSuffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export default function ROIScreen() {
  const [scotland, setScotland] = useState(false);
  const [interestOnly, setInterestOnly] = useState(true);

  const [price, setPrice] = useState('200000');
  const [depositPct, setDepositPct] = useState('25');
  const [mortgageRate, setMortgageRate] = useState('5.0');
  const [mortgageTerm, setMortgageTerm] = useState('25');
  const [monthlyRent, setMonthlyRent] = useState('1000');
  const [taxBand, setTaxBand] = useState('20');

  // Purchase costs
  const [legalFees, setLegalFees] = useState('2000');
  const [surveyFees, setSurveyFees] = useState('800');
  const [mortgageArrangement, setMortgageArrangement] = useState('1500');
  const [refurbCosts, setRefurbCosts] = useState('0');

  // Running costs
  const [groundRent, setGroundRent] = useState('0');
  const [serviceCharge, setServiceCharge] = useState('0');
  const [insurance, setInsurance] = useState('40');
  const [agentFeePct, setAgentFeePct] = useState('10');
  const [maintenancePct, setMaintenancePct] = useState('10');
  const [voidWeeks, setVoidWeeks] = useState('4');

  const [result, setResult] = useState(null);

  const calculate = () => {
    const p = parseFloat(price) || 0;
    const depPct = parseFloat(depositPct) || 25;
    const rate = parseFloat(mortgageRate) || 5;
    const term = parseFloat(mortgageTerm) || 25;
    const rent = parseFloat(monthlyRent) || 0;
    const tax = parseFloat(taxBand) || 20;

    // Purchase
    const deposit = p * (depPct / 100);
    const loanAmount = p - deposit;
    const stampDuty = scotland ? calcLBTT(p) : calcSDLT(p);
    const legal = parseFloat(legalFees) || 0;
    const survey = parseFloat(surveyFees) || 0;
    const arrangementFee = parseFloat(mortgageArrangement) || 0;
    const refurb = parseFloat(refurbCosts) || 0;
    const totalCashIn = deposit + stampDuty + legal + survey + arrangementFee + refurb;

    // Monthly costs
    const mortgagePayment = calcMortgagePayment(loanAmount, rate, term, interestOnly);
    const groundRentM = parseFloat(groundRent) || 0;
    const serviceChargeM = parseFloat(serviceCharge) || 0;
    const insuranceM = parseFloat(insurance) || 0;
    const agentFeeM = rent * (parseFloat(agentFeePct) / 100);
    const maintenanceM = rent * (parseFloat(maintenancePct) / 100);
    const voidCostM = (rent * parseFloat(voidWeeks)) / 52;

    const totalMonthlyExpenses = mortgagePayment + groundRentM + serviceChargeM + insuranceM + agentFeeM + maintenanceM + voidCostM;

    // Tax (Section 24 — only 20% of mortgage interest relievable regardless of tax band)
    const annualRentalIncome = rent * 12;
    const annualNonMortgageExpenses = (groundRentM + serviceChargeM + insuranceM + agentFeeM + maintenanceM + voidCostM) * 12;
    const annualMortgageInterest = interestOnly ? mortgagePayment * 12 : (loanAmount * (rate / 100));
    const taxableProfit = Math.max(0, annualRentalIncome - annualNonMortgageExpenses);
    const mortgageRelief = annualMortgageInterest * 0.20; // Section 24 basic rate relief
    const incomeTax = Math.max(0, (taxableProfit * (tax / 100)) - mortgageRelief);
    const monthlyTax = incomeTax / 12;

    // Cashflow
    const monthlyCashflow = rent - totalMonthlyExpenses - monthlyTax;
    const annualCashflow = monthlyCashflow * 12;

    // Yields
    const grossYield = (annualRentalIncome / p) * 100;
    const netAnnualIncome = annualRentalIncome - (totalMonthlyExpenses * 12) - incomeTax;
    const netYield = (netAnnualIncome / p) * 100;
    const cashOnCashROI = (annualCashflow / totalCashIn) * 100;

    // Break-even rent
    const breakEvenRent = totalMonthlyExpenses + monthlyTax;

    // CGT estimate (28% higher rate on gain, 18% basic rate — using 28% as BTL)
    const estimatedAnnualGrowth = p * 0.045; // 4.5% avg UK growth
    const cgtRate = tax > 20 ? 0.28 : 0.18;

    setResult({
      // Purchase
      deposit, loanAmount, stampDuty, legal, survey, arrangementFee, refurb, totalCashIn,
      // Monthly
      mortgagePayment, groundRentM, serviceChargeM, insuranceM, agentFeeM, maintenanceM, voidCostM,
      totalMonthlyExpenses, monthlyTax,
      // Summary
      monthlyCashflow, annualCashflow, grossYield, netYield, cashOnCashROI, breakEvenRent,
      estimatedAnnualGrowth, cgtRate, incomeTax,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Deal ROI Calculator</Text>
      <Text style={styles.subtitle}>Full analysis including tax, duties & running costs</Text>

      {/* Location toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Scotland (LBTT)</Text>
        <Switch value={scotland} onValueChange={setScotland} trackColor={{ true: '#2c3e50' }} />
        <Text style={styles.toggleLabel}>England/NI (SDLT)</Text>
      </View>

      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>Interest Only</Text>
        <Switch value={interestOnly} onValueChange={setInterestOnly} trackColor={{ true: '#2c3e50' }} />
        <Text style={styles.toggleLabel}>Repayment</Text>
      </View>

      <Section title="Property & Mortgage">
        <InputRow label="Purchase Price" value={price} onChange={setPrice} />
        <InputRow label="Deposit" value={depositPct} onChange={setDepositPct} prefix="%" suffix="%" />
        <InputRow label="Mortgage Rate" value={mortgageRate} onChange={setMortgageRate} prefix="" suffix="%" />
        <InputRow label="Mortgage Term" value={mortgageTerm} onChange={setMortgageTerm} prefix="" suffix="yrs" />
        <InputRow label="Monthly Rent" value={monthlyRent} onChange={setMonthlyRent} />
      </Section>

      <Section title="Purchase Costs">
        <InputRow label="Legal / Solicitor Fees" value={legalFees} onChange={setLegalFees} />
        <InputRow label="Survey Cost" value={surveyFees} onChange={setSurveyFees} />
        <InputRow label="Mortgage Arrangement Fee" value={mortgageArrangement} onChange={setMortgageArrangement} />
        <InputRow label="Refurb / Works" value={refurbCosts} onChange={setRefurbCosts} />
      </Section>

      <Section title="Monthly Running Costs">
        <InputRow label="Ground Rent" value={groundRent} onChange={setGroundRent} />
        <InputRow label="Service Charge" value={serviceCharge} onChange={setServiceCharge} />
        <InputRow label="Landlord Insurance" value={insurance} onChange={setInsurance} />
        <InputRow label="Letting Agent Fee" value={agentFeePct} onChange={setAgentFeePct} prefix="" suffix="%" />
        <InputRow label="Maintenance Reserve" value={maintenancePct} onChange={setMaintenancePct} prefix="" suffix="%" />
        <InputRow label="Void Allowance" value={voidWeeks} onChange={setVoidWeeks} prefix="" suffix="wks/yr" />
      </Section>

      <Section title="Tax">
        {['20', '40', '45'].map(band => (
          <TouchableOpacity
            key={band}
            style={[styles.taxChip, taxBand === band && styles.taxChipActive]}
            onPress={() => setTaxBand(band)}
          >
            <Text style={[styles.taxChipText, taxBand === band && styles.taxChipTextActive]}>
              {band}% {band === '20' ? '(Basic)' : band === '40' ? '(Higher)' : '(Additional)'}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.s24Note}>Section 24 applied — mortgage interest relief capped at 20% basic rate</Text>
      </Section>

      <TouchableOpacity style={styles.calcBtn} onPress={calculate}>
        <Ionicons name="calculator" size={20} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.calcBtnText}>Calculate ROI</Text>
      </TouchableOpacity>

      {result && (
        <View style={styles.results}>
          <Text style={styles.resultsTitle}>Results</Text>

          {/* Cashflow summary */}
          <View style={[styles.cashflowBox, { backgroundColor: result.monthlyCashflow >= 0 ? '#eafaf1' : '#fdecea' }]}>
            <Text style={styles.cashflowLabel}>Monthly Cashflow</Text>
            <Text style={[styles.cashflowValue, { color: result.monthlyCashflow >= 0 ? '#27ae60' : '#e74c3c' }]}>
              {currency(result.monthlyCashflow)}
            </Text>
            <Text style={styles.cashflowSub}>
              {currency(result.annualCashflow)} per year after all costs & tax
            </Text>
          </View>

          <Section title="Key Metrics">
            <ResultRow label="Gross Yield" value={pct(result.grossYield)} color="#27ae60" bold />
            <ResultRow label="Net Yield (after all costs)" value={pct(result.netYield)} color="#2980b9" bold />
            <ResultRow label="Cash-on-Cash ROI" value={pct(result.cashOnCashROI)} color="#8e44ad" bold />
            <ResultRow label="Break-even Rent" value={currency(result.breakEvenRent) + '/mo'} bold />
          </Section>

          <Section title="Total Cash Required">
            <ResultRow label="Deposit" value={currency(result.deposit)} sub />
            <ResultRow label={scotland ? 'LBTT (inc. ADS 6%)' : 'Stamp Duty (SDLT inc. 3% surcharge)'} value={currency(result.stampDuty)} sub />
            <ResultRow label="Legal Fees" value={currency(result.legal)} sub />
            <ResultRow label="Survey" value={currency(result.survey)} sub />
            <ResultRow label="Mortgage Arrangement" value={currency(result.arrangementFee)} sub />
            <ResultRow label="Refurb / Works" value={currency(result.refurb)} sub />
            <ResultRow label="Total Cash In" value={currency(result.totalCashIn)} bold />
          </Section>

          <Section title="Monthly Expenses Breakdown">
            <ResultRow label="Mortgage Payment" value={currency(result.mortgagePayment)} sub />
            <ResultRow label="Ground Rent" value={currency(result.groundRentM)} sub />
            <ResultRow label="Service Charge" value={currency(result.serviceChargeM)} sub />
            <ResultRow label="Insurance" value={currency(result.insuranceM)} sub />
            <ResultRow label="Letting Agent Fee" value={currency(result.agentFeeM)} sub />
            <ResultRow label="Maintenance Reserve" value={currency(result.maintenanceM)} sub />
            <ResultRow label="Void Allowance" value={currency(result.voidCostM)} sub />
            <ResultRow label="Income Tax (monthly)" value={currency(result.monthlyTax)} sub />
            <ResultRow label="Total Monthly Out" value={currency(result.totalMonthlyExpenses + result.monthlyTax)} bold />
          </Section>

          <Section title="Tax Summary">
            <ResultRow label="Annual Rental Income" value={currency(result.monthlyCashflow * 12 + result.monthlyTax * 12 + result.totalMonthlyExpenses * 12)} sub />
            <ResultRow label="Annual Income Tax" value={currency(result.incomeTax)} sub />
            <ResultRow label="Section 24 Applied" value="Yes" sub />
            <ResultRow label="Est. CGT Rate on Exit" value={`${result.cgtRate * 100}%`} sub />
            <ResultRow label="Est. Annual Capital Growth" value={currency(result.estimatedAnnualGrowth)} sub />
          </Section>

          <Text style={styles.disclaimer}>
            This calculator provides estimates for indicative purposes only. Tax figures are based on current HMRC rules and Section 24 restrictions. Always consult a qualified accountant and mortgage broker before investing.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 16 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 10, marginBottom: 4 },
  subtitle: { color: '#666', marginBottom: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#fff', padding: 12, borderRadius: 10 },
  toggleLabel: { flex: 1, fontSize: 14, color: '#333' },
  section: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#2c3e50', marginBottom: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  inputLabel: { flex: 1, fontSize: 13, color: '#444' },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, overflow: 'hidden' },
  inputPrefix: { paddingHorizontal: 8, color: '#888', fontSize: 14, backgroundColor: '#f5f5f5' },
  input: { width: 90, padding: 6, fontSize: 14, textAlign: 'right' },
  inputSuffix: { paddingHorizontal: 8, color: '#888', fontSize: 13, backgroundColor: '#f5f5f5' },
  taxChip: { padding: 10, borderRadius: 8, backgroundColor: '#eee', marginBottom: 8 },
  taxChipActive: { backgroundColor: '#2c3e50' },
  taxChipText: { color: '#555', fontSize: 14 },
  taxChipTextActive: { color: '#fff', fontWeight: '600' },
  s24Note: { fontSize: 11, color: '#e67e22', marginTop: 4, fontStyle: 'italic' },
  calcBtn: { flexDirection: 'row', backgroundColor: '#27ae60', padding: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  calcBtnText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  results: { marginBottom: 40 },
  resultsTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 14 },
  cashflowBox: { borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 14 },
  cashflowLabel: { fontSize: 14, color: '#555', marginBottom: 4 },
  cashflowValue: { fontSize: 48, fontWeight: 'bold' },
  cashflowSub: { fontSize: 13, color: '#888', marginTop: 4 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  resultLabel: { fontSize: 14, color: '#444', flex: 1 },
  resultValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  disclaimer: { fontSize: 11, color: '#aaa', fontStyle: 'italic', textAlign: 'center', marginTop: 10, marginBottom: 20 },
});
