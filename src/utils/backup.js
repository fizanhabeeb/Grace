// src/utils/backup.js
// Backup & restore all data (menu, orders, expenses, settings)

import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';
import { createBackupObject, restoreFromBackupObject } from './storage';

export async function backupAllData() {
  try {
    const backup = await createBackupObject();
    const json = JSON.stringify(backup, null, 2);
    const datePart = new Date().toISOString().split('T')[0]; // yyyy-mm-dd
    const fileName = `hotel_grace_backup_${datePart}.json`;
    const fileUri = FileSystem.cacheDirectory + fileName;

    await FileSystem.writeAsStringAsync(fileUri, json);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Backup Hotel Grace Data',
      });
    } else {
      Alert.alert(
        'Backup created',
        `Backup file created at:\n${fileUri}\n\nYou can copy it manually from this path.`
      );
    }
  } catch (error) {
    console.log('Backup error:', error);
    Alert.alert('Backup error', error?.message || String(error));
  }
}

export async function restoreAllData() {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || result.type === 'cancel') {
      return;
    }

    const asset = result.assets?.[0] || result;
    const uri = asset.uri;
    if (!uri) {
      Alert.alert('Error', 'No file selected');
      return;
    }

    const json = await FileSystem.readAsStringAsync(uri);
    const backup = JSON.parse(json);

    await restoreFromBackupObject(backup);

    Alert.alert('Success', 'Data restored from backup.');
  } catch (error) {
    console.log('Restore error:', error);
    Alert.alert('Restore error', error?.message || String(error));
  }
}