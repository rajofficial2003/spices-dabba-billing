import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  X, 
  Search, 
  DollarSign, 
  AlertCircle,
  FolderPlus,
  TrendingDown
} from "lucide-react";

const PALETTE = [
  "#DC2626", // Red
  "#EA580C", // Orange
  "#D97706", // Amber
  "#059669", // Emerald
  "#0284C7", // Sky
  "#4F46E5", // Indigo
  "#7C3AED", // Violet
  "#DB2777", // Pink
  "#475569"  // Slate
];

export default function ExpenseCategoriesManager() {
  const { 
    expenseCategories = [], 
    expenses = [], 
    addExpenseCategory, 
    updateExpenseCategory, 
    deleteExpenseCategory,
    showConfirmModal
  } = usePOS();

  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState(PALETTE[4]);
  const [editingCatId, setEditingCatId] = useState(null);
  const [editCatName, setEditCatName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const filteredCategories = expenseCategories.filter(c => 
    (c.name || "").toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleAdd = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmed = newCatName.trim();
    if (!trimmed) {
      setErrorMsg("Please enter category name");
      return;
    }
    if (expenseCategories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setErrorMsg("A category with this name already exists!");
      return;
    }
    try {
      await addExpenseCategory({ name: trimmed, color: newCatColor });
      setNewCatName("");
      setShowAddModal(false);
    } catch (err) {
      setErrorMsg(err.message || "Failed to create category");
    }
  };

  const handleStartEdit = (cat) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
  };

  const handleSaveEdit = async (catId) => {
    const trimmed = editCatName.trim();
    if (!trimmed) return;
    try {
      await updateExpenseCategory(catId, { name: trimmed });
      setEditingCatId(null);
      setEditCatName("");
    } catch (err) {
      alert("Error updating category: " + err.message);
    }
  };

  const handleDelete = async (cat) => {
    const usageCount = expenses.filter(e => e.category === cat.name || e.category === cat.id).length;
    let confirmMsg = `Are you sure you want to delete expense category "${cat.name}"?`;
    if (usageCount > 0) {
      confirmMsg = `Warning: There are ${usageCount} recorded expense(s) tagged under "${cat.name}". Deleting this category will leave those expenses without a category tag.`;
    }

    const ok = await showConfirmModal({
      title: "Delete Expense Category",
      message: confirmMsg,
      confirmText: "Delete Category",
      isDanger: true
    });
    if (!ok) return;

    try {
      await deleteExpenseCategory(cat.id);
    } catch (err) {
      alert("Error deleting category: " + err.message);
    }
  };

  return (
    <div className="responsive-page-container">
      {/* Header bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "14px",
        marginBottom: "20px",
        paddingBottom: "16px",
        borderBottom: "1px solid var(--sd-zinc-200)"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#FEE2E2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sd-red)"
            }}>
              <Tag size={20} />
            </div>
            <div>
              <h1 className="font-heading" style={{ fontSize: "1.35rem", fontWeight: 900, margin: 0, color: "var(--sd-black)" }}>
                Expense Categories
              </h1>
              <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--sd-zinc-500)" }}>
                Manage operational and day-to-day spending categories for Finance & ERP Tracker
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => {
              setNewCatName("");
              setErrorMsg("");
              setShowAddModal(true);
            }}
            className="pos-btn-primary"
            style={{
              padding: "9px 18px",
              borderRadius: "10px",
              fontSize: "0.85rem",
              fontWeight: 800,
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer"
            }}
          >
            <Plus size={16} />
            <span>Add Expense Category</span>
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "20px"
      }}>
        <div style={{ position: "relative", minWidth: "260px", flex: "1 1 280px" }}>
          <Search size={16} color="var(--sd-zinc-400)" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
          <input
            type="text"
            placeholder="Search expense category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 38px",
              borderRadius: "10px",
              border: "1px solid var(--sd-zinc-300)",
              fontSize: "0.85rem",
              outline: "none",
              background: "var(--sd-white)",
              boxSizing: "border-box"
            }}
          />
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "var(--sd-zinc-600)"
        }}>
          <span>Total Categories: <strong style={{ color: "var(--sd-black)" }}>{expenseCategories.length}</strong></span>
        </div>
      </div>

      {/* Categories Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: "16px"
      }}>
        {filteredCategories.map((cat) => {
          const isEditing = editingCatId === cat.id;
          const usageExpenses = expenses.filter(e => e.category === cat.name || e.category === cat.id);
          const usageCount = usageExpenses.length;
          const totalSpent = usageExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
          const catColor = cat.color || "#0284C7";

          return (
            <div 
              key={cat.id}
              style={{
                background: "var(--sd-white)",
                borderRadius: "14px",
                border: "1px solid var(--sd-zinc-200)",
                padding: "16px",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "12px",
                transition: "all 0.15s ease"
              }}
            >
              {/* Card Header & Name */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "8px",
                    background: `${catColor}15`,
                    color: catColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900
                  }}>
                    <Tag size={15} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {!isEditing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cat)}
                          title="Edit Category Name"
                          style={{
                            border: "none",
                            background: "var(--sd-zinc-100)",
                            color: "var(--sd-zinc-700)",
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(cat)}
                          title="Delete Category"
                          style={{
                            border: "none",
                            background: "#FEE2E2",
                            color: "var(--sd-red)",
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(cat.id)}
                          title="Save"
                          style={{
                            border: "none",
                            background: "#D1FAE5",
                            color: "#059669",
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          title="Cancel"
                          style={{
                            border: "none",
                            background: "var(--sd-zinc-200)",
                            color: "var(--sd-zinc-600)",
                            width: "28px",
                            height: "28px",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <input
                    type="text"
                    value={editCatName}
                    autoFocus
                    onChange={(e) => setEditCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSaveEdit(cat.id);
                      if (e.key === "Escape") setEditingCatId(null);
                    }}
                    style={{
                      width: "100%",
                      padding: "6px 10px",
                      borderRadius: "6px",
                      border: "2px solid var(--sd-red)",
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      boxSizing: "border-box"
                    }}
                  />
                ) : (
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--sd-black)", letterSpacing: "-0.2px" }}>
                    {cat.name}
                  </div>
                )}
              </div>

              {/* Spend insights badge */}
              <div style={{
                background: "var(--sd-zinc-50)",
                borderRadius: "10px",
                padding: "10px 12px",
                border: "1px solid var(--sd-zinc-100)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Recorded Expenses
                  </div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--sd-zinc-800)" }}>
                    {usageCount} {usageCount === 1 ? "entry" : "entries"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Total Outflow
                  </div>
                  <div style={{ fontSize: "0.92rem", fontWeight: 900, color: usageCount > 0 ? "var(--sd-red)" : "var(--sd-zinc-400)" }}>
                    ₹{totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <div style={{
            gridColumn: "1 / -1",
            textAlign: "center",
            padding: "48px 20px",
            background: "var(--sd-white)",
            borderRadius: "14px",
            border: "1px dashed var(--sd-zinc-300)"
          }}>
            <Tag size={36} color="var(--sd-zinc-400)" style={{ margin: "0 auto 10px" }} />
            <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: "0 0 6px" }}>
              No categories found
            </h3>
            <p style={{ fontSize: "0.84rem", color: "var(--sd-zinc-500)", margin: "0 0 16px" }}>
              {search ? `No categories match "${search}"` : "Click below to add your first expense category."}
            </p>
            <button
              type="button"
              onClick={() => {
                setNewCatName("");
                setErrorMsg("");
                setShowAddModal(true);
              }}
              className="pos-btn-primary"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 800,
                cursor: "pointer"
              }}
            >
              Add Expense Category
            </button>
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            background: "var(--sd-white)",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "420px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FolderPlus size={18} color="var(--sd-red)" />
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)" }}>
                  New Expense Category
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--sd-zinc-500)",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdd} style={{ padding: "20px" }}>
              {errorMsg && (
                <div style={{
                  background: "#FEE2E2",
                  color: "#991B1B",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  marginBottom: "14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div style={{ marginBottom: "16px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                  Category Name <span style={{ color: "var(--sd-red)" }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petrol & Fuel, Tempo Rent, Employee Salary..."
                  value={newCatName}
                  autoFocus
                  onChange={(e) => setNewCatName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    fontSize: "0.88rem",
                    boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 800, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                  Badge Color
                </label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCatColor(color)}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: color,
                        border: newCatColor === color ? "3px solid var(--sd-black)" : "2px solid transparent",
                        cursor: "pointer",
                        outline: "none",
                        boxShadow: newCatColor === color ? "0 0 0 2px var(--sd-zinc-300)" : "none"
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    padding: "9px 16px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    background: "var(--sd-white)",
                    color: "var(--sd-zinc-700)",
                    fontWeight: 700,
                    fontSize: "0.84rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pos-btn-primary"
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    fontWeight: 800,
                    fontSize: "0.84rem",
                    cursor: "pointer"
                  }}
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
