// src/utils/billGenerator.js

export const generateBillText = (orderId, dateString, items, totalAmount) => {
  // 1. Format Date (using standard JS Date)
  const dateObj = new Date(); // Or parse dateString if needed
  const formattedDate = dateObj.toLocaleDateString('en-IN') + ' ' + dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  let bill = "";

  // 2. Header
  // Note: These special characters like [C] or [L] are often used by printer apps (like RawBT) 
  // to align text. Pure text works too.
  bill += "      🧾 HOTEL GRACE 🧾\n"; // Centered manually with spaces
  bill += "     Mananthavady, Wayanad\n";
  bill += "--------------------------------\n";
  bill += `Date: ${formattedDate}\n`;
  bill += `Bill No: #${orderId}\n`;
  bill += "--------------------------------\n";

  // 3. Column Headers
  bill += "Item           Qty    Price\n";
  bill += "--------------------------------\n";

  // 4. Items Loop
  items.forEach((item) => {
    let name = item.name;
    const qty = item.quantity; // specific to your app's data structure
    const price = item.price;
    const total = qty * price;

    // Truncate long names (Dart logic converted)
    if (name.length > 12) {
      name = name.substring(0, 10) + "..";
    }

    // Padding for alignment
    // JS uses .padEnd() instead of .padRight()
    const namePad = name.padEnd(14, ' '); 
    const qtyPad = `x${qty}`.padEnd(7, ' ');
    
    bill += `${namePad}${qtyPad}${total.toFixed(2)}\n`;
  });

  // 5. Totals and Footer
  bill += "--------------------------------\n";
  bill += `GRAND TOTAL:       ₹${totalAmount.toFixed(2)}\n`;
  bill += "--------------------------------\n";
  bill += "  Thank you for dining with us!\n";
  bill += "         Visit Again.\n\n\n"; // Extra newlines for paper cut

  return bill;
};