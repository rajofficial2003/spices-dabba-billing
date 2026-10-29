import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  FileText, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  Upload, 
  Calendar, 
  Fuel, 
  Truck, 
  Users, 
  Package, 
  Layers, 
  Zap, 
  Wrench, 
  Receipt, 
  X, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  HelpCircle,
  Image as ImageIcon,
  Boxes,
  Phone,
  Hash,
  ShoppingBag,
  Settings,
  Tag,
  Edit2,
  Loader2
} from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";
import { compressImage, formatBytes } from "../utils/imageCompressor";
import DateRangePicker from "./DateRangePicker";

// PDF Detection Helpers
const isPdfFile = (file) => {
  if (!file) return false;
  return file.type === "application/pdf" || (file.name && file.name.toLowerCase().endsWith(".pdf"));
};

const isPdfUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const clean = url.toLowerCase().split("?")[0];
  return clean.endsWith(".pdf") || url.includes("application/pdf") || url.includes(".pdf") || url.startsWith("data:application/pdf");
};

// Quick 12 standard spices raw material templates for 1-click loading if catalog is empty
const QUICK_SPICE_TEMPLATES = [
  { name: "Red Chilli (Guntur)", tamilName: "குண்டூர் வரமிளகாய்", hsnCode: "0904 21 10", unit: "Kg", standardRate: 190 },
  { name: "Coriander Seeds (Dhaniya)", tamilName: "கொத்தமல்லி விதை", hsnCode: "0909 21 00", unit: "Kg", standardRate: 125 },
  { name: "Cumin Seeds (Jeera)", tamilName: "சீரகம்", hsnCode: "0909 31 19", unit: "Kg", standardRate: 340 },
  { name: "Black Pepper", tamilName: "கருப்பு மிளகு", hsnCode: "0904 11 10", unit: "Kg", standardRate: 620 },
  { name: "Turmeric Finger (Haldi)", tamilName: "விரலி மஞ்சள்", hsnCode: "0910 30 20", unit: "Kg", standardRate: 170 },
  { name: "Mustard Seeds (Kadugu)", tamilName: "கடுகு", hsnCode: "1207 50 00", unit: "Kg", standardRate: 95 },
  { name: "Fenugreek Seeds (Vendhayam)", tamilName: "வெந்தயம்", hsnCode: "0910 99 12", unit: "Kg", standardRate: 85 },
  { name: "Fennel Seeds (Sombu)", tamilName: "பெருஞ்சீரகம் / சோம்பு", hsnCode: "0909 61 11", unit: "Kg", standardRate: 210 },
  { name: "Cardamom (Elaichi)", tamilName: "ஏலக்காய்", hsnCode: "0908 31 10", unit: "Kg", standardRate: 2400 },
  { name: "Cloves (Lavangam)", tamilName: "கிராம்பு", hsnCode: "0907 10 00", unit: "Kg", standardRate: 980 },
  { name: "Cinnamon (Pattai)", tamilName: "பட்டை", hsnCode: "0906 11 10", unit: "Kg", standardRate: 320 },
  { name: "Asafoetida (Perungayam)", tamilName: "பெருங்காயம்", hsnCode: "1301 90 13", unit: "Kg", standardRate: 1100 }
];

