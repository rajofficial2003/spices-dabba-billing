import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  Boxes, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Tag,
  Hash,
  Scale
} from "lucide-react";
import { formatCurrency } from "../utils/formatters";

// Common Spices Raw Materials quick templates
const QUICK_RAW_TEMPLATES = [
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

export default function RawMaterialsManager({ subViewToggle = null }) {
  const { 
    rawMaterials, 
    addRawMaterial, 
    updateRawMaterial, 
    deleteRawMaterial,
    showConfirmModal
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingRM, setEditingRM] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    tamilName: "",
    hsnCode: "0910 91 00",
    unit: "Kg",
    standardRate: "",
    notes: ""
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAdd = (template = null) => {
    setEditingRM(null);
    if (template) {
      setFormData({
        name: template.name,
        tamilName: template.tamilName || "",
        hsnCode: template.hsnCode || "0910 91 00",
        unit: template.unit || "Kg",
        standardRate: template.standardRate || "",
        notes: "Direct procurement item"
      });
    } else {
      setFormData({
        name: "",
        tamilName: "",
        hsnCode: "0910 91 00",
        unit: "Kg",
        standardRate: "",
        notes: ""
      });
    }
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEdit = (rm) => {
    setEditingRM(rm);
    setFormData({
      name: rm.name || "",
      tamilName: rm.tamilName || "",
      hsnCode: rm.hsnCode || "0910 91 00",
      unit: rm.unit || "Kg",
      standardRate: rm.standardRate || "",
      notes: rm.notes || ""
    });
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg("Raw material name is mandatory!");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      if (editingRM) {
        await updateRawMaterial(editingRM.id, formData);
        showToast("Raw material updated successfully!");
      } else {
        await addRawMaterial(formData);
        showToast("Raw material added to catalog!");
      }
      setShowModal(false);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save raw material.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (rm) => {
    const ok = await showConfirmModal({
      title: "Delete Raw Material",
      message: `Are you sure you want to delete raw material "${rm.name}"? This raw material product will be removed from your catalog.`,
      confirmText: "Delete Item",
      isDanger: true
    });
    if (!ok) return;

    try {
      await deleteRawMaterial(rm.id);
      showToast("Raw material removed from catalog.");
    } catch (err) {
      alert("Could not delete: " + err.message);
    }
  };

  // Quick Seed All Templates
  const handleQuickSeedAll = async () => {
    const ok = await showConfirmModal({
      title: "Load Standard Spices",
      message: "Do you want to add standard spice raw materials (Chilli, Coriander, Cumin, Pepper, etc.) with GST HSN codes to your catalog?",
      confirmText: "Load Spices",
      isDanger: false
    });
    if (!ok) return;
    setIsSubmitting(true);
    try {
      for (const t of QUICK_RAW_TEMPLATES) {
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
      showToast("Standard spice raw materials catalog loaded!");
    } catch (err) {
      alert("Error adding templates: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRawMaterials = rawMaterials.filter(rm => {
    const q = searchQuery.toLowerCase();
    const nameMatch = (rm.name || "").toLowerCase().includes(q);
    const tamilMatch = (rm.tamilName || "").toLowerCase().includes(q);
    const hsnMatch = (rm.hsnCode || "").toLowerCase().includes(q);
    return nameMatch || tamilMatch || hsnMatch;
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

      {/* Header Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "14px",
        marginBottom: "20px",
        paddingBottom: "14px",
        borderBottom: "1px solid var(--sd-zinc-200)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Boxes size={22} color="var(--sd-red)" />
            <h2 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
              Raw Materials Catalog
            </h2>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "3px" }}>
            Manage whole spices, seeds, grains, and raw procurement ingredients.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {subViewToggle}

          {rawMaterials.length === 0 && (
            <button
              type="button"
              onClick={handleQuickSeedAll}
              disabled={isSubmitting}
              style={{
                background: "#FEF3C7",
                color: "#92400E",
                border: "1px solid #FCD34D",
                borderRadius: "10px",
                padding: "8px 14px",
                fontSize: "0.82rem",
                fontWeight: 700,
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              <Sparkles size={15} />
              <span>Load Common Spices</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenAdd()}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "0.82rem", whiteSpace: "nowrap" }}
          >
            <Plus size={15} />
            <span>Add Raw Material</span>
          </button>
        </div>
      </div>

      {/* Search and Quick Filters */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "18px"
      }}>
        <div style={{
          position: "relative",
          flex: "1 1 320px",
          maxWidth: "460px"
        }}>
          <Search size={16} color="var(--sd-zinc-400)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search raw material by name, tamil name, or HSN code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: "10px",
              border: "1px solid var(--sd-zinc-200)",
              fontSize: "0.85rem",
              background: "#FFFFFF",
              outline: "none"
            }}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            background: "var(--sd-zinc-100)",
            color: "var(--sd-zinc-700)",
            padding: "6px 12px",
            borderRadius: "8px",
            fontSize: "0.78rem",
            fontWeight: 700,
            border: "1px solid var(--sd-zinc-200)"
          }}>
            Total Items: <strong>{rawMaterials.length}</strong>
          </span>
        </div>
      </div>

      {/* Quick Add Suggestions if catalog has fewer than 4 items */}
      {rawMaterials.length < 5 && (
        <div style={{
          background: "#F8FAFC",
          border: "1px dashed var(--sd-zinc-300)",
          borderRadius: "12px",
          padding: "12px 16px",
          marginBottom: "20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Sparkles size={14} color="#D97706" />
            <span style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Quick Add Common Raw Materials
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {QUICK_RAW_TEMPLATES.map((tmpl) => {
              const alreadyAdded = rawMaterials.some(r => r.name.toLowerCase() === tmpl.name.toLowerCase());
              if (alreadyAdded) return null;
              return (
                <button
                  key={tmpl.name}
                  type="button"
                  onClick={() => handleOpenAdd(tmpl)}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--sd-zinc-200)",
                    borderRadius: "8px",
                    padding: "5px 10px",
                    fontSize: "0.74rem",
                    fontWeight: 600,
                    color: "var(--sd-black)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--sd-black)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--sd-zinc-200)"; }}
                >
                  <Plus size={12} color="var(--sd-red)" />
                  <span>{tmpl.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grid of Raw Material Items */}
      {filteredRawMaterials.length === 0 ? (
        <div style={{
          background: "#FFFFFF",
          borderRadius: "14px",
          border: "1px dashed var(--sd-zinc-300)",
          padding: "50px 20px",
          textAlign: "center"
        }}>
          <Boxes size={40} color="var(--sd-zinc-400)" style={{ margin: "0 auto 12px auto" }} />
          <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
            {searchQuery ? "No matching raw materials found" : "No Raw Materials in Catalog Yet"}
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", marginTop: "4px", maxWidth: "420px", margin: "4px auto 16px auto" }}>
            {searchQuery ? "Try searching with a different spice name or HSN code." : "Add the spices and raw ingredients you purchase from Mandi or suppliers to track procurement."}
          </p>
          <button
            type="button"
            onClick={() => handleOpenAdd()}
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
            + Add First Raw Material
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: "14px"
        }}>
          {filteredRawMaterials.map((rm) => (
            <div
              key={rm.id}
              style={{
                background: "#FFFFFF",
                borderRadius: "12px",
                border: "1px solid var(--sd-zinc-200)",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                transition: "box-shadow 0.15s ease, border-color 0.15s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "var(--sd-zinc-400)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.04)";
                e.currentTarget.style.borderColor = "var(--sd-zinc-200)";
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                      {rm.name}
                    </h3>
                    {rm.tamilName && (
                      <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", margin: "2px 0 0 0" }}>
                        {rm.tamilName}
                      </p>
                    )}
                  </div>
                  <span style={{
                    background: "var(--sd-zinc-100)",
                    color: "var(--sd-black)",
                    fontSize: "0.72rem",
                    fontWeight: 800,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--sd-zinc-200)",
                    whiteSpace: "nowrap"
                  }}>
                    {rm.unit || "Kg"}
                  </span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "12px" }}>
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    color: "#6B1414",
                    background: "#FFEDD5",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid #FED7AA",
                    fontFamily: "monospace"
                  }}>
                    <Hash size={13} color="#6B1414" />
                    <span>HSN: <strong>{rm.hsnCode || "0910 91 00"}</strong></span>
                  </div>

                  {rm.standardRate > 0 && (
                    <div style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "var(--sd-green)",
                      background: "#F0FDF4",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      border: "1px solid #BBF7D0"
                    }}>
                      <Tag size={12} />
                      <span>Std: {formatCurrency(rm.standardRate)} / {rm.unit || "Kg"}</span>
                    </div>
                  )}
                </div>

                {rm.notes && (
                  <p style={{
                    fontSize: "0.75rem",
                    color: "var(--sd-zinc-500)",
                    marginTop: "8px",
                    background: "var(--sd-zinc-50)",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    fontStyle: "italic"
                  }}>
                    {rm.notes}
                  </p>
                )}
              </div>

              {/* Actions Footer */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "8px",
                paddingTop: "10px",
                borderTop: "1px solid var(--sd-zinc-100)"
              }}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(rm)}
                  style={{
                    background: "var(--sd-zinc-100)",
                    color: "var(--sd-zinc-800)",
                    border: "none",
                    borderRadius: "6px",
                    padding: "5px 10px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Edit2 size={13} />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(rm)}
                  style={{
                    background: "#FEF2F2",
                    color: "#DC2626",
                    border: "none",
                    borderRadius: "6px",
                    padding: "5px 8px",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center"
                  }}
                  title="Delete raw material"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.65)",
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
            maxWidth: "480px",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
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
                  {editingRM ? "Edit Raw Material" : "Add New Raw Material"}
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", margin: "2px 0 0 0" }}>
                  Used for recording supplier procurement bills & stock tracking
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
              {errorMsg && (
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
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                    Raw Material Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Red Chilli (Guntur), Coriander Seeds..."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                    Tamil Name (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. குண்டூர் வரமிளகாய், தனியா விதை..."
                    value={formData.tamilName}
                    onChange={(e) => setFormData({ ...formData, tamilName: e.target.value })}
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 900, color: "#6B1414", marginBottom: "4px" }}>
                      HSN Code (GST Compliance) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 0904 21 10, 0909 21 00"
                      value={formData.hsnCode}
                      onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1.5px solid #FDBA74",
                        background: "#FFFBF7",
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                        fontWeight: 800,
                        color: "var(--sd-black)",
                        outline: "none"
                      }}
                    />
                    <span style={{ fontSize: "0.68rem", color: "var(--sd-zinc-500)", marginTop: "2px", display: "block" }}>
                      Indian GST commodity code for raw whole spices
                    </span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                      Default Unit *
                    </label>
                    <select
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
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
                      <option value="Kg">Kg (Kilogram)</option>
                      <option value="Bags">Bags (Mandi Pack)</option>
                      <option value="Quintal">Quintal (100 Kg)</option>
                      <option value="Grams">Grams (g)</option>
                      <option value="Tons">Tons</option>
                      <option value="Packs">Packs</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "4px" }}>
                    Standard / Expected Rate (₹ per {formData.unit || "unit"})
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="e.g. 190"
                    value={formData.standardRate}
                    onChange={(e) => setFormData({ ...formData, standardRate: e.target.value })}
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
                    Notes / Specification
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Grade A stemless, directly from Bodinayakanur mandi..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.82rem",
                      resize: "none",
                      outline: "none"
                    }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
                paddingTop: "14px",
                borderTop: "1px solid var(--sd-zinc-100)"
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
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
                  {isSubmitting ? "Saving..." : editingRM ? "Update Material" : "Save to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
