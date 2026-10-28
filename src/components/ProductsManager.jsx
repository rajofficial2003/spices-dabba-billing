import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertCircle, 
  X,
  XCircle,
  Tag,
  PackagePlus
} from "lucide-react";
import { formatCurrency } from "../utils/formatters";
import { compressImage, uploadProductImage, formatBytes } from "../utils/imageCompressor";

export default function ProductsManager() {
  const {
    products,
    categories,
    addProduct,
    updateProduct,
    restockProduct,
    deleteProduct,
    showConfirmModal
  } = usePOS();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [toastMsg, setToastMsg] = useState(null);
  const [selectedVariantMap, setSelectedVariantMap] = useState({});

  // Quick Restock State
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [restockTarget, setRestockTarget] = useState(null);
  const [incomingQty, setIncomingQty] = useState(50);
  const [batchNote, setBatchNote] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    tamilName: "",
    category: "",
    subcategory: "",
    hsnCode: "0910 91 00",
    gstPercent: 5,
    unit: "50 g",
    superStockistPrice: "",
    dealerPrice: "",
    retailerPrice: "",
    customerPrice: "",
    mrp: "",
    stock: "",
    minStock: 10,
    description: "",
    image: "",
    isActive: true,
    variants: [
      { size: "50 g", superStockistPrice: "", dealerPrice: "", retailerPrice: "", customerPrice: "", mrp: "", stock: 50 }
    ]
  });

  const [selectedFile, setSelectedFile] = useState(null);
  const [compressionStats, setCompressionStats] = useState(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const formCategoryObj = categories.find(c => c.id === formData.category);
  const formSubcategories = (formCategoryObj?.subcategories || []).map(s => typeof s === "string" ? s : s.name);

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);
  const availableSubcategories = activeCategoryObj && activeCategoryObj.subcategories?.length > 0
    ? activeCategoryObj.subcategories.map(s => typeof s === "string" ? s : s.name)
    : selectedCategory === "all"
    ? Array.from(new Set(products.map(p => p.subcategory).filter(Boolean)))
    : [];

  // When GST % is changed in the dropdown, recalculate MRP for all variant rows (price + GST% = MRP)
  const handleGstChange = (newGst) => {
    setFormData(prev => {
      const updatedVariants = prev.variants.map(v => {
        const base = Number(v.customerPrice) || Number(v.retailerPrice) || 0;
        if (base > 0) {
          const calcMrp = Math.round((base + (base * newGst) / 100) * 100) / 100;
          return { ...v, mrp: calcMrp };
        }
        return v;
      });
      const v0Mrp = updatedVariants[0]?.mrp ?? prev.mrp;
      return {
        ...prev,
        gstPercent: newGst,
        mrp: v0Mrp,
        variants: updatedVariants
      };
    });
  };

  const handleAddVariantRow = (presetSize = "100 g") => {
    setFormData(prev => {
      const v0 = prev.variants[0] || {};
      const mult = (val) => val ? Math.round(Number(val) * 1.8) : "";
      return {
        ...prev,
        variants: [
          ...prev.variants,
          {
            size: presetSize,
            superStockistPrice: mult(v0.superStockistPrice),
            dealerPrice: mult(v0.dealerPrice),
            retailerPrice: mult(v0.retailerPrice),
            customerPrice: mult(v0.customerPrice),
            mrp: mult(v0.mrp),
            stock: 100
          }
        ]
      };
    });
  };

  const handleUpdateVariantRow = (index, field, value) => {
    setFormData(prev => {
      const updated = [...prev.variants];
      const numFields = ["superStockistPrice", "dealerPrice", "retailerPrice", "customerPrice", "mrp", "stock"];
      const parsedValue = numFields.includes(field) ? (value === "" ? "" : Number(value)) : value;
      
      const currentRow = {
        ...updated[index],
        [field]: parsedValue
      };

      // Automatic GST included calculation:
      // When Customer Rate (C) (or Retailer Rate if C is empty) is typed, calculate: price + GST% = MRP
      if (field === "customerPrice" || (field === "retailerPrice" && !currentRow.customerPrice)) {
        const gstRate = Number(prev.gstPercent ?? 5);
        const base = Number(parsedValue) || 0;
        if (base > 0) {
          const autoMrp = Math.round((base + (base * gstRate) / 100) * 100) / 100;
          currentRow.mrp = autoMrp;
        }
      }

      updated[index] = currentRow;

      const isFirst = index === 0 && numFields.includes(field);
      return { 
        ...prev, 
        variants: updated,
        ...(isFirst ? { [field]: parsedValue, ...(currentRow.mrp ? { mrp: currentRow.mrp } : {}) } : {})
      };
    });
  };

  const handleRemoveVariantRow = (index) => {
    if (formData.variants.length <= 1) {
      alert("Product must have at least 1 weight / gram variant!");
      return;
    }
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index)
    }));
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    const defaultCat = categories.find(c => c.id !== "all") || categories[0];
    setFormData({
      name: "",
      tamilName: "",
      category: defaultCat?.id || "",
      subcategory: defaultCat?.subcategories?.[0] || "",
      hsnCode: "0910 91 00",
      gstPercent: 5,
      unit: "50 g",
      superStockistPrice: "",
      dealerPrice: "",
      retailerPrice: "",
      customerPrice: "",
      mrp: "",
      stock: 50,
      minStock: 10,
      description: "",
      image: "",
      isActive: true,
      variants: [
        { size: "50 g", superStockistPrice: "", dealerPrice: "", retailerPrice: "", customerPrice: "", mrp: "", stock: 50 }
      ]
    });
    setSelectedFile(null);
    setCompressionStats(null);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    const existingVariants = (product.variants && product.variants.length > 0)
      ? product.variants.map(v => ({
          size: v.size || v.name || "50 g",
          superStockistPrice: v.superStockistPrice ?? v.ssPrice ?? product.superStockistPrice ?? "",
          dealerPrice: v.dealerPrice ?? v.dPrice ?? product.dealerPrice ?? "",
          retailerPrice: v.retailerPrice ?? v.rPrice ?? v.wholesalePrice ?? product.wholesalePrice ?? "",
          customerPrice: v.customerPrice ?? v.cPrice ?? v.mrp ?? product.mrp ?? "",
          mrp: v.mrp ?? product.mrp ?? "",
          stock: v.stock ?? product.stock ?? 100
        }))
      : [
          {
            size: product.unit || "50 g",
            superStockistPrice: product.superStockistPrice ?? "",
            dealerPrice: product.dealerPrice ?? "",
            retailerPrice: product.retailerPrice ?? product.wholesalePrice ?? "",
            customerPrice: product.customerPrice ?? product.mrp ?? "",
            mrp: product.mrp ?? "",
            stock: product.stock ?? 100
          }
        ];

    setFormData({
      name: product.name || "",
      tamilName: product.tamilName || "",
      category: product.category || "ready-to-cook",
      subcategory: product.subcategory || "",
      hsnCode: product.hsnCode || "0910 91 00",
      gstPercent: product.gstPercent ?? 5,
      unit: existingVariants[0]?.size || product.unit || "50 g",
      superStockistPrice: existingVariants[0]?.superStockistPrice || "",
      dealerPrice: existingVariants[0]?.dealerPrice || "",
      retailerPrice: existingVariants[0]?.retailerPrice || "",
      customerPrice: existingVariants[0]?.customerPrice || "",
      mrp: existingVariants[0]?.mrp || product.mrp || "",
      stock: product.stock ?? 100,
      minStock: product.minStock ?? 15,
      description: product.description || "",
      image: product.image || "/images/products/pepper-powder.png",
      isActive: product.isActive !== false,
      variants: existingVariants
    });
    setSelectedFile(null);
    setCompressionStats(null);
    setErrorMsg("");
    setShowModal(true);
  };

  const handleOpenRestock = (product) => {
    setRestockTarget(product);
    setIncomingQty(50);
    setBatchNote("");
    setShowRestockModal(true);
  };

  const handleConfirmRestock = async (e) => {
    e.preventDefault();
    if (!restockTarget || !incomingQty || incomingQty <= 0) return;
    try {
      const newStock = await restockProduct(restockTarget.id, incomingQty, batchNote);
      setShowRestockModal(false);
      setToastMsg(`Successfully added +${incomingQty} packs to "${restockTarget.name}". Total available stock: ${newStock} packs.`);
      setTimeout(() => setToastMsg(null), 4000);
    } catch (err) {
      alert("Failed to restock: " + err.message);
    }
  };

  // Status change handler inside the form with confirmation pop up modal
  const handleFormStatusChange = async (newStatus) => {
    if (newStatus === formData.isActive) return;
    const targetText = newStatus ? "Active" : "Inactive";
    const displayName = formData.name || "this product";

    const ok = await showConfirmModal({
      title: newStatus ? "Mark Product Active" : "Mark Product Inactive",
      message: newStatus
        ? `Are you sure you want to activate "${displayName}"? This product will be available for spot billing.`
        : `Are you sure you want to mark "${displayName}" as Inactive? Inactive products will be hidden from spot billing.`,
      confirmText: `Yes, Mark ${targetText}`,
      cancelText: "Cancel",
      isDanger: !newStatus
    });

    if (ok) {
      setFormData(prev => ({ ...prev, isActive: newStatus }));
      if (editingProduct && editingProduct.id) {
        try {
          await updateProduct(editingProduct.id, { isActive: newStatus });
        } catch (err) {
          console.error("Failed to update product status:", err);
        }
      }
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      setErrorMsg("");

      const compressed = await compressImage(file, {
        maxWidth: 900,
        maxHeight: 900,
        quality: 0.85,
        outputFormat: "image/webp"
      });

      setSelectedFile(compressed.file);
      setCompressionStats({
        originalSize: formatBytes(compressed.originalSize),
        compressedSize: formatBytes(compressed.compressedSize),
        compressionRatio: compressed.compressionRatio,
        previewUrl: compressed.previewUrl
      });

    } catch (err) {
      console.error("Compression error:", err);
      setErrorMsg("Failed to compress image: " + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.name.trim()) {
      setErrorMsg("Product name is required!");
      return;
    }

    // Clean variants and extract primary variant rates
    const cleanVariants = (formData.variants && formData.variants.length > 0)
      ? formData.variants.map(v => ({
          size: String(v.size || "50 g").trim(),
          superStockistPrice: Number(v.superStockistPrice) || 0,
          dealerPrice: Number(v.dealerPrice) || 0,
          retailerPrice: Number(v.retailerPrice) || 0,
          customerPrice: Number(v.customerPrice) || 0,
          wholesalePrice: Number(v.retailerPrice) || Number(v.dealerPrice) || 0,
          mrp: Number(v.mrp) || Number(v.customerPrice) || 0,
          stock: Number(v.stock) || 0
        }))
      : [
          {
            size: formData.unit?.trim() || "50 g",
            superStockistPrice: Number(formData.superStockistPrice) || 0,
            dealerPrice: Number(formData.dealerPrice) || 0,
            retailerPrice: Number(formData.retailerPrice) || 0,
            customerPrice: Number(formData.customerPrice) || 0,
            wholesalePrice: Number(formData.retailerPrice) || Number(formData.dealerPrice) || 0,
            mrp: Number(formData.mrp) || Number(formData.customerPrice) || 0,
            stock: Number(formData.stock) || 0
          }
        ];

    const primaryVariant = cleanVariants[0];

    try {
      let finalImageUrl = formData.image;

      if (selectedFile) {
        setIsUploading(true);
        try {
          const uploadResult = await uploadProductImage(
            selectedFile,
            "products",
            (progress) => setUploadProgress(progress)
          );
          finalImageUrl = uploadResult.url;
        } catch (uploadErr) {
          console.error("Firebase Storage upload error:", uploadErr);
          setErrorMsg("Firebase Storage Upload Error: " + (uploadErr.message || "Upload failed"));
          setIsUploading(false);
          return;
        } finally {
          setIsUploading(false);
        }
      }

      const categoryObj = categories.find(c => c.id === formData.category);
      const totalStock = cleanVariants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0);

      const productPayload = {
        name: formData.name.trim(),
        tamilName: formData.tamilName.trim(),
        category: formData.category,
        categoryName: categoryObj?.name || formData.category,
        subcategory: formData.subcategory.trim(),
        hsnCode: formData.hsnCode.trim() || "0910 91 00",
        gstPercent: Number(formData.gstPercent) || 0,
        unit: primaryVariant.size,
        superStockistPrice: primaryVariant.superStockistPrice,
        dealerPrice: primaryVariant.dealerPrice,
        retailerPrice: primaryVariant.retailerPrice,
        customerPrice: primaryVariant.customerPrice,
        wholesalePrice: primaryVariant.retailerPrice || primaryVariant.wholesalePrice,
        mrp: primaryVariant.mrp,
        stock: totalStock,
        minStock: Number(formData.minStock) || 10,
        variants: cleanVariants,
        description: formData.description.trim(),
        image: finalImageUrl || "",
        isActive: formData.isActive !== false
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, productPayload);
      } else {
        await addProduct(productPayload);
      }

      // Close modal immediately on successful submission
      setShowModal(false);
      setEditingProduct(null);
      setSelectedFile(null);
      setCompressionStats(null);
      setErrorMsg("");
    } catch (err) {
      setErrorMsg(err.message || "Failed to save product");
    }
  };

  const filteredProducts = products.filter(product => {
    // Status filter
    const isAct = product.isActive !== false;
    if (statusFilter === "active" && !isAct) return false;
    if (statusFilter === "inactive" && isAct) return false;

    const matchesCat = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSubcat = selectedSubcategory === "all" || product.subcategory === selectedSubcategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      (product.name && product.name.toLowerCase().includes(q)) ||
      (product.tamilName && product.tamilName.includes(q)) ||
      (product.hsnCode && product.hsnCode.toLowerCase().includes(q)) ||
      (product.subcategory && product.subcategory.toLowerCase().includes(q)) ||
      (product.unit && product.unit.toLowerCase().includes(q));

    return matchesCat && matchesSubcat && matchesSearch;
  });

  const activeCount = products.filter(p => p.isActive !== false).length;
  const inactiveCount = products.filter(p => p.isActive === false).length;

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
            Products Catalog & Stock
          </h2>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "2px" }}>
            Categories, subcategories, GST HSN codes, wholesale pricing, and compressed product photos.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="btn-primary"
          style={{ padding: "8px 16px", fontSize: "0.82rem" }}
        >
          <Plus size={15} />
          <span>Add New Spice</span>
        </button>
      </div>

      {/* Search & Categories */}
      <div style={{ marginBottom: "18px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
          <div style={{ position: "relative", maxWidth: "420px", flex: 1, minWidth: "260px" }}>
            <Search size={16} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
            <input
              type="text"
              placeholder="Search masalas by Name, HSN Code..."
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
              All ({products.length})
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

        {/* Categories */}
        <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
          {categories.map(cat => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setSelectedSubcategory("all");
              }}
              className={`category-pill ${selectedCategory === cat.id ? "active" : ""}`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Subcategories */}
        {availableSubcategories.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            overflowX: "auto",
            marginTop: "8px",
            padding: "6px 10px",
            background: "var(--sd-white)",
            borderRadius: "10px",
            border: "1px solid var(--sd-zinc-200)"
          }}>
            <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--sd-zinc-500)", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
              <Tag size={12} /> Subcategory:
            </span>
            <button
              type="button"
              onClick={() => setSelectedSubcategory("all")}
              className={`subcategory-pill ${selectedSubcategory === "all" ? "active" : ""}`}
            >
              All
            </button>
            {availableSubcategories.map(subcat => (
              <button
                key={subcat}
                type="button"
                onClick={() => setSelectedSubcategory(subcat)}
                className={`subcategory-pill ${selectedSubcategory === subcat ? "active" : ""}`}
              >
                {subcat}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Products Grid / Clean Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)" }}>
          <Package size={44} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 10px" }} />
          <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--sd-black)" }}>No spices in database</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "4px", marginBottom: "16px" }}>
            {products.length === 0 
              ? "All static sample data removed. You are connected to pure Firebase Firestore & Storage. Click '+ Add New Spice' to create your first spice product."
              : "No spice products match your filter search."}
          </p>
          {products.length === 0 && (
            <button type="button" onClick={handleOpenAdd} className="btn-accent" style={{ display: "inline-flex", margin: "0 auto" }}>
              <Plus size={15} />
              <span>Add First Spice</span>
            </button>
          )}
        </div>
      ) : (
      <div className="responsive-product-grid">
        {filteredProducts.map(product => {
          const activeVariantIdx = selectedVariantMap[product.id] ?? 0;
          const hasVariants = product.variants && product.variants.length > 0;
          const currentVariant = hasVariants ? (product.variants[activeVariantIdx] || product.variants[0]) : null;

          const mrp = currentVariant 
            ? (Number(currentVariant.mrp) || Number(currentVariant.price) || 0)
            : (Number(product.mrp) || Number(product.defaultPrice) || 0);
          const ssPrice = currentVariant 
            ? (Number(currentVariant.superStockistPrice) || 0)
            : (Number(product.superStockistPrice) || 0);
          const dealerPrice = currentVariant 
            ? (Number(currentVariant.dealerPrice) || 0)
            : (Number(product.dealerPrice) || 0);
          const retailerPrice = currentVariant 
            ? (Number(currentVariant.retailerPrice) || Number(currentVariant.wholesalePrice) || 0)
            : (Number(product.retailerPrice) || Number(product.wholesalePrice) || 0);
          const customerPrice = currentVariant 
            ? (Number(currentVariant.customerPrice) || Number(currentVariant.mrp) || 0)
            : (Number(product.customerPrice) || Number(product.mrp) || 0);
          const currentUnit = currentVariant ? currentVariant.size : (product.unit || "Pack");
          const currentStock = currentVariant && currentVariant.stock !== undefined ? currentVariant.stock : (product.stock ?? 0);
          const isLowStock = currentStock <= (product.minStock || 15);
          const isAct = product.isActive !== false;

          return (
            <div
              key={product.id}
              className="bw-card"
              style={{
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                opacity: isAct ? 1 : 0.75
              }}
            >
              {/* Image & Badges (Square Aspect Ratio for maximum visibility) */}
              <div style={{
                width: "100%",
                aspectRatio: "1 / 1",
                background: "var(--sd-zinc-50)",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "16px",
                borderBottom: "1px solid var(--sd-zinc-200)"
              }}>
                <img
                  src={product.image || "/images/logo/logo.png"}
                  alt={product.name}
                  loading="eager"
                  decoding="async"
                  onError={(e) => { e.target.src = "/images/logo/logo.png"; }}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain"
                  }}
                />

                <span style={{
                  position: "absolute",
                  top: "8px",
                  left: "8px",
                  background: "var(--sd-red-subtle)",
                  border: "1px solid var(--sd-red-border)",
                  color: "var(--sd-red)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  fontWeight: 800
                }}>
                  {currentUnit}
                </span>

                {/* Static Status Badge */}
                <span style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "2px 7px",
                  borderRadius: "99px",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  background: isAct ? "#DCFCE7" : "var(--sd-zinc-100)",
                  color: isAct ? "#15803D" : "var(--sd-zinc-600)",
                  border: isAct ? "1px solid #86EFAC" : "1px solid var(--sd-zinc-300)",
                  zIndex: 2
                }}>
                  <span style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: isAct ? "#16A34A" : "var(--sd-zinc-400)"
                  }} />
                  {isAct ? "Active" : "Inactive"}
                </span>

                <span style={{
                  position: "absolute",
                  bottom: "6px",
                  left: "8px",
                  background: "var(--sd-black)",
                  color: "var(--sd-white)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  fontFamily: "monospace"
                }}>
                  HSN: {product.hsnCode || "0910 91 00"} • GST: {product.gstPercent ?? 5}%
                </span>

                <span style={{
                  position: "absolute",
                  bottom: "6px",
                  right: "8px",
                  background: isLowStock ? "var(--sd-red)" : "var(--sd-zinc-100)",
                  color: isLowStock ? "var(--sd-white)" : "var(--sd-zinc-700)",
                  border: isLowStock ? "none" : "1px solid var(--sd-zinc-200)",
                  padding: "1px 6px",
                  borderRadius: "4px",
                  fontSize: "0.7rem",
                  fontWeight: 700
                }}>
                  Stock: {currentStock}
                </span>
              </div>

              {/* Product Info */}
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1 }}>
                <h3 className="font-heading" style={{ fontSize: "1rem", fontWeight: 800, color: "var(--sd-black)", marginBottom: "2px" }}>
                  {product.name}
                </h3>
                {product.tamilName && (
                  <div className="font-tamil" style={{ fontSize: "0.8rem", color: "var(--sd-zinc-600)", marginBottom: "3px" }}>
                    {product.tamilName}
                  </div>
                )}
                {product.subcategory && (
                  <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", marginBottom: "4px" }}>
                    {product.subcategory}
                  </div>
                )}

                {/* Weight / Gram Variants Selector (Spices Dabba Style) */}
                {hasVariants && product.variants.length > 1 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "6px 0 8px 0" }}>
                    {product.variants.map((v, vIdx) => {
                      const isSelected = activeVariantIdx === vIdx;
                      return (
                        <button
                          key={vIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedVariantMap(prev => ({ ...prev, [product.id]: vIdx }));
                          }}
                          style={{
                            padding: "2px 7px",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            background: isSelected ? "var(--sd-black)" : "var(--sd-zinc-100)",
                            color: isSelected ? "var(--sd-white)" : "var(--sd-zinc-700)",
                            border: isSelected ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-200)",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {v.size}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Price block */}
                <div style={{
                  marginTop: "auto",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--sd-zinc-100)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div>
                      <span style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--sd-zinc-500)" }}>
                        MRP Price:
                      </span>
                      <span style={{ fontSize: "0.65rem", color: "var(--sd-zinc-400)", marginLeft: "4px" }}>
                        (Incl. {product.gstPercent ?? 5}% GST)
                      </span>
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--sd-black)" }}>
                      ₹{mrp}
                    </div>
                  </div>

                  {/* 4-Tier Rates Grid */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "4px",
                    background: "var(--sd-zinc-50)",
                    padding: "6px 8px",
                    borderRadius: "6px",
                    border: "1px solid var(--sd-zinc-200)",
                    fontSize: "0.72rem"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--sd-zinc-500)", fontWeight: 600 }}>SS:</span>
                      <strong style={{ color: "var(--sd-zinc-800)" }}>₹{ssPrice}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--sd-zinc-500)", fontWeight: 600 }}>Dealer (D):</span>
                      <strong style={{ color: "var(--sd-zinc-800)" }}>₹{dealerPrice}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--sd-zinc-500)", fontWeight: 600 }}>Retailer (R):</span>
                      <strong style={{ color: "var(--sd-zinc-800)" }}>₹{retailerPrice}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ color: "var(--sd-zinc-500)", fontWeight: 600 }}>Cust (C):</span>
                      <strong style={{ color: "var(--sd-zinc-800)" }}>₹{customerPrice}</strong>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{
                  marginTop: "10px",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--sd-zinc-200)",
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  {/* + Add Stock / Restock Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenRestock(product)}
                    className="btn-primary"
                    style={{ padding: "4px 9px", fontSize: "0.76rem" }}
                    title="Add new incoming production stock"
                  >
                    <PackagePlus size={13} />
                    <span>+ Stock</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(product)}
                    className="btn-secondary"
                    style={{ padding: "4px 9px", fontSize: "0.76rem" }}
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await showConfirmModal({
                        title: "Delete Product",
                        message: `Are you sure you want to delete "${product.name}"? This product will be permanently removed from your catalog and billing inventory.`,
                        confirmText: "Delete Product",
                        isDanger: true
                      });
                      if (ok) {
                        deleteProduct(product.id);
                      }
                    }}
                    style={{
                      background: "none",
                      border: "1px solid var(--sd-zinc-200)",
                      color: "var(--sd-red)",
                      borderRadius: "10px",
                      padding: "4px 8px",
                      cursor: "pointer"
                    }}
                    title="Delete product"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Modal - only closes on Cancel / Close button click */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "560px" }}>
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
                <Package size={18} color="var(--sd-red)" />
                <h3 className="font-heading" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                  {editingProduct ? "Edit Spice Product" : "Add New Spice Product"}
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

            <form onSubmit={handleSubmit} style={{ padding: "18px", overflowY: "auto", maxHeight: "80vh" }}>
              {errorMsg && (
                <div style={{
                  background: "var(--sd-red-subtle)",
                  color: "var(--sd-red)",
                  border: "1px solid var(--sd-red-border)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  marginBottom: "12px",
                  fontWeight: 600
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Names */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label className="input-label">
                    Name (English) <span className="input-required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Dindigul Biryani Masala"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="text-input"
                    required
                  />
                </div>

                <div>
                  <label className="input-label">Tamil Name</label>
                  <input
                    type="text"
                    placeholder="e.g. திண்டுக்கல் பிரியாணி மசாலா"
                    value={formData.tamilName}
                    onChange={(e) => setFormData({ ...formData, tamilName: e.target.value })}
                    className="text-input font-tamil"
                  />
                </div>
              </div>

              {/* Category & Subcategory */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label className="input-label">
                    Main Category <span className="input-required">*</span>
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      const catObj = categories.find(c => c.id === newCat);
                      setFormData({ 
                        ...formData, 
                        category: newCat,
                        subcategory: catObj?.subcategories?.[0] || ""
                      });
                    }}
                    className="custom-select"
                  >
                    {categories.filter(c => c.id !== "all").map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">Subcategory</label>
                  {formSubcategories.length > 0 ? (
                    <select
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="custom-select"
                    >
                      {formSubcategories.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="e.g. Biryani Pastes"
                      value={formData.subcategory}
                      onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                      className="text-input"
                    />
                  )}
                </div>
              </div>

              {/* HSN Code, GST Rate (%) & Low Stock Alert */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.2fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label className="input-label">
                    GST HSN Code <span className="input-required">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 0910 91 00"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="text-input"
                    style={{ fontFamily: "monospace", fontWeight: 700 }}
                    required
                  />
                </div>

                <div>
                  <label className="input-label">
                    GST Rate (%) <span className="input-required">*</span>
                  </label>
                  <select
                    value={formData.gstPercent ?? 5}
                    onChange={(e) => handleGstChange(Number(e.target.value))}
                    className="custom-select"
                    style={{ fontWeight: 700 }}
                  >
                    <option value={0}>0% (No GST / Exempt)</option>
                    <option value={5}>5% GST (Standard)</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div>
                  <label className="input-label">Low Stock Alert (Packs)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="text-input"
                  />
                </div>
              </div>

              {/* DYNAMIC WEIGHT / GRAM VARIANTS & PRICES SECTION */}
              <div style={{
                background: "var(--sd-zinc-50)",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "12px",
                padding: "12px 14px",
                marginBottom: "14px"
              }}>
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px"
                }}>
                  <div>
                    <label className="input-label" style={{ margin: 0, fontWeight: 800, color: "var(--sd-black)" }}>
                      Weight / Gram Variants &amp; Prices <span className="input-required">*</span>
                    </label>
                    <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>
                      Define individual pack sizes, wholesale rates, MRPs, and stock
                    </span>
                  </div>

                  {/* 1-Click Quick Add Presets */}
                  <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "4px" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--sd-zinc-400)" }}>+ Quick:</span>
                    {["50 g", "100 g", "250 g", "500 g", "1 kg"].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => handleAddVariantRow(size)}
                        style={{
                          background: "var(--sd-white)",
                          border: "1px solid var(--sd-zinc-300)",
                          borderRadius: "6px",
                          padding: "2px 7px",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "var(--sd-zinc-800)",
                          cursor: "pointer"
                        }}
                      >
                        +{size}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleAddVariantRow("Custom")}
                      style={{
                        background: "var(--sd-black)",
                        border: "1px solid var(--sd-black)",
                        borderRadius: "6px",
                        padding: "2px 8px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        color: "var(--sd-white)",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "3px"
                      }}
                    >
                      <Plus size={11} /> Add Variant
                    </button>
                  </div>
                </div>

                {/* Variants List Table with mobile horizontal scroll */}
                <div style={{ overflowX: "auto", paddingBottom: "4px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: "820px" }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1.2fr 0.9fr 36px",
                      gap: "6px",
                      padding: "0 4px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "var(--sd-zinc-500)",
                      textTransform: "uppercase"
                    }}>
                      <span>Weight / Size</span>
                      <span>SS Rate (₹)</span>
                      <span>Dealer (D) (₹)</span>
                      <span>Retailer (R) (₹)</span>
                      <span>Customer (C) (₹)</span>
                      <span>MRP (₹) (+{formData.gstPercent ?? 5}% GST)</span>
                      <span>Stock</span>
                      <span></span>
                    </div>

                    {formData.variants.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 1.2fr 0.9fr 36px",
                          gap: "6px",
                          alignItems: "center",
                          background: "var(--sd-white)",
                          border: "1px solid var(--sd-zinc-200)",
                          borderRadius: "8px",
                          padding: "6px 8px"
                        }}
                      >
                        <input
                          type="text"
                          placeholder="e.g. 50 g"
                          value={v.size}
                          onChange={(e) => handleUpdateVariantRow(idx, "size", e.target.value)}
                          className="text-input"
                          style={{ padding: "6px 8px", fontSize: "0.8rem", fontWeight: 700 }}
                          required
                        />

                        {/* Super Stockist (SS) */}
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", color: "var(--sd-zinc-400)", fontWeight: 700 }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="SS"
                            value={v.superStockistPrice}
                            onChange={(e) => handleUpdateVariantRow(idx, "superStockistPrice", e.target.value)}
                            className="text-input"
                            style={{ padding: "6px 6px 6px 18px", fontSize: "0.8rem", fontWeight: 700 }}
                          />
                        </div>

                        {/* Dealer Rate (D) */}
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", color: "var(--sd-zinc-400)", fontWeight: 700 }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Dealer"
                            value={v.dealerPrice}
                            onChange={(e) => handleUpdateVariantRow(idx, "dealerPrice", e.target.value)}
                            className="text-input"
                            style={{ padding: "6px 6px 6px 18px", fontSize: "0.8rem", fontWeight: 700 }}
                          />
                        </div>

                        {/* Retailer Rate (R) */}
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", color: "var(--sd-zinc-400)", fontWeight: 700 }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Retailer"
                            value={v.retailerPrice}
                            onChange={(e) => handleUpdateVariantRow(idx, "retailerPrice", e.target.value)}
                            className="text-input"
                            style={{ padding: "6px 6px 6px 18px", fontSize: "0.8rem", fontWeight: 800 }}
                          />
                        </div>

                        {/* Customer Rate (C) */}
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", color: "var(--sd-zinc-400)", fontWeight: 700 }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Customer"
                            value={v.customerPrice}
                            onChange={(e) => handleUpdateVariantRow(idx, "customerPrice", e.target.value)}
                            className="text-input"
                            style={{ padding: "6px 6px 6px 18px", fontSize: "0.8rem", fontWeight: 700 }}
                          />
                        </div>

                        {/* MRP (₹) */}
                        <div style={{ position: "relative" }}>
                          <span style={{ position: "absolute", left: "6px", top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", color: "var(--sd-zinc-400)", fontWeight: 700 }}>₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="MRP"
                            value={v.mrp}
                            onChange={(e) => handleUpdateVariantRow(idx, "mrp", e.target.value)}
                            className="text-input"
                            style={{ padding: "6px 6px 6px 18px", fontSize: "0.8rem", fontWeight: 800 }}
                          />
                        </div>

                        {/* Stock */}
                        <input
                          type="number"
                          min="0"
                          placeholder="Stock"
                          value={v.stock}
                          onChange={(e) => handleUpdateVariantRow(idx, "stock", e.target.value)}
                          className="text-input"
                          style={{ padding: "6px 6px", fontSize: "0.8rem" }}
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveVariantRow(idx)}
                          disabled={formData.variants.length <= 1}
                          title={formData.variants.length <= 1 ? "At least 1 variant required" : "Remove variant"}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: formData.variants.length <= 1 ? "var(--sd-zinc-300)" : "var(--sd-red)",
                            cursor: formData.variants.length <= 1 ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "4px"
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "8px",
                  paddingTop: "6px",
                  fontSize: "0.75rem",
                  color: "var(--sd-zinc-600)"
                }}>
                  <span>Total Variants: <strong>{formData.variants.length}</strong></span>
                  <span>
                    Total Combined Stock: <strong>{formData.variants.reduce((sum, v) => sum + (Number(v.stock) || 0), 0)} Packs</strong>
                  </span>
                </div>
              </div>

              {/* Image Upload with Canvas WebP Compression */}
              <div style={{
                background: "var(--sd-zinc-50)",
                borderRadius: "10px",
                padding: "12px",
                border: "1px dashed var(--sd-zinc-300)",
                marginBottom: "12px"
              }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <div style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "8px",
                    background: "var(--sd-white)",
                    border: "1px solid var(--sd-zinc-200)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    flexShrink: 0
                  }}>
                    <img
                      src={compressionStats?.previewUrl || formData.image}
                      alt="Preview"
                      style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }}
                      onError={(e) => { e.target.src = "/images/products/pepper-powder.png"; }}
                    />
                  </div>

                  <div style={{ flex: 1 }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      style={{ fontSize: "0.8rem", width: "100%" }}
                    />
                    <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", marginTop: "2px" }}>
                      Upload product photo (auto-compressed to lightweight WebP).
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Status Selection (Active / Inactive) with Confirmation Pop-up */}
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
                    Product Status
                  </label>
                  <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>
                    {formData.isActive ? "🟢 Active (Available for Spot Billing)" : "⚪ Inactive (Hidden from Spot Billing)"}
                  </div>
                </div>

                <div style={{ display: "inline-flex", background: "var(--sd-zinc-200)", padding: "3px", borderRadius: "10px", gap: "3px" }}>
                  <button
                    type="button"
                    id="prod-form-btn-active"
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
                    id="prod-form-btn-inactive"
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

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-accent"
                  disabled={isUploading || isCompressing}
                >
                  {isUploading ? "Uploading..." : editingProduct ? "Update Product" : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RESTOCK / ADD NEW INCOMING STOCK MODAL */}
      {showRestockModal && restockTarget && (
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
                <PackagePlus size={20} color="var(--sd-black)" />
                <div>
                  <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
                    Add Incoming Stock (சரக்கு வரவு)
                  </h3>
                  <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", marginTop: "2px" }}>
                    {restockTarget.name} ({restockTarget.unit})
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestockModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--sd-zinc-400)" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmRestock} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Product Info Card */}
              <div style={{
                background: "var(--sd-zinc-50)",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "10px",
                padding: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", textTransform: "uppercase", fontWeight: 700 }}>
                    Current Stock in Hand:
                  </span>
                  <div className="font-heading" style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--sd-black)", marginTop: "2px" }}>
                    {restockTarget.stock || 0} <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--sd-zinc-500)" }}>{restockTarget.unit}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right", fontSize: "0.76rem", color: "var(--sd-zinc-500)" }}>
                  HSN: <strong>{restockTarget.hsnCode}</strong>
                </div>
              </div>

              {/* Incoming Quantity */}
              <div>
                <label className="input-label">
                  New Incoming Quantity (+ புதிய வரவு) <span className="input-required">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 50, 100, 250"
                  value={incomingQty}
                  onChange={(e) => setIncomingQty(Math.max(1, parseInt(e.target.value) || 0))}
                  required
                  autoFocus
                  className="text-input"
                  style={{ fontSize: "1.1rem", fontWeight: 800 }}
                />
              </div>

              {/* Batch / Note */}
              <div>
                <label className="input-label">Batch / Lot / Mfg Note (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Batch #OCT-22B, Production Date 22/10/2026"
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value)}
                  className="text-input"
                />
              </div>

              {/* Calculation Preview Box */}
              <div style={{
                background: "var(--sd-black)",
                color: "var(--sd-white)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-400)", textTransform: "uppercase", fontWeight: 700 }}>
                    Calculation Preview
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--sd-zinc-300)", marginTop: "2px" }}>
                    {restockTarget.stock || 0} + {incomingQty || 0}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-400)", textTransform: "uppercase", fontWeight: 700 }}>
                    New Total Stock
                  </div>
                  <div className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 900, color: "#FFFFFF" }}>
                    {(Number(restockTarget.stock) || 0) + (Number(incomingQty) || 0)} {restockTarget.unit}
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "6px" }}>
                <button
                  type="button"
                  onClick={() => setShowRestockModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-accent"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          background: "var(--sd-black)",
          color: "var(--sd-white)",
          padding: "10px 18px",
          borderRadius: "10px",
          fontSize: "0.85rem",
          fontWeight: 700,
          zIndex: 99,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}>
          <CheckCircle2 size={16} color="var(--sd-red)" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  );
}
