import React, { useState } from "react";
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
import { formatCurrency, formatDate, cleanPhoneNumber } from "../utils/formatters";

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

export default function InvoiceModal({ order, onClose }) {
  const { BUSINESS_INFO } = usePOS();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!order) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanInvoiceNum = (order.invoiceNumber || "Bill").replace(/[^a-zA-Z0-9_-]/g, "_");
    document.title = `${cleanInvoiceNum}_Tax_Invoice`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1500);
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    const invoiceEl = document.getElementById("invoice-print-area");
    if (!invoiceEl) {
      setIsGeneratingPdf(false);
      return;
    }

    const cleanInvoiceNum = (order.invoiceNumber || "Bill").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${cleanInvoiceNum}_Spices_Dabba_Invoice.pdf`;

    try {
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (window.html2pdf) {
        const opt = {
          margin: [8, 10, 8, 10],
          filename: filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };

        await window.html2pdf().set(opt).from(invoiceEl).save();
        setIsGeneratingPdf(false);
        return;
      }
    } catch (err) {
      console.warn("Direct html2pdf notice:", err.message);
    }

    // Fallback: Set document title for clean browser 'Save as PDF'
    const originalTitle = document.title;
    document.title = filename.replace(".pdf", "");
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
      setIsGeneratingPdf(false);
    }, 1500);
  };

  // Calculate dynamic GST breakdown based on items (supports both new and previous orders)
  const calculatedTax = Number(order.tax) > 0 
    ? Number(order.tax) 
    : (order.items || []).reduce((sum, item) => {
        if (item.isSample) return sum;
        const rate = Number(item.wholesalePrice) || Number(item.price) || 0;
        const gst = item.gstPercent !== undefined ? Number(item.gstPercent) : 5;
        return sum + (rate * (item.quantity || 1) * gst) / 100;
      }, 0);

  const taxPct = Number(order.taxPercent) > 0 
    ? Number(order.taxPercent) 
    : (order.subtotal > 0 ? Math.round((calculatedTax / order.subtotal) * 100) : 5);

  const halfTax = calculatedTax / 2;
  const finalGrandTotal = Number(order.grandTotal) > 0 && Number(order.tax) > 0
    ? Number(order.grandTotal)
    : Math.round((Number(order.subtotal || 0) - Number(order.discount || 0) + calculatedTax) * 100) / 100;

  // Build WhatsApp share link including HSN codes & GST breakdown
  const generateWhatsAppA4BillLink = () => {
    if (!order.customer?.phone) return null;
    const cleanPhone = cleanPhoneNumber(order.customer.phone);
    const targetPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

    let msg = `*${BUSINESS_INFO.name}* (${BUSINESS_INFO.tamilName || ""})\n`;
    msg += `GSTIN: ${BUSINESS_INFO.gstin} | ${BUSINESS_INFO.address}\n`;
    msg += `--------------------------------\n`;
    msg += `🧾 *TAX INVOICE: ${order.invoiceNumber || "BILL"}*\n`;
    msg += `📅 Date: ${new Date().toLocaleDateString("en-IN")}\n`;
    msg += `🏪 *Shop:* ${order.customer?.shopName || "Retailer"}\n`;
    msg += `📱 Phone: ${order.customer?.phone || "-"}\n`;
    msg += `--------------------------------\n`;
    msg += `*ITEMIZED BREAKDOWN:*\n`;

    (order.items || []).forEach((item, idx) => {
      const itemTotal = (item.wholesalePrice || item.price) * item.quantity;
      const hsn = item.hsnCode || "0910 91 00";
      const gst = item.gstPercent !== undefined ? item.gstPercent : 5;
      msg += `${idx + 1}. ${item.name} (${item.unit || "unit"}) [HSN: ${hsn} | GST: ${gst}%]\n`;
      msg += `   Qty: ${item.quantity} × ₹${item.wholesalePrice || item.price} = *₹${itemTotal.toFixed(2)}*\n`;
    });

    msg += `--------------------------------\n`;
    msg += `Subtotal (Taxable): ₹${Number(order.subtotal || 0).toFixed(2)}\n`;
    if (order.discount > 0) msg += `Discount: -₹${Number(order.discount).toFixed(2)}\n`;
    if (calculatedTax > 0) {
      msg += `CGST (${(taxPct / 2).toFixed(1)}%): +₹${halfTax.toFixed(2)}\n`;
      msg += `SGST (${(taxPct / 2).toFixed(1)}%): +₹${halfTax.toFixed(2)}\n`;
      msg += `Total GST (${taxPct}%): +₹${calculatedTax.toFixed(2)}\n`;
    }
    msg += `*GRAND TOTAL: ₹${finalGrandTotal.toFixed(2)}*\n`;
    msg += `Payment Status: *${(order.paymentStatus || "PAID").toUpperCase()}* (${order.paymentMode || "Cash"})\n`;
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
              A4 Tax Invoice
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
              padding: "24px 28px",
              minWidth: "680px",
              background: "#FFFFFF",
              color: "#09090b",
              fontFamily: "inherit",
              boxSizing: "border-box"
            }}
          >
          {/* Header row: Company Details & Invoice Metadata */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #09090b", paddingBottom: "16px", marginBottom: "16px" }}>
            {/* Company Info */}
            <div style={{ display: "flex", gap: "14px" }}>
              <div style={{
                width: "60px",
                height: "60px",
                border: "1px solid #E4E4E7",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                flexShrink: 0
              }}>
                <img
                  src={BUSINESS_INFO.logoPath}
                  alt="Logo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                  style={{ width: "95%", height: "95%", objectFit: "contain" }}
                />
              </div>

              <div>
                <h1 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 900, color: "#09090b", margin: 0, lineHeight: 1.1 }}>
                  {BUSINESS_INFO.name}
                </h1>
                <div className="font-tamil" style={{ fontSize: "0.85rem", fontWeight: 700, color: "#8B1E1E" }}>
                  {BUSINESS_INFO.tamilName}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#52525B", marginTop: "3px" }}>
                  <strong>Mfr:</strong> {BUSINESS_INFO.manufacturer} • {BUSINESS_INFO.address}
                </div>
                <div style={{ fontSize: "0.8rem", color: "#09090b", marginTop: "2px" }}>
                  <strong>GSTIN:</strong> {BUSINESS_INFO.gstin} | <strong>State:</strong> 33-Tamil Nadu | <strong>Ph:</strong> {BUSINESS_INFO.phonePrimary}
                </div>
              </div>
            </div>

            {/* Invoice Meta */}
            <div style={{ textAlign: "right", minWidth: "220px", flexShrink: 0 }}>
              <div style={{
                background: "#09090b",
                color: "#FFFFFF",
                padding: "3px 10px",
                borderRadius: "4px",
                fontSize: "0.75rem",
                fontWeight: 800,
                letterSpacing: "0.5px",
                display: "inline-block",
                marginBottom: "6px"
              }}>
                TAX INVOICE
              </div>
              <div style={{ fontSize: "0.88rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                Invoice #: <span style={{ fontFamily: "monospace", fontWeight: 800 }}>{order.invoiceNumber}</span>
              </div>
              <div style={{ fontSize: "0.8rem", color: "#52525B", marginTop: "2px", whiteSpace: "nowrap" }}>
                Date: {formatDate(order.timestamp || order.createdAt)}
              </div>
              <div style={{ fontSize: "0.8rem", color: "#52525B", marginTop: "2px", whiteSpace: "nowrap" }}>
                Mode: <strong>{order.paymentMode || "Cash"}</strong>
              </div>
            </div>
          </div>

          {/* Retailer / Billed To Section */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.3fr 1fr",
            gap: "16px",
            background: "#F8F9FA",
            padding: "12px 16px",
            borderRadius: "6px",
            border: "1px solid #E4E4E7",
            marginBottom: "16px",
            fontSize: "0.84rem"
          }}>
            <div>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "#09090b" }}>
                BILLED TO / RETAILER SHOP:
              </div>
              <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#09090b", marginTop: "2px" }}>
                {order.customer?.shopName}
              </div>
              {order.customer?.customerName && (
                <div style={{ color: "#52525B" }}>Contact Person: {order.customer.customerName}</div>
              )}
              {order.customer?.address && (
                <div style={{ color: "#52525B" }}>Address: {order.customer.address}</div>
              )}
              {order.customer?.phone && (
                <div style={{ color: "#09090b", fontWeight: 600 }}>Phone: {order.customer.phone}</div>
              )}
            </div>

            <div style={{ borderLeft: "1px dashed #D4D4D8", paddingLeft: "16px" }}>
              <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "#52525B" }}>
                DISPATCH & SUPPLY DETAILS:
              </div>
              <div style={{ marginTop: "4px", color: "#52525B" }}>
                Place of Supply: <strong>Tamil Nadu (33)</strong>
              </div>
              <div style={{ marginTop: "2px", color: "#52525B" }}>
                Order Type: <strong>Wholesale Direct Spot Billing</strong>
              </div>
              <div style={{ marginTop: "2px", color: "#52525B" }}>
                Payment Status: <strong style={{ color: order.paymentStatus === "pending" ? "#DC2626" : "#15803D" }}>{(order.paymentStatus || "PAID").toUpperCase()}</strong>
              </div>
            </div>
          </div>

          {/* Line Items Table with Mandatory HSN CODE Column */}
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "0.84rem",
            marginBottom: "16px"
          }}>
            <thead>
              <tr style={{ background: "#09090b", color: "#FFFFFF", textAlign: "left" }}>
                <th style={{ padding: "8px 6px", width: "35px", textAlign: "center" }}>#</th>
                <th style={{ padding: "8px 10px" }}>Item Description & Masala</th>
                <th style={{ padding: "8px 8px", width: "105px", textAlign: "center", background: "#18181b" }}>HSN Code</th>
                <th style={{ padding: "8px 8px", width: "80px", textAlign: "center" }}>Pack</th>
                <th style={{ padding: "8px 8px", width: "80px", textAlign: "right" }}>Rate (₹)</th>
                <th style={{ padding: "8px 8px", width: "60px", textAlign: "center" }}>Qty</th>
                <th style={{ padding: "8px 8px", width: "65px", textAlign: "center" }}>GST %</th>
                <th style={{ padding: "8px 10px", width: "95px", textAlign: "right" }}>Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(order.items || []).map((item, idx) => {
                const rate = Number(item.wholesalePrice) || Number(item.price) || 0;
                const total = rate * item.quantity;
                const hsn = item.hsnCode || "0910 91 00";

                return (
                  <tr key={idx} style={{ borderBottom: "1px solid #E4E4E7", background: item.isSample ? "#FEF2F2" : (idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA") }}>
                    <td style={{ padding: "8px 6px", textAlign: "center", color: "#71717A" }}>{idx + 1}</td>
                    <td style={{ padding: "8px 10px" }}>
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
                            SAMPLE / மாதிரி (FREE)
                          </span>
                        )}
                      </div>
                      {item.tamilName && (
                        <div className="font-tamil" style={{ fontSize: "0.76rem", color: "#71717A" }}>
                          {item.tamilName}
                        </div>
                      )}
                    </td>
                    {/* HSN CODE CELL - Explicitly highlighted */}
                    <td style={{ padding: "8px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: 700, color: "#09090b" }}>
                      {hsn}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "center", color: "#52525B" }}>
                      {item.unit || "Pack"}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontWeight: item.isSample ? 800 : 500, color: item.isSample ? "#DC2626" : "inherit" }}>
                      {item.isSample ? "₹0.00 (Sample)" : `₹${rate.toFixed(2)}`}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "center", fontWeight: 800 }}>
                      {item.quantity}
                    </td>
                    <td style={{ padding: "8px 8px", textAlign: "center", fontWeight: 700, color: "#18181b" }}>
                      {item.isSample ? "0%" : `${item.gstPercent !== undefined ? item.gstPercent : 5}%`}
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: item.isSample ? "#DC2626" : "#09090b" }}>
                      {item.isSample ? "₹0.00 (Free)" : `₹${total.toFixed(2)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
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

              <div style={{ marginTop: "8px", fontSize: "0.75rem", color: "#71717A" }}>
                Bank: Canara Bank | A/C: 120001234567 | IFSC: CNRB0001234 | UPI: 9566659298@upi
              </div>
            </div>

            {/* Calculations Table */}
            <div style={{ fontSize: "0.85rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ color: "#52525B" }}>Taxable Subtotal:</span>
                <span style={{ fontWeight: 600 }}>₹{Number(order.subtotal || 0).toFixed(2)}</span>
              </div>

              {Number(order.discount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#8B1E1E" }}>
                  <span>Discount:</span>
                  <span>-₹{Number(order.discount).toFixed(2)}</span>
                </div>
              )}

              {calculatedTax > 0 ? (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#52525B", fontSize: "0.82rem" }}>
                    <span>CGST ({(taxPct / 2).toFixed(1)}%):</span>
                    <span style={{ fontWeight: 600 }}>₹{halfTax.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#52525B", fontSize: "0.82rem" }}>
                    <span>SGST ({(taxPct / 2).toFixed(1)}%):</span>
                    <span style={{ fontWeight: 600 }}>₹{halfTax.toFixed(2)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#09090b", fontSize: "0.85rem", fontWeight: 700, borderTop: "1px dashed #E4E4E7", marginTop: "2px", paddingTop: "3px" }}>
                    <span>Total GST ({taxPct}%):</span>
                    <span>+₹{calculatedTax.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#52525B", fontSize: "0.8rem" }}>
                  <span>GST:</span>
                  <span>0% (Exempt)</span>
                </div>
              )}

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
                <span>GRAND TOTAL:</span>
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
                For {BUSINESS_INFO.name}
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
