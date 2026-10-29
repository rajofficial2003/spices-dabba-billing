import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  Building2, 
  Store, 
  Phone, 
  MapPin, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  MessageCircle, 
  X, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  User, 
  AlertCircle 
} from "lucide-react";
import { cleanPhoneNumber } from "../utils/formatters";

export default function SuppliersManager({ subViewToggle = null }) {
  const { 
    suppliers = [], 
    addSupplier, 
    updateSupplier, 
    deleteSupplier,
    showConfirmModal
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const initialFormData = {
    name: "",
    contactPerson: "",
    phone: "",
    gstin: "",
    address: "",
    city: "Theni",
    state: "Tamil Nadu",
    pincode: "",
    notes: "",
    isActive: true
  };

  const [formData, setFormData] = useState(initialFormData);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData(initialFormData);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupplier(sup);
    setFormData({
      name: sup.name || "",
      contactPerson: sup.contactPerson || "",
      phone: sup.phone || "",
      gstin: sup.gstin || "",
      address: sup.address || (typeof sup.billingAddress === 'object' ? sup.billingAddress.address : "") || "",
      city: sup.city || (typeof sup.billingAddress === 'object' ? sup.billingAddress.city : "Theni") || "Theni",
      state: sup.state || (typeof sup.billingAddress === 'object' ? sup.billingAddress.state : "Tamil Nadu") || "Tamil Nadu",
      pincode: sup.pincode || (typeof sup.billingAddress === 'object' ? sup.billingAddress.pincode : "") || "",
      notes: sup.notes || "",
      isActive: sup.isActive !== false
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const handleStatusChange = async (newStatus) => {
    if (newStatus === formData.isActive) return;
    const ok = await showConfirmModal({
      title: newStatus ? "Mark Supplier Active" : "Mark Supplier Inactive",
      message: newStatus 
        ? `Are you sure you want to activate "${formData.name || 'this supplier'}"? They will appear in Raw Material Purchase bills.`
        : `Are you sure you want to mark "${formData.name || 'this supplier'}" as Inactive? They will be hidden from new purchase bill dropdowns.`,
      confirmText: newStatus ? "Yes, Mark Active" : "Yes, Mark Inactive",
      isDanger: !newStatus
    });
    if (ok) {
      setFormData(prev => ({ ...prev, isActive: newStatus }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Mandi / Supplier Name is mandatory!");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMsg("Phone number is mandatory!");
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        contactPerson: formData.contactPerson.trim(),
        phone: formData.phone.trim(),
        gstin: formData.gstin.trim().toUpperCase(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        notes: formData.notes.trim(),
        isActive: formData.isActive !== false
      };

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, payload);
      } else {
        await addSupplier(payload);
      }
      setShowModal(false);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save supplier details");
    }
  };

  const handleDelete = async (sup) => {
    const ok = await showConfirmModal({
      title: "Delete Supplier",
      message: `Are you sure you want to delete supplier "${sup.name}"? This action cannot be undone.`,
      confirmText: "Delete Supplier",
      isDanger: true
    });
    if (ok) {
      await deleteSupplier(sup.id);
    }
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s => {
    const isAct = s.isActive !== false;
    if (statusFilter === "active" && !isAct) return false;
    if (statusFilter === "inactive" && isAct) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (s.name && s.name.toLowerCase().includes(q)) ||
           (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
           (s.phone && s.phone.includes(q)) ||
           (s.city && s.city.toLowerCase().includes(q)) ||
           (s.state && s.state.toLowerCase().includes(q)) ||
           (s.pincode && s.pincode.includes(q)) ||
           (s.gstin && s.gstin.toLowerCase().includes(q)) ||
           (s.address && s.address.toLowerCase().includes(q));
  });

  const activeCount = suppliers.filter(s => s.isActive !== false).length;
  const inactiveCount = suppliers.filter(s => s.isActive === false).length;

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
            <Building2 size={22} color="var(--sd-red)" />
            <h2 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
              Suppliers & Mandi Directory
            </h2>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "3px" }}>
            Vendors, procurement mandis, contacts, GSTIN, and raw material purchase sources.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {subViewToggle}

          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.82rem" }}
          >
            <Plus size={15} />
            <span>Add New Supplier</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px",
        marginBottom: "18px"
      }}>
        <div style={{ position: "relative", maxWidth: "420px", flex: 1, minWidth: "260px" }}>
          <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
          <input
            type="text"
            placeholder="Search suppliers by Name, Contact, Phone, City, GSTIN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        {/* Status quick tabs: All, Active, Inactive */}
        <div style={{
          display: "flex",
          background: "var(--sd-zinc-100)",
          padding: "3px",
          borderRadius: "10px",
          border: "1px solid var(--sd-zinc-200)",
          gap: "2px"
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
              color: statusFilter === "all" ? "var(--sd-white)" : "var(--sd-zinc-600)",
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            All ({suppliers.length})
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("active")}
            style={{
              padding: "5px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: statusFilter === "active" ? 800 : 600,
              background: statusFilter === "active" ? "#16A34A" : "transparent",
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

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)" }}>
          <Building2 size={44} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 10px" }} />
          <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700 }}>No suppliers found</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "3px" }}>
            {statusFilter !== "all" 
              ? `No ${statusFilter} suppliers matched your search filter.` 
              : "Add your spice mandis and procurement vendors to track purchase bills."}
          </p>
        </div>
      ) : (
        <div className="responsive-cards-grid">
          {filteredSuppliers.map(sup => {
            const cleanPhone = cleanPhoneNumber(sup.phone);
            const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
            const isAct = sup.isActive !== false;

            return (
              <div
                key={sup.id}
                className="bw-card"
                style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  opacity: isAct ? 1 : 0.8,
                  borderColor: isAct ? "var(--sd-zinc-200)" : "var(--sd-zinc-300)"
                }}
              >
                {/* Header: Name & Status Pill */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px", gap: "8px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: 0, wordBreak: "break-word" }}>
                      {sup.name}
                    </h3>
                    {sup.contactPerson && (
                      <div style={{ fontSize: "0.8rem", color: "var(--sd-zinc-600)", marginTop: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                        <User size={12} color="var(--sd-zinc-400)" />
                        <span>Contact: <strong>{sup.contactPerson}</strong></span>
                      </div>
                    )}
                  </div>

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

                {/* Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", margin: "6px 0 12px", fontSize: "0.82rem", color: "var(--sd-zinc-600)" }}>
                  {/* Phone */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Phone size={13} color="var(--sd-red)" />
                    <a 
                      href={`tel:${sup.phone}`} 
                      style={{ color: "var(--sd-black)", fontWeight: 700, textDecoration: "none" }}
                    >
                      {sup.phone}
                    </a>
                  </div>

                  {/* GSTIN */}
                  {sup.gstin && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.76rem" }}>
                      <FileText size={13} style={{ color: "var(--sd-zinc-500)", flexShrink: 0 }} />
                      <span>GSTIN: <strong style={{ color: "var(--sd-black)", fontFamily: "monospace" }}>{sup.gstin}</strong></span>
                    </div>
                  )}

                  {/* Location / Address */}
                  {(sup.address || sup.city || sup.state || sup.pincode) && (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", fontSize: "0.76rem" }}>
                      <MapPin size={13} style={{ color: "var(--sd-zinc-400)", flexShrink: 0, marginTop: "2px" }} />
                      <span style={{ color: "var(--sd-zinc-700)" }}>
                        {[sup.address, sup.city, sup.state, sup.pincode ? `PIN: ${sup.pincode}` : null].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  {sup.notes && (
                    <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", fontStyle: "italic", marginTop: "2px" }}>
                      "{sup.notes}"
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--sd-zinc-200)",
                  marginTop: "auto"
                }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {waPhone && (
                      <a
                        href={`https://wa.me/${waPhone}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Chat on WhatsApp"
                        style={{
                          background: "#25D366",
                          color: "#FFFFFF",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: "8px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          textDecoration: "none"
                        }}
                      >
                        <MessageCircle size={13} />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(sup)}
                      className="btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "0.75rem" }}
                      title="Edit Supplier"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(sup)}
                      className="btn-secondary"
                      style={{ padding: "6px 10px", fontSize: "0.75rem", color: "var(--sd-red)" }}
                      title="Delete Supplier"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Supplier Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "16px"
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "540px",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              background: "var(--sd-black)",
              color: "#FFFFFF",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={20} color="var(--sd-red)" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                  {editingSupplier ? "Edit Supplier Details" : "Register New Supplier / Mandi"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "transparent", border: "none", color: "#FFFFFF", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {errorMsg && (
                <div style={{
                  background: "var(--sd-red-subtle)",
                  color: "var(--sd-red)",
                  border: "1px solid var(--sd-red-border)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  marginBottom: "12px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Supplier Name */}
                <div>
                  <label className="input-label">Mandi / Supplier Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sri Murugan Spices Mandi"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="text-input"
                  />
                </div>

                {/* Contact Person & Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label className="input-label">Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Murugan"
                      value={formData.contactPerson}
                      onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                      className="text-input"
                    />
                  </div>
                  <div>
                    <label className="input-label">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9842123456"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="text-input"
                      maxLength={10}
                    />
                  </div>
                </div>

                {/* GSTIN */}
                <div>
                  <label className="input-label">GSTIN (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="text-input"
                    maxLength={15}
                  />
                </div>

                {/* Address Section - Matching Register Customer Form */}
                <div style={{
                  background: "var(--sd-zinc-50)",
                  border: "1px solid var(--sd-zinc-200)",
                  borderRadius: "12px",
                  padding: "14px",
                  marginTop: "2px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
                    <Building2 size={16} color="var(--sd-black)" />
                    <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--sd-black)" }}>
                      Address
                    </span>
                  </div>

                  <div style={{ marginBottom: "8px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "4px" }}>
                      Address (Street / Door No / Area)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 12, Bazaar Street, Spices Yard"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
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
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
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
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
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
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                        className="text-input"
                        maxLength={6}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="input-label">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Bulk cardamom supplier, payment 15 days credit"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="text-input"
                  />
                </div>

                {/* Status Selection */}
                <div style={{
                  padding: "10px 14px",
                  background: "var(--sd-zinc-50)",
                  border: "1px solid var(--sd-zinc-200)",
                  borderRadius: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <label className="input-label" style={{ marginBottom: "2px", fontWeight: 700 }}>
                      Supplier Status
                    </label>
                    <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>
                      {formData.isActive ? "🟢 Active (Available in purchase bills)" : "⚪ Inactive (Hidden from bills)"}
                    </div>
                  </div>

                  <div style={{ display: "inline-flex", background: "var(--sd-zinc-200)", padding: "3px", borderRadius: "8px", gap: "3px" }}>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(true)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: formData.isActive ? 800 : 600,
                        border: "none",
                        cursor: "pointer",
                        background: formData.isActive ? "#16A34A" : "transparent",
                        color: formData.isActive ? "#FFFFFF" : "var(--sd-zinc-700)"
                      }}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange(false)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        fontSize: "0.78rem",
                        fontWeight: !formData.isActive ? 800 : 600,
                        border: "none",
                        cursor: "pointer",
                        background: !formData.isActive ? "var(--sd-zinc-700)" : "transparent",
                        color: !formData.isActive ? "#FFFFFF" : "var(--sd-zinc-700)"
                      }}
                    >
                      Inactive
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", paddingTop: "14px", marginTop: "14px", borderTop: "1px solid var(--sd-zinc-200)" }}>
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
                  {editingSupplier ? "Update Supplier" : "Register Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
