import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Search, 
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(12);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [search, itemsPerPage]);

  const filteredCategories = expenseCategories.filter(c => 
    (c.name || "").toLowerCase().includes(search.toLowerCase().trim())
  );

  // Expense Categories Pagination Calculation
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCategories = filteredCategories.slice(startIndex, endIndex);

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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
          {paginatedCategories.map((cat) => (
            <div 
              key={cat.id}
              className="bw-card"
              style={{
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "12px",
                background: "var(--sd-white)",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "14px"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--sd-zinc-100)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--sd-black)",
                  flexShrink: 0
                }}>
                  <Tag size={18} />
                </div>
                <h3 className="font-heading" style={{
                  fontSize: "1.02rem",
                  fontWeight: 800,
                  color: "var(--sd-black)",
                  margin: 0,
                  wordBreak: "break-word"
                }}>
                  {cat.name}
                </h3>
              </div>

              {/* Action buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleOpenEdit(cat)}
                  className="btn-secondary"
                  title="Edit Category"
                  style={{ padding: "6px 8px", fontSize: "0.75rem" }}
                >
                  <Edit2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(cat)}
                  className="btn-secondary"
                  title="Delete Category"
                  style={{ padding: "6px 8px", fontSize: "0.75rem", color: "var(--sd-red)", borderColor: "#FCA5A5" }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expense Categories Pagination Bar */}
      {filteredCategories.length > 0 && (
        <div style={{
          marginTop: "20px",
          padding: "14px 18px",
          background: "var(--sd-white)",
          borderRadius: "12px",
          border: "1px solid var(--sd-zinc-200)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}>
          {/* Summary and Items Per Page */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", fontWeight: 600 }}>
              Showing <strong style={{ color: "var(--sd-black)" }}>{startIndex + 1}</strong> to <strong style={{ color: "var(--sd-black)" }}>{Math.min(endIndex, filteredCategories.length)}</strong> of <strong style={{ color: "var(--sd-black)" }}>{filteredCategories.length}</strong> categories
              {totalPages > 1 && ` • Page ${validCurrentPage} of ${totalPages}`}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.78rem", color: "var(--sd-zinc-500)" }}>
              <span>Per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid var(--sd-zinc-300)",
                  background: "var(--sd-white)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  color: "var(--sd-black)"
                }}
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
                <option value={96}>96</option>
              </select>
            </div>
          </div>

          {/* Page Navigation Controls */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={validCurrentPage === 1}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--sd-zinc-300)",
                  background: validCurrentPage === 1 ? "var(--sd-zinc-100)" : "var(--sd-white)",
                  color: validCurrentPage === 1 ? "var(--sd-zinc-400)" : "var(--sd-zinc-800)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: validCurrentPage === 1 ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              {/* Numbered Pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - validCurrentPage) <= 1)
                .map((page, index, array) => {
                  const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsisBefore && (
                        <span style={{ padding: "0 4px", color: "var(--sd-zinc-400)", fontSize: "0.8rem" }}>...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          border: page === validCurrentPage ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                          background: page === validCurrentPage ? "var(--sd-black)" : "var(--sd-white)",
                          color: page === validCurrentPage ? "var(--sd-white)" : "var(--sd-zinc-800)",
                          fontSize: "0.78rem",
                          fontWeight: page === validCurrentPage ? 800 : 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={validCurrentPage === totalPages}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--sd-zinc-300)",
                  background: validCurrentPage === totalPages ? "var(--sd-zinc-100)" : "var(--sd-white)",
                  color: validCurrentPage === totalPages ? "var(--sd-zinc-400)" : "var(--sd-zinc-800)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: validCurrentPage === totalPages ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
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
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  style={{ padding: "8px 16px", fontSize: "0.84rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{ padding: "8px 20px", fontSize: "0.84rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={15} className="spin" />
                      <span>{editingCat ? "Saving Changes..." : "Saving Category..."}</span>
                    </>
                  ) : (
                    <span>{editingCat ? "Save Changes" : "Save Category"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
