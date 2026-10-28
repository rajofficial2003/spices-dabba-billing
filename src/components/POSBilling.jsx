import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  UserPlus, 
  Store, 
  Phone, 
  MapPin, 
  Save, 
  Receipt, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ShoppingBag,
  Tag,
  Gift,
  Package,
  ArrowRight,
  ArrowLeft
} from "lucide-react";
import { formatCurrency } from "../utils/formatters";

export default function POSBilling({ onOpenInvoice, onBillGenerated }) {
  const {
    products,
    categories,
    customers,
    selectedCustomer,
    setSelectedCustomer,
    pricingTier,
    setPricingTier,
    getTierRate,
    cartItems,
    addToCart,
    addSampleToCart,
    toggleCartItemSample,
    updateCartItemQuantity,
    updateCartItemPrice,
    removeFromCart,
    clearCart,
    subtotal,
    discount,
    setDiscount,
    discountType,
    setDiscountType,
    discountAmount,
    taxPercent,
    setTaxPercent,
    taxAmount,
    grandTotal,
    totalItemsCount,
    paymentMode,
    setPaymentMode,
    paymentStatus,
    setPaymentStatus,
    notes,
    setNotes,
    activeDraftId,
    saveAsDraft,
    finalizeBill,
    addCustomer
  } = usePOS();

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubcategory, setSelectedSubcategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [mobileTab, setMobileTab] = useState("catalog"); // "catalog" | "cart"

  const [newCustomerForm, setNewCustomerForm] = useState({
    shopName: "",
    phone: "",
    customerName: "",
    category: "",
    subcategory: "",
    address: "",
    notes: ""
  });
  const [customerFormError, setCustomerFormError] = useState("");

  const activeCategoryObj = categories.find(c => c.id === selectedCategory);
  const availableSubcategories = activeCategoryObj && activeCategoryObj.subcategories?.length > 0
    ? activeCategoryObj.subcategories
    : selectedCategory === "all"
    ? Array.from(new Set(products.map(p => p.subcategory).filter(Boolean)))
    : [];

  const filteredProducts = products.filter(product => {
    // Only show active products in spot billing
    if (product.isActive === false) return false;
    // Hide product if its parent category is inactive
    const prodCat = categories.find(c => c.id === product.category);
    if (prodCat && prodCat.isActive === false) return false;

    const matchesCat = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSubcat = selectedSubcategory === "all" || product.subcategory === selectedSubcategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (product.name && product.name.toLowerCase().includes(q)) || 
      (product.tamilName && product.tamilName.includes(q)) ||
      (product.hsnCode && product.hsnCode.toLowerCase().includes(q)) ||
      (product.unit && product.unit.toLowerCase().includes(q));

    return matchesCat && matchesSubcat && matchesSearch;
  });

  const filteredCustomers = customers.filter(c => {
    // Only show active customers for new spot billing
    if (c.isActive === false) return false;

    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (c.shopName && c.shopName.toLowerCase().includes(q)) || 
           (c.businessName && c.businessName.toLowerCase().includes(q)) ||
           (c.phone && c.phone.includes(q)) || 
           (c.customerName && c.customerName.toLowerCase().includes(q));
  });

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setCustomerFormError("");

    if (!newCustomerForm.customerName.trim()) {
      setCustomerFormError("Shopkeeper / Contact Person is mandatory!");
      return;
    }
    if (!newCustomerForm.phone.trim()) {
      setCustomerFormError("Phone Number is mandatory!");
      return;
    }

    try {
      const businessName = newCustomerForm.shopName.trim();
      const customerName = newCustomerForm.customerName.trim();
      const catObj = categories.find(c => c.id === newCustomerForm.category);
      const categoryName = catObj ? catObj.name : (newCustomerForm.category || "");
      const created = await addCustomer({
        businessName,
        shopName: businessName || customerName,
        phone: newCustomerForm.phone.trim(),
        customerName,
        category: newCustomerForm.category || "",
        categoryName,
        subcategory: newCustomerForm.subcategory || "",
        address: newCustomerForm.address.trim(),
        notes: newCustomerForm.notes?.trim() || ""
      });

      setSelectedCustomer(created);
      setShowAddCustomerModal(false);
      setNewCustomerForm({ shopName: "", phone: "", customerName: "", category: "", subcategory: "", address: "", notes: "" });
      showNotification("Customer added successfully!", "success");
    } catch (err) {
      setCustomerFormError(err.message || "Failed to add customer");
    }
  };

  const showNotification = (msg, type = "success") => {
    setFeedbackMsg({ msg, type });
    setTimeout(() => setFeedbackMsg(null), 3500);
  };

  const handleSaveDraft = async () => {
    setIsProcessing(true);
    try {
      const draft = await saveAsDraft();
      showNotification(`Draft ${draft.invoiceNumber} saved! You can resume it anytime on-field.`, "success");
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateBill = async () => {
    setIsProcessing(true);
    try {
      const bill = await finalizeBill();
      showNotification(`Invoice ${bill.invoiceNumber} generated!`, "success");
      if (onBillGenerated) {
        onBillGenerated(bill);
      } else if (onOpenInvoice) {
        onOpenInvoice(bill);
      }
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="responsive-page-container">
      {/* Toast Notification */}
      {feedbackMsg && (
        <div style={{
          position: "fixed",
          top: "70px",
          right: "24px",
          zIndex: 99,
          background: feedbackMsg.type === "error" ? "var(--sd-red)" : "var(--sd-black)",
          color: "var(--sd-white)",
          padding: "10px 18px",
          borderRadius: "10px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontWeight: 700,
          fontSize: "0.85rem"
        }}>
          {feedbackMsg.type === "error" ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{feedbackMsg.msg}</span>
        </div>
      )}

      {/* Mobile / Tablet Segmented View Toggle */}
      <div className="pos-mobile-view-toggle no-print">
        <button
          type="button"
          onClick={() => setMobileTab("catalog")}
          className={`pos-mobile-toggle-btn ${mobileTab === "catalog" ? "active" : ""}`}
        >
          <Package size={15} />
          <span>Spice Catalog ({filteredProducts.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("cart")}
          className={`pos-mobile-toggle-btn ${mobileTab === "cart" ? "active" : ""}`}
        >
          <ShoppingBag size={15} />
          <span>
            BILL ({totalItemsCount} • ₹{grandTotal})
          </span>
        </button>
      </div>

      {/* Main Grid: Products Catalog Left, Order Cart Right */}
      <div className="pos-billing-layout">

        {/* LEFT COLUMN: Catalog */}
        <div className={`pos-catalog-column ${mobileTab !== "catalog" ? "mobile-hidden" : ""}`}>
          {/* Search, Categories & Subcategories */}
          <div style={{ marginBottom: "16px" }}>
            <div style={{ position: "relative", marginBottom: "10px" }}>
              <Search 
                size={16} 
                style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} 
              />
              <input
                type="text"
                placeholder="Search masalas by Name, Tamil Name, HSN Code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-input"
                style={{ paddingLeft: "38px" }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--sd-zinc-400)"
                  }}
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Categories */}
            <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "4px" }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedSubcategory("all");
                }}
                className={`category-pill ${selectedCategory === "all" ? "active" : ""}`}
              >
                All Spices
              </button>
              {categories.filter(c => c.id !== "all" && c.isActive !== false).map(cat => (
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

            {/* Subcategories (if present) */}
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

          {/* Product Cards Grid / Clean Empty State */}
          {filteredProducts.length === 0 ? (
            <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)", marginBottom: "20px" }}>
              <Package size={40} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 8px" }} />
              <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--sd-black)" }}>No spice products found</h3>
              <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "4px" }}>
                {products.length === 0 
                  ? "Your catalog is empty. Add products in the Spices section to begin wholesale spot billing."
                  : "No products match the selected category or search query."}
              </p>
            </div>
          ) : (
          <div className="responsive-product-grid">
            {filteredProducts.map(product => {
              const hasVariants = product.variants && product.variants.length > 0;
              const activeVariantIdx = selectedVariants[product.id] ?? 0;
              const currentVariant = hasVariants ? (product.variants[activeVariantIdx] || product.variants[0]) : null;

              const sizeSlug = currentVariant ? String(currentVariant.size).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
              const expectedRegularId = currentVariant ? `${product.id}__${sizeSlug}` : product.id;
              const expectedSampleId = currentVariant ? `${product.id}__${sizeSlug}__sample` : `${product.id}__sample`;

              const inCart = cartItems.find(item => item.id === expectedRegularId && !item.isSample);
              const inSampleCart = cartItems.find(item => item.id === expectedSampleId && item.isSample);

              const activeTierRate = getTierRate(currentVariant || product, pricingTier);
              const wholesaleRate = activeTierRate;
              const tierName = pricingTier === 'SS' ? 'SS Rate' : pricingTier === 'D' ? 'Dealer Rate' : pricingTier === 'C' ? 'Customer Rate' : 'Retailer Rate';
              const mrpRate = currentVariant
                ? (Number(currentVariant.mrp) || Number(currentVariant.price) || 0)
                : (Number(product.mrp) || Number(product.defaultPrice) || 0);
              const currentUnit = currentVariant ? currentVariant.size : (product.unit || "Pack");

              return (
                <div
                  key={product.id}
                  className="bw-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    border: inCart ? "2px solid var(--sd-black)" : "1px solid var(--sd-zinc-200)",
                    position: "relative"
                  }}
                >
                  {/* Image Container with Badges (Square Aspect Ratio for maximum visibility) */}
                  <div style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    background: "var(--sd-zinc-50)",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "14px",
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

                    {/* Unit / Pack badge */}
                    <span style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      background: "var(--sd-white)",
                      border: "1px solid var(--sd-zinc-200)",
                      color: "var(--sd-zinc-800)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                      fontSize: "0.7rem",
                      fontWeight: 700
                    }}>
                      {currentUnit}
                    </span>

                    {/* HSN Code & GST Pills */}
                    <span style={{
                      position: "absolute",
                      bottom: "6px",
                      left: "8px",
                      background: "var(--sd-white)",
                      border: "1px solid var(--sd-zinc-200)",
                      color: "var(--sd-zinc-600)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      fontFamily: "monospace"
                    }}>
                      HSN: {product.hsnCode || "0910 91 00"}
                    </span>
                    <span style={{
                      position: "absolute",
                      bottom: "6px",
                      right: "8px",
                      background: "var(--sd-red-subtle)",
                      border: "1px solid var(--sd-red-border)",
                      color: "var(--sd-red)",
                      padding: "1px 6px",
                      borderRadius: "4px",
                      fontSize: "0.68rem",
                      fontWeight: 800
                    }}>
                      GST: {product.gstPercent ?? 5}%
                    </span>
                  </div>

                  {/* Body Content */}
                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1 }}>
                    <h3 className="font-heading" style={{
                      fontSize: "0.95rem",
                      fontWeight: 800,
                      lineHeight: "1.25",
                      marginBottom: "2px",
                      color: "var(--sd-black)"
                    }}>
                      {product.name}
                    </h3>
                    {product.tamilName && (
                      <div className="font-tamil" style={{
                        fontSize: "0.78rem",
                        color: "var(--sd-zinc-600)",
                        marginBottom: "4px"
                      }}>
                        {product.tamilName}
                      </div>
                    )}
                    {product.subcategory && (
                      <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)", marginBottom: "4px" }}>
                        {typeof product.subcategory === "string" ? product.subcategory : (product.subcategory?.name || "")}
                      </div>
                    )}

                    {/* Weight / Gram Variants Selector (Spices Dabba Style) */}
                    {hasVariants && product.variants.length > 1 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", margin: "4px 0 8px 0" }}>
                        {product.variants.map((v, vIdx) => {
                          const isSelected = activeVariantIdx === vIdx;
                          return (
                            <button
                              key={vIdx}
                              type="button"
                              onClick={() => setSelectedVariants(prev => ({ ...prev, [product.id]: vIdx }))}
                              style={{
                                padding: "2px 7px",
                                borderRadius: "6px",
                                fontSize: "0.7rem",
                                fontWeight: 800,
                                cursor: "pointer",
                                background: isSelected ? "var(--sd-black)" : "var(--sd-zinc-100)",
                                color: isSelected ? "var(--sd-white)" : "var(--sd-zinc-800)",
                                border: isSelected ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                                transition: "all 0.15s ease"
                              }}
                            >
                              {v.size}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Pricing */}
                    <div style={{ marginTop: "auto", paddingTop: "8px", borderTop: "1px solid var(--sd-zinc-100)" }}>
                      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                        <div>
                          <span style={{ fontSize: "0.68rem", textTransform: "uppercase", fontWeight: 700, color: "var(--sd-zinc-500)" }}>
                            MRP:
                          </span>
                          <div style={{ fontSize: "1.15rem", fontWeight: 900, color: "var(--sd-black)" }}>
                            ₹{mrpRate}
                          </div>
                        </div>
                        {wholesaleRate > 0 && (
                          <div style={{ textAlign: "right" }}>
                            <span style={{ fontSize: "0.68rem", color: "var(--sd-zinc-500)", fontWeight: 600 }}>{tierName}:</span>
                            <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--sd-zinc-700)" }}>
                              ₹{wholesaleRate}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Button: Add or Qty Modifier */}
                      <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {/* Regular Wholesale Billing Button / Stepper */}
                        {inCart ? (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "var(--sd-zinc-100)",
                            borderRadius: "10px",
                            padding: "3px 6px"
                          }}>
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(inCart.id, inCart.quantity - 1)}
                              style={{
                                background: "var(--sd-white)",
                                border: "1px solid var(--sd-zinc-200)",
                                borderRadius: "6px",
                                width: "26px",
                                height: "26px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "var(--sd-black)"
                              }}
                            >
                              <Minus size={13} />
                            </button>
                            <span style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--sd-black)" }}>
                              {inCart.quantity} in Bill
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(inCart.id, inCart.quantity + 1)}
                              style={{
                                background: "var(--sd-black)",
                                border: "none",
                                borderRadius: "6px",
                                width: "26px",
                                height: "26px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "var(--sd-white)"
                              }}
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addToCart(product, 1, false, currentVariant)}
                            className="btn-primary"
                            style={{ width: "100%", padding: "7px 10px", fontSize: "0.82rem" }}
                          >
                            <Plus size={15} />
                            <span>Add to Bill</span>
                          </button>
                        )}

                        {/* Free Sample (₹0) Action */}
                        {inSampleCart ? (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            background: "var(--sd-red-subtle)",
                            border: "1px solid var(--sd-red-border)",
                            borderRadius: "8px",
                            padding: "2px 6px"
                          }}>
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(inSampleCart.id, inSampleCart.quantity - 1)}
                              style={{
                                background: "var(--sd-white)",
                                border: "1px solid var(--sd-red-border)",
                                borderRadius: "5px",
                                width: "22px",
                                height: "22px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "var(--sd-red)"
                              }}
                            >
                              <Minus size={11} />
                            </button>
                            <span style={{ fontWeight: 800, fontSize: "0.74rem", color: "var(--sd-red)", display: "flex", alignItems: "center", gap: "3px" }}>
                              <Gift size={11} /> {inSampleCart.quantity} Sample (₹0)
                            </span>
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(inSampleCart.id, inSampleCart.quantity + 1)}
                              style={{
                                background: "var(--sd-red)",
                                border: "none",
                                borderRadius: "5px",
                                width: "22px",
                                height: "22px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                color: "var(--sd-white)"
                              }}
                            >
                              <Plus size={11} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => addSampleToCart(product, 1, currentVariant)}
                            style={{
                              width: "100%",
                              padding: "4px 8px",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              background: "var(--sd-white)",
                              color: "var(--sd-red)",
                              border: "1px dashed var(--sd-red)",
                              borderRadius: "8px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "5px"
                            }}
                            title="Give as free trade sample (₹0 in bill, deducted from stock)"
                          >
                            <Gift size={12} />
                            <span>+ Sample (₹0)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* RIGHT COLUMN: Spot Billing Cart Pad */}
        <div className={`pos-cart-column ${mobileTab !== "cart" ? "mobile-hidden" : ""}`}>
          {/* Retailer Shop Selection Banner (Above Wholesale Bill) */}
          <div className="bw-card" style={{ padding: "14px 16px", marginBottom: "12px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Store size={17} color="var(--sd-red)" />
                <span className="font-heading" style={{ fontWeight: 800, fontSize: "0.92rem", color: "var(--sd-black)" }}>
                  Retailer Shop Selection <span className="input-required">*</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(true)}
                className="btn-secondary"
                style={{ padding: "4px 10px", fontSize: "0.76rem" }}
              >
                <UserPlus size={13} />
                <span>New Retailer</span>
              </button>
            </div>

            {selectedCustomer ? (
              <div style={{
                background: "var(--sd-zinc-50)",
                borderRadius: "10px",
                padding: "10px 12px",
                border: "1px solid var(--sd-zinc-200)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "8px"
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    <span className="font-heading" style={{ fontWeight: 800, fontSize: "1rem", color: "var(--sd-black)" }}>
                      {selectedCustomer.shopName}
                    </span>
                    {selectedCustomer.customerName && (
                      <span style={{ fontSize: "0.78rem", color: "var(--sd-zinc-500)" }}>
                        ({selectedCustomer.customerName})
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "3px", fontSize: "0.76rem", color: "var(--sd-zinc-600)" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Phone size={12} color="var(--sd-red)" />
                      <strong>{selectedCustomer.phone}</strong>
                    </span>
                    {(selectedCustomer.categoryName || selectedCustomer.category) && (
                      <span style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        background: "var(--sd-zinc-100)",
                        padding: "1px 6px",
                        borderRadius: "4px",
                        fontWeight: 700,
                        color: "var(--sd-zinc-800)"
                      }}>
                        <Tag size={11} color="var(--sd-red)" />
                        {selectedCustomer.categoryName || selectedCustomer.category}
                        {selectedCustomer.subcategory && (
                          <span style={{ color: "var(--sd-zinc-500)", fontWeight: 500 }}>• {selectedCustomer.subcategory}</span>
                        )}
                      </span>
                    )}
                    {selectedCustomer.address && (
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <MapPin size={12} />
                        {selectedCustomer.address}
                      </span>
                    )}
                    {Number(selectedCustomer.outstandingBalance) > 0 && (
                      <span style={{
                        background: "var(--sd-red-subtle)",
                        color: "var(--sd-red)",
                        border: "1px solid var(--sd-red-border)",
                        padding: "1px 6px",
                        borderRadius: "99px",
                        fontWeight: 700,
                        fontSize: "0.7rem"
                      }}>
                        Khata: {formatCurrency(selectedCustomer.outstandingBalance)}
                      </span>
                    )}
                  </div>

                  {/* Category-based Billing Pricing Tier Selector */}
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    flexWrap: "wrap",
                    marginTop: "8px",
                    paddingTop: "8px",
                    borderTop: "1px dashed var(--sd-zinc-200)"
                  }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)" }}>
                      Billing Rate:
                    </span>
                    {[
                      { key: "SS", label: "Super Stockist (SS)" },
                      { key: "D", label: "Dealer Rate (D)" },
                      { key: "R", label: "Retailer Rate (R)" },
                      { key: "C", label: "Customer Rate (C)" }
                    ].map(t => {
                      const isActive = pricingTier === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          onClick={() => setPricingTier(t.key)}
                          style={{
                            padding: "2px 7px",
                            borderRadius: "6px",
                            fontSize: "0.7rem",
                            fontWeight: 800,
                            cursor: "pointer",
                            background: isActive ? "var(--sd-black)" : "var(--sd-white)",
                            color: isActive ? "var(--sd-white)" : "var(--sd-zinc-700)",
                            border: isActive ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                            transition: "all 0.15s ease"
                          }}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomer(null)}
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "0.74rem", flexShrink: 0 }}
                >
                  Change
                </button>
              </div>
            ) : (
              <div>
                <select
                  value=""
                  onChange={(e) => {
                    const cust = customers.find(c => c.id === e.target.value);
                    if (cust) setSelectedCustomer(cust);
                  }}
                  className="custom-select"
                  style={{ padding: "9px 36px 9px 12px", fontSize: "0.85rem", fontWeight: 600 }}
                >
                  <option value="" disabled>-- Select Customer (Search / Choose) --</option>
                  {filteredCustomers.map(cust => (
                    <option key={cust.id} value={cust.id}>
                      {cust.categoryName || cust.category ? `[${cust.categoryName || cust.category}] ` : ''}{cust.businessName || cust.shopName} - 📞 {cust.phone} {cust.customerName ? `(${cust.customerName})` : ''} {cust.isActive === false ? ' [Inactive]' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="bw-card pos-bill-sticky" style={{
            overflow: "hidden"
          }}>
            {/* Mobile Return to Catalog Button */}
            <div className="no-desktop" style={{ padding: "12px 14px 0" }}>
              <button
                type="button"
                onClick={() => setMobileTab("catalog")}
                className="btn-secondary"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <ArrowLeft size={15} />
                <span>Add More Spices to Bill</span>
              </button>
            </div>

            {/* Header */}
            <div style={{
              background: "var(--sd-white)",
              color: "var(--sd-black)",
              padding: "14px 18px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <ShoppingBag size={18} color="var(--sd-black)" />
                  <h2 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "var(--sd-black)" }}>
                    {activeDraftId ? "Draft Order (On-Field)" : "BILL"}
                  </h2>
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", marginTop: "1px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{totalItemsCount} packs • {cartItems.length} items</span>
                  {cartItems.length > 1 && (
                    <span style={{ fontSize: "0.68rem", color: "var(--sd-red)", fontWeight: 700, background: "var(--sd-red-subtle)", padding: "1px 5px", borderRadius: "3px" }}>
                      Scroll for more ↓
                    </span>
                  )}
                </div>
              </div>

              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  title="Clear all"
                  style={{
                    background: "var(--sd-zinc-100)",
                    border: "1px solid var(--sd-zinc-200)",
                    color: "var(--sd-zinc-700)",
                    borderRadius: "6px",
                    padding: "4px 9px",
                    cursor: "pointer",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  <Trash2 size={12} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {/* Cart Items List - Compact Single Product Main View with Internal Scroll */}
            <div style={{ maxHeight: "115px", overflowY: "auto", padding: "8px 10px", background: "var(--sd-white)" }}>
              {cartItems.length === 0 ? (
                <div style={{
                  padding: "16px 12px",
                  textAlign: "center",
                  color: "var(--sd-zinc-500)"
                }}>
                  <ShoppingBag size={26} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 6px" }} />
                  <p style={{ fontWeight: 700, fontSize: "0.85rem", margin: 0 }}>No items in bill</p>
                  <p style={{ fontSize: "0.74rem", marginTop: "2px", color: "var(--sd-zinc-400)", margin: 0 }}>
                    Select masalas from catalog to start billing.
                  </p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {cartItems.map((item, index) => {
                    const itemRate = Number(item.wholesalePrice) || 0;
                    const itemTotal = Math.round(itemRate * item.quantity * 100) / 100;

                    return (
                      <div
                        key={item.id}
                        style={{
                          background: "var(--sd-zinc-50)",
                          borderRadius: "10px",
                          padding: "8px 10px",
                          border: "1px solid var(--sd-zinc-200)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--sd-black)" }}>
                                {index + 1}. {item.name}
                              </span>
                              {item.isSample && (
                                <span style={{
                                  fontSize: "0.66rem",
                                  fontWeight: 800,
                                  background: "var(--sd-red)",
                                  color: "var(--sd-white)",
                                  padding: "1px 6px",
                                  borderRadius: "4px",
                                  letterSpacing: "0.4px"
                                }}>
                                  SAMPLE (₹0)
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: "0.72rem", color: "var(--sd-zinc-500)" }}>
                              ({item.unit})
                            </span>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px", flexWrap: "wrap" }}>
                              {item.tamilName && (
                                <span className="font-tamil" style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>
                                  {item.tamilName}
                                </span>
                              )}
                              <span style={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                background: "var(--sd-zinc-200)",
                                color: "var(--sd-zinc-800)",
                                padding: "1px 5px",
                                borderRadius: "3px",
                                fontFamily: "monospace"
                              }}>
                                HSN: {item.hsnCode || "0910 91 00"}
                              </span>
                              <span style={{
                                fontSize: "0.68rem",
                                fontWeight: 800,
                                background: "var(--sd-red-subtle)",
                                color: "var(--sd-red)",
                                border: "1px solid var(--sd-red-border)",
                                padding: "1px 6px",
                                borderRadius: "3px"
                              }}>
                                GST: {item.isSample ? "0%" : `${item.gstPercent !== undefined ? item.gstPercent : 5}%`}
                              </span>
                            </div>
                          </div>
                          
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {/* Toggle between Regular & Sample */}
                            <button
                              type="button"
                              onClick={() => toggleCartItemSample(item.id)}
                              style={{
                                background: item.isSample ? "var(--sd-zinc-100)" : "var(--sd-red-subtle)",
                                border: "1px solid " + (item.isSample ? "var(--sd-zinc-300)" : "var(--sd-red-border)"),
                                color: item.isSample ? "var(--sd-black)" : "var(--sd-red)",
                                borderRadius: "6px",
                                padding: "2px 6px",
                                fontSize: "0.68rem",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                              title={item.isSample ? "Revert to standard wholesale price" : "Convert to free trade sample (₹0)"}
                            >
                              {item.isSample ? "To Billed" : "To Sample (₹0)"}
                            </button>

                            <button
                              type="button"
                              onClick={() => removeFromCart(item.id)}
                              title="Remove"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--sd-red)",
                                padding: "2px"
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Modifiers */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginTop: "6px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                              style={{
                                width: "26px",
                                height: "26px",
                                background: "var(--sd-white)",
                                border: "1px solid var(--sd-zinc-300)",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <Minus size={13} />
                            </button>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateCartItemQuantity(item.id, parseInt(e.target.value) || 1)}
                              style={{
                                width: "44px",
                                textAlign: "center",
                                fontWeight: 800,
                                border: "1px solid var(--sd-zinc-300)",
                                borderRadius: "6px",
                                padding: "3px 0",
                                fontSize: "0.92rem",
                                color: "var(--sd-black)"
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                              style={{
                                width: "26px",
                                height: "26px",
                                background: item.isSample ? "var(--sd-red)" : "var(--sd-black)",
                                color: "var(--sd-white)",
                                border: "none",
                                borderRadius: "6px",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                              }}
                            >
                              <Plus size={13} />
                            </button>
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {item.isSample ? (
                              <span style={{
                                fontSize: "0.82rem",
                                fontWeight: 800,
                                color: "var(--sd-red)",
                                background: "var(--sd-red-subtle)",
                                padding: "3px 8px",
                                borderRadius: "6px"
                              }}>
                                ₹0 (Sample)
                              </span>
                            ) : (
                              <>
                                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--sd-zinc-600)" }}>@ ₹</span>
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={item.wholesalePrice}
                                  onChange={(e) => updateCartItemPrice(item.id, e.target.value)}
                                  title="Wholesale unit rate"
                                  style={{
                                    width: "66px",
                                    padding: "4px 6px",
                                    fontSize: "0.92rem",
                                    fontWeight: 700,
                                    border: "1px solid var(--sd-zinc-300)",
                                    borderRadius: "6px",
                                    textAlign: "right",
                                    color: "var(--sd-black)"
                                  }}
                                />
                              </>
                            )}
                          </div>

                          <div style={{
                            fontWeight: 900,
                            fontSize: "1rem",
                            color: item.isSample ? "var(--sd-red)" : "var(--sd-black)",
                            minWidth: "60px",
                            textAlign: "right"
                          }}>
                            {item.isSample ? "₹0.00" : `₹${itemTotal.toFixed(2)}`}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Calculations & Totals */}
            <div style={{
              background: "var(--sd-zinc-50)",
              padding: "14px 16px",
              borderTop: "1px solid var(--sd-zinc-200)"
            }}>
              {/* Subtotal */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.92rem", marginBottom: "8px" }}>
                <span style={{ color: "var(--sd-zinc-600)", fontWeight: 600 }}>Subtotal:</span>
                <span style={{ fontWeight: 800, fontSize: "0.95rem" }}>₹{subtotal}</span>
              </div>

              {/* Discount */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.92rem", color: "var(--sd-zinc-600)", fontWeight: 600 }}>Discount:</span>
                  <div style={{ display: "inline-flex", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--sd-zinc-300)" }}>
                    <button
                      type="button"
                      onClick={() => setDiscountType("fixed")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.82rem",
                        background: discountType === "fixed" ? "var(--sd-black)" : "var(--sd-white)",
                        color: discountType === "fixed" ? "var(--sd-white)" : "var(--sd-black)",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 800
                      }}
                    >
                      ₹
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("percent")}
                      style={{
                        padding: "3px 8px",
                        fontSize: "0.82rem",
                        background: discountType === "percent" ? "var(--sd-black)" : "var(--sd-white)",
                        color: discountType === "percent" ? "var(--sd-white)" : "var(--sd-black)",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 800
                      }}
                    >
                      %
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="number"
                    min="0"
                    value={discount || ""}
                    placeholder="0"
                    onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                    style={{
                      width: "65px",
                      padding: "4px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      textAlign: "right"
                    }}
                  />
                  {discountAmount > 0 && (
                    <span style={{ fontSize: "0.85rem", color: "var(--sd-red)", fontWeight: 800 }}>
                      (-₹{discountAmount})
                    </span>
                  )}
                </div>
              </div>

              {/* Total GST Amount */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "0.88rem", color: "var(--sd-zinc-600)", fontWeight: 600 }}>Total GST:</span>
                <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--sd-black)" }}>
                  +₹{Number(taxAmount || 0).toFixed(2)}
                </span>
              </div>

              {/* Grand Total - High Contrast Charcoal Black Card with Bold White Text */}
              <div style={{
                background: "var(--sd-black)",
                color: "var(--sd-white)",
                borderRadius: "12px",
                padding: "10px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                margin: "8px 0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)"
              }}>
                <div>
                  <span style={{ fontSize: "0.78rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px", color: "var(--sd-zinc-300)" }}>
                    TOTAL PAYABLE
                  </span>
                  <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-400)", marginTop: "1px" }}>
                    Standard A4 Tax Invoice
                  </div>
                </div>
                <div className="font-heading" style={{ fontSize: "1.55rem", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.5px" }}>
                  {formatCurrency(grandTotal)}
                </div>
              </div>

              {/* Payment Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", margin: "6px 0 8px 0" }}>
                <div>
                  <label className="input-label" style={{ marginBottom: "3px", fontSize: "0.82rem", fontWeight: 800 }}>
                    Payment Mode
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="custom-select"
                    style={{ padding: "7px 28px 7px 8px", fontSize: "0.82rem", fontWeight: 700 }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay</option>
                    <option value="Credit / Khata">Credit / Khata</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="input-label" style={{ marginBottom: "3px", fontSize: "0.82rem", fontWeight: 800 }}>
                    Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="custom-select"
                    style={{ padding: "7px 28px 7px 8px", fontSize: "0.82rem", fontWeight: 700 }}
                  >
                    <option value="paid">Paid</option>
                    <option value="pending">Pending / Due</option>
                  </select>
                </div>
              </div>

              {/* Field Notes */}
              <input
                type="text"
                placeholder="Field note (optional)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-input"
                style={{ padding: "7px 10px", fontSize: "0.85rem", marginBottom: "8px" }}
              />

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  disabled={cartItems.length === 0 || isProcessing}
                  onClick={handleSaveDraft}
                  className="btn-secondary"
                  title="Save draft"
                  style={{ flex: 1, padding: "10px", fontSize: "0.88rem", fontWeight: 700 }}
                >
                  <Save size={15} />
                  <span>{activeDraftId ? "Update Draft" : "Save Draft"}</span>
                </button>

                <button
                  type="button"
                  disabled={cartItems.length === 0 || !selectedCustomer || isProcessing}
                  onClick={handleGenerateBill}
                  className="btn-accent"
                  title="Submit order & finalize invoice"
                  style={{ flex: 1.3, padding: "10px 14px", fontSize: "0.92rem", fontWeight: 800 }}
                >
                  <Receipt size={17} />
                  <span>Submit Order</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Bottom Cart Bar for On-Field Mobile/Tablet Spot Billing */}
      {cartItems.length > 0 && mobileTab === "catalog" && (
        <div 
          className="mobile-floating-cart-bar no-print"
          onClick={() => setMobileTab("cart")}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              background: "var(--sd-red)",
              color: "#FFFFFF",
              borderRadius: "8px",
              padding: "4px 8px",
              fontSize: "0.76rem",
              fontWeight: 800
            }}>
              {totalItemsCount}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>₹{grandTotal}</div>
              <div style={{ fontSize: "0.72rem", opacity: 0.85 }}>
                {selectedCustomer?.shopName || "Tap to review bill"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", fontWeight: 800, fontSize: "0.82rem" }}>
            <span>Review Bill & Pay</span>
            <ArrowRight size={15} />
          </div>
        </div>
      )}

      {/* QUICK ADD CUSTOMER MODAL - only closes on Cancel / Close button click */}
      {showAddCustomerModal && (
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
                <Store size={18} color="var(--sd-red)" />
                <h3 className="font-heading" style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Register Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                style={{ background: "none", border: "none", color: "var(--sd-zinc-500)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} style={{ padding: "18px" }}>
              {customerFormError && (
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
                  {customerFormError}
                </div>
              )}

              <div style={{ marginBottom: "10px" }}>
                <label className="input-label">
                  Shopkeeper / Contact Person <span className="input-required">* (Mandatory)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. R. Murugesan"
                  value={newCustomerForm.customerName}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, customerName: e.target.value })}
                  className="text-input"
                  required
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label className="input-label">
                  Phone Number <span className="input-required">* (Mandatory)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9842145678"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                  className="text-input"
                  required
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label className="input-label">
                  Business Name <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sri Murugan Maligai Store"
                  value={newCustomerForm.shopName}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, shopName: e.target.value })}
                  className="text-input"
                />
              </div>

              {/* Category & Subcategory */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label className="input-label">
                    Category <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  <select
                    value={newCustomerForm.category}
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      setNewCustomerForm({
                        ...newCustomerForm,
                        category: newCatId,
                        subcategory: ""
                      });
                    }}
                    className="custom-select"
                  >
                    <option value="">-- Select Category --</option>
                    {categories.filter(c => c.id !== "all").map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.tamilName ? `(${cat.tamilName})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="input-label">
                    Subcategory <span style={{ color: "var(--sd-zinc-400)", fontWeight: 400 }}>(Optional)</span>
                  </label>
                  {(() => {
                    const selCat = categories.find(c => c.id === newCustomerForm.category);
                    const subcats = selCat?.subcategories || [];
                    return (
                      <select
                        value={newCustomerForm.subcategory}
                        onChange={(e) => setNewCustomerForm({ ...newCustomerForm, subcategory: e.target.value })}
                        className="custom-select"
                        disabled={!newCustomerForm.category || subcats.length === 0}
                        style={{
                          opacity: (!newCustomerForm.category || subcats.length === 0) ? 0.6 : 1,
                          cursor: (!newCustomerForm.category || subcats.length === 0) ? "not-allowed" : "pointer"
                        }}
                      >
                        <option value="">
                          {!newCustomerForm.category 
                            ? "-- Select Category First --" 
                            : (subcats.length > 0 ? "-- Select Subcategory --" : "-- No Subcategories --")}
                        </option>
                        {subcats.map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    );
                  })()}
                </div>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label className="input-label">Shop Address / Area</label>
                <textarea
                  rows="2"
                  placeholder="e.g. 12, Bazaar Street, Bodinayakanur"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, address: e.target.value })}
                  className="text-input"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-accent"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
