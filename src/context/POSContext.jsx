import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  db, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  storage,
  ref as storageRef,
  deleteObject,
  query,
  orderBy
} from "../firebase/config";
import { BUSINESS_INFO } from "../data/initialData";
import { generateInvoiceNumber } from "../utils/formatters";
import { uploadProductImage } from "../utils/imageCompressor";
import { DEFAULT_PRODUCT_IMAGE, STATIC_CUSTOMER_CATEGORIES } from "../utils/constants";
import ConfirmModal from "../components/ConfirmModal";

const POSContext = createContext(null);

// Global In-Memory Image Cache to preload & keep product images in browser memory
const memoryImageCache = new Set();
export const preloadProductImage = (url) => {
  if (!url || memoryImageCache.has(url)) return;
  memoryImageCache.add(url);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
};

// Customer Category Pricing Rate helpers (Static 4 Categories: SS, D, R, C)
export const getCustomerPricingTier = (customer) => {
  if (!customer) return 'R';
  const raw = String(customer.category || customer.categoryName || customer.pricingTier || '').toUpperCase().trim();
  if (raw === 'SS' || raw.includes('SUPER') || raw.includes('STOCKIST')) return 'SS';
  if (raw === 'D' || raw.includes('DEALER')) return 'D';
  if (raw === 'C' || raw.includes('CUSTOMER') || raw.includes('CONSUMER') || raw.includes('WALK-IN')) return 'C';
  if (raw === 'R' || raw.includes('RETAIL') || raw.includes('WHOLESALE') || raw.includes('HOTEL')) return 'R';
  return 'R';
};

export const getTierRate = (productOrVariant, tier = 'R') => {
  if (!productOrVariant) return 0;
  const rawTier = String(tier || 'R').toUpperCase().trim();
  let normalizedTier = 'R';
  if (rawTier === 'SS' || rawTier.includes('SUPER') || rawTier.includes('STOCKIST')) {
    normalizedTier = 'SS';
  } else if (rawTier === 'D' || rawTier.includes('DEALER')) {
    normalizedTier = 'D';
  } else if (rawTier === 'C' || rawTier.includes('CUSTOMER') || rawTier.includes('CONSUMER')) {
    normalizedTier = 'C';
  } else {
    normalizedTier = 'R';
  }

  const ss = Number(productOrVariant.superStockistPrice) || Number(productOrVariant.categoryPrices?.['SS']) || Number(productOrVariant.categoryPrices?.['custcat_stockist']) || 0;
  const d = Number(productOrVariant.dealerPrice) || Number(productOrVariant.categoryPrices?.['D']) || Number(productOrVariant.categoryPrices?.['custcat_dealer']) || 0;
  const r = Number(productOrVariant.retailerPrice) || Number(productOrVariant.wholesalePrice) || Number(productOrVariant.categoryPrices?.['R']) || Number(productOrVariant.categoryPrices?.['custcat_retailer']) || 0;
  const c = Number(productOrVariant.customerPrice) || Number(productOrVariant.categoryPrices?.['C']) || Number(productOrVariant.categoryPrices?.['custcat_consumer']) || Number(productOrVariant.mrp) || 0;
  const mrp = Number(productOrVariant.mrp) || 0;

  if (normalizedTier === 'SS') {
    return ss > 0 ? ss : (r > 0 ? r : mrp);
  }
  if (normalizedTier === 'D') {
    return d > 0 ? d : (r > 0 ? r : mrp);
  }
  if (normalizedTier === 'C') {
    return c > 0 ? c : (mrp > 0 ? mrp : r);
  }
  // Retailer (R)
  return r > 0 ? r : (d > 0 ? d : (ss > 0 ? ss : mrp));
};

