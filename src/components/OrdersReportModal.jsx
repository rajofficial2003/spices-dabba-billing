import React, { useState, useMemo } from "react";
import { 
  X, 
  Download, 
  Printer, 
  Calendar, 
  FileSpreadsheet, 
  BarChart3, 
  TrendingUp, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  Building, 
  Layers,
  ShoppingBag,
  Filter
} from "lucide-react";
import { formatCurrency } from "../utils/formatters";

export default function OrdersReportModal({
  isOpen,
  onClose,
  orders = [],
  customers = [],
  BUSINESS_INFO = {},
  initialFilterTab = "completed",
  initialDatePreset = "all"
}) {
  if (!isOpen) return null;

  // Filter States
  const [statusFilter, setStatusFilter] = useState(initialFilterTab || "completed"); // 'all' | 'completed' | 'credit' | 'draft'
  const [datePreset, setDatePreset] = useState(initialDatePreset || "month"); // 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [activeViewTab, setActiveViewTab] = useState("orders"); // 'orders' | 'products'

  // Initialize dates based on preset
  React.useEffect(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (datePreset === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (datePreset === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (datePreset === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 6);
      const wStr = `${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, "0")}-${String(w.getDate()).padStart(2, "0")}`;
      setStartDate(wStr);
      setEndDate(todayStr);
    } else if (datePreset === "month") {
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDate(mStr);
      setEndDate(todayStr);
    } else if (datePreset === "all") {
      setStartDate("");
      setEndDate("");
    }
  }, [datePreset]);

  // Helper date extractor
  const getOrderDateStr = (order) => {
    if (order.date && /^\d{4}-\d{2}-\d{2}/.test(order.date)) {
      return order.date.substring(0, 10);
    }
    const ts = order.timestamp || order.createdAt;
    if (!ts) return "";
    const d = new Date(ts);
    if (isNaN(d.getTime())) return "";
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // 1. Status Filter
      if (statusFilter === "completed") {
        if (order.status !== "completed" || order.paymentStatus === "pending" || order.paymentStatus === "credit") return false;
      } else if (statusFilter === "credit") {
        if (order.status !== "completed" || (order.paymentStatus !== "pending" && order.paymentStatus !== "credit")) return false;
      } else if (statusFilter === "draft") {
        if (order.status !== "draft") return false;
      }

      // 2. Customer Filter
      if (customerFilter !== "all") {
        const orderCustId = order.customer?.id || order.customerId;
        if (orderCustId !== customerFilter) return false;
      }

      // 3. Date Range Filter
      if (startDate || endDate) {
        const dStr = getOrderDateStr(order);
        if (startDate && dStr && dStr < startDate) return false;
        if (endDate && dStr && dStr > endDate) return false;
      }

      return true;
    }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [orders, statusFilter, datePreset, startDate, endDate, customerFilter]);

  // Aggregated Summary Statistics
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalTaxable = 0;
    let totalTax = 0;
    let totalDiscount = 0;
    let totalShipping = 0;
    let paidAmount = 0;
    let creditAmount = 0;
    const productSalesMap = {};

    filteredOrders.forEach(o => {
      const gTotal = Number(o.grandTotal) || 0;
      const sub = Number(o.subtotal) || gTotal;
      const disc = Number(o.discount) || 0;
      const ship = Number(o.shippingCharges ?? o.shippingCharge ?? o.shippingDetails?.shippingCharges ?? 0);
      const tax = Number(o.tax) || 0;
      const taxable = Number(o.taxableAmount ?? o.taxableSubtotal) || (sub - tax);

      totalSales += gTotal;
      totalTaxable += taxable;
      totalTax += tax;
      totalDiscount += disc;
      totalShipping += ship;

      if (o.paymentStatus === "pending" || o.paymentStatus === "credit") {
        creditAmount += gTotal;
      } else {
        paidAmount += gTotal;
      }

      // Aggregate Products
      if (Array.isArray(o.items)) {
        o.items.forEach(it => {
          const key = it.productId || it.name;
          if (!productSalesMap[key]) {
            productSalesMap[key] = {
              name: it.name,
              tamilName: it.tamilName || "",
              unit: it.unit || it.variantSize || "Pack",
              quantity: 0,
              totalAmount: 0
            };
          }
          productSalesMap[key].quantity += Number(it.quantity || 1);
          const itemRate = Number(it.inclusivePrice || it.wholesalePrice || it.price || 0);
          productSalesMap[key].totalAmount += (itemRate * Number(it.quantity || 1));
        });
      }
    });

    const topProducts = Object.values(productSalesMap).sort((a, b) => b.quantity - a.quantity);

    return {
      count: filteredOrders.length,
      totalSales: Math.round(totalSales * 100) / 100,
      totalTaxable: Math.round(totalTaxable * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalDiscount: Math.round(totalDiscount * 100) / 100,
      totalShipping: Math.round(totalShipping * 100) / 100,
      paidAmount: Math.round(paidAmount * 100) / 100,
      creditAmount: Math.round(creditAmount * 100) / 100,
      topProducts
    };
  }, [filteredOrders]);

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredOrders.length === 0) {
      alert("No orders available to export for the selected filter.");
      return;
    }

    const headers = [
      "S.No",
      "Invoice Number",
      "Invoice Date",
      "Retailer / Customer Shop",
      "Contact Person",
      "Phone Number",
      "City / Location",
      "Customer GSTIN",
      "Payment Status",
      "Payment Mode",
      "Subtotal (Rs)",
      "Discount (Rs)",
      "Shipping Charges (Rs)",
      "Total GST (Rs)",
      "Grand Total (Rs)",
      "Courier Partner",
      "Tracking Docket"
    ];

    const rows = filteredOrders.map((o, idx) => {
      const cust = o.customer || {};
      const ship = Number(o.shippingCharges ?? o.shippingCharge ?? o.shippingDetails?.shippingCharges ?? 0);
      const dateStr = getOrderDateStr(o);
      const courier = o.courierCompany || o.shippingDetails?.courierCompany || "";
      const tracking = o.trackingId || o.shippingDetails?.trackingId || "";

      return [
        idx + 1,
        `"${o.invoiceNumber || ""}"`,
        `"${dateStr}"`,
        `"${(cust.shopName || cust.businessName || "").replace(/"/g, '""')}"`,
        `"${(cust.customerName || "").replace(/"/g, '""')}"`,
        `"${cust.phone || ""}"`,
        `"${(cust.billingAddress?.city || cust.city || "").replace(/"/g, '""')}"`,
        `"${cust.gstin || ""}"`,
        `"${(o.paymentStatus || "PAID").toUpperCase()}"`,
        `"${o.paymentMode || "Cash"}"`,
        (Number(o.subtotal) || Number(o.grandTotal) || 0).toFixed(2),
        (Number(o.discount) || 0).toFixed(2),
        ship.toFixed(2),
        (Number(o.tax) || 0).toFixed(2),
        (Number(o.grandTotal) || 0).toFixed(2),
        `"${courier.replace(/"/g, '""')}"`,
        `"${tracking.replace(/"/g, '""')}"`
      ].join(",");
    });

    // Add Summary Row at the bottom
    rows.push("");
    rows.push([
      "TOTAL",
      `"${filteredOrders.length} Orders"`,
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      "",
      stats.totalDiscount.toFixed(2),
      stats.totalShipping.toFixed(2),
      stats.totalTax.toFixed(2),
      stats.totalSales.toFixed(2),
      '""',
      '""'
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateTag = new Date().toISOString().substring(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `Spices_Dabba_Orders_Report_${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler via hidden iframe (Clean vector A4 PDF)
  const handlePrintReport = () => {
    if (filteredOrders.length === 0) {
      alert("No orders available to print.");
      return;
    }

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

    const rangeLabel = startDate && endDate 
      ? `${startDate} to ${endDate}` 
      : (datePreset === "all" ? "All Time" : datePreset.toUpperCase());

    const statusLabel = statusFilter === "completed" 
      ? "Finalized & Paid Bills" 
      : (statusFilter === "credit" ? "Credit / Pending Bills" : (statusFilter === "draft" ? "Drafts" : "All Orders"));

    const tableRows = filteredOrders.map((o, idx) => {
      const cust = o.customer || {};
      const dateStr = getOrderDateStr(o);
      const gTotal = Number(o.grandTotal) || 0;
      const isCredit = o.paymentStatus === "pending" || o.paymentStatus === "credit";

      return `
        <tr style="border-bottom: 1px solid #E4E4E7; font-size: 11px;">
          <td style="padding: 6px 4px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 6px; font-family: monospace; font-weight: 700;">${o.invoiceNumber || "-"}</td>
          <td style="padding: 6px 6px; white-space: nowrap;">${dateStr}</td>
          <td style="padding: 6px 6px;">
            <strong>${cust.shopName || cust.businessName || "Retailer"}</strong>
            ${cust.customerName ? `<div style="font-size: 10px; color: #52525B;">${cust.customerName}</div>` : ""}
          </td>
          <td style="padding: 6px 6px;">${cust.phone || "-"}</td>
          <td style="padding: 6px 6px; text-align: center;">${o.paymentMode || "Cash"}</td>
          <td style="padding: 6px 6px; text-align: center; font-weight: 700; color: ${isCredit ? '#DC2626' : '#15803D'};">
            ${(o.paymentStatus || "PAID").toUpperCase()}
          </td>
          <td style="padding: 6px 6px; text-align: right; font-weight: 700;">₹${gTotal.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spices Dabba - Sales & Orders Report (${rangeLabel})</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 14mm; }
            * { box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
              color: #09090B; 
              background: #FFFFFF;
              margin: 0;
              padding: 0;
              font-size: 12px;
            }
            table { width: 100%; border-collapse: collapse; }
            th { background: #09090B; color: #FFFFFF; font-weight: 800; font-size: 11px; text-transform: uppercase; padding: 7px 6px; }
            .header { border-bottom: 2px solid #09090B; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
            .badge { display: inline-block; padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; }
            .summary-card { border: 1px solid #D4D4D8; border-radius: 6px; padding: 8px 12px; background: #F4F4F5; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="font-size: 20px; font-weight: 900; margin: 0; letter-spacing: -0.5px;">
                ${BUSINESS_INFO?.companyName || BUSINESS_INFO?.manufacturer || "JEES FOODS"} &bull; ${BUSINESS_INFO?.brandName || "SPICES DABBA"}
              </h1>
              <div style="font-size: 11px; color: #52525B; margin-top: 3px;">
                ${BUSINESS_INFO?.address || "Bodinayakanur, Theni District-625513, Tamilnadu, India"}
              </div>
              <div style="font-size: 11px; font-weight: 600; margin-top: 2px;">
                GSTIN: <strong>${BUSINESS_INFO?.gstin || "33ATDPV4802H1ZR"}</strong> | Phone: ${BUSINESS_INFO?.phonePrimary || "+91 95666 59298"}
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: #09090B; color: #FFFFFF;">SALES & ORDERS REGISTER</span>
              <div style="font-size: 12px; font-weight: 800; margin-top: 5px;">Period: ${rangeLabel}</div>
              <div style="font-size: 11px; color: #52525B; margin-top: 2px;">Filter: ${statusLabel}</div>
            </div>
          </div>

          <!-- Summary Metric Cards -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
            <div class="summary-card">
              <div style="font-size: 10px; text-transform: uppercase; color: #71717A; font-weight: 800;">Total Orders</div>
              <div style="font-size: 16px; font-weight: 900; color: #09090B; margin-top: 2px;">${stats.count} Bills</div>
            </div>
            <div class="summary-card">
              <div style="font-size: 10px; text-transform: uppercase; color: #71717A; font-weight: 800;">Total Revenue</div>
              <div style="font-size: 16px; font-weight: 900; color: #09090B; margin-top: 2px;">₹${stats.totalSales.toFixed(2)}</div>
            </div>
            <div class="summary-card" style="background: #ECFDF5; border-color: #A7F3D0;">
              <div style="font-size: 10px; text-transform: uppercase; color: #065F46; font-weight: 800;">Paid Collections</div>
              <div style="font-size: 16px; font-weight: 900; color: #065F46; margin-top: 2px;">₹${stats.paidAmount.toFixed(2)}</div>
            </div>
            <div class="summary-card" style="background: #FEF2F2; border-color: #FECACA;">
              <div style="font-size: 10px; text-transform: uppercase; color: #991B1B; font-weight: 800;">Credit / Pending</div>
              <div style="font-size: 16px; font-weight: 900; color: #991B1B; margin-top: 2px;">₹${stats.creditAmount.toFixed(2)}</div>
            </div>
          </div>

          <!-- Orders Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">#</th>
                <th style="width: 90px; text-align: left;">Invoice Code</th>
                <th style="width: 75px; text-align: left;">Date</th>
                <th style="text-align: left;">Retailer / Shop</th>
                <th style="width: 85px; text-align: left;">Phone</th>
                <th style="width: 55px; text-align: center;">Mode</th>
                <th style="width: 65px; text-align: center;">Status</th>
                <th style="width: 85px; text-align: right;">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
            <tfoot>
              <tr style="background: #F4F4F5; font-weight: 900; border-top: 2px solid #09090B;">
                <td colspan="7" style="padding: 8px 6px; text-align: right; font-size: 12px;">TOTAL REVENUE (${stats.count} Bills):</td>
                <td style="padding: 8px 6px; text-align: right; font-size: 13px; color: #09090B;">₹${stats.totalSales.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 25px; padding-top: 10px; border-top: 1px dashed #D4D4D8; display: flex; justify-content: space-between; font-size: 10px; color: #71717A;">
            <div>Generated by Spices Dabba Automated Billing System &bull; Printed: ${new Date().toLocaleString("en-IN")}</div>
            <div style="font-weight: 800; color: #09090B;">Authorized Signatory: _________________________</div>
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
      }, 1000);
    }, 300);
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div 
        className="modal-content" 
        style={{
          width: "95%",
          maxWidth: "960px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          background: "#FFFFFF"
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: "16px 20px",
          background: "linear-gradient(to right, #18181b, #09090b)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(255,255,255,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <BarChart3 size={20} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0 }}>
                Orders & Sales Report Generator
              </h2>
              <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-400)", margin: "2px 0 0 0" }}>
                Generate, filter, and export comprehensive sales reports, CSV spreadsheets, and PDF registers.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#FFFFFF",
              width: "32px",
              height: "32px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
          {/* Controls Bar: Status Filter, Date Presets & Customer Filter */}
          <div style={{
            background: "var(--sd-zinc-50)",
            border: "1px solid var(--sd-zinc-200)",
            borderRadius: "12px",
            padding: "14px",
            marginBottom: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}>
            {/* Row 1: Status Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--sd-zinc-700)", textTransform: "uppercase" }}>
                Bill Status:
              </span>
              {[
                { id: "completed", label: "Paid Bills" },
                { id: "credit", label: "Credit / Khata" },
                { id: "draft", label: "Saved Drafts" },
                { id: "all", label: "All Bills" }
              ].map(s => {
                const isActive = statusFilter === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusFilter(s.id)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "8px",
                      fontSize: "0.76rem",
                      fontWeight: isActive ? 800 : 600,
                      background: isActive ? "var(--sd-black)" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "var(--sd-zinc-700)",
                      border: isActive ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            {/* Row 2: Date Presets & Custom Range */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--sd-zinc-700)", textTransform: "uppercase" }}>
                Date Range:
              </span>
              {[
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "week", label: "Last 7 Days" },
                { id: "month", label: "This Month" },
                { id: "all", label: "All Time" },
                { id: "custom", label: "Custom Range" }
              ].map(d => {
                const isActive = datePreset === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDatePreset(d.id)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "8px",
                      fontSize: "0.74rem",
                      fontWeight: isActive ? 800 : 600,
                      background: isActive ? "var(--sd-black)" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "var(--sd-zinc-700)",
                      border: isActive ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                      cursor: "pointer",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {d.label}
                  </button>
                );
              })}

              {/* Date Inputs if Custom or to refine */}
              {(datePreset === "custom" || startDate || endDate) && (
                <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginLeft: "4px" }}>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setDatePreset("custom");
                    }}
                    className="text-input"
                    style={{ padding: "4px 8px", fontSize: "0.74rem", width: "130px" }}
                  />
                  <span style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)" }}>to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setDatePreset("custom");
                    }}
                    className="text-input"
                    style={{ padding: "4px 8px", fontSize: "0.74rem", width: "130px" }}
                  />
                </div>
              )}
            </div>

            {/* Row 3: Customer Filter */}
            {customers.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--sd-zinc-700)", textTransform: "uppercase" }}>
                  Filter Retailer:
                </span>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className="custom-select"
                  style={{ padding: "5px 10px", fontSize: "0.78rem", maxWidth: "260px", fontWeight: 600 }}
                >
                  <option value="all">All Retailers ({customers.length})</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.shopName || c.businessName} ({c.phone || "No Phone"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Metric Summary Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            marginBottom: "16px"
          }}>
            {/* Total Orders */}
            <div style={{
              background: "#FFFFFF",
              border: "1px solid var(--sd-zinc-200)",
              borderRadius: "12px",
              padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>
                  Orders Generated
                </span>
                <ShoppingBag size={15} color="var(--sd-zinc-400)" />
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "4px" }}>
                {stats.count} Bills
              </div>
            </div>

            {/* Total Revenue */}
            <div style={{
              background: "#FFFFFF",
              border: "1px solid var(--sd-zinc-200)",
              borderRadius: "12px",
              padding: "12px 14px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>
                  Total Sales Revenue
                </span>
                <TrendingUp size={15} color="#16A34A" />
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "4px" }}>
                {formatCurrency(stats.totalSales)}
              </div>
            </div>

            {/* Paid Collections */}
            <div style={{
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              borderRadius: "12px",
              padding: "12px 14px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#065F46", textTransform: "uppercase" }}>
                  Paid Collections
                </span>
                <CheckCircle2 size={15} color="#065F46" />
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#065F46", marginTop: "4px" }}>
                {formatCurrency(stats.paidAmount)}
              </div>
            </div>

            {/* Credit / Pending */}
            <div style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "12px",
              padding: "12px 14px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#991B1B", textTransform: "uppercase" }}>
                  Credit Outstanding
                </span>
                <Clock size={15} color="#991B1B" />
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 900, color: "#991B1B", marginTop: "4px" }}>
                {formatCurrency(stats.creditAmount)}
              </div>
            </div>
          </div>

          {/* Sub-Tabs: Orders List vs Products Sold Breakdown */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "10px",
            borderBottom: "1px solid var(--sd-zinc-200)",
            paddingBottom: "8px"
          }}>
            <div style={{ display: "flex", gap: "6px" }}>
              <button
                type="button"
                onClick={() => setActiveViewTab("orders")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: activeViewTab === "orders" ? 800 : 600,
                  background: activeViewTab === "orders" ? "var(--sd-black)" : "transparent",
                  color: activeViewTab === "orders" ? "#FFFFFF" : "var(--sd-zinc-600)",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Orders Register ({filteredOrders.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveViewTab("products")}
                style={{
                  padding: "5px 12px",
                  borderRadius: "6px",
                  fontSize: "0.78rem",
                  fontWeight: activeViewTab === "products" ? 800 : 600,
                  background: activeViewTab === "products" ? "var(--sd-black)" : "transparent",
                  color: activeViewTab === "products" ? "#FFFFFF" : "var(--sd-zinc-600)",
                  border: "none",
                  cursor: "pointer"
                }}
              >
                Top Products Sold ({stats.topProducts.length})
              </button>
            </div>

            <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", fontWeight: 600 }}>
              Showing {filteredOrders.length} records
            </div>
          </div>

          {/* View Tab 1: Orders Register Table */}
          {activeViewTab === "orders" && (
            <div style={{
              background: "#FFFFFF",
              border: "1px solid var(--sd-zinc-200)",
              borderRadius: "10px",
              overflow: "hidden"
            }}>
              {filteredOrders.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--sd-zinc-400)", fontSize: "0.85rem" }}>
                  No orders match the selected report filter.
                </div>
              ) : (
                <div style={{ overflowX: "auto", maxHeight: "320px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", textAlign: "left" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#09090b", color: "#FFFFFF", zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: "8px 6px", textAlign: "center", width: "30px" }}>#</th>
                        <th style={{ padding: "8px 8px" }}>Invoice Code</th>
                        <th style={{ padding: "8px 8px" }}>Date</th>
                        <th style={{ padding: "8px 8px" }}>Retailer / Customer</th>
                        <th style={{ padding: "8px 8px" }}>Phone</th>
                        <th style={{ padding: "8px 8px", textAlign: "center" }}>Mode</th>
                        <th style={{ padding: "8px 8px", textAlign: "center" }}>Status</th>
                        <th style={{ padding: "8px 8px", textAlign: "right" }}>Shipping</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.map((o, idx) => {
                        const cust = o.customer || {};
                        const dateStr = getOrderDateStr(o);
                        const isCredit = o.paymentStatus === "pending" || o.paymentStatus === "credit";
                        const ship = Number(o.shippingCharges ?? o.shippingCharge ?? o.shippingDetails?.shippingCharges ?? 0);

                        return (
                          <tr key={o.id || idx} style={{ borderBottom: "1px solid var(--sd-zinc-200)", background: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA" }}>
                            <td style={{ padding: "7px 6px", textAlign: "center", color: "var(--sd-zinc-500)" }}>{idx + 1}</td>
                            <td style={{ padding: "7px 8px", fontFamily: "monospace", fontWeight: 700 }}>{o.invoiceNumber || "-"}</td>
                            <td style={{ padding: "7px 8px", color: "var(--sd-zinc-600)", whiteSpace: "nowrap" }}>{dateStr}</td>
                            <td style={{ padding: "7px 8px" }}>
                              <strong style={{ color: "var(--sd-black)" }}>{cust.shopName || cust.businessName || "Retailer"}</strong>
                              {cust.customerName && <div style={{ fontSize: "0.70rem", color: "var(--sd-zinc-500)" }}>{cust.customerName}</div>}
                            </td>
                            <td style={{ padding: "7px 8px", color: "var(--sd-zinc-700)" }}>{cust.phone || "-"}</td>
                            <td style={{ padding: "7px 8px", textAlign: "center", color: "var(--sd-zinc-600)" }}>{o.paymentMode || "Cash"}</td>
                            <td style={{ padding: "7px 8px", textAlign: "center" }}>
                              <span style={{
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                background: isCredit ? "#FEE2E2" : "#DCFCE7",
                                color: isCredit ? "#991B1B" : "#166534"
                              }}>
                                {(o.paymentStatus || "PAID").toUpperCase()}
                              </span>
                            </td>
                            <td style={{ padding: "7px 8px", textAlign: "right", color: "var(--sd-zinc-600)" }}>
                              {ship > 0 ? `₹${ship.toFixed(2)}` : "-"}
                            </td>
                            <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 800, color: "var(--sd-black)" }}>
                              ₹{(Number(o.grandTotal) || 0).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* View Tab 2: Products Sold Breakdown */}
          {activeViewTab === "products" && (
            <div style={{
              background: "#FFFFFF",
              border: "1px solid var(--sd-zinc-200)",
              borderRadius: "10px",
              overflow: "hidden"
            }}>
              {stats.topProducts.length === 0 ? (
                <div style={{ padding: "30px", textAlign: "center", color: "var(--sd-zinc-400)", fontSize: "0.85rem" }}>
                  No product sales recorded in the selected period.
                </div>
              ) : (
                <div style={{ overflowX: "auto", maxHeight: "320px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", textAlign: "left" }}>
                    <thead style={{ position: "sticky", top: 0, background: "#09090b", color: "#FFFFFF", zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: "8px 6px", textAlign: "center", width: "30px" }}>#</th>
                        <th style={{ padding: "8px 8px" }}>Product Name</th>
                        <th style={{ padding: "8px 8px" }}>Pack Size</th>
                        <th style={{ padding: "8px 8px", textAlign: "center" }}>Units Sold</th>
                        <th style={{ padding: "8px 10px", textAlign: "right" }}>Total Sales Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topProducts.map((p, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid var(--sd-zinc-200)", background: idx % 2 === 0 ? "#FFFFFF" : "#FAFAFA" }}>
                          <td style={{ padding: "7px 6px", textAlign: "center", color: "var(--sd-zinc-500)" }}>{idx + 1}</td>
                          <td style={{ padding: "7px 8px" }}>
                            <strong style={{ color: "var(--sd-black)" }}>{p.name}</strong>
                            {p.tamilName && <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", marginLeft: "6px" }}>({p.tamilName})</span>}
                          </td>
                          <td style={{ padding: "7px 8px", color: "var(--sd-zinc-600)" }}>{p.unit}</td>
                          <td style={{ padding: "7px 8px", textAlign: "center", fontWeight: 800, color: "var(--sd-black)" }}>{p.quantity}</td>
                          <td style={{ padding: "7px 10px", textAlign: "right", fontWeight: 800, color: "#16A34A" }}>
                            ₹{p.totalAmount.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div style={{
          padding: "14px 20px",
          background: "var(--sd-zinc-50)",
          borderTop: "1px solid var(--sd-zinc-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px"
        }}>
          <div style={{ fontSize: "0.78rem", color: "var(--sd-zinc-600)" }}>
            Period Total: <strong>₹{stats.totalSales.toFixed(2)}</strong> across <strong>{stats.count} bills</strong>
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={filteredOrders.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 700,
                background: "#FFFFFF",
                color: "var(--sd-zinc-800)",
                border: "1px solid var(--sd-zinc-300)",
                cursor: filteredOrders.length === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
              }}
            >
              <FileSpreadsheet size={15} color="#16A34A" />
              <span>Download Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              disabled={filteredOrders.length === 0}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 18px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 800,
                background: "var(--sd-black)",
                color: "#FFFFFF",
                border: "none",
                cursor: filteredOrders.length === 0 ? "not-allowed" : "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.18)"
              }}
            >
              <Printer size={15} />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

