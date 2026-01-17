// src/screens/SettingsScreen.js
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { 
  loadSettings, 
  saveSettings, 
  updateSetting, 
  createBackupObject, 
  restoreFullBackup 
} from '../utils/storage';
// Import the reset function from backup utils if available, 
// otherwise we can implement a simple clear logic here.
import AsyncStorage from '@react-native-async-storage/async-storage'; 

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

export default function SettingsScreen() {
  const { t, language, toggleLanguage } = useLanguage(); // Added language & toggle
  const { theme } = useTheme();
  
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState({
    hotelName: '',
    hotelPhone: '',
    hotelAddress: '',
    gstEnabled: false,
    gstPercentage: 5,
    pinEnabled: false,
    adminPin: '1234'
  });

  // PIN Logic
  const [isLocked, setIsLocked] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // 1. LOAD SETTINGS
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setIsLoading(true);
    try {
      const savedSettings = await loadSettings();
      if (savedSettings) {
        setSettings(savedSettings);
        if (savedSettings.pinEnabled) {
             setIsLocked(true);
        }
      }
    } catch (e) {
      console.error("Error loading settings", e);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. SAVE INDIVIDUAL SETTING IMMEDIATELY (The GST Fix)
  const handleToggleGST = async (value) => {
    setSettings(prev => ({ ...prev, gstEnabled: value }));
    await updateSetting('gstEnabled', value);
  };

  const handleSaveAll = async () => {
    await saveSettings(settings);
    Alert.alert(t('success') || 'Success', t('savedSuccess') || 'Settings saved successfully!');
  };

  // 3. UNLOCK LOGIC (Includes Master Key 123456)
  const handleUnlock = () => {
    if (pinInput === settings.adminPin || pinInput === '123456') {
        setIsLocked(false);
        setPinInput('');
    } else {
        Alert.alert(t('accessDenied'), t('incorrectPIN'));
    }
  };

  const handleForgotPin = async () => {
      Alert.alert(
          t('forgotPin'), 
          t('masterKeyInfo') || "Enter Master Key (123456) in the box above to unlock."
      );
  };

  // 4. BACKUP / RESTORE / RESET
  const handleBackup = async () => {
    try {
      const backupData = await createBackupObject();
      const fileUri = FileSystem.documentDirectory + 'hotel_grace_backup.json';
      await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData));
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      Alert.alert("Backup Failed", error.message);
    }
  };

  const handleRestore = async () => {
    try {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
        if (result.canceled) return;

        const fileUri = result.assets[0].uri;
        const fileContent = await FileSystem.readAsStringAsync(fileUri);
        const backupData = JSON.parse(fileContent);

        Alert.alert(
            t('restoreConfirmTitle'),
            t('restoreConfirmMessage'),
            [
                { text: t('cancel'), style: 'cancel' },
                { 
                    text: t('restoreDataLabel'), 
                    onPress: async () => {
                        const success = await restoreFullBackup(backupData);
                        if (success) {
                            Alert.alert("Success", "Data restored successfully. Please restart app.");
                            loadData();
                        } else {
                            Alert.alert("Error", "Failed to restore data.");
                        }
                    }
                }
            ]
        );
    } catch (error) {
        Alert.alert("Restore Failed", "Invalid backup file.");
    }
  };

  const handleFactoryReset = () => {
      Alert.alert(
          t('resetBtn'), 
          t('restoreConfirmMessage'), 
          [
            { text: t('cancel'), style: "cancel" },
            { 
                text: "Reset Everything", 
                style: "destructive", 
                onPress: async () => { 
                    try {
                        await AsyncStorage.clear(); 
                        Alert.alert("Done", "App reset to default. Please restart the app."); 
                    } catch(e) {
                        Alert.alert("Error", "Failed to reset.");
                    }
                } 
            },
          ]
      );
  };

  if (isLoading) {
      return (
          <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
              <ActivityIndicator size="large" color={theme.primary} />
          </View>
      );
  }

  // --- PIN LOCK SCREEN ---
  if (isLocked) {
      return (
          <View style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text, marginBottom: 20 }}>{t('adminLocked')}</Text>
              <TextInput 
                  style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, width: 200, textAlign: 'center', fontSize: 24, letterSpacing: 5 }]}
                  placeholder="PIN"
                  placeholderTextColor={theme.textSecondary}
                  value={pinInput}
                  onChangeText={setPinInput}
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={6}
              />
              <TouchableOpacity style={[styles.btn, { backgroundColor: theme.primary, marginTop: 20, width: 200 }]} onPress={handleUnlock}>
                  <Text style={styles.btnText}>{t('unlock')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleForgotPin}>
                  <Text style={{ color: theme.primary, marginTop: 20 }}>{t('forgotPin')}</Text>
              </TouchableOpacity>
          </View>
      );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        
        {/* --- LANGUAGE SWITCHER (Added Back) --- */}
        <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.primary }]}>{t('language')}</Text>
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

        {/* Restaurant Details */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: theme.primary }]}>{t('restaurantDetails')}</Text>
          
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('restaurantNameLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
            value={settings.hotelName}
            onChangeText={(text) => setSettings({...settings, hotelName: text})}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('phoneLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
            value={settings.hotelPhone}
            onChangeText={(text) => setSettings({...settings, hotelPhone: text})}
            keyboardType="phone-pad"
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>{t('addressLabel')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
            value={settings.hotelAddress}
            onChangeText={(text) => setSettings({...settings, hotelAddress: text})}
            multiline
          />
        </View>

        {/* Billing Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: theme.primary }]}>{t('billing')}</Text>
          
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>{t('enableGST')}</Text>
            <Switch
              trackColor={{ false: "#767577", true: theme.primary }}
              thumbColor={settings.gstEnabled ? "#fff" : "#f4f3f4"}
              value={settings.gstEnabled}
              onValueChange={handleToggleGST}
            />
          </View>

          {settings.gstEnabled && (
            <>
              <Text style={[styles.label, { color: theme.textSecondary }]}>{t('gstPercentageLabel')}</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                value={String(settings.gstPercentage)}
                onChangeText={(text) => setSettings({...settings, gstPercentage: Number(text)})}
                keyboardType="numeric"
              />
            </>
          )}
        </View>

        {/* Security Settings */}
        <View style={styles.section}>
            <Text style={[styles.sectionHeader, { color: theme.primary }]}>{t('security')}</Text>
            
            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.text, marginBottom: 0 }]}>{t('enablePIN')}</Text>
                <Switch
                    trackColor={{ false: "#767577", true: theme.primary }}
                    thumbColor={settings.pinEnabled ? "#fff" : "#f4f3f4"}
                    value={settings.pinEnabled}
                    onValueChange={(val) => setSettings({...settings, pinEnabled: val})}
                />
            </View>

            {settings.pinEnabled && (
                <>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>{t('changePIN')}</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.text, borderColor: theme.border }]}
                        value={settings.adminPin}
                        onChangeText={(text) => setSettings({...settings, adminPin: text})}
                        keyboardType="numeric"
                        maxLength={4}
                    />
                    <Text style={{ fontSize: 12, color: '#ff4444', marginTop: 5 }}>{t('rememberPIN')}</Text>
                </>
            )}
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, { color: theme.primary }]}>{t('dataManagement')}</Text>
          <Text style={{ color: theme.textSecondary, marginBottom: 15, fontSize: 13 }}>{t('backupDesc')}</Text>
          
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
            <TouchableOpacity style={[styles.btn, { backgroundColor: '#4CAF50', flex: 1 }]} onPress={handleBackup}>
                <Text style={styles.btnText}>{t('backupBtn')}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, { backgroundColor: '#FF9800', flex: 1 }]} onPress={handleRestore}>
                <Text style={styles.btnText}>{t('importBtn')}</Text>
            </TouchableOpacity>
          </View>

          {/* --- FACTORY RESET BUTTON (Added Back) --- */}
          <TouchableOpacity 
            style={[styles.btn, { backgroundColor: '#FF5252' }]} 
            onPress={handleFactoryReset}
          >
            <Text style={styles.btnText}>{t('resetBtn')}</Text>
          </TouchableOpacity>
        </View>

        {/* Save Button (For text fields) */}
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: theme.primary }]} onPress={handleSaveAll}>
          <Text style={styles.saveBtnText}>{t('saveSettings')}</Text>
        </TouchableOpacity>

        <View style={{ height: 50 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  section: { marginBottom: 25, borderBottomWidth: 1, borderColor: '#eee', paddingBottom: 20 },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  label: { fontSize: 14, marginBottom: 8, fontWeight: '500' },
  input: { height: 45, borderWidth: 1, borderRadius: 8, paddingHorizontal: 15, marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  btn: { padding: 12, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
  saveBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 20 },
  saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});