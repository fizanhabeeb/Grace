// src/screens/BillScreen.js
// Finalize order, calculate GST, professional Tax Invoice PDF, Payment Modes, Discounts, Auto-Navigate

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Linking,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  Share,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import useOrientation from '../utils/useOrientation';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { 
  loadCurrentOrder, 
  clearCurrentOrder, 
  saveOrderToHistory, 
  loadOrderHistory,
  loadSettings,
  saveSettings,
  updateLastBackupTimestamp,
} from '../utils/storage';

export default function BillScreen({ navigation }) {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width, height, isLandscape, isSmallScreen, isTablet } = useOrientation();
  
  const [orderItems, setOrderItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billNumber, setBillNumber] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  
  // POS Features: Payment & Discount
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [discount, setDiscount] = useState('0');
  
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstPercentage, setGstPercentage] = useState(5);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [tempGstPercentage, setTempGstPercentage] = useState('5');
  
  const [hotelName, setHotelName] = useState('HOTEL GRACE');
  const [hotelAddress, setHotelAddress] = useState('Wayanad, Kerala');
  const [hotelPhone, setHotelPhone] = useState('+91 XXXXXXXXXX');

  const bottomPadding = Platform.OS === 'ios' ? insets.bottom + 10 : 15;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    const order = await loadCurrentOrder();
    setOrderItems(order);
    
    const history = await loadOrderHistory();
    setBillNumber(history.length + 1);
    
    const settings = await loadSettings();
    if (settings) {
      setGstEnabled(settings.gstEnabled);
      setGstPercentage(settings.gstPercentage);
      setTempGstPercentage(settings.gstPercentage.toString());
      setHotelName(settings.hotelName || 'HOTEL GRACE');
      setHotelAddress(settings.hotelAddress || 'Wayanad, Kerala');
      setHotelPhone(settings.hotelPhone || '+91 XXXXXXXXXX');
    }
    setIsSaved(false);
    setDiscount('0');
    setPaymentMode('Cash');
  };

  const toggleGst = async (value) => {
    setGstEnabled(value);
    const settings = await loadSettings();
    await saveSettings({ ...settings, gstEnabled: value });
  };

  const saveGstSettings = async () => {
    const percentage = parseFloat(tempGstPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      Alert.alert('Invalid', 'Enter valid GST %');
      return;
    }
    setGstPercentage(percentage);
    const settings = await loadSettings();
    await saveSettings({ 
      ...settings, 
      gstEnabled,
      gstPercentage: percentage,
      hotelName,
      hotelAddress,
      hotelPhone,
    });
    setSettingsModalVisible(false);
    Alert.alert('Saved', 'Settings saved successfully!');
  };

  const openSettingsModal = async () => {
    const settings = await loadSettings();
    setTempGstPercentage(settings.gstPercentage.toString());
    setHotelName(settings.hotelName || 'HOTEL GRACE');
    setHotelAddress(settings.hotelAddress || 'Wayanad, Kerala');
    setHotelPhone(settings.hotelPhone || '+91 XXXXXXXXXX');
    setSettingsModalVisible(true);
  };

  const calculateSubtotal = () => orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const calculateGST = () => gstEnabled ? calculateSubtotal() * (gstPercentage / 100) : 0;
  
  const calculateGrandTotal = () => {
    const subtotal = calculateSubtotal();
    const gst = calculateGST();
    const rawTotal = subtotal + gst - (parseFloat(discount) || 0);
    return Math.round(rawTotal); 
  };

  // UPDATED: Function clears data and navigates to 'Order' tab immediately
  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert(t('error'), t('addItemsFirst'));
      return;
    }

    const orderData = {
      items: orderItems,
      customerName,
      tableNumber,
      phoneNumber,
      billNumber,
      subtotal: calculateSubtotal(),
      gst: calculateGST(),
      gstEnabled,
      gstPercentage,
      discount: parseFloat(discount) || 0,
      paymentMode,
      grandTotal: calculateGrandTotal(),
    };

    const savedOrder = await saveOrderToHistory(orderData);
    if (savedOrder) {
      await clearCurrentOrder();
      setCustomerName('');
      setTableNumber('');
      setPhoneNumber('');
      
      Alert.alert(t('success'), `${t('orderSaved')} #${billNumber}`, [
        { text: 'OK', onPress: () => navigation.navigate('Order') }
      ]);
    } else {
      Alert.alert(t('error'), 'Failed to save order');
    }
  };

  const generateBillHTML = () => {
    const subtotal = calculateSubtotal();
    const gst = calculateGST();
    const rawTotal = subtotal + gst - (parseFloat(discount) || 0);
    const grandTotal = Math.round(rawTotal);
    const roundOff = (grandTotal - rawTotal).toFixed(2);

    const itemsHTML = orderItems.map(item => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px 0;">${item.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">₹${item.price.toFixed(2)}</td>
        <td style="text-align: right;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Helvetica'; padding: 30px; color: #333; }
          .invoice-header { text-align: center; border-bottom: 2px solid #8B0000; padding-bottom: 10px; }
          .tax-invoice-label { background: #8B0000; color: #fff; padding: 5px 15px; display: inline-block; margin-top: 10px; border-radius: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { border-bottom: 1px solid #333; padding: 10px 0; text-align: left; }
          .total-section { margin-top: 20px; border-top: 1px solid #333; padding-top: 10px; }
          .row { display: flex; justify-content: space-between; padding: 3px 0; }
          .grand-total { font-size: 20px; font-weight: bold; color: #8B0000; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div style="font-size: 24px; font-weight: bold;">${hotelName}</div>
          <div style="font-size: 14px;">${hotelAddress}</div>
          <div class="tax-invoice-label">TAX INVOICE</div>
        </div>
        <div style="margin-top:20px;">
          <div class="row"><span>Bill No: #${billNumber}</span><span>Date: ${new Date().toLocaleDateString('en-IN')}</span></div>
          <div class="row"><span>Customer: ${customerName || 'Walk-in'}</span><span>Table: ${tableNumber || 'N/A'}</span></div>
        </div>
        <table>
          <thead><tr><th>Item Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div class="total-section">
          <div class="row"><span>Sub-Total:</span><span>₹${subtotal.toFixed(2)}</span></div>
          ${gstEnabled ? `<div class="row"><span>GST (${gstPercentage}%):</span><span>₹${gst.toFixed(2)}</span></div>` : ''}
          <div class="row"><span>Discount:</span><span>-₹${parseFloat(discount).toFixed(2)}</span></div>
          <div class="row" style="font-style: italic;"><span>Rounding Off:</span><span>₹${roundOff}</span></div>
          <div class="row grand-total"><span>GRAND TOTAL:</span><span>₹${grandTotal.toFixed(2)}</span></div>
          <div class="row"><span>Paid via:</span><span>${paymentMode}</span></div>
        </div>
      </body>
      </html>
    `;
  };

  const handleWhatsApp = async () => {
    if (orderItems.length === 0) return;
    const text = `*${hotelName} - Bill #${billNumber}*\nTotal: ₹${calculateGrandTotal()}\nPaid via: ${paymentMode}\nThank you!`;
    try { await Share.share({ message: text }); } catch (error) { Alert.alert('Error', 'WhatsApp error'); }
  };

  const handlePrint = async () => {
    try { await Print.printAsync({ html: generateBillHTML() }); } catch (e) { Alert.alert('Error', 'Print error'); }
  };

  const handlePdf = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: generateBillHTML() });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert('Error', 'PDF error'); }
  };

  if (orderItems.length === 0 && !isSaved) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>🧾</Text>
        <Text style={styles.emptyText}>{t('emptyOrder')}</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.navigate('Order')}>
          <Text style={styles.goBackText}>{t('addItemsFirst')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.billHeader}>
          <Text style={styles.hotelName}>🏨 {hotelName}</Text>
          <Text style={styles.billInfo}>{t('billNo')}: #{billNumber}</Text>
        </View>

        <View style={[isLandscape && { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }]}>
          {/* Payment & Discount Card */}
          <View style={[styles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={styles.sectionTitle}>Payment & Discount</Text>
            <View style={styles.paymentRow}>
              {['Cash', 'UPI', 'Card'].map(mode => (
                <TouchableOpacity 
                  key={mode} 
                  style={[styles.paymentBtn, paymentMode === mode && styles.paymentBtnActive]}
                  onPress={() => setPaymentMode(mode)}
                >
                  <Text style={[styles.paymentBtnText, paymentMode === mode && {color: '#fff'}]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.discountRow}>
              <Text style={styles.label}>Discount (₹):</Text>
              <TextInput style={styles.discountInput} keyboardType="numeric" value={discount} onChangeText={setDiscount} />
            </View>
          </View>

          {/* GST Settings Card */}
          <View style={[styles.gstCard, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <View style={styles.gstHeader}>
              <View>
                <Text style={styles.gstTitle}>GST Settings</Text>
                <Text style={styles.gstSubtitle}>{gstEnabled ? `${gstPercentage}% Applied` : 'Disabled'}</Text>
              </View>
              <View style={styles.gstControls}>
                <Switch value={gstEnabled} onValueChange={toggleGst} trackColor={{ false: '#ddd', true: '#4CAF50' }} />
                <TouchableOpacity style={styles.settingsButton} onPress={openSettingsModal}><Text style={{fontSize: 20}}>⚙️</Text></TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Customer Details Card */}
          <View style={[styles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={styles.sectionTitle}>{t('customerDetails')}</Text>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder={t('customerName')} />
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, styles.halfInput]} value={tableNumber} onChangeText={setTableNumber} placeholder={t('tableNo')} keyboardType="numeric" />
              <TextInput style={[styles.input, styles.halfInput]} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="WhatsApp No" keyboardType="phone-pad" />
            </View>
          </View>

          {/* Items Summary Card */}
          <View style={[styles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={styles.sectionTitle}>{t('orderItems')}</Text>
            {orderItems.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={{ flex: 2 }}>{item.name}</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>{t('grandTotal')}:</Text>
              <Text style={styles.grandTotalValue}>₹{calculateGrandTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons Section */}
      <View style={[styles.actionContainer, { paddingBottom: bottomPadding }]}>
        <TouchableOpacity style={styles.completeBtn} onPress={handleSaveOrder}>
          <Text style={styles.completeBtnText}>💾 {t('saveOrderHistory')}</Text>
        </TouchableOpacity>

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={handlePrint}>
            <Text style={styles.actionEmoji}>🖨️</Text><Text style={styles.actionText}>{t('print')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF9800' }]} onPress={handlePdf}>
            <Text style={styles.actionEmoji}>📄</Text><Text style={styles.actionText}>{t('pdf')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp}>
            <Text style={styles.actionEmoji}>💬</Text><Text style={styles.actionText}>WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Settings Modal */}
      <Modal visible={settingsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>⚙️ Bill Settings</Text>
              <Text style={styles.settingLabel}>Hotel Name</Text>
              <TextInput style={styles.input} value={hotelName} onChangeText={setHotelName} />
              <Text style={styles.settingLabel}>GST Percentage (%)</Text>
              <TextInput style={styles.input} value={tempGstPercentage} onChangeText={setTempGstPercentage} keyboardType="numeric" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setSettingsModalVisible(false)}><Text>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveGstSettings}><Text style={styles.saveButtonText}>Save</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollView: { flex: 1 },
  billHeader: { backgroundColor: '#8B0000', padding: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  hotelName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  billInfo: { color: '#fff', fontSize: 14 },
  card: { backgroundColor: '#fff', margin: 10, borderRadius: 12, padding: 15, elevation: 2 },
  gstCard: { backgroundColor: '#fff', margin: 10, borderRadius: 12, padding: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  gstHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gstTitle: { fontSize: 16, fontWeight: 'bold' },
  gstSubtitle: { fontSize: 12, color: '#666' },
  gstControls: { flexDirection: 'row', alignItems: 'center' },
  settingsButton: { marginLeft: 10, padding: 5, backgroundColor: '#f0f0f0', borderRadius: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10, color: '#8B0000' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  paymentBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#f0f0f0', marginHorizontal: 2 },
  paymentBtnActive: { backgroundColor: '#8B0000' },
  paymentBtnText: { fontWeight: 'bold', color: '#666', fontSize: 12 },
  discountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  label: { fontSize: 14, color: '#666' },
  discountInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 5, padding: 5, width: 80, textAlign: 'center', backgroundColor: '#fafafa' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fafafa' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
  itemRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, borderTopColor: '#8B0000', marginTop: 10, paddingTop: 10 },
  grandTotalLabel: { fontSize: 17, fontWeight: 'bold', color: '#8B0000' },
  grandTotalValue: { fontSize: 19, fontWeight: 'bold', color: '#8B0000' },
  actionContainer: { backgroundColor: '#fff', padding: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  actionRow: { flexDirection: 'row', marginTop: 10 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 2 },
  actionEmoji: { fontSize: 20 },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  completeBtn: { backgroundColor: '#8B0000', padding: 15, borderRadius: 10, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', marginTop: 20 },
  saveButton: { flex: 1, backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  cancelButton: { flex: 1, padding: 15, alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 60 },
  emptyText: { fontSize: 18, color: '#999', marginVertical: 10 },
  goBackBtn: { backgroundColor: '#8B0000', padding: 12, borderRadius: 8 },
  goBackText: { color: '#fff', fontWeight: 'bold' },
  settingLabel: { fontWeight: 'bold', marginTop: 10, color: '#666' },
});