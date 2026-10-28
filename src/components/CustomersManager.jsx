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
  User
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

export default function CustomersManager({ onStartBillForCustomer }) {
  const { 
    customers, 
    categories = [],
    addCustomer, 
    updateCustomer, 
    deleteCustomer,
    showConfirmModal
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const initialFormData = {
    businessName: "",
    customerName: "",
    phone: "",
    gstin: "",
    category: "",
    subcategory: "",
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
      subcategory: customer.subcategory || "",
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

    const catObj = categories.find(c => c.id === formData.category);
    const categoryName = catObj ? catObj.name : (formData.category || "");

    const payload = {
      businessName,
      shopName,
      customerName,
      phone: formData.phone.trim(),
      gstin: formData.gstin.trim().toUpperCase(),
      category: formData.category || "",
      categoryName,
      subcategory: formData.subcategory || "",
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

  // Filter customers by search and active/inactive status
  const filteredCustomers = customers.filter(c => {
    // Status filter
    const isAct = c.isActive !== false;
    if (statusFilter === "active" && !isAct) return false;
    if (statusFilter === "inactive" && isAct) return false;

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (c.businessName && c.businessName.toLowerCase().includes(q)) ||
           (c.shopName && c.shopName.toLowerCase().includes(q)) || 
           (c.phone && c.phone.includes(q)) || 
           (c.customerName && c.customerName.toLowerCase().includes(q)) ||
           (c.gstin && c.gstin.toLowerCase().includes(q)) ||
           (c.categoryName && c.categoryName.toLowerCase().includes(q)) ||
           ((typeof c.subcategory === "string" ? c.subcategory : c.subcategory?.name || "").toLowerCase().includes(q)) ||
           (c.address && c.address.toLowerCase().includes(q)) ||
           (c.billingAddress?.city && c.billingAddress.city.toLowerCase().includes(q));
  });

  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.outstandingBalance) || 0), 0);
  const activeCount = customers.filter(c => c.isActive !== false).length;
  const inactiveCount = customers.filter(c => c.isActive === false).length;

  const selectedCategoryObj = categories.find(c => c.id === formData.category);
  const availableSubcategories = (selectedCategoryObj?.subcategories || [])
    .filter(s => typeof s === "string" || s.isActive !== false)
    .map(s => typeof s === "string" ? s : s.name);

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
          <h2 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
            Customers Directory
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "2px" }}>
            Registered wholesale customers, contacts, addresses, and spot billing.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
          >
            <Plus size={15} />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search and Status Filter Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "18px"
      }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: "1 1 280px", maxWidth: "420px" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
          <input
            type="text"
            placeholder="Search by Business, Contact, Phone, GSTIN..."
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
                        {customer.subcategory && (
                          <span style={{ color: "var(--sd-zinc-500)" }}> › {typeof customer.subcategory === "string" ? customer.subcategory : customer.subcategory?.name}</span>
                        )}
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

              {/* Main Categories, Subcategories & Billing Pricing Tier Dropdown Fields */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                <div>
                  <label className="input-label">
                    Category <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      const catObj = categories.find(c => c.id === newCatId);
                      const catName = catObj?.name || "";
                      let autoTier = formData.pricingTier || "R";
                      if (/stockist|ss/i.test(catName)) autoTier = "SS";
                      else if (/dealer/i.test(catName)) autoTier = "D";
                      else if (/customer|consumer/i.test(catName)) autoTier = "C";
                      else if (/retail/i.test(catName)) autoTier = "R";

                      setFormData({
                        ...formData,
                        category: newCatId,
                        subcategory: "", // reset subcategory on category change
                        pricingTier: autoTier
                      });
                    }}
                    className="custom-select"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.filter(c => c.id !== "all").map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.tamilName ? `(${cat.tamilName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">
                    Subcategory <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <select
                    value={formData.subcategory}
                    onChange={(e) => {
                      const subVal = e.target.value;
                      let autoTier = formData.pricingTier || "R";
                      if (/stockist|ss/i.test(subVal)) autoTier = "SS";
                      else if (/dealer/i.test(subVal)) autoTier = "D";
                      else if (/customer|consumer/i.test(subVal)) autoTier = "C";
                      else if (/retail/i.test(subVal)) autoTier = "R";

                      setFormData({ ...formData, subcategory: subVal, pricingTier: autoTier });
                    }}
                    className="custom-select"
                    disabled={!formData.category || availableSubcategories.length === 0}
                    style={{
                      opacity: (!formData.category || availableSubcategories.length === 0) ? 0.6 : 1,
                      cursor: (!formData.category || availableSubcategories.length === 0) ? "not-allowed" : "pointer"
                    }}
                  >
                    <option value="">
                      {!formData.category 
                        ? "-- Select Category First --" 
                        : (availableSubcategories.length > 0 ? "-- Select Subcategory --" : "-- No Subcategories --")}
                    </option>
                    {availableSubcategories.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">
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
    </div>
  );
}
