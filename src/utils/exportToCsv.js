// src/utils/exportToCsv.js
// Create a CSV file from sales data and share/save it.

// NOTE: using the legacy API so writeAsStringAsync works on SDK 54+
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// Convert orders to CSV string
function ordersToCsv({ period, orders }) {
  const header = [
    'Period',
    'Bill No',
    'Date',
    'Time',
    'Table',
    'Customer',
    'Subtotal',
    'GST',
    'Grand Total'
  ];

  const rows = [header];

  orders.forEach((order) => {
    rows.push([
      period,
      order.billNumber || '',
      order.date || '',
      order.time || '',
      order.tableNumber || '',
      order.customerName || '',
      (order.subtotal || 0).toFixed(2),
      (order.gst || 0).toFixed(2),
      (order.grandTotal || 0).toFixed(2),
    ]);
  });

  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = cell != null ? String(cell) : '';
          // Escape quotes/commas/newlines for CSV
          if (value.includes(',') || value.includes('"') || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(',')
    )
    .join('\n');
}

export async function exportSalesToLocalCsv({ period, orders }) {
  try {
    if (!orders || orders.length === 0) {
      Alert.alert('No data', 'No orders to export for this period.');
      return;
    }

    const csvString = ordersToCsv({ period, orders });

    const datePart = new Date().toISOString().split('T')[0]; // e.g. 2025-01-10
    const fileName = `hotel_grace_sales_${period}_${datePart}.csv`;
    const fileUri = FileSystem.cacheDirectory + fileName;

    // Write file (legacy API, but safe)
    await FileSystem.writeAsStringAsync(fileUri, csvString);

    const canShare = await Sharing.isAvailableAsync();
    if (!canShare) {
      Alert.alert(
        'Export created',
        `CSV file created at:\n${fileUri}\n\nSharing is not available on this device.`
      );
      return;
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/csv',
      dialogTitle: 'Export sales as CSV',
    });
  } catch (error) {
    console.log('CSV export error:', error);
    Alert.alert(
      'Error',
      'Could not export CSV file:\n' + (error?.message || String(error))
    );
  }
}