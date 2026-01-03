// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { 
  loadSettings, 
  saveSettings, 
  createBackupObject, 
  updateLastBackupTimestamp, 
  restoreFullBackup 
} from '../utils/storage';
import { restoreAllData } from '../utils/backup';

// --- DATA MANAGEMENT IMPORTS ---
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const { t, language, toggleLanguage } = useLanguage();

  // Screen States
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false); 
  const [unlockInput, setUnlockInput] = useState('');

  // Settings States
  const [hotelName, setHotelName] = useState('');
  const [hotelPhone, setHotelPhone] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [gstEnabled, setGstEnabled] = useState(false);
  const [gstPercentage, setGstPercentage] = useState('');
  
  // Security States
  const [pinEnabled, setPinEnabled] = useState(false);
  const [adminPin, setAdminPin] = useState('1234'); 

  // --- NEW: MASTER KEY FOR RESET ---
  const MASTER_KEY = '123456';

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    const settings = await loadSettings();
    setHotelName(settings.hotelName || '');
    setHotelPhone(settings.hotelPhone || '');
    setHotelAddress(settings.hotelAddress || '');
    setGstEnabled(settings.gstEnabled || false);
    setGstPercentage(settings.gstPercentage ? String(settings.gstPercentage) : '5');
    
    // Security Load
    const hasPin = settings.pinEnabled || false;
    setPinEnabled(hasPin);
    setAdminPin(settings.adminPin || '1234');
    
    // If PIN is enabled, Lock the screen immediately
    if (hasPin) {
      setIsLocked(true);
    }
    
    setLoading(false);
  };

  // --- PIN LOGIC ---
  const handleUnlock = () => {
    if (unlockInput === adminPin) {
      setIsLocked(false);
      setUnlockInput('');
    } else {
      Alert.alert(t('accessDenied'), t('incorrectPIN'));
      setUnlockInput('');
    }
  };

  // --- FORGOT PIN HANDLER (UPDATED) ---
  const handleForgotPin = async () => {
    if (unlockInput === MASTER_KEY) {
      // 1. Reset logic
      const currentSettings = await loadSettings();
      const newSettings = {
        ...currentSettings,
        pinEnabled: false, // Disable PIN
        adminPin: '1234'   // Reset to default
      };
      
      // 2. Save and Update State
      await saveSettings(newSettings);
      setPinEnabled(false);
      setAdminPin('1234');
      setIsLocked(false); // Unlock screen
      setUnlockInput('');
      
      Alert.alert(t('success'), t('pinResetSuccess'));
    } else {
      // 3. Show Instructions (Description Removed for Security)
      // Now it just says "Enter Master Key" without revealing it is 123456
      Alert.alert(t('forgotPin'), "Enter Master Key to reset.");
    }
  };

  const handleSave = async () => {
    if (!hotelName || !hotelPhone) {
      Alert.alert(t('error'), "Hotel Name and Phone Number are required.");
      return;
    }

    const newSettings = {
      hotelName,
      hotelPhone,
      hotelAddress,
      gstEnabled,
      gstPercentage: parseFloat(gstPercentage) || 0,
      pinEnabled,
      adminPin
    };

    const success = await saveSettings(newSettings);
    if (success) {
      Alert.alert(t('success'), t('savedSuccess'), [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
    } else {
      Alert.alert(t('error'), "Failed to save settings.");
    }
  };

  // --- DATA MANAGEMENT FUNCTIONS ---
  const handleCloudBackup = async () => {
    try {
      const backupData = await createBackupObject();
      const fileName = `Grace_POS_Backup_${new Date().getTime()}.json`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const jsonString = JSON.stringify(backupData);
      
      await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: 'utf8' });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: t('backupDrive'),
          UTI: 'public.json'
        });
        await updateLastBackupTimestamp();
      } else {
        Alert.alert(t('error'), "Sharing is not supported.");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Backup Failed", error.message);
    }
  };

  const handleImportBackup = async () => {
    try {
      Alert.alert(t('restoreConfirmTitle'), t('restoreConfirmMessage'), [
          { text: t('cancel'), style: "cancel" },
          { text: "Pick File", onPress: async () => {
              const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json', 
                copyToCacheDirectory: true
              });

              if (result.canceled) return;

              const fileUri = result.assets ? result.assets[0].uri : result.uri;
              const fileContent = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
              
              try {
                const parsedData = JSON.parse(fileContent);
                const success = await restoreFullBackup(parsedData);
                if (success) {
                  Alert.alert(t('success'), "Data restored! Please restart the app for best results.");
                } else {
                  Alert.alert(t('error'), "Failed to restore data.");
                }
              } catch (parseError) {
                Alert.alert(t('error'), "Corrupted backup file.");
              }
          }}
        ]
      );
    } catch (err) {
      Alert.alert(t('error'), "Could not pick file.");
    }
  };

  // Styles helpers
  const labelStyle = [styles.label, { color: theme.textSecondary }];
  const inputStyle = [styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }];
  const cardStyle = [styles.card, { backgroundColor: theme.card }];

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  // --- LOCKED VIEW ---
  if (isLocked) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 50, marginBottom: 20 }}>🔒</Text>
        <Text style={[styles.header, { color: theme.text }]}>{t('adminLocked')}</Text>
        <TextInput 
          style={[inputStyle, { width: 200, textAlign: 'center', letterSpacing: 5, fontSize: 24 }]} 
          value={unlockInput} 
          onChangeText={setUnlockInput} 
          keyboardType="numeric"
          secureTextEntry
          maxLength={6}
          placeholder="PIN"
          placeholderTextColor={theme.textSecondary}
        />
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary, width: 200 }]} onPress={handleUnlock}>
          <Text style={styles.saveBtnText}>{t('unlock')}</Text>
        </TouchableOpacity>

        {/* NEW: FORGOT PIN BUTTON */}
        <TouchableOpacity style={{ marginTop: 20 }} onPress={handleForgotPin}>
          <Text style={{ color: theme.textSecondary, textDecorationLine: 'underline' }}>
            {t('forgotPin')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- SETTINGS VIEW ---
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* SECTION 0: LANGUAGE SWITCHER */}
      <View style={cardStyle}>
        <Text style={[styles.header, { color: theme.primary }]}>{t('language')}</Text>
        <View style={styles.row}>
          <View>
            <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>
              {language === 'en' ? 'English' : 'മലയാളം'}
            </Text>
            <Text style={{color: theme.textSecondary, fontSize: 12}}>
              {language === 'en' ? 'Switch to Malayalam' : 'സ്വിച്ച് ടു ഇംഗ്ലീഷ്'}
            </Text>
          </View>
          <Switch 
            value={language === 'ml'} 
            onValueChange={toggleLanguage} 
            trackColor={{ false: "#767577", true: theme.primary }} 
            thumbColor={language === 'ml' ? "#fff" : "#f4f3f4"} 
          />
        </View>
      </View>

      {/* SECTION 1: Restaurant Details */}
      <View style={cardStyle}>
        <Text style={[styles.header, { color: theme.primary }]}>{t('restaurantDetails')}</Text>
        
        <Text style={labelStyle}>{t('restaurantNameLabel')}</Text>
        <TextInput style={inputStyle} value={hotelName} onChangeText={setHotelName} placeholder="Hotel Name" placeholderTextColor={theme.textSecondary} />

        <Text style={labelStyle}>{t('phoneLabel')}</Text>
        <TextInput style={inputStyle} value={hotelPhone} onChangeText={setHotelPhone} keyboardType="phone-pad" placeholder="Phone" placeholderTextColor={theme.textSecondary} />

        <Text style={labelStyle}>{t('addressLabel')}</Text>
        <TextInput style={[inputStyle, { height: 60 }]} value={hotelAddress} onChangeText={setHotelAddress} multiline placeholder="Address" placeholderTextColor={theme.textSecondary} />
      </View>

      {/* SECTION 2: Billing */}
      <View style={cardStyle}>
        <Text style={[styles.header, { color: theme.primary }]}>{t('billing')}</Text>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>{t('enableGST')}</Text>
          <Switch value={gstEnabled} onValueChange={setGstEnabled} trackColor={{ false: "#767577", true: theme.primary }} thumbColor={gstEnabled ? "#fff" : "#f4f3f4"} />
        </View>
        {gstEnabled && (
          <View style={{ marginTop: 15 }}>
            <Text style={labelStyle}>{t('gstPercentageLabel')}</Text>
            <TextInput style={inputStyle} value={gstPercentage} onChangeText={setGstPercentage} keyboardType="numeric" placeholder="5" placeholderTextColor={theme.textSecondary} />
          </View>
        )}
      </View>

      {/* SECTION 3: Security */}
      <View style={cardStyle}>
        <Text style={[styles.header, { color: theme.primary }]}>{t('security')}</Text>
        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>{t('enablePIN')}</Text>
          <Switch value={pinEnabled} onValueChange={setPinEnabled} trackColor={{ false: "#767577", true: theme.primary }} thumbColor={pinEnabled ? "#fff" : "#f4f3f4"} />
        </View>
        {pinEnabled && (
          <View style={{ marginTop: 15 }}>
            <Text style={labelStyle}>{t('changePIN')}</Text>
            <TextInput style={inputStyle} value={adminPin} onChangeText={setAdminPin} keyboardType="numeric" maxLength={6} placeholder="Enter PIN" placeholderTextColor={theme.textSecondary} />
            <Text style={{color: 'orange', fontSize: 12}}>{t('rememberPIN')}</Text>
          </View>
        )}
      </View>

      {/* SECTION 4: Data Management */}
      <View style={cardStyle}>
        <Text style={[styles.header, { color: theme.primary }]}>{t('dataManagement')}</Text>
        <Text style={[styles.label, { color: theme.textSecondary, marginBottom: 15 }]}>
          {t('backupDesc')}
        </Text>

        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
          <TouchableOpacity style={[styles.cloudBtn, { backgroundColor: '#4285F4', flex: 1 }]} onPress={handleCloudBackup}>
            <Text style={styles.cloudBtnText}>{t('backupBtn')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cloudBtn, { backgroundColor: '#34A853', flex: 1 }]} onPress={handleImportBackup}>
            <Text style={styles.cloudBtnText}>{t('importBtn')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.cloudBtn, { backgroundColor: '#FF7043' }]} 
          onPress={() => {
            Alert.alert(t('resetBtn'), t('restoreConfirmMessage'), [
              { text: t('cancel'), style: "cancel" },
              { text: "Reset Everything", style: "destructive", onPress: async () => { await restoreAllData(); Alert.alert("Done", "App reset to default."); } },
            ]);
          }}
        >
          <Text style={styles.cloudBtnText}>{t('resetBtn')}</Text>
        </TouchableOpacity>
      </View>

      {/* Save Button */}
      <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSave}>
        <Text style={styles.saveBtnText}>{t('saveSettings')}</Text>
      </TouchableOpacity>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  card: { padding: 20, borderRadius: 15, marginBottom: 20, elevation: 2 },
  header: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: { padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  cloudBtn: { padding: 15, borderRadius: 10, alignItems: 'center' },
  cloudBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});