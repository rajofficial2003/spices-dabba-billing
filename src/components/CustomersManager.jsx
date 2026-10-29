import React, { useState } from "react";
import { usePOS, getCustomerPricingTier } from "../context/POSContext";
import { 
  Users, 
  Store, 
  Phone, 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  ShoppingCart, 
  MessageCircle, 
  X,
  Building2,
  Truck,
  FileText,
  CheckCircle2,
  XCircle,
  Tag,
  User,
  Layers,
  ExternalLink
} from "lucide-react";
import { formatCurrency, cleanPhoneNumber } from "../utils/formatters";

const formatAddress = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr.trim();
  const parts = [
    addr.address?.trim(),
    addr.city?.trim(),
    addr.state?.trim(),
    addr.pincode?.trim() ? `- ${addr.pincode.trim()}` : ""
  ].filter(Boolean);
  return parts.join(", ");
};

export default function CustomersManager({ onStartBillForCustomer, initialSubView = "customers" }) {
  const { 
    customers, 
    customerCategories = [],
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    addCustomerCategory,
    updateCustomerCategory,
    deleteCustomerCategory,
    courierPartners = [],
    addCourierPartner,
    updateCourierPartner,
    deleteCourierPartner,
    showConfirmModal
  } = usePOS();

  const [activeSubView, setActiveSubView] = useState(initialSubView || "customers");
  const [catSearchQuery, setCatSearchQuery] = useState("");
  const [showCatModal, setShowCatModal] = useState(false);

  React.useEffect(() => {
    if (initialSubView) {
      setActiveSubView(initialSubView);
    }
  }, [initialSubView]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Customer Category Manager States
  const [newCatName, setNewCatName] = useState("");
  const [newCatTier, setNewCatTier] = useState("R");
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [editingCatTier, setEditingCatTier] = useState("R");

  // Courier Partners Manager States
  const [courierSearchQuery, setCourierSearchQuery] = useState("");
  const [showCourierModal, setShowCourierModal] = useState(false);
  const [editingCourier, setEditingCourier] = useState(null);
  const [courierErrorMsg, setCourierErrorMsg] = useState("");
  const initialCourierFormData = {
    name: "",
    code: "",
    trackingUrl: "",
    phone: "",
    notes: "",
    isActive: true
  };
  const [courierFormData, setCourierFormData] = useState(initialCourierFormData);

  const handleOpenAddCourier = () => {
    setEditingCourier(null);
    setCourierFormData(initialCourierFormData);
    setCourierErrorMsg("");
    setShowCourierModal(true);
  };

  const handleOpenEditCourier = (courier) => {
    setEditingCourier(courier);
    setCourierFormData({
      name: courier.name || "",
      code: courier.code || "",
      trackingUrl: courier.trackingUrl || "",
      phone: courier.phone || "",
      notes: courier.notes || "",
      isActive: courier.isActive !== false
    });
    setCourierErrorMsg("");
    setShowCourierModal(true);
  };

  const handleSaveCourier = async (e) => {
    e.preventDefault();
    if (!courierFormData.name?.trim()) {
      setCourierErrorMsg("Courier Company Name is required!");
      return;
    }
    try {
      if (editingCourier) {
        await updateCourierPartner(editingCourier.id, courierFormData);
      } else {
        await addCourierPartner(courierFormData);
      }
      setShowCourierModal(false);
      setEditingCourier(null);
    } catch (err) {
      setCourierErrorMsg(err.message || "Failed to save courier partner");
    }
  };

  const handleDeleteCourierClick = async (courierId, courierName) => {
    const ok = await showConfirmModal({
      title: "Delete Courier Partner",
      message: `Are you sure you want to remove "${courierName}" from your courier partners list?`,
      confirmText: "Delete Courier",
      isDanger: true
    });
    if (ok) {
      deleteCourierPartner(courierId);
    }
  };

  const filteredCourierPartners = courierPartners.filter(c => {
    if (!courierSearchQuery.trim()) return true;
    const q = courierSearchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q))
    );
  });

  const initialFormData = {
    businessName: "",
    customerName: "",
    phone: "",
    gstin: "",
    category: "",
    pricingTier: "R",
    billingAddress: {
      address: "",
      city: "",
      state: "Tamil Nadu",
      pincode: ""
    },
    shippingAddress: {
      address: "",
      city: "",
      state: "Tamil Nadu",
      pincode: ""
    },
    sameAsBilling: true,
    notes: "",
    isActive: true
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData(initialFormData);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEdit = (customer) => {
    setEditingCustomer(customer);
    
    // Safely extract billing address (backward compatible with old single string address)
    const bAddr = customer.billingAddress || {
      address: customer.address || "",
      city: customer.city || "",
      state: customer.state || "Tamil Nadu",
      pincode: customer.pincode || ""
    };

    const sAddr = customer.shippingAddress || { ...bAddr };

    const isSame = !customer.shippingAddress || (
      (customer.shippingAddress.address || "") === (bAddr.address || "") &&
      (customer.shippingAddress.city || "") === (bAddr.city || "") &&
      (customer.shippingAddress.pincode || "") === (bAddr.pincode || "")
    );

    setFormData({
      businessName: customer.businessName || customer.shopName || "",
      customerName: customer.customerName || "",
      phone: customer.phone || "",
      gstin: customer.gstin || "",
      category: customer.category || "",
      pricingTier: customer.pricingTier || getCustomerPricingTier(customer) || "R",
      billingAddress: bAddr,
      shippingAddress: sAddr,
      sameAsBilling: isSame,
      notes: customer.notes || "",
      isActive: customer.isActive !== false
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    // Contact Person and Phone Number are mandatory
    if (!formData.customerName.trim()) {
      setErrorMsg("Shopkeeper / Contact Person is mandatory!");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg("Phone Number is mandatory!");
      return;
    }

    const finalShippingAddress = formData.sameAsBilling 
      ? { ...formData.billingAddress } 
      : formData.shippingAddress;

    // Create a unified address string for backward compatibility
    const addressComponents = [
      formData.billingAddress.address?.trim(),
      formData.billingAddress.city?.trim(),
      formData.billingAddress.state?.trim(),
      formData.billingAddress.pincode?.trim()
    ].filter(Boolean);
    const unifiedAddress = addressComponents.join(", ");

    const businessName = formData.businessName.trim();
    const customerName = formData.customerName.trim();
    // Default shopName to businessName or contact person so POS & Invoice continue to work
    const shopName = businessName || customerName;

    const catObj = customerCategories.find(c => c.id === formData.category || c.name === formData.category);
    const categoryName = catObj ? catObj.name : (formData.category || "");

    const payload = {
      businessName,
      shopName,
      customerName,
      phone: formData.phone.trim(),
      gstin: formData.gstin.trim().toUpperCase(),
      category: formData.category || "",
      categoryName,
      pricingTier: formData.pricingTier || "R",
      billingAddress: {
        address: formData.billingAddress.address?.trim() || "",
        city: formData.billingAddress.city?.trim() || "",
        state: formData.billingAddress.state?.trim() || "Tamil Nadu",
        pincode: formData.billingAddress.pincode?.trim() || ""
      },
      shippingAddress: {
        address: finalShippingAddress.address?.trim() || "",
        city: finalShippingAddress.city?.trim() || "",
        state: finalShippingAddress.state?.trim() || "Tamil Nadu",
        pincode: finalShippingAddress.pincode?.trim() || ""
      },
      address: unifiedAddress,
      notes: formData.notes.trim(),
      isActive: formData.isActive !== false,
      outstandingBalance: editingCustomer ? (Number(editingCustomer.outstandingBalance) || 0) : 0
    };

    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
      } else {
        await addCustomer(payload);
      }
      setShowModal(false);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save customer");
    }
  };

  // Status change handler inside the form with confirmation pop up modal
  const handleFormStatusChange = async (newStatus) => {
    if (newStatus === formData.isActive) return;
    const targetText = newStatus ? "Active" : "Inactive";
    const displayName = formData.businessName || formData.customerName || "this customer";

    const ok = await showConfirmModal({
      title: newStatus ? "Mark Customer Active" : "Mark Customer Inactive",
      message: newStatus
        ? `Are you sure you want to activate "${displayName}"? This customer will be available for spot billing.`
        : `Are you sure you want to mark "${displayName}" as Inactive? Inactive customers will not appear in the active spot billing list.`,
      confirmText: `Yes, Mark ${targetText}`,
      cancelText: "Cancel",
      isDanger: !newStatus
    });

    if (ok) {
      setFormData(prev => ({ ...prev, isActive: newStatus }));
      if (editingCustomer && editingCustomer.id) {
        try {
          await updateCustomer(editingCustomer.id, { isActive: newStatus });
        } catch (err) {
          console.error("Failed to update status directly:", err);
        }
      }
    }
  };

  // Customer Category Management Handlers
  const handleAddCategorySubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      const added = await addCustomerCategory({ 
        name: newCatName.trim(), 
        defaultPricingTier: newCatTier 
      });
      setFormData(prev => ({ ...prev, category: added.id || added.name, pricingTier: newCatTier }));
      setNewCatName("");
      setNewCatTier("R");
      setShowCatModal(false);
    } catch (err) {
      alert("Error adding customer category: " + err.message);
    }
  };

  const handleUpdateCategorySubmit = async (id) => {
    if (!editingCatName.trim()) return;
    try {
      await updateCustomerCategory(id, { 
        name: editingCatName.trim(), 
        defaultPricingTier: editingCatTier 
      });
      setEditingCatId(null);
      setShowCatModal(false);
    } catch (err) {
      alert("Error updating customer category: " + err.message);
    }
  };

  const filteredCustomerCategories = customerCategories.filter(cat => {
    const q = catSearchQuery.toLowerCase().trim();
    if (!q) return true;
    const nameMatch = (cat.name || "").toLowerCase().includes(q);
    const tierMatch = (cat.defaultPricingTier || "").toLowerCase().includes(q);
    return nameMatch || tierMatch;
  });

  const handleDeleteCategoryClick = async (id, name) => {
    const ok = await showConfirmModal({
      title: "Delete Customer Category",
      message: `Are you sure you want to delete category "${name}"?`,
      confirmText: "Delete Category",
      isDanger: true
    });
    if (!ok) return;

    try {
      await deleteCustomerCategory(id);
      if (categoryFilter === id || categoryFilter === name) setCategoryFilter("all");
    } catch (err) {
      alert("Error deleting customer category: " + err.message);
    }
  };

  // Filter customers by search, status, and category
  const filteredCustomers = customers.filter(c => {
    // Status filter
    const isAct = c.isActive !== false;
    if (statusFilter === "active" && !isAct) return false;
    if (statusFilter === "inactive" && isAct) return false;

    // Category filter
    if (categoryFilter !== "all" && c.category !== categoryFilter && c.categoryName !== categoryFilter) return false;

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (c.businessName && c.businessName.toLowerCase().includes(q)) ||
           (c.shopName && c.shopName.toLowerCase().includes(q)) || 
           (c.phone && c.phone.includes(q)) || 
           (c.customerName && c.customerName.toLowerCase().includes(q)) ||
           (c.gstin && c.gstin.toLowerCase().includes(q)) ||
           (c.categoryName && c.categoryName.toLowerCase().includes(q)) ||
           (c.category && c.category.toLowerCase().includes(q)) ||
           (c.address && c.address.toLowerCase().includes(q)) ||
           (c.billingAddress?.city && c.billingAddress.city.toLowerCase().includes(q));
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.outstandingBalance) || 0), 0);
  const activeCount = customers.filter(c => c.isActive !== false).length;
  const inactiveCount = customers.filter(c => c.isActive === false).length;

  return (
    <div className="responsive-page-container">
      {/* Header and Add button */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "16px",
        marginBottom: "20px",
        paddingBottom: "14px",
        borderBottom: "1px solid var(--sd-zinc-200)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {activeSubView === "categories" ? (
              <Layers size={22} color="var(--sd-red)" />
            ) : (
              <Store size={22} color="var(--sd-red)" />
            )}
            <h2 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
              {activeSubView === "categories" ? "Customer Categories" : "Customers Directory"}
            </h2>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "2px" }}>
            {activeSubView === "categories"
              ? "Define wholesale pricing tiers (SS, D, R, C) and customer shop categories."
              : "Registered wholesale customers, contacts, addresses, and spot billing."}
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
          {/* Sub-view Switcher Toggle */}
          <div style={{
            display: "inline-flex",
            background: "var(--sd-zinc-100)",
            padding: "4px",
            borderRadius: "12px",
            border: "1px solid var(--sd-zinc-200)",
            gap: "3px"
          }}>
            <button
              type="button"
              onClick={() => setActiveSubView("customers")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: activeSubView === "customers" ? 800 : 600,
                background: activeSubView === "customers" ? "var(--sd-black)" : "transparent",
                color: activeSubView === "customers" ? "#FFFFFF" : "var(--sd-zinc-700)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: activeSubView === "customers" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              <Store size={14} />
              <span>Customers ({customers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView("categories")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: activeSubView === "categories" ? 800 : 600,
                background: activeSubView === "categories" ? "var(--sd-black)" : "transparent",
                color: activeSubView === "categories" ? "#FFFFFF" : "var(--sd-zinc-700)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: activeSubView === "categories" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              <Layers size={14} />
              <span>Categories ({customerCategories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubView("couriers")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: activeSubView === "couriers" ? 800 : 600,
                background: activeSubView === "couriers" ? "var(--sd-black)" : "transparent",
                color: activeSubView === "couriers" ? "#FFFFFF" : "var(--sd-zinc-700)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: activeSubView === "couriers" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s ease"
              }}
            >
              <Truck size={14} />
              <span>Couriers ({courierPartners.length})</span>
            </button>
          </div>

          {activeSubView === "customers" ? (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
            >
              <Plus size={15} />
              <span>Add Customer</span>
            </button>
          ) : activeSubView === "categories" ? (
            <button
              type="button"
              onClick={() => {
                setEditingCatId(null);
                setNewCatName("");
                setNewCatTier("R");
                setShowCatModal(true);
              }}
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
            >
              <Plus size={15} />
              <span>Add Customer Category</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddCourier}
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
            >
              <Plus size={15} />
              <span>Add Courier Partner</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW 1: CUSTOMERS DIRECTORY */}
      <div style={{ display: activeSubView === "customers" ? "block" : "none" }}>
        {/* Search and Status Filter Bar */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "14px"
        }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "420px" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
          <input
            type="text"
            placeholder="Search by Business, Contact, Phone, GSTIN, Category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        {/* Status Filter Segmented Controls */}
        <div style={{
          display: "inline-flex",
          background: "var(--sd-zinc-100)",
          padding: "3px",
          borderRadius: "10px",
          border: "1px solid var(--sd-zinc-200)",
          gap: "4px"
        }}>
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: statusFilter === "all" ? 800 : 600,
              background: statusFilter === "all" ? "var(--sd-black)" : "transparent",
              color: statusFilter === "all" ? "#FFFFFF" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            All ({customers.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: statusFilter === "active" ? 800 : 600,
              background: statusFilter === "active" ? "#15803D" : "transparent",
              color: statusFilter === "active" ? "#FFFFFF" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            Active ({activeCount})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("inactive")}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: statusFilter === "inactive" ? 800 : 600,
              background: statusFilter === "inactive" ? "var(--sd-zinc-700)" : "transparent",
              color: statusFilter === "inactive" ? "#FFFFFF" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            Inactive ({inactiveCount})
          </button>
        </div>
      </div>

      {/* Category Quick Filter Pills */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "6px",
        alignItems: "center",
        marginBottom: "18px"
      }}>
        <button
          type="button"
          onClick={() => setCategoryFilter("all")}
          style={{
            padding: "5px 12px",
            borderRadius: "20px",
            fontSize: "0.78rem",
            fontWeight: categoryFilter === "all" ? 800 : 600,
            background: categoryFilter === "all" ? "var(--sd-black)" : "#FFFFFF",
            color: categoryFilter === "all" ? "#FFFFFF" : "var(--sd-zinc-700)",
            border: "1px solid var(--sd-zinc-200)",
            cursor: "pointer"
          }}
        >
          All Categories ({customers.length})
        </button>
        {customerCategories.map(cat => {
          const count = customers.filter(c => c.category === cat.id || c.category === cat.name || c.categoryName === cat.name).length;
          const isSelected = categoryFilter === cat.id || categoryFilter === cat.name;
          return (
            <button
              key={cat.id || cat.name}
              type="button"
              onClick={() => setCategoryFilter(isSelected ? "all" : (cat.id || cat.name))}
              style={{
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "0.78rem",
                fontWeight: isSelected ? 800 : 600,
                background: isSelected ? "var(--sd-black)" : "#FFFFFF",
                color: isSelected ? "#FFFFFF" : "var(--sd-zinc-700)",
                border: "1px solid var(--sd-zinc-200)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center"
              }}
            >
              <span>{cat.name} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* Customers Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)" }}>
          <Store size={44} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 10px" }} />
          <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700 }}>No customers found</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "3px" }}>
            {statusFilter !== "all" 
              ? `No ${statusFilter} customers matched your filter.` 
              : "Add your wholesale customer shops to start spot billing."}
          </p>
        </div>
      ) : (
        <div className="responsive-cards-grid">
          {filteredCustomers.map(customer => {
            const cleanPhone = cleanPhoneNumber(customer.phone);
            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const isAct = customer.isActive !== false;
            const displayName = customer.businessName || customer.shopName || customer.customerName || "Customer";

            const bAddrStr = formatAddress(customer.billingAddress) || customer.address || "";
            const sAddrStr = formatAddress(customer.shippingAddress);
            const isSameShipping = !sAddrStr || sAddrStr === bAddrStr;

            return (
              <div
                key={customer.id}
                className="bw-card"
                style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  opacity: isAct ? 1 : 0.8,
                  borderColor: isAct ? "var(--sd-zinc-200)" : "var(--sd-zinc-300)"
                }}
              >
                {/* Header: Name, Active Status Pill */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: 0, wordBreak: "break-word" }}>
                      {displayName}
                    </h3>
                    {customer.customerName && (customer.businessName || customer.shopName) && (
                      <div style={{ fontSize: "0.8rem", color: "var(--sd-zinc-600)", marginTop: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                        <User size={12} color="var(--sd-zinc-400)" />
                        <span>Contact: <strong>{customer.customerName}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Status Badge (Static display outside) */}
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "3px 9px",
                      borderRadius: "99px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      background: isAct ? "#DCFCE7" : "var(--sd-zinc-100)",
                      color: isAct ? "#15803D" : "var(--sd-zinc-600)",
                      border: isAct ? "1px solid #86EFAC" : "1px solid var(--sd-zinc-300)",
                      flexShrink: 0
                    }}
                  >
                    <span style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: isAct ? "#16A34A" : "var(--sd-zinc-400)"
                    }} />
                    {isAct ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Details Section - Directly matching the Register Customer Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "6px 0 12px", fontSize: "0.82rem", color: "var(--sd-zinc-600)" }}>
                  {/* Phone */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={13} color="var(--sd-red)" />
                    <a 
                      href={`tel:${customer.phone}`} 
                      style={{ color: "var(--sd-black)", fontWeight: 700, textDecoration: "none" }}
                    >
                      {customer.phone}
                    </a>
                  </div>

                  {/* GSTIN */}
                  {customer.gstin && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.76rem" }}>
                      <FileText size={13} style={{ color: "var(--sd-zinc-500)", flexShrink: 0 }} />
                      <span>GSTIN: <strong style={{ color: "var(--sd-black)", fontFamily: "monospace" }}>{customer.gstin}</strong></span>
                    </div>
                  )}

                  {/* Category & Pricing Tier Tag */}
                  {((customer.categoryName || customer.category) || customer.pricingTier) && (
                    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px", fontSize: "0.76rem" }}>
                      <Tag size={13} style={{ color: "var(--sd-red)", flexShrink: 0 }} />
                      <span style={{ color: "var(--sd-zinc-700)" }}>
                        {customer.categoryName || customer.category ? (
                          <>Category: <strong>{customer.categoryName || customer.category}</strong></>
                        ) : null}
                      </span>
                      {(() => {
                        const tier = customer.pricingTier || getCustomerPricingTier(customer);
                        const label = tier === 'SS' ? 'Super Stockist (SS)' : tier === 'D' ? 'Dealer (D)' : tier === 'C' ? 'Customer (C)' : 'Retailer (R)';
                        return (
                          <span style={{
                            marginLeft: "auto",
                            background: "var(--sd-zinc-100)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            color: "var(--sd-black)",
                            border: "1px solid var(--sd-zinc-200)"
                          }}>
                            Rate: {label}
                          </span>
                        );
                      })()}
                    </div>
                  )}

                  {/* Billing Address */}
                  {bAddrStr && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <Building2 size={13} style={{ flexShrink: 0, marginTop: "2px", color: "var(--sd-zinc-500)" }} />
                      <span><strong>Billing:</strong> {bAddrStr}</span>
                    </div>
                  )}

                  {/* Shipping Address */}
                  {(sAddrStr || customer.shippingAddress?.address) && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                      <Truck size={13} style={{ flexShrink: 0, marginTop: "2px", color: "var(--sd-zinc-500)" }} />
                      <span>
                        <strong>Shipping:</strong> {isSameShipping ? (
                          <span style={{ color: "var(--sd-zinc-500)", fontStyle: "italic" }}>Same as billing address</span>
                        ) : sAddrStr}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {customer.notes && (
                    <div style={{ fontSize: "0.76rem", color: "var(--sd-zinc-400)", fontStyle: "italic", marginTop: "2px" }}>
                      📌 {customer.notes}
                    </div>
                  )}
                </div>

                {/* Actions Footer */}
                <div style={{
                  marginTop: "auto",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--sd-zinc-200)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px"
                }}>
                  <button
                    type="button"
                    onClick={() => onStartBillForCustomer(customer)}
                    className="btn-primary"
                    style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1 }}
                    title="Start Spot Billing"
                  >
                    <ShoppingCart size={14} />
                    <span>New Bill</span>
                  </button>

                  <a
                    href={`https://wa.me/${waPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: "var(--sd-zinc-100)",
                      color: "var(--sd-black)",
                      border: "1px solid var(--sd-zinc-200)",
                      padding: "6px 10px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textDecoration: "none"
                    }}
                    title="WhatsApp"
                  >
                    <MessageCircle size={15} />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(customer)}
                    className="btn-secondary"
                    style={{ padding: "5px 8px" }}
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await showConfirmModal({
                        title: "Delete Customer",
                        message: `Are you sure you want to delete "${displayName}"? Customer record will be removed from your store list.`,
                        confirmText: "Delete Customer",
                        isDanger: true
                      });
                      if (ok) {
                        deleteCustomer(customer.id);
                      }
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--sd-zinc-400)",
                      padding: "4px"
                    }}
                    title="Delete"
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

      {/* VIEW 2: CUSTOMER CATEGORIES CATALOG */}
      <div style={{ display: activeSubView === "categories" ? "block" : "none" }}>
        {/* Search and Count Bar */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "18px"
        }}>
          <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "420px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
            <input
              type="text"
              placeholder="Search customer category by name or tier..."
              value={catSearchQuery}
              onChange={(e) => setCatSearchQuery(e.target.value)}
              className="text-input"
              style={{ paddingLeft: "38px" }}
            />
          </div>

          <div style={{
            background: "var(--sd-zinc-100)",
            color: "var(--sd-zinc-700)",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "1px solid var(--sd-zinc-200)"
          }}>
            Total Categories: <strong>{customerCategories.length}</strong>
          </div>
        </div>

        {/* Categories Cards Grid */}
        {filteredCustomerCategories.length === 0 ? (
          <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)" }}>
            <Layers size={44} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 10px" }} />
            <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700 }}>No customer categories found</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "3px", marginBottom: "16px" }}>
              {catSearchQuery ? "No categories matched your search." : "Define customer categories (Supermarket, Hotel, Wholesaler) with pricing tiers."}
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingCatId(null);
                setNewCatName("");
                setNewCatTier("R");
                setShowCatModal(true);
              }}
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.82rem" }}
            >
              <Plus size={15} />
              <span>Add First Category</span>
            </button>
          </div>
        ) : (
          <div className="responsive-cards-grid">
            {filteredCustomerCategories.map(cat => {
              const count = customers.filter(c => c.category === cat.id || c.category === cat.name || c.categoryName === cat.name).length;
              const tier = cat.defaultPricingTier || "R";
              const tierLabel = tier === 'SS' ? 'Super Stockist (SS)' : tier === 'D' ? 'Dealer (D)' : tier === 'C' ? 'Consumer (C)' : 'Retailer (R)';
              const tierStyle = tier === 'SS' ? { bg: '#EEF2FF', text: '#4F46E5', border: '#C7D2FE' }
                : tier === 'D' ? { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' }
                : tier === 'C' ? { bg: '#F5F3FF', text: '#7C3AED', border: '#DDD6FE' }
                : { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };

              return (
                <div
                  key={cat.id || cat.name}
                  className="bw-card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                    border: "1px solid var(--sd-zinc-200)"
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                      <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: 0, wordBreak: "break-word" }}>
                        {cat.name}
                      </h3>
                      <span style={{
                        background: tierStyle.bg,
                        color: tierStyle.text,
                        border: `1px solid ${tierStyle.border}`,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        whiteSpace: "nowrap"
                      }}>
                        Rate: {tierLabel}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--sd-zinc-600)" }}>
                      <Users size={14} color="var(--sd-zinc-500)" />
                      <span><strong>{count}</strong> {count === 1 ? "customer registered" : "customers registered"}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--sd-zinc-100)"
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setCategoryFilter(cat.id || cat.name);
                        setActiveSubView("customers");
                      }}
                      className="btn-secondary"
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flex: 1
                      }}
                    >
                      View {count} Customers
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(cat.id);
                        setEditingCatName(cat.name);
                        setEditingCatTier(cat.defaultPricingTier || "R");
                        setShowCatModal(true);
                      }}
                      className="btn-secondary"
                      style={{ padding: "5px 8px" }}
                      title="Edit Category"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategoryClick(cat.id, cat.name)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--sd-zinc-400)",
                        padding: "4px"
                      }}
                      title="Delete Category"
                    >
                      <Trash2 size={14} color="var(--sd-red)" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* VIEW 3: COURIER PARTNERS / COMPANIES CATALOG */}
      <div style={{ display: activeSubView === "couriers" ? "block" : "none" }}>
        {/* Search and Count Bar */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "18px"
        }}>
          <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "420px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
            <input
              type="text"
              placeholder="Search courier company by name, code, phone..."
              value={courierSearchQuery}
              onChange={(e) => setCourierSearchQuery(e.target.value)}
              className="text-input"
              style={{ paddingLeft: "38px" }}
            />
          </div>

          <div style={{
            background: "var(--sd-zinc-100)",
            color: "var(--sd-zinc-700)",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "1px solid var(--sd-zinc-200)"
          }}>
            Total Couriers: <strong>{courierPartners.length}</strong> • Active: <strong>{courierPartners.filter(c => c.isActive !== false).length}</strong>
          </div>
        </div>

        {/* Courier Cards Grid */}
        {filteredCourierPartners.length === 0 ? (
          <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)" }}>
            <Truck size={44} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 10px" }} />
            <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700 }}>No courier partners found</h3>
            <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "3px", marginBottom: "16px" }}>
              {courierSearchQuery ? "No couriers matched your search." : "Register courier services (Professional Couriers, ST Courier, DTDC) to manage shipments."}
            </p>
            <button
              type="button"
              onClick={handleOpenAddCourier}
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.82rem" }}
            >
              <Plus size={15} />
              <span>Add First Courier</span>
            </button>
          </div>
        ) : (
          <div className="responsive-cards-grid">
            {filteredCourierPartners.map(courier => {
              const isAct = courier.isActive !== false;

              return (
                <div
                  key={courier.id}
                  className="bw-card"
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "12px",
                    border: "1px solid var(--sd-zinc-200)",
                    opacity: isAct ? 1 : 0.75
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          background: isAct ? "var(--sd-red-subtle)" : "var(--sd-zinc-100)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0
                        }}>
                          <Truck size={18} color={isAct ? "var(--sd-red)" : "var(--sd-zinc-500)"} />
                        </div>
                        <div>
                          <h3 className="font-heading" style={{ fontSize: "1.02rem", fontWeight: 800, color: "var(--sd-black)", margin: 0, wordBreak: "break-word" }}>
                            {courier.name}
                          </h3>
                          {courier.code && (
                            <span style={{
                              display: "inline-block",
                              background: "var(--sd-zinc-100)",
                              color: "var(--sd-zinc-700)",
                              fontSize: "0.68rem",
                              fontWeight: 800,
                              padding: "1px 6px",
                              borderRadius: "4px",
                              marginTop: "2px",
                              fontFamily: "monospace"
                            }}>
                              CODE: {courier.code}
                            </span>
                          )}
                        </div>
                      </div>

                      <span style={{
                        background: isAct ? "#ECFDF5" : "#F4F4F5",
                        color: isAct ? "#059669" : "#71717A",
                        border: `1px solid ${isAct ? "#A7F3D0" : "#E4E4E7"}`,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        whiteSpace: "nowrap"
                      }}>
                        {isAct ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", fontSize: "0.78rem", color: "var(--sd-zinc-600)", marginTop: "10px" }}>
                      {courier.phone && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Phone size={13} color="var(--sd-zinc-400)" />
                          <span>Helpline: <strong>{courier.phone}</strong></span>
                        </div>
                      )}

                      {courier.trackingUrl && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <ExternalLink size={13} color="var(--sd-red)" />
                          <a 
                            href={courier.trackingUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: "var(--sd-red)", fontWeight: 700, textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            Online Tracking Portal
                          </a>
                        </div>
                      )}

                      {courier.notes && (
                        <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", fontStyle: "italic", marginTop: "2px" }}>
                          {courier.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "6px",
                    paddingTop: "10px",
                    borderTop: "1px solid var(--sd-zinc-100)"
                  }}>
                    <button
                      type="button"
                      onClick={() => updateCourierPartner(courier.id, { isActive: !isAct })}
                      className="btn-secondary"
                      style={{
                        padding: "5px 10px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        flex: 1
                      }}
                    >
                      {isAct ? "Set Inactive" : "Set Active"}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditCourier(courier)}
                      className="btn-secondary"
                      style={{ padding: "5px 8px" }}
                      title="Edit Courier Partner"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCourierClick(courier.id, courier.name)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--sd-zinc-400)",
                        padding: "4px"
                      }}
                      title="Delete Courier Partner"
                    >
                      <Trash2 size={14} color="var(--sd-red)" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal - only closes on Cancel / Close button click */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "520px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{
              background: "var(--sd-white)",
              color: "var(--sd-black)",
              padding: "16px 20px",
              borderTopLeftRadius: "18px",
              borderTopRightRadius: "18px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Store size={18} color="var(--sd-red)" />
                <h3 className="font-heading" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                  {editingCustomer ? "Edit Customer Details" : "Register Customer"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "var(--sd-zinc-500)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "18px" }}>
              {errorMsg && (
                <div style={{
                  background: "var(--sd-red-subtle)",
                  color: "var(--sd-red)",
                  border: "1px solid var(--sd-red-border)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  marginBottom: "14px",
                  fontWeight: 600
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Contact Person (Mandatory) */}
              <div style={{ marginBottom: "12px" }}>
                <label className="input-label">
                  Shopkeeper / Contact Person <span className="input-required">* (Mandatory)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. R. Murugesan"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="text-input"
                  required
                  autoFocus
                />
              </div>

              {/* Phone Number (Mandatory) */}
              <div style={{ marginBottom: "12px" }}>
                <label className="input-label">
                  Phone Number <span className="input-required">* (Mandatory)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9842145678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="text-input"
                  required
                />
              </div>

              {/* Business Name (Optional) */}
              <div style={{ marginBottom: "12px" }}>
                <label className="input-label">
                  Business Name <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sri Murugan Maligai Store"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="text-input"
                />
              </div>

              {/* GSTIN (Optional) */}
              <div style={{ marginBottom: "14px" }}>
                <label className="input-label">
                  GSTIN <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  value={formData.gstin}
                  onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                  className="text-input"
                  maxLength={15}
                  style={{ textTransform: "uppercase" }}
                />
              </div>

              {/* Customer Category & Billing Pricing Tier Dropdown Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label className="input-label" style={{ marginBottom: 0 }}>
                      Customer Category <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCatId(null);
                        setNewCatName("");
                        setNewCatTier("R");
                        setShowCatModal(true);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "var(--sd-red)",
                        fontSize: "0.72rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        padding: 0,
                        textDecoration: "underline"
                      }}
                    >
                      + Add Category
                    </button>
                  </div>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === "__NEW_CAT__") {
                        setEditingCatId(null);
                        setNewCatName("");
                        setNewCatTier("R");
                        setShowCatModal(true);
                        return;
                      }
                      const newCatId = e.target.value;
                      const catObj = customerCategories.find(c => c.id === newCatId || c.name === newCatId);
                      const catName = catObj?.name || newCatId;
                      let autoTier = catObj?.defaultPricingTier || formData.pricingTier || "R";
                      if (!catObj?.defaultPricingTier) {
                        if (/stockist|ss/i.test(catName)) autoTier = "SS";
                        else if (/dealer/i.test(catName)) autoTier = "D";
                        else if (/customer|consumer/i.test(catName)) autoTier = "C";
                        else if (/retail/i.test(catName)) autoTier = "R";
                      }

                      setFormData({
                        ...formData,
                        category: newCatId,
                        pricingTier: autoTier
                      });
                    }}
                    className="custom-select"
                  >
                    <option value="">-- Select Customer Category --</option>
                    {customerCategories.map(cat => (
                      <option key={cat.id || cat.name} value={cat.id || cat.name}>
                        {cat.name} {cat.tamilName ? `(${cat.tamilName})` : ''}
                      </option>
                    ))}
                    <option value="__NEW_CAT__" style={{ fontWeight: 800, color: "var(--sd-red)" }}>
                      + Add New Category...
                    </option>
                  </select>
                </div>

                <div>
                  <label className="input-label" style={{ marginBottom: "4px" }}>
                    Billing Pricing Tier <span className="input-required">*</span>
                  </label>
                  <select
                    value={formData.pricingTier || "R"}
                    onChange={(e) => setFormData({ ...formData, pricingTier: e.target.value })}
                    className="custom-select"
                    style={{ fontWeight: 700 }}
                  >
                    <option value="SS">Super Stockist (SS)</option>
                    <option value="D">Dealer Rate (D)</option>
                    <option value="R">Retailer Rate (R)</option>
                    <option value="C">Customer Rate (C)</option>
                  </select>
                </div>
              </div>

              {/* Billing Address Section */}
              <div style={{
                background: "var(--sd-zinc-50)",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "14px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                  <Building2 size={16} color="var(--sd-black)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--sd-black)" }}>
                    Billing Address
                  </span>
                </div>

                <div style={{ marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                    Address (Street / Door No / Area)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12, Bazaar Street"
                    value={formData.billingAddress.address}
                    onChange={(e) => setFormData({
                      ...formData,
                      billingAddress: { ...formData.billingAddress, address: e.target.value }
                    })}
                    className="text-input"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Theni"
                      value={formData.billingAddress.city}
                      onChange={(e) => setFormData({
                        ...formData,
                        billingAddress: { ...formData.billingAddress, city: e.target.value }
                      })}
                      className="text-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                      State
                    </label>
                    <input
                      type="text"
                      placeholder="Tamil Nadu"
                      value={formData.billingAddress.state}
                      onChange={(e) => setFormData({
                        ...formData,
                        billingAddress: { ...formData.billingAddress, state: e.target.value }
                      })}
                      className="text-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 625513"
                      value={formData.billingAddress.pincode}
                      onChange={(e) => setFormData({
                        ...formData,
                        billingAddress: { ...formData.billingAddress, pincode: e.target.value }
                      })}
                      className="text-input"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>

              {/* Shipping Address Section */}
              <div style={{
                background: "var(--sd-zinc-50)",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "12px",
                padding: "14px",
                marginBottom: "14px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", flexWrap: "wrap", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Truck size={16} color="var(--sd-black)" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--sd-black)" }}>
                      Shipping Address
                    </span>
                  </div>

                  <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-700)", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={formData.sameAsBilling}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData({
                          ...formData,
                          sameAsBilling: checked,
                          shippingAddress: checked ? { ...formData.billingAddress } : formData.shippingAddress
                        });
                      }}
                    />
                    <span>Same as Billing Address</span>
                  </label>
                </div>

                {!formData.sameAsBilling && (
                  <div>
                    <div style={{ marginBottom: "8px" }}>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                        Address (Delivery Point / Area)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Godown No 4, Main Road"
                        value={formData.shippingAddress.address}
                        onChange={(e) => setFormData({
                          ...formData,
                          shippingAddress: { ...formData.shippingAddress, address: e.target.value }
                        })}
                        className="text-input"
                      />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                          City
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Theni"
                          value={formData.shippingAddress.city}
                          onChange={(e) => setFormData({
                            ...formData,
                            shippingAddress: { ...formData.shippingAddress, city: e.target.value }
                          })}
                          className="text-input"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                          State
                        </label>
                        <input
                          type="text"
                          placeholder="Tamil Nadu"
                          value={formData.shippingAddress.state}
                          onChange={(e) => setFormData({
                            ...formData,
                            shippingAddress: { ...formData.shippingAddress, state: e.target.value }
                          })}
                          className="text-input"
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                          Pincode
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 625513"
                          value={formData.shippingAddress.pincode}
                          onChange={(e) => setFormData({
                            ...formData,
                            shippingAddress: { ...formData.shippingAddress, pincode: e.target.value }
                          })}
                          className="text-input"
                          maxLength={6}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Customer Notes (Optional) */}
              <div style={{ marginBottom: "14px" }}>
                <label className="input-label">
                  Customer Notes <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Preferred delivery morning time, landmark near temple..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="text-input"
                />
              </div>

              {/* Customer Status Selection (Active / Inactive) with Confirmation Pop-up */}
              <div style={{
                marginBottom: "16px",
                padding: "10px 14px",
                background: "var(--sd-zinc-50)",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px"
              }}>
                <div>
                  <label className="input-label" style={{ marginBottom: "2px", fontWeight: 700 }}>
                    Customer Status
                  </label>
                  <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>
                    {formData.isActive ? "🟢 Active (Can do billing)" : "⚪ Inactive (Hidden from billing)"}
                  </div>
                </div>

                <div style={{ display: "inline-flex", background: "var(--sd-zinc-200)", padding: "3px", borderRadius: "10px", gap: "3px" }}>
                  <button
                    type="button"
                    id="form-btn-active"
                    onClick={() => handleFormStatusChange(true)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: formData.isActive ? 800 : 600,
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: formData.isActive ? "#16A34A" : "transparent",
                      color: formData.isActive ? "#FFFFFF" : "var(--sd-zinc-700)",
                      boxShadow: formData.isActive ? "0 1px 4px rgba(22, 163, 74, 0.3)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    id="form-btn-inactive"
                    onClick={() => handleFormStatusChange(false)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: !formData.isActive ? 800 : 600,
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: !formData.isActive ? "var(--sd-zinc-700)" : "transparent",
                      color: !formData.isActive ? "#FFFFFF" : "var(--sd-zinc-700)",
                      boxShadow: !formData.isActive ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <XCircle size={14} />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "8px", borderTop: "1px solid var(--sd-zinc-200)" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-accent"
                >
                  {editingCustomer ? "Update Customer" : "Register Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Category Add / Edit Modal */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={18} color="var(--sd-red)" />
                <h3 className="font-heading" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                  {editingCatId ? "Edit Customer Category" : "Add Customer Category"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCatModal(false);
                  setEditingCatId(null);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--sd-zinc-500)",
                  padding: "4px"
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (editingCatId) {
                  await handleUpdateCategorySubmit(editingCatId);
                } else {
                  await handleAddCategorySubmit(e);
                }
              }}
              style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div>
                <label className="input-label" style={{ fontWeight: 700, marginBottom: "4px" }}>
                  Category Name <span className="input-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Modern Trade / Supermarket, Hotel"
                  value={editingCatId ? editingCatName : newCatName}
                  onChange={(e) => editingCatId ? setEditingCatName(e.target.value) : setNewCatName(e.target.value)}
                  className="text-input"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="input-label" style={{ fontWeight: 700, marginBottom: "4px" }}>
                  Default Pricing Tier <span className="input-required">*</span>
                </label>
                <select
                  value={editingCatId ? editingCatTier : newCatTier}
                  onChange={(e) => editingCatId ? setEditingCatTier(e.target.value) : setNewCatTier(e.target.value)}
                  className="text-input"
                  style={{ fontWeight: 700 }}
                >
                  <option value="R">Retailer Rate (R)</option>
                  <option value="SS">Super Stockist Rate (SS)</option>
                  <option value="D">Dealer Rate (D)</option>
                  <option value="C">Consumer Rate (C)</option>
                </select>
                <p style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", marginTop: "4px", margin: "4px 0 0 0" }}>
                  Customers registered under this category will automatically get this wholesale price tier during billing.
                </p>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCatModal(false);
                    setEditingCatId(null);
                  }}
                  className="btn-secondary"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "8px 18px" }}
                >
                  {editingCatId ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD / EDIT COURIER PARTNER MODAL */}
      {showCourierModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{
              background: "var(--sd-white)",
              color: "var(--sd-black)",
              padding: "16px 20px",
              borderTopLeftRadius: "18px",
              borderTopRightRadius: "18px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              position: "sticky",
              top: 0,
              zIndex: 10
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Truck size={18} color="var(--sd-red)" />
                <h3 className="font-heading" style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800 }}>
                  {editingCourier ? "Edit Courier Partner" : "Register Courier Partner"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCourierModal(false);
                  setEditingCourier(null);
                }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCourier} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {courierErrorMsg && (
                <div style={{
                  padding: "10px 12px",
                  background: "var(--sd-red-subtle)",
                  color: "var(--sd-red)",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  border: "1px solid var(--sd-red-border)"
                }}>
                  {courierErrorMsg}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-800)", marginBottom: "4px" }}>
                  Courier Company Name <span style={{ color: "var(--sd-red)" }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. The Professional Couriers, ST Courier, DTDC"
                  value={courierFormData.name}
                  onChange={(e) => setCourierFormData({ ...courierFormData, name: e.target.value })}
                  className="text-input"
                  required
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-800)", marginBottom: "4px" }}>
                    Short Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TPC, STC, DTDC"
                    value={courierFormData.code}
                    onChange={(e) => setCourierFormData({ ...courierFormData, code: e.target.value.toUpperCase() })}
                    className="text-input"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-800)", marginBottom: "4px" }}>
                    Helpline / Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 044-22250000"
                    value={courierFormData.phone}
                    onChange={(e) => setCourierFormData({ ...courierFormData, phone: e.target.value })}
                    className="text-input"
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-800)", marginBottom: "4px" }}>
                  Online Tracking Portal URL
                </label>
                <input
                  type="url"
                  placeholder="e.g. https://www.tpcindia.com"
                  value={courierFormData.trackingUrl}
                  onChange={(e) => setCourierFormData({ ...courierFormData, trackingUrl: e.target.value })}
                  className="text-input"
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-800)", marginBottom: "4px" }}>
                  Remarks / Service Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Tamil Nadu overnight dispatch partner, pickup at 6 PM"
                  value={courierFormData.notes}
                  onChange={(e) => setCourierFormData({ ...courierFormData, notes: e.target.value })}
                  className="text-input"
                  style={{ resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                <input
                  type="checkbox"
                  id="courierActiveCheckbox"
                  checked={courierFormData.isActive}
                  onChange={(e) => setCourierFormData({ ...courierFormData, isActive: e.target.checked })}
                  style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "var(--sd-red)" }}
                />
                <label htmlFor="courierActiveCheckbox" style={{ fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}>
                  Active Courier Partner (available for order dispatch selection)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCourierModal(false);
                    setEditingCourier(null);
                  }}
                  className="btn-secondary"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "8px 18px" }}
                >
                  {editingCourier ? "Save Changes" : "Register Courier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
