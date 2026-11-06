import React, { useState, useMemo, useEffect } from "react";
import { 
  X, 
  Download, 
  Printer, 
  Calendar, 
  FileSpreadsheet, 
  BarChart3, 
  TrendingDown, 
  Boxes, 
  Receipt, 
  Layers, 
  Filter, 
  Building, 
  IndianRupee,
  ShoppingBag,
  TrendingUp,
  Tag,
  CheckCircle2,
  Users
} from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";

export default function FinanceReportModal({
  isOpen,
  onClose,
  expenses = [],
  orders = [],
  rawMaterials = [],
  suppliers = [],
  expenseCategories = [],
  BUSINESS_INFO = {},
  initialSection = "all", // 'all' | 'raw_materials' | 'other_expenses'
  initialDatePreset = "month",
  initialStartDate = "",
  initialEndDate = ""
}) {
  if (!isOpen) return null;

  // Filter States
  const [typeFilter, setTypeFilter] = useState(
    initialSection === "raw_materials" ? "raw_materials" : (initialSection === "other_expenses" ? "other_expenses" : "all")
  );
  const [datePreset, setDatePreset] = useState(initialDatePreset || "month");
  const [startDate, setStartDate] = useState(initialStartDate || "");
  const [endDate, setEndDate] = useState(initialEndDate || "");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [paymentModeFilter, setPaymentModeFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [activeViewTab, setActiveViewTab] = useState("register"); // 'register' | 'raw_materials' | 'categories'

  // Sync date preset changes
  useEffect(() => {
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

  // Helper date extractors
  const getExpenseDateStr = (exp) => {
    if (exp.date && /^\d{4}-\d{2}-\d{2}/.test(exp.date)) {
      return exp.date.substring(0, 10);
    }
    const ts = exp.timestamp || (exp.createdAt?.seconds ? exp.createdAt.seconds * 1000 : null);
    if (ts) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
    return "";
  };

  const getOrderDateStr = (order) => {
    if (order.date && /^\d{4}-\d{2}-\d{2}/.test(order.date)) {
      return order.date.substring(0, 10);
    }
    const ts = order.timestamp || (order.createdAt?.seconds ? order.createdAt.seconds * 1000 : null) || order.finalizedAt;
    if (ts) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
    return "";
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const isRawMaterial = exp.expenseType === "raw_material" || exp.category === "Raw Materials";

      // 1. Expense Type Filter
      if (typeFilter === "raw_materials" && !isRawMaterial) return false;
      if (typeFilter === "other_expenses" && isRawMaterial) return false;

      // 2. Category Filter (for operational expenses or raw materials)
      if (categoryFilter !== "all") {
        if (exp.category !== categoryFilter) return false;
      }

      // 3. Payment Mode Filter
      if (paymentModeFilter !== "all") {
        if ((exp.paymentMode || "Cash").toLowerCase() !== paymentModeFilter.toLowerCase()) return false;
      }

      // 4. Supplier Filter
      if (supplierFilter !== "all") {
        const sup = exp.supplierName || exp.paidTo || "";
        if (sup !== supplierFilter) return false;
      }

      // 5. Date Range Filter
      if (startDate || endDate) {
        const dStr = getExpenseDateStr(exp);
        if (startDate && dStr && dStr < startDate) return false;
        if (endDate && dStr && dStr > endDate) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = getExpenseDateStr(a);
      const dateB = getExpenseDateStr(b);
      return dateB.localeCompare(dateA);
    });
  }, [expenses, typeFilter, datePreset, startDate, endDate, categoryFilter, paymentModeFilter, supplierFilter]);

  // Aggregate Stats & Analytics
  const stats = useMemo(() => {
    let totalOutflow = 0;
    let rawMaterialsTotal = 0;
    let rawMaterialsCount = 0;
    let otherExpensesTotal = 0;
    let otherExpensesCount = 0;

    const rawMaterialBreakdownMap = {};
    const categoryBreakdownMap = {};

    filteredExpenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      const isRawMaterial = exp.expenseType === "raw_material" || exp.category === "Raw Materials";

      totalOutflow += amt;

      if (isRawMaterial) {
        rawMaterialsTotal += amt;
        rawMaterialsCount += 1;

        // Breakdown by Raw Material Item
        if (Array.isArray(exp.items) && exp.items.length > 0) {
          exp.items.forEach(itm => {
            const key = itm.name || "Whole Spice";
            if (!rawMaterialBreakdownMap[key]) {
              rawMaterialBreakdownMap[key] = {
                name: itm.name,
                tamilName: itm.tamilName || "",
                hsnCode: itm.hsnCode || "0910 91 00",
                unit: itm.unit || "Kg",
                totalQuantity: 0,
                totalSpend: 0,
                billCount: 0
              };
            }
            rawMaterialBreakdownMap[key].totalQuantity += Number(itm.quantity || 0);
            rawMaterialBreakdownMap[key].totalSpend += Number(itm.total || (itm.quantity * itm.unitPrice) || 0);
            rawMaterialBreakdownMap[key].billCount += 1;
          });
        } else {
          const key = exp.title || "Whole Spices (Bulk)";
          if (!rawMaterialBreakdownMap[key]) {
            rawMaterialBreakdownMap[key] = {
              name: key,
              tamilName: "",
              hsnCode: "0910 91 00",
              unit: "Lot",
              totalQuantity: 1,
              totalSpend: 0,
              billCount: 0
            };
          }
          rawMaterialBreakdownMap[key].totalSpend += amt;
          rawMaterialBreakdownMap[key].billCount += 1;
        }
      } else {
        otherExpensesTotal += amt;
        otherExpensesCount += 1;

        // Breakdown by Category
        const catKey = exp.category || "General";
        if (!categoryBreakdownMap[catKey]) {
          categoryBreakdownMap[catKey] = {
            category: catKey,
            count: 0,
            totalAmount: 0
          };
        }
        categoryBreakdownMap[catKey].count += 1;
        categoryBreakdownMap[catKey].totalAmount += amt;
      }
    });

    // Orders Revenue in matching date range for Net Margin computation
    const periodOrders = orders.filter(o => {
      if (o.status !== "completed") return false;
      if (startDate || endDate) {
        const d = getOrderDateStr(o);
        if (startDate && d && d < startDate) return false;
        if (endDate && d && d > endDate) return false;
      }
      return true;
    });

    const periodRevenue = periodOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
    const netProfit = periodRevenue - totalOutflow;
    const profitMargin = periodRevenue > 0 ? ((netProfit / periodRevenue) * 100).toFixed(1) : "0.0";

    const rawMaterialsList = Object.values(rawMaterialBreakdownMap).sort((a, b) => b.totalSpend - a.totalSpend);
    const categoryList = Object.values(categoryBreakdownMap).sort((a, b) => b.totalAmount - a.totalAmount);

    return {
      totalOutflow: Math.round(totalOutflow * 100) / 100,
      rawMaterialsTotal: Math.round(rawMaterialsTotal * 100) / 100,
      rawMaterialsCount,
      otherExpensesTotal: Math.round(otherExpensesTotal * 100) / 100,
      otherExpensesCount,
      totalEntries: filteredExpenses.length,
      periodRevenue: Math.round(periodRevenue * 100) / 100,
      periodOrdersCount: periodOrders.length,
      netProfit: Math.round(netProfit * 100) / 100,
      profitMargin,
      rawMaterialsList,
      categoryList
    };
  }, [filteredExpenses, orders, startDate, endDate]);

  // Unique list of suppliers and categories for dropdowns
  const uniqueSuppliers = useMemo(() => {
    const set = new Set();
    expenses.forEach(e => {
      if (e.supplierName) set.add(e.supplierName);
      if (e.paidTo) set.add(e.paidTo);
    });
    suppliers.forEach(s => {
      if (s.name) set.add(s.name);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [expenses, suppliers]);

  const uniqueCategories = useMemo(() => {
    const set = new Set();
    expenseCategories.forEach(c => {
      if (typeof c === "string") set.add(c);
      else if (c.name) set.add(c.name);
    });
    expenses.forEach(e => {
      if (e.category) set.add(e.category);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [expenseCategories, expenses]);

  // Export to CSV Function
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) {
      alert("No purchase or expense records available to export for the selected filter.");
      return;
    }

    const headers = [
      "S.No",
      "Date",
      "Bill / Voucher No",
      "Type",
      "Category",
      "Supplier / Paid To",
      "Contact Phone",
      "Items / Description",
      "Payment Mode",
      "Notes",
      "Total Amount (Rs)"
    ];

    const rows = filteredExpenses.map((exp, idx) => {
      const isRawMaterial = exp.expenseType === "raw_material" || exp.category === "Raw Materials";
      const dateStr = getExpenseDateStr(exp);
      const billNo = exp.invoiceNumber || exp.billNumber || exp.id || "";
      const typeLabel = isRawMaterial ? "Raw Material Purchase" : "Operational Expense";
      const cat = exp.category || (isRawMaterial ? "Raw Materials" : "General");
      const party = exp.supplierName || exp.paidTo || "";
      const phone = exp.supplierPhone || "";

      let itemsDesc = "";
      if (isRawMaterial && Array.isArray(exp.items) && exp.items.length > 0) {
        itemsDesc = exp.items.map(it => `${it.name} (${it.quantity} ${it.unit || "Kg"} @ Rs.${it.unitPrice || 0})`).join(" | ");
      } else {
        itemsDesc = exp.title || exp.notes || "";
      }

      return [
        idx + 1,
        `"${dateStr}"`,
        `"${billNo}"`,
        `"${typeLabel}"`,
        `"${cat.replace(/"/g, '""')}"`,
        `"${party.replace(/"/g, '""')}"`,
        `"${phone}"`,
        `"${itemsDesc.replace(/"/g, '""')}"`,
        `"${exp.paymentMode || "Cash"}"`,
        `"${(exp.notes || "").replace(/"/g, '""')}"`,
        (Number(exp.amount) || 0).toFixed(2)
      ].join(",");
    });

    // Add Summary Row at the bottom
    rows.push("");
    rows.push([
      "TOTAL",
      `"${filteredExpenses.length} Records"`,
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      '""',
      stats.totalOutflow.toFixed(2)
    ].join(","));

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateTag = new Date().toISOString().substring(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `Spices_Dabba_Purchase_Expenses_Report_${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report Handler via hidden iframe (Clean vector A4 PDF)
  const handlePrintReport = () => {
    if (filteredExpenses.length === 0) {
      alert("No purchase or expense records available to print.");
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

    const typeLabel = typeFilter === "raw_materials" 
      ? "Raw Material Mandi Purchases" 
      : (typeFilter === "other_expenses" ? "Operational & Daily Expenses" : "All Purchases & Operating Outflows");

    const tableRows = filteredExpenses.map((exp, idx) => {
      const isRawMaterial = exp.expenseType === "raw_material" || exp.category === "Raw Materials";
      const dateStr = getExpenseDateStr(exp);
      const billNo = exp.invoiceNumber || exp.billNumber || "-";
      const party = exp.supplierName || exp.paidTo || "-";
      const amt = Number(exp.amount) || 0;

      let detailSnippet = "";
      if (isRawMaterial && Array.isArray(exp.items) && exp.items.length > 0) {
        detailSnippet = exp.items.map(it => `${it.name} (${it.quantity}${it.unit || "Kg"})`).join(", ");
      } else {
        detailSnippet = exp.title || exp.category || "-";
      }

      return `
        <tr style="border-bottom: 1px solid #E4E4E7; font-size: 11px;">
          <td style="padding: 6px 4px; text-align: center;">${idx + 1}</td>
          <td style="padding: 6px 6px; white-space: nowrap;">${dateStr}</td>
          <td style="padding: 6px 6px; font-family: monospace; font-weight: 700;">${billNo}</td>
          <td style="padding: 6px 6px;">
            <span style="display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; background: ${isRawMaterial ? '#FFEDD5' : '#F4F4F5'}; color: ${isRawMaterial ? '#6B1414' : '#18181B'};">
              ${isRawMaterial ? "RAW MATERIAL" : (exp.category || "EXPENSE")}
            </span>
          </td>
          <td style="padding: 6px 6px;">
            <strong>${party}</strong>
            ${exp.supplierPhone ? `<div style="font-size: 10px; color: #71717A;">${exp.supplierPhone}</div>` : ""}
          </td>
          <td style="padding: 6px 6px; font-size: 10.5px; color: #3F3F46; max-width: 220px;">
            ${detailSnippet}
          </td>
          <td style="padding: 6px 6px; text-align: center;">${exp.paymentMode || "Cash"}</td>
          <td style="padding: 6px 6px; text-align: right; font-weight: 800; color: #09090B;">₹${amt.toFixed(2)}</td>
        </tr>
      `;
    }).join("");

    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Spices Dabba - Purchase & Expenses Audit Register (${rangeLabel})</title>
          <style>
            @page { size: A4 landscape; margin: 10mm 12mm; }
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
              <span class="badge" style="background: #09090B; color: #FFFFFF;">PURCHASE & EXPENSE AUDIT REGISTER</span>
              <div style="font-size: 12px; font-weight: 800; margin-top: 5px;">Period: ${rangeLabel}</div>
              <div style="font-size: 11px; color: #52525B; margin-top: 2px;">Filter: ${typeLabel}</div>
            </div>
          </div>

          <!-- Summary Metric Cards -->
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px;">
            <div class="summary-card">
              <div style="font-size: 10px; text-transform: uppercase; color: #71717A; font-weight: 800;">Total Outflows</div>
              <div style="font-size: 16px; font-weight: 900; color: #09090B; margin-top: 2px;">₹${stats.totalOutflow.toFixed(2)}</div>
              <div style="font-size: 10px; color: #71717A; margin-top: 2px;">${stats.totalEntries} Bills & Vouchers</div>
            </div>
            <div class="summary-card" style="background: #FFF7ED; border-color: #FED7AA;">
              <div style="font-size: 10px; text-transform: uppercase; color: #9A3412; font-weight: 800;">Raw Material Mandi Spend</div>
              <div style="font-size: 16px; font-weight: 900; color: #6B1414; margin-top: 2px;">₹${stats.rawMaterialsTotal.toFixed(2)}</div>
              <div style="font-size: 10px; color: #9A3412; margin-top: 2px;">${stats.rawMaterialsCount} Procurement Bills</div>
            </div>
            <div class="summary-card" style="background: #FFE4E6; border-color: #FECDD3;">
              <div style="font-size: 10px; text-transform: uppercase; color: #9F1239; font-weight: 800;">Operational Expenses</div>
              <div style="font-size: 16px; font-weight: 900; color: #9F1239; margin-top: 2px;">₹${stats.otherExpensesTotal.toFixed(2)}</div>
              <div style="font-size: 10px; color: #9F1239; margin-top: 2px;">${stats.otherExpensesCount} Vouchers</div>
            </div>
            <div class="summary-card" style="background: ${stats.netProfit >= 0 ? '#ECFDF5' : '#FEF2F2'}; border-color: ${stats.netProfit >= 0 ? '#A7F3D0' : '#FECACA'};">
              <div style="font-size: 10px; text-transform: uppercase; color: ${stats.netProfit >= 0 ? '#065F46' : '#991B1B'}; font-weight: 800;">Period Net Operating Margin</div>
              <div style="font-size: 16px; font-weight: 900; color: ${stats.netProfit >= 0 ? '#065F46' : '#991B1B'}; margin-top: 2px;">₹${stats.netProfit.toFixed(2)}</div>
              <div style="font-size: 10px; color: ${stats.netProfit >= 0 ? '#065F46' : '#991B1B'}; margin-top: 2px;">Revenue: ₹${stats.periodRevenue.toFixed(2)} (${stats.profitMargin}%)</div>
            </div>
          </div>

          <!-- Register Table -->
          <table>
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">#</th>
                <th style="width: 75px; text-align: left;">Date</th>
                <th style="width: 90px; text-align: left;">Bill / Voucher</th>
                <th style="width: 110px; text-align: left;">Type / Cat</th>
                <th style="width: 140px; text-align: left;">Supplier / Paid To</th>
                <th style="text-align: left;">Items / Description</th>
                <th style="width: 60px; text-align: center;">Mode</th>
                <th style="width: 85px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
            <tfoot>
              <tr style="background: #F4F4F5; font-weight: 900; border-top: 2px solid #09090B;">
                <td colspan="7" style="padding: 8px 6px; text-align: right; font-size: 12px;">TOTAL PURCHASES & EXPENSES (${stats.totalEntries} Records):</td>
                <td style="padding: 8px 6px; text-align: right; font-size: 13px; color: #09090B;">₹${stats.totalOutflow.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>

          <div style="margin-top: 25px; padding-top: 10px; border-top: 1px dashed #D4D4D8; display: flex; justify-content: space-between; font-size: 10px; color: #71717A;">
            <div>Generated by Spices Dabba Automated ERP System &bull; Printed: ${new Date().toLocaleString("en-IN")}</div>
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
        if (printIframe.parentNode) {
          printIframe.parentNode.removeChild(printIframe);
        }
      }, 1500);
    }, 400);
  };

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(4px)",
      zIndex: 9999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      animation: "fadeIn 0.2s ease"
    }}>
      <div style={{
        background: "#FFFFFF",
        width: "100%",
        maxWidth: "1150px",
        maxHeight: "92vh",
        borderRadius: "16px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        border: "1px solid var(--sd-zinc-200)"
      }}>
        {/* Modal Header */}
        <div style={{
          padding: "16px 20px",
          background: "var(--sd-black)",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          borderBottom: "1px solid var(--sd-zinc-800)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              background: "#6B1414",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <FileSpreadsheet size={20} color="#FFFFFF" />
            </div>
            <div>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, color: "#FFFFFF", letterSpacing: "-0.3px" }}>
                Purchase & Expenses Report Generator
              </h2>
              <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-400)", marginTop: "2px" }}>
                Filter procurement, mandi purchases, and daily operating expenses &bull; Export to Excel or A4 Print
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                background: "#15803D",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "0.78rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "background 0.15s ease"
              }}
              title="Download UTF-8 BOM CSV compatible with Microsoft Excel"
            >
              <Download size={14} />
              <span>Export CSV / Excel</span>
            </button>

            {/* Print A4 PDF */}
            <button
              type="button"
              onClick={handlePrintReport}
              style={{
                background: "#FFFFFF",
                color: "var(--sd-black)",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "0.78rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                transition: "background 0.15s ease"
              }}
              title="Print Vector A4 Statement"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                width: "34px",
                height: "34px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{
          padding: "14px 20px",
          background: "var(--sd-zinc-50)",
          borderBottom: "1px solid var(--sd-zinc-200)",
          display: "flex",
          flexDirection: "column",
          gap: "12px"
        }}>
          {/* Row 1: Type Tabs & Date Presets */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            {/* Outflow Type Filters */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--sd-zinc-600)", textTransform: "uppercase", marginRight: "4px" }}>
                Type:
              </span>
              {[
                { id: "all", label: "All Outflows", icon: Layers },
                { id: "raw_materials", label: "Raw Materials Only", icon: Boxes },
                { id: "other_expenses", label: "Operating Expenses Only", icon: Receipt }
              ].map(tab => {
                const isActive = typeFilter === tab.id;
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTypeFilter(tab.id)}
                    style={{
                      border: isActive ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                      background: isActive ? "var(--sd-black)" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "var(--sd-zinc-700)",
                      borderRadius: "8px",
                      padding: "6px 12px",
                      fontSize: "0.76rem",
                      fontWeight: isActive ? 800 : 600,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <IconComponent size={13} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Date Range Presets */}
            <div style={{ display: "flex", alignItems: "center", gap: "5px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--sd-zinc-600)", textTransform: "uppercase", marginRight: "2px" }}>
                Date:
              </span>
              {[
                { id: "all", label: "All Time" },
                { id: "today", label: "Today" },
                { id: "yesterday", label: "Yesterday" },
                { id: "week", label: "Last 7 Days" },
                { id: "month", label: "This Month" },
                { id: "custom", label: "Custom Range" }
              ].map(p => {
                const isActive = datePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setDatePreset(p.id)}
                    style={{
                      border: isActive ? "1px solid #6B1414" : "1px solid var(--sd-zinc-300)",
                      background: isActive ? "#6B1414" : "#FFFFFF",
                      color: isActive ? "#FFFFFF" : "var(--sd-zinc-700)",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "0.73rem",
                      fontWeight: isActive ? 800 : 600,
                      cursor: "pointer"
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Secondary Dropdown Filters & Custom Date Range Inputs */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
            {/* Custom Date Pickers */}
            {datePreset === "custom" && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#FFFFFF", padding: "4px 8px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)" }}>
                <Calendar size={13} color="var(--sd-zinc-500)" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ border: "none", fontSize: "0.75rem", outline: "none", fontWeight: 600 }}
                />
                <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-400)" }}>to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ border: "none", fontSize: "0.75rem", outline: "none", fontWeight: 600 }}
                />
              </div>
            )}

            {/* Category Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--sd-zinc-500)" }}>Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--sd-zinc-300)",
                  fontSize: "0.75rem",
                  background: "#FFFFFF",
                  fontWeight: 600,
                  outline: "none"
                }}
              >
                <option value="all">All Categories ({uniqueCategories.length})</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Supplier / Vendor Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--sd-zinc-500)" }}>Party / Supplier:</span>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--sd-zinc-300)",
                  fontSize: "0.75rem",
                  background: "#FFFFFF",
                  fontWeight: 600,
                  outline: "none",
                  maxWidth: "180px"
                }}
              >
                <option value="all">All Suppliers / Vendors</option>
                {uniqueSuppliers.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            </div>

            {/* Payment Mode Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--sd-zinc-500)" }}>Mode:</span>
              <select
                value={paymentModeFilter}
                onChange={(e) => setPaymentModeFilter(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "8px",
                  border: "1px solid var(--sd-zinc-300)",
                  fontSize: "0.75rem",
                  background: "#FFFFFF",
                  fontWeight: 600,
                  outline: "none"
                }}
              >
                <option value="all">All Modes</option>
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="Credit">Credit / Pending</option>
              </select>
            </div>

            {/* Active records count pill */}
            <div style={{ marginLeft: "auto", fontSize: "0.74rem", fontWeight: 800, color: "var(--sd-zinc-600)" }}>
              Showing: <span style={{ color: "var(--sd-black)" }}>{filteredExpenses.length} Records</span>
            </div>
          </div>
        </div>

        {/* Aggregated Summary Metric Cards */}
        <div style={{
          padding: "14px 20px",
          background: "#FFFFFF",
          borderBottom: "1px solid var(--sd-zinc-200)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "10px"
        }}>
          {/* Card 1: Total Outflow */}
          <div style={{
            background: "var(--sd-zinc-50)",
            borderRadius: "10px",
            border: "1px solid var(--sd-zinc-200)",
            padding: "10px 14px"
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>
              Total Outflows
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "4px" }}>
              {formatCurrency(stats.totalOutflow)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)", marginTop: "2px" }}>
              {stats.totalEntries} Bills & Vouchers
            </div>
          </div>

          {/* Card 2: Raw Materials Mandi Spend */}
          <div style={{
            background: "#FFF7ED",
            borderRadius: "10px",
            border: "1px solid #FED7AA",
            padding: "10px 14px"
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#9A3412", textTransform: "uppercase" }}>
              Raw Materials Mandi
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#6B1414", marginTop: "4px" }}>
              {formatCurrency(stats.rawMaterialsTotal)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#9A3412", marginTop: "2px" }}>
              {stats.rawMaterialsCount} Procurement Bills
            </div>
          </div>

          {/* Card 3: Operational Expenses */}
          <div style={{
            background: "#FFE4E6",
            borderRadius: "10px",
            border: "1px solid #FECDD3",
            padding: "10px 14px"
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#9F1239", textTransform: "uppercase" }}>
              Operational Expenses
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#9F1239", marginTop: "4px" }}>
              {formatCurrency(stats.otherExpensesTotal)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#9F1239", marginTop: "2px" }}>
              {stats.otherExpensesCount} General Vouchers
            </div>
          </div>

          {/* Card 4: Billing Revenue (Same Period) */}
          <div style={{
            background: "#F0FDF4",
            borderRadius: "10px",
            border: "1px solid #BBF7D0",
            padding: "10px 14px"
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "#166534", textTransform: "uppercase" }}>
              Billing Revenue (Period)
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#15803D", marginTop: "4px" }}>
              {formatCurrency(stats.periodRevenue)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#166534", marginTop: "2px" }}>
              From {stats.periodOrdersCount} Orders
            </div>
          </div>

          {/* Card 5: Net Operating Margin */}
          <div style={{
            background: stats.netProfit >= 0 ? "#F8FAFC" : "#FEF2F2",
            borderRadius: "10px",
            border: `1px solid ${stats.netProfit >= 0 ? "#E2E8F0" : "#FECACA"}`,
            padding: "10px 14px"
          }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 800, color: stats.netProfit >= 0 ? "#334155" : "#991B1B", textTransform: "uppercase" }}>
              Net Operating Margin
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: stats.netProfit >= 0 ? "var(--sd-green)" : "#DC2626", marginTop: "4px" }}>
              {formatCurrency(stats.netProfit)}
            </div>
            <div style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)", marginTop: "2px" }}>
              Margin: <strong>{stats.profitMargin}%</strong>
            </div>
          </div>
        </div>

        {/* View Tabs Header */}
        <div style={{
          padding: "8px 20px",
          background: "#FFFFFF",
          borderBottom: "1px solid var(--sd-zinc-200)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <button
            type="button"
            onClick={() => setActiveViewTab("register")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 800,
              background: activeViewTab === "register" ? "var(--sd-black)" : "transparent",
              color: activeViewTab === "register" ? "#FFFFFF" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Receipt size={14} />
            <span>Purchases & Expenses Register ({filteredExpenses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("raw_materials")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 800,
              background: activeViewTab === "raw_materials" ? "#6B1414" : "transparent",
              color: activeViewTab === "raw_materials" ? "#FFFFFF" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Boxes size={14} />
            <span>Raw Materials Procured ({stats.rawMaterialsList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveViewTab("categories")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: 800,
              background: activeViewTab === "categories" ? "#9F1239" : "transparent",
              color: activeViewTab === "categories" ? "#FFFFFF" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Tag size={14} />
            <span>Category Breakdown ({stats.categoryList.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {/* TAB 1: PURCHASES & EXPENSES REGISTER */}
          {activeViewTab === "register" && (
            <div>
              {filteredExpenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--sd-zinc-500)" }}>
                  <Receipt size={36} color="var(--sd-zinc-400)" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>No purchase or expense records match this filter.</p>
                  <p style={{ fontSize: "0.78rem", marginTop: "4px" }}>Try adjusting the date range, category, or outflow type.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid var(--sd-zinc-200)", borderRadius: "10px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ background: "var(--sd-zinc-100)", color: "var(--sd-zinc-700)", textAlign: "left", borderBottom: "1px solid var(--sd-zinc-200)" }}>
                        <th style={{ padding: "8px 10px", width: "40px", textAlign: "center" }}>#</th>
                        <th style={{ padding: "8px 10px", width: "95px" }}>Date</th>
                        <th style={{ padding: "8px 10px", width: "110px" }}>Bill / Voucher #</th>
                        <th style={{ padding: "8px 10px", width: "125px" }}>Type / Category</th>
                        <th style={{ padding: "8px 10px" }}>Supplier / Paid To</th>
                        <th style={{ padding: "8px 10px" }}>Items / Description</th>
                        <th style={{ padding: "8px 10px", width: "85px", textAlign: "center" }}>Mode</th>
                        <th style={{ padding: "8px 10px", width: "110px", textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((exp, idx) => {
                        const isRawMaterial = exp.expenseType === "raw_material" || exp.category === "Raw Materials";
                        const dateStr = getExpenseDateStr(exp);
                        const billNo = exp.invoiceNumber || exp.billNumber || "-";
                        const party = exp.supplierName || exp.paidTo || "-";
                        const amt = Number(exp.amount) || 0;

                        let itemsDesc = "";
                        if (isRawMaterial && Array.isArray(exp.items) && exp.items.length > 0) {
                          itemsDesc = exp.items.map(it => `${it.name} (${it.quantity} ${it.unit || "Kg"})`).join(", ");
                        } else {
                          itemsDesc = exp.title || exp.notes || "-";
                        }

                        return (
                          <tr 
                            key={exp.id || idx}
                            style={{ 
                              borderBottom: "1px solid var(--sd-zinc-200)",
                              background: idx % 2 === 0 ? "#FFFFFF" : "var(--sd-zinc-50)"
                            }}
                          >
                            <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--sd-zinc-500)", fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: "8px 10px", whiteSpace: "nowrap", color: "var(--sd-zinc-700)" }}>
                              {formatDate(dateStr)}
                            </td>
                            <td style={{ padding: "8px 10px", fontFamily: "monospace", fontWeight: 700, color: "var(--sd-black)" }}>
                              {billNo}
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "3px 8px",
                                borderRadius: "6px",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                background: isRawMaterial ? "#FFEDD5" : "#F4F4F5",
                                color: isRawMaterial ? "#6B1414" : "var(--sd-zinc-800)",
                                border: isRawMaterial ? "1px solid #FED7AA" : "1px solid var(--sd-zinc-300)"
                              }}>
                                {isRawMaterial ? "Raw Material" : (exp.category || "General")}
                              </span>
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <div style={{ fontWeight: 700, color: "var(--sd-black)" }}>
                                {party}
                              </div>
                              {exp.supplierPhone && (
                                <div style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)" }}>
                                  {exp.supplierPhone}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "8px 10px", color: "var(--sd-zinc-700)", maxWidth: "260px" }}>
                              <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }} title={itemsDesc}>
                                {itemsDesc}
                              </div>
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--sd-zinc-600)" }}>
                              {exp.paymentMode || "Cash"}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 900, color: isRawMaterial ? "#6B1414" : "#9F1239" }}>
                              {formatCurrency(amt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "var(--sd-zinc-100)", fontWeight: 900, borderTop: "2px solid var(--sd-black)" }}>
                        <td colSpan="7" style={{ padding: "10px", textAlign: "right", fontSize: "0.82rem" }}>
                          TOTAL OUTFLOW ({filteredExpenses.length} Records):
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", fontSize: "0.95rem", color: "var(--sd-black)" }}>
                          {formatCurrency(stats.totalOutflow)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: RAW MATERIALS PROCURED BREAKDOWN */}
          {activeViewTab === "raw_materials" && (
            <div>
              {stats.rawMaterialsList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--sd-zinc-500)" }}>
                  <Boxes size={36} color="var(--sd-zinc-400)" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>No raw material procurement items found in selected period.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid var(--sd-zinc-200)", borderRadius: "10px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ background: "#FFEDD5", color: "#6B1414", textAlign: "left", borderBottom: "1px solid #FED7AA" }}>
                        <th style={{ padding: "8px 10px", width: "40px", textAlign: "center" }}>#</th>
                        <th style={{ padding: "8px 10px" }}>Raw Spice Material</th>
                        <th style={{ padding: "8px 10px", width: "110px" }}>HSN Code</th>
                        <th style={{ padding: "8px 10px", width: "110px", textAlign: "right" }}>Bills Count</th>
                        <th style={{ padding: "8px 10px", width: "140px", textAlign: "right" }}>Total Quantity Procured</th>
                        <th style={{ padding: "8px 10px", width: "120px", textAlign: "right" }}>Avg Unit Rate</th>
                        <th style={{ padding: "8px 10px", width: "130px", textAlign: "right" }}>Total Spend</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.rawMaterialsList.map((rm, idx) => {
                        const avgRate = rm.totalQuantity > 0 ? (rm.totalSpend / rm.totalQuantity) : 0;
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--sd-zinc-200)", background: idx % 2 === 0 ? "#FFFFFF" : "var(--sd-zinc-50)" }}>
                            <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--sd-zinc-500)", fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: "8px 10px" }}>
                              <span style={{ fontWeight: 800, color: "var(--sd-black)" }}>{rm.name}</span>
                              {rm.tamilName && (
                                <span style={{ marginLeft: "6px", fontSize: "0.72rem", color: "#6B1414" }}>
                                  ({rm.tamilName})
                                </span>
                              )}
                            </td>
                            <td style={{ padding: "8px 10px", fontFamily: "monospace", color: "#6B1414", fontWeight: 700 }}>
                              {rm.hsnCode}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--sd-zinc-700)" }}>
                              {rm.billCount} bills
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "var(--sd-black)" }}>
                              {rm.totalQuantity.toLocaleString()} {rm.unit}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--sd-zinc-700)" }}>
                              {formatCurrency(avgRate)} / {rm.unit}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 900, color: "#6B1414" }}>
                              {formatCurrency(rm.totalSpend)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#FFEDD5", fontWeight: 900, borderTop: "2px solid #6B1414" }}>
                        <td colSpan="6" style={{ padding: "10px", textAlign: "right", fontSize: "0.82rem", color: "#6B1414" }}>
                          TOTAL RAW MATERIAL PROCURED:
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", fontSize: "0.95rem", color: "#6B1414" }}>
                          {formatCurrency(stats.rawMaterialsTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CATEGORY-WISE OPERATIONAL EXPENSE BREAKDOWN */}
          {activeViewTab === "categories" && (
            <div>
              {stats.categoryList.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--sd-zinc-500)" }}>
                  <Tag size={36} color="var(--sd-zinc-400)" style={{ margin: "0 auto 8px auto" }} />
                  <p style={{ fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>No operational expense categories found in selected period.</p>
                </div>
              ) : (
                <div style={{ overflowX: "auto", border: "1px solid var(--sd-zinc-200)", borderRadius: "10px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                    <thead>
                      <tr style={{ background: "#FFE4E6", color: "#9F1239", textAlign: "left", borderBottom: "1px solid #FECDD3" }}>
                        <th style={{ padding: "8px 10px", width: "40px", textAlign: "center" }}>#</th>
                        <th style={{ padding: "8px 10px" }}>Operational Expense Category</th>
                        <th style={{ padding: "8px 10px", width: "120px", textAlign: "right" }}>Vouchers Count</th>
                        <th style={{ padding: "8px 10px", width: "150px", textAlign: "right" }}>% Share of Operating Spend</th>
                        <th style={{ padding: "8px 10px", width: "140px", textAlign: "right" }}>Total Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.categoryList.map((cat, idx) => {
                        const pct = stats.otherExpensesTotal > 0 
                          ? ((cat.totalAmount / stats.otherExpensesTotal) * 100).toFixed(1) 
                          : "0.0";
                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--sd-zinc-200)", background: idx % 2 === 0 ? "#FFFFFF" : "var(--sd-zinc-50)" }}>
                            <td style={{ padding: "8px 10px", textAlign: "center", color: "var(--sd-zinc-500)", fontWeight: 600 }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-black)" }}>
                              {cat.category}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--sd-zinc-700)" }}>
                              {cat.count} vouchers
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right" }}>
                              <span style={{
                                display: "inline-block",
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: "#FFE4E6",
                                color: "#9F1239",
                                fontWeight: 800,
                                fontSize: "0.72rem"
                              }}>
                                {pct}%
                              </span>
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 900, color: "#9F1239" }}>
                              {formatCurrency(cat.totalAmount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: "#FFE4E6", fontWeight: 900, borderTop: "2px solid #9F1239" }}>
                        <td colSpan="4" style={{ padding: "10px", textAlign: "right", fontSize: "0.82rem", color: "#9F1239" }}>
                          TOTAL OPERATIONAL EXPENSES:
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", fontSize: "0.95rem", color: "#9F1239" }}>
                          {formatCurrency(stats.otherExpensesTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: "12px 20px",
          background: "var(--sd-zinc-50)",
          borderTop: "1px solid var(--sd-zinc-200)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: "0.75rem",
          color: "var(--sd-zinc-500)"
        }}>
          <div>
            Period: <strong>{startDate && endDate ? `${startDate} to ${endDate}` : datePreset.toUpperCase()}</strong> &bull; Total Spend: <strong style={{ color: "var(--sd-black)" }}>{formatCurrency(stats.totalOutflow)}</strong>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: "6px 16px", fontSize: "0.78rem" }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

