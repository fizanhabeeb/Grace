// src/screens/BillScreen.js
// Finalize order, calculate GST, show summary, Save/Export PDF/WhatsApp - Optimized for Speed

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
  };

  const toggleGst = async (value) => {
    setGstEnabled(value);
    const settings = await loadSettings();
    await saveSettings({ ...settings, gstEnabled: value });
  };

  const saveGstSettings = async () => {
    const percentage = parseFloat(tempGstPercentage);
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      Alert.alert('Invalid', 'Please enter a valid GST percentage (0-100)');
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
  const calculateGrandTotal = () => calculateSubtotal() + calculateGST();

  const handleSaveOrder = async () => {
    if (orderItems.length === 0) {
      Alert.alert(t('error'), t('addItemsFirst'));
      return;
    }

    // Direct save logic without confirmation Alert to save time
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
      grandTotal: calculateGrandTotal(),
    };

    const savedOrder = await saveOrderToHistory(orderData);
    if (savedOrder) {
      setIsSaved(true);
      await clearCurrentOrder();
      Alert.alert(t('success'), `${t('orderSaved')} #${billNumber}`);
    } else {
      Alert.alert(t('error'), 'Failed to save order');
    }
  };

  const generateWhatsAppBill = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let bill = `════════════════════════════\n`;
    bill += `    🏨 *${hotelName}*\n`;
    bill += `      ${hotelAddress}\n`;
    bill += `     Ph: ${hotelPhone}\n`;
    bill += `════════════════════════════\n\n`;
    bill += `📋 *Bill No:* #${billNumber}\n`;
    bill += `📅 *Date:* ${dateStr}\n`;
    bill += `🕐 *Time:* ${timeStr}\n`;
    if (tableNumber) bill += `🪑 *Table:* ${tableNumber}\n`;
    if (customerName) bill += `👤 *Customer:* ${customerName}\n`;
    bill += `\n────────────────────────────\n`;
    bill += `*ITEM* *QTY* *AMT*\n`;
    bill += `────────────────────────────\n`;

    orderItems.forEach(item => {
      const itemName = item.name.length > 18 ? item.name.substring(0, 18) + '..' : item.name.padEnd(20);
      const qty = item.quantity.toString().padStart(2);
      const amount = `₹${(item.price * item.quantity).toFixed(0)}`.padStart(6);
      bill += `${itemName} ${qty}  ${amount}\n`;
    });

    bill += `────────────────────────────\n\n`;
    bill += `   Subtotal:        ₹${calculateSubtotal().toFixed(2)}\n`;
    if (gstEnabled) bill += `   GST (${gstPercentage}%):         ₹${calculateGST().toFixed(2)}\n`;
    bill += `════════════════════════════\n`;
    bill += `   *GRAND TOTAL:    ₹${calculateGrandTotal().toFixed(2)}*\n`;
    bill += `════════════════════════════\n\n`;
    bill += `   💚 *Thank You! Visit Again* 💚\n`;
    return bill;
  };

  const generateBillHTML = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const itemsHTML = orderItems.map(item => `
      <tr>
        <td style="text-align: left; padding: 8px 5px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="text-align: center; padding: 8px 5px; border-bottom: 1px solid #eee;">${item.quantity}</td>
        <td style="text-align: right; padding: 8px 5px; border-bottom: 1px solid #eee;">₹${item.price.toFixed(2)}</td>
        <td style="text-align: right; padding: 8px 5px; border-bottom: 1px solid #eee;">₹${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <html>
      <head><meta charset="utf-8">
      <style>
        body { font-family: 'Courier New', monospace; padding: 20px; max-width: 320px; margin: 0 auto; color: #333; }
        .header { text-align: center; padding-bottom: 15px; border-bottom: 2px dashed #333; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
        .grand-total { font-size: 18px; font-weight: bold; color: #8B0000; border-top: 2px solid #8B0000; padding-top: 10px; margin-top: 10px; }
      </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 22px; font-weight: bold;">🏨 ${hotelName}</div>
          <div style="font-size: 12px;">${hotelAddress}<br>Ph: ${hotelPhone}</div>
        </div>
        <div style="font-size: 12px;">Bill No: #${billNumber} | Date: ${dateStr}</div>
        <table>
          <thead><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Total</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div style="text-align: right; font-size: 13px;">
          <p>Subtotal: ₹${calculateSubtotal().toFixed(2)}</p>
          ${gstEnabled ? `<p>GST (${gstPercentage}%): ₹${calculateGST().toFixed(2)}</p>` : ''}
          <div class="grand-total">GRAND TOTAL: ₹${calculateGrandTotal().toFixed(2)}</div>
        </div>
      </body>
      </html>
    `;
  };

  const handleWhatsApp = async () => {
    if (orderItems.length === 0) {
        Alert.alert(t('error'), t('addItemsFirst'));
        return;
    }
    const billText = generateWhatsAppBill();
    const encodedBill = encodeURIComponent(billText);
    let whatsappUrl = `whatsapp://send?text=${encodedBill}`;
    if (phoneNumber) {
      let cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
      if (!cleanNumber.startsWith('+')) {
        if (!cleanNumber.startsWith('91')) cleanNumber = '91' + cleanNumber;
        cleanNumber = '+' + cleanNumber;
      }
      whatsappUrl = `whatsapp://send?phone=${cleanNumber}&text=${encodedBill}`;
    }
    try { await Linking.openURL(whatsappUrl); } 
    catch (e) { await Share.share({ message: billText }); }
  };

  const handlePrint = async () => {
    try { await Print.printAsync({ html: generateBillHTML() }); } 
    catch (e) { Alert.alert('Error', 'Could not print'); }
  };

  const handlePdf = async () => {
    try {
      const { uri } = await Print.printToFileAsync({ html: generateBillHTML() });
      await Sharing.shareAsync(uri);
    } catch (e) { Alert.alert('Error', 'Could not export PDF'); }
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
        <View style={[styles.billHeader, isLandscape && styles.billHeaderLandscape]}>
          <Text style={[styles.hotelName, isLandscape && { fontSize: 18 }]}>🏨 {t('hotelName')}</Text>
          <Text style={styles.hotelAddress}>{hotelAddress}</Text>
          <View style={styles.billInfoRow}>
            <Text style={styles.billInfo}>{t('billNo')}: #{billNumber}</Text>
            <Text style={styles.billInfo}>{new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        <View style={[isLandscape && { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }]}>
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

          <View style={[styles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={styles.sectionTitle}>{t('customerDetails')}</Text>
            <TextInput style={styles.input} value={customerName} onChangeText={setCustomerName} placeholder={t('customerName')} editable={!isSaved} />
            <View style={styles.inputRow}>
              <TextInput style={[styles.input, styles.halfInput]} value={tableNumber} onChangeText={setTableNumber} placeholder={t('tableNo')} keyboardType="numeric" editable={!isSaved} />
              <TextInput style={[styles.input, styles.halfInput]} value={phoneNumber} onChangeText={setPhoneNumber} placeholder={t('phoneWhatsApp')} keyboardType="phone-pad" editable={!isSaved} />
            </View>
          </View>

          <View style={[styles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={styles.sectionTitle}>{t('orderItems')}</Text>
            {orderItems.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={{ flex: 2 }}>{item.name}</Text>
                <Text style={{ flex: 0.5, textAlign: 'center' }}>{item.quantity}</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontWeight: 'bold' }}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <View style={styles.totalRow}><Text>{t('subtotal')}:</Text><Text>₹{calculateSubtotal().toFixed(2)}</Text></View>
            {gstEnabled && <View style={styles.totalRow}><Text>GST (${gstPercentage}%):</Text><Text>₹{calculateGST().toFixed(2)}</Text></View>}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>{t('grandTotal')}:</Text>
              <Text style={styles.grandTotalValue}>₹{calculateGrandTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.actionContainer, { paddingBottom: bottomPadding }]}>
        {!isSaved ? (
          <TouchableOpacity style={styles.completeBtn} onPress={handleSaveOrder}>
            <Text style={styles.completeBtnText}>💾 {t('saveOrderHistory')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.savedBadge}><Text style={styles.savedText}>✅ {t('orderSaved')} #{billNumber}</Text></View>
        )}

        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={handlePrint}>
            <Text style={styles.actionEmoji}>🖨️</Text><Text style={styles.actionText}>{t('print')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF9800' }]} onPress={handlePdf}>
            <Text style={styles.actionEmoji}>📄</Text><Text style={styles.actionText}>{t('pdf')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp}>
            <Text style={styles.actionEmoji}>💬</Text><Text style={styles.actionText}>{t('whatsapp')}</Text>
          </TouchableOpacity>
        </View>
        
        {isSaved && (
          <TouchableOpacity style={styles.newOrderBtn} onPress={() => navigation.navigate('Order')}>
            <Text style={{color: '#8B0000', fontWeight: 'bold'}}>+ {t('newOrder')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal visible={settingsModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>⚙️ Bill Settings</Text>
              <Text style={styles.settingLabel}>Hotel Name</Text>
              <TextInput style={styles.input} value={hotelName} onChangeText={setHotelName} />
              <Text style={styles.settingLabel}>GST (%)</Text>
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
  billHeader: { backgroundColor: '#8B0000', padding: 20, alignItems: 'center' },
  billHeaderLandscape: { flexDirection: 'row', justifyContent: 'space-between' },
  hotelName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  hotelAddress: { color: '#ffcccc', fontSize: 13 },
  billInfoRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  billInfo: { color: '#fff', fontSize: 12 },
  card: { backgroundColor: '#fff', margin: 10, borderRadius: 12, padding: 15, elevation: 2 },
  gstCard: { backgroundColor: '#fff', margin: 10, borderRadius: 12, padding: 15, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#4CAF50' },
  gstHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gstTitle: { fontSize: 16, fontWeight: 'bold' },
  gstSubtitle: { fontSize: 12, color: '#666' },
  gstControls: { flexDirection: 'row', alignItems: 'center' },
  settingsButton: { marginLeft: 10, padding: 5, backgroundColor: '#f0f0f0', borderRadius: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, marginBottom: 10, backgroundColor: '#fafafa' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
  itemRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
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
  savedBadge: { backgroundColor: '#E8F5E9', padding: 15, borderRadius: 10, alignItems: 'center' },
  savedText: { color: '#2E7D32', fontWeight: 'bold' },
  newOrderBtn: { marginTop: 10, padding: 12, borderWidth: 1, borderColor: '#8B0000', borderRadius: 8, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 20, padding: 20, width: '90%', maxHeight: '80%' },
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
});