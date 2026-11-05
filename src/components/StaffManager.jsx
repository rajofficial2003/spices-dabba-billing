import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { ALL_PERMISSIONS } from "../context/AuthContext";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Edit3, 
  Trash2, 
  Check, 
  X, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  User, 
  Phone, 
  Briefcase, 
  Search, 
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function StaffManager() {
  const { staffMembers = [], addStaff, updateStaff, deleteStaff, toggleStaffStatus, showConfirmModal } = usePOS();

  const [searchTerm, setSearchTerm] = useState("");
  const [modalMode, setModalMode] = useState(null); // 'add' | 'edit' | null
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "Billing Staff",
    phone: "",
    isActive: true,
    permissions: {
      stats: false,
      pos: true,
      orders: true,
      finance: false,
      mixers: false,
      products: false,
      customers: false,
      finance_assets: false,
      settings: false
    }
  });

  const handleOpenAdd = () => {
    setErrorMsg("");
    setShowPassword(false);
    setFormData({
      name: "",
      username: "",
      password: "",
      role: "Billing Staff",
      phone: "",
      isActive: true,
      permissions: {
        stats: false,
        pos: true,
        orders: true,
        finance: false,
        mixers: false,
        products: false,
        customers: false,
        finance_assets: false,
        settings: false
      }
    });
    setModalMode("add");
  };

  const handleOpenEdit = (staff) => {
    setErrorMsg("");
    setShowPassword(false);
    setSelectedStaff(staff);
    setFormData({
      name: staff.name || "",
      username: staff.username || "",
      password: staff.password || "",
      role: staff.role || "Staff",
      phone: staff.phone || "",
      isActive: staff.isActive !== false,
      permissions: {
        stats: Boolean(staff.permissions?.stats),
        pos: Boolean(staff.permissions?.pos),
        orders: Boolean(staff.permissions?.orders),
        finance: Boolean(staff.permissions?.finance),
        mixers: Boolean(staff.permissions?.mixers),
        products: Boolean(staff.permissions?.products),
        customers: Boolean(staff.permissions?.customers),
        finance_assets: Boolean(staff.permissions?.finance_assets),
        settings: Boolean(staff.permissions?.settings)
      }
    });
    setModalMode("edit");
  };

  const handleTogglePermission = (key) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key]
      }
    }));
  };

  const handleApplyPreset = (presetType) => {
    if (presetType === "all") {
      const allPerms = {};
      ALL_PERMISSIONS.forEach(p => { allPerms[p.key] = true; });
      setFormData(prev => ({ ...prev, permissions: allPerms }));
    } else if (presetType === "billing") {
      setFormData(prev => ({
        ...prev,
        role: "Billing Staff",
        permissions: {
          stats: false,
          pos: true,
          orders: true,
          finance: false,
          mixers: false,
          products: false,
          customers: false,
          finance_assets: false,
          settings: false
        }
      }));
    } else if (presetType === "inventory") {
      setFormData(prev => ({
        ...prev,
        role: "Inventory Manager",
        permissions: {
          stats: false,
          pos: false,
          orders: false,
          finance: false,
          mixers: false,
          products: true,
          customers: false,
          finance_assets: true,
          settings: false
        }
      }));
    } else if (presetType === "none") {
      const noPerms = {};
      ALL_PERMISSIONS.forEach(p => { noPerms[p.key] = false; });
      setFormData(prev => ({ ...prev, permissions: noPerms }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Please enter the employee's name.");
      return;
    }

    const cleanUsername = formData.username.trim().toLowerCase().replace(/\s+/g, '');
    if (!cleanUsername) {
      setErrorMsg("Please provide a valid login username (alphanumeric, no spaces).");
      return;
    }

    if (!formData.password || formData.password.length < 4) {
      setErrorMsg("Password must be at least 4 characters long.");
      return;
    }

    const allowedCount = Object.values(formData.permissions).filter(Boolean).length;
    if (allowedCount === 0) {
      setErrorMsg("Please grant access to at least 1 page for this employee.");
      return;
    }

    try {
      setIsSaving(true);
      if (modalMode === "add") {
        await addStaff({
          ...formData,
          username: cleanUsername
        });
      } else if (modalMode === "edit" && selectedStaff) {
        await updateStaff(selectedStaff.id, {
          ...formData,
          username: cleanUsername
        });
      }
      setModalMode(null);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save employee. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStaff = async (staff) => {
    const confirmed = await showConfirmModal({
      title: "Confirm Remove Employee (ஊழியர் நீக்குதல்)",
      message: `Are you sure you want to permanently delete staff account for "${staff.name}" (${staff.username})? They will no longer be able to log in.`,
      confirmText: "Yes, Delete Staff",
      cancelText: "Cancel",
      isDanger: true
    });

    if (confirmed) {
      try {
        await deleteStaff(staff.id);
      } catch (err) {
        alert("Failed to delete staff: " + err.message);
      }
    }
  };

  const filteredStaff = staffMembers.filter(s => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (s.name || "").toLowerCase().includes(q) ||
      (s.username || "").toLowerCase().includes(q) ||
      (s.role || "").toLowerCase().includes(q) ||
      (s.phone || "").toLowerCase().includes(q)
    );
  });

  const activeCount = staffMembers.filter(s => s.isActive !== false).length;
  const inactiveCount = staffMembers.length - activeCount;

  return (
    <div style={{ marginTop: "16px" }}>
      {/* Header & Action Bar */}
      <div style={{
        background: "#FFFFFF",
        border: "1px solid var(--sd-zinc-200)",
        borderRadius: "16px",
        padding: "18px 22px",
        marginBottom: "20px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
      }}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--sd-zinc-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sd-black)"
              }}>
                <Users size={20} />
              </div>
              <h2 className="font-heading" style={{ fontSize: "1.25rem", fontWeight: 800, margin: 0, color: "var(--sd-black)" }}>
                Staff & Page Permissions (ஊழியர் மேலாண்மை)
              </h2>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", margin: "4px 0 0 0" }}>
              Create employee logins and customize strictly which pages each employee can view and access.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="btn-primary"
            style={{
              padding: "9px 18px",
              fontSize: "0.85rem",
              fontWeight: 800,
              background: "var(--sd-black)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.12)"
            }}
          >
            <UserPlus size={16} />
            <span>Add New Employee (+ ஊழியர் சேர்)</span>
          </button>
        </div>

        {/* Search & Quick Stats Pills */}
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginTop: "16px",
          paddingTop: "14px",
          borderTop: "1px solid var(--sd-zinc-100)"
        }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: "260px", flex: "1 1 280px", maxWidth: "400px" }}>
            <Search size={15} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
            <input
              type="text"
              placeholder="Search by name, username, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 34px",
                borderRadius: "8px",
                border: "1px solid var(--sd-zinc-200)",
                fontSize: "0.82rem",
                outline: "none",
                background: "#FAFAFA"
              }}
            />
          </div>

          {/* Quick Metrics Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{
              fontSize: "0.76rem",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "6px",
              background: "var(--sd-zinc-100)",
              color: "var(--sd-zinc-700)"
            }}>
              Total: <strong>{staffMembers.length}</strong>
            </span>
            <span style={{
              fontSize: "0.76rem",
              fontWeight: 700,
              padding: "4px 10px",
              borderRadius: "6px",
              background: "#ECFDF5",
              color: "#065F46"
            }}>
              Active: <strong>{activeCount}</strong>
            </span>
            {inactiveCount > 0 && (
              <span style={{
                fontSize: "0.76rem",
                fontWeight: 700,
                padding: "4px 10px",
                borderRadius: "6px",
                background: "#FEF2F2",
                color: "#991B1B"
              }}>
                Deactivated: <strong>{inactiveCount}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Staff Cards Grid */}
      {filteredStaff.length === 0 ? (
        <div style={{
          background: "#FFFFFF",
          border: "1px dashed var(--sd-zinc-300)",
          borderRadius: "16px",
          padding: "40px 20px",
          textAlign: "center"
        }}>
          <Users size={36} color="var(--sd-zinc-400)" style={{ margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: "0 0 6px 0" }}>
            {searchTerm ? "No matching employees found" : "No employee logins created yet"}
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", maxWidth: "440px", margin: "0 auto 16px" }}>
            {searchTerm 
              ? "Try adjusting your search keywords."
              : "Click 'Add New Employee' above to create login credentials and assign custom page access for your staff."}
          </p>
          {!searchTerm && (
            <button
              type="button"
              onClick={handleOpenAdd}
              style={{
                background: "var(--sd-black)",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <UserPlus size={15} />
              <span>Add First Employee</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
          gap: "16px"
        }}>
          {filteredStaff.map((staff) => {
            const allowedList = ALL_PERMISSIONS.filter(p => staff.permissions?.[p.key]);
            const isStaffActive = staff.isActive !== false;

            return (
              <div 
                key={staff.id}
                style={{
                  background: "#FFFFFF",
                  border: `1px solid ${isStaffActive ? "var(--sd-zinc-200)" : "#FECACA"}`,
                  borderRadius: "14px",
                  padding: "16px 18px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  opacity: isStaffActive ? 1 : 0.78,
                  transition: "all 0.15s ease"
                }}
              >
                <div>
                  {/* Top Bar: Name & Status */}
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px", marginBottom: "8px" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--sd-black)" }}>
                          {staff.name}
                        </span>
                        {!isStaffActive && (
                          <span style={{
                            fontSize: "0.65rem",
                            fontWeight: 800,
                            background: "#FEE2E2",
                            color: "#DC2626",
                            padding: "1px 6px",
                            borderRadius: "4px"
                          }}>
                            DEACTIVATED
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", marginTop: "2px" }}>
                        Role: <strong>{staff.role || "Staff"}</strong>
                      </div>
                    </div>

                    {/* Active Status Badge Toggle */}
                    <button
                      type="button"
                      onClick={() => toggleStaffStatus(staff.id, isStaffActive)}
                      style={{
                        background: isStaffActive ? "#ECFDF5" : "#FEF2F2",
                        color: isStaffActive ? "#065F46" : "#991B1B",
                        border: `1px solid ${isStaffActive ? "#A7F3D0" : "#FECACA"}`,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "0.70rem",
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      title={isStaffActive ? "Click to deactivate" : "Click to activate"}
                    >
                      {isStaffActive ? <Check size={12} /> : <X size={12} />}
                      <span>{isStaffActive ? "Active" : "Inactive"}</span>
                    </button>
                  </div>

                  {/* Login Credentials Box */}
                  <div style={{
                    background: "#FAFAFA",
                    border: "1px solid var(--sd-zinc-200)",
                    borderRadius: "8px",
                    padding: "8px 10px",
                    fontSize: "0.76rem",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr",
                    gap: "4px 8px",
                    alignItems: "center",
                    margin: "10px 0"
                  }}>
                    <span style={{ color: "var(--sd-zinc-500)", fontWeight: 600 }}>Login ID:</span>
                    <strong style={{ fontFamily: "monospace", color: "var(--sd-black)", fontSize: "0.82rem" }}>
                      {staff.username}
                    </strong>

                    <span style={{ color: "var(--sd-zinc-500)", fontWeight: 600 }}>Password:</span>
                    <span style={{ fontFamily: "monospace", color: "#52525B" }}>
                      •••••••• ({staff.password ? staff.password.substring(0, 1) + "***" : "Set"})
                    </span>

                    {staff.phone && (
                      <>
                        <span style={{ color: "var(--sd-zinc-500)", fontWeight: 600 }}>Phone:</span>
                        <span style={{ color: "var(--sd-black)" }}>{staff.phone}</span>
                      </>
                    )}
                  </div>

                  {/* Allowed Pages List */}
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "var(--sd-zinc-500)", letterSpacing: "0.4px", marginBottom: "6px" }}>
                      Allowed Pages ({allowedList.length} of {ALL_PERMISSIONS.length}):
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                      {allowedList.length === 0 ? (
                        <span style={{ fontSize: "0.72rem", color: "#DC2626", fontStyle: "italic" }}>
                          No pages permitted (Cannot access anything)
                        </span>
                      ) : (
                        allowedList.map((p) => (
                          <span
                            key={p.key}
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              background: "#F4F4F5",
                              color: "var(--sd-zinc-800)",
                              padding: "2px 7px",
                              borderRadius: "4px",
                              border: "1px solid var(--sd-zinc-200)"
                            }}
                          >
                            {p.label}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: "8px",
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--sd-zinc-100)"
                }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(staff)}
                    style={{
                      background: "#F4F4F5",
                      color: "var(--sd-black)",
                      border: "1px solid var(--sd-zinc-200)",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <Edit3 size={13} />
                    <span>Edit Access</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(staff)}
                    style={{
                      background: "#FEF2F2",
                      color: "#DC2626",
                      border: "1px solid #FECACA",
                      borderRadius: "6px",
                      padding: "5px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <Trash2 size={13} />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT EMPLOYEE MODAL */}
      {modalMode && (
        <div className="modal-overlay">
          <div 
            className="modal-content" 
            style={{ maxWidth: "620px", width: "95%", maxHeight: "92vh", overflowY: "auto" }}
          >
            {/* Modal Header */}
            <div style={{
              background: "#09090B",
              color: "#FFFFFF",
              padding: "14px 20px",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Users size={18} color="#FEF2F2" />
                <span className="font-heading" style={{ fontWeight: 800, fontSize: "1.05rem" }}>
                  {modalMode === "add" ? "Add New Employee (+ ஊழியர் சேர்)" : `Edit Employee: ${formData.name}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                style={{ background: "none", border: "none", color: "#A1A1AA", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
              {errorMsg && (
                <div style={{
                  background: "#FEF2F2",
                  color: "#991B1B",
                  border: "1px solid #FECACA",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "16px"
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Grid: Basic Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-black)", marginBottom: "4px" }}>
                    Full Name <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Karthik / Selvam"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-200)",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-black)", marginBottom: "4px" }}>
                    Role / Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Billing Staff / Store Manager"
                    value={formData.role}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-200)",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              {/* Grid: Username & Password */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-black)", marginBottom: "4px" }}>
                    Login Username <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. karthik / cashier1"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value.toLowerCase().replace(/\s+/g, '') }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-200)",
                      fontSize: "0.85rem",
                      outline: "none",
                      fontFamily: "monospace",
                      fontWeight: 700
                    }}
                  />
                  <span style={{ fontSize: "0.70rem", color: "var(--sd-zinc-500)", display: "block", marginTop: "2px" }}>
                    Staff will enter this username to login.
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-black)", marginBottom: "4px" }}>
                    Password <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="Min 4 characters"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      style={{
                        width: "100%",
                        padding: "8px 36px 8px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-200)",
                        fontSize: "0.85rem",
                        outline: "none",
                        fontFamily: showPassword ? "inherit" : "monospace"
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        color: "var(--sd-zinc-500)",
                        cursor: "pointer"
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <span style={{ fontSize: "0.70rem", color: "var(--sd-zinc-500)", display: "block", marginTop: "2px" }}>
                    Staff PIN or password.
                  </span>
                </div>
              </div>

              {/* Phone & Status */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "18px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-black)", marginBottom: "4px" }}>
                    Phone Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 9842100000"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-200)",
                      fontSize: "0.85rem",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-black)", marginBottom: "4px" }}>
                    Account Status
                  </label>
                  <select
                    value={formData.isActive ? "active" : "inactive"}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.value === "active" }))}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-200)",
                      fontSize: "0.85rem",
                      outline: "none",
                      background: "#FFFFFF"
                    }}
                  >
                    <option value="active">Active (Can Log In)</option>
                    <option value="inactive">Deactivated (Login Blocked)</option>
                  </select>
                </div>
              </div>

              {/* PERMISSION CHECKBOXES SECTION */}
              <div style={{
                background: "#F8F9FA",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "20px"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "10px",
                  marginBottom: "12px"
                }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "0.90rem", fontWeight: 800, color: "var(--sd-black)" }}>
                      Allowed Pages & Modules (பக்க அனுமதிகள்)
                    </h4>
                    <p style={{ margin: "2px 0 0 0", fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>
                      Check the boxes to allow access to specific sections.
                    </p>
                  </div>

                  {/* Quick Preset Buttons */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("all")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: "#FFFFFF",
                        border: "1px solid var(--sd-zinc-300)",
                        borderRadius: "5px",
                        cursor: "pointer"
                      }}
                    >
                      All Access
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("billing")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: "#FFFFFF",
                        border: "1px solid var(--sd-zinc-300)",
                        borderRadius: "5px",
                        cursor: "pointer"
                      }}
                    >
                      Billing Only
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("inventory")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: "#FFFFFF",
                        border: "1px solid var(--sd-zinc-300)",
                        borderRadius: "5px",
                        cursor: "pointer"
                      }}
                    >
                      Inventory Only
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyPreset("none")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        background: "#FFFFFF",
                        border: "1px solid var(--sd-zinc-300)",
                        borderRadius: "5px",
                        cursor: "pointer",
                        color: "#DC2626"
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Individual Module Checkbox List */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "10px" }}>
                  {ALL_PERMISSIONS.map((perm) => {
                    const isChecked = Boolean(formData.permissions[perm.key]);

                    return (
                      <label
                        key={perm.key}
                        onClick={() => handleTogglePermission(perm.key)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                          padding: "10px 12px",
                          borderRadius: "8px",
                          background: isChecked ? "#FFFFFF" : "#F4F4F5",
                          border: `1.5px solid ${isChecked ? "var(--sd-black)" : "transparent"}`,
                          cursor: "pointer",
                          transition: "all 0.12s ease",
                          userSelect: "none"
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // handled by label click
                          style={{
                            marginTop: "2px",
                            cursor: "pointer",
                            accentColor: "var(--sd-black)",
                            width: "16px",
                            height: "16px"
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "0.82rem", fontWeight: 800, color: isChecked ? "var(--sd-black)" : "var(--sd-zinc-600)" }}>
                            {perm.label}
                          </div>
                          <div style={{ fontSize: "0.70rem", color: "var(--sd-zinc-500)", marginTop: "2px", lineHeight: "1.25" }}>
                            {perm.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    background: "#FFFFFF",
                    color: "var(--sd-black)",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: "8px 22px",
                    borderRadius: "8px",
                    border: "none",
                    background: "var(--sd-black)",
                    color: "#FFFFFF",
                    fontSize: "0.85rem",
                    fontWeight: 800,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  {isSaving ? "Saving..." : (modalMode === "add" ? "Save Employee (+ சேமி)" : "Update Employee")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
