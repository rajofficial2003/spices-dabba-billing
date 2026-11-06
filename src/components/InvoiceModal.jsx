import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { usePOS } from "../context/POSContext";
import { 
  Printer, 
  Share2, 
  X, 
  Store, 
  Phone, 
  MapPin, 
  FileText,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Loader2
} from "lucide-react";
import { formatCurrency, formatDate, formatDateOnly, cleanPhoneNumber } from "../utils/formatters";

// Number to Indian Words converter
function numberToWords(num) {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (Number(n[1]) !== 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
  str += (Number(n[2]) !== 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
  str += (Number(n[3]) !== 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
  str += (Number(n[4]) !== 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
  str += (Number(n[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
  return str.trim() ? `${str.trim()} Rupees Only` : 'Zero Rupees';
}

// Helper to format customer billing / shipping address
function formatAddress(addr) {
  if (!addr) return "";
  if (typeof addr === "string") return addr.trim();
  const parts = [
    addr.address?.trim(),
    addr.city?.trim(),
    addr.state?.trim(),
    addr.pincode?.trim() ? (addr.pincode.trim().startsWith("-") ? addr.pincode.trim() : `- ${addr.pincode.trim()}`) : ""
  ].filter(Boolean);
  return parts.join(", ");
}

export default function InvoiceModal({ order, onClose }) {
  const { BUSINESS_INFO, courierPartners = [] } = usePOS();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  useEffect(() => {
    // Generate UPI QR Code dynamically based on upiId & accountName
    const rawUpi = (BUSINESS_INFO?.upiId || "9940159298").replace(/\s*\(.*?\)/g, "").trim();
    const upiPa = rawUpi.includes("@") ? rawUpi : `${rawUpi}@upi`;
    const upiPn = encodeURIComponent(BUSINESS_INFO?.accountName || BUSINESS_INFO?.name || "SPICES DABBA");
    const upiPayload = `upi://pay?pa=${upiPa}&pn=${upiPn}&cu=INR`;
    QRCode.toDataURL(upiPayload, {
      width: 160,
      margin: 1,
      color: {
        dark: "#09090b",
        light: "#FFFFFF"
      }
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.warn("QR code generation error:", err));
  }, [BUSINESS_INFO?.upiId, BUSINESS_INFO?.accountName, BUSINESS_INFO?.name]);

  if (!order) return null;

  const executePrintOrPdf = (isPdf = false) => {
    const invoiceEl = document.getElementById("invoice-print-area");
    if (!invoiceEl) return;

    setIsGeneratingPdf(true);

    const cleanInvoiceNum = (order.invoiceNumber || "Bill").replace(/[^a-zA-Z0-9_-]/g, "_");
    const docTitle = `${cleanInvoiceNum}_Tax_Invoice`;
    const originalTitle = document.title;
    document.title = docTitle;

    const printIframe = document.createElement("iframe");
    printIframe.style.position = "fixed";
    printIframe.style.right = "0";
    printIframe.style.bottom = "0";
    printIframe.style.width = "0";
    printIframe.style.height = "0";
    printIframe.style.border = "0";
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #09090b;
              margin: 0;
              padding: 0;
              background: #FFFFFF;
              font-size: 13px;
              line-height: 1.35;
            }
            #invoice-print-area {
              width: 100% !important;
              max-width: 790px !important;
              margin: 0 auto !important;
              padding: 4px 6px !important;
              min-width: 0 !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
              page-break-inside: auto;
            }
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            a {
              color: inherit !important;
              text-decoration: underline !important;
            }
            .font-heading {
              font-family: inherit !important;
              font-weight: 900 !important;
            }
            .font-tamil {
              font-family: inherit !important;
            }
          </style>
        </head>
        <body>
          <div id="invoice-print-area">
            ${invoiceEl.innerHTML}
          </div>
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow.focus();
      printIframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
        document.title = originalTitle;
        setIsGeneratingPdf(false);
      }, 1500);
    }, 350);
  };

  const handlePrint = () => {
    executePrintOrPdf(false);
  };

  const handleDownloadPDF = () => {
    executePrintOrPdf(true);
  };

  // Calculate dynamic GST breakdown strictly from items so row GST values always sum accurately
  const totalTableGst = Math.round(
    (order.items || []).reduce((sum, item) => {
      if (item.isSample) return sum;
      const rate = Number(item.wholesalePrice) || Number(item.price) || 0;
      const gstPercent = item.isSample ? 0 : (item.gstPercent !== undefined ? Number(item.gstPercent) : 5);
      const unitInclusive = item.isSample
        ? 0
        : (item.inclusivePrice !== undefined
            ? Number(item.inclusivePrice)
            : Math.round(rate * (1 + gstPercent / 100) * 100) / 100);
      const rowTotal = Math.round(unitInclusive * (item.quantity || 1) * 100) / 100;
      const baseTotal = Math.round(rate * (item.quantity || 1) * 100) / 100;
      const itemGstAmount = item.isSample ? 0 : Math.round((rowTotal - baseTotal) * 100) / 100;
      return sum + itemGstAmount;
    }, 0) * 100
  ) / 100;

  const calculatedTax = totalTableGst > 0 ? totalTableGst : (Number(order.tax) || 0);

  const taxPct = Number(order.taxPercent) > 0 
    ? Number(order.taxPercent) 
    : (order.taxableSubtotal > 0 ? Math.round((calculatedTax / order.taxableSubtotal) * 100) : (order.subtotal > 0 ? Math.round((calculatedTax / order.subtotal) * 100) : 5));

  const halfTax = calculatedTax / 2;
  const shippingCharges = Number(order.shippingCharges ?? order.shippingCharge ?? order.shippingDetails?.shippingCharges ?? 0);
  const baseSubtotal = Number(order.subtotal || 0);
  const baseDiscount = Number(order.discount || 0);
  const finalGrandTotal = baseSubtotal > 0
    ? Math.round((baseSubtotal - baseDiscount + shippingCharges) * 100) / 100
    : (Number(order.grandTotal) > 0 ? Number(order.grandTotal) : 0);

  const taxableSubtotalVal = order.taxableSubtotal !== undefined
    ? Number(order.taxableSubtotal)
    : (order.taxableAmount !== undefined
        ? Number(order.taxableAmount)
        : (finalGrandTotal > calculatedTax ? finalGrandTotal - calculatedTax : Number(order.subtotal || 0)));

  // Address resolution for Billing and Shipping
  const customer = order.customer || {};
  const billingAddr = formatAddress(order.billingAddress || customer.billingAddress) || (typeof customer.address === "string" ? customer.address : "") || "";
  const shippingAddr = formatAddress(order.shippingAddress || customer.shippingAddress);
  const isSameAddress = customer.sameAsBilling !== false && (!shippingAddr || shippingAddr === billingAddr);
  const finalShippingAddr = (isSameAddress || !shippingAddr) ? (billingAddr || shippingAddr) : shippingAddr;

  const courierName = (order.courierCompany || order.shippingDetails?.courierCompany || "").trim();
  const trackingNum = (order.trackingId || order.shippingDetails?.trackingId || "").trim();

  // Resolve tracking URL for Courier
  const getTrackingUrl = () => {
    if (!courierName && !trackingNum) return "";

    let url = (order.trackingUrl || order.shippingDetails?.trackingUrl || "").trim();

    if (!url && courierName) {
      const matched = (courierPartners || []).find(c =>
        c.name?.trim().toLowerCase() === courierName.toLowerCase() ||
        c.code?.trim().toLowerCase() === courierName.toLowerCase()
      );
      if (matched?.trackingUrl) {
        url = matched.trackingUrl.trim();
      }
    }

    if (!url && courierName) {
      const lower = courierName.toLowerCase();
      if (lower.includes("professional") || lower.includes("tpc")) url = "https://www.tpcindia.com";
      else if (lower.includes("st courier") || lower.includes("stc")) url = "https://stcourier.com/track";
      else if (lower.includes("dtdc")) url = "https://www.dtdc.in/tracking.asp";
      else if (lower.includes("india post") || lower.includes("speed post")) url = "https://www.indiapost.gov.in";
      else if (lower.includes("blue dart") || lower.includes("bluedart")) url = "https://www.bluedart.com/tracking";
      else if (lower.includes("trackon")) url = "https://trackon.in";
      else if (lower.includes("delhivery")) url = "https://www.delhivery.com/tracking";
      else if (lower.includes("ecom express")) url = "https://ecomexpress.in/tracking/";
      else if (lower.includes("xpressbees")) url = "https://www.xpressbees.com/track";
    }

    if (!url) {
      return `https://www.google.com/search?q=${encodeURIComponent(`${courierName} ${trackingNum} tracking`.trim())}`;
    }

    if (trackingNum) {
      if (url.includes("{trackingId}")) {
        url = url.replace("{trackingId}", encodeURIComponent(trackingNum));
      } else if (url.includes("{docket}")) {
        url = url.replace("{docket}", encodeURIComponent(trackingNum));
      } else if (url.includes("stcourier.com/track")) {
        url = `https://stcourier.com/track/tracking_details/${encodeURIComponent(trackingNum)}`;
      } else if (url.includes("trackon.in") && !url.includes("awb=")) {
        url = `https://trackon.in/Tracking?awb=${encodeURIComponent(trackingNum)}`;
      }
    }

    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }

    return url;
  };

  const resolvedTrackingUrl = getTrackingUrl();

  // Build WhatsApp share link including HSN codes & GST breakdown
  const generateWhatsAppA4BillLink = () => {
    if (!order.customer?.phone) return null;
    const cleanPhone = cleanPhoneNumber(order.customer.phone);
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let msg = `*${BUSINESS_INFO?.companyName || BUSINESS_INFO?.manufacturer || "JEES foods"}*\n`;
    if (BUSINESS_INFO?.brandName) msg += `_${BUSINESS_INFO.brandName}_\n`;
    msg += `GSTIN: ${BUSINESS_INFO?.gstin || ""} | ${BUSINESS_INFO?.address || ""}\n`;
    msg += `--------------------------------\n`;
    msg += `🧾 *Invoice Code: ${order.invoiceNumber || "BILL"}*\n`;
    msg += `📅 Invoice Date: ${formatDateOnly(order.timestamp || order.createdAt || Date.now())}\n`;
    msg += `🏪 *Shop:* ${order.customer?.shopName || "Retailer"}\n`;
    msg += `📱 Phone: ${order.customer?.phone || "-"}\n`;

    if (courierName || trackingNum) {
      msg += `🚚 Dispatch: ${courierName || "Courier"}${trackingNum ? ` [Docket: ${trackingNum}]` : ""}\n`;
      if (resolvedTrackingUrl) {
        msg += `🔗 Tracking URL: ${resolvedTrackingUrl}\n`;
      }
    }

    msg += `--------------------------------\n`;
    msg += `*ITEMIZED BREAKDOWN:*\n`;

    (order.items || []).forEach((item, idx) => {
      const rate = Number(item.wholesalePrice) || Number(item.price) || 0;
      const gstPercent = item.isSample ? 0 : (item.gstPercent !== undefined ? Number(item.gstPercent) : 5);
      const unitInclusive = item.isSample
        ? 0
        : (item.inclusivePrice !== undefined
            ? Number(item.inclusivePrice)
            : Math.round(rate * (1 + gstPercent / 100) * 100) / 100);
      const rowTotal = Math.round(unitInclusive * (item.quantity || 1) * 100) / 100;
      const baseTotal = Math.round(rate * (item.quantity || 1) * 100) / 100;
      const itemGstAmount = item.isSample ? 0 : Math.round((rowTotal - baseTotal) * 100) / 100;
      const hsn = item.hsnCode || "0910 91 00";
      const packText = item.unit || item.variantSize || "Pack";

      msg += `${idx + 1}. *${item.name}* [Pack: ${packText}]\n`;
      msg += `   HSN: ${hsn} | Qty: ${item.quantity} | GST: ${gstPercent}% | IGST: ₹${itemGstAmount.toFixed(2)}\n`;
      msg += `   Unit: ₹${rate.toFixed(2)} | Prod Price: ₹${unitInclusive.toFixed(2)} | Total: *₹${rowTotal.toFixed(2)}*\n`;
    });

    msg += `--------------------------------\n`;
    msg += `Subtotal: ₹${Number(order.subtotal || finalGrandTotal).toFixed(2)}\n`;
    msg += `Discount: ${Number(order.discount) > 0 ? `-₹${Number(order.discount).toFixed(2)}` : "₹0.00"}\n`;
    msg += `Shipping Charges: ₹${shippingCharges.toFixed(2)}\n`;
    msg += `*TOTAL PAYABLE: ₹${finalGrandTotal.toFixed(2)}*\n`;
    msg += `Payment Status: *${(order.paymentStatus || "PAID").toUpperCase()}*\n`;
    msg += `--------------------------------\n`;
    msg += `*BANK DETAILS FOR PAYMENT:*\n`;
    msg += `Bank: ${BUSINESS_INFO?.bankName || "Tamilnad Mercantile Bank"}\n`;
    msg += `A/C Name: ${BUSINESS_INFO?.accountName || "SPICES DABBA"}\n`;
    msg += `A/C: ${BUSINESS_INFO?.accountNumber || "180150050800432"}\n`;
    msg += `IFSC: ${BUSINESS_INFO?.ifscCode || "TMBL0000180"}\n`;
    msg += `UPI: ${BUSINESS_INFO?.upiId || "9940159298 (Vaishno Devi)"}\n`;
    msg += `--------------------------------\n`;
    msg += `🙏 Thank you for your business!`;

    return `https://wa.me/${targetPhone}?text=${encodeURIComponent(msg)}`;
  };

  const whatsappLink = generateWhatsAppA4BillLink();

  return (
    <div className="modal-overlay">
      <div 
        className="modal-content" 
        style={{ maxWidth: "850px", width: "96%", maxHeight: "95vh" }}
      >
        {/* Top Control Bar (Hidden during print) */}
        <div className="no-print" style={{
          background: "#09090b",
          color: "#FFFFFF",
          padding: "10px 16px",
          borderTopLeftRadius: "18px",
          borderTopRightRadius: "18px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FileText size={17} color="#FEF2F2" />
            <span className="font-heading" style={{ fontWeight: 800, fontSize: "1rem" }}>
              Invoice Details
            </span>
            <span style={{
              background: order.paymentStatus === "pending" ? "#8B1E1E" : "#18181b",
              color: "#FFFFFF",
              fontSize: "0.68rem",
              fontWeight: 800,
              padding: "2px 6px",
              borderRadius: "4px",
              textTransform: "uppercase"
            }}>
              {order.paymentStatus || "PAID"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="btn-primary"
              style={{ padding: "6px 12px", fontSize: "0.8rem", background: "var(--sd-red)", border: "none" }}
              title="Download PDF invoice directly"
            >
              {isGeneratingPdf ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
              <span>{isGeneratingPdf ? "Generating..." : "Download PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-accent"
              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
            >
              <Printer size={14} />
              <span>Print A4</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{ background: "none", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px" }}
              title="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* PRINTABLE A4 INVOICE CONTAINER (With horizontal scroll for mobile) */}
        <div className="a4-scroll-wrapper" style={{ overflowX: "auto", overflowY: "auto", WebkitOverflowScrolling: "touch", width: "100%", maxHeight: "80vh" }}>
          <div 
            id="invoice-print-area"
            className="a4-invoice-container"
            style={{
              padding: "20px 24px",
              maxWidth: "790px",
              margin: "0 auto",
              background: "#FFFFFF",
              color: "#09090b",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          >
          {/* Header row: Company Details & Invoice Metadata */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #09090b", paddingBottom: "16px", marginBottom: "16px" }}>
            {/* Company Info */}
            <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
              <div style={{
                width: "60px",
                height: "60px",
                border: "1px solid #E4E4E7",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0,
                background: "#FFFFFF"
              }}>
                <img
                  src={BUSINESS_INFO?.logoPath || "/images/logo/logo.png"}
                  alt="Logo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  style={{ width: "95%", height: "95%", objectFit: "contain" }}
                />
              </div>

              <div>
                <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 900, color: "#09090b", margin: 0, lineHeight: 1.1 }}>
                  {BUSINESS_INFO?.companyName || BUSINESS_INFO?.manufacturer || "JEES foods"}
                </h1>
                <div style={{ fontSize: "0.82rem", color: "#52525B", marginTop: "3px", fontWeight: 600 }}>
                  {BUSINESS_INFO?.brandName || BUSINESS_INFO?.name || "Spices Dabba"} &bull; {BUSINESS_INFO?.tagline || "We Prepare . You Cook"}
                </div>
              </div>
            </div>

            {/* Invoice Header Badge */}
            <div style={{ textAlign: "right", minWidth: "160px", flexShrink: 0 }}>
              <div style={{
                background: "#09090b",
                color: "#FFFFFF",
                padding: "4px 12px",
                borderRadius: "4px",
                fontSize: "0.80rem",
                fontWeight: 800,
                letterSpacing: "0.5px",
                display: "inline-block"
              }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 800, fontFamily: "monospace", marginTop: "4px", color: "#09090b" }}>
                #{order.invoiceNumber}
              </div>
            </div>
          </div>

          {/* ROW 1: SHIPPING ROW - FROM (Left) & SHIPP TO (Right) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            background: "#F8F9FA",
            padding: "12px 14px",
            borderRadius: "6px",
            border: "1px solid #E4E4E7",
            marginBottom: "10px",
            fontSize: "0.80rem"
          }}>
            {/* FROM / SENDER ADDRESS */}
            <div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "#09090b", letterSpacing: "0.5px" }}>
                From
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "#09090b", marginTop: "2px" }}>
                {BUSINESS_INFO?.companyName || BUSINESS_INFO?.manufacturer || "JEES foods"}
              </div>
              {BUSINESS_INFO?.brandName && (
                <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#71717A" }}>
                  Brand: {BUSINESS_INFO.brandName}
                </div>
              )}
              <div style={{ color: "#52525B", marginTop: "2px", lineHeight: "1.35" }}>
                Address: {BUSINESS_INFO?.address || [BUSINESS_INFO?.address1, BUSINESS_INFO?.address2, BUSINESS_INFO?.city, BUSINESS_INFO?.state ? `${BUSINESS_INFO?.state} - ${BUSINESS_INFO?.pincode}` : BUSINESS_INFO?.pincode].filter(Boolean).join(", ")}
              </div>
              <div style={{ color: "#09090b", fontWeight: 600, marginTop: "2px" }}>
                Phone: {BUSINESS_INFO?.phonePrimary || BUSINESS_INFO?.phone}{BUSINESS_INFO?.phoneSecondary ? `, ${BUSINESS_INFO.phoneSecondary}` : ""}
              </div>
              <div style={{ color: "#52525B", marginTop: "2px" }}>
                GSTIN: <strong style={{ fontFamily: "monospace", color: "#09090b" }}>{BUSINESS_INFO?.gstin}</strong>
              </div>
            </div>

            {/* SHIPPING ADDRESS / DISPATCH TO */}
            <div style={{ borderLeft: "1px dashed #D4D4D8", paddingLeft: "14px" }}>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "#09090b", letterSpacing: "0.5px" }}>
                Shipp To
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "#09090b", marginTop: "2px" }}>
                {customer.shopName || customer.businessName || "Retailer Shop"}
              </div>
              {customer.customerName && (
                <div style={{ color: "#52525B", marginTop: "1px" }}>Contact Person: {customer.customerName}</div>
              )}
              {finalShippingAddr && (
                <div style={{ color: "#52525B", marginTop: "2px", lineHeight: "1.35" }}>
                  Address: {finalShippingAddr}
                </div>
              )}
              {customer.phone && (
                <div style={{ color: "#09090b", fontWeight: 600, marginTop: "2px" }}>
                  Phone: {customer.phone}
                </div>
              )}
            </div>
          </div>

          {/* ROW 2: BELOW SHIPPING ROW - BILL TO (Left) & ORDER DETAILS (Right) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
            background: "#F8F9FA",
            padding: "12px 14px",
            borderRadius: "6px",
            border: "1px solid #E4E4E7",
            marginBottom: "16px",
            fontSize: "0.80rem"
          }}>
            {/* BILLED TO / BUYER */}
            <div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "#09090b", letterSpacing: "0.5px" }}>
                Bill To
              </div>
              <div style={{ fontSize: "1.02rem", fontWeight: 800, color: "#09090b", marginTop: "2px" }}>
                {customer.shopName || customer.businessName || "Retailer Customer"}
              </div>
              {customer.customerName && (
                <div style={{ color: "#52525B", marginTop: "1px" }}>Contact Person: {customer.customerName}</div>
              )}
              {billingAddr && (
                <div style={{ color: "#52525B", marginTop: "2px", lineHeight: "1.35" }}>Address: {billingAddr}</div>
              )}
              {customer.phone && (
                <div style={{ color: "#09090b", fontWeight: 600, marginTop: "2px" }}>Phone: {customer.phone}</div>
              )}
              {customer.gstin && (
                <div style={{ color: "#52525B", marginTop: "2px" }}>
                  GSTIN: <strong style={{ fontFamily: "monospace", color: "#09090b" }}>{customer.gstin}</strong>
                </div>
              )}
            </div>

            {/* ORDER DETAILS */}
            <div style={{ borderLeft: "1px dashed #D4D4D8", paddingLeft: "14px" }}>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "#09090b", letterSpacing: "0.5px", marginBottom: "6px" }}>
                Order Details
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "105px 1fr", rowGap: "4px", fontSize: "0.80rem" }}>
                <span style={{ color: "#52525B", fontWeight: 600 }}>Invoice Code:</span>
                <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#09090b" }}>{order.invoiceNumber}</span>

                <span style={{ color: "#52525B", fontWeight: 600 }}>Invoice Date:</span>
                <span style={{ fontWeight: 600, color: "#09090b" }}>{formatDateOnly(order.timestamp || order.createdAt)}</span>

                <span style={{ color: "#52525B", fontWeight: 600 }}>Payment Mode:</span>
                <span style={{ fontWeight: 600, color: "#09090b" }}>{order.paymentMode || "Cash"}</span>

                <span style={{ color: "#52525B", fontWeight: 600 }}>Payment Status:</span>
                <span>
                  <span style={{
                    display: "inline-block",
                    padding: "1px 7px",
                    borderRadius: "4px",
                    fontSize: "0.70rem",
                    fontWeight: 800,
                    background: (order.paymentStatus === "pending" || order.paymentStatus === "credit") ? "#FEE2E2" : "#DCFCE7",
                    color: (order.paymentStatus === "pending" || order.paymentStatus === "credit") ? "#DC2626" : "#15803D"
                  }}>
                    {(order.paymentStatus || "PAID").toUpperCase()}
                  </span>
                </span>

                <span style={{ color: "#52525B", fontWeight: 600 }}>Total Items:</span>
                <span style={{ fontWeight: 600, color: "#09090b" }}>{(order.items || []).length} items</span>
              </div>
            </div>
          </div>

          {/* Line Items Table with Ordered Columns */}
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.82rem",
            marginBottom: "16px"
          }}>
            <thead>
              <tr style={{ background: "#09090b", color: "#FFFFFF", textAlign: "left" }}>
                <th style={{ padding: "8px 4px", width: "26px", textAlign: "center" }}>#</th>
                <th style={{ padding: "8px 8px" }}>Item Description</th>
                <th style={{ padding: "8px 6px", width: "80px", textAlign: "center", background: "#18181b" }}>HSN Code</th>
                <th style={{ padding: "8px 4px", width: "40px", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "8px 6px", width: "75px", textAlign: "right" }}>Unit Price</th>
                <th style={{ padding: "8px 6px", width: "70px", textAlign: "right" }}>GST</th>
                <th style={{ padding: "8px 6px", width: "85px", textAlign: "right" }}>Product Price</th>
                <th style={{ padding: "8px 6px", width: "60px", textAlign: "right" }}>MRP</th>
                <th style={{ padding: "8px 8px", width: "80px", textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, idx) => {
                const rate = Number(item.wholesalePrice) || Number(item.price) || 0;
                const gstPercent = item.isSample ? 0 : (item.gstPercent !== undefined ? Number(item.gstPercent) : 5);
                const unitInclusive = item.isSample
                  ? 0
                  : (item.inclusivePrice !== undefined
                      ? Number(item.inclusivePrice)
                      : Math.round(rate * (1 + gstPercent / 100) * 100) / 100);
                const rowTotal = Math.round(unitInclusive * (item.quantity || 1) * 100) / 100;
                const baseTotal = Math.round(rate * (item.quantity || 1) * 100) / 100;
                const itemGstAmount = item.isSample ? 0 : Math.round((rowTotal - baseTotal) * 100) / 100;
                const mrp = Number(item.mrp) || 0;
                const hsn = item.hsnCode || "0910 91 00";
                const packText = item.unit || item.variantSize || "Standard Pack";

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #E4E4E7", background: item.isSample ? "#FEF2F2" : (idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA") }}>
                    <td style={{ padding: "7px 4px", textAlign: "center", color: "#71717A" }}>{idx + 1}</td>
                    <td style={{ padding: "7px 8px" }}>
                      <div style={{ fontWeight: 700, color: "#09090b", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        <span>{item.name}</span>
                        {item.isSample && (
                          <span style={{
                            fontSize: "0.68rem",
                            fontWeight: 800,
                            background: "#8B1E1E",
                            color: "#FFFFFF",
                            padding: "1px 6px",
                            borderRadius: "3px",
                            letterSpacing: "0.4px"
                          }}>
                            SAMPLE (FREE)
                          </span>
                        )}
                      </div>
                      {item.tamilName && (
                        <div className="font-tamil" style={{ fontSize: "0.76rem", color: "#71717A" }}>
                          {item.tamilName}
                        </div>
                      )}
                      <div style={{ fontSize: "0.72rem", color: "#52525B", marginTop: "2px", fontWeight: 600 }}>
                        Pack: {packText} • GST: {item.isSample ? "0%" : `${gstPercent}%`}
                      </div>
                    </td>
                    {/* HSN CODE CELL */}
                    <td style={{ padding: "7px 6px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: "#09090b", fontSize: "0.80rem" }}>
                      {hsn}
                    </td>
                    {/* Qty */}
                    <td style={{ padding: "7px 4px", textAlign: "center", fontWeight: 800 }}>
                      {item.quantity}
                    </td>
                    {/* Unit price (without GST) */}
                    <td style={{ padding: "7px 6px", textAlign: "right", fontWeight: item.isSample ? 800 : 500, color: item.isSample ? "#DC2626" : "inherit" }}>
                      {item.isSample ? "₹0.00" : `₹${rate.toFixed(2)}`}
                    </td>
                    {/* GST (Amount) */}
                    <td style={{ padding: "7px 6px", textAlign: "right", fontWeight: 600, color: item.isSample ? "#DC2626" : "#52525B" }}>
                      {item.isSample ? "₹0.00" : `₹${itemGstAmount.toFixed(2)}`}
                    </td>
                    {/* Product price (Base rate + GST) */}
                    <td style={{ padding: "7px 6px", textAlign: "right", fontWeight: 700, color: item.isSample ? "#DC2626" : "#09090b" }}>
                      {item.isSample ? "₹0.00" : `₹${unitInclusive.toFixed(2)}`}
                    </td>
                    {/* MRP */}
                    <td style={{ padding: "7px 6px", textAlign: "right", color: "#71717A", fontWeight: 600 }}>
                      {mrp > 0 ? `₹${mrp.toFixed(2)}` : "-"}
                    </td>
                    {/* Total (Product price x Qty) */}
                    <td style={{ padding: "7px 8px", textAlign: "right", fontWeight: 800, color: item.isSample ? "#DC2626" : "#09090b" }}>
                      {item.isSample ? "₹0.00 (Free)" : `₹${rowTotal.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#F4F4F5", borderTop: "2px solid #09090b", fontWeight: 800 }}>
                <td colSpan="5" style={{ padding: "8px 10px", textAlign: "right", textTransform: "uppercase", fontSize: "0.76rem", fontWeight: 800, color: "#09090b", letterSpacing: "0.5px" }}>
                  Total GST:
                </td>
                <td style={{ padding: "8px 6px", textAlign: "right", fontWeight: 800, color: "#09090b" }}>
                  ₹{calculatedTax.toFixed(2)}
                </td>
                <td colSpan="3" style={{ padding: "8px 6px" }}></td>
              </tr>
            </tfoot>
          </table>

          {/* Summary Breakdown & Totals */}
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "20px", alignItems: "start", marginBottom: "16px" }}>
            {/* Amount in words & Notes */}
            <div style={{ background: "#F8F9FA", padding: "12px 14px", borderRadius: "6px", border: "1px solid #E4E4E7", fontSize: "0.82rem" }}>
              <div style={{ color: "#52525B", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>
                Total Amount in Words:
              </div>
              <div style={{ fontWeight: 800, color: "#09090b", marginTop: "2px" }}>
                {numberToWords(Math.round(finalGrandTotal))}
              </div>

              {order.notes && (
                <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #D4D4D8", color: "#52525B" }}>
                  <strong>Field Remarks:</strong> {order.notes}
                </div>
              )}

              {/* Bank & Payment Details + Sample QR Code */}
              <div style={{
                marginTop: "10px",
                paddingTop: "8px",
                borderTop: "1px solid #E4E4E7",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px"
              }}>
                <div style={{ fontSize: "0.76rem", color: "#18181b", lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 800, color: "#09090b", textTransform: "uppercase", fontSize: "0.72rem", marginBottom: "3px", letterSpacing: "0.4px" }}>
                    Bank & UPI Payment Details
                  </div>
                  <div><strong>Bank:</strong> {BUSINESS_INFO?.bankName || "Tamilnad Mercantile Bank"}</div>
                  <div><strong>A/C Name:</strong> {BUSINESS_INFO?.accountName || "SPICES DABBA"}</div>
                  <div><strong>A/C:</strong> {BUSINESS_INFO?.accountNumber || "180150050800432"}</div>
                  <div><strong>IFSC:</strong> {BUSINESS_INFO?.ifscCode || "TMBL0000180"}</div>
                  <div><strong>UPI:</strong> {BUSINESS_INFO?.upiId || "9940159298 (Vaishno Devi)"}</div>
                </div>

                <div style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  background: "#FFFFFF",
                  padding: "4px 6px",
                  borderRadius: "6px",
                  border: "1px solid #D4D4D8",
                  flexShrink: 0
                }}>
                  <img
                    src={BUSINESS_INFO.qrCodePath || "/images/upi-qr.jpg"}
                    alt="UPI QR Code"
                    onError={(e) => {
                      if (qrCodeUrl && e.target.src !== qrCodeUrl) {
                        e.target.src = qrCodeUrl;
                      }
                    }}
                    style={{ width: "74px", height: "74px", objectFit: "contain", display: "block" }}
                  />
                  <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#09090b", marginTop: "2px" }}>
                    Scan & Pay (UPI)
                  </span>
                </div>
              </div>
            </div>

            {/* Calculations Table */}
            <div style={{ fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ color: "#52525B" }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>₹{Number(order.subtotal || finalGrandTotal).toFixed(2)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: Number(order.discount) > 0 ? "#8B1E1E" : "#52525B" }}>
                <span>Discount:</span>
                <span>{Number(order.discount) > 0 ? `-₹${Number(order.discount).toFixed(2)}` : "₹0.00"}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#52525B" }}>
                <span>Shipping Charges:</span>
                <span style={{ fontWeight: 600 }}>₹{shippingCharges.toFixed(2)}</span>
              </div>

              {/* Grand Total Row */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "8px 0",
                marginTop: "6px",
                borderTop: "2px solid #09090b",
                borderBottom: "2px solid #09090b",
                fontWeight: 900,
                fontSize: "1.2rem",
                color: "#09090b"
              }}>
                <span>Total Payable:</span>
                <span>₹{finalGrandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Terms & Authorized Signature Block */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr",
            gap: "20px",
            marginTop: "24px",
            paddingTop: "14px",
            borderTop: "1px solid #E4E4E7",
            fontSize: "0.75rem"
          }}>
            <div>
              <div style={{ fontWeight: 800, color: "#09090b" }}>Terms & Conditions:</div>
              <ul style={{ paddingLeft: "14px", marginTop: "3px", color: "#71717A", lineHeight: "1.4" }}>
                <li>Goods once sold will not be taken back or exchanged.</li>
                <li>Payment due immediately upon delivery unless prior credit terms approved.</li>
                <li>All disputes subject to Theni jurisdiction only.</li>
              </ul>
            </div>

            <div style={{ textAlign: "right", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
              <div style={{ fontWeight: 700, color: "#09090b", marginBottom: "40px" }}>
                For JEES foods
              </div>
              <div style={{ borderTop: "1px dashed #A1A1AA", display: "inline-block", paddingTop: "4px", color: "#52525B" }}>
                Authorized Signatory / Seal
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Modal Bottom Actions (Hidden during print) */}
        <div className="no-print" style={{
          background: "#F8F9FA",
          borderTop: "1px solid #E4E4E7",
          padding: "12px 20px",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "10px",
          borderBottomLeftRadius: "18px",
          borderBottomRightRadius: "18px"
        }}>
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "#25D366",
                color: "#FFFFFF",
                textDecoration: "none",
                padding: "8px 14px",
                borderRadius: "var(--radius-md)",
                fontSize: "0.85rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Share2 size={16} />
              <span>Send Invoice to Retailer WhatsApp</span>
            </a>
          )}

          <div style={{ display: "flex", gap: "10px", marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isGeneratingPdf}
              className="btn-primary"
              style={{ padding: "8px 18px", fontSize: "0.88rem", background: "var(--sd-red)", border: "none" }}
            >
              {isGeneratingPdf ? <Loader2 size={16} className="spin" /> : <Download size={16} />}
              <span>{isGeneratingPdf ? "Generating PDF..." : "Download as PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="btn-accent"
              style={{ padding: "8px 18px", fontSize: "0.88rem" }}
            >
              <Printer size={16} />
              <span>Print Invoice</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              style={{ padding: "8px 14px", fontSize: "0.85rem" }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