export default function FinanceERP() {
  const { 
    orders = [], 
    expenses = [], 
    rawMaterials = [],
    categories = [],
    expenseCategories = [],
    suppliers = [],
    addRawMaterial,
    addExpense, 
    updateExpense,
    deleteExpense,
    addExpenseCategory,
    updateExpenseCategory,
    deleteExpenseCategory,
    showConfirmModal
  } = usePOS();

  // Primary Split Switcher: "raw_materials" or "other_expenses"
  const [activeSection, setActiveSection] = useState("raw_materials"); // 'raw_materials' or 'other_expenses'
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Date Filtering State
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handlePresetClick = (presetId) => {
    setDatePreset(presetId);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (presetId === "all") {
      setStartDate("");
      setEndDate("");
    } else if (presetId === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetId === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (presetId === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 6);
      const wStr = `${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, "0")}-${String(w.getDate()).padStart(2, "0")}`;
      setStartDate(wStr);
      setEndDate(todayStr);
    } else if (presetId === "month") {
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDate(mStr);
      setEndDate(todayStr);
    }
  };

  const handleClearDateFilter = () => {
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
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

  // Modals & Editing States
  const [showRawMaterialModal, setShowRawMaterialModal] = useState(false);
  const [showOtherExpenseModal, setShowOtherExpenseModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [existingProofUrl, setExistingProofUrl] = useState(null);
  const [showQuickAddRMModal, setShowQuickAddRMModal] = useState(false);
  const [showCategoryManagerModal, setShowCategoryManagerModal] = useState(false);
  const [targetRowForNewRM, setTargetRowForNewRM] = useState(null);
  const [previewProofUrl, setPreviewProofUrl] = useState(null);
  const [expandedBillId, setExpandedBillId] = useState(null);

  // Status & Feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [formError, setFormError] = useState("");

  // Dynamic Category Manager Form State
  const [newCatName, setNewCatName] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");

  // Quick Add Raw Material Product Form State
  const [quickRMForm, setQuickRMForm] = useState({
    name: "",
    tamilName: "",
    hsnCode: "0910 91 00",
    unit: "Kg",
    standardRate: ""
  });

  // ==========================================
  // RAW MATERIAL PURCHASE BILL FORM STATE (Single Bill with Multiple Products)
  // ==========================================
  const [rawBillData, setRawBillData] = useState({
    supplierName: "",
    supplierPhone: "",
    invoiceNumber: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    notes: ""
  });

  // Multiple item rows inside the single raw material purchase bill
  const [rawBillItems, setRawBillItems] = useState([
    {
      rawMaterialId: "",
      name: "",
      hsnCode: "0910 91 00",
      quantity: 1,
      unit: "Kg",
      unitPrice: ""
    }
  ]);

  // ==========================================
  // OTHER EXPENSE FORM STATE
  // ==========================================
  const [otherExpenseData, setOtherExpenseData] = useState({
    category: "",
    title: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    paymentMode: "Cash",
    paidTo: "",
    notes: ""
  });

  // Proof Image Upload State (shared by both modals)
  const [selectedFile, setSelectedFile] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // ==========================================
  // FINANCIAL CALCULATIONS (WITH DATE FILTERING)
  // ==========================================
  const dateFilteredExpenses = expenses.filter(exp => {
    if (startDate || endDate) {
      const d = getExpenseDateStr(exp);
      if (startDate && d && d < startDate) return false;
      if (endDate && d && d > endDate) return false;
    }
    return true;
  });

  const dateFilteredOrders = orders.filter(o => {
    if (o.status !== "completed") return false;
    if (startDate || endDate) {
      const d = getOrderDateStr(o);
      if (startDate && d && d < startDate) return false;
      if (endDate && d && d > endDate) return false;
    }
    return true;
  });

  const completedOrders = dateFilteredOrders;
  const totalBillingIncome = completedOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  
  // Raw Material Purchases vs Other Expenses (Date filtered)
  const rawMaterialBills = dateFilteredExpenses.filter(e => e.expenseType === "raw_material" || e.category === "Raw Materials");
  const rawMaterialsTotal = rawMaterialBills.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  
  const otherExpensesList = dateFilteredExpenses.filter(e => e.expenseType !== "raw_material" && e.category !== "Raw Materials");
  const otherExpensesTotal = otherExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  const totalAllExpenses = rawMaterialsTotal + otherExpensesTotal;
  const netProfit = totalBillingIncome - totalAllExpenses;
  const profitMarginPercent = totalBillingIncome > 0 ? ((netProfit / totalBillingIncome) * 100).toFixed(1) : 0;

  // ==========================================
  // MULTI-ITEM RAW MATERIAL ROW HANDLERS
  // ==========================================
  const handleAddRawItemRow = () => {
    setRawBillItems(prev => [
      ...prev,
      {
        rawMaterialId: "",
        name: "",
        hsnCode: "0910 91 00",
        quantity: 1,
        unit: "Kg",
        unitPrice: ""
      }
    ]);
  };

  const handleRemoveRawItemRow = (index) => {
    if (rawBillItems.length <= 1) return;
    setRawBillItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // When a raw material product is chosen from the dropdown:
  // Auto-populates the Name, HSN Code, Unit, and standard rate!
  const handleRawItemChange = (index, field, value) => {
    setRawBillItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === "rawMaterialId") {
        item.rawMaterialId = value;
        const matched = rawMaterials.find(r => r.id === value);
        if (matched) {
          item.name = matched.name;
          item.hsnCode = matched.hsnCode || "0910 91 00";
          item.unit = matched.unit || "Kg";
          if (matched.standardRate) {
            item.unitPrice = matched.standardRate;
          }
        }
      } else {
        item[field] = value;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Quick 1-click loading of standard spices if catalog is empty
  const handleSeedStandardSpices = async () => {
    setIsSubmitting(true);
    try {
      for (const t of QUICK_SPICE_TEMPLATES) {
        const exists = rawMaterials.some(r => r.name.toLowerCase() === t.name.toLowerCase());
        if (!exists) {
          await addRawMaterial({
            name: t.name,
            tamilName: t.tamilName,
            hsnCode: t.hsnCode,
            unit: t.unit,
            standardRate: t.standardRate,
            notes: "Standard Mandi spice item"
          });
        }
      }
      showToast("Loaded 12 standard raw materials with HSN codes!");
    } catch (err) {
      alert("Error loading spices: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Save a new raw material to catalog from inside the bill modal
  const handleQuickSaveRawMaterial = async (e) => {
    e.preventDefault();
    if (!quickRMForm.name.trim()) {
      alert("Raw material product name is required!");
      return;
    }
    if (!quickRMForm.hsnCode.trim()) {
      alert("HSN Code is required!");
      return;
    }

    try {
      const created = await addRawMaterial(quickRMForm);
      if (targetRowForNewRM !== null) {
        handleRawItemChange(targetRowForNewRM, "rawMaterialId", created.id);
      }
      setShowQuickAddRMModal(false);
      setQuickRMForm({
        name: "",
        tamilName: "",
        hsnCode: "0910 91 00",
        unit: "Kg",
        standardRate: ""
      });
      showToast(`Added "${created.name}" [HSN: ${created.hsnCode}] to catalog & selected!`);
    } catch (err) {
      alert("Error saving raw material: " + err.message);
    }
  };

  // ==========================================
  // DYNAMIC CATEGORY MANAGEMENT HANDLERS
  // ==========================================
  const handleAddCategorySubmit = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await addExpenseCategory({ name: newCatName.trim() });
      setOtherExpenseData(prev => ({ ...prev, category: newCatName.trim() }));
      setNewCatName("");
      showToast(`Expense category "${newCatName.trim()}" added!`);
    } catch (err) {
      alert("Error adding category: " + err.message);
    }
  };

  const handleUpdateCategorySubmit = async (id) => {
    if (!editingCatName.trim()) return;
    try {
      await updateExpenseCategory(id, { name: editingCatName.trim() });
      setEditingCatId(null);
      setEditingCatName("");
      showToast("Category updated!");
    } catch (err) {
      alert("Error updating category: " + err.message);
    }
  };

  const handleDeleteCategoryClick = async (id, name) => {
    const ok = await showConfirmModal({
      title: "Delete Category",
      message: `Are you sure you want to delete category "${name}"?`,
      confirmText: "Delete Category",
      isDanger: true
    });
    if (!ok) return;

    try {
      await deleteExpenseCategory(id);
      if (categoryFilter === name) setCategoryFilter("all");
      showToast("Category removed.");
    } catch (err) {
      alert("Error deleting category: " + err.message);
    }
  };

  // Grand total for the active Raw Material Bill being recorded
  const rawBillGrandTotal = rawBillItems.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    return sum + (qty * price);
  }, 0);

  // ==========================================
  // PROOF IMAGE SELECTION & INSTANT WEBP COMPRESSION
  // ==========================================
  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Direct support for PDF bills & invoices without image compression
    if (isPdfFile(file)) {
      setSelectedFile(file);
      setCompressionStats({
        originalSize: file.size,
        compressedSize: file.size,
        savingsPercent: 0,
        isPdf: true,
        fileName: file.name,
        previewUrl: URL.createObjectURL(file)
      });
      return;
    }

    try {
      setIsCompressing(true);
      const originalSize = file.size;
      const compressedBlob = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
      const compressedSize = compressedBlob.size;

      const compressedFile = new File(
        [compressedBlob], 
        file.name.replace(/\.[^/.]+$/, "") + ".webp", 
        { type: "image/webp" }
      );

      setSelectedFile(compressedFile);
      setCompressionStats({
        originalSize,
        compressedSize,
        savingsPercent: Math.round(((originalSize - compressedSize) / originalSize) * 100),
        isPdf: false,
        fileName: compressedFile.name,
        previewUrl: URL.createObjectURL(compressedBlob)
      });
    } catch (err) {
      console.warn("Compression warning:", err);
      setSelectedFile(file);
      setCompressionStats({
        originalSize: file.size,
        compressedSize: file.size,
        savingsPercent: 0,
        isPdf: isPdfFile(file),
        fileName: file.name,
        previewUrl: URL.createObjectURL(file)
      });
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setCompressionStats(null);
  };

  // ==========================================
  // OPEN & EDIT RAW MATERIAL PURCHASE MODAL
  // ==========================================
  const handleOpenRawMaterialModal = () => {
    setEditingExpenseId(null);
    setExistingProofUrl(null);
    const activeSup = suppliers.find(s => s.isActive !== false);

    setRawBillData({
      supplierName: activeSup ? activeSup.name : "",
      supplierPhone: activeSup ? activeSup.phone : "",
      invoiceNumber: "",
      date: new Date().toISOString().split("T")[0],
      paymentMode: "Cash",
      notes: ""
    });

    const firstRM = rawMaterials.length > 0 ? rawMaterials[0] : null;

    setRawBillItems([
      {
        rawMaterialId: firstRM ? firstRM.id : "",
        name: firstRM ? firstRM.name : "",
        hsnCode: firstRM?.hsnCode || "0910 91 00",
        quantity: 1,
        unit: firstRM?.unit || "Kg",
        unitPrice: firstRM?.standardRate || ""
      }
    ]);
    setSelectedFile(null);
    setCompressionStats(null);
    setFormError("");
    setShowRawMaterialModal(true);
  };

  const handleStartEditRawBill = (bill) => {
    setEditingExpenseId(bill.id);
    setExistingProofUrl(bill.proofUrl || null);
    setRawBillData({
      supplierName: bill.supplierName || bill.paidTo || "",
      supplierPhone: bill.supplierPhone || "",
      invoiceNumber: bill.invoiceNumber || "",
      date: bill.date || new Date().toISOString().split("T")[0],
      paymentMode: bill.paymentMode || "Cash",
      notes: bill.notes || ""
    });

    if (bill.items && bill.items.length > 0) {
      setRawBillItems(bill.items.map(itm => ({
        rawMaterialId: itm.rawMaterialId || "",
        name: itm.name || "",
        hsnCode: itm.hsnCode || "0910 91 00",
        quantity: itm.quantity || 1,
        unit: itm.unit || "Kg",
        unitPrice: itm.unitPrice || ""
      })));
    } else {
      setRawBillItems([
        {
          rawMaterialId: "",
          name: bill.title || "",
          hsnCode: "0910 91 00",
          quantity: 1,
          unit: "Kg",
          unitPrice: bill.amount || ""
        }
      ]);
    }

    setSelectedFile(null);
    setCompressionStats(null);
    setFormError("");
    setShowRawMaterialModal(true);
  };

  // ==========================================
  // OPEN & EDIT OTHER EXPENSE MODAL
  // ==========================================
  const handleOpenOtherExpenseModal = () => {
    setEditingExpenseId(null);
    setExistingProofUrl(null);
    const defaultCat = expenseCategories[0]?.name || "General Misc";
    setOtherExpenseData({
      category: defaultCat,
      title: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      paymentMode: "Cash",
      paidTo: "",
      notes: ""
    });
    setSelectedFile(null);
    setCompressionStats(null);
    setFormError("");
    setShowOtherExpenseModal(true);
  };

  const handleStartEditOtherExpense = (exp) => {
    setEditingExpenseId(exp.id);
    setExistingProofUrl(exp.proofUrl || null);
    setOtherExpenseData({
      category: exp.category || exp.categoryName || expenseCategories[0]?.name || "General Misc",
      title: exp.title || "",
      amount: exp.amount || "",
      date: exp.date || new Date().toISOString().split("T")[0],
      paymentMode: exp.paymentMode || "Cash",
      paidTo: exp.paidTo || "",
      notes: exp.notes || ""
    });

    setSelectedFile(null);
    setCompressionStats(null);
    setFormError("");
    setShowOtherExpenseModal(true);
  };

  // ==========================================
  // SUBMIT RAW MATERIAL PURCHASE BILL
  // ==========================================
  const handleSubmitRawMaterialBill = async (e) => {
    e.preventDefault();
    if (!rawBillData.supplierName.trim()) {
      setFormError("Please select or enter the Supplier.");
      return;
    }

    if (rawBillItems.length === 0) {
      setFormError("Please add at least one raw material to this bill.");
      return;
    }

    // Validate that each item is selected from product management
    for (let i = 0; i < rawBillItems.length; i++) {
      const itm = rawBillItems[i];
      if (!itm.rawMaterialId || !itm.name.trim()) {
        setFormError(`Item #${i + 1}: Please select a raw material product from the dropdown.`);
        return;
      }
      if (!itm.hsnCode || !itm.hsnCode.trim()) {
        setFormError(`Item #${i + 1} (${itm.name}): HSN Code is mandatory.`);
        return;
      }
      if (!itm.unitPrice || Number(itm.unitPrice) <= 0) {
        setFormError(`Item #${i + 1} (${itm.name}): Please enter valid rate per unit.`);
        return;
      }
      if (!itm.quantity || Number(itm.quantity) <= 0) {
        setFormError(`Item #${i + 1} (${itm.name}): Please enter valid quantity.`);
        return;
      }
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const formattedItems = rawBillItems.map(itm => ({
        rawMaterialId: itm.rawMaterialId,
        name: itm.name.trim(),
        hsnCode: itm.hsnCode?.trim() || "0910 91 00",
        quantity: Number(itm.quantity) || 1,
        unit: itm.unit || "Kg",
        unitPrice: Number(itm.unitPrice) || 0,
        total: (Number(itm.quantity) || 1) * (Number(itm.unitPrice) || 0)
      }));

      const payload = {
        expenseType: "raw_material",
        category: "Raw Materials",
        categoryId: "raw-materials",
        categoryName: "Raw Materials",
        title: `Raw Materials: ${rawBillData.supplierName.trim()} (${formattedItems.length} items)`,
        amount: rawBillGrandTotal,
        supplierName: rawBillData.supplierName.trim(),
        paidTo: rawBillData.supplierName.trim(),
        supplierPhone: rawBillData.supplierPhone?.trim() || "",
        invoiceNumber: rawBillData.invoiceNumber?.trim() || "",
        date: rawBillData.date,
        paymentMode: rawBillData.paymentMode,
        items: formattedItems,
        notes: rawBillData.notes?.trim() || ""
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, payload, selectedFile);
        showToast(`Purchase bill updated successfully!`);
      } else {
        await addExpense(payload, selectedFile);
        showToast(`Raw Material Bill of ${formatCurrency(rawBillGrandTotal)} recorded!`);
      }
      setEditingExpenseId(null);
      setExistingProofUrl(null);
      setShowRawMaterialModal(false);
    } catch (err) {
      setFormError(err.message || "Failed to save raw material purchase.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================
  // SUBMIT OTHER EXPENSE
  // ==========================================
  const handleSubmitOtherExpense = async (e) => {
    e.preventDefault();
    if (!otherExpenseData.title.trim()) {
      setFormError("Please enter the expense description or paid to.");
      return;
    }
    if (!otherExpenseData.amount || Number(otherExpenseData.amount) <= 0) {
      setFormError("Please enter a valid expense amount.");
      return;
    }

    setIsSubmitting(true);
    setFormError("");

    try {
      const catName = otherExpenseData.category.trim() || expenseCategories[0]?.name || "General Misc";
      const catObj = expenseCategories.find(c => c.name === catName || c.id === catName);

      const payload = {
        expenseType: "other",
        category: catName,
        categoryId: catObj?.id || "cat_general",
        categoryName: catName,
        title: otherExpenseData.title.trim(),
        amount: Number(otherExpenseData.amount),
        date: otherExpenseData.date,
        paymentMode: otherExpenseData.paymentMode,
        paidTo: otherExpenseData.paidTo?.trim() || "",
        notes: otherExpenseData.notes?.trim() || ""
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, payload, selectedFile);
        showToast(`Expense updated successfully!`);
      } else {
        await addExpense(payload, selectedFile);
        showToast(`Expense of ${formatCurrency(payload.amount)} recorded!`);
      }
      setEditingExpenseId(null);
      setExistingProofUrl(null);
      setShowOtherExpenseModal(false);
    } catch (err) {
      setFormError(err.message || "Failed to save expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete an expense or raw material bill
  const handleDelete = async (id, title) => {
    const ok = await showConfirmModal({
      title: "Delete Expense Record",
      message: `Are you sure you want to delete "${title || 'this entry'}"? This will permanently delete this record from your ERP tracker.`,
      confirmText: "Delete Record",
      isDanger: true
    });
    if (!ok) return;

    try {
      await deleteExpense(id);
      showToast("Record removed.");
    } catch (err) {
      alert("Error deleting record: " + err.message);
    }
  };

  // ==========================================
  // FILTERING
  // ==========================================
  const filteredRawBills = rawMaterialBills.filter(bill => {
    const q = searchQuery.toLowerCase();
    const vendorMatch = (bill.supplierName || "").toLowerCase().includes(q);
    const catMatch = (bill.categoryName || bill.category || "").toLowerCase().includes(q);
    const subcatMatch = (bill.subcategory || "").toLowerCase().includes(q);
    const invMatch = (bill.invoiceNumber || "").toLowerCase().includes(q);
    const itemMatch = (bill.items || []).some(itm => (itm.name || "").toLowerCase().includes(q));
    return vendorMatch || catMatch || subcatMatch || invMatch || itemMatch;
  });

  const filteredOtherExpenses = otherExpensesList.filter(exp => {
    if (categoryFilter !== "all" && exp.category !== categoryFilter && exp.categoryName !== categoryFilter && exp.categoryId !== categoryFilter) return false;
    const q = searchQuery.toLowerCase();
    const titleMatch = (exp.title || "").toLowerCase().includes(q);
    const catMatch = (exp.category || "").toLowerCase().includes(q) || (exp.categoryName || "").toLowerCase().includes(q);
    const subcatMatch = (typeof exp.subcategory === "string" ? exp.subcategory : (exp.subcategory?.name || "")).toLowerCase().includes(q);
    const paidToMatch = (exp.paidTo || "").toLowerCase().includes(q);
    return titleMatch || catMatch || subcatMatch || paidToMatch;
  });

  return (
    <div className="responsive-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "var(--sd-black)",
          color: "#FFFFFF",
          padding: "12px 20px",
          borderRadius: "10px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "0.85rem",
          fontWeight: 700,
          zIndex: 9999,
          animation: "fadeIn 0.2s ease-in-out"
        }}>
          <CheckCircle2 size={16} color="var(--sd-green)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Title & Executive KPI Bar */}
      <div style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Receipt size={24} color="var(--sd-red)" />
              <h1 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--sd-black)", margin: 0 }}>
                Purchase & Expenses
              </h1>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "3px" }}>
              Track Billing Revenue, Raw Material Mandi Purchases with HSN codes, and Daily Operational Expenses.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              type="button"
              onClick={handleOpenRawMaterialModal}
              style={{
                background: "#6B1414",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "9px 18px",
                fontSize: "0.84rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(107,20,20,0.25)"
              }}
            >
              <Boxes size={16} />
              <span>Record Raw Material Bill</span>
            </button>

            <button
              type="button"
              onClick={handleOpenOtherExpenseModal}
              style={{
                background: "var(--sd-black)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "10px",
                padding: "9px 18px",
                fontSize: "0.84rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
              }}
            >
              <Receipt size={16} />
              <span>Record Other Expense</span>
            </button>
          </div>
        </div>

        {/* 4 Executive KPI Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "12px"
        }}>
          {/* Card 1: Billing Inflow */}
          <div style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid var(--sd-zinc-200)",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>
                Total Billing Revenue
              </span>
              <div style={{ background: "#DCFCE7", color: "#15803D", padding: "6px", borderRadius: "8px" }}>
                <TrendingUp size={16} />
              </div>
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "8px" }}>
              {formatCurrency(totalBillingIncome)}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", marginTop: "4px" }}>
              From <strong>{completedOrders.length}</strong> finalized orders
            </div>
          </div>

          {/* Card 2: Raw Materials Outflow */}
          <div style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #FED7AA",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#6B1414", textTransform: "uppercase" }}>
                Raw Materials Procured
              </span>
              <div style={{ background: "#FFEDD5", color: "#C2410C", padding: "6px", borderRadius: "8px" }}>
                <Boxes size={16} />
              </div>
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#6B1414", marginTop: "8px" }}>
              {formatCurrency(rawMaterialsTotal)}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", marginTop: "4px" }}>
              <strong>{rawMaterialBills.length}</strong> mandi purchase bills
            </div>
          </div>

          {/* Card 3: Other Operational Expenses */}
          <div style={{
            background: "#FFFFFF",
            borderRadius: "12px",
            border: "1px solid #FECDD3",
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#9F1239", textTransform: "uppercase" }}>
                Daily Operational Outflow
              </span>
              <div style={{ background: "#FFE4E6", color: "#E11D48", padding: "6px", borderRadius: "8px" }}>
                <TrendingDown size={16} />
              </div>
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 900, color: "#9F1239", marginTop: "8px" }}>
              {formatCurrency(otherExpensesTotal)}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", marginTop: "4px" }}>
              Petrol, Tempo, Salaries & Utilities
            </div>
          </div>

          {/* Card 4: Net Operating Margin */}
          <div style={{
            background: netProfit >= 0 ? "#F0FDF4" : "#FEF2F2",
            borderRadius: "12px",
            border: `1px solid ${netProfit >= 0 ? "#BBF7D0" : "#FCA5A5"}`,
            padding: "16px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 800, color: netProfit >= 0 ? "#166534" : "#991B1B", textTransform: "uppercase" }}>
                Net Operating Margin
              </span>
              <div style={{ 
                background: netProfit >= 0 ? "#DCFCE7" : "#FEE2E2", 
                color: netProfit >= 0 ? "#15803D" : "#DC2626", 
                padding: "4px 8px", 
                borderRadius: "6px",
                fontSize: "0.72rem",
                fontWeight: 800 
              }}>
                {netProfit >= 0 ? `+${profitMarginPercent}%` : `${profitMarginPercent}%`}
              </div>
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 900, color: netProfit >= 0 ? "var(--sd-green)" : "#DC2626", marginTop: "8px" }}>
              {formatCurrency(netProfit)}
            </div>
            <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", marginTop: "4px" }}>
              Total outflow: <strong>{formatCurrency(totalAllExpenses)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div style={{
        background: "var(--sd-zinc-50)",
        borderRadius: "12px",
        padding: "10px 14px",
        border: "1px solid var(--sd-zinc-200)",
        marginBottom: "16px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px"
      }}>
        {/* Quick Date Presets */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--sd-zinc-600)", textTransform: "uppercase", marginRight: "2px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Calendar size={13} color="var(--sd-red)" />
            <span>Date:</span>
          </span>

          {[
            { id: "all", label: "All Time" },
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "week", label: "Last 7 Days" },
            { id: "month", label: "This Month" }
          ].map(p => {
            const isActive = datePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                style={{
                  border: isActive ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                  background: isActive ? "var(--sd-black)" : "var(--sd-white)",
                  color: isActive ? "var(--sd-white)" : "var(--sd-zinc-700)",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "0.74rem",
                  fontWeight: isActive ? 800 : 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Single Calendar Popover Picker & Summary */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            datePreset={datePreset}
            onPresetChange={setDatePreset}
            onClear={handleClearDateFilter}
          />

          {(startDate || endDate || datePreset !== "all") && (
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "#6B1414",
              background: "#FFF7ED",
              border: "1px solid #FFEDD5",
              borderRadius: "8px",
              padding: "6px 12px",
              whiteSpace: "nowrap"
            }}>
              Filtered Outflow: {formatCurrency(totalAllExpenses)}
            </span>
          )}
        </div>
      </div>

      {/* TWO PRIMARY SPLIT SWITCHER */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "16px",
        paddingBottom: "12px",
        borderBottom: "1px solid var(--sd-zinc-200)"
      }}>
        {/* Section Tabs */}
        <div style={{
          display: "inline-flex",
          background: "var(--sd-zinc-100)",
          padding: "4px",
          borderRadius: "12px",
          border: "1px solid var(--sd-zinc-200)",
          gap: "4px"
        }}>
          <button
            type="button"
            onClick={() => { setActiveSection("raw_materials"); setSearchQuery(""); }}
            style={{
              padding: "8px 18px",
              borderRadius: "9px",
              fontSize: "0.84rem",
              fontWeight: activeSection === "raw_materials" ? 800 : 700,
              background: activeSection === "raw_materials" ? "#6B1414" : "transparent",
              color: activeSection === "raw_materials" ? "#FFFFFF" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              transition: "all 0.15s ease",
              boxShadow: activeSection === "raw_materials" ? "0 2px 6px rgba(107,20,20,0.3)" : "none"
            }}
          >
            <Boxes size={16} />
            <span>Raw Material Purchases ({rawMaterialBills.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveSection("other_expenses"); setSearchQuery(""); }}
            style={{
              padding: "8px 18px",
              borderRadius: "9px",
              fontSize: "0.84rem",
              fontWeight: activeSection === "other_expenses" ? 800 : 700,
              background: activeSection === "other_expenses" ? "var(--sd-black)" : "transparent",
              color: activeSection === "other_expenses" ? "#FFFFFF" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              transition: "all 0.15s ease",
              boxShadow: activeSection === "other_expenses" ? "0 2px 6px rgba(0,0,0,0.2)" : "none"
            }}
          >
            <Receipt size={16} />
            <span>Daily / Other Expenses ({otherExpensesList.length})</span>
          </button>
        </div>

        {/* Search Input */}
        <div style={{ position: "relative", width: "100%", maxWidth: "340px" }}>
          <Search size={15} color="var(--sd-zinc-400)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder={activeSection === "raw_materials" ? "Search vendor, bill #, or raw spices..." : "Search petrol, tempo, salary, paid to..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "10px",
              border: "1px solid var(--sd-zinc-200)",
              fontSize: "0.82rem",
              background: "#FFFFFF",
              outline: "none"
            }}
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: RAW MATERIAL PURCHASES (Single Bill with Multiple Products) */}
      {/* ========================================================================= */}
      {activeSection === "raw_materials" && (
        <div>
          {filteredRawBills.length === 0 ? (
            <div style={{
              background: "#FFFFFF",
              borderRadius: "14px",
              border: "1px dashed var(--sd-zinc-300)",
              padding: "50px 20px",
              textAlign: "center"
            }}>
              <Boxes size={42} color="#6B1414" style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                {searchQuery ? "No matching raw material purchase bills found" : "No Raw Material Purchases Recorded"}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", marginTop: "4px", maxWidth: "440px", margin: "4px auto 16px auto" }}>
                Record purchase bills from Mandi/dealers for bulk whole spices with multiple raw materials on a single invoice.
              </p>
              <button
                type="button"
                onClick={handleOpenRawMaterialModal}
                style={{
                  background: "#6B1414",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 18px",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Record First Raw Material Bill
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {filteredRawBills.map((bill) => {
                const itemsCount = (bill.items || []).length;
                const isExpanded = expandedBillId === bill.id;

                return (
                  <div
                    key={bill.id}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid var(--sd-zinc-200)",
                      overflow: "hidden",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
                    }}
                  >
                    {/* Bill Header Row */}
                    <div style={{
                      padding: "16px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{
                          width: "44px",
                          height: "44px",
                          borderRadius: "10px",
                          background: "#FFEDD5",
                          color: "#6B1414",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          <Boxes size={22} />
                        </div>

                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                              {bill.supplierName || "Mandi / Supplier"}
                            </h3>
                            {bill.invoiceNumber && (
                              <span style={{
                                background: "var(--sd-zinc-100)",
                                color: "var(--sd-zinc-700)",
                                fontSize: "0.72rem",
                                fontWeight: 800,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                border: "1px solid var(--sd-zinc-200)"
                              }}>
                                Bill #{bill.invoiceNumber}
                              </span>
                            )}
                            <span style={{
                              background: "#FEF3C7",
                              color: "#92400E",
                              fontSize: "0.72rem",
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: "6px"
                            }}>
                              {itemsCount} {itemsCount === 1 ? "Material" : "Materials"}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", fontSize: "0.76rem", color: "var(--sd-zinc-500)", flexWrap: "wrap" }}>
                            <span>Date: <strong>{formatDate(bill.date)}</strong></span>
                            <span>Payment: <strong>{bill.paymentMode || "Cash"}</strong></span>
                            {bill.supplierPhone && (
                              <span>Contact: <strong>{bill.supplierPhone}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Side: Total Amount, Proof Thumbnail & Actions */}
                      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", display: "block" }}>
                            Bill Total
                          </span>
                          <span style={{ fontSize: "1.25rem", fontWeight: 900, color: "#6B1414" }}>
                            {formatCurrency(bill.amount)}
                          </span>
                        </div>

                        {/* Bill Proof Photo View */}
                        {bill.proofUrl ? (
                          isPdfUrl(bill.proofUrl) ? (
                            <button
                              type="button"
                              onClick={() => setPreviewProofUrl(bill.proofUrl)}
                              style={{
                                background: "#FEF2F2",
                                border: "1px solid #FECACA",
                                borderRadius: "8px",
                                padding: "4px 8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "#DC2626"
                              }}
                              title="Click to view PDF bill document"
                            >
                              <FileText size={15} color="#DC2626" />
                              <span>PDF Bill</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPreviewProofUrl(bill.proofUrl)}
                              style={{
                                background: "var(--sd-zinc-100)",
                                border: "1px solid var(--sd-zinc-200)",
                                borderRadius: "8px",
                                padding: "4px 8px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                cursor: "pointer",
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color: "var(--sd-black)"
                              }}
                              title="Click to view full receipt photo"
                            >
                              <img 
                                src={bill.proofUrl} 
                                alt="Proof" 
                                style={{ width: "26px", height: "26px", objectFit: "cover", borderRadius: "4px" }} 
                              />
                              <span>View Bill</span>
                            </button>
                          )
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-400)", fontStyle: "italic" }}>
                            No bill photo
                          </span>
                        )}

                        {/* Expand / Collapse Button */}
                        <button
                          type="button"
                          onClick={() => setExpandedBillId(isExpanded ? null : bill.id)}
                          style={{
                            background: isExpanded ? "var(--sd-black)" : "var(--sd-zinc-100)",
                            color: isExpanded ? "#FFFFFF" : "var(--sd-zinc-700)",
                            border: "none",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          <span>{isExpanded ? "Hide Items" : "View Items"}</span>
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEditRawBill(bill)}
                          style={{
                            background: "#EFF6FF",
                            color: "#2563EB",
                            border: "none",
                            borderRadius: "8px",
                            padding: "6px 10px",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            fontSize: "0.75rem",
                            fontWeight: 700
                          }}
                          title="Edit Purchase Bill"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(bill.id, bill.title)}
                          style={{
                            background: "#FEF2F2",
                            color: "#DC2626",
                            border: "none",
                            borderRadius: "8px",
                            padding: "6px 8px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                          }}
                          title="Delete Bill"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Itemized Spices Breakdown Table */}
                    {isExpanded && (
                      <div style={{
                        background: "var(--sd-zinc-50)",
                        padding: "14px 16px",
                        borderTop: "1px solid var(--sd-zinc-200)"
                      }}>
                        <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--sd-zinc-600)", textTransform: "uppercase", marginBottom: "8px" }}>
                          Itemized Spices in this Bill:
                        </div>

                        <div style={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                            <thead>
                              <tr style={{ textAlign: "left", color: "var(--sd-zinc-500)", borderBottom: "1px solid var(--sd-zinc-200)" }}>
                                <th style={{ padding: "6px 8px" }}>Raw Material Item</th>
                                <th style={{ padding: "6px 8px" }}>HSN Code</th>
                                <th style={{ padding: "6px 8px" }}>Quantity</th>
                                <th style={{ padding: "6px 8px" }}>Unit Rate</th>
                                <th style={{ padding: "6px 8px", textAlign: "right" }}>Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(bill.items || []).map((itm, idx) => (
                                <tr key={idx} style={{ borderBottom: "1px solid var(--sd-zinc-200)", background: "#FFFFFF" }}>
                                  <td style={{ padding: "8px", fontWeight: 700, color: "var(--sd-black)" }}>
                                    {itm.name}
                                  </td>
                                  <td style={{ padding: "8px", fontFamily: "monospace", color: "#6B1414", fontWeight: 800 }}>
                                    {itm.hsnCode || "0910 91 00"}
                                  </td>
                                  <td style={{ padding: "8px", color: "var(--sd-zinc-700)" }}>
                                    {itm.quantity} {itm.unit || "Kg"}
                                  </td>
                                  <td style={{ padding: "8px", color: "var(--sd-zinc-700)" }}>
                                    {formatCurrency(itm.unitPrice)} / {itm.unit || "Kg"}
                                  </td>
                                  <td style={{ padding: "8px", textAlign: "right", fontWeight: 800, color: "#6B1414" }}>
                                    {formatCurrency(itm.total || (itm.quantity * itm.unitPrice))}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {bill.notes && (
                          <div style={{ marginTop: "10px", fontSize: "0.75rem", color: "var(--sd-zinc-600)", fontStyle: "italic" }}>
                            <strong>Notes:</strong> {bill.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: OTHER OPERATIONAL EXPENSES (Petrol, Tempo, Salary, Packaging) */}
      {/* ========================================================================= */}
      {activeSection === "other_expenses" && (
        <div>
          {/* Category Quick Filter Pills & Dynamic Category Manager Button */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            marginBottom: "16px"
          }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                style={{
                  padding: "6px 14px",
                  borderRadius: "20px",
                  fontSize: "0.78rem",
                  fontWeight: categoryFilter === "all" ? 800 : 600,
                  background: categoryFilter === "all" ? "var(--sd-black)" : "#FFFFFF",
                  color: categoryFilter === "all" ? "#FFFFFF" : "var(--sd-zinc-700)",
                  border: "1px solid var(--sd-zinc-200)",
                  cursor: "pointer"
                }}
              >
                All Categories ({otherExpensesList.length})
              </button>

              {(() => {
                const pillCats = [];
                const seen = new Set();
                categories.filter(c => c.id !== "all" && c.isActive !== false).forEach(c => {
                  if (!seen.has(c.name)) {
                    seen.add(c.name);
                    pillCats.push({ key: c.id, name: c.name, color: c.color });
                  }
                });
                otherExpensesList.forEach(e => {
                  const n = e.categoryName || e.category;
                  if (n && !seen.has(n)) {
                    seen.add(n);
                    pillCats.push({ key: n, name: n });
                  }
                });
                return pillCats.map((cat) => {
                  const count = otherExpensesList.filter(e => (e.category === cat.name || e.categoryName === cat.name || e.categoryId === cat.key)).length;
                  const isSelected = categoryFilter === cat.name || categoryFilter === cat.key;

                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => setCategoryFilter(isSelected ? "all" : cat.name)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "0.78rem",
                        fontWeight: isSelected ? 800 : 600,
                        background: isSelected ? "var(--sd-black)" : "#FFFFFF",
                        color: isSelected ? "#FFFFFF" : "var(--sd-zinc-700)",
                        border: "1px solid var(--sd-zinc-200)",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px"
                      }}
                    >
                      <Tag size={12} color={isSelected ? "#FFFFFF" : (cat.color || "var(--sd-red)")} />
                      <span>{cat.name} ({count})</span>
                    </button>
                  );
                });
              })()}
            </div>

            {/* Dynamic Category Management Trigger */}
            <button
              type="button"
              onClick={() => setShowCategoryManagerModal(true)}
              style={{
                background: "var(--sd-zinc-100)",
                color: "var(--sd-black)",
                border: "1px solid var(--sd-zinc-300)",
                borderRadius: "20px",
                padding: "6px 12px",
                fontSize: "0.76rem",
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                cursor: "pointer"
              }}
            >
              <Settings size={13} />
              <span>Manage Categories</span>
            </button>
          </div>

          {filteredOtherExpenses.length === 0 ? (
            <div style={{
              background: "#FFFFFF",
              borderRadius: "14px",
              border: "1px dashed var(--sd-zinc-300)",
              padding: "50px 20px",
              textAlign: "center"
            }}>
              <Receipt size={42} color="var(--sd-zinc-400)" style={{ margin: "0 auto 12px auto" }} />
              <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                {searchQuery ? "No matching expenses found" : "No Operational Expenses Recorded"}
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", marginTop: "4px", maxWidth: "440px", margin: "4px auto 16px auto" }}>
                Keep track of daily petrol, delivery tempo rent, employee salaries, and packaging pouches.
              </p>
              <button
                type="button"
                onClick={handleOpenOtherExpenseModal}
                style={{
                  background: "var(--sd-black)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "9px 18px",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Record First Expense
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {filteredOtherExpenses.map((exp) => {
                const catObj = expenseCategories.find(c => c.name === exp.category);

                return (
                  <div
                    key={exp.id}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "12px",
                      border: "1px solid var(--sd-zinc-200)",
                      padding: "14px 16px",
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        background: catObj?.color ? `${catObj.color}15` : "#F4F4F5",
                        color: catObj?.color || "var(--sd-black)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        <Tag size={20} />
                      </div>

                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                            {exp.title}
                          </h4>
                          <span style={{
                            background: "var(--sd-zinc-100)",
                            color: "var(--sd-zinc-700)",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "6px"
                          }}>
                            {exp.categoryName || exp.category}
                          </span>
                          {exp.subcategory && (
                            <span style={{
                              background: "#EFF6FF",
                              color: "#1E40AF",
                              border: "1px solid #BFDBFE",
                              fontSize: "0.70rem",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "6px"
                            }}>
                              {typeof exp.subcategory === "string" ? exp.subcategory : exp.subcategory?.name}
                            </span>
                          )}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", fontSize: "0.75rem", color: "var(--sd-zinc-500)", flexWrap: "wrap" }}>
                          <span>Date: <strong>{formatDate(exp.date)}</strong></span>
                          <span>Mode: <strong>{exp.paymentMode || "Cash"}</strong></span>
                          {exp.paidTo && <span>Paid to: <strong>{exp.paidTo}</strong></span>}
                          {exp.notes && <span style={{ fontStyle: "italic" }}>"{exp.notes}"</span>}
                        </div>
                      </div>
                    </div>

                    {/* Right side: Amount, Proof, Actions */}
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: "1.15rem", fontWeight: 900, color: "#9F1239" }}>
                          {formatCurrency(exp.amount)}
                        </span>
                      </div>

                      {/* Receipt Proof Photo View */}
                      {exp.proofUrl ? (
                        isPdfUrl(exp.proofUrl) ? (
                          <button
                            type="button"
                            onClick={() => setPreviewProofUrl(exp.proofUrl)}
                            style={{
                              background: "#FEF2F2",
                              border: "1px solid #FECACA",
                              borderRadius: "8px",
                              padding: "4px 8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "#DC2626"
                            }}
                            title="Click to view PDF bill document"
                          >
                            <FileText size={15} color="#DC2626" />
                            <span>PDF Bill</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setPreviewProofUrl(exp.proofUrl)}
                            style={{
                              background: "var(--sd-zinc-100)",
                              border: "1px solid var(--sd-zinc-200)",
                              borderRadius: "8px",
                              padding: "4px 8px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              color: "var(--sd-black)"
                            }}
                            title="Click to view full receipt photo"
                          >
                            <img 
                              src={exp.proofUrl} 
                              alt="Receipt" 
                              style={{ width: "24px", height: "24px", objectFit: "cover", borderRadius: "4px" }} 
                            />
                            <span>Proof</span>
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-400)", fontStyle: "italic" }}>
                          No bill
                        </span>
                      )}

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEditOtherExpense(exp)}
                        style={{
                          background: "#EFF6FF",
                          color: "#2563EB",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px 10px",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 700
                        }}
                        title="Edit Expense"
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(exp.id, exp.title)}
                        style={{
                          background: "#FEF2F2",
                          color: "#DC2626",
                          border: "none",
                          borderRadius: "8px",
                          padding: "6px 8px",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                        title="Delete Expense"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: RECORD RAW MATERIAL PURCHASE BILL (Multiple Items Single Bill) */}
      {/* ========================================================================= */}
      {showRawMaterialModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "800px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "#FFF7ED",
              borderBottom: "1px solid #FFEDD5"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Boxes size={20} color="#6B1414" />
                  <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "#6B1414", margin: 0 }}>
                    {editingExpenseId ? "Edit Raw Material Purchase Bill" : "Record Raw Material Purchase Bill"}
                  </h3>
                </div>
                <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-600)", margin: "2px 0 0 0" }}>
                  {editingExpenseId ? "Update supplier invoice, line items, and bill proof photo" : "Choose raw materials directly from Product Management with auto-populated HSN codes"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRawMaterialModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--sd-zinc-400)",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <form onSubmit={handleSubmitRawMaterialBill} style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {formError && (
                <div style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* Notice if Raw Material Catalog is empty */}
              {rawMaterials.length === 0 && (
                <div style={{
                  background: "#FFFBEB",
                  border: "1px solid #FDE68A",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px"
                }}>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 800, color: "#92400E" }}>
                      No Raw Material Products in Catalog yet!
                    </div>
                    <div style={{ fontSize: "0.74rem", color: "#B45309" }}>
                      Load standard whole spices with GST HSN codes to start selecting in the dropdown.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSeedStandardSpices}
                    disabled={isSubmitting}
                    style={{
                      background: "#6B1414",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer"
                    }}
                  >
                    Load Standard Spices
                  </button>
                </div>
              )}

              {/* Bill & Supplier Information */}
              <div style={{
                background: "var(--sd-zinc-50)",
                borderRadius: "10px",
                padding: "14px",
                border: "1px solid var(--sd-zinc-200)",
                marginBottom: "18px"
              }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--sd-zinc-700)", textTransform: "uppercase", marginBottom: "10px" }}>
                  1. Supplier & Invoice Info
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  {/* Supplier Field (Dropdown from dynamic Suppliers) */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Supplier / Mandi *
                    </label>
                    <select
                      value={rawBillData.supplierName}
                      onChange={(e) => {
                        const selName = e.target.value;
                        const matchedSup = suppliers.find(s => s.name === selName);
                        setRawBillData({
                          ...rawBillData,
                          supplierName: selName,
                          supplierPhone: matchedSup?.phone || rawBillData.supplierPhone || ""
                        });
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.82rem",
                        background: "#FFFFFF",
                        outline: "none"
                      }}
                      required
                    >
                      <option value="">-- Select Supplier --</option>
                      {suppliers.filter(s => s.isActive !== false).map(sup => (
                        <option key={sup.id} value={sup.name}>
                          {sup.name} {sup.city ? `(${sup.city})` : ''}
                        </option>
                      ))}
                      {rawBillData.supplierName && !suppliers.some(s => s.name === rawBillData.supplierName) && (
                        <option value={rawBillData.supplierName}>{rawBillData.supplierName}</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Supplier Bill / Invoice #
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. INV-9041"
                      value={rawBillData.invoiceNumber}
                      onChange={(e) => setRawBillData({ ...rawBillData, invoiceNumber: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.82rem",
                        background: "#FFFFFF",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={rawBillData.date}
                      onChange={(e) => setRawBillData({ ...rawBillData, date: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.82rem",
                        background: "#FFFFFF",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Payment Mode
                    </label>
                    <select
                      value={rawBillData.paymentMode}
                      onChange={(e) => setRawBillData({ ...rawBillData, paymentMode: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.82rem",
                        background: "#FFFFFF",
                        outline: "none"
                      }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                      <option value="Cheque">Cheque</option>
                      <option value="Credit / Khata">Credit / Mandi Khata (Unpaid)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* MULTI-ITEM RAW MATERIALS SECTION */}
              <div style={{ marginBottom: "18px" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px"
                }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--sd-black)", textTransform: "uppercase" }}>
                    2. Raw Materials in this Bill ({rawBillItems.length})
                  </div>
                  <button
                    type="button"
                    onClick={handleAddRawItemRow}
                    style={{
                      background: "#FFEDD5",
                      color: "#6B1414",
                      border: "1px solid #FED7AA",
                      borderRadius: "8px",
                      padding: "5px 12px",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Another Raw Material</span>
                  </button>
                </div>

                {/* Items Repeater Rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {rawBillItems.map((item, idx) => {
                    const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);

                    return (
                      <div
                        key={idx}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid var(--sd-zinc-300)",
                          borderRadius: "10px",
                          padding: "12px",
                          display: "grid",
                          gridTemplateColumns: "2.2fr 1.1fr 0.8fr 0.8fr 1fr 1fr auto",
                          gap: "8px",
                          alignItems: "flex-end"
                        }}
                      >
                        {/* Column 1: Material Product Picker Dropdown */}
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                            <label style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--sd-zinc-700)" }}>
                              Raw Material Product #{idx + 1} *
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setTargetRowForNewRM(idx);
                                setShowQuickAddRMModal(true);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#6B1414",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                cursor: "pointer",
                                padding: "0",
                                textDecoration: "underline"
                              }}
                            >
                              + New Product
                            </button>
                          </div>

                          <select
                            required
                            value={item.rawMaterialId}
                            onChange={(e) => {
                              if (e.target.value === "__NEW__") {
                                setTargetRowForNewRM(idx);
                                setShowQuickAddRMModal(true);
                              } else {
                                handleRawItemChange(idx, "rawMaterialId", e.target.value);
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              borderRadius: "6px",
                              border: "1.5px solid var(--sd-zinc-300)",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              outline: "none",
                              background: "#FFFFFF"
                            }}
                          >
                            <option value="">-- Choose Raw Material Product --</option>
                            {rawMaterials.map(rm => (
                              <option key={rm.id} value={rm.id}>
                                {rm.name} {rm.tamilName ? `(${rm.tamilName})` : ""} - HSN: {rm.hsnCode || "0910"}
                              </option>
                            ))}
                            <option value="__NEW__" style={{ fontWeight: 800, color: "#6B1414", background: "#FFEDD5" }}>
                              + Add New Raw Material to Catalog...
                            </option>
                          </select>
                        </div>

                        {/* Column 2: HSN Code (Pre-filled from Product Management) */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 800, color: "#6B1414", marginBottom: "3px" }}>
                            HSN Code *
                          </label>
                          <input
                            type="text"
                            required
                            value={item.hsnCode}
                            onChange={(e) => handleRawItemChange(idx, "hsnCode", e.target.value)}
                            placeholder="0910 91 00"
                            style={{
                              width: "100%",
                              padding: "8px 8px",
                              borderRadius: "6px",
                              border: "1.5px solid #FDBA74",
                              background: "#FFFBF7",
                              fontSize: "0.8rem",
                              fontFamily: "monospace",
                              fontWeight: 800,
                              color: "var(--sd-black)",
                              outline: "none"
                            }}
                          />
                        </div>

                        {/* Column 3: Quantity */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", marginBottom: "3px" }}>
                            Qty *
                          </label>
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleRawItemChange(idx, "quantity", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--sd-zinc-300)",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              outline: "none"
                            }}
                          />
                        </div>

                        {/* Column 4: Unit */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", marginBottom: "3px" }}>
                            Unit
                          </label>
                          <select
                            value={item.unit}
                            onChange={(e) => handleRawItemChange(idx, "unit", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 4px",
                              borderRadius: "6px",
                              border: "1px solid var(--sd-zinc-300)",
                              fontSize: "0.78rem",
                              outline: "none",
                              background: "#FFFFFF"
                            }}
                          >
                            <option value="Kg">Kg</option>
                            <option value="Bags">Bags</option>
                            <option value="Quintal">Quintal</option>
                            <option value="Grams">g</option>
                            <option value="Tons">Tons</option>
                            <option value="Packs">Packs</option>
                          </select>
                        </div>

                        {/* Column 5: Rate (₹) */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", marginBottom: "3px" }}>
                            Rate (₹/{item.unit}) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="e.g. 185"
                            value={item.unitPrice}
                            onChange={(e) => handleRawItemChange(idx, "unitPrice", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--sd-zinc-300)",
                              fontSize: "0.82rem",
                              fontWeight: 700,
                              outline: "none"
                            }}
                          />
                        </div>

                        {/* Column 6: Line Total */}
                        <div>
                          <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", marginBottom: "3px" }}>
                            Line Total
                          </label>
                          <div style={{
                            padding: "8px",
                            borderRadius: "6px",
                            background: "var(--sd-zinc-100)",
                            fontSize: "0.85rem",
                            fontWeight: 800,
                            color: "#6B1414",
                            textAlign: "right"
                          }}>
                            {formatCurrency(rowTotal)}
                          </div>
                        </div>

                        {/* Column 7: Remove Button */}
                        <div>
                          <button
                            type="button"
                            onClick={() => handleRemoveRawItemRow(idx)}
                            disabled={rawBillItems.length <= 1}
                            style={{
                              background: rawBillItems.length <= 1 ? "var(--sd-zinc-100)" : "#FEF2F2",
                              color: rawBillItems.length <= 1 ? "var(--sd-zinc-400)" : "#DC2626",
                              border: "none",
                              borderRadius: "6px",
                              padding: "8px",
                              cursor: rawBillItems.length <= 1 ? "not-allowed" : "pointer"
                            }}
                            title="Remove row"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Grand Total Bar */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "#FFF7ED",
                  border: "1px solid #FFEDD5",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  marginTop: "12px"
                }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--sd-black)" }}>
                    Calculated Bill Total ({rawBillItems.length} items):
                  </span>
                  <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "#6B1414" }}>
                    {formatCurrency(rawBillGrandTotal)}
                  </span>
                </div>
              </div>

              {/* Proof Image Upload */}
              <div style={{
                background: "var(--sd-zinc-50)",
                borderRadius: "10px",
                padding: "14px",
                border: "1px solid var(--sd-zinc-200)",
                marginBottom: "16px"
              }}>
                <div style={{ fontSize: "0.76rem", fontWeight: 800, color: "var(--sd-zinc-700)", textTransform: "uppercase", marginBottom: "8px" }}>
                  3. Bill / Invoice Proof Photo (For Audit & Confirmation)
                </div>

                {!selectedFile && existingProofUrl ? (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#FFFFFF",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    border: "1px solid var(--sd-zinc-200)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {isPdfUrl(existingProofUrl) ? (
                        <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <FileText size={24} color="#DC2626" />
                        </div>
                      ) : (
                        <img 
                          src={existingProofUrl} 
                          alt="Current Proof" 
                          style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} 
                        />
                      )}
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--sd-black)" }}>
                          {isPdfUrl(existingProofUrl) ? "Current PDF Bill Attached" : "Current Bill Photo Attached"}
                        </div>
                        <a 
                          href={existingProofUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ fontSize: "0.72rem", color: "var(--sd-red)", fontWeight: 700, textDecoration: "underline" }}
                        >
                          View Full Document
                        </a>
                      </div>
                    </div>
                    <label style={{
                      background: "var(--sd-zinc-100)",
                      color: "var(--sd-zinc-700)",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}>
                      Replace File
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleImageSelect}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                ) : !selectedFile ? (
                  <label style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px dashed var(--sd-zinc-300)",
                    borderRadius: "10px",
                    padding: "20px",
                    background: "#FFFFFF",
                    cursor: "pointer",
                    transition: "border-color 0.15s ease"
                  }}>
                    <Upload size={24} color="var(--sd-zinc-400)" />
                    <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--sd-black)", marginTop: "6px" }}>
                      Upload Mandi Bill / Invoice (Photo or PDF)
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", marginTop: "2px" }}>
                      Supports Camera capture, Gallery images & PDF files
                    </span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleImageSelect}
                      style={{ display: "none" }}
                    />
                  </label>
                ) : (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "#FFFFFF",
                    borderRadius: "8px",
                    padding: "10px 12px",
                    border: "1px solid var(--sd-zinc-200)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      {compressionStats?.isPdf ? (
                        <div style={{ width: "42px", height: "42px", borderRadius: "6px", background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <FileText size={24} color="#DC2626" />
                        </div>
                      ) : (
                        <img 
                          src={compressionStats?.previewUrl} 
                          alt="Preview" 
                          style={{ width: "42px", height: "42px", objectFit: "cover", borderRadius: "6px", flexShrink: 0 }} 
                        />
                      )}
                      <div>
                        <div style={{ fontSize: "0.8rem", fontWeight: 800, color: "var(--sd-black)" }}>
                          {selectedFile.name}
                        </div>
                        {compressionStats && (
                          <div style={{ fontSize: "0.72rem", color: compressionStats.isPdf ? "#DC2626" : "var(--sd-green)", fontWeight: 700 }}>
                            {compressionStats.isPdf 
                              ? `PDF Document (${formatBytes(compressionStats.originalSize)})` 
                              : `Compressed to ${formatBytes(compressionStats.compressedSize)} (${compressionStats.savingsPercent}% saved)`}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      style={{
                        background: "#FEF2F2",
                        color: "#DC2626",
                        border: "none",
                        borderRadius: "6px",
                        padding: "6px 10px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      Change File
                    </button>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                  Notes / Payment Remarks (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Paid ₹10,000 advance via GPay, balance ₹5,600 pending next week..."
                  value={rawBillData.notes}
                  onChange={(e) => setRawBillData({ ...rawBillData, notes: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    fontSize: "0.8rem",
                    resize: "none",
                    outline: "none"
                  }}
                />
              </div>

              {/* Form Footer Actions */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
                paddingTop: "14px",
                borderTop: "1px solid var(--sd-zinc-200)"
              }}>
                <button
                  type="button"
                  onClick={() => setShowRawMaterialModal(false)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    background: "var(--sd-zinc-100)",
                    color: "var(--sd-zinc-700)",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "9px 24px",
                    borderRadius: "8px",
                    background: "#6B1414",
                    color: "#FFFFFF",
                    border: "none",
                    fontWeight: 800,
                    fontSize: "0.84rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(107,20,20,0.3)"
                  }}
                >
                  {isSubmitting 
                    ? (editingExpenseId ? "Updating Bill..." : "Recording Bill...") 
                    : (editingExpenseId ? `Update Purchase Bill (${formatCurrency(rawBillGrandTotal)})` : `Save Purchase Bill (${formatCurrency(rawBillGrandTotal)})`)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* QUICK ADD RAW MATERIAL PRODUCT MODAL (From inside bill recorder) */}
      {/* ========================================================================= */}
      {showQuickAddRMModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(3px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10001,
          padding: "16px"
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "14px",
            width: "100%",
            maxWidth: "460px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.35)",
            overflow: "hidden"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "14px 18px",
              background: "#FFF7ED",
              borderBottom: "1px solid #FFEDD5"
            }}>
              <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#6B1414" }}>
                Add Raw Material Product to Catalog
              </h4>
              <button
                type="button"
                onClick={() => setShowQuickAddRMModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--sd-zinc-400)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQuickSaveRawMaterial} style={{ padding: "18px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                    Raw Material Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dry Red Chilli (Guntur), Black Pepper..."
                    value={quickRMForm.name}
                    onChange={(e) => setQuickRMForm({ ...quickRMForm, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                    Tamil Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. குண்டூர் வரமிளகாய், கருப்பு மிளகு..."
                    value={quickRMForm.tamilName}
                    onChange={(e) => setQuickRMForm({ ...quickRMForm, tamilName: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.84rem",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, color: "#6B1414", marginBottom: "3px" }}>
                      HSN Code (GST Compliance) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0904 21 10"
                      value={quickRMForm.hsnCode}
                      onChange={(e) => setQuickRMForm({ ...quickRMForm, hsnCode: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1.5px solid #FDBA74",
                        background: "#FFFBF7",
                        fontSize: "0.84rem",
                        fontFamily: "monospace",
                        fontWeight: 800,
                        outline: "none"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Default Unit *
                    </label>
                    <select
                      value={quickRMForm.unit}
                      onChange={(e) => setQuickRMForm({ ...quickRMForm, unit: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.84rem",
                        background: "#FFFFFF",
                        outline: "none"
                      }}
                    >
                      <option value="Kg">Kg</option>
                      <option value="Bags">Bags</option>
                      <option value="Quintal">Quintal</option>
                      <option value="Grams">g</option>
                      <option value="Tons">Tons</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                    Standard Purchase Rate (₹ per {quickRMForm.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 190"
                    value={quickRMForm.standardRate}
                    onChange={(e) => setQuickRMForm({ ...quickRMForm, standardRate: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.84rem",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "18px", paddingTop: "12px", borderTop: "1px solid var(--sd-zinc-200)" }}>
                <button
                  type="button"
                  onClick={() => setShowQuickAddRMModal(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "6px",
                    background: "var(--sd-zinc-100)",
                    border: "none",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "6px",
                    background: "#6B1414",
                    color: "#FFFFFF",
                    border: "none",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECORD OTHER OPERATIONAL EXPENSE (Petrol, Tempo, Salary, etc.) */}
      {/* ========================================================================= */}
      {showOtherExpenseModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "520px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "var(--sd-zinc-50)",
              borderBottom: "1px solid var(--sd-zinc-200)"
            }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--sd-black)", margin: 0 }}>
                  {editingExpenseId ? "Edit Operational Expense" : "Record Operational Expense"}
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", margin: "2px 0 0 0" }}>
                  {editingExpenseId ? "Update expense category, amount, payment details, and proof receipt" : "Record daily petrol, tempo rent, wages, packaging, and utilities"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowOtherExpenseModal(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--sd-zinc-400)",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitOtherExpense} style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {formError && (
                <div style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Expense Category Field (Loads from dynamic Expense Categories) */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                    Expense Category *
                  </label>
                  <select
                    value={otherExpenseData.category}
                    onChange={(e) => setOtherExpenseData({ ...otherExpenseData, category: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      background: "#FFFFFF",
                      outline: "none"
                    }}
                    required
                  >
                    <option value="" disabled>-- Select Expense Category --</option>
                    {expenseCategories.map(cat => (
                      <option key={cat.id || cat.name} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                    {otherExpenseData.category && !expenseCategories.some(c => c.name === otherExpenseData.category || c.id === otherExpenseData.category) && (
                      <option value={otherExpenseData.category}>{otherExpenseData.category}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                    Expense Description / Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Daily petrol for delivery bike, Tempo rent for Madurai route..."
                    value={otherExpenseData.title}
                    onChange={(e) => setOtherExpenseData({ ...otherExpenseData, title: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      placeholder="e.g. 850"
                      value={otherExpenseData.amount}
                      onChange={(e) => setOtherExpenseData({ ...otherExpenseData, amount: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        outline: "none"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={otherExpenseData.date}
                      onChange={(e) => setOtherExpenseData({ ...otherExpenseData, date: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        outline: "none"
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                      Paid To / Person / Shop
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Shell Petrol Bunk, Driver Mani..."
                      value={otherExpenseData.paidTo}
                      onChange={(e) => setOtherExpenseData({ ...otherExpenseData, paidTo: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        outline: "none"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                      Payment Mode
                    </label>
                    <select
                      value={otherExpenseData.paymentMode}
                      onChange={(e) => setOtherExpenseData({ ...otherExpenseData, paymentMode: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        background: "#FFFFFF",
                        outline: "none"
                      }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="UPI">UPI / GPay / PhonePe</option>
                      <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    </select>
                  </div>
                </div>

                {/* Proof Image Upload */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                    Bill / Voucher Proof Image
                  </label>
                  {!selectedFile && existingProofUrl ? (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "#FFFFFF",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      border: "1px solid var(--sd-zinc-200)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {isPdfUrl(existingProofUrl) ? (
                          <div style={{ width: "34px", height: "34px", borderRadius: "6px", background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FileText size={20} color="#DC2626" />
                          </div>
                        ) : (
                          <img 
                            src={existingProofUrl} 
                            alt="Current Receipt" 
                            style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} 
                          />
                        )}
                        <div>
                          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-black)" }}>
                            {isPdfUrl(existingProofUrl) ? "Current PDF Bill Attached" : "Current Receipt Photo"}
                          </div>
                          <a 
                            href={existingProofUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            style={{ fontSize: "0.7rem", color: "var(--sd-red)", fontWeight: 700, textDecoration: "underline" }}
                          >
                            View Full Document
                          </a>
                        </div>
                      </div>
                      <label style={{
                        background: "var(--sd-zinc-100)",
                        color: "var(--sd-zinc-700)",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}>
                        Replace File
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          onChange={handleImageSelect}
                          style={{ display: "none" }}
                        />
                      </label>
                    </div>
                  ) : !selectedFile ? (
                    <label style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      border: "1px dashed var(--sd-zinc-300)",
                      borderRadius: "8px",
                      padding: "10px 14px",
                      background: "var(--sd-zinc-50)",
                      cursor: "pointer"
                    }}>
                      <Upload size={18} color="var(--sd-zinc-500)" />
                      <span style={{ fontSize: "0.8rem", color: "var(--sd-zinc-700)", fontWeight: 600 }}>
                        Attach Petrol Bill / Voucher / Slip (Photo or PDF)
                      </span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleImageSelect}
                        style={{ display: "none" }}
                      />
                    </label>
                  ) : (
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--sd-zinc-50)",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      border: "1px solid var(--sd-zinc-200)"
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {compressionStats?.isPdf ? (
                          <div style={{ width: "34px", height: "34px", borderRadius: "6px", background: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <FileText size={20} color="#DC2626" />
                          </div>
                        ) : (
                          <img 
                            src={compressionStats?.previewUrl} 
                            alt="Preview" 
                            style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px", flexShrink: 0 }} 
                          />
                        )}
                        <div>
                          <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-black)" }}>
                            {selectedFile.name}
                          </div>
                          {compressionStats && (
                            <div style={{ fontSize: "0.7rem", color: compressionStats.isPdf ? "#DC2626" : "var(--sd-green)", fontWeight: 700 }}>
                              {compressionStats.isPdf 
                                ? `PDF Document (${formatBytes(compressionStats.originalSize)})` 
                                : `Compressed (${formatBytes(compressionStats.compressedSize)})`}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        style={{
                          background: "#FEF2F2",
                          color: "#DC2626",
                          border: "none",
                          borderRadius: "4px",
                          padding: "4px 8px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          cursor: "pointer"
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                    Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. 5 Liters petrol, vehicle TN-60-AZ-1234..."
                    value={otherExpenseData.notes}
                    onChange={(e) => setOtherExpenseData({ ...otherExpenseData, notes: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.8rem",
                      resize: "none",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
                paddingTop: "14px",
                borderTop: "1px solid var(--sd-zinc-200)"
              }}>
                <button
                  type="button"
                  onClick={() => setShowOtherExpenseModal(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    background: "var(--sd-zinc-100)",
                    color: "var(--sd-zinc-700)",
                    border: "none",
                    fontWeight: 700,
                    fontSize: "0.82rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    background: "var(--sd-black)",
                    color: "#FFFFFF",
                    border: "none",
                    fontWeight: 800,
                    fontSize: "0.82rem",
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)"
                  }}
                >
                  {isSubmitting ? "Updating..." : (editingExpenseId ? "Update Expense" : "Save Expense")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DYNAMIC EXPENSE CATEGORY MANAGER MODAL */}
      {/* ========================================================================= */}
      {showCategoryManagerModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10002,
          padding: "16px"
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "480px",
            maxHeight: "85vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
            overflow: "hidden"
          }}>
            {/* Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              background: "var(--sd-zinc-50)",
              borderBottom: "1px solid var(--sd-zinc-200)"
            }}>
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 900, color: "var(--sd-black)", margin: 0 }}>
                  Manage Expense Categories
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", margin: "2px 0 0 0" }}>
                  Add, edit, or delete categories for operational expense tracking
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryManagerModal(false)}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--sd-zinc-400)" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {/* Add New Category Form */}
              <form onSubmit={handleAddCategorySubmit} style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
                <input
                  type="text"
                  required
                  placeholder="New category name (e.g. Delivery Fuel, Stationery)..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    fontSize: "0.82rem",
                    outline: "none"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: "var(--sd-black)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 14px",
                    fontSize: "0.8rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    whiteSpace: "nowrap"
                  }}
                >
                  + Add Category
                </button>
              </form>

              {/* Categories List */}
              <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--sd-zinc-600)", textTransform: "uppercase", marginBottom: "8px" }}>
                Active Categories ({expenseCategories.length})
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {expenseCategories.map((cat) => {
                  const isEditing = editingCatId === cat.id;

                  return (
                    <div
                      key={cat.id || cat.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "var(--sd-zinc-50)",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-200)"
                      }}
                    >
                      {isEditing ? (
                        <div style={{ display: "flex", gap: "6px", flex: 1 }}>
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            style={{
                              flex: 1,
                              padding: "4px 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--sd-zinc-300)",
                              fontSize: "0.82rem"
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateCategorySubmit(cat.id)}
                            style={{
                              background: "var(--sd-black)",
                              color: "#FFFFFF",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: "pointer"
                            }}
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCatId(null)}
                            style={{
                              background: "var(--sd-zinc-200)",
                              border: "none",
                              borderRadius: "6px",
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <Tag size={14} color={cat.color || "var(--sd-red)"} />
                            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--sd-black)" }}>
                              {cat.name}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCatId(cat.id);
                                setEditingCatName(cat.name);
                              }}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "var(--sd-zinc-600)",
                                cursor: "pointer",
                                padding: "4px"
                              }}
                              title="Edit Category Name"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCategoryClick(cat.id, cat.name)}
                              style={{
                                background: "transparent",
                                border: "none",
                                color: "#DC2626",
                                cursor: "pointer",
                                padding: "4px"
                              }}
                              title="Delete Category"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              padding: "12px 20px",
              background: "var(--sd-zinc-50)",
              borderTop: "1px solid var(--sd-zinc-200)"
            }}>
              <button
                type="button"
                onClick={() => setShowCategoryManagerModal(false)}
                style={{
                  background: "var(--sd-black)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 18px",
                  fontSize: "0.8rem",
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HIGH RESOLUTION RECEIPT / BILL IMAGE PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewProofUrl && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.85)",
          backdropFilter: "blur(5px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: "20px"
        }}>
          <div style={{
            position: "relative",
            maxWidth: "90vw",
            maxHeight: "90vh",
            background: "#000000",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
              background: "#18181B",
              color: "#FFFFFF"
            }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {isPdfUrl(previewProofUrl) ? (
                  <>
                    <FileText size={16} color="#DC2626" />
                    <span>PDF Bill / Invoice Document</span>
                  </>
                ) : (
                  <span>Bill / Voucher Proof Photo</span>
                )}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <a
                  href={previewProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: "var(--sd-zinc-300)",
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "0.75rem"
                  }}
                >
                  <ExternalLink size={14} />
                  <span>Open Full</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewProofUrl(null)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "none",
                    borderRadius: "6px",
                    color: "#FFFFFF",
                    padding: "4px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center"
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ 
              padding: isPdfUrl(previewProofUrl) ? "0" : "10px", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center", 
              overflow: "auto",
              background: isPdfUrl(previewProofUrl) ? "#FFFFFF" : "transparent"
            }}>
              {isPdfUrl(previewProofUrl) ? (
                <iframe
                  src={previewProofUrl}
                  title="PDF Document Preview"
                  style={{
                    width: "85vw",
                    maxWidth: "920px",
                    height: "80vh",
                    border: "none"
                  }}
                />
              ) : (
                <img
                  src={previewProofUrl}
                  alt="Receipt Proof"
                  style={{
                    maxWidth: "100%",
                    maxHeight: "80vh",
                    objectFit: "contain",
                    borderRadius: "6px"
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FULL-SCREEN BLOCKING LOADING OVERLAY DURING FORM SUBMISSION */}
      {/* ========================================================================= */}
      {isSubmitting && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(5px)",
          zIndex: 999999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          padding: "20px",
          userSelect: "none"
        }}>
          <div style={{
            background: "#18181B",
            border: "1px solid var(--sd-zinc-700)",
            borderRadius: "16px",
            padding: "32px 36px",
            textAlign: "center",
            maxWidth: "420px",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px"
          }}>
            <div style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(220, 38, 38, 0.15)",
              border: "2px solid var(--sd-red)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <Loader2 size={30} color="var(--sd-red)" className="spin" />
            </div>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: "0 0 6px 0", color: "#FFFFFF" }}>
                Saving & Uploading Bill...
              </h3>
              <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", margin: 0, lineHeight: 1.5 }}>
                Please wait while we upload your proof documents and securely save your records to database.
              </p>
            </div>
            <div style={{
              fontSize: "0.72rem",
              color: "var(--sd-zinc-400)",
              padding: "5px 12px",
              background: "rgba(255,255,255,0.06)",
              borderRadius: "6px"
            }}>
              Do not refresh or close this window
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
