import React, { useState, useMemo } from "react";
import { usePOS } from "../context/POSContext";
import { 
  FlaskConical, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Copy, 
  Printer, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Calculator, 
  ChevronRight, 
  Info, 
  X, 
  Layers, 
  Boxes, 
  FileText, 
  Flame, 
  ArrowUpDown, 
  Check 
} from "lucide-react";
import { formatCurrency } from "../utils/formatters";

export default function MixersManager() {
  const { 
    mixers = [], 
    addMixer, 
    updateMixer, 
    deleteMixer, 
    duplicateMixer, 
    rawMaterials = [], 
    products = [], 
    showConfirmModal, 
    BUSINESS_INFO 
  } = usePOS();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("all"); // 'all', 'balanced', 'imbalanced'
  
  // Modals state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMixer, setEditingMixer] = useState(null);
  const [showScalerModal, setShowScalerModal] = useState(false);
  const [scalerMixer, setScalerMixer] = useState(null);
  const [batchKg, setBatchKg] = useState(10); // default 10 KG batch
  const [toastMessage, setToastMessage] = useState(null);

  // Mixer Form State (Default Base: 1 KG = 1000 Grams)
  const [formData, setFormData] = useState({
    name: "",
    tamilName: "",
    productId: "",
    description: "",
    instructions: "",
    ingredients: []
  });

  // Selected raw material to add in form
  const [selectedRmId, setSelectedRmId] = useState("");
  const [selectedRmGrams, setSelectedRmGrams] = useState(100);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper map for Raw Materials lookup by ID or Name
  const rawMaterialsMap = useMemo(() => {
    const map = new Map();
    rawMaterials.forEach(rm => {
      map.set(rm.id, rm);
      map.set(rm.name.toLowerCase(), rm);
    });
    return map;
  }, [rawMaterials]);

  // Calculate 1 KG Raw Material Cost for a mixer
  const calculateMixerCost = (mixer) => {
    if (!mixer || !mixer.ingredients) return 0;
    return mixer.ingredients.reduce((total, ing) => {
      const rm = rawMaterialsMap.get(ing.rawMaterialId) || rawMaterialsMap.get(ing.rawMaterialName?.toLowerCase());
      const rate = Number(rm?.standardRate) || 0;
      const cost = ((Number(ing.grams) || 0) / 1000) * rate;
      return total + cost;
    }, 0);
  };

  // Open Form for New Mixer
  const handleOpenNew = () => {
    setEditingMixer(null);
    setFormData({
      name: "",
      tamilName: "",
      productId: "",
      description: "Standard 1 KG recipe formulation",
      instructions: "Sun-dry raw spices, roast ingredients separately at moderate temperature, grind to fine mesh.",
      ingredients: []
    });
    setSelectedRmId("");
    setSelectedRmGrams(100);
    setShowEditModal(true);
  };

  // Open Form for Editing
  const handleOpenEdit = (mixer) => {
    setEditingMixer(mixer);
    setFormData({
      name: mixer.name || "",
      tamilName: mixer.tamilName || "",
      productId: mixer.productId || "",
      description: mixer.description || "",
      instructions: mixer.instructions || "",
      ingredients: (mixer.ingredients || []).map(ing => ({
        rawMaterialId: ing.rawMaterialId,
        rawMaterialName: ing.rawMaterialName,
        grams: Number(ing.grams) || 0,
        percentage: Number(ing.percentage) || Number(((Number(ing.grams) || 0) / 10).toFixed(1))
      }))
    });
    setSelectedRmId("");
    setSelectedRmGrams(100);
    setShowEditModal(true);
  };

  // Handle Finished Product selection from catalog
  const handleProductSelect = (prodId) => {
    if (!prodId) {
      setFormData(prev => ({ ...prev, productId: "" }));
      return;
    }
    const found = products.find(p => p.id === prodId);
    if (found) {
      setFormData(prev => ({
        ...prev,
        productId: found.id,
        name: prev.name ? prev.name : found.name,
        tamilName: prev.tamilName ? prev.tamilName : (found.tamilName || ""),
        description: prev.description || `Formulation for ${found.name}`
      }));
    }
  };

  // Add Raw Material to ingredients list
  const handleAddIngredient = () => {
    if (!selectedRmId) {
      alert("Please select a Raw Material to add.");
      return;
    }
    const rm = rawMaterials.find(r => r.id === selectedRmId);
    if (!rm) return;

    const gramsNum = Number(selectedRmGrams) || 0;
    if (gramsNum <= 0) {
      alert("Please enter a valid weight in grams (> 0).");
      return;
    }

    // Check if already in list
    const existingIndex = formData.ingredients.findIndex(
      ing => ing.rawMaterialId === rm.id || ing.rawMaterialName === rm.name
    );

    if (existingIndex >= 0) {
      // Update existing grams
      setFormData(prev => {
        const updated = [...prev.ingredients];
        const newGrams = updated[existingIndex].grams + gramsNum;
        updated[existingIndex] = {
          ...updated[existingIndex],
          grams: newGrams,
          percentage: Number((newGrams / 10).toFixed(1))
        };
        return { ...prev, ingredients: updated };
      });
    } else {
      // Add new
      setFormData(prev => ({
        ...prev,
        ingredients: [
          ...prev.ingredients,
          {
            rawMaterialId: rm.id,
            rawMaterialName: rm.name,
            grams: gramsNum,
            percentage: Number((gramsNum / 10).toFixed(1))
          }
        ]
      }));
    }

    // Reset selection input
    setSelectedRmId("");
    setSelectedRmGrams(100);
  };

  // Update grams of an existing ingredient
  const handleUpdateIngredientGrams = (index, grams) => {
    const num = Math.max(0, Number(grams) || 0);
    setFormData(prev => {
      const updated = [...prev.ingredients];
      updated[index] = {
        ...updated[index],
        grams: num,
        percentage: Number((num / 10).toFixed(1))
      };
      return { ...prev, ingredients: updated };
    });
  };

  // Remove ingredient from form
  const handleRemoveIngredient = (index) => {
    setFormData(prev => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index)
    }));
  };

  // Auto-normalize ingredients to exactly 1000g
  const handleNormalizeTo1000g = () => {
    const totalGrams = formData.ingredients.reduce((s, i) => s + (Number(i.grams) || 0), 0);
    if (totalGrams <= 0) return;

    setFormData(prev => {
      const normalized = prev.ingredients.map(ing => {
        const factor = (Number(ing.grams) || 0) / totalGrams;
        const newGrams = Math.round(factor * 1000);
        return {
          ...ing,
          grams: newGrams,
          percentage: Number((newGrams / 10).toFixed(1))
        };
      });

      // Fix rounding drift so sum is exactly 1000
      const currentSum = normalized.reduce((s, i) => s + i.grams, 0);
      const diff = 1000 - currentSum;
      if (diff !== 0 && normalized.length > 0) {
        normalized[0].grams += diff;
        normalized[0].percentage = Number((normalized[0].grams / 10).toFixed(1));
      }

      return { ...prev, ingredients: normalized };
    });
    showToast("Normalized ingredients proportionally to 1000g (1 KG base)!");
  };

  // Save Mixer
  const handleSaveMixer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a Mixer / Finished Product Name.");
      return;
    }
    if (formData.ingredients.length === 0) {
      alert("Please add at least one Raw Material ingredient.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      tamilName: formData.tamilName.trim(),
      productId: formData.productId || "",
      baseQuantity: 1, // 1 KG standard base
      baseUnit: "Kg",
      description: formData.description.trim(),
      instructions: formData.instructions.trim(),
      ingredients: formData.ingredients,
      isActive: true,
      timestamp: Date.now()
    };

    try {
      if (editingMixer) {
        await updateMixer(editingMixer.id, payload);
        showToast(`Mixer "${formData.name}" updated successfully!`);
      } else {
        await addMixer(payload);
        showToast(`Mixer "${formData.name}" created successfully!`);
      }
      setShowEditModal(false);
    } catch (err) {
      console.error("Save Mixer Error:", err);
      alert("Failed to save mixer: " + err.message);
    }
  };

  // Open Batch Scaler / Grinding Slip
  const handleOpenScaler = (mixer) => {
    setScalerMixer(mixer);
    setBatchKg(10); // default 10 KG batch
    setShowScalerModal(true);
  };

  // Delete Mixer with confirm
  const handleDeleteMixer = (mixer) => {
    showConfirmModal({
      title: "Delete Mixer Formulation",
      message: `Are you sure you want to delete "${mixer.name}"? This recipe formulation will be removed permanently.`,
      confirmText: "Delete Formula",
      isDanger: true,
      onConfirm: async () => {
        try {
          await deleteMixer(mixer.id);
          showToast(`Formula "${mixer.name}" deleted.`);
        } catch (err) {
          alert("Failed to delete: " + err.message);
        }
      }
    });
  };

  // Duplicate Mixer
  const handleDuplicateMixer = async (mixer) => {
    try {
      await duplicateMixer(mixer);
      showToast(`Formula duplicated as "${mixer.name} (Copy)"`);
    } catch (err) {
      alert("Failed to duplicate: " + err.message);
    }
  };

  // Print Grinding Slip
  const handlePrintSlip = () => {
    window.print();
  };

  // Filtered Mixers
  const filteredMixers = useMemo(() => {
    return mixers.filter(mixer => {
      const q = searchQuery.toLowerCase().trim();
      const nameMatch = (mixer.name || "").toLowerCase().includes(q) ||
                        (mixer.tamilName || "").toLowerCase().includes(q) ||
                        (mixer.description || "").toLowerCase().includes(q);

      const ingredientMatch = (mixer.ingredients || []).some(ing =>
        (ing.rawMaterialName || "").toLowerCase().includes(q)
      );

      const matchesSearch = !q || nameMatch || ingredientMatch;

      const totalGrams = (mixer.ingredients || []).reduce((s, i) => s + (Number(i.grams) || 0), 0);
      const isBalanced = totalGrams === 1000;

      if (filterMode === "balanced") return matchesSearch && isBalanced;
      if (filterMode === "imbalanced") return matchesSearch && !isBalanced;
      return matchesSearch;
    });
  }, [mixers, searchQuery, filterMode]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalCount = mixers.length;
    let balancedCount = 0;
    let totalCostSum = 0;

    mixers.forEach(m => {
      const grams = (m.ingredients || []).reduce((s, i) => s + (Number(i.grams) || 0), 0);
      if (grams === 1000) balancedCount++;
      totalCostSum += calculateMixerCost(m);
    });

    const avgCost = totalCount > 0 ? (totalCostSum / totalCount) : 0;

    return {
      totalCount,
      balancedCount,
      rawMaterialsCount: rawMaterials.length,
      avgCost
    };
  }, [mixers, rawMaterials, rawMaterialsMap]);

  // Form Current Total Grams and Cost
  const formTotalGrams = formData.ingredients.reduce((s, i) => s + (Number(i.grams) || 0), 0);
  const formCost1Kg = formData.ingredients.reduce((total, ing) => {
    const rm = rawMaterialsMap.get(ing.rawMaterialId) || rawMaterialsMap.get(ing.rawMaterialName?.toLowerCase());
    const rate = Number(rm?.standardRate) || 0;
    return total + ((Number(ing.grams) || 0) / 1000) * rate;
  }, 0);

  return (
    <div className="responsive-page-container" style={{ paddingBottom: "60px" }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "20px",
          right: "20px",
          background: "var(--sd-black)",
          color: "#FFFFFF",
          padding: "10px 18px",
          borderRadius: "10px",
          fontSize: "0.85rem",
          fontWeight: 700,
          boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          animation: "fadeIn 0.2s ease"
        }}>
          <CheckCircle2 size={16} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "14px",
        marginBottom: "20px"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              background: "linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)",
              color: "#FFFFFF",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)"
            }}>
              <FlaskConical size={22} />
            </div>
            <div>
              <h1 className="font-heading" style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--sd-black)", margin: 0 }}>
                Mixers & Formulations
              </h1>
              <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", margin: "2px 0 0 0" }}>
                Finished product raw material ratios & mixing formulas &bull; Default 1 KG Base
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Create New Mixer */}
        <button
          type="button"
          onClick={handleOpenNew}
          style={{
            background: "var(--sd-black)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "10px",
            padding: "9px 18px",
            fontSize: "0.85rem",
            fontWeight: 800,
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "all 0.15s ease"
          }}
        >
          <Plus size={16} />
          <span>+ Create New Mixer</span>
        </button>
      </div>

      {/* Stats Cards Row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "12px",
        marginBottom: "20px"
      }}>
        <div style={{
          background: "#FFFFFF",
          padding: "14px 16px",
          borderRadius: "14px",
          border: "1px solid var(--sd-zinc-200)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Total Mixers</span>
            <FlaskConical size={16} color="var(--sd-red)" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "4px" }}>
            {stats.totalCount}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>Formulated finished products</span>
        </div>

        <div style={{
          background: "#FFFFFF",
          padding: "14px 16px",
          borderRadius: "14px",
          border: "1px solid var(--sd-zinc-200)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Balanced (1000g)</span>
            <CheckCircle2 size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#10B981", marginTop: "4px" }}>
            {stats.balancedCount} / {stats.totalCount}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>Exact 1 KG batch recipes</span>
        </div>

        <div style={{
          background: "#FFFFFF",
          padding: "14px 16px",
          borderRadius: "14px",
          border: "1px solid var(--sd-zinc-200)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Raw Materials</span>
            <Boxes size={16} color="#3B82F6" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "4px" }}>
            {stats.rawMaterialsCount}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>Available in Master catalog</span>
        </div>

        <div style={{
          background: "#FFFFFF",
          padding: "14px 16px",
          borderRadius: "14px",
          border: "1px solid var(--sd-zinc-200)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Avg 1 KG Raw Cost</span>
            <Scale size={16} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "4px" }}>
            {formatCurrency(stats.avgCost)}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>Based on catalog rates</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        background: "#FFFFFF",
        padding: "12px 16px",
        borderRadius: "14px",
        border: "1px solid var(--sd-zinc-200)",
        marginBottom: "20px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px"
      }}>
        {/* Search Input */}
        <div style={{
          position: "relative",
          flex: "1 1 260px",
          minWidth: "220px"
        }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
          <input
            type="text"
            placeholder="Search by mixer name, product, or raw material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 36px",
              borderRadius: "10px",
              border: "1px solid var(--sd-zinc-200)",
              fontSize: "0.85rem",
              background: "var(--sd-zinc-50)",
              outline: "none"
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--sd-zinc-400)"
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div style={{ display: "flex", gap: "6px" }}>
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: filterMode === "all" ? 800 : 600,
              background: filterMode === "all" ? "var(--sd-black)" : "var(--sd-zinc-100)",
              color: filterMode === "all" ? "#FFFFFF" : "var(--sd-zinc-700)",
              border: "none",
              cursor: "pointer"
            }}
          >
            All Mixers ({mixers.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("balanced")}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: filterMode === "balanced" ? 800 : 600,
              background: filterMode === "balanced" ? "#10B981" : "var(--sd-zinc-100)",
              color: filterMode === "balanced" ? "#FFFFFF" : "var(--sd-zinc-700)",
              border: "none",
              cursor: "pointer"
            }}
          >
            1000g Balanced ({stats.balancedCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("imbalanced")}
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "0.78rem",
              fontWeight: filterMode === "imbalanced" ? 800 : 600,
              background: filterMode === "imbalanced" ? "#F59E0B" : "var(--sd-zinc-100)",
              color: filterMode === "imbalanced" ? "#FFFFFF" : "var(--sd-zinc-700)",
              border: "none",
              cursor: "pointer"
            }}
          >
            Needs Balance ({mixers.length - stats.balancedCount})
          </button>
        </div>
      </div>

      {/* Mixers Cards Grid */}
      {filteredMixers.length === 0 ? (
        <div style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          border: "1px dashed var(--sd-zinc-300)",
          padding: "50px 20px",
          textAlign: "center"
        }}>
          <FlaskConical size={42} color="var(--sd-zinc-300)" style={{ margin: "0 auto 12px auto" }} />
          <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
            No Mixers Found
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", margin: "6px 0 16px 0" }}>
            {searchQuery ? "No mixer recipes match your search criteria." : "Create your first spice mixer formula with a 1 KG standard base."}
          </p>
          <button
            type="button"
            onClick={handleOpenNew}
            style={{
              background: "var(--sd-black)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              padding: "8px 18px",
              fontSize: "0.82rem",
              fontWeight: 800,
              cursor: "pointer"
            }}
          >
            + Create First Mixer Formula
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "16px"
        }}>
          {filteredMixers.map(mixer => {
            const totalGrams = (mixer.ingredients || []).reduce((s, i) => s + (Number(i.grams) || 0), 0);
            const isBalanced = totalGrams === 1000;
            const cost1Kg = calculateMixerCost(mixer);

            return (
              <div 
                key={mixer.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: "16px",
                  border: isBalanced ? "1px solid var(--sd-zinc-200)" : "1px solid #FCD34D",
                  padding: "18px",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "14px",
                  transition: "all 0.2s ease"
                }}
              >
                {/* Header */}
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                    <div>
                      <h3 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                        {mixer.name}
                      </h3>
                      {mixer.tamilName && (
                        <div style={{ fontSize: "0.8rem", color: "var(--sd-zinc-500)", fontWeight: 600, marginTop: "2px" }}>
                          {mixer.tamilName}
                        </div>
                      )}
                    </div>
                    {/* Balanced / Grams Badge */}
                    <span style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      padding: "3px 8px",
                      borderRadius: "6px",
                      background: isBalanced ? "#ECFDF5" : "#FEF3C7",
                      color: isBalanced ? "#065F46" : "#92400E",
                      border: isBalanced ? "1px solid #A7F3D0" : "1px solid #FDE68A",
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}>
                      {isBalanced ? <Check size={12} /> : <AlertCircle size={12} />}
                      <span>{totalGrams}g / 1000g</span>
                    </span>
                  </div>

                  {mixer.description && (
                    <p style={{ fontSize: "0.76rem", color: "var(--sd-zinc-600)", margin: "8px 0 0 0", lineHeight: "1.3" }}>
                      {mixer.description}
                    </p>
                  )}
                </div>

                {/* 1 KG Base Badge & Cost Tag */}
                <div style={{
                  background: "var(--sd-zinc-50)",
                  border: "1px solid var(--sd-zinc-200)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between"
                }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>
                      Standard Formulation
                    </div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--sd-black)" }}>
                      1.000 KG (1000g)
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>
                      Raw Spice Cost / 1KG
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--sd-red)" }}>
                      {formatCurrency(cost1Kg)}
                    </div>
                  </div>
                </div>

                {/* Ingredients Ratio Breakdown */}
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>
                      Ingredients ({mixer.ingredients?.length || 0})
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", fontWeight: 600 }}>
                      Ratio in 1000g
                    </span>
                  </div>

                  {/* Compact Ingredients List */}
                  <div style={{
                    maxHeight: "150px",
                    overflowY: "auto",
                    border: "1px solid var(--sd-zinc-150)",
                    borderRadius: "8px",
                    background: "#FAFAFA"
                  }}>
                    {(mixer.ingredients || []).map((ing, idx) => {
                      const rm = rawMaterialsMap.get(ing.rawMaterialId) || rawMaterialsMap.get(ing.rawMaterialName?.toLowerCase());
                      const rate = Number(rm?.standardRate) || 0;
                      const cost = ((Number(ing.grams) || 0) / 1000) * rate;

                      return (
                        <div 
                          key={idx}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderBottom: idx === mixer.ingredients.length - 1 ? "none" : "1px solid var(--sd-zinc-100)",
                            fontSize: "0.75rem"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", overflow: "hidden" }}>
                            <span style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: idx % 3 === 0 ? "var(--sd-red)" : idx % 3 === 1 ? "#3B82F6" : "#10B981"
                            }} />
                            <span style={{ fontWeight: 600, color: "var(--sd-black)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {ing.rawMaterialName}
                            </span>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                            <span style={{ fontWeight: 700, color: "var(--sd-zinc-800)" }}>
                              {ing.grams}g
                            </span>
                            <span style={{
                              background: "rgba(0,0,0,0.06)",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              color: "var(--sd-zinc-700)"
                            }}>
                              {ing.percentage || ((ing.grams / 10).toFixed(1))}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "6px",
                  paddingTop: "10px",
                  borderTop: "1px solid var(--sd-zinc-150)"
                }}>
                  {/* Mixer Ready / Scaler */}
                  <button
                    type="button"
                    onClick={() => handleOpenScaler(mixer)}
                    style={{
                      flex: "1 1 120px",
                      background: "linear-gradient(135deg, #18181B 0%, #27272A 100%)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "7px 10px",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px"
                    }}
                    title="Scale batch to 5kg, 10kg, 25kg, 100kg & Print Slip"
                  >
                    <Calculator size={13} color="#FBBF24" />
                    <span>Mixer Ready</span>
                  </button>

                  <div style={{ display: "flex", gap: "4px" }}>
                    <button
                      type="button"
                      onClick={() => handleDuplicateMixer(mixer)}
                      style={{
                        background: "var(--sd-zinc-100)",
                        border: "1px solid var(--sd-zinc-200)",
                        borderRadius: "8px",
                        padding: "7px",
                        color: "var(--sd-zinc-700)",
                        cursor: "pointer"
                      }}
                      title="Duplicate Recipe"
                    >
                      <Copy size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(mixer)}
                      style={{
                        background: "var(--sd-zinc-100)",
                        border: "1px solid var(--sd-zinc-200)",
                        borderRadius: "8px",
                        padding: "7px",
                        color: "var(--sd-zinc-700)",
                        cursor: "pointer"
                      }}
                      title="Edit Formulation"
                    >
                      <Edit2 size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMixer(mixer)}
                      style={{
                        background: "#FEF2F2",
                        border: "1px solid #FEE2E2",
                        borderRadius: "8px",
                        padding: "7px",
                        color: "#DC2626",
                        cursor: "pointer"
                      }}
                      title="Delete Mixer"
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

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT MIXER FORMULATION BUILDER (Default 1 KG Base)      */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(3px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          zIndex: 999
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "720px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--sd-zinc-50)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FlaskConical size={22} color="var(--sd-red)" />
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--sd-black)", margin: 0 }}>
                    {editingMixer ? "Edit Mixer Formulation" : "Create New Mixer Formulation"}
                  </h2>
                  <span style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>
                    Standard Base: <strong>1.000 KG (1000 Grams)</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--sd-zinc-500)",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveMixer} style={{ overflowY: "auto", padding: "20px", flex: 1 }}>
              {/* Product Selection / Name */}
              <div style={{
                background: "var(--sd-zinc-50)",
                padding: "14px",
                borderRadius: "12px",
                border: "1px solid var(--sd-zinc-200)",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-black)", textTransform: "uppercase" }}>
                    Select Finished Product (Catalog)
                  </label>
                  <span style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)" }}>
                    Optional: Auto-fills name & links finished SKU
                  </span>
                </div>

                <select
                  value={formData.productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    fontSize: "0.85rem",
                    background: "#FFFFFF",
                    marginBottom: "12px"
                  }}
                >
                  <option value="">-- Choose Existing Finished Product (or enter custom below) --</option>
                  {products.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} {prod.tamilName ? `(${prod.tamilName})` : ""} - {prod.category || "General"}
                    </option>
                  ))}
                </select>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)" }}>
                      Mixer / Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Madras Sambar Powder"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        marginTop: "3px"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)" }}>
                      Tamil Name (தமிழ் பெயர்)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. சாம்பார் பொடி"
                      value={formData.tamilName}
                      onChange={(e) => setFormData({ ...formData, tamilName: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        marginTop: "3px"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* RAW MATERIALS IMPORT / SELECTION */}
              <div style={{
                background: "#FFFFFF",
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid var(--sd-zinc-200)",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div>
                    <h4 style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                      Raw Materials Formulation (1 KG Base)
                    </h4>
                    <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>
                      Import raw spices from Master Assets &bull; Finance module &bull; Raw Materials
                    </span>
                  </div>

                  {/* Normalize Button */}
                  {formData.ingredients.length > 0 && formTotalGrams !== 1000 && (
                    <button
                      type="button"
                      onClick={handleNormalizeTo1000g}
                      style={{
                        background: "var(--sd-zinc-100)",
                        border: "1px solid var(--sd-zinc-300)",
                        borderRadius: "6px",
                        padding: "4px 8px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "var(--sd-zinc-800)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                      title="Proportionately adjust current ingredients so total is exactly 1000g"
                    >
                      <Sparkles size={11} color="var(--sd-red)" />
                      <span>Auto-Scale to 1000g</span>
                    </button>
                  )}
                </div>

                {/* Balance Progress Bar */}
                <div style={{
                  background: "var(--sd-zinc-100)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  marginBottom: "14px",
                  border: "1px solid var(--sd-zinc-200)"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--sd-zinc-600)" }}>
                      Mix Weight Balance: <strong>{formTotalGrams}g / 1000g</strong> ({((formTotalGrams / 1000) * 100).toFixed(1)}%)
                    </span>
                    <span style={{
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      color: formTotalGrams === 1000 ? "#059669" : formTotalGrams < 1000 ? "#D97706" : "#DC2626"
                    }}>
                      {formTotalGrams === 1000 ? "✓ Perfectly Balanced 1 KG" : formTotalGrams < 1000 ? `Need ${1000 - formTotalGrams}g more` : `Exceeds by +${formTotalGrams - 1000}g`}
                    </span>
                  </div>

                  <div style={{
                    height: "8px",
                    background: "var(--sd-zinc-200)",
                    borderRadius: "99px",
                    overflow: "hidden"
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${Math.min(100, (formTotalGrams / 1000) * 100)}%`,
                      background: formTotalGrams === 1000 ? "#10B981" : formTotalGrams < 1000 ? "#F59E0B" : "#EF4444",
                      transition: "width 0.2s ease"
                    }} />
                  </div>
                </div>

                {/* Add Raw Material Controls */}
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "8px",
                  alignItems: "flex-end",
                  marginBottom: "14px",
                  padding: "10px",
                  background: "var(--sd-zinc-50)",
                  borderRadius: "10px",
                  border: "1px solid var(--sd-zinc-200)"
                }}>
                  <div style={{ flex: "1 1 240px" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "3px" }}>
                      Raw Material (from Master Assets)
                    </label>
                    <select
                      value={selectedRmId}
                      onChange={(e) => setSelectedRmId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.82rem",
                        background: "#FFFFFF"
                      }}
                    >
                      <option value="">-- Choose Raw Material to Add --</option>
                      {rawMaterials.map(rm => (
                        <option key={rm.id} value={rm.id}>
                          {rm.name} {rm.tamilName ? `(${rm.tamilName})` : ""} - ₹{rm.standardRate || 0}/Kg
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ width: "110px" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", display: "block", marginBottom: "3px" }}>
                      Grams (for 1KG)
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={selectedRmGrams}
                      onChange={(e) => setSelectedRmGrams(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.82rem",
                        textAlign: "right"
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    style={{
                      background: "var(--sd-black)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <Plus size={14} />
                    <span>Add Spice</span>
                  </button>
                </div>

                {/* Added Ingredients Table */}
                {formData.ingredients.length === 0 ? (
                  <div style={{
                    padding: "24px",
                    textAlign: "center",
                    color: "var(--sd-zinc-400)",
                    fontSize: "0.8rem",
                    border: "1px dashed var(--sd-zinc-200)",
                    borderRadius: "10px"
                  }}>
                    No raw materials added yet. Select spices above to construct the 1 KG mix ratio.
                  </div>
                ) : (
                  <div style={{
                    border: "1px solid var(--sd-zinc-200)",
                    borderRadius: "10px",
                    overflow: "hidden"
                  }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                      <thead>
                        <tr style={{ background: "var(--sd-zinc-100)", borderBottom: "1px solid var(--sd-zinc-200)", textAlign: "left" }}>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)" }}>Raw Material</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "90px" }}>Rate / Kg</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "100px" }}>Grams (g)</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "70px" }}>Ratio %</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "90px" }}>Cost (₹)</th>
                          <th style={{ padding: "8px 10px", textAlign: "center", width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.ingredients.map((ing, idx) => {
                          const rm = rawMaterialsMap.get(ing.rawMaterialId) || rawMaterialsMap.get(ing.rawMaterialName?.toLowerCase());
                          const rate = Number(rm?.standardRate) || 0;
                          const cost = ((Number(ing.grams) || 0) / 1000) * rate;

                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid var(--sd-zinc-150)" }}>
                              <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--sd-black)" }}>
                                {ing.rawMaterialName}
                                {rm?.tamilName && (
                                  <span style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)", display: "block" }}>
                                    {rm.tamilName}
                                  </span>
                                )}
                              </td>

                              <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--sd-zinc-600)" }}>
                                ₹{rate}
                              </td>

                              <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="1"
                                  value={ing.grams}
                                  onChange={(e) => handleUpdateIngredientGrams(idx, e.target.value)}
                                  style={{
                                    width: "80px",
                                    padding: "4px 6px",
                                    borderRadius: "6px",
                                    border: "1px solid var(--sd-zinc-300)",
                                    fontSize: "0.78rem",
                                    textAlign: "right",
                                    fontWeight: 700
                                  }}
                                />
                              </td>

                              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "var(--sd-zinc-700)" }}>
                                {ing.percentage}%
                              </td>

                              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "var(--sd-black)" }}>
                                ₹{cost.toFixed(2)}
                              </td>

                              <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIngredient(idx)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    color: "#EF4444",
                                    cursor: "pointer",
                                    padding: "2px"
                                  }}
                                  title="Remove Ingredient"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: "var(--sd-zinc-50)", fontWeight: 900, borderTop: "2px solid var(--sd-zinc-200)" }}>
                          <td style={{ padding: "8px 10px", color: "var(--sd-black)" }}>Total 1 KG Base</td>
                          <td style={{ padding: "8px 10px" }}></td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: formTotalGrams === 1000 ? "#059669" : "#DC2626" }}>
                            {formTotalGrams}g
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right" }}>
                            {((formTotalGrams / 1000) * 100).toFixed(1)}%
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--sd-red)" }}>
                            ₹{formCost1Kg.toFixed(2)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Grinding & Processing Instructions */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--sd-black)", display: "block", marginBottom: "4px" }}>
                  Roasting & Grinding Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Dry roast coriander at 60C, roast chilli separately, cool completely before milling."
                  value={formData.instructions}
                  onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    fontSize: "0.82rem"
                  }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px",
                paddingTop: "14px",
                borderTop: "1px solid var(--sd-zinc-200)"
              }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  style={{
                    background: "var(--sd-zinc-100)",
                    color: "var(--sd-zinc-700)",
                    border: "1px solid var(--sd-zinc-300)",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  style={{
                    background: "var(--sd-black)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 20px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  {editingMixer ? "Update Formula" : "Save Mixer Formula"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: MIXER READY / PRODUCTION BATCH SCALER & GRINDING SLIP            */}
      {/* ========================================================================= */}
      {showScalerModal && scalerMixer && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(3px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          zIndex: 999
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            width: "100%",
            maxWidth: "760px",
            maxHeight: "94vh",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 20px 50px rgba(0,0,0,0.3)"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "linear-gradient(135deg, #18181B 0%, #27272A 100%)",
              color: "#FFFFFF"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Calculator size={22} color="#FBBF24" />
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 900, margin: 0, color: "#FFFFFF" }}>
                    Mixer Ready &bull; Batch Scaler
                  </h2>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                    {scalerMixer.name} {scalerMixer.tamilName ? `(${scalerMixer.tamilName})` : ""}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    padding: "5px 12px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <Printer size={13} />
                  <span>Print Slip</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowScalerModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "rgba(255,255,255,0.7)",
                    padding: "4px"
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body / Printable Grinding Slip */}
            <div style={{ overflowY: "auto", padding: "20px", flex: 1 }} className="printable-grinding-slip">
              {/* Batch Size Selector Controls (No-Print) */}
              <div className="no-print" style={{
                background: "var(--sd-zinc-50)",
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid var(--sd-zinc-200)",
                marginBottom: "18px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-black)", textTransform: "uppercase" }}>
                    Select Production Batch Weight (KG)
                  </label>
                  <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>
                    Scales 1 KG formula automatically
                  </span>
                </div>

                {/* Quick Batch Presets */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                  {[1, 5, 10, 25, 50, 100].map(kg => (
                    <button
                      key={kg}
                      type="button"
                      onClick={() => setBatchKg(kg)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: batchKg === kg ? 900 : 700,
                        background: batchKg === kg ? "var(--sd-black)" : "#FFFFFF",
                        color: batchKg === kg ? "#FFFFFF" : "var(--sd-zinc-700)",
                        border: batchKg === kg ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                        cursor: "pointer"
                      }}
                    >
                      {kg} KG
                    </button>
                  ))}

                  {/* Custom KG Input */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)" }}>Custom:</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.5"
                      value={batchKg}
                      onChange={(e) => setBatchKg(Math.max(0.1, Number(e.target.value) || 0))}
                      style={{
                        width: "80px",
                        padding: "5px 8px",
                        borderRadius: "6px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.82rem",
                        fontWeight: 800,
                        textAlign: "right"
                      }}
                    />
                    <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>KG</span>
                  </div>
                </div>
              </div>

              {/* Printable Header Info */}
              <div style={{
                borderBottom: "2px solid var(--sd-zinc-800)",
                paddingBottom: "12px",
                marginBottom: "14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start"
              }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--sd-black)", margin: 0 }}>
                    {BUSINESS_INFO.name || "SPICES DABBA"} &bull; FACTORY GRINDING SLIP
                  </h3>
                  <div style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", fontWeight: 700, marginTop: "2px" }}>
                    Product: <strong>{scalerMixer.name}</strong> {scalerMixer.tamilName ? `(${scalerMixer.tamilName})` : ""}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", fontWeight: 600 }}>
                    Date: {new Date().toLocaleDateString("en-IN")}
                  </div>
                  <div style={{
                    fontSize: "0.95rem",
                    fontWeight: 900,
                    background: "var(--sd-black)",
                    color: "#FFFFFF",
                    padding: "3px 10px",
                    borderRadius: "6px",
                    marginTop: "3px",
                    display: "inline-block"
                  }}>
                    BATCH: {batchKg} KG
                  </div>
                </div>
              </div>

              {/* Scaled Ingredients Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", marginBottom: "16px" }}>
                <thead>
                  <tr style={{ background: "var(--sd-zinc-100)", borderBottom: "2px solid var(--sd-zinc-300)", textAlign: "left" }}>
                    <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)" }}>#</th>
                    <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)" }}>Raw Material Spice</th>
                    <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "100px" }}>1 KG Ratio</th>
                    <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "130px" }}>Batch Weight Req.</th>
                    <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "100px" }}>Batch Cost</th>
                    <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "center", width: "70px" }}>Checked</th>
                  </tr>
                </thead>
                <tbody>
                  {(scalerMixer.ingredients || []).map((ing, idx) => {
                    const rm = rawMaterialsMap.get(ing.rawMaterialId) || rawMaterialsMap.get(ing.rawMaterialName?.toLowerCase());
                    const rate = Number(rm?.standardRate) || 0;
                    
                    // Scaled weight
                    const scaledGrams = (Number(ing.grams) || 0) * batchKg;
                    const scaledKg = scaledGrams / 1000;
                    const itemBatchCost = scaledKg * rate;

                    return (
                      <tr key={idx} style={{ borderBottom: "1px solid var(--sd-zinc-200)" }}>
                        <td style={{ padding: "8px 10px", color: "var(--sd-zinc-500)", fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: "8px 10px", fontWeight: 700, color: "var(--sd-black)" }}>
                          {ing.rawMaterialName}
                          {rm?.tamilName && (
                            <span style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)", display: "block" }}>
                              {rm.tamilName}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--sd-zinc-600)" }}>
                          {ing.grams}g ({ing.percentage}%)
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 900, color: "var(--sd-black)", fontSize: "0.85rem" }}>
                          {scaledKg >= 1 ? `${scaledKg.toFixed(3)} KG` : `${scaledGrams}g`}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "var(--sd-zinc-700)" }}>
                          ₹{itemBatchCost.toFixed(2)}
                        </td>
                        <td style={{ padding: "8px 10px", textAlign: "center" }}>
                          <span style={{
                            display: "inline-block",
                            width: "14px",
                            height: "14px",
                            border: "1px solid var(--sd-zinc-400)",
                            borderRadius: "3px"
                          }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(() => {
                    const totalBatchGrams = (scalerMixer.ingredients || []).reduce((s, i) => s + ((Number(i.grams) || 0) * batchKg), 0);
                    const totalBatchCost = (scalerMixer.ingredients || []).reduce((total, ing) => {
                      const rm = rawMaterialsMap.get(ing.rawMaterialId) || rawMaterialsMap.get(ing.rawMaterialName?.toLowerCase());
                      const rate = Number(rm?.standardRate) || 0;
                      return total + ((Number(ing.grams) || 0) * batchKg / 1000) * rate;
                    }, 0);

                    return (
                      <tr style={{ background: "var(--sd-zinc-100)", fontWeight: 900, borderTop: "2px solid var(--sd-zinc-400)" }}>
                        <td colSpan={3} style={{ padding: "10px", color: "var(--sd-black)" }}>
                          TOTAL BATCH OUTPUT ({batchKg} KG BATCH)
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", color: "var(--sd-black)", fontSize: "0.95rem" }}>
                          {(totalBatchGrams / 1000).toFixed(3)} KG
                        </td>
                        <td style={{ padding: "10px", textAlign: "right", color: "var(--sd-red)", fontSize: "0.95rem" }}>
                          ₹{totalBatchCost.toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    );
                  })()}
                </tfoot>
              </table>

              {/* Grinding Instructions Box */}
              {scalerMixer.instructions && (
                <div style={{
                  background: "var(--sd-zinc-50)",
                  border: "1px solid var(--sd-zinc-200)",
                  borderRadius: "10px",
                  padding: "10px 12px",
                  marginBottom: "16px"
                }}>
                  <div style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--sd-black)", marginBottom: "3px", textTransform: "uppercase" }}>
                    Roasting & Grinding Instructions:
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "var(--sd-zinc-700)" }}>
                    {scalerMixer.instructions}
                  </div>
                </div>
              )}

              {/* Quality Checklist & Mill Operator Signatures */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "14px",
                paddingTop: "10px",
                borderTop: "1px dashed var(--sd-zinc-300)"
              }}>
                <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-600)" }}>
                  <div style={{ fontWeight: 800, color: "var(--sd-black)", marginBottom: "4px" }}>Quality Verification:</div>
                  <div>[ ] Pre-roast moisture &lt; 10%</div>
                  <div>[ ] Mesh size fine consistency</div>
                  <div>[ ] Color & Aroma verified against standard</div>
                </div>

                <div style={{ textAlign: "right", fontSize: "0.74rem", color: "var(--sd-zinc-600)" }}>
                  <div style={{ marginTop: "30px", borderTop: "1px solid var(--sd-zinc-400)", display: "inline-block", padding: "4px 20px 0 20px" }}>
                    Factory / Mill Incharge Signature
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
