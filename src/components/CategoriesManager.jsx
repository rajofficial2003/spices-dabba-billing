import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  Layers, 
  Plus, 
  Edit2, 
  Trash2, 
  Tag, 
  Check, 
  X, 
  Package,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";

export default function CategoriesManager({ isNested = false, addCategoryTrigger = 0 }) {
  const { 
    categories, 
    products, 
    addCategory, 
    updateCategory, 
    deleteCategory, 
    addSubcategory, 
    editSubcategory, 
    deleteSubcategory,
    toggleSubcategoryStatus,
    showConfirmModal
  } = usePOS();

  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: "", tamilName: "", isActive: true });
  const [catError, setCatError] = useState("");
  const [catSearch, setCatSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Subcategory inline add state
  const [activeAddSubcatId, setActiveAddSubcatId] = useState(null);
  const [newSubcatName, setNewSubcatName] = useState("");

  // Subcategory inline edit state
  const [editingSubcat, setEditingSubcat] = useState(null); // { catId, oldName, newName }

  // Filter out the pseudo "all" category from direct editing
  const editableCategories = categories.filter(c => c.id !== "all");

  const filteredCategories = editableCategories.filter(cat => {
    // Status filter
    const isAct = cat.isActive !== false;
    if (statusFilter === "active" && !isAct) return false;
    if (statusFilter === "inactive" && isAct) return false;

    if (!catSearch.trim()) return true;
    const q = catSearch.toLowerCase().trim();
    const matchName = cat.name?.toLowerCase().includes(q);
    const matchTamil = cat.tamilName?.includes(q);
    const matchSubcat = cat.subcategories?.some(s => {
      const sName = typeof s === "string" ? s : s.name;
      return sName?.toLowerCase().includes(q);
    });
    return matchName || matchTamil || matchSubcat;
  });

  const activeCount = editableCategories.filter(c => c.isActive !== false).length;
  const inactiveCount = editableCategories.filter(c => c.isActive === false).length;

  const handleOpenAddCategory = () => {
    setEditingCat(null);
    setCatForm({ name: "", tamilName: "", isActive: true });
    setCatError("");
    setShowCatModal(true);
  };

  React.useEffect(() => {
    if (addCategoryTrigger > 0) {
      handleOpenAddCategory();
    }
  }, [addCategoryTrigger]);

  const handleOpenEditCategory = (cat) => {
    setEditingCat(cat);
    setCatForm({
      name: cat.name || "",
      tamilName: cat.tamilName || "",
      isActive: cat.isActive !== false
    });
    setCatError("");
    setShowCatModal(true);
  };

  // Category status change handler with confirmation pop up modal
  const handleCatStatusChange = async (newStatus) => {
    if (newStatus === catForm.isActive) return;
    const targetText = newStatus ? "Active" : "Inactive";
    const displayName = catForm.name || "this category";

    const ok = await showConfirmModal({
      title: newStatus ? "Mark Category Active" : "Mark Category Inactive",
      message: newStatus
        ? `Are you sure you want to activate category "${displayName}"? Products under this category will be available for spot billing.`
        : `Are you sure you want to mark category "${displayName}" as Inactive? Inactive categories and their products will be hidden from spot billing.`,
      confirmText: `Yes, Mark ${targetText}`,
      cancelText: "Cancel",
      isDanger: !newStatus
    });

    if (ok) {
      setCatForm(prev => ({ ...prev, isActive: newStatus }));
      if (editingCat && editingCat.id) {
        try {
          await updateCategory(editingCat.id, { isActive: newStatus });
        } catch (err) {
          console.error("Failed to update category status:", err);
        }
      }
    }
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setCatError("");

    if (!catForm.name.trim()) {
      setCatError("Main Category name is required!");
      return;
    }

    try {
      if (editingCat) {
        await updateCategory(editingCat.id, {
          name: catForm.name.trim(),
          tamilName: catForm.tamilName.trim(),
          isActive: catForm.isActive !== false
        });
      } else {
        await addCategory({
          name: catForm.name.trim(),
          tamilName: catForm.tamilName.trim(),
          subcategories: [],
          isActive: catForm.isActive !== false
        });
      }
      setShowCatModal(false);
    } catch (err) {
      setCatError(err.message || "Failed to save category");
    }
  };

  const handleDeleteCategory = async (catId, catName) => {
    const prodsInCat = products.filter(p => p.category === catId);
    const warning = prodsInCat.length > 0 
      ? `Warning: There are ${prodsInCat.length} products currently in "${catName}". Deleting this Main Category will leave those products uncategorized.`
      : `Are you sure you want to delete Main Category "${catName}"?`;

    const ok = await showConfirmModal({
      title: "Delete Category",
      message: warning,
      confirmText: "Delete Category",
      isDanger: true
    });

    if (ok) {
      await deleteCategory(catId);
    }
  };

  const handleAddSubcatSubmit = async (catId) => {
    if (!newSubcatName.trim()) return;
    await addSubcategory(catId, newSubcatName.trim());
    setNewSubcatName("");
    setActiveAddSubcatId(null);
  };

  const handleEditSubcatSubmit = async () => {
    if (!editingSubcat || !editingSubcat.newName.trim()) return;
    await editSubcategory(editingSubcat.catId, editingSubcat.oldName, editingSubcat.newName.trim());
    setEditingSubcat(null);
  };

  const handleDeleteSubcat = async (catId, subcatName) => {
    const prodsWithSub = products.filter(p => p.category === catId && p.subcategory === subcatName);
    const msg = prodsWithSub.length > 0
      ? `"${subcatName}" is assigned to ${prodsWithSub.length} products. Deleting this subcategory will remove it from those products.`
      : `Are you sure you want to delete subcategory "${subcatName}"?`;

    const ok = await showConfirmModal({
      title: "Delete Subcategory",
      message: msg,
      confirmText: "Delete Subcategory",
      isDanger: true
    });

    if (ok) {
      await deleteSubcategory(catId, subcatName);
    }
  };

  const handleToggleSubcatStatus = async (catId, subcatName, currentStatus) => {
    const newStatus = !currentStatus;
    const targetText = newStatus ? "Active" : "Inactive";
    const ok = await showConfirmModal({
      title: newStatus ? "Activate Subcategory" : "Deactivate Subcategory",
      message: newStatus
        ? `Are you sure you want to mark subcategory "${subcatName}" as Active? Products under this subcategory will be available for spot billing.`
        : `Are you sure you want to mark subcategory "${subcatName}" as Inactive? Inactive subcategories and their products will be hidden from spot billing.`,
      confirmText: `Yes, Mark ${targetText}`,
      cancelText: "Cancel",
      isDanger: !newStatus
    });

    if (ok) {
      await toggleSubcategoryStatus(catId, subcatName, newStatus);
    }
  };

  return (
    <div className={isNested ? "" : "responsive-page-container"}>
      {/* Header Banner */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: isNested ? "flex-end" : "space-between",
        alignItems: "center",
        gap: "14px",
        marginBottom: "16px",
        paddingBottom: isNested ? "0" : "16px",
        borderBottom: isNested ? "none" : "1px solid var(--sd-zinc-200)"
      }}>
        {!isNested && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={22} color="var(--sd-black)" />
              <h2 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                Main Categories & Subcategories
              </h2>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "4px" }}>
              Manage master product categories and split them into subcategories for wholesale spot billing & ERP cataloging.
            </p>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
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
              All ({editableCategories.length})
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

          {/* Search Categories / Subcategories */}
          <div style={{ position: "relative", minWidth: "220px" }}>
            <input
              type="text"
              placeholder="Search category or subcategory..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
              className="text-input"
              style={{ padding: "7px 12px", fontSize: "0.82rem" }}
            />
          </div>

          {!isNested && (
            <button
              type="button"
              onClick={handleOpenAddCategory}
              className="btn-primary"
              style={{ padding: "8px 16px", fontSize: "0.82rem" }}
            >
              <Plus size={15} />
              <span>Add Main Category</span>
            </button>
          )}
        </div>
      </div>

      {/* Categories Grid / Clean Empty State */}
      {filteredCategories.length === 0 ? (
        <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)" }}>
          <Layers size={44} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 10px" }} />
          <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--sd-black)" }}>No categories in database</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "4px", marginBottom: "16px" }}>
            {categories.length === 0 
              ? "All static sample categories removed. Click '+ Add Main Category' to create your first category and subcategories."
              : "No categories match your search."}
          </p>
          {categories.length === 0 && (
            <button type="button" onClick={handleOpenAddCategory} className="btn-primary" style={{ display: "inline-flex", margin: "0 auto" }}>
              <Plus size={15} />
              <span>Add First Category</span>
            </button>
          )}
        </div>
      ) : (
      <div className="responsive-cards-grid">
        {filteredCategories.map((cat) => {
          const prodsInCat = products.filter(p => p.category === cat.id);
          const subcats = cat.subcategories || [];
          const isAct = cat.isActive !== false;

          return (
            <div
              key={cat.id}
              className="bw-card"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                background: "var(--sd-white)",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "16px",
                opacity: isAct ? 1 : 0.75
              }}
            >
              {/* Category Header Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
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
                      MAIN CATEGORY
                    </span>

                    {/* Static Status Pill Badge */}
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "2px 7px",
                      borderRadius: "99px",
                      fontSize: "0.68rem",
                      fontWeight: 800,
                      background: isAct ? "#DCFCE7" : "var(--sd-zinc-100)",
                      color: isAct ? "#15803D" : "var(--sd-zinc-600)",
                      border: isAct ? "1px solid #86EFAC" : "1px solid var(--sd-zinc-300)"
                    }}>
                      <span style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: isAct ? "#16A34A" : "var(--sd-zinc-400)"
                      }} />
                      {isAct ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={18} color="var(--sd-black)" />
                    <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                      {cat.name}
                    </h3>
                  </div>

                  {cat.tamilName && (
                    <div className="font-tamil" style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", marginTop: "2px" }}>
                      {cat.tamilName}
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", fontWeight: 600 }}>
                      {prodsInCat.length} products
                    </span>
                  </div>
                </div>

                {/* Category Action Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <button
                    type="button"
                    onClick={() => handleOpenEditCategory(cat)}
                    className="btn-secondary"
                    title="Edit Category"
                    style={{ padding: "5px 8px", fontSize: "0.75rem" }}
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    title="Delete Category"
                    style={{
                      background: "var(--sd-zinc-50)",
                      border: "1px solid var(--sd-zinc-200)",
                      color: "var(--sd-zinc-500)",
                      padding: "5px 8px",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Subcategories Section */}
              <div style={{
                background: "var(--sd-zinc-50)",
                borderRadius: "12px",
                padding: "12px 14px",
                border: "1px solid var(--sd-zinc-200)"
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px"
                }}>
                  <span style={{
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--sd-zinc-600)",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}>
                    <Tag size={12} /> Subcategories ({subcats.length})
                  </span>

                  {activeAddSubcatId !== cat.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAddSubcatId(cat.id);
                        setNewSubcatName("");
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        color: "var(--sd-black)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px"
                      }}
                    >
                      <Plus size={13} /> Add Subcategory
                    </button>
                  )}
                </div>

                {/* Subcategory List Pills */}
                {subcats.length === 0 ? (
                  <div style={{ fontSize: "0.76rem", color: "var(--sd-zinc-400)", fontStyle: "italic", padding: "4px 0" }}>
                    No subcategories yet. Click + Add Subcategory.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {subcats.map((subcatItem) => {
                      const subcat = typeof subcatItem === "string" ? subcatItem : subcatItem.name;
                      const isSubAct = typeof subcatItem === "string" ? true : subcatItem.isActive !== false;
                      const prodsWithSubcat = products.filter(p => p.category === cat.id && p.subcategory === subcat);

                      if (editingSubcat && editingSubcat.catId === cat.id && editingSubcat.oldName === subcat) {
                        return (
                          <div 
                            key={subcat}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              background: "var(--sd-white)",
                              border: "1px solid var(--sd-black)",
                              borderRadius: "8px",
                              padding: "2px 6px"
                            }}
                          >
                            <input
                              type="text"
                              value={editingSubcat.newName}
                              onChange={(e) => setEditingSubcat({ ...editingSubcat, newName: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleEditSubcatSubmit();
                                if (e.key === "Escape") setEditingSubcat(null);
                              }}
                              autoFocus
                              style={{
                                border: "none",
                                outline: "none",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                width: "120px"
                              }}
                            />
                            <button
                              type="button"
                              onClick={handleEditSubcatSubmit}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "1px" }}
                            >
                              <Check size={13} color="var(--sd-black)" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSubcat(null)}
                              style={{ background: "none", border: "none", cursor: "pointer", padding: "1px" }}
                            >
                              <X size={13} color="var(--sd-zinc-400)" />
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={subcat}
                          style={{
                            background: isSubAct ? "var(--sd-white)" : "var(--sd-zinc-100)",
                            border: isSubAct ? "1px solid var(--sd-zinc-200)" : "1px dashed var(--sd-zinc-300)",
                            borderRadius: "8px",
                            padding: "4px 8px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: isSubAct ? "var(--sd-black)" : "var(--sd-zinc-500)",
                            opacity: isSubAct ? 1 : 0.8
                          }}
                        >
                          <span style={{ textDecoration: isSubAct ? "none" : "line-through" }}>{subcat}</span>
                          <span style={{ fontSize: "0.68rem", color: "var(--sd-zinc-400)" }}>
                            ({prodsWithSubcat.length})
                          </span>

                          {/* Subcategory Active / Inactive Toggle Button */}
                          <button
                            type="button"
                            onClick={() => handleToggleSubcatStatus(cat.id, subcat, isSubAct)}
                            title={isSubAct ? "Click to deactivate subcategory" : "Click to activate subcategory"}
                            style={{
                              background: isSubAct ? "#DCFCE7" : "var(--sd-zinc-200)",
                              color: isSubAct ? "#15803D" : "var(--sd-zinc-700)",
                              border: isSubAct ? "1px solid #86EFAC" : "1px solid var(--sd-zinc-300)",
                              borderRadius: "99px",
                              padding: "2px 7px",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              transition: "all 0.15s ease"
                            }}
                          >
                            <span style={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              background: isSubAct ? "#16A34A" : "var(--sd-zinc-500)"
                            }} />
                            {isSubAct ? "Active" : "Inactive"}
                          </button>

                          {/* Edit / Delete Subcategory */}
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "2px", marginLeft: "2px" }}>
                            <button
                              type="button"
                              onClick={() => setEditingSubcat({ catId: cat.id, oldName: subcat, newName: subcat })}
                              title="Rename subcategory"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sd-zinc-400)", padding: "1px" }}
                            >
                              <Edit2 size={11} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSubcat(cat.id, subcat)}
                              title="Remove subcategory"
                              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sd-zinc-400)", padding: "1px" }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Inline Add Input */}
                {activeAddSubcatId === cat.id && (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "10px",
                    paddingTop: "8px",
                    borderTop: "1px dashed var(--sd-zinc-200)"
                  }}>
                    <input
                      type="text"
                      placeholder="e.g. Biryani Pastes, Pure Powders..."
                      value={newSubcatName}
                      onChange={(e) => setNewSubcatName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddSubcatSubmit(cat.id);
                        if (e.key === "Escape") setActiveAddSubcatId(null);
                      }}
                      autoFocus
                      className="text-input"
                      style={{ padding: "5px 8px", fontSize: "0.8rem", flex: 1 }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSubcatSubmit(cat.id)}
                      className="btn-primary"
                      style={{ padding: "5px 10px", fontSize: "0.75rem" }}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveAddSubcatId(null);
                        setNewSubcatName("");
                      }}
                      className="btn-secondary"
                      style={{ padding: "5px 8px", fontSize: "0.75rem" }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* ADD / EDIT CATEGORY MODAL - only closes on Cancel / Close button click */}
      {showCatModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "460px" }}>
            <div style={{
              background: "var(--sd-white)",
              color: "var(--sd-black)",
              padding: "16px 20px",
              borderTopLeftRadius: "18px",
              borderTopRightRadius: "18px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={18} color="var(--sd-black)" />
                <h3 className="font-heading" style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0 }}>
                  {editingCat ? "Edit Main Category" : "Add New Main Category"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCatModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sd-zinc-400)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {catError && (
                <div style={{
                  background: "var(--sd-red-subtle)",
                  color: "var(--sd-red)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <AlertCircle size={15} />
                  <span>{catError}</span>
                </div>
              )}

              <div>
                <label className="input-label">
                  Main Category Name (English) <span className="input-required">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ready-to-cook Masalas"
                  value={catForm.name}
                  onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                  required
                  autoFocus
                  className="text-input"
                />
              </div>

              <div>
                <label className="input-label">Tamil Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. ரெடி-டு-குக் மசாலா"
                  value={catForm.tamilName}
                  onChange={(e) => setCatForm({ ...catForm, tamilName: e.target.value })}
                  className="text-input font-tamil"
                />
              </div>

              {/* Category Status Selection (Active / Inactive) with Confirmation Pop-up */}
              <div style={{
                marginBottom: "4px",
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
                    Category Status
                  </label>
                  <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>
                    {catForm.isActive ? "🟢 Active (Spices will show in billing)" : "⚪ Inactive (Spices hidden from billing)"}
                  </div>
                </div>

                <div style={{ display: "inline-flex", background: "var(--sd-zinc-200)", padding: "3px", borderRadius: "10px", gap: "3px" }}>
                  <button
                    type="button"
                    id="cat-form-btn-active"
                    onClick={() => handleCatStatusChange(true)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: catForm.isActive ? 800 : 600,
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: catForm.isActive ? "#16A34A" : "transparent",
                      color: catForm.isActive ? "#FFFFFF" : "var(--sd-zinc-700)",
                      boxShadow: catForm.isActive ? "0 1px 4px rgba(22, 163, 74, 0.3)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <CheckCircle2 size={14} />
                    <span>Active</span>
                  </button>

                  <button
                    type="button"
                    id="cat-form-btn-inactive"
                    onClick={() => handleCatStatusChange(false)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: !catForm.isActive ? 800 : 600,
                      border: "none",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: !catForm.isActive ? "var(--sd-zinc-700)" : "transparent",
                      color: !catForm.isActive ? "#FFFFFF" : "var(--sd-zinc-700)",
                      boxShadow: !catForm.isActive ? "0 1px 4px rgba(0,0,0,0.2)" : "none",
                      transition: "all 0.15s ease"
                    }}
                  >
                    <XCircle size={14} />
                    <span>Inactive</span>
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                >
                  {editingCat ? "Update Main Category" : "Save Main Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
