/**
 * Currency formatter (₹)
 */
export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  }).format(num);
}

/**
 * Format date to readable string
 */
export function formatDate(dateInput) {
  if (!dateInput) return "N/A";
  let date;
  if (dateInput?.toDate) {
    date = dateInput.toDate();
  } else if (typeof dateInput === "string" || typeof dateInput === "number") {
    date = new Date(dateInput);
  } else if (dateInput instanceof Date) {
    date = dateInput;
  } else {
    return "N/A";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).format(date);
}

/**
 * Calculate Indian Financial Year String: e.g. "26-27" for FY 2026-2027 (April 1 to March 31)
 */
export function getFinancialYearString(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth(); // 0 is January, 3 is April
  const fullYear = d.getFullYear();
  const startYear = month >= 3 ? fullYear : fullYear - 1;
  const endYear = startYear + 1;
  const startYY = String(startYear).slice(-2);
  const endYY = String(endYear).slice(-2);
  return `${startYY}-${endYY}`;
}

/**
 * Generate sequential invoice number based on Financial Year
 * Format: SBD/26-27/0001
 * After April 01, 2027: SBD/27-28/0001
 */
export function generateInvoiceNumber(prefix = "SBD", existingOrders = [], date = new Date()) {
  const fy = getFinancialYearString(date);
  // Match prefix and current financial year: e.g. SBD/26-27/0001
  const pattern = new RegExp(`^${prefix}[/-]${fy}[/-](\\d+)`, "i");

  let maxSeq = 0;
  if (Array.isArray(existingOrders) && existingOrders.length > 0) {
    for (const ord of existingOrders) {
      const invNum = ord?.invoiceNumber;
      if (invNum) {
        const match = String(invNum).trim().match(pattern);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const paddedSeq = String(nextSeq).padStart(4, "0");
  return `${prefix}/${fy}/${paddedSeq}`;
}

/**
 * Format phone number to clean 10 digit or international
 */
export function cleanPhoneNumber(phone) {
  if (!phone) return "";
  return phone.replace(/[^0-9]/g, "");
}

/**
 * Generate a WhatsApp bill message and link for instant sharing
 */
export function generateWhatsAppBillLink(phone, order, businessInfo) {
  const cleanPhone = cleanPhoneNumber(phone);
  const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  let message = `*${businessInfo.name}* (${businessInfo.tamilName || ""})\n`;
  message += `${businessInfo.tagline}\n`;
  message += `📞 ${businessInfo.phonePrimary}\n`;
  message += `--------------------------------\n`;
  message += `🧾 *INVOICE: ${order.invoiceNumber || "BILL"}*\n`;
  message += `📅 Date: ${new Date().toLocaleDateString("en-IN")}\n`;
  message += `🏪 *Shop:* ${order.customer?.shopName || "Retailer"}\n`;
  message += `👤 Contact: ${order.customer?.customerName || "-"}\n`;
  message += `📱 Phone: ${order.customer?.phone || "-"}\n`;
  message += `--------------------------------\n`;
  message += `*ITEMS PURCHASED:*\n`;

  (order.items || []).forEach((item, idx) => {
    const itemTotal = (item.wholesalePrice || item.price) * item.quantity;
    message += `${idx + 1}. ${item.name} (${item.unit || "unit"})\n`;
    message += `   Qty: ${item.quantity} × ₹${item.wholesalePrice || item.price} = *₹${itemTotal}*\n`;
  });

  message += `--------------------------------\n`;
  message += `Subtotal: ₹${order.subtotal || 0}\n`;
  if (order.discount > 0) {
    message += `Discount: -₹${order.discount}\n`;
  }
  if (order.tax > 0) {
    message += `Tax/GST: +₹${order.tax}\n`;
  }
  message += `*GRAND TOTAL: ₹${order.grandTotal || 0}*\n`;
  message += `Payment Status: *${(order.paymentStatus || "PAID").toUpperCase()}* (${order.paymentMode || "Cash"})\n`;
  message += `--------------------------------\n`;
  message += `🙏 *Thank you for your business!*`;

  const encoded = encodeURIComponent(message);
  return `https://wa.me/${targetPhone}?text=${encoded}`;
}
