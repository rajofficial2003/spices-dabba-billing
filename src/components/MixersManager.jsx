import React, { useState, useMemo, useRef, useEffect } from "react";
import { usePOS } from "../context/POSContext";
import { 
  FlaskConical, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Copy, 
  Printer, 
  Download, 
  Scale, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Calculator, 
  X, 
  Boxes, 
  Check, 
  ChevronDown, 
  Loader2 
} from "lucide-react";

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
  
  // Batch Scaler State (Pack-based scaling with customized pack size)
  const [numPacks, setNumPacks] = useState(50); // Default 50 packs
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Recipe Form State (Customised weight in Grams, e.g. 40g, 100g, 1000g)
  const [formData, setFormData] = useState({
    name: "",
    tamilName: "",
    productId: "",
    customisedWeight: 40, // Default 40g pack
    description: "",
    ingredients: []
  });

  // Searchable Raw Material Combobox State
  const [rmSearchQuery, setRmSearchQuery] = useState("");
  const [selectedRm, setSelectedRm] = useState(null);
  const [selectedRmGrams, setSelectedRmGrams] = useState(10);
  const [isRmDropdownOpen, setIsRmDropdownOpen] = useState(false);
  const rmDropdownRef = useRef(null);

  // Close raw material dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (rmDropdownRef.current && !rmDropdownRef.current.contains(event.target)) {
        setIsRmDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  // Filter raw materials for searchable dropdown
  const filteredRawMaterials = useMemo(() => {
    if (!rmSearchQuery.trim()) return rawMaterials;
    const q = rmSearchQuery.toLowerCase().trim();
    return rawMaterials.filter(rm => 
      (rm.name && rm.name.toLowerCase().includes(q)) ||
      (rm.tamilName && rm.tamilName.toLowerCase().includes(q)) ||
      (rm.category && rm.category.toLowerCase().includes(q)) ||
      (rm.hsn && rm.hsn.toLowerCase().includes(q))
    );
  }, [rawMaterials, rmSearchQuery]);

  // Open Form for New Recipe
  const handleOpenNew = () => {
    setEditingMixer(null);
    setFormData({
      name: "",
      tamilName: "",
      productId: "",
      description: "",
      ingredients: []
    });
    setSelectedRm(null);
    setRmSearchQuery("");
    setSelectedRmGrams(10);
    setIsRmDropdownOpen(false);
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
      ingredients: (mixer.ingredients || []).map(ing => ({
        rawMaterialId: ing.rawMaterialId,
        rawMaterialName: ing.rawMaterialName,
        grams: Number(ing.grams) || 0
      }))
    });
    setSelectedRm(null);
    setRmSearchQuery("");
    setSelectedRmGrams(10);
    setIsRmDropdownOpen(false);
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

  // Handle Raw Material selection from searchable dropdown
  const handleSelectRm = (rm) => {
    setSelectedRm(rm);
    setRmSearchQuery(rm.name);
    setIsRmDropdownOpen(false);
  };

  // Clear Raw Material selection
  const handleClearRm = () => {
    setSelectedRm(null);
    setRmSearchQuery("");
    setIsRmDropdownOpen(true);
  };

  // Add Raw Material to ingredients list
  const handleAddIngredient = () => {
    if (!selectedRm) {
      alert("Please select a Raw Material from the dropdown.");
      return;
    }

    const gramsNum = Number(selectedRmGrams) || 0;
    if (gramsNum <= 0) {
      alert("Please enter a valid weight in grams (> 0).");
      return;
    }

    // Check if already in list
    const existingIndex = formData.ingredients.findIndex(
      ing => ing.rawMaterialId === selectedRm.id || ing.rawMaterialName === selectedRm.name
    );

    if (existingIndex >= 0) {
      // Update existing grams
      setFormData(prev => {
        const updated = [...prev.ingredients];
        const newGrams = Number((updated[existingIndex].grams + gramsNum).toFixed(2));
        updated[existingIndex] = {
          ...updated[existingIndex],
          grams: newGrams
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
            rawMaterialId: selectedRm.id,
            rawMaterialName: selectedRm.name,
            grams: gramsNum
          }
        ]
      }));
    }

    // Reset selection input
    setSelectedRm(null);
    setRmSearchQuery("");
    setSelectedRmGrams(10);
  };

  // Update grams of an existing ingredient
  const handleUpdateIngredientGrams = (index, grams) => {
    const num = Math.max(0, Number(grams) || 0);
    setFormData(prev => {
      const updated = [...prev.ingredients];
      updated[index] = {
        ...updated[index],
        grams: num
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

  // Save Recipe
  const handleSaveMixer = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a Recipe / Finished Product Name.");
      return;
    }
    if (formData.ingredients.length === 0) {
      alert("Please add at least one Raw Material ingredient.");
      return;
    }

    const totalWeight = Number(formData.ingredients.reduce((s, i) => s + (Number(i.grams) || 0), 0).toFixed(2)) || 40;

    const payload = {
      name: formData.name.trim(),
      tamilName: formData.tamilName.trim(),
      productId: formData.productId || "",
      customisedWeight: totalWeight,
      baseWeightGrams: totalWeight,
      baseUnit: "g",
      description: formData.description.trim(),
      ingredients: formData.ingredients.map(ing => ({
        ...ing,
        percentage: Number(((ing.grams / totalWeight) * 100).toFixed(1))
      })),
      isActive: true,
      timestamp: Date.now()
    };

    try {
      if (editingMixer) {
        await updateMixer(editingMixer.id, payload);
        showToast(`Recipe "${formData.name}" updated successfully!`);
      } else {
        await addMixer(payload);
        showToast(`Recipe "${formData.name}" created successfully!`);
      }
      setShowEditModal(false);
    } catch (err) {
      console.error("Save Recipe Error:", err);
      alert("Failed to save recipe: " + err.message);
    }
  };

  // Open Recipe Ready Batch Scaler
  const handleOpenScaler = (mixer) => {
    setScalerMixer(mixer);
    setNumPacks(50); // default 50 packs
    setShowScalerModal(true);
  };

  // Delete Recipe with confirm
  const handleDeleteMixer = async (mixer) => {
    const ok = await showConfirmModal({
      title: "Delete Recipe Formulation",
      message: `Are you sure you want to delete "${mixer.name}"? This recipe formulation will be removed permanently.`,
      confirmText: "Delete Recipe",
      isDanger: true
    });

    if (ok) {
      try {
        await deleteMixer(mixer.id);
        showToast(`Recipe "${mixer.name}" deleted.`);
      } catch (err) {
        alert("Failed to delete: " + err.message);
      }
    }
  };

  // Duplicate Recipe
  const handleDuplicateMixer = async (mixer) => {
    try {
      await duplicateMixer(mixer.id);
      showToast(`Recipe duplicated as "${mixer.name} (Copy)"`);
    } catch (err) {
      alert("Failed to duplicate: " + err.message);
    }
  };

  // Download PDF using html2pdf
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    const slipEl = document.getElementById("recipe-batch-slip-area");
    if (!slipEl) {
      setIsGeneratingPdf(false);
      return;
    }

    const cleanName = (scalerMixer.name || "Recipe").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `${cleanName}_${numPacks}_Packs_Batch_Slip.pdf`;

    try {
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      if (window.html2pdf) {
        const opt = {
          margin: [8, 10, 8, 10],
          filename: filename,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
        };

        await window.html2pdf().set(opt).from(slipEl).save();
        showToast("PDF Batch Slip downloaded successfully!");
        setIsGeneratingPdf(false);
        return;
      }
    } catch (err) {
      console.warn("Direct html2pdf notice:", err.message);
    }

    // Fallback: iframe print
    handlePrintSlip();
    setIsGeneratingPdf(false);
  };

  // Print Slip using clean isolated iframe (immune to CSS hide rules)
  const handlePrintSlip = () => {
    const slipEl = document.getElementById("recipe-batch-slip-area");
    if (!slipEl) return;

    const printIframe = document.createElement("iframe");
    printIframe.style.position = "fixed";
    printIframe.style.right = "0";
    printIframe.style.bottom = "0";
    printIframe.style.width = "0";
    printIframe.style.height = "0";
    printIframe.style.border = "0";
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${scalerMixer?.name || "Recipe"} - Factory Batch Slip</title>
          <style>
            @page { size: A4 portrait; margin: 12mm 15mm; }
            * { box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; 
              color: #18181B; 
              margin: 0; 
              padding: 12px; 
              background: #FFFFFF; 
            }
            table { width: 100%; border-collapse: collapse; margin-top: 14px; }
            th, td { border: 1px solid #D4D4D8; padding: 8px 10px; }
            th { background: #F4F4F5; font-weight: 800; font-size: 12px; }
            td { font-size: 12px; }
            .header-banner { border-bottom: 2px solid #18181B; padding-bottom: 10px; margin-bottom: 12px; }
            .batch-badge { 
              background: #18181B; 
              color: #FFFFFF; 
              padding: 4px 10px; 
              border-radius: 6px; 
              font-weight: 800; 
              font-size: 13px; 
              display: inline-block; 
            }
          </style>
        </head>
        <body>
          ${slipEl.innerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow.focus();
      printIframe.contentWindow.print();
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 1000);
    }, 300);
  };

  // Filtered Recipes
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
      const targetWeight = mixer.customisedWeight || mixer.baseWeightGrams || totalGrams;
      const isBalanced = Math.abs(totalGrams - targetWeight) < 0.1;

      if (filterMode === "balanced") return matchesSearch && isBalanced;
      if (filterMode === "imbalanced") return matchesSearch && !isBalanced;
      return matchesSearch;
    });
  }, [mixers, searchQuery, filterMode]);

  // Overall Statistics (Operational formulation metrics)
  const stats = useMemo(() => {
    const totalCount = mixers.length;
    let balancedCount = 0;
    let totalIngredientsUsed = 0;

    mixers.forEach(m => {
      const grams = (m.ingredients || []).reduce((s, i) => s + (Number(i.grams) || 0), 0);
      const targetWeight = m.customisedWeight || m.baseWeightGrams || grams;
      if (Math.abs(grams - targetWeight) < 0.1) balancedCount++;
      totalIngredientsUsed += (m.ingredients?.length || 0);
    });

    const avgIngredients = totalCount > 0 ? (totalIngredientsUsed / totalCount).toFixed(1) : 0;

    return {
      totalCount,
      balancedCount,
      rawMaterialsCount: rawMaterials.length,
      avgIngredients
    };
  }, [mixers, rawMaterials]);

  // Form Current Total Grams
  const formTotalGrams = Number(formData.ingredients.reduce((s, i) => s + (Number(i.grams) || 0), 0).toFixed(2));

  // Scaler Recipe Parameters
  const scalerPackWeight = scalerMixer 
    ? (Number(scalerMixer.customisedWeight) || Number(scalerMixer.baseWeightGrams) || (scalerMixer.ingredients || []).reduce((s, i) => s + (Number(i.grams) || 0), 0) || 40)
    : 40;
  const totalBatchGrams = scalerPackWeight * numPacks;
  const totalBatchKg = totalBatchGrams / 1000;

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
                Recipe & Formulations
              </h1>
              <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", margin: "2px 0 0 0" }}>
                Finished product raw material ratios & customized recipe formulations
              </p>
            </div>
          </div>
        </div>

        {/* Action Button: Create New Recipe */}
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
          <span>+ Create New Recipe</span>
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
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Total Recipes</span>
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
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Balanced Recipes</span>
            <CheckCircle2 size={16} color="#10B981" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "#10B981", marginTop: "4px" }}>
            {stats.balancedCount} / {stats.totalCount}
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>Exact customized weight ratio</span>
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
          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>Available in Master Assets</span>
        </div>

        <div style={{
          background: "#FFFFFF",
          padding: "14px 16px",
          borderRadius: "14px",
          border: "1px solid var(--sd-zinc-200)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Customised Formats</span>
            <Scale size={16} color="#8B5CF6" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "4px" }}>
            Pack Scaler
          </div>
          <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>Avg {stats.avgIngredients} spices per recipe</span>
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
            placeholder="Search by recipe name, product, or raw material..."
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
            All Recipes ({mixers.length})
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
            Balanced ({stats.balancedCount})
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

      {/* Recipes Cards Grid */}
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
            No Recipes Found
          </h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-500)", margin: "6px 0 16px 0" }}>
            {searchQuery ? "No spice recipes match your search criteria." : "Create your first spice recipe with a customized pack weight (e.g. 40g)."}
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
            + Create First Recipe
          </button>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
          gap: "16px"
        }}>
          {filteredMixers.map(mixer => {
            const totalGrams = Number((mixer.ingredients || []).reduce((s, i) => s + (Number(i.grams) || 0), 0).toFixed(2));
            const customWeight = Number(mixer.customisedWeight) || Number(mixer.baseWeightGrams) || totalGrams;
            const isBalanced = Math.abs(totalGrams - customWeight) < 0.1;

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
                      <span>{totalGrams}g / {customWeight}g</span>
                    </span>
                  </div>

                  {mixer.description && (
                    <p style={{ fontSize: "0.76rem", color: "var(--sd-zinc-600)", margin: "8px 0 0 0", lineHeight: "1.3" }}>
                      {mixer.description}
                    </p>
                  )}
                </div>

                {/* Customised Pack Weight Card */}
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
                      Customised Weight
                    </div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 800, color: "var(--sd-black)" }}>
                      {customWeight} Grams {customWeight < 1000 ? `(${customWeight}g Pack)` : `(${(customWeight / 1000).toFixed(3)} KG)`}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>
                      Raw Spices
                    </div>
                    <div style={{ fontSize: "0.88rem", fontWeight: 900, color: "var(--sd-black)" }}>
                      {mixer.ingredients?.length || 0} Ingredients
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
                      Ratio in {customWeight}g
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
                    {(mixer.ingredients || []).map((ing, idx) => (
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
                            {ing.percentage || (((ing.grams / customWeight) * 100).toFixed(1))}%
                          </span>
                        </div>
                      </div>
                    ))}
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
                  {/* Recipe Ready / Scaler */}
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
                    title="Scale batch to 50, 100, 250, 500 packs & Download/Print Slip"
                  >
                    <Calculator size={13} color="#FBBF24" />
                    <span>Recipe Ready</span>
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
                      title="Delete Recipe"
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
      {/* MODAL 1: CREATE / EDIT RECIPE FORMULATION BUILDER (Customised Weight)    */}
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
            maxWidth: "740px",
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
                    {editingMixer ? "Edit Recipe Formulation" : "Create New Recipe Formulation"}
                  </h2>
                  <span style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>
                    Total Recipe Weight: <strong>{formTotalGrams > 0 ? `${formTotalGrams} Grams` : "0g"}</strong> ({formData.ingredients.length} Spices)
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
              {/* Product Selection */}
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

                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)" }}>
                      Recipe / Product Name *
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

              {/* RAW MATERIALS IMPORT / SELECTION WITH TYPE-TO-SEARCH DROPDOWN */}
              <div style={{
                background: "#FFFFFF",
                padding: "16px",
                borderRadius: "14px",
                border: "1px solid var(--sd-zinc-200)",
                marginBottom: "16px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div>
                    <h4 style={{ fontSize: "0.92rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
                      Raw Materials Formulation
                    </h4>
                    <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>
                      Type to search & select raw spices from Master Assets &bull; Finance
                    </span>
                  </div>

                  {formTotalGrams > 0 && (
                    <div style={{
                      background: "#ECFDF5",
                      border: "1px solid #A7F3D0",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "0.76rem",
                      fontWeight: 800,
                      color: "#065F46"
                    }}>
                      Total Weight: {formTotalGrams}g ({formData.ingredients.length} Spices)
                    </div>
                  )}
                </div>

                {/* Searchable Raw Material Combobox & Grams Add Controls */}
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "10px",
                  alignItems: "flex-end",
                  marginBottom: "14px",
                  padding: "12px",
                  background: "var(--sd-zinc-50)",
                  borderRadius: "12px",
                  border: "1px solid var(--sd-zinc-200)"
                }}>
                  {/* Type-to-search Raw Material Input */}
                  <div style={{ flex: "1 1 260px", position: "relative" }} ref={rmDropdownRef}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-700)", display: "block", marginBottom: "4px" }}>
                      Raw Material (from Master Assets) <span style={{ color: "var(--sd-zinc-400)", fontWeight: 500 }}>(Type to search)</span>
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type="text"
                        placeholder="Type to search spice (e.g. Chilli, Coriander, மஞ்சள்)..."
                        value={rmSearchQuery}
                        onFocus={() => setIsRmDropdownOpen(true)}
                        onChange={(e) => {
                          setRmSearchQuery(e.target.value);
                          setIsRmDropdownOpen(true);
                          if (selectedRm && selectedRm.name !== e.target.value) {
                            setSelectedRm(null);
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 32px 8px 10px",
                          borderRadius: "8px",
                          border: selectedRm ? "1.5px solid #10B981" : "1px solid var(--sd-zinc-300)",
                          fontSize: "0.84rem",
                          background: selectedRm ? "#ECFDF5" : "#FFFFFF",
                          fontWeight: selectedRm ? 700 : 500,
                          color: "var(--sd-black)"
                        }}
                      />
                      {selectedRm ? (
                        <button
                          type="button"
                          onClick={handleClearRm}
                          style={{
                            position: "absolute",
                            right: "8px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "var(--sd-zinc-500)",
                            cursor: "pointer",
                            padding: "2px"
                          }}
                        >
                          <X size={15} />
                        </button>
                      ) : (
                        <ChevronDown 
                          size={15} 
                          style={{
                            position: "absolute",
                            right: "10px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--sd-zinc-400)",
                            pointerEvents: "none"
                          }} 
                        />
                      )}
                    </div>

                    {/* Dropdown Results */}
                    {isRmDropdownOpen && (
                      <div style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        marginTop: "4px",
                        maxHeight: "220px",
                        overflowY: "auto",
                        background: "#FFFFFF",
                        border: "1px solid var(--sd-zinc-300)",
                        borderRadius: "10px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                      }}>
                        {filteredRawMaterials.length === 0 ? (
                          <div style={{ padding: "10px 14px", fontSize: "0.78rem", color: "var(--sd-zinc-500)" }}>
                            No raw spices found matching "{rmSearchQuery}"
                          </div>
                        ) : (
                          filteredRawMaterials.map(rm => (
                            <div
                              key={rm.id}
                              onClick={() => handleSelectRm(rm)}
                              style={{
                                padding: "8px 12px",
                                borderBottom: "1px solid var(--sd-zinc-100)",
                                cursor: "pointer",
                                fontSize: "0.8rem",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                background: selectedRm?.id === rm.id ? "#F4F4F5" : "transparent",
                                transition: "background 0.1s ease"
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = "#F4F4F5"}
                              onMouseLeave={(e) => {
                                if (selectedRm?.id !== rm.id) e.currentTarget.style.background = "transparent";
                              }}
                            >
                              <div>
                                <span style={{ fontWeight: 700, color: "var(--sd-black)" }}>{rm.name}</span>
                                {rm.tamilName && (
                                  <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", marginLeft: "6px" }}>
                                    ({rm.tamilName})
                                  </span>
                                )}
                              </div>
                              <span style={{ fontSize: "0.68rem", color: "var(--sd-zinc-400)", fontWeight: 600 }}>
                                {rm.hsn ? `HSN ${rm.hsn}` : (rm.category || "Raw Material")}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Grams Input */}
                  <div style={{ width: "130px" }}>
                    <label style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-700)", display: "block", marginBottom: "4px" }}>
                      Grams <span style={{ color: "var(--sd-red)" }}>*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={selectedRmGrams}
                      onChange={(e) => setSelectedRmGrams(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.84rem",
                        textAlign: "right",
                        fontWeight: 700
                      }}
                    />
                  </div>

                  {/* Add Spice Button */}
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    style={{
                      background: "var(--sd-black)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "9px 16px",
                      fontSize: "0.82rem",
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "5px"
                    }}
                  >
                    <Plus size={15} />
                    <span>Add to Recipe</span>
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
                    No raw materials added yet. Search and select spices above to build the recipe formulation.
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
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)" }}>Raw Material Spice</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "130px" }}>Weight in Grams</th>
                          <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "90px" }}>Ratio %</th>
                          <th style={{ padding: "8px 10px", textAlign: "center", width: "40px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.ingredients.map((ing, idx) => {
                          const rm = rawMaterialsMap.get(ing.rawMaterialId) || rawMaterialsMap.get(ing.rawMaterialName?.toLowerCase());
                          const ratioPct = formTotalGrams > 0 ? ((ing.grams / formTotalGrams) * 100).toFixed(1) : "0.0";

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

                              <td style={{ padding: "8px 10px", textAlign: "right" }}>
                                <div style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={ing.grams}
                                    onChange={(e) => handleUpdateIngredientGrams(idx, e.target.value)}
                                    style={{
                                      width: "75px",
                                      padding: "4px 6px",
                                      borderRadius: "6px",
                                      border: "1px solid var(--sd-zinc-300)",
                                      fontSize: "0.78rem",
                                      textAlign: "right",
                                      fontWeight: 700
                                    }}
                                  />
                                  <span style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", fontWeight: 700 }}>g</span>
                                </div>
                              </td>

                              <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, color: "var(--sd-zinc-800)" }}>
                                {ratioPct}%
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
                          <td style={{ padding: "8px 10px", color: "var(--sd-black)" }}>
                            Total Recipe Weight
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--sd-black)", fontSize: "0.86rem" }}>
                            {formTotalGrams}g
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", color: "var(--sd-black)" }}>
                            100%
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>

              {/* Formulation Description / Notes */}
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "0.74rem", fontWeight: 800, color: "var(--sd-black)", display: "block", marginBottom: "4px" }}>
                  Recipe Formulation Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Customised spice ratio for 40g pouch packing."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  {editingMixer ? "Update Recipe" : "Save Recipe Formulation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RECIPE READY / PRODUCTION BATCH SCALER & DOWNLOAD/PRINT SLIP     */}
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
                    Recipe Ready &bull; Batch Scaler
                  </h2>
                  <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.7)" }}>
                    {scalerMixer.name} {scalerMixer.tamilName ? `(${scalerMixer.tamilName})` : ""} &bull; {scalerPackWeight}g Pack Size
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Download PDF Button */}
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  style={{
                    background: "#DC2626",
                    border: "none",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    padding: "6px 14px",
                    fontSize: "0.76rem",
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                  title="Generate & download printable PDF file"
                >
                  {isGeneratingPdf ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
                  <span>{isGeneratingPdf ? "Generating..." : "Download PDF"}</span>
                </button>

                {/* Print Slip Button */}
                <button
                  type="button"
                  onClick={handlePrintSlip}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    fontSize: "0.76rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                  title="Direct print grinding batch slip"
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

            {/* Modal Body / Printable Slip */}
            <div style={{ overflowY: "auto", padding: "20px", flex: 1 }}>
              {/* Pack Count Selector Controls (No-Print) */}
              <div className="no-print" style={{
                background: "var(--sd-zinc-50)",
                padding: "14px",
                borderRadius: "14px",
                border: "1px solid var(--sd-zinc-200)",
                marginBottom: "18px"
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-black)", textTransform: "uppercase" }}>
                    Select Required Production Quantity ({scalerPackWeight}g Packs)
                  </label>
                  <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>
                    Scales {scalerPackWeight}g recipe ingredients automatically
                  </span>
                </div>

                {/* Quick Presets for Packs */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                  {[25, 50, 100, 250, 500, 1000].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => setNumPacks(cnt)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        fontSize: "0.8rem",
                        fontWeight: numPacks === cnt ? 900 : 700,
                        background: numPacks === cnt ? "var(--sd-black)" : "#FFFFFF",
                        color: numPacks === cnt ? "#FFFFFF" : "var(--sd-zinc-700)",
                        border: numPacks === cnt ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                        cursor: "pointer"
                      }}
                    >
                      {cnt} Packs
                    </button>
                  ))}

                  {/* Custom Number of Packs Input */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-600)" }}>Custom Packs:</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={numPacks}
                      onChange={(e) => setNumPacks(Math.max(1, Number(e.target.value) || 1))}
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
                    <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Packs</span>
                  </div>
                </div>

                {/* Calculated Batch Metrics Banner */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1.2fr",
                  gap: "10px",
                  marginTop: "12px",
                  padding: "10px 12px",
                  background: "#FFFFFF",
                  borderRadius: "10px",
                  border: "1px solid var(--sd-zinc-200)"
                }}>
                  <div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Recipe Pack Size</span>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--sd-black)" }}>
                      {scalerPackWeight} Grams
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Total Quantity</span>
                    <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--sd-black)" }}>
                      {numPacks} Packs
                    </div>
                  </div>

                  <div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--sd-zinc-500)", textTransform: "uppercase" }}>Total Batch Weight Required</span>
                    <div style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--sd-red)" }}>
                      {totalBatchKg >= 1 ? `${totalBatchKg.toFixed(3)} KG` : `${totalBatchGrams}g`} ({totalBatchGrams.toLocaleString("en-IN")}g)
                    </div>
                  </div>
                </div>
              </div>

              {/* Printable Slip Container */}
              <div id="recipe-batch-slip-area" style={{ background: "#FFFFFF", padding: "10px" }}>
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
                      {BUSINESS_INFO?.name || "SPICES DABBA"} &bull; FACTORY RECIPE BATCH SLIP
                    </h3>
                    <div style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", fontWeight: 700, marginTop: "2px" }}>
                      Product: <strong>{scalerMixer.name}</strong> {scalerMixer.tamilName ? `(${scalerMixer.tamilName})` : ""}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", marginTop: "2px" }}>
                      Customised Recipe Pack: <strong>{scalerPackWeight}g</strong> &bull; Production Target: <strong>{numPacks} Packs</strong>
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
                      padding: "4px 10px",
                      borderRadius: "6px",
                      marginTop: "4px",
                      display: "inline-block"
                    }}>
                      TOTAL: {totalBatchKg >= 1 ? `${totalBatchKg.toFixed(3)} KG` : `${totalBatchGrams}g`}
                    </div>
                  </div>
                </div>

                {/* Scaled Ingredients Table (No Checked Column, No Prices) */}
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", marginBottom: "16px" }}>
                  <thead>
                    <tr style={{ background: "var(--sd-zinc-100)", borderBottom: "2px solid var(--sd-zinc-300)", textAlign: "left" }}>
                      <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", width: "35px" }}>#</th>
                      <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)" }}>Raw Material Spice</th>
                      <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "140px" }}>
                        Recipe Ratio ({scalerPackWeight}g)
                      </th>
                      <th style={{ padding: "8px 10px", fontWeight: 800, color: "var(--sd-zinc-700)", textAlign: "right", width: "180px" }}>
                        Batch Weight Required ({numPacks} Packs)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(scalerMixer.ingredients || []).map((ing, idx) => {
                      const rm = rawMaterialsMap.get(ing.rawMaterialId) || rawMaterialsMap.get(ing.rawMaterialName?.toLowerCase());
                      
                      // Scaled weight for the total number of packs
                      const spicePerPackGrams = Number(ing.grams) || 0;
                      const spiceScaledGrams = Number((spicePerPackGrams * numPacks).toFixed(2));
                      const spiceScaledKg = spiceScaledGrams / 1000;

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
                            {spicePerPackGrams}g ({ing.percentage || (((spicePerPackGrams / scalerPackWeight) * 100).toFixed(1))}%)
                          </td>
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 900, color: "var(--sd-black)", fontSize: "0.9rem" }}>
                            {spiceScaledKg >= 1 
                              ? `${spiceScaledKg.toFixed(3)} KG (${spiceScaledGrams.toLocaleString("en-IN")}g)` 
                              : `${spiceScaledGrams.toLocaleString("en-IN")}g`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: "var(--sd-zinc-100)", fontWeight: 900, borderTop: "2px solid var(--sd-zinc-400)" }}>
                      <td colSpan={2} style={{ padding: "10px", color: "var(--sd-black)" }}>
                        TOTAL BATCH OUTPUT ({numPacks} PACKS &bull; {scalerPackWeight}g EACH)
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", color: "var(--sd-zinc-700)" }}>
                        {scalerPackWeight}g (100%)
                      </td>
                      <td style={{ padding: "10px", textAlign: "right", color: "var(--sd-black)", fontSize: "1rem" }}>
                        {totalBatchKg >= 1 ? `${totalBatchKg.toFixed(3)} KG` : `${totalBatchGrams}g`} ({totalBatchGrams.toLocaleString("en-IN")}g)
                      </td>
                    </tr>
                  </tfoot>
                </table>

                {/* Mill Operator Signatures Footer Only */}
                <div style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  paddingTop: "24px",
                  marginTop: "16px"
                }}>
                  <div style={{ textAlign: "center", fontSize: "0.74rem", color: "var(--sd-zinc-600)" }}>
                    <div style={{ borderTop: "1.5px solid var(--sd-zinc-600)", width: "200px", paddingTop: "5px", fontWeight: 700 }}>
                      Factory / Mill Incharge Signature
                    </div>
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
