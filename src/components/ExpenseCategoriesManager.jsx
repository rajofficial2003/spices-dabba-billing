import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Search, 
  AlertCircle
} from "lucide-react";

export default function ExpenseCategoriesManager({ subViewToggle = null }) {
  const { 
    expenseCategories = [], 
    expenses = [], 
    addExpenseCategory, 
    updateExpenseCategory, 
    deleteExpenseCategory,
    showConfirmModal
  } = usePOS();

  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catNameInput, setCatNameInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const filteredCategories = expenseCategories.filter(c => 
    (c.name || "").toLowerCase().includes(search.toLowerCase().trim())
  );

  const handleOpenAdd = () => {
    setEditingCat(null);
    setCatNameInput("");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEdit = (cat) => {
    setEditingCat(cat);
    setCatNameInput(cat.name || "");
    setErrorMsg("");
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmed = catNameInput.trim();
    if (!trimmed) {
      setErrorMsg("Please enter category name");
      return;
    }

    // Check duplicate name
    const isDuplicate = expenseCategories.some(c => 
      c.name.toLowerCase() === trimmed.toLowerCase() && 
      (!editingCat || c.id !== editingCat.id)
    );
    if (isDuplicate) {
      setErrorMsg("A category with this name already exists!");
      return;
    }

    try {
      if (editingCat) {
        await updateExpenseCategory(editingCat.id, { name: trimmed });
      } else {
        await addExpenseCategory({ name: trimmed });
      }
      setShowModal(false);
      setCatNameInput("");
      setEditingCat(null);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save category");
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
      {/* Header Bar matching Products, Customers & Suppliers */}
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
            <Tag size={22} color="var(--sd-red)" />
            <h2 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
              Expense Categories
            </h2>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "3px" }}>
            Manage operational, transport, salary, and overhead expense categories for Finance ERP.
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
            <span>Add Expense Category</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar matching Products & Customers */}
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
            placeholder="Search expense category by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-input"
            style={{ paddingLeft: "38px" }}
          />
        </div>

        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "0.82rem",
          color: "var(--sd-zinc-600)",
          fontWeight: 700,
          background: "var(--sd-zinc-100)",
          padding: "6px 14px",
          borderRadius: "10px",
          border: "1px solid var(--sd-zinc-200)"
        }}>
          <span>Total Categories:</span>
          <span style={{ color: "var(--sd-black)", fontWeight: 800 }}>{expenseCategories.length}</span>
        </div>
      </div>

      {/* Categories Grid matching responsive-cards-grid & bw-card */}
      {filteredCategories.length === 0 ? (
        <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)" }}>
          <Tag size={44} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 10px" }} />
          <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--sd-black)" }}>No expense categories found</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "4px", marginBottom: "16px" }}>
            {search ? `No categories match "${search}".` : "Add categories to track operational spending in Finance ERP."}
          </p>
          <button type="button" onClick={handleOpenAdd} className="btn-primary" style={{ display: "inline-flex", margin: "0 auto" }}>
            <Plus size={15} />
            <span>Add First Category</span>
          </button>
        </div>
      ) : (
        <div className="responsive-cards-grid">
          {filteredCategories.map((cat) => {
            const usageExpenses = expenses.filter(e => e.category === cat.name || e.category === cat.id);
            const usageCount = usageExpenses.length;
            const totalSpent = usageExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

            return (
              <div 
                key={cat.id}
                className="bw-card"
                style={{
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  background: "var(--sd-white)",
                  border: "1px solid var(--sd-zinc-200)",
                  borderRadius: "16px"
                }}
              >
                {/* Header & Title */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <span style={{
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.6px",
                      background: "var(--sd-black)",
                      color: "var(--sd-white)",
                      padding: "2px 7px",
                      borderRadius: "4px"
                    }}>
                      EXPENSE CATEGORY
                    </span>

                    {/* Action buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cat)}
                        className="btn-secondary"
                        title="Edit Category"
                        style={{ padding: "5px 8px", fontSize: "0.75rem" }}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        className="btn-secondary"
                        title="Delete Category"
                        style={{ padding: "5px 8px", fontSize: "0.75rem", color: "var(--sd-red)", borderColor: "#FCA5A5" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <Tag size={17} color="var(--sd-black)" />
                    <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                      {cat.name}
                    </h3>
                  </div>
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
                    <div style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)", textTransform: "uppercase", fontWeight: 700 }}>
                      Recorded Entries
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--sd-zinc-800)" }}>
                      {usageCount} {usageCount === 1 ? "entry" : "entries"}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)", textTransform: "uppercase", fontWeight: 700 }}>
                      Total Spent
                    </div>
                    <div style={{ fontSize: "0.92rem", fontWeight: 900, color: usageCount > 0 ? "var(--sd-red)" : "var(--sd-zinc-400)" }}>
                      ₹{totalSpent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal (No badge color picker) */}
      {showModal && (
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
            maxWidth: "440px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Tag size={18} color="var(--sd-red)" />
                <h3 className="font-heading" style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "var(--sd-black)" }}>
                  {editingCat ? "Edit Expense Category" : "Add New Expense Category"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
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

            <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
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
                  value={catNameInput}
                  autoFocus
                  onChange={(e) => setCatNameInput(e.target.value)}
                  className="text-input"
                />
              </div>

              {/* Modal Action Buttons */}
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
                  className="btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.84rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ padding: "8px 20px", fontSize: "0.84rem" }}
                >
                  {editingCat ? "Save Changes" : "Save Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
