// src/screens/BillScreen.js
import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, KeyboardAvoidingView, Platform, Modal, Switch, Share, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import useOrientation from '../utils/useOrientation';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { 
  getActiveTableOrder, 
  clearActiveTableOrder, 
  saveOrderToHistory, 
  loadOrderHistory,
  loadSettings,
  saveSettings,
} from '../utils/storage';
import { createGlobalStyles } from '../styles/globalStyles';

export default function BillScreen({ navigation, route }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isLandscape } = useOrientation();
  const globalStyles = useMemo(() => createGlobalStyles(theme), [theme]);

  // GET TABLE NO
  const { tableNo } = route.params || { tableNo: 'Counter' };

  const [orderItems, setOrderItems] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState(tableNo); // Default to passed table
  const [phoneNumber, setPhoneNumber] = useState('');
  const [billNumber, setBillNumber] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
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
  const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

  useFocusEffect(
    useCallback(() => { 
        loadData(); 
    }, [tableNo]) // DEPENDENCY ADDED: Refreshes when tableNo changes
  );

  const loadData = async () => {
    // LOAD SPECIFIC TABLE
    const order = await getActiveTableOrder(tableNo);
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
    setTableNumber(tableNo); // Ensure table number is set to the param
  };

  const calculateSubtotal = () => round(orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0));
  const calculateGST = () => gstEnabled ? round(calculateSubtotal() * (gstPercentage / 100)) : 0;
  const calculateGrandTotal = () => Math.round(calculateSubtotal() + calculateGST() - (parseFloat(discount) || 0));

  const handleSaveOrder = async () => {
    if (orderItems.length === 0) { Alert.alert(t('error'), t('addItemsFirst')); return; }
    
    const orderData = {
      items: orderItems, customerName, tableNumber, phoneNumber, billNumber,
      subtotal: calculateSubtotal(), gst: calculateGST(), gstEnabled, gstPercentage,
      discount: parseFloat(discount) || 0, paymentMode, grandTotal: calculateGrandTotal(),
      date: new Date().toISOString()
    };
    
    // Save to History
    const savedOrder = await saveOrderToHistory(orderData);
    
    if (savedOrder) {
      // CLEAR THE ACTIVE TABLE ORDER
      await clearActiveTableOrder(tableNo);
      
      setCustomerName(''); setPhoneNumber('');
      Alert.alert(
          t('success'), 
          `${t('orderSaved')} #${billNumber}`, 
          [{ text: 'OK', onPress: () => navigation.navigate('Home') }] // Go back to Home/Table View
      );
    } else { 
        Alert.alert(t('error'), 'Failed to save order'); 
    }
  };

  // ... [Keep existing HTML and WhatsApp generation code, it works fine] ...
  const generateBillHTML = () => {
      // (Copy your existing generateBillHTML function here exactly as it is)
      const subtotal = calculateSubtotal();
      const totalGst = calculateGST();
      const halfGstPercent = gstPercentage / 2;
      const halfGstAmount = round(totalGst / 2); 
      const grandTotal = calculateGrandTotal();
      const rawTotal = subtotal + totalGst - (parseFloat(discount) || 0);
      const roundOff = round(grandTotal - rawTotal).toFixed(2);
      const date = new Date().toLocaleDateString('en-IN');
      const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      const itemsHTML = orderItems.map((item, index) => `
        <tr><td class="center" style="width: 10%">${index + 1}</td><td class="left" style="width: 45%">${item.name}</td><td class="center" style="width: 15%">${item.quantity}</td><td class="right" style="width: 15%">${item.price}</td><td class="right" style="width: 15%">${(item.price * item.quantity).toFixed(0)}</td></tr>
      `).join('');

      let gstRows = gstEnabled && totalGst > 0 ? `<div class="total-row"><span>CGST (${halfGstPercent}%)</span><span>${halfGstAmount.toFixed(2)}</span></div><div class="total-row"><span>SGST (${halfGstPercent}%)</span><span>${halfGstAmount.toFixed(2)}</span></div>` : '';

      return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" /><style>@import url('https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&display=swap'); body { font-family: 'Courier Prime', monospace; width: 300px; margin: 0 auto; padding: 5px; background-color: #fff; color: #000; font-size: 12px; } .header { text-align: center; margin-bottom: 5px; } .hotel-name { font-size: 22px; font-weight: bold; margin: 0; text-transform: uppercase; } .address { font-size: 11px; margin: 2px 0; } .reg-details { font-size: 10px; margin: 5px 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2px 0; } .bill-title { text-align: center; font-weight: bold; margin: 10px 0 5px 0; text-decoration: underline; } .divider { border-top: 1px dashed #000; margin: 5px 0; } .info-row { display: flex; justify-content: space-between; font-size: 11px; } table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 11px; } th { text-align: left; border-bottom: 1px dashed #000; padding-bottom: 5px; font-weight: bold; } td { padding-top: 5px; vertical-align: top; } .left { text-align: left; } .center { text-align: center; } .right { text-align: right; } .totals { margin-top: 10px; font-size: 11px; } .total-row { display: flex; justify-content: space-between; margin-bottom: 3px; } .grand-total-row { display: flex; justify-content: space-between; margin-top: 5px; border-top: 3px double #000; border-bottom: 3px double #000; padding: 8px 0; } .grand-total-label { font-size: 14px; font-weight: bold; } .grand-total-value { font-size: 18px; font-weight: bold; } .footer { text-align: center; margin-top: 15px; font-size: 11px; } .malayalam-text { font-family: sans-serif; font-size: 12px; margin-top: 5px; font-weight: bold; } </style></head><body><div class="header"><p class="hotel-name">${hotelName}</p><p class="address">${hotelAddress}</p><p class="address">Ph: ${hotelPhone}</p><div class="reg-details">GSTIN: 32ABCDE1234F1Z5 | FSSAI: 12345678901234</div></div><div class="bill-title">CASH BILL / TAX INVOICE</div><div class="info-row"><span>Bill No: ${billNumber}</span><span>Date: ${date}</span></div><div class="info-row"><span>Table: ${tableNumber || '-'}</span><span>Time: ${time}</span></div>${customerName ? `<div class="info-row"><span>Cust: ${customerName}</span></div>` : ''}<div class="divider"></div><table><thead><tr><th class="center">SN</th><th class="left">ITEM</th><th class="center">QTY</th><th class="right">RATE</th><th class="right">AMT</th></tr></thead><tbody>${itemsHTML}</tbody></table><div class="divider"></div><div class="totals"><div class="total-row"><span>Sub Total</span><span>${subtotal.toFixed(2)}</span></div>${gstRows}${discount > 0 ? `<div class="total-row"><span>Discount</span><span>-${parseFloat(discount).toFixed(2)}</span></div>` : ''}<div class="total-row"><span>Round Off</span><span>${roundOff}</span></div><div class="grand-total-row"><span class="grand-total-label">GRAND TOTAL</span><span class="grand-total-value">₹${grandTotal.toFixed(2)}</span></div><div class="total-row" style="margin-top:8px; font-size: 10px;"><span>Mode: ${paymentMode}</span><span>Cashier: Admin</span></div></div><div class="footer"><p>Thank You! Visit Again.</p><p class="malayalam-text">നന്ദി! വീണ്ടും വരിക.</p><p style="font-size: 9px; margin-top: 10px; border-top: 1px dashed #ccc; padding-top: 5px;">No exchange or refund due to hygiene reasons.</p></div></body></html>`;
  };

  const generateWhatsAppText = () => {
      // (Copy your existing generateWhatsAppText function here)
      const pad = (str, len, align = 'right') => {
        const s = String(str);
        if (s.length > len) return s.substring(0, len);
        const spaces = ' '.repeat(len - s.length);
        return align === 'left' ? s + spaces : spaces + s;
      };
      const center = (str) => {
          const width = 30; const left = Math.max(0, Math.floor((width - str.length) / 2));
          return ' '.repeat(left) + str;
      };
      const line = "-".repeat(30); const doubleLine = "=".repeat(30);
      const date = new Date().toLocaleDateString('en-IN'); const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      let t = "```\n"; 
      t += center(hotelName) + "\n" + center("Ph: " + hotelPhone.split(',')[0]) + "\n" + center("TAX INVOICE") + "\n" + line + "\n";
      t += `Bill: ${billNumber}`.padEnd(16) + `Date: ${date}\n` + `Table: ${tableNumber || '-'}`.padEnd(16) + `Time: ${time}\n`;
      if(customerName) t += `Cust: ${customerName}\n`;
      t += line + "\n" + "SN " + pad("ITEM", 12, 'left') + pad("QTY", 3) + pad("RT", 5) + pad("AMT", 6) + "\n" + line + "\n";
      orderItems.forEach((item, index) => { t += pad(index + 1, 2, 'left') + " " + pad(item.name, 12, 'left') + pad(item.quantity, 3) + pad(item.price, 5) + pad((item.price * item.quantity).toFixed(0), 6) + "\n"; });
      t += line + "\n" + pad("Subtotal:", 23) + pad(calculateSubtotal().toFixed(2), 7) + "\n";
      if (gstEnabled && calculateGST() > 0) {
          const half = round(calculateGST() / 2); const p = gstPercentage / 2;
          t += pad(`CGST (${p}%):`, 23) + pad(half.toFixed(2), 7) + "\n" + pad(`SGST (${p}%):`, 23) + pad(half.toFixed(2), 7) + "\n";
      }
      if (discount > 0) t += pad("Discount:", 23) + pad("-" + parseFloat(discount).toFixed(2), 7) + "\n";
      t += doubleLine + "\n" + pad("GRAND TOTAL:", 16) + pad("Rs." + calculateGrandTotal().toFixed(0), 14) + "\n" + doubleLine + "\n" + center("Thank You! Visit Again") + "\n" + "```"; 
      return t;
  };
  
  const handleWhatsApp = async () => {
    if (orderItems.length === 0) return;
    const text = generateWhatsAppText();
    if (phoneNumber) {
        let cleanedNumber = phoneNumber.replace(/[^0-9]/g, '');
        if (cleanedNumber.length === 10) cleanedNumber = '91' + cleanedNumber;
        const url = `whatsapp://send?phone=${cleanedNumber}&text=${encodeURIComponent(text)}`;
        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
            else Alert.alert('Error', 'WhatsApp is not installed on this device.');
        } catch (err) { Alert.alert('Error', 'Could not open WhatsApp.'); }
    } else {
        try { await Share.share({ message: text }); } catch (error) { Alert.alert('Error', 'Share error'); }
    }
  };

  const handlePrint = async () => { try { await Print.printAsync({ html: generateBillHTML() }); } catch (e) { Alert.alert('Error', 'Print error'); } };
  const handlePdf = async () => { try { const { uri } = await Print.printToFileAsync({ html: generateBillHTML() }); await Sharing.shareAsync(uri); } catch (e) { Alert.alert('Error', 'PDF error'); } };
  
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

  if (orderItems.length === 0 && !isSaved) {
    return (
      <View style={[globalStyles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 60 }}>🧾</Text>
        <Text style={[globalStyles.subtitle, { marginVertical: 10 }]}>{t('emptyOrder')}</Text>
        <TouchableOpacity style={globalStyles.primaryButton} onPress={() => navigation.navigate('Order', { tableNo })}>
          <Text style={globalStyles.primaryButtonText}>{t('addItemsFirst')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={globalStyles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={[styles.billHeader, { backgroundColor: theme.primary }]}>
          <Text style={styles.hotelNameTitle}>🏨 {hotelName}</Text>
          <Text style={styles.billInfoText}>Table: {tableNumber} | Bill: #{billNumber}</Text>
        </View>

        <View style={[isLandscape && { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }]}>
          
           {/* Payment & Discount */}
           <View style={[globalStyles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={[globalStyles.title, { fontSize: 16 }]}>Payment & Discount</Text>
            <View style={styles.paymentRow}>
              {['Cash', 'UPI', 'Card'].map(mode => (
                <TouchableOpacity 
                  key={mode} 
                  style={[styles.paymentBtn, paymentMode === mode ? { backgroundColor: theme.primary } : { backgroundColor: theme.inputBackground }]}
                  onPress={() => setPaymentMode(mode)}
                >
                  <Text style={[styles.paymentBtnText, { color: paymentMode === mode ? '#fff' : theme.text }]}>{mode}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={globalStyles.row}>
              <Text style={globalStyles.bold}>Discount (₹):</Text>
              <TextInput 
                style={[globalStyles.input, { width: 100, marginBottom: 0, textAlign: 'center' }]} 
                keyboardType="numeric" 
                value={discount} 
                onChangeText={setDiscount} 
              />
            </View>
          </View>

          {/* GST Settings */}
          <View style={[globalStyles.card, { borderLeftWidth: 4, borderLeftColor: '#4CAF50' }, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <View style={globalStyles.row}>
              <View>
                <Text style={globalStyles.bold}>GST Settings</Text>
                <Text style={globalStyles.subtitle}>{gstEnabled ? `${gstPercentage}% Applied` : 'Disabled'}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Switch value={gstEnabled} onValueChange={toggleGst} trackColor={{ false: theme.border, true: '#4CAF50' }} />
                <TouchableOpacity style={{ marginLeft: 10, padding: 5 }} onPress={() => setSettingsModalVisible(true)}>
                  <Text style={{fontSize: 20}}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Customer Details */}
          <View style={[globalStyles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={[globalStyles.title, { fontSize: 16 }]}>{t('customerDetails')}</Text>
            <TextInput style={globalStyles.input} value={customerName} onChangeText={setCustomerName} placeholder={t('customerName')} placeholderTextColor={theme.textSecondary} />
            <View style={globalStyles.row}>
              <TextInput style={[globalStyles.input, { flex: 0.48, marginBottom: 0 }]} value={tableNumber} onChangeText={setTableNumber} placeholder={t('tableNo')} keyboardType="numeric" placeholderTextColor={theme.textSecondary} />
              <TextInput style={[globalStyles.input, { flex: 0.48, marginBottom: 0 }]} value={phoneNumber} onChangeText={setPhoneNumber} placeholder="WhatsApp No" keyboardType="phone-pad" placeholderTextColor={theme.textSecondary} />
            </View>
          </View>

          {/* Items Summary */}
          <View style={[globalStyles.card, isLandscape && { width: '48%', marginHorizontal: '1%' }]}>
            <Text style={[globalStyles.title, { fontSize: 16 }]}>{t('orderItems')}</Text>
            {orderItems.map((item, idx) => (
              <View key={idx} style={[globalStyles.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: theme.border }]}>
                <Text style={{ flex: 2, color: theme.text }}>{item.name}</Text>
                <Text style={{ flex: 1, textAlign: 'right', fontWeight: 'bold', color: theme.text }}>₹{(item.price * item.quantity).toFixed(0)}</Text>
              </View>
            ))}
            <View style={[globalStyles.row, { borderTopWidth: 2, borderTopColor: theme.primary, marginTop: 10, paddingTop: 10 }]}>
              <Text style={{ fontSize: 17, fontWeight: 'bold', color: theme.primary }}>{t('grandTotal')}:</Text>
              <Text style={{ fontSize: 19, fontWeight: 'bold', color: theme.primary }}>₹{calculateGrandTotal().toFixed(2)}</Text>
            </View>
          </View>

        </View>

      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.actionContainer, { backgroundColor: theme.card, borderTopColor: theme.border, paddingBottom: bottomPadding }]}>
        <TouchableOpacity style={globalStyles.primaryButton} onPress={handleSaveOrder}>
          <Text style={globalStyles.primaryButtonText}>💾 Close Bill</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', marginTop: 10, gap: 5 }}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2196F3' }]} onPress={handlePrint}><Text style={styles.actionEmoji}>🖨️</Text><Text style={styles.actionText}>{t('print')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#FF9800' }]} onPress={handlePdf}><Text style={styles.actionEmoji}>📄</Text><Text style={styles.actionText}>{t('pdf')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={handleWhatsApp}><Text style={styles.actionEmoji}>💬</Text><Text style={styles.actionText}>WhatsApp</Text></TouchableOpacity>
        </View>
      </View>
      
      {/* Settings Modal (Same as before) */}
       <Modal visible={settingsModalVisible} animationType="slide" transparent={true}>
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContent}>
            <ScrollView>
              <Text style={[globalStyles.title, { textAlign: 'center' }]}>⚙️ Bill Settings</Text>
              <Text style={globalStyles.label}>Hotel Name</Text>
              <TextInput style={globalStyles.input} value={hotelName} onChangeText={setHotelName} />
              <Text style={globalStyles.label}>Address</Text>
              <TextInput style={globalStyles.input} value={hotelAddress} onChangeText={setHotelAddress} />
              <Text style={globalStyles.label}>Phone</Text>
              <TextInput style={globalStyles.input} value={hotelPhone} onChangeText={setHotelPhone} keyboardType="phone-pad" />
              <Text style={globalStyles.label}>GST %</Text>
              <TextInput style={globalStyles.input} value={tempGstPercentage} onChangeText={setTempGstPercentage} keyboardType="numeric" />
              <View style={globalStyles.modalButtons}>
                <TouchableOpacity style={[globalStyles.secondaryButton, { flex: 1 }]} onPress={() => setSettingsModalVisible(false)}>
                  <Text style={globalStyles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[globalStyles.primaryButton, { flex: 1 }]} onPress={saveGstSettings}>
                  <Text style={globalStyles.primaryButtonText}>Save</Text>
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
  billHeader: { padding: 20, alignItems: 'center', flexDirection: 'column', justifyContent: 'center' }, // Changed to column to stack
  hotelNameTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  billInfoText: { color: '#fff', fontSize: 14, marginTop: 5 },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  paymentBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, marginHorizontal: 2 },
  paymentBtnText: { fontWeight: 'bold', fontSize: 12 },
  actionContainer: { padding: 10, borderTopWidth: 1 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actionEmoji: { fontSize: 20 },
  actionText: { color: '#fff', fontWeight: 'bold', fontSize: 10 },
});