export function POSProvider({ children }) {
  // Database entities - pure Firebase Firestore live state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);

  // Dynamic Expense Categories for Operational Expenses
  const DEFAULT_EXPENSE_CATEGORIES = [
    { id: "cat_petrol", name: "Petrol & Fuel", color: "#EA580C" },
    { id: "cat_tempo", name: "Tempo & Transport", color: "#0284C7" },
    { id: "cat_salary", name: "Employee Salary", color: "#16A34A" },
    { id: "cat_packaging", name: "Packaging Material", color: "#9333EA" },
    { id: "cat_rent", name: "Shop & Godown Rent", color: "#D97706" },
    { id: "cat_utility", name: "Electricity & Utility", color: "#EAB308" },
    { id: "cat_refreshments", name: "Tea & Refreshments", color: "#64748B" },
    { id: "cat_misc", name: "General Misc", color: "#475569" }
  ];
  const [expenseCategories, setExpenseCategories] = useState(DEFAULT_EXPENSE_CATEGORIES);

  // Static Customer Categories (SS, D, R, C)
  const customerCategories = STATIC_CUSTOMER_CATEGORIES;

  // Dynamic Courier Partners State (The Professional Couriers, ST Courier, DTDC, etc.)
  const DEFAULT_COURIER_PARTNERS = [
    { id: "courier_tpc", name: "The Professional Couriers", code: "TPC", trackingUrl: "https://www.tpcindia.com", phone: "044-22250000", isActive: true },
    { id: "courier_st", name: "ST Courier", code: "STC", trackingUrl: "https://stcourier.com/track", phone: "044-40004000", isActive: true },
    { id: "courier_dtdc", name: "DTDC Express", code: "DTDC", trackingUrl: "https://www.dtdc.in/tracking.asp", phone: "080-25365032", isActive: true },
    { id: "courier_indiapost", name: "India Post (Speed Post)", code: "IPOST", trackingUrl: "https://www.indiapost.gov.in", phone: "18002666868", isActive: true },
    { id: "courier_bluedart", name: "Blue Dart", code: "BLUEDART", trackingUrl: "https://www.bluedart.com/tracking", phone: "18602331234", isActive: true },
    { id: "courier_trackon", name: "Trackon Couriers", code: "TRACKON", trackingUrl: "https://trackon.in", phone: "011-45593500", isActive: true },
    { id: "courier_direct", name: "Direct / Local Transport", code: "LOCAL", trackingUrl: "", phone: "", isActive: true }
  ];
  const [courierPartners, setCourierPartners] = useState(() => {
    try {
      const saved = localStorage.getItem("sdb_courier_partners");
      return saved ? JSON.parse(saved) : DEFAULT_COURIER_PARTNERS;
    } catch {
      return DEFAULT_COURIER_PARTNERS;
    }
  });

  // Dynamic Product Mixers & Raw Material Formulation State (Default Base: 1 KG)
  const DEFAULT_MIXERS = [
    {
      id: "mix_sambar",
      name: "Madras Sambar Powder",
      tamilName: "பாரம்பரிய சாம்பார் பொடி",
      baseQuantity: 1, // 1 KG
      baseUnit: "Kg",
      productId: "prod_sambar",
      description: "Authentic South Indian aromatic sambar masala blend (1 KG standard base)",
      instructions: "Sun-dry raw spices, mild roast coriander & chilli separately, grind to fine mesh.",
      ingredients: [
        { rawMaterialId: "rm_coriander", rawMaterialName: "Coriander Seeds (Dhaniya)", grams: 450, percentage: 45 },
        { rawMaterialId: "rm_chilli", rawMaterialName: "Red Chilli (Guntur)", grams: 300, percentage: 30 },
        { rawMaterialId: "rm_cumin", rawMaterialName: "Cumin Seeds (Jeera)", grams: 100, percentage: 10 },
        { rawMaterialId: "rm_pepper", rawMaterialName: "Black Pepper", grams: 50, percentage: 5 },
        { rawMaterialId: "rm_turmeric", rawMaterialName: "Turmeric Finger (Haldi)", grams: 50, percentage: 5 },
        { rawMaterialId: "rm_fenugreek", rawMaterialName: "Fenugreek Seeds (Vendhayam)", grams: 30, percentage: 3 },
        { rawMaterialId: "rm_asafoetida", rawMaterialName: "Asafoetida (Perungayam)", grams: 20, percentage: 2 }
      ],
      isActive: true,
      timestamp: Date.now()
    },
    {
      id: "mix_biryani",
      name: "Dindigul Thalappakatti Biryani Masala",
      tamilName: "திண்டுக்கல் பிரியாணி மசாலா",
      baseQuantity: 1,
      baseUnit: "Kg",
      productId: "prod_biryani",
      description: "Royal Seeraga Samba Biryani aromatic whole spices blend (1 KG base)",
      instructions: "Slow roast whole spices on gentle heat until fragrant. Coarse grind for long-lasting aroma.",
      ingredients: [
        { rawMaterialId: "rm_coriander", rawMaterialName: "Coriander Seeds (Dhaniya)", grams: 300, percentage: 30 },
        { rawMaterialId: "rm_cumin", rawMaterialName: "Cumin Seeds (Jeera)", grams: 200, percentage: 20 },
        { rawMaterialId: "rm_fennel", rawMaterialName: "Fennel Seeds (Sombu)", grams: 180, percentage: 18 },
        { rawMaterialId: "rm_cinnamon", rawMaterialName: "Cinnamon (Pattai)", grams: 120, percentage: 12 },
        { rawMaterialId: "rm_cloves", rawMaterialName: "Cloves (Lavangam)", grams: 80, percentage: 8 },
        { rawMaterialId: "rm_cardamom", rawMaterialName: "Cardamom (Elaichi)", grams: 60, percentage: 6 },
        { rawMaterialId: "rm_pepper", rawMaterialName: "Black Pepper", grams: 60, percentage: 6 }
      ],
      isActive: true,
      timestamp: Date.now()
    },
    {
      id: "mix_chicken",
      name: "Chettinad Chicken Kulambu Masala",
      tamilName: "செட்டிநாடு சிக்கன் குழம்பு மசாலா",
      baseQuantity: 1,
      baseUnit: "Kg",
      productId: "prod_chicken",
      description: "Spicy & peppery traditional Chettinad chicken curry formulation (1 KG base)",
      instructions: "Medium roast with curry leaves, grind while warm.",
      ingredients: [
        { rawMaterialId: "rm_coriander", rawMaterialName: "Coriander Seeds (Dhaniya)", grams: 380, percentage: 38 },
        { rawMaterialId: "rm_chilli", rawMaterialName: "Red Chilli (Guntur)", grams: 320, percentage: 32 },
        { rawMaterialId: "rm_pepper", rawMaterialName: "Black Pepper", grams: 120, percentage: 12 },
        { rawMaterialId: "rm_cumin", rawMaterialName: "Cumin Seeds (Jeera)", grams: 100, percentage: 10 },
        { rawMaterialId: "rm_fennel", rawMaterialName: "Fennel Seeds (Sombu)", grams: 50, percentage: 5 },
        { rawMaterialId: "rm_turmeric", rawMaterialName: "Turmeric Finger (Haldi)", grams: 30, percentage: 3 }
      ],
      isActive: true,
      timestamp: Date.now()
    }
  ];

  const [mixers, setMixers] = useState(() => {
    try {
      const saved = localStorage.getItem("sdb_mixers");
      return saved ? JSON.parse(saved) : DEFAULT_MIXERS;
    } catch {
      return DEFAULT_MIXERS;
    }
  });

  // Dynamic Suppliers Directory State
  const DEFAULT_SUPPLIERS = [
    { 
      id: "sup_1", 
      name: "Sri Murugan Spices Mandi", 
      contactPerson: "Murugan",
      phone: "9842123456", 
      city: "Bodinayakanur", 
      gstin: "33AAAAA0000A1Z5", 
      address: "Bazaar Street, Bodinayakanur, Theni", 
      notes: "Cardamom and black pepper direct procurement",
      isActive: true 
    },
    { 
      id: "sup_2", 
      name: "Guntur Chilli Traders", 
      contactPerson: "Ramarao",
      phone: "9876543210", 
      city: "Guntur", 
      gstin: "37BBBBB1111B2Z6", 
      address: "Mirchi Yard, Guntur, AP", 
      notes: "Bulk Red Chilli",
      isActive: true 
    },
    { 
      id: "sup_3", 
      name: "Erode Manjal Mandi", 
      contactPerson: "Selvam",
      phone: "9443210987", 
      city: "Erode", 
      gstin: "", 
      address: "Semmampalayam, Erode", 
      notes: "Turmeric fingers and bulbs",
      isActive: true 
    }
  ];
  const [suppliers, setSuppliers] = useState(() => {
    try {
      const saved = localStorage.getItem("sdb_suppliers");
      return saved ? JSON.parse(saved) : DEFAULT_SUPPLIERS;
    } catch {
      return DEFAULT_SUPPLIERS;
    }
  });

  // Dynamic Business & Payment Settings State
  const [businessInfo, setBusinessInfo] = useState(() => {
    try {
      const saved = localStorage.getItem("sdb_business_info");
      return saved ? { ...BUSINESS_INFO, ...JSON.parse(saved) } : BUSINESS_INFO;
    } catch {
      return BUSINESS_INFO;
    }
  });

  // Dynamic Staff Members & Permissions State
  const [staffMembers, setStaffMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  // Active Billing Station / Cart State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [pricingTier, setPricingTier] = useState("R"); // 'SS' | 'D' | 'R' | 'C'
  const [cartItems, setCartItems] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState("fixed"); // "fixed" (₹) or "percent" (%)
  const [taxPercentOverride, setTaxPercent] = useState(null); // Optional override / draft buffer
  const [paymentMode, setPaymentMode] = useState("Cash"); // Cash, UPI, Credit / Khata, Bank Transfer
  const [paymentStatus, setPaymentStatus] = useState("paid"); // "paid" or "pending" (credit)
  const [notes, setNotes] = useState("");
  const [activeDraftId, setActiveDraftId] = useState(null); // When editing a draft order
  const [lastGeneratedInvoice, setLastGeneratedInvoice] = useState(null);

  // Sync with LocalStorage as offline buffer
  useEffect(() => {
    localStorage.setItem("sdb_products", JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem("sdb_categories", JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem("sdb_customers", JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem("sdb_suppliers", JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem("sdb_courier_partners", JSON.stringify(courierPartners));
  }, [courierPartners]);

  useEffect(() => {
    localStorage.setItem("sdb_mixers", JSON.stringify(mixers));
  }, [mixers]);

  useEffect(() => {
    localStorage.setItem("sdb_orders", JSON.stringify(orders));
  }, [orders]);

  // Purge any old mock data from previous sessions or seeded documents
  useEffect(() => {
    localStorage.removeItem("sdb_products");
    localStorage.removeItem("sdb_categories");
    localStorage.removeItem("sdb_customers");
    localStorage.removeItem("sdb_orders");

    const purgeOldMockDocuments = async () => {
      const purgeKey = "sdb_mock_purged_final_v1";
      if (localStorage.getItem(purgeKey)) return;

      try {
        const mockProdIds = [
          "prod-dindigul-biryani",
          "prod-chicken-pepper",
          "prod-pepper-powder",
          "prod-mutton-kulambu",
          "prod-chicken-kulambu",
          "prod-sambar-powder",
          "prod-rasam-powder",
          "prod-fish-fry"
        ];
        for (const id of mockProdIds) {
          await deleteDoc(doc(db, "billing_products", id)).catch(() => {});
        }

        const mockCustIds = ["cust-1", "cust-2", "cust-3", "cust-4"];
        for (const id of mockCustIds) {
          await deleteDoc(doc(db, "billing_customers", id)).catch(() => {});
        }

        const mockCatIds = ["ready-to-cook", "daily-essential", "easy-to-cook", "all"];
        for (const id of mockCatIds) {
          await deleteDoc(doc(db, "billing_categories", id)).catch(() => {});
        }

        localStorage.setItem(purgeKey, "true");
      } catch (err) {
        console.warn("Mock purge notice:", err);
      }
    };

    purgeOldMockDocuments();
  }, []);

  // Firestore Realtime Listeners
  useEffect(() => {
    let unsubscribeProducts = () => {};
    let unsubscribeCategories = () => {};
    let unsubscribeCustomers = () => {};
    let unsubscribeOrders = () => {};
    let unsubscribeExpenses = () => {};
    let unsubscribeRawMaterials = () => {};
    let unsubscribeExpenseCategories = () => {};
    let unsubscribeCustomerCategories = () => {};
    let unsubscribeSuppliers = () => {};
    let unsubscribeCouriers = () => {};
    let unsubscribeMixers = () => {};
    let unsubscribeSettings = () => {};
    let unsubscribeStaff = () => {};

    try {
      // 1. Products listener
      const prodCol = collection(db, "billing_products");
      unsubscribeProducts = onSnapshot(prodCol, (snapshot) => {
        const prods = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(prods);
        setFirebaseConnected(true);
        // Preload & warm cache for all product images immediately in browser memory
        prods.forEach(p => {
          if (p.image) preloadProductImage(p.image);
        });
      }, (err) => {
        console.warn("Firestore products listener note:", err.message);
      });

      // 2. Categories listener
      const catCol = collection(db, "billing_categories");
      unsubscribeCategories = onSnapshot(catCol, (snapshot) => {
        const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(cats);
      }, (err) => {
        console.warn("Firestore categories listener note:", err.message);
      });

      // 3. Customers listener
      const custCol = collection(db, "billing_customers");
      unsubscribeCustomers = onSnapshot(custCol, (snapshot) => {
        const custs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomers(custs);
      }, (err) => {
        console.warn("Firestore customers listener note:", err.message);
      });

      // 4. Orders & Drafts listener
      const ordersCol = collection(db, "billing_orders");
      unsubscribeOrders = onSnapshot(ordersCol, (snapshot) => {
        const ords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // sort by createdAt desc
        ords.sort((a, b) => (b.createdAt?.seconds || b.timestamp || 0) - (a.createdAt?.seconds || a.timestamp || 0));
        setOrders(ords);
        setLoading(false);
      }, (err) => {
        console.warn("Firestore orders listener note:", err.message);
        setLoading(false);
      });

      // 5. Expenses & Raw Material Purchases listener
      const expensesCol = collection(db, "billing_expenses");
      unsubscribeExpenses = onSnapshot(expensesCol, (snapshot) => {
        const exps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        exps.sort((a, b) => new Date(b.date || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0)) - new Date(a.date || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0)));
        setExpenses(exps);
      }, (err) => {
        console.warn("Firestore expenses listener note:", err.message);
      });

      // 6. Raw Materials Products Catalog listener
      const rawMaterialsCol = collection(db, "billing_raw_materials");
      unsubscribeRawMaterials = onSnapshot(rawMaterialsCol, (snapshot) => {
        const rms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        rms.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setRawMaterials(rms);
      }, (err) => {
        console.warn("Firestore raw materials listener note:", err.message);
      });

      // 7. Dynamic Expense Categories listener
      const expCatCol = collection(db, "billing_expense_categories");
      unsubscribeExpenseCategories = onSnapshot(expCatCol, (snapshot) => {
        if (!snapshot.empty) {
          const cats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          cats.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          setExpenseCategories(cats);
        } else {
          setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
        }
      }, (err) => {
        console.warn("Firestore expense categories listener note:", err.message);
      });

      // 8. Dynamic Suppliers listener
      const suppCol = collection(db, "billing_suppliers");
      unsubscribeSuppliers = onSnapshot(suppCol, (snapshot) => {
        if (!snapshot.empty) {
          const sups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          sups.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          setSuppliers(sups);
        } else {
          setSuppliers(DEFAULT_SUPPLIERS);
        }
      }, (err) => {
        console.warn("Firestore suppliers listener note:", err.message);
      });

      // 10. Dynamic Courier Partners listener
      const courierCol = collection(db, "billing_courier_partners");
      unsubscribeCouriers = onSnapshot(courierCol, async (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          setCourierPartners(list);
        } else {
          setCourierPartners(DEFAULT_COURIER_PARTNERS);
          try {
            for (const cp of DEFAULT_COURIER_PARTNERS) {
              await setDoc(doc(db, "billing_courier_partners", cp.id), {
                ...cp,
                timestamp: Date.now()
              }, { merge: true });
            }
          } catch (seedErr) {
            console.warn("Courier auto-seed note:", seedErr.message);
          }
        }
      }, (err) => {
        console.warn("Firestore couriers listener note:", err.message);
      });

      // 11. Dynamic Mixers & Product Formulation listener
      const mixersCol = collection(db, "billing_mixers");
      unsubscribeMixers = onSnapshot(mixersCol, async (snapshot) => {
        if (!snapshot.empty) {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
          setMixers(list);
        } else {
          setMixers(DEFAULT_MIXERS);
          try {
            for (const mx of DEFAULT_MIXERS) {
              await setDoc(doc(db, "billing_mixers", mx.id), {
                ...mx,
                timestamp: Date.now()
              }, { merge: true });
            }
          } catch (seedErr) {
            console.warn("Mixers auto-seed note:", seedErr.message);
          }
        }
      }, (err) => {
        console.warn("Firestore mixers listener note:", err.message);
      });

      // 12. Dynamic Business & Payment Settings listener
      const settingsDoc = doc(db, "billing_settings", "payment_settings");
      unsubscribeSettings = onSnapshot(settingsDoc, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setBusinessInfo(prev => {
            const next = {
              ...prev,
              bankName: data.bankName !== undefined ? data.bankName : prev.bankName,
              accountName: data.accountName !== undefined ? data.accountName : prev.accountName,
              accountNumber: data.accountNumber !== undefined ? data.accountNumber : prev.accountNumber,
              ifscCode: data.ifscCode !== undefined ? data.ifscCode : prev.ifscCode,
              upiId: data.upiId !== undefined ? data.upiId : prev.upiId,
              upiHolder: data.upiHolder !== undefined ? data.upiHolder : prev.upiHolder,
              qrCodePath: data.qrCodePath !== undefined ? data.qrCodePath : prev.qrCodePath
            };
            try {
              localStorage.setItem("sdb_business_info", JSON.stringify(next));
            } catch (err) {}
            return next;
          });
        }
      }, (err) => {
        console.warn("Firestore settings listener note:", err.message);
      });

      // 13. Dynamic Staff Members & Permissions listener
      const staffCol = collection(db, "billing_staff");
      unsubscribeStaff = onSnapshot(staffCol, (snapshot) => {
        const staff = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        staff.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        setStaffMembers(staff);
      }, (err) => {
        console.warn("Firestore staff listener note:", err.message);
      });

    } catch (error) {
      console.warn("Firebase listener initialization error:", error);
      setLoading(false);
    }

    return () => {
      unsubscribeProducts();
      unsubscribeCategories();
      unsubscribeCustomers();
      unsubscribeOrders();
      unsubscribeExpenses();
      unsubscribeRawMaterials();
      unsubscribeExpenseCategories();
      unsubscribeCustomerCategories();
      unsubscribeSuppliers();
      unsubscribeCouriers();
      unsubscribeMixers();
      unsubscribeSettings();
      unsubscribeStaff();
    };
  }, []);

  // CART CALCULATIONS (Subtotal = Total Product Price + Total GST; Grand Total = Subtotal - Discount)
  const subtotal = Math.round(cartItems.reduce((sum, item) => {
    if (item.isSample) return sum;
    const itemGst = item.gstPercent !== undefined ? Number(item.gstPercent) : 5;
    const unitInclusivePrice = item.inclusivePrice !== undefined
      ? Number(item.inclusivePrice)
      : Math.round((Number(item.wholesalePrice || item.price || 0) * (1 + itemGst / 100)) * 100) / 100;
    return sum + (Number(unitInclusivePrice) || 0) * (item.quantity || 1);
  }, 0) * 100) / 100;

  const discountAmount = discountType === "percent" 
    ? Math.round((subtotal * (Number(discount) || 0)) / 100) 
    : Math.min(subtotal, Number(discount) || 0);

  // Grand Total (Total Payable) is Subtotal after discount
  const grandTotal = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);

  // Taxable base (without GST) before discount for invoice breakdowns
  const taxableBase = cartItems.reduce((sum, item) => {
    if (item.isSample) return sum;
    const price = Number(item.wholesalePrice) || Number(item.price) || 0;
    return sum + price * (item.quantity || 1);
  }, 0);

  // Automatic GST calculation based on each product's specific GST %
  const totalItemGst = cartItems.reduce((sum, item) => {
    if (item.isSample) return sum;
    const price = Number(item.wholesalePrice) || Number(item.price) || 0;
    const qty = Number(item.quantity) || 1;
    const itemGst = item.gstPercent !== undefined ? Number(item.gstPercent) : 5;
    return sum + (price * qty * itemGst) / 100;
  }, 0);

  const discountFactor = subtotal > 0 ? grandTotal / subtotal : 1;
  const taxAmount = Math.round(totalItemGst * discountFactor * 100) / 100;
  const taxableAmount = Math.round((grandTotal - taxAmount) * 100) / 100;
  const taxPercent = taxPercentOverride !== null 
    ? taxPercentOverride 
    : (taxableAmount > 0 ? Math.round((taxAmount / taxableAmount) * 100) : 5);
  const totalItemsCount = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // CUSTOMER SHOP SELECTION & PRICING TIER ACTIONS
  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    if (!cust) {
      setPricingTier("R");
      return;
    }
    const tier = getCustomerPricingTier(cust);
    setPricingTier(tier);
    // Automatically recalculate existing cart items to the selected customer's tier!
    setCartItems(prev => prev.map(item => {
      if (item.isSample) return item;
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return item;
      const variant = prod.variants?.find(v => (v.size || v.name) === item.variantSize) || null;
      const newTierRate = getTierRate(variant || prod, tier);
      const gstPct = item.gstPercent !== undefined ? Number(item.gstPercent) : 5;
      const newInclusive = Math.round((newTierRate * (1 + gstPct / 100)) * 100) / 100;
      return {
        ...item,
        wholesalePrice: newTierRate,
        inclusivePrice: newInclusive,
        originalPrice: newTierRate,
        originalInclusivePrice: newInclusive
      };
    }));
  };

  const handleUpdatePricingTier = (newTier) => {
    setPricingTier(newTier);
    setCartItems(prev => prev.map(item => {
      if (item.isSample) return item;
      const prod = products.find(p => p.id === item.productId);
      if (!prod) return item;
      const variant = prod.variants?.find(v => (v.size || v.name) === item.variantSize) || null;
      const newTierRate = getTierRate(variant || prod, newTier);
      const gstPct = item.gstPercent !== undefined ? Number(item.gstPercent) : 5;
      const newInclusive = Math.round((newTierRate * (1 + gstPct / 100)) * 100) / 100;
      return {
        ...item,
        wholesalePrice: newTierRate,
        inclusivePrice: newInclusive,
        originalPrice: newTierRate,
        originalInclusivePrice: newInclusive
      };
    }));
  };

  // CART ACTIONS
  const addToCart = (product, qty = 1, isSample = false, variant = null) => {
    const selectedVariant = variant || (product.variants && product.variants.length > 0 ? product.variants[0] : null);
    const variantSize = selectedVariant?.size || product.unit || "Pack";
    const tierRate = getTierRate(selectedVariant || product, pricingTier);
    const gstPercent = product.gstPercent !== undefined ? Number(product.gstPercent) : 5;
    const unitInclusive = isSample ? 0 : Math.round((tierRate * (1 + gstPercent / 100)) * 100) / 100;
    const variantWholesale = isSample ? 0 : tierRate;
    const variantMrp = selectedVariant 
      ? (Number(selectedVariant.mrp) || Number(selectedVariant.price) || 0)
      : (Number(product.mrp) || Number(product.defaultPrice) || 0);
    
    const sizeSlug = variantSize.replace(/\s+/g, '').toLowerCase();
    const cartItemId = isSample ? `${product.id}__${sizeSlug}__sample` : `${product.id}__${sizeSlug}`;

    setCartItems(prev => {
      const existingIndex = prev.findIndex(item => item.id === cartItemId || item.cartItemId === cartItemId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + qty
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: cartItemId,
          cartItemId: cartItemId,
          productId: product.id,
          name: product.name,
          tamilName: product.tamilName || "",
          category: product.category,
          categoryName: product.categoryName || product.category,
          subcategory: product.subcategory || "",
          hsnCode: product.hsnCode || "0910 91 00",
          unit: variantSize,
          variantSize: variantSize,
          wholesalePrice: variantWholesale,
          inclusivePrice: unitInclusive,
          originalPrice: variantWholesale,
          originalInclusivePrice: unitInclusive,
          mrp: variantMrp,
          gstPercent: gstPercent,
          image: product.image || DEFAULT_PRODUCT_IMAGE,
          quantity: qty,
          isSample: Boolean(isSample),
          stock: selectedVariant?.stock ?? product.stock ?? 100
        }
      ];
    });
  };

  const addSampleToCart = (product, qty = 1, variant = null) => {
    addToCart(product, qty, true, variant);
  };

  const toggleCartItemSample = (cartItemId) => {
    setCartItems(prev => prev.map(item => {
      if (item.id === cartItemId || item.cartItemId === cartItemId) {
        const nextIsSample = !item.isSample;
        return {
          ...item,
          isSample: nextIsSample,
          wholesalePrice: nextIsSample ? 0 : (item.originalPrice || item.wholesalePrice || 0),
          inclusivePrice: nextIsSample ? 0 : (item.originalInclusivePrice || item.inclusivePrice || 0)
        };
      }
      return item;
    }));
  };

  const updateCartItemQuantity = (cartItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    setCartItems(prev => 
      prev.map(item => (item.id === cartItemId || item.cartItemId === cartItemId) ? { ...item, quantity: newQuantity } : item)
    );
  };

  const updateCartItemPrice = (cartItemId, newPrice, isInclusive = true) => {
    setCartItems(prev => 
      prev.map(item => {
        if (item.id !== cartItemId && item.cartItemId !== cartItemId) return item;
        const numPrice = Number(newPrice) || 0;
        const gstPct = item.gstPercent !== undefined ? Number(item.gstPercent) : 5;
        if (isInclusive) {
          const basePrice = Math.round((numPrice / (1 + gstPct / 100)) * 10000) / 10000;
          return {
            ...item,
            inclusivePrice: newPrice,
            wholesalePrice: basePrice
          };
        } else {
          const incPrice = Math.round((numPrice * (1 + gstPct / 100)) * 100) / 100;
          return {
            ...item,
            wholesalePrice: numPrice,
            inclusivePrice: incPrice
          };
        }
      })
    );
  };

  const removeFromCart = (cartItemId) => {
    setCartItems(prev => prev.filter(item => item.id !== cartItemId && item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
    setPricingTier('R');
    setDiscount(0);
    setTaxPercent(null);
    setPaymentMode("Cash");
    setPaymentStatus("paid");
    setNotes("");
    setActiveDraftId(null);
  };

  // LOAD DRAFT INTO CART FOR ON-FIELD SPOT EDITING
  const loadDraftIntoCart = (draftOrder) => {
    setActiveDraftId(draftOrder.id);
    setSelectedCustomer(draftOrder.customer || null);
    setCartItems(draftOrder.items || []);
    setDiscount(draftOrder.discount || 0);
    setDiscountType(draftOrder.discountType || "fixed");
    setTaxPercent(draftOrder.taxPercent !== undefined ? draftOrder.taxPercent : null);
    setPaymentMode(draftOrder.paymentMode || "Cash");
    setPaymentStatus(draftOrder.paymentStatus || "pending");
    setNotes(draftOrder.notes || "");
  };

  // SAVE AS DRAFT
  const saveAsDraft = async () => {
    if (!selectedCustomer) {
      throw new Error("Please select a Retailer Customer before saving a draft.");
    }
    if (cartItems.length === 0) {
      throw new Error("Cannot save an empty draft. Please add at least 1 product.");
    }

    const draftData = {
      type: "draft",
      status: "draft",
      invoiceNumber: activeDraftId ? (orders.find(o => o.id === activeDraftId)?.invoiceNumber || generateInvoiceNumber("DRF", orders)) : generateInvoiceNumber("DRF", orders),
      customer: selectedCustomer,
      items: cartItems,
      subtotal,
      taxableSubtotal: taxableBase,
      discount: discountAmount,
      discountValue: discount,
      discountType,
      taxableAmount,
      taxPercent,
      tax: taxAmount,
      cgst: Math.round((taxAmount / 2) * 100) / 100,
      sgst: Math.round((taxAmount / 2) * 100) / 100,
      grandTotal,
      totalItemsCount,
      paymentMode,
      paymentStatus: "pending",
      notes,
      timestamp: Date.now()
    };

    try {
      if (activeDraftId) {
        // Update existing draft
        await updateDoc(doc(db, "billing_orders", activeDraftId), {
          ...draftData,
          updatedAt: serverTimestamp()
        });
        setOrders(prev => prev.map(o => o.id === activeDraftId ? { ...o, ...draftData } : o));
      } else {
        // Create new draft
        const docRef = await addDoc(collection(db, "billing_orders"), {
          ...draftData,
          createdAt: serverTimestamp()
        });
        draftData.id = docRef.id;
        setOrders(prev => [draftData, ...prev]);
        setActiveDraftId(null);
      }
      clearCart();
      return draftData;
    } catch (err) {
      // Local fallback
      console.warn("Draft saved locally due to:", err.message);
      const fallbackId = activeDraftId || `local_drf_${Date.now()}`;
      const localDraft = { ...draftData, id: fallbackId };
      setOrders(prev => [localDraft, ...prev.filter(o => o.id !== fallbackId)]);
      clearCart();
      setActiveDraftId(null);
      return localDraft;
    }
  };

  // GENERATE FINAL BILL / SPOT INVOICE
  const finalizeBill = async () => {
    if (!selectedCustomer) {
      throw new Error("Shop Name and Phone number are mandatory. Please select or add a Customer.");
    }
    if (cartItems.length === 0) {
      throw new Error("Cart is empty. Please select products to generate bill.");
    }

    const invoiceNumber = generateInvoiceNumber("SBD", orders);
    const billData = {
      type: "invoice",
      status: "completed",
      invoiceNumber,
      customer: selectedCustomer,
      items: cartItems,
      subtotal,
      taxableSubtotal: taxableBase,
      discount: discountAmount,
      discountValue: discount,
      discountType,
      taxableAmount,
      taxPercent,
      tax: taxAmount,
      cgst: Math.round((taxAmount / 2) * 100) / 100,
      sgst: Math.round((taxAmount / 2) * 100) / 100,
      grandTotal,
      shippingCharges: 0,
      shippingCharge: 0,
      totalItemsCount,
      paymentMode,
      paymentStatus,
      notes,
      timestamp: Date.now(),
      finalizedAt: new Date().toISOString()
    };

    // If an activeDraftId was being edited, REMOVE/DELETE that draft document so it never lingers as a draft!
    if (activeDraftId) {
      try {
        await deleteDoc(doc(db, "billing_orders", activeDraftId));
      } catch (e) {
        console.warn("Delete draft note:", e.message);
      }
    }

    try {
      const docRef = await addDoc(collection(db, "billing_orders"), {
        ...billData,
        createdAt: serverTimestamp()
      });
      billData.id = docRef.id;
    } catch (err) {
      console.warn("Invoice saved in local state:", err.message);
      billData.id = `local_inv_${Date.now()}`;
    }

    // Deduct stock for products and variants (aggregates regular sales AND free sample quantities!)
    const productDeductionMap = {};
    for (const item of cartItems) {
      const pId = item.productId || item.id.split('__')[0];
      const vSize = item.variantSize || item.unit;
      const qty = Number(item.quantity || 0);

      if (!productDeductionMap[pId]) {
        productDeductionMap[pId] = { totalQty: 0, byVariant: {} };
      }
      productDeductionMap[pId].totalQty += qty;
      if (vSize) {
        productDeductionMap[pId].byVariant[vSize] = (productDeductionMap[pId].byVariant[vSize] || 0) + qty;
      }
    }

    for (const [pId, dedInfo] of Object.entries(productDeductionMap)) {
      try {
        const currentProd = products.find(p => p.id === pId);
        if (currentProd) {
          let updatedVariants = currentProd.variants;
          let newStock = Math.max(0, (Number(currentProd.stock) || 0) - dedInfo.totalQty);

          if (Array.isArray(currentProd.variants) && currentProd.variants.length > 0) {
            updatedVariants = currentProd.variants.map((v) => {
              const deductQty = dedInfo.byVariant[v.size] || 0;
              const curVarStock = Number(v.stock) || 0;
              const nextVarStock = Math.max(0, curVarStock - deductQty);
              return { ...v, stock: nextVarStock };
            });
            // Recompute total product stock from variants
            newStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
          }

          const updatePayload = { stock: newStock };
          if (updatedVariants) {
            updatePayload.variants = updatedVariants;
          }

          await updateDoc(doc(db, "billing_products", pId), updatePayload);
          setProducts(prev => prev.map(p => p.id === pId ? { ...p, ...updatePayload } : p));
        }
      } catch (e) {
        console.warn("Stock update warning:", e.message);
      }
    }

    // Update customer history & outstanding if pending
    try {
      const customerRef = doc(db, "billing_customers", selectedCustomer.id);
      const updatedTotalSpent = (selectedCustomer.totalSpent || 0) + grandTotal;
      const updatedOrderCount = (selectedCustomer.totalOrdersCount || 0) + 1;
      const additionalOutstanding = paymentStatus === "pending" ? grandTotal : 0;
      const updatedOutstanding = (selectedCustomer.outstandingBalance || 0) + additionalOutstanding;

      await updateDoc(customerRef, {
        totalSpent: updatedTotalSpent,
        totalOrdersCount: updatedOrderCount,
        outstandingBalance: updatedOutstanding,
        lastOrderDate: new Date().toISOString()
      });
    } catch (e) {
      console.warn("Customer stats update warning:", e.message);
    }

    // Add new completed bill and strictly remove any active draft from local state
    setOrders(prev => {
      const withoutDraft = activeDraftId ? prev.filter(o => o.id !== activeDraftId) : prev;
      return [billData, ...withoutDraft.filter(o => o.id !== billData.id)];
    });

    setLastGeneratedInvoice(billData);
    clearCart();
    return billData;
  };

  // ORDER MANAGEMENT
  const deleteOrder = async (orderId) => {
    const existing = orders.find(o => o.id === orderId);
    if (existing && existing.status !== "draft") {
      console.warn("Finalized orders cannot be deleted.");
      return;
    }
    try {
      await deleteDoc(doc(db, "billing_orders", orderId));
    } catch (e) {
      console.warn("Local delete note:", e.message);
    }
    setOrders(prev => prev.filter(o => o.id !== orderId));
    if (activeDraftId === orderId) {
      clearCart();
    }
  };

  const markOrderPaymentStatus = async (orderId, newStatus) => {
    try {
      await updateDoc(doc(db, "billing_orders", orderId), {
        paymentStatus: newStatus,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Payment status note:", e.message);
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: newStatus } : o));
  };

  // PRODUCT CRUD
  const addProduct = async (productData) => {
    const id = productData.id || `prod_${Date.now()}`;
    const newProduct = {
      ...productData,
      id,
      wholesalePrice: Number(productData.wholesalePrice) || 0,
      mrp: Number(productData.mrp) || 0,
      stock: Number(productData.stock) || 0,
      minStock: Number(productData.minStock) || 10,
      isActive: productData.isActive !== false,
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, "billing_products", id), {
        ...newProduct,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Local product save note:", e.message);
    }
    setProducts(prev => [newProduct, ...prev]);
    return newProduct;
  };

  const updateProduct = async (productId, updatedFields) => {
    const formatted = {
      ...updatedFields,
      wholesalePrice: updatedFields.wholesalePrice !== undefined ? Number(updatedFields.wholesalePrice) : undefined,
      mrp: updatedFields.mrp !== undefined ? Number(updatedFields.mrp) : undefined,
      stock: updatedFields.stock !== undefined ? Number(updatedFields.stock) : undefined
    };
    // remove undefined
    Object.keys(formatted).forEach(key => formatted[key] === undefined && delete formatted[key]);

    try {
      await updateDoc(doc(db, "billing_products", productId), {
        ...formatted,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Local product update note:", e.message);
    }
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, ...formatted } : p));
  };

  const restockProduct = async (productId, incomingQuantity, batchInfo = "", variantSize = null) => {
    const target = products.find(p => p.id === productId);
    if (!target) throw new Error("Product not found");
    const additional = Number(incomingQuantity) || 0;

    let updatedVariants = target.variants;
    let newStock = Math.max(0, (Number(target.stock) || 0) + additional);

    if (Array.isArray(target.variants) && target.variants.length > 0) {
      const targetSize = variantSize || target.variants[0]?.size;
      let matched = false;
      updatedVariants = target.variants.map(v => {
        if (v.size === targetSize || (!matched && target.variants.length === 1)) {
          matched = true;
          return { ...v, stock: Math.max(0, (Number(v.stock) || 0) + additional) };
        }
        return v;
      });
      if (!matched && updatedVariants.length > 0) {
        updatedVariants[0] = {
          ...updatedVariants[0],
          stock: Math.max(0, (Number(updatedVariants[0].stock) || 0) + additional)
        };
      }
      newStock = updatedVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
    }

    const payload = { 
      stock: newStock,
      lastRestockedAt: new Date().toISOString(),
      ...(batchInfo ? { lastBatchInfo: batchInfo } : {})
    };
    if (updatedVariants) {
      payload.variants = updatedVariants;
    }

    await updateProduct(productId, payload);
    return newStock;
  };

  const deleteProduct = async (productId) => {
    const target = products.find(p => p.id === productId);
    try {
      await deleteDoc(doc(db, "billing_products", productId));

      // If product image is stored in Firebase Storage, remove the file
      if (target?.image && target.image.includes("firebasestorage.googleapis.com")) {
        try {
          const fileRef = storageRef(storage, target.image);
          await deleteObject(fileRef);
        } catch (stErr) {
          console.warn("Firebase Storage image delete notice:", stErr.message);
        }
      }
    } catch (e) {
      console.warn("Local product delete note:", e.message);
    }
    setProducts(prev => prev.filter(p => p.id !== productId));
  };

  // CUSTOMER CRUD
  const addCustomer = async (customerData) => {
    if (!customerData.phone || (!customerData.customerName && !customerData.shopName)) {
      throw new Error("Contact Person and Phone Number are mandatory!");
    }
    const id = customerData.id || `cust_${Date.now()}`;
    const businessName = (customerData.businessName || customerData.shopName || customerData.customerName || "Customer").trim();
    const newCustomer = {
      ...customerData,
      id,
      shopName: businessName,
      businessName,
      customerName: (customerData.customerName || "").trim(),
      phone: (customerData.phone || "").trim(),
      isActive: customerData.isActive !== false,
      outstandingBalance: Number(customerData.outstandingBalance) || 0,
      totalOrdersCount: 0,
      totalSpent: 0,
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, "billing_customers", id), {
        ...newCustomer,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Local customer save note:", e.message);
    }
    setCustomers(prev => [newCustomer, ...prev]);
    return newCustomer;
  };

  const updateCustomer = async (customerId, updatedFields) => {
    try {
      await updateDoc(doc(db, "billing_customers", customerId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Local customer update note:", e.message);
    }
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, ...updatedFields } : c));
  };

  const deleteCustomer = async (customerId) => {
    try {
      await deleteDoc(doc(db, "billing_customers", customerId));
    } catch (e) {
      console.warn("Local customer delete note:", e.message);
    }
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(null);
    }
  };

  // CATEGORY & SUBCATEGORY CRUD MANAGEMENT
  const addCategory = async (catData) => {
    const id = catData.id || catData.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const newCat = {
      id,
      name: catData.name.trim(),
      tamilName: catData.tamilName?.trim() || "",
      navText: catData.navText?.trim() || catData.name.trim().toUpperCase(),
      subcategories: Array.isArray(catData.subcategories) ? catData.subcategories : [],
      isActive: catData.isActive !== false
    };

    try {
      await setDoc(doc(db, "billing_categories", id), newCat);
    } catch (e) {
      console.warn("Category save note:", e.message);
    }
    setCategories(prev => [...prev.filter(c => c.id !== id), newCat]);
    return newCat;
  };

  const updateCategory = async (categoryId, updatedFields) => {
    try {
      await updateDoc(doc(db, "billing_categories", categoryId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Category update note:", e.message);
    }
    setCategories(prev => prev.map(c => c.id === categoryId ? { ...c, ...updatedFields } : c));
  };

  const deleteCategory = async (categoryId) => {
    if (categoryId === "all") return; // cannot delete 'all'
    try {
      await deleteDoc(doc(db, "billing_categories", categoryId));
    } catch (e) {
      console.warn("Category delete note:", e.message);
    }
    setCategories(prev => prev.filter(c => c.id !== categoryId));
  };

  // Subcategory helpers (supports both string and { name, isActive })
  const addSubcategory = async (categoryId, subcategoryName) => {
    const cleanName = typeof subcategoryName === "string" ? subcategoryName.trim() : subcategoryName.name?.trim();
    if (!cleanName) return;

    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const existingSubcats = cat.subcategories || [];
    const exists = existingSubcats.some(s => (typeof s === "string" ? s : s.name).toLowerCase() === cleanName.toLowerCase());
    if (exists) return; // duplicate

    const newSubcatObj = { name: cleanName, isActive: true };
    const updatedSubcats = [...existingSubcats, newSubcatObj];
    await updateCategory(categoryId, { subcategories: updatedSubcats });
  };

  const toggleSubcategoryStatus = async (categoryId, subcatName, newStatus) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const updatedSubcats = (cat.subcategories || []).map(s => {
      const sName = typeof s === "string" ? s : s.name;
      if (sName === subcatName) {
        return { name: sName, isActive: newStatus };
      }
      return typeof s === "string" ? { name: s, isActive: true } : s;
    });
    await updateCategory(categoryId, { subcategories: updatedSubcats });
  };

  const editSubcategory = async (categoryId, oldName, newName) => {
    const cleanNew = newName.trim();
    if (!cleanNew || cleanNew === oldName) return;

    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const updatedSubcats = (cat.subcategories || []).map(s => {
      const sName = typeof s === "string" ? s : s.name;
      if (sName === oldName) {
        return typeof s === "object" ? { ...s, name: cleanNew } : { name: cleanNew, isActive: true };
      }
      return s;
    });
    await updateCategory(categoryId, { subcategories: updatedSubcats });

    // Also update any products that have this subcategory
    setProducts(prev => prev.map(p => {
      if (p.category === categoryId && p.subcategory === oldName) {
        updateProduct(p.id, { subcategory: cleanNew }).catch(() => {});
        return { ...p, subcategory: cleanNew };
      }
      return p;
    }));
  };

  const deleteSubcategory = async (categoryId, subcategoryName) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const updatedSubcats = (cat.subcategories || []).filter(s => {
      const sName = typeof s === "string" ? s : s.name;
      return sName !== subcategoryName;
    });
    await updateCategory(categoryId, { subcategories: updatedSubcats });
  };

  // ==========================================
  // RAW MATERIAL PRODUCTS (CATALOG) CRUD
  // ==========================================
  const addRawMaterial = async (rmData) => {
    if (!rmData.name) {
      throw new Error("Raw Material name is required!");
    }
    const id = rmData.id || `rm_${Date.now()}`;
    const newRM = {
      ...rmData,
      id,
      name: rmData.name.trim(),
      tamilName: rmData.tamilName?.trim() || "",
      hsnCode: rmData.hsnCode?.trim() || "0910 91 00",
      unit: rmData.unit || "Kg",
      standardRate: Number(rmData.standardRate) || 0,
      notes: rmData.notes?.trim() || "",
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, "billing_raw_materials", id), {
        ...newRM,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Raw material save note:", e.message);
    }
    setRawMaterials(prev => [...prev.filter(r => r.id !== id), newRM]);
    return newRM;
  };

  const updateRawMaterial = async (rmId, updatedFields) => {
    try {
      await updateDoc(doc(db, "billing_raw_materials", rmId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Raw material update note:", e.message);
    }
    setRawMaterials(prev => prev.map(r => r.id === rmId ? { ...r, ...updatedFields } : r));
  };

  const deleteRawMaterial = async (rmId) => {
    try {
      await deleteDoc(doc(db, "billing_raw_materials", rmId));
    } catch (e) {
      console.warn("Raw material delete note:", e.message);
    }
    setRawMaterials(prev => prev.filter(r => r.id !== rmId));
  };

  // ==========================================
  // EXPENSES & RAW MATERIAL PROCUREMENT BILLS CRUD
  // ==========================================
  const addExpense = async (expenseData, proofFile = null) => {
    const id = expenseData.id || `exp_${Date.now()}`;
    let proofUrl = expenseData.proofUrl || "";
    let proofPath = expenseData.proofPath || "";

    if (proofFile) {
      try {
        const uploadRes = await uploadProductImage(proofFile, "expense_bills");
        proofUrl = uploadRes.url;
        proofPath = uploadRes.path;
      } catch (err) {
        console.warn("Expense proof upload note:", err.message);
      }
    }

    const newExpense = {
      ...expenseData,
      id,
      amount: Number(expenseData.amount) || 0,
      date: expenseData.date || new Date().toISOString().split("T")[0],
      proofUrl,
      proofPath,
      timestamp: Date.now()
    };

    try {
      await setDoc(doc(db, "billing_expenses", id), {
        ...newExpense,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Expense save note:", e.message);
    }

    setExpenses(prev => [newExpense, ...prev.filter(x => x.id !== id)]);
    return newExpense;
  };

  const updateExpense = async (expenseId, updatedFields, newProofFile = null) => {
    let proofUrl = updatedFields.proofUrl;
    let proofPath = updatedFields.proofPath;

    if (newProofFile) {
      try {
        const uploadRes = await uploadProductImage(newProofFile, "expense_bills");
        proofUrl = uploadRes.url;
        proofPath = uploadRes.path;
      } catch (err) {
        console.warn("Expense proof re-upload note:", err.message);
      }
    }

    const payload = {
      ...updatedFields,
      amount: Number(updatedFields.amount) || 0,
      ...(proofUrl !== undefined ? { proofUrl } : {}),
      ...(proofPath !== undefined ? { proofPath } : {})
    };

    try {
      await updateDoc(doc(db, "billing_expenses", expenseId), {
        ...payload,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Expense update note:", e.message);
    }

    setExpenses(prev => prev.map(e => e.id === expenseId ? { ...e, ...payload, updatedAt: Date.now() } : e));
    return { id: expenseId, ...payload };
  };

  const deleteExpense = async (expenseId) => {
    const target = expenses.find(e => e.id === expenseId);
    try {
      await deleteDoc(doc(db, "billing_expenses", expenseId));
      if (target?.proofPath) {
        try {
          const imgRef = storageRef(storage, target.proofPath);
          await deleteObject(imgRef);
        } catch (e) {
          console.warn("Proof storage delete note:", e.message);
        }
      }
    } catch (e) {
      console.warn("Expense delete note:", e.message);
    }
    setExpenses(prev => prev.filter(e => e.id !== expenseId));
  };

  // ==========================================
  // GLOBAL IN-APP CONFIRMATION MODAL POPUP
  // ==========================================
  const [confirmModalState, setConfirmModalState] = useState({
    isOpen: false,
    title: "Confirm Deletion",
    message: "Are you sure you want to delete this? This action cannot be undone.",
    confirmText: "Delete",
    cancelText: "Cancel",
    isDanger: true,
    resolver: null
  });

  const showConfirmModal = ({
    title = "Confirm Deletion",
    message = "Are you sure you want to delete this? This action cannot be undone.",
    confirmText = "Delete",
    cancelText = "Cancel",
    isDanger = true
  }) => {
    return new Promise((resolve) => {
      setConfirmModalState({
        isOpen: true,
        title,
        message,
        confirmText,
        cancelText,
        isDanger,
        resolver: resolve
      });
    });
  };

  const handleConfirmModalConfirm = () => {
    if (confirmModalState.resolver) confirmModalState.resolver(true);
    setConfirmModalState(prev => ({ ...prev, isOpen: false, resolver: null }));
  };

  const handleConfirmModalCancel = () => {
    if (confirmModalState.resolver) confirmModalState.resolver(false);
    setConfirmModalState(prev => ({ ...prev, isOpen: false, resolver: null }));
  };

  // ==========================================
  // DYNAMIC EXPENSE CATEGORIES CRUD
  // ==========================================
  const addExpenseCategory = async (catData) => {
    if (!catData.name?.trim()) throw new Error("Category name is required!");
    const id = catData.id || `expcat_${Date.now()}`;
    const newCat = {
      id,
      name: catData.name.trim(),
      color: catData.color || "#0284C7",
      timestamp: Date.now()
    };
    try {
      await setDoc(doc(db, "billing_expense_categories", id), {
        ...newCat,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Expense category save note:", e.message);
    }
    setExpenseCategories(prev => [...prev.filter(c => c.id !== id), newCat]);
    return newCat;
  };

  const updateExpenseCategory = async (catId, updatedFields) => {
    try {
      await updateDoc(doc(db, "billing_expense_categories", catId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Expense category update note:", e.message);
    }
    setExpenseCategories(prev => prev.map(c => c.id === catId ? { ...c, ...updatedFields } : c));
  };

  const deleteExpenseCategory = async (catId) => {
    try {
      await deleteDoc(doc(db, "billing_expense_categories", catId));
    } catch (e) {
      console.warn("Expense category delete note:", e.message);
    }
    setExpenseCategories(prev => prev.filter(c => c.id !== catId));
  };

  // DYNAMIC CUSTOMER CATEGORIES CRUD
  const addCustomerCategory = async (catData) => {
    if (!catData.name?.trim()) throw new Error("Category name is required!");
    const id = catData.id || `custcat_${Date.now()}`;
    const newCat = {
      id,
      name: catData.name.trim(),
      tamilName: catData.tamilName?.trim() || "",
      color: catData.color || "#2563EB",
      timestamp: Date.now()
    };
    try {
      await setDoc(doc(db, "billing_customer_categories", id), {
        ...newCat,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Customer category save note:", e.message);
    }
    setCustomerCategories(prev => [...prev.filter(c => c.id !== id), newCat]);
    return newCat;
  };

  const updateCustomerCategory = async (catId, updatedFields) => {
    try {
      await updateDoc(doc(db, "billing_customer_categories", catId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Customer category update note:", e.message);
    }
    setCustomerCategories(prev => prev.map(c => c.id === catId ? { ...c, ...updatedFields } : c));
  };

  const deleteCustomerCategory = async (catId) => {
    try {
      await deleteDoc(doc(db, "billing_customer_categories", catId));
    } catch (e) {
      console.warn("Customer category delete note:", e.message);
    }
    setCustomerCategories(prev => prev.filter(c => c.id !== catId));
  };

  // DYNAMIC SUPPLIERS DIRECTORY CRUD
  const addSupplier = async (supData) => {
    if (!supData.name?.trim()) throw new Error("Supplier Name is required!");
    const id = supData.id || `sup_${Date.now()}`;
    const newSup = {
      id,
      name: supData.name.trim(),
      contactPerson: supData.contactPerson?.trim() || "",
      phone: supData.phone?.trim() || "",
      email: supData.email?.trim() || "",
      gstin: supData.gstin?.trim() || "",
      address: supData.address?.trim() || "",
      city: supData.city?.trim() || "",
      state: supData.state?.trim() || "Tamil Nadu",
      pincode: supData.pincode?.trim() || "",
      notes: supData.notes?.trim() || "",
      isActive: supData.isActive !== false,
      timestamp: Date.now()
    };
    try {
      await setDoc(doc(db, "billing_suppliers", id), {
        ...newSup,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Supplier save note:", e.message);
    }
    setSuppliers(prev => [...prev.filter(s => s.id !== id), newSup]);
    return newSup;
  };

  const updateSupplier = async (supId, updatedFields) => {
    try {
      await updateDoc(doc(db, "billing_suppliers", supId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Supplier update note:", e.message);
    }
    setSuppliers(prev => prev.map(s => s.id === supId ? { ...s, ...updatedFields } : s));
  };

  const deleteSupplier = async (supId) => {
    try {
      await deleteDoc(doc(db, "billing_suppliers", supId));
    } catch (e) {
      console.warn("Supplier delete note:", e.message);
    }
    setSuppliers(prev => prev.filter(s => s.id !== supId));
  };

  // DYNAMIC COURIER PARTNERS CRUD
  const addCourierPartner = async (courierData) => {
    if (!courierData.name?.trim()) throw new Error("Courier Company Name is required!");
    const id = courierData.id || `courier_${Date.now()}`;
    const newCourier = {
      id,
      name: courierData.name.trim(),
      code: (courierData.code || "").trim().toUpperCase(),
      trackingUrl: (courierData.trackingUrl || "").trim(),
      phone: (courierData.phone || "").trim(),
      notes: (courierData.notes || "").trim(),
      isActive: courierData.isActive !== false,
      timestamp: Date.now()
    };
    try {
      await setDoc(doc(db, "billing_courier_partners", id), {
        ...newCourier,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Courier partner save note:", e.message);
    }
    setCourierPartners(prev => [...prev.filter(c => c.id !== id), newCourier]);
    return newCourier;
  };

  const updateCourierPartner = async (courierId, updatedFields) => {
    try {
      await updateDoc(doc(db, "billing_courier_partners", courierId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Courier partner update note:", e.message);
    }
    setCourierPartners(prev => prev.map(c => c.id === courierId ? { ...c, ...updatedFields } : c));
  };

  const deleteCourierPartner = async (courierId) => {
    try {
      await deleteDoc(doc(db, "billing_courier_partners", courierId));
    } catch (e) {
      console.warn("Courier partner delete note:", e.message);
    }
    setCourierPartners(prev => prev.filter(c => c.id !== courierId));
  };

  // UPDATE ORDER SHIPPING / DISPATCH & TRACKING DETAILS
  const updateOrderShippingDetails = async (orderId, shippingData) => {
    const courierCompany = (shippingData.courierCompany || "").trim();
    const trackingId = (shippingData.trackingId || "").trim();
    const dispatchDate = shippingData.dispatchDate || "";
    const shippingCharges = Number(shippingData.shippingCharges) || 0;
    const shippingNotes = (shippingData.shippingNotes || "").trim();

    // Check existing order to update grandTotal
    const existingOrder = orders.find(o => o.id === orderId);
    let newGrandTotal = existingOrder?.grandTotal;
    if (existingOrder && existingOrder.subtotal !== undefined) {
      newGrandTotal = Math.round((Number(existingOrder.subtotal || 0) - Number(existingOrder.discount || 0) + shippingCharges) * 100) / 100;
    }

    const updatedFields = {
      courierCompany,
      trackingId,
      dispatchDate,
      shippingCharges,
      shippingCharge: shippingCharges,
      grandTotal: newGrandTotal !== undefined ? newGrandTotal : existingOrder?.grandTotal,
      shippingNotes,
      shippingDetails: {
        courierCompany,
        trackingId,
        dispatchDate,
        shippingCharges,
        shippingNotes,
        updatedAt: Date.now()
      }
    };

    try {
      await updateDoc(doc(db, "billing_orders", orderId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Order shipping update note:", e.message);
    }
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedFields } : o));
    return updatedFields;
  };

  // DYNAMIC PRODUCT MIXERS & RAW MATERIAL RATIOS CRUD
  const addMixer = async (mixerData) => {
    if (!mixerData.name?.trim()) throw new Error("Mixer Product / Formulation Name is required!");
    const id = mixerData.id || `mixer_${Date.now()}`;
    const newMixer = {
      id,
      name: mixerData.name.trim(),
      tamilName: (mixerData.tamilName || "").trim(),
      baseQuantity: Number(mixerData.baseQuantity) || 1, // Default 1 KG
      baseUnit: mixerData.baseUnit || "Kg",
      productId: mixerData.productId || "",
      description: (mixerData.description || "").trim(),
      instructions: (mixerData.instructions || "").trim(),
      ingredients: Array.isArray(mixerData.ingredients) ? mixerData.ingredients : [],
      isActive: mixerData.isActive !== false,
      timestamp: Date.now()
    };
    try {
      await setDoc(doc(db, "billing_mixers", id), {
        ...newMixer,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Mixer save note:", e.message);
    }
    setMixers(prev => [...prev.filter(m => m.id !== id), newMixer]);
    return newMixer;
  };

  const updateMixer = async (mixerId, updatedFields) => {
    try {
      await updateDoc(doc(db, "billing_mixers", mixerId), {
        ...updatedFields,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn("Mixer update note:", e.message);
    }
    setMixers(prev => prev.map(m => m.id === mixerId ? { ...m, ...updatedFields } : m));
  };

  const deleteMixer = async (mixerId) => {
    try {
      await deleteDoc(doc(db, "billing_mixers", mixerId));
    } catch (e) {
      console.warn("Mixer delete note:", e.message);
    }
    setMixers(prev => prev.filter(m => m.id !== mixerId));
  };

  const duplicateMixer = async (mixerOrId) => {
    const targetId = typeof mixerOrId === "object" ? mixerOrId?.id : mixerOrId;
    const existing = mixers.find(m => m.id === targetId);
    if (!existing) return null;
    const cloned = {
      ...existing,
      id: `mixer_${Date.now()}`,
      name: `${existing.name} (Copy)`,
      tamilName: existing.tamilName ? `${existing.tamilName} (நகல்)` : "",
      timestamp: Date.now()
    };
    return await addMixer(cloned);
  };

  // Payment & Business Settings Update
  const updatePaymentSettings = async (paymentData) => {
    try {
      const next = {
        ...businessInfo,
        ...paymentData
      };
      setBusinessInfo(next);
      try {
        localStorage.setItem("sdb_business_info", JSON.stringify(next));
      } catch (e) {}

      const settingsDoc = doc(db, "billing_settings", "payment_settings");
      await setDoc(settingsDoc, {
        ...paymentData,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return { success: true };
    } catch (error) {
      console.error("Failed to update payment settings:", error);
      return { success: false, error };
    }
  };

  // Staff & Role-Based Access Control (RBAC) CRUD
  const addStaff = async (staffData) => {
    const username = String(staffData.username || "").toLowerCase().trim();
    if (!username) throw new Error("Staff username is required.");

    const exists = staffMembers.some(s => s.username?.toLowerCase() === username);
    if (exists) {
      throw new Error(`Username "${username}" is already taken. Please choose another username.`);
    }

    const docData = {
      name: String(staffData.name || "").trim(),
      username,
      email: staffData.email ? String(staffData.email).toLowerCase().trim() : "",
      phone: staffData.phone ? String(staffData.phone).trim() : "",
      role: staffData.role ? String(staffData.role).trim() : "Staff",
      password: String(staffData.password || "").trim(),
      permissions: staffData.permissions || {},
      isActive: staffData.isActive !== false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(collection(db, "billing_staff"), docData);
    const newStaff = { id: docRef.id, ...docData };
    setStaffMembers(prev => [...prev.filter(s => s.id !== docRef.id), newStaff].sort((a, b) => (a.name || "").localeCompare(b.name || "")));
    return newStaff;
  };

  const updateStaff = async (staffId, updates) => {
    if (!staffId) throw new Error("Staff ID is required.");

    if (updates.username) {
      const username = String(updates.username).toLowerCase().trim();
      const exists = staffMembers.some(s => s.id !== staffId && s.username?.toLowerCase() === username);
      if (exists) {
        throw new Error(`Username "${username}" is already in use by another staff member.`);
      }
      updates.username = username;
    }

    const docRef = doc(db, "billing_staff", staffId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });

    setStaffMembers(prev => prev.map(s => s.id === staffId ? { ...s, ...updates } : s));
  };

  const deleteStaff = async (staffId) => {
    if (!staffId) throw new Error("Staff ID is required.");
    await deleteDoc(doc(db, "billing_staff", staffId));
    setStaffMembers(prev => prev.filter(s => s.id !== staffId));
  };

  const toggleStaffStatus = async (staffId, currentStatus) => {
    if (!staffId) return;
    const docRef = doc(db, "billing_staff", staffId);
    const nextStatus = !currentStatus;
    await updateDoc(docRef, {
      isActive: nextStatus,
      updatedAt: serverTimestamp()
    });
    setStaffMembers(prev => prev.map(s => s.id === staffId ? { ...s, isActive: nextStatus } : s));
  };

  return (
    <POSContext.Provider
      value={{
        BUSINESS_INFO: businessInfo,
        businessInfo,
        updatePaymentSettings,
        products,
        categories,
        customers,
        orders,
        loading,
        firebaseConnected,

        // Cart & Spot Billing
        selectedCustomer,
        setSelectedCustomer: handleSelectCustomer,
        pricingTier,
        setPricingTier: handleUpdatePricingTier,
        getCustomerPricingTier: (cust) => getCustomerPricingTier(cust),
        getTierRate: (prod, tier) => getTierRate(prod, tier || pricingTier),
        cartItems,
        addToCart,
        addSampleToCart,
        toggleCartItemSample,
        updateCartItemQuantity,
        updateCartItemPrice,
        removeFromCart,
        clearCart,
        subtotal,
        discount,
        setDiscount,
        discountType,
        setDiscountType,
        discountAmount,
        taxPercent,
        setTaxPercent,
        taxAmount,
        grandTotal,
        totalItemsCount,
        paymentMode,
        setPaymentMode,
        paymentStatus,
        setPaymentStatus,
        notes,
        setNotes,
        activeDraftId,
        loadDraftIntoCart,
        saveAsDraft,
        finalizeBill,

        // Invoice Modal
        lastGeneratedInvoice,
        setLastGeneratedInvoice,

        // Orders
        deleteOrder,
        markOrderPaymentStatus,

        // Products CRUD & Restock
        addProduct,
        updateProduct,
        restockProduct,
        deleteProduct,

        // Customers CRUD
        addCustomer,
        updateCustomer,
        deleteCustomer,

        // Categories & Subcategories CRUD
        addCategory,
        updateCategory,
        deleteCategory,
        addSubcategory,
        editSubcategory,
        deleteSubcategory,
        toggleSubcategoryStatus,

        // Raw Material Catalog CRUD
        rawMaterials,
        addRawMaterial,
        updateRawMaterial,
        deleteRawMaterial,

        // Expenses & Raw Materials Procurement Bills CRUD
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,

        // Dynamic Expense Categories CRUD
        expenseCategories,
        addExpenseCategory,
        updateExpenseCategory,
        deleteExpenseCategory,

        // Dynamic Customer Categories CRUD
        customerCategories,
        addCustomerCategory,
        updateCustomerCategory,
        deleteCustomerCategory,

        // Dynamic Suppliers Directory CRUD
        suppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier,

        // Dynamic Courier Partners & Shipping Tracking
        courierPartners,
        addCourierPartner,
        updateCourierPartner,
        deleteCourierPartner,
        updateOrderShippingDetails,

        // Dynamic Product Mixers & Raw Material Formulation
        mixers,
        addMixer,
        updateMixer,
        deleteMixer,
        duplicateMixer,

        // Staff & Role-Based Access Control (RBAC)
        staffMembers,
        addStaff,
        updateStaff,
        deleteStaff,
        toggleStaffStatus,

        // Global Delete / Action Confirm Modal
        showConfirmModal
      }}
    >
      {children}

      {/* Global In-App Confirm Modal Popup for all delete actions */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmText={confirmModalState.confirmText}
        cancelText={confirmModalState.cancelText}
        isDanger={confirmModalState.isDanger}
        onConfirm={handleConfirmModalConfirm}
        onCancel={handleConfirmModalCancel}
      />
    </POSContext.Provider>
  );
}

export function usePOS() {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error("usePOS must be used within a POSProvider");
  }
  return context;
}
