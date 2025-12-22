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
    setGstEnabled(settings.gstEnabled);
    setGstPercentage(settings.gstPercentage);
    setTempGstPercentage(settings.gstPercentage.toString());
    setHotelName(settings.hotelName || 'HOTEL GRACE');
    setHotelAddress(settings.hotelAddress || 'Wayanad, Kerala');
    setHotelPhone(settings.hotelPhone || '+91 XXXXXXXXXX');
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

  const calculateSubtotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateGST = () => {
    if (!gstEnabled) return 0;
    return calculateSubtotal() * (gstPercentage / 100);
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const generateWhatsAppBill = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-IN');
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    let bill = '';
    bill += `════════════════════════════\n`;
    bill += `     🏨 *${hotelName}*\n`;
    bill += `      ${hotelAddress}\n`;
    bill += `     Ph: ${hotelPhone}\n`;
    bill += `════════════════════════════\n\n`;
    
    bill += `📋 *Bill No:* #${billNumber}\n`;
    bill += `📅 *Date:* ${dateStr}\n`;
    bill += `🕐 *Time:* ${timeStr}\n`;
    if (tableNumber) bill += `🪑 *Table:* ${tableNumber}\n`;
    if (customerName) bill += `👤 *Customer:* ${customerName}\n`;
    
    bill += `\n────────────────────────────\n`;
    bill += `*ITEM*              *QTY*  *AMT*\n`;
    bill += `────────────────────────────\n`;

    orderItems.forEach(item => {
      const itemName = item.name.length > 18 
        ? item.name.substring(0, 18) + '..' 
        : item.name.padEnd(20);
      const qty = item.quantity.toString().padStart(2);
      const amount = `₹${(item.price * item.quantity).toFixed(0)}`.padStart(6);
      bill += `${itemName} ${qty}  ${amount}\n`;
    });

    bill += `────────────────────────────\n\n`;
    bill += `   Subtotal:        ₹${calculateSubtotal().toFixed(2)}\n`;
    
    if (gstEnabled) {
      bill += `   GST (${gstPercentage}%):         ₹${calculateGST().toFixed(2)}\n`;
    }
    
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

    const gstHTML = gstEnabled ? `
      <div class="total-row">
        <span>GST (${gstPercentage}%):</span>
        <span>₹${calculateGST().toFixed(2)}</span>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 320px; margin: 0 auto; }
          .header { text-align: center; padding-bottom: 15px; border-bottom: 2px dashed #333; margin-bottom: 15px; }
          .hotel-name { font-size: 22px; font-weight: bold; color: #8B0000; }
          .hotel-address { font-size: 12px; color: #666; line-height: 1.4; }
          .bill-info { font-size: 12px; margin-bottom: 15px; padding: 10px; background: #f9f9f9; border-radius: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 12px; }
          th { text-align: left; padding: 8px 5px; border-bottom: 2px solid #333; }
          th:nth-child(2) { text-align: center; }
          th:nth-child(3), th:nth-child(4) { text-align: right; }
          .totals { border-top: 1px dashed #333; padding-top: 10px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; }
          .grand-total { font-size: 18px; font-weight: bold; color: #8B0000; border-top: 2px solid #8B0000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px dashed #333; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="hotel-name">🏨 ${hotelName}</div>
          <div class="hotel-address">${hotelAddress}<br>Ph: ${hotelPhone}</div>
        </div>
        <div class="bill-info">
          <div>Bill No: #${billNumber} | Date: ${dateStr}</div>
          <div>Time: ${timeStr} ${tableNumber ? `| Table: ${tableNumber}` : ''}</div>
          ${customerName ? `<div>Customer: ${customerName}</div>` : ''}
        </div>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div class="totals">
          <div class="total-row"><span>Subtotal:</span><span>₹${calculateSubtotal().toFixed(2)}</span></div>
          ${gstHTML}
          <div class="total-row grand-total"><span>GRAND TOTAL:</span><span>₹${calculateGrandTotal().toFixed(2)}</span></div>
        </div>
        <div class="footer">Thank You! Visit Again 🙏</div>
      </body>
      </html>
    `;
  };

  const shareToWhatsApp = async () => {
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

    try {
      const supported = await Linking.canOpenURL(whatsappUrl);
      if (supported) await Linking.openURL(whatsappUrl);
      else Alert.alert(t('error'), 'WhatsApp is not installed');
    } catch (error) {
      Alert.alert(t('error'), 'Could not open WhatsApp');
    }
  };

  const printBill = async () => {
    if (orderItems.length === 0) { 
      Alert.alert(t('error'), t('addItemsFirst')); 
      return; 
    }
    try { 
      await Print.printAsync({ html: generateBillHTML() });
    } catch (error) { 
      Alert.alert(t('error'), 'Could not print'); 
    }
  };

  const shareBill = async () => {
    if (orderItems.length === 0) { 
      Alert.alert(t('error'), t('addItemsFirst')); 
      return; 
    }
    try {
      const { uri } = await Print.printToFileAsync({ html: generateBillHTML() });
      await Sharing.shareAsync(uri);
    } catch (error) { 
      Alert.alert(t('error'), 'Could not share'); 
    }
  };

  const completeOrder = async () => {
    if (orderItems.length === 0) { 
      Alert.alert(t('error'), t('addItemsFirst')); 
      return; 
    }

    Alert.alert(t('completeOrder'), t('saveAndClear'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('complete'),
        onPress: async () => {
          await saveOrderToHistory({
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
          });
          await clearCurrentOrder();
          setCustomerName(''); 
          setTableNumber(''); 
          setPhoneNumber('');
          Alert.alert(t('success'), t('orderCompleted'), [
            { text: 'OK', onPress: () => navigation.navigate('Home') }
          ]);
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false} 
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View style={[styles.billHeader, isLandscape && styles.billHeaderLandscape]}>
          <Text style={[styles.hotelName, isLandscape && { fontSize: 18 }]}>
            🏨 {t('hotelName')}
          </Text>
          <Text style={styles.hotelAddress}>{t('location')}</Text>
          <View style={styles.billInfoRow}>
            <Text style={styles.billInfo}>{t('billNo')}: #{billNumber}</Text>
            <Text style={styles.billInfo}>{new Date().toLocaleDateString('en-IN')}</Text>
          </View>
        </View>

        <View style={[
          isLandscape && { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8 }
        ]}>
          <View style={[
            styles.gstCard,
            isLandscape && { width: '48%', marginHorizontal: '1%' }
          ]}>
            <View style={styles.gstHeader}>
              <View>
                <Text style={[styles.gstTitle, isLandscape && { fontSize: 14 }]}>GST Settings</Text>
                <Text style={styles.gstSubtitle}>
                  {gstEnabled ? `${gstPercentage}% GST Applied` : 'GST Disabled'}
                </Text>
              </View>
              <View style={styles.gstControls}>
                <Switch
                  value={gstEnabled}
                  onValueChange={toggleGst}
                  trackColor={{ false: '#ddd', true: '#4CAF50' }}
                  thumbColor={gstEnabled ? '#fff' : '#f4f3f4'}
                />
                <TouchableOpacity style={styles.settingsButton} onPress={openSettingsModal}>
                  <Text style={styles.settingsButtonText}>⚙️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={[
            styles.card,
            isLandscape && { width: '48%', marginHorizontal: '1%' }
          ]}>
            <Text style={[styles.sectionTitle, isLandscape && { fontSize: 14 }]}>
              {t('customerDetails')}
            </Text>
            <TextInput 
              style={[styles.input, isLandscape && { padding: 10 }]} 
              value={customerName} 
              onChangeText={setCustomerName} 
              placeholder={t('customerName')} 
              placeholderTextColor="#999" 
            />
            <View style={styles.inputRow}>
              <TextInput 
                style={[styles.input, styles.halfInput, isLandscape && { padding: 10 }]} 
                value={tableNumber} 
                onChangeText={setTableNumber} 
                placeholder={t('tableNo')} 
                placeholderTextColor="#999" 
                keyboardType="numeric" 
              />
              <TextInput 
                style={[styles.input, styles.halfInput, isLandscape && { padding: 10 }]} 
                value={phoneNumber} 
                onChangeText={setPhoneNumber} 
                placeholder={t('phoneWhatsApp')} 
                placeholderTextColor="#999" 
                keyboardType="phone-pad" 
              />
            </View>
          </View>

          <View style={[
            styles.card,
            isLandscape && { width: '48%', marginHorizontal: '1%' }
          ]}>
            <Text style={[styles.sectionTitle, isLandscape && { fontSize: 14 }]}>
              {t('orderItems')}
            </Text>
            {orderItems.length === 0 ? (
              <Text style={styles.emptyText}>{t('noItemsInOrder')}</Text>
            ) : (
              <>
                <View style={styles.itemsHeader}>
                  <Text style={[styles.headerText, { flex: 2 }]}>Item</Text>
                  <Text style={[styles.headerText, { flex: 0.5, textAlign: 'center' }]}>{t('qty')}</Text>
                  <Text style={[styles.headerText, { flex: 1, textAlign: 'right' }]}>Amt</Text>
                </View>
                {orderItems.map((item) => (
                  <View key={item.orderId || item.id} style={styles.itemRow}>
                    <Text style={[styles.itemText, { flex: 2 }]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.itemText, { flex: 0.5, textAlign: 'center' }]}>{item.quantity}</Text>
                    <Text style={[styles.itemText, { flex: 1, textAlign: 'right' }]}>₹{(item.price * item.quantity).toFixed(0)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {orderItems.length > 0 && (
            <View style={[
              styles.card,
              isLandscape && { width: '48%', marginHorizontal: '1%' }
            ]}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('subtotal')}:</Text>
                <Text style={styles.totalValue}>₹{calculateSubtotal().toFixed(2)}</Text>
              </View>
              
              {gstEnabled && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>{t('gst')} ({gstPercentage}%):</Text>
                  <Text style={styles.totalValue}>₹{calculateGST().toFixed(2)}</Text>
                </View>
              )}
              
              {!gstEnabled && (
                <View style={styles.noGstBadge}>
                  <Text style={styles.noGstText}>GST Not Applied</Text>
                </View>
              )}
              
              <View style={styles.grandTotalRow}>
                <Text style={[styles.grandTotalLabel, isLandscape && { fontSize: 16 }]}>
                  {t('grandTotal')}:
                </Text>
                <Text style={[styles.grandTotalValue, isLandscape && { fontSize: 18 }]}>
                  ₹{calculateGrandTotal().toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[
        styles.actionContainer, 
        { paddingBottom: bottomPadding },
        isLandscape && { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 }
      ]}>
        <View style={[styles.actionRow, isLandscape && { flex: 1, marginBottom: 0, marginRight: 10 }]}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#2196F3' }, isLandscape && { paddingVertical: 10 }]} 
            onPress={printBill}
          >
            <Text style={[styles.actionEmoji, isLandscape && { fontSize: 18 }]}>🖨️</Text>
            <Text style={[styles.actionText, isLandscape && { fontSize: 10 }]}>{t('print')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#FF9800' }, isLandscape && { paddingVertical: 10 }]} 
            onPress={shareBill}
          >
            <Text style={[styles.actionEmoji, isLandscape && { fontSize: 18 }]}>📄</Text>
            <Text style={[styles.actionText, isLandscape && { fontSize: 10 }]}>{t('pdf')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: '#25D366' }, isLandscape && { paddingVertical: 10 }]} 
            onPress={shareToWhatsApp}
          >
            <Text style={[styles.actionEmoji, isLandscape && { fontSize: 18 }]}>💬</Text>
            <Text style={[styles.actionText, isLandscape && { fontSize: 10 }]}>{t('whatsapp')}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={[styles.completeBtn, isLandscape && { flex: 1, paddingVertical: 12 }]} 
          onPress={completeOrder}
        >
          <Text style={[styles.completeBtnText, isLandscape && { fontSize: 14 }]}>
            {t('completeOrder')}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalContent, 
            { paddingBottom: Platform.OS === 'ios' ? insets.bottom + 20 : 20 },
            isLandscape && { width: '60%', maxHeight: height * 0.9 }
          ]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, isLandscape && { fontSize: 18 }]}>⚙️ Bill Settings</Text>

              <View style={styles.settingRow}>
                <View>
                  <Text style={styles.settingLabel}>Enable GST</Text>
                  <Text style={styles.settingHint}>Add GST to bills</Text>
                </View>
                <Switch
                  value={gstEnabled}
                  onValueChange={setGstEnabled}
                  trackColor={{ false: '#ddd', true: '#4CAF50' }}
                  thumbColor={gstEnabled ? '#fff' : '#f4f3f4'}
                />
              </View>

              {gstEnabled && (
                <View style={styles.settingInputRow}>
                  <Text style={styles.settingLabel}>GST Percentage (%)</Text>
                  <TextInput
                    style={styles.settingInput}
                    value={tempGstPercentage}
                    onChangeText={setTempGstPercentage}
                    keyboardType="numeric"
                    placeholder="5"
                    placeholderTextColor="#999"
                  />
                </View>
              )}

              <View style={styles.divider} />

              <Text style={styles.sectionLabel}>Hotel Details (for bill)</Text>
              
              <View style={styles.settingInputRow}>
                <Text style={styles.settingLabel}>Hotel Name</Text>
                <TextInput
                  style={styles.settingInputFull}
                  value={hotelName}
                  onChangeText={setHotelName}
                  placeholder="HOTEL GRACE"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.settingInputRow}>
                <Text style={styles.settingLabel}>Address</Text>
                <TextInput
                  style={styles.settingInputFull}
                  value={hotelAddress}
                  onChangeText={setHotelAddress}
                  placeholder="Wayanad, Kerala"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.settingInputRow}>
                <Text style={styles.settingLabel}>Phone Number</Text>
                <TextInput
                  style={styles.settingInputFull}
                  value={hotelPhone}
                  onChangeText={setHotelPhone}
                  placeholder="+91 XXXXXXXXXX"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton} 
                  onPress={() => setSettingsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={saveGstSettings}>
                  <Text style={styles.saveButtonText}>Save Settings</Text>
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
  container: { 
    flex: 1, 
    backgroundColor: '#f5f5f5',
  },
  scrollView: { 
    flex: 1,
  },
  billHeader: { 
    backgroundColor: '#8B0000', 
    paddingVertical: 18, 
    paddingHorizontal: 20, 
    alignItems: 'center',
  },
  billHeaderLandscape: {
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hotelName: { 
    color: '#fff', 
    fontSize: 20, 
    fontWeight: 'bold',
  },
  hotelAddress: { 
    color: '#ffcccc', 
    fontSize: 13, 
    marginTop: 4,
  },
  billInfoRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginTop: 12,
  },
  billInfo: { 
    color: '#fff', 
    fontSize: 12,
  },
  gstCard: {
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  gstHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gstTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  gstSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  gstControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsButton: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  settingsButtonText: {
    fontSize: 18,
  },
  card: { 
    backgroundColor: '#fff', 
    marginHorizontal: 12, 
    marginTop: 12, 
    borderRadius: 12, 
    padding: 15, 
    elevation: 2,
  },
  sectionTitle: { 
    fontSize: 15, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 12,
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 10, 
    padding: 12, 
    marginBottom: 10, 
    fontSize: 14, 
    backgroundColor: '#fafafa',
  },
  inputRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
  },
  halfInput: { 
    flex: 0.48,
  },
  itemsHeader: { 
    flexDirection: 'row', 
    paddingBottom: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#ddd',
  },
  headerText: { 
    fontWeight: 'bold', 
    color: '#666', 
    fontSize: 12,
  },
  itemRow: { 
    flexDirection: 'row', 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
  },
  itemText: { 
    fontSize: 14, 
    color: '#333',
  },
  emptyText: { 
    textAlign: 'center', 
    color: '#999', 
    fontStyle: 'italic', 
    paddingVertical: 20,
  },
  totalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 8,
  },
  totalLabel: { 
    fontSize: 14, 
    color: '#666',
  },
  totalValue: { 
    fontSize: 14, 
    color: '#333',
    fontWeight: '500',
  },
  noGstBadge: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
    marginVertical: 8,
  },
  noGstText: {
    color: '#FF9800',
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  grandTotalRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    borderTopWidth: 2, 
    borderTopColor: '#8B0000', 
    marginTop: 10, 
    paddingTop: 12,
  },
  grandTotalLabel: { 
    fontSize: 17, 
    fontWeight: 'bold', 
    color: '#8B0000',
  },
  grandTotalValue: { 
    fontSize: 19, 
    fontWeight: 'bold', 
    color: '#8B0000',
  },
  actionContainer: { 
    backgroundColor: '#fff', 
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1, 
    borderTopColor: '#eee',
  },
  actionRow: { 
    flexDirection: 'row', 
    marginBottom: 10,
  },
  actionBtn: { 
    flex: 1, 
    paddingVertical: 12, 
    borderRadius: 10, 
    alignItems: 'center', 
    marginHorizontal: 4,
  },
  actionEmoji: { 
    fontSize: 20,
  },
  actionText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 11, 
    marginTop: 4,
  },
  completeBtn: { 
    backgroundColor: '#8B0000', 
    paddingVertical: 14, 
    borderRadius: 10, 
    alignItems: 'center',
  },
  completeBtnText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  settingHint: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  settingInputRow: {
    paddingVertical: 12,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
    backgroundColor: '#fafafa',
    width: 100,
  },
  settingInputFull: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginTop: 8,
    backgroundColor: '#fafafa',
  },
  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 15,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#8B0000',
    marginBottom: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});