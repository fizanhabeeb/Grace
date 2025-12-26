// bill_helper.dart

import 'package:intl/intl.dart'; // Ensure you have this for date formatting

class BillHelper {
  static String generateBillText({
    required String orderId,
    required DateTime date,
    required List<Map<String, dynamic>> items, // Or your specific Item model
    required double totalAmount,
  }) {
    final dateFormat = DateFormat('dd-MM-yyyy hh:mm a');
    final String formattedDate = dateFormat.format(date);
    
    // 1. Header
    String bill = "";
    bill += "🧾 *HOTEL GRACE* 🧾\n"; // Bold title
    bill += "Mananthavady, Wayanad\n";
    bill += "--------------------------------\n";
    bill += "Date: $formattedDate\n";
    bill += "Bill No: #$orderId\n";
    bill += "--------------------------------\n";
    
    // 2. Column Headers
    // Using simple tabs or spacing for alignment
    bill += "Item          Qty    Price\n"; 
    bill += "--------------------------------\n";

    // 3. Items Loop
    for (var item in items) {
      String name = item['name'];
      int qty = item['qty'];
      double price = item['price'];
      double total = qty * price;

      // Truncate long names to keep alignment neat
      if (name.length > 12) {
        name = name.substring(0, 10) + "..";
      }

      // Pad the strings to ensure columns align roughly
      // name: 14 chars, qty: 5 chars, total: remaining
      String namePad = name.padRight(14); 
      String qtyPad = "x$qty".padRight(7);
      
      bill += "$namePad$qtyPad${total.toStringAsFixed(2)}\n";
    }

    // 4. Totals and Footer
    bill += "--------------------------------\n";
    bill += "*GRAND TOTAL: ₹${totalAmount.toStringAsFixed(2)}*\n";
    bill += "--------------------------------\n";
    bill += "Thank you for dining with us!\n";
    bill += "Visit Again.\n";
    
    return bill;
  }
}