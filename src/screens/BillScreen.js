// src/screens/BillScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Switch,
  Share,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
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
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape } = useOrientation();
  
  const [orderItems, setOrderItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billNumber, setBillNumber] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  
  // POS Features
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [discount, setDiscount] = useState('0');
  
  const [gstEnabled, setGstEnabled] = useState(true);
  const [gstPercentage, setGstPercentage] = useState(5);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [tempGstPercentage, setTempGstPercentage] = useState('5');
  
  const [hotelName, setHotelName] = useState('HOTEL GRACE');
  const [hotelAddress, setHotelAddress] = useState('Near KSRTC, Mavoor Road, Calicut - 673001');
  const [hotelPhone, setHotelPhone] = useState('0495-2765432, 9876543210');

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
      setHotelAddress(settings.hotelAddress || 'Near KSRTC, Mavoor Road, Calicut - 673001');
      setHotelPhone(settings.hotelPhone || '0495-2765432, 9876543210');
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
    setHotelAddress(settings.hotelAddress || 'Near KSRTC, Mavoor Road, Calicut - 673001');
    setHotelPhone(settings.hotelPhone || '0495-2765432, 9876543210');
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
      date: new Date().toISOString()
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

  // --- KERALA STYLE HTML GENERATOR (FOR PRINTING) ---
  const generateBillHTML = () => {
    const subtotal = calculateSubtotal();
    const totalGst = calculateGST();
    const halfGstPercent = gstPercentage / 2;
    const halfGstAmount = totalGst / 2;
    const rawTotal = subtotal + totalGst - (parseFloat(discount) || 0);
    const grandTotal = Math.round(rawTotal);
    const roundOff = (grandTotal - rawTotal).toFixed(2);
    const date = new Date().toLocaleDateString('en-IN');
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const itemsHTML = orderItems.map((item, index) => `
      <tr>
        <td class="center" style="width: 10%">${index + 1}</td>
        <td class="left" style="width: 45%">${item.name}</td>
        <td class="center" style="width: 15%">${item.quantity}</td>
        <td class="right" style="width: 15%">${item.price}</td>
        <td class="right" style="width: 15%">${(item.price * item.quantity).toFixed(0)}</td>
      </tr>
    `).join('');

    let gstRows = '';
    if (gstEnabled && totalGst > 0) {
        gstRows = `
          <div class="total-row"><span>CGST (${halfGstPercent}%)</span><span>${halfGstAmount.toFixed(2)}</span></div>
          <div class="total-row"><span>SGST (${halfGstPercent}%)</span><span>${halfGstAmount.toFixed(2)}</span></div>
        `;
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @import url('[https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap](https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap)');
          body { font-family: 'Courier Prime', monospace; width: 300px; margin: 0 auto; padding: 5px; background-color: #fff; color: #000; font-size: 12px; }
          .header { text-align: center; margin-bottom: 5px; }
          .hotel-name { font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; }
          .address { font-size: 11px; margin: 2px 0; }
          .reg-details { font-size: 10px; margin: 5px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0; }
          .bill-title { text-align: center; font-weight: bold; margin: 10px 0 5px 0; text-decoration: underline; }
          .divider { border-top: 1px dashed #000; margin: 5px 0; }
          .info-row { display: flex; justify-content: space-between; font-size: 11px; }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; }
          th { text-align: left; border-bottom: 1px dashed #000; padding-bottom: 5px; font-weight: bold; }
          td { padding-top: 5px; vertical-align: top; }
          .left { text-align: left; }
          .center { text-align: center; }
          .right { text-align: right; }
          .totals { margin-top: 10px; font-size: 11px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; }
          .grand-total-row { display: flex; justify-content: space-between; margin-top: 5px; border-top: 3px double #000; border-bottom: 3px double #000; padding: 8px 0; }
          .grand-total-label { font-size: 14px; font-weight: bold; }
          .grand-total-value { font-size: 18px; font-weight: bold; }
          .footer { text-align: center; margin-top: 15px; font-size: 11px; }
          .malayalam-text { font-family: sans-serif; font-size: 12px; margin-top: 5px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <p class="hotel-name">${hotelName}</p>
          <p class="address">${hotelAddress}</p>
          <p class="address">Ph: ${hotelPhone}</p>
          <div class="reg-details">GSTIN: 32ABCDE1234F1Z5 | FSSAI: 12345678901234</div>
        </div>
        <div class="bill-title">CASH BILL / TAX INVOICE</div>
        <div class="info-row"><span>Bill No: ${billNumber}</span><span>Date: ${date}</span></div>
        <div class="info-row"><span>Table: ${tableNumber || '-'}</span><span>Time: ${time}</span></div>
        ${customerName ? `<div class="info-row"><span>Cust: ${customerName}</span></div>` : ''}
        <div class="divider"></div>
        <table>
          <thead><tr><th class="center">SN</th><th class="left">ITEM</th><th class="center">QTY</th><th class="right">RATE</th><th class="right">AMT</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div class="divider"></div>
        <div class="totals">
          <div class="total-row"><span>Sub Total</span><span>${subtotal.toFixed(2)}</span></div>
          ${gstRows}
          ${discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${parseFloat(discount).toFixed(2)}</span></div>` : ''}
          <div class="total-row"><span>Round Off</span><span>${roundOff}</span></div>
          <div class="grand-total-row"><span class="grand-total-label">GRAND TOTAL</span><span class="grand-total-value">₹${grandTotal.toFixed(2)}</span></div>
          <div class="total-row" style="margin-top:8px; font-size: 10px;"><span>Mode: ${paymentMode}</span><span>Cashier: Admin</span></div>
        </div>
        <div class="footer">
          <p>Thank You! Visit Again.</p>
          <p class="malayalam-text">നന്ദി! വീണ്ടും വരിക.</p>
          <p style="font-size: 9px; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 5px;">No exchange or refund due to hygiene reasons.</p>
        </div>
      </body>
      </html>
    `;
  };

  // --- WHATSAPP TEXT GENERATOR (MONOSPACE) ---
  // This mimics the thermal printer look using text characters
  const generateWhatsAppText = () => {
    // Helper to pad strings to a specific length
    const pad = (str, len, align = 'right') => {
      const s = String(str);
      if (s.length > len) return s.substring(0, len); // Truncate
      const spaces = ' '.repeat(len - s.length);
      return align === 'left' ? s + spaces : spaces + s;
    };

    // Helper to center text
    const center = (str) => {
        const width = 30; // WhatsApp mobile width for monospace
        const left = Math.max(0, Math.floor((width - str.length) / 2));
        return ' '.repeat(left) + str;
    };

    const line = "-".repeat(30);
    const doubleLine = "=".repeat(30);
    const date = new Date().toLocaleDateString('en-IN');
    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // Start Monospace Block
    let t = "```\n"; 
    
    // Header
    t += center(hotelName) + "\n";
    t += center("Ph: " + hotelPhone.split(',')[0]) + "\n"; // Show first phone number
    t += center("TAX INVOICE") + "\n";
    t += line + "\n";
    
    // Meta Data
    t += `Bill: ${billNumber}`.padEnd(16) + `Date: ${date}\n`;
    t += `Table: ${tableNumber || '-'}`.padEnd(16) + `Time: ${time}\n`;
    if(customerName) t += `Cust: ${customerName}\n`;
    
    t += line + "\n";
    
    // Table Header: SN(2) Item(13) Q(3) R(5) A(6) = 29 chars
    t += "SN " + pad("ITEM", 12, 'left') + pad("QTY", 3) + pad("RT", 5) + pad("AMT", 6) + "\n";
    t += line + "\n";
    
    // Items
    orderItems.forEach((item, index) => {
        t += pad(index + 1, 2, 'left') + " " + 
             pad(item.name, 12, 'left') + 
             pad(item.quantity, 3) + 
             pad(item.price, 5) + 
             pad((item.price * item.quantity).toFixed(0), 6) + "\n";
    });
    
    t += line + "\n";
    
    // Totals
    const sub = calculateSubtotal();
    const gstVal = calculateGST();
    const grand = calculateGrandTotal();
    
    t += pad("Subtotal:", 23) + pad(sub.toFixed(0), 7) + "\n";
    
    if (gstEnabled && gstVal > 0) {
        const half = gstVal / 2;
        const p = gstPercentage / 2;
        t += pad(`CGST (${p}%):`, 23) + pad(half.toFixed(0), 7) + "\n";
        t += pad(`SGST (${p}%):`, 23) + pad(half.toFixed(0), 7) + "\n";
    }
    
    if (discount > 0) {
        t += pad("Discount:", 23) + pad("-" + parseFloat(discount).toFixed(0), 7) + "\n";
    }
    
    t += doubleLine + "\n";
    t += pad("GRAND TOTAL:", 16) + pad("Rs." + grand.toFixed(0), 14) + "\n";
    t += doubleLine + "\n";
    
    t += center("Thank You! Visit Again") + "\n";
    t += "```"; // End Monospace Block
    
    return t;
  };

  const handleWhatsApp = async () => {
    if (orderItems.length === 0) return;

    // Generate the Monospace formatted text
    const text = generateWhatsAppText();

    if (phoneNumber) {
        let cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanedNumber.length === 10) {
            cleanedNumber = '91' + cleanedNumber;
        }
        
        // Encode the text properly for URL
        const url = `whatsapp://send?phone=${cleanedNumber}&text=${encodeURIComponent(text)}`;
        
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                Alert.alert('Error', 'WhatsApp not installed.');
            }
        } catch (err) { 
            Alert.alert('Error', 'Could not open WhatsApp.'); 
        }
    } else {
        // If no number, use standard share sheet
        try { 
            await Share.share({ message: text }); 
        } catch (error) { 
            Alert.alert('Error', 'Share error'); 
        }
    }
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
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <Text style={styles.emptyEmoji}>🧾</Text>
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t('emptyOrder')}</Text>
        <TouchableOpacity style={[styles.goBackBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('Order')}>
          <Text style={styles.goBackText}>{t('addItemsFirst')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Styles helpers
  const cardStyle = [styles.card, { backgroundColor: theme.card }];
  const inputStyle = [styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }];
  const textStyle = { color: theme.text };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: theme.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.billHeader, { backgroundColor: theme.primary }]}>
          <Text style={styles.hotelName}>🏨 {hotelName}</Text>
          <Text style={styles.billInfo}>{t('billNo')}: #{billNumber}</Text>
        </View>

        <View style={[isLandscape && { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }]}>
          
          {/* Payment & Discount Card */}
          <View style={[cardStyle, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>Payment & Discount</Text>
            <View style={styles.paymentRow}>
              {['Cash', 'UPI', 'Card'].map(mode => (
                <TouchableOpacity 
                  key={mode} 
                  style={[
                    styles.paymentBtn, 
                    paymentMode === mode ? { backgroundColor: theme.primary } : { backgroundColor: theme.inputBackground }
                  ]}
                  onPress={() => setPaymentMode(mode)}
                >
                  <Text style={[
                    styles.paymentBtnText, 
                    { color: paymentMode === mode ? '#fff' : theme.text }
                  ]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={[styles.discountRow, { borderTopColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.text }]}>Discount (₹):</Text>
              <TextInput 
                style={[styles.discountInput, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]} 
                keyboardType="numeric" 
                value={discount} 
                onChangeText={setDiscount} 
              />
            </View>
          </View>

          {/* GST Settings Card */}
          <View style={[cardStyle, { borderLeftWidth: 4, borderLeftColor: '#4CAF50' }, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <View style={styles.gstHeader}>
              <View>
                <Text style={[styles.gstTitle, { color: theme.text }]}>GST Settings</Text>
                <Text style={[styles.gstSubtitle, { color: theme.textSecondary }]}>{gstEnabled ? `${gstPercentage}% Applied` : 'Disabled'}</Text>
              </View>
              <View style={styles.gstControls}>
                <Switch value={gstEnabled} onValueChange={toggleGst} trackColor={{ false: theme.border, true: '#4CAF50' }} />
                <TouchableOpacity style={[styles.settingsButton, { backgroundColor: theme.inputBackground }]} onPress={openSettingsModal}>
                  <Text style={{fontSize: 20}}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Customer Details Card */}
          <View style={[cardStyle, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>{t('customerDetails')}</Text>
            <TextInput style={inputStyle} value={customerName} onChangeText={setCustomerName} placeholder={t('customerName')} placeholderTextColor={theme.textSecondary} />
            <View style={styles.inputRow}>
              <TextInput style={[inputStyle, styles.halfInput]} value={tableNumber} onChangeText={setTableNumber} placeholder={t('tableNo')} keyboardType="numeric" placeholderTextColor={theme.textSecondary} />
              <TextInput style={[inputStyle, styles.halfInput]} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="WhatsApp No" keyboardType="phone-pad" placeholderTextColor={theme.textSecondary} />
            </View>
          </View>

          {/* Items Summary Card */}
          <View style={[cardStyle, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={[styles.sectionTitle, { color: theme.primary }]}>{t('orderItems')}</Text>
            {orderItems.map((item, idx) => (
              <View key={idx} style={[styles.itemRow, { borderBottomColor: theme.border }]}>
                <Text style={[{ flex: 2 }, textStyle]}>{item.name}</Text>
                <Text style={[{ flex: 1, textAlign: 'right', fontWeight: 'bold' }, textStyle]}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
            <View style={[styles.grandTotalRow, { borderTopColor: theme.primary }]}>
              <Text style={[styles.grandTotalLabel, { color: theme.primary }]}>{t('grandTotal')}:</Text>
              <Text style={[styles.grandTotalValue, { color: theme.primary }]}>₹{calculateGrandTotal().toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action Buttons Section */}
      <View style={[styles.actionContainer, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: bottomPadding }]}>
        <TouchableOpacity style={[styles.completeBtn, { backgroundColor: theme.primary }]} onPress={handleSaveOrder}>
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
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <ScrollView>
              <Text style={[styles.modalTitle, { color: theme.text }]}>⚙️ Bill Settings</Text>
              <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Hotel Name</Text>
              <TextInput style={inputStyle} value={hotelName} onChangeText={setHotelName} />
              <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Address (City, State)</Text>
              <TextInput style={inputStyle} value={hotelAddress} onChangeText={setHotelAddress} />
              <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>Phone Number</Text>
              <TextInput style={inputStyle} value={hotelPhone} onChangeText={setHotelPhone} keyboardType="phone-pad" />
              <Text style={[styles.settingLabel, { color: theme.textSecondary }]}>GST Percentage (%)</Text>
              <TextInput style={inputStyle} value={tempGstPercentage} onChangeText={setTempGstPercentage} keyboardType="numeric" />
              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setSettingsModalVisible(false)}>
                  <Text style={{ color: theme.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveGstSettings}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  billHeader: { padding: 20, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  hotelName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  billInfo: { color: '#fff', fontSize: 14 },
  card: { margin: 10, borderRadius: 12, padding: 15, elevation: 2 },
  gstHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gstTitle: { fontSize: 16, fontWeight: 'bold' },
  gstSubtitle: { fontSize: 12 },
  gstControls: { flexDirection: 'row', alignItems: 'center' },
  settingsButton: { marginLeft: 10, padding: 5, borderRadius: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  paymentBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, marginHorizontal: 2 },
  paymentBtnText: { fontWeight: 'bold', fontSize: 12 },
  discountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, paddingTop: 10 },
  label: { fontSize: 14 },
  discountInput: { borderWidth: 1, borderRadius: 5, padding: 5, width: 80, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10 },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { flex: 0.48 },
  itemRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1 },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 2, marginTop: 10, paddingTop: 10 },
  grandTotalLabel: { fontSize: 17, fontWeight: 'bold' },
  grandTotalValue: { fontSize: 19, fontWeight: 'bold' },
  actionContainer: { padding: 10, borderTopWidth: 1 },
  actionRow: { flexDirection: 'row', marginTop: 10 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', marginHorizontal: 2 },
  actionEmoji: { fontSize: 20 },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
  completeBtn: { padding: 15, borderRadius: 10, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { borderRadius: 20, padding: 20, width: '90%' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalButtons: { flexDirection: 'row', marginTop: 20 },
  saveButton: { flex: 1, backgroundColor: '#4CAF50', padding: 15, borderRadius: 10, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontWeight: 'bold' },
  cancelButton: { flex: 1, padding: 15, alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyEmoji: { fontSize: 60 },
  emptyText: { fontSize: 18, marginVertical: 10 },
  goBackBtn: { padding: 12, borderRadius: 8 },
  goBackText: { color: '#fff', fontWeight: 'bold' },
  settingLabel: { fontWeight: 'bold', marginTop: 10 },
});