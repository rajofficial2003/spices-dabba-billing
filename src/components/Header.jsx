import React from "react";
import { usePOS } from "../context/POSContext";
import { 
  ShoppingCart, 
  FileText, 
  Store, 
  Package, 
  Layers,
  BarChart3, 
  Plus, 
  Clock,
  Boxes,
  Receipt,
  FlaskConical
} from "lucide-react";

export default function Header({ activeTab, setActiveTab }) {
  const { 
    BUSINESS_INFO, 
    orders, 
    activeDraftId, 
    selectedCustomer,
    clearCart,
    cartItems
  } = usePOS();

  const draftCount = orders.filter(o => o.status === "draft").length;
  const totalCartQty = (cartItems || []).reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <>
      <header className="brand-header">
        {/* On-Field Draft Banner if active */}
        {activeDraftId && (
          <div style={{
            background: "#09090b",
            color: "#FFFFFF",
            padding: "7px 16px",
            fontSize: "0.8rem",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #27272a"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <Clock size={14} color="#FEF2F2" style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                Draft: <strong>{selectedCustomer?.shopName || "Retailer"}</strong>
              </span>
            </div>
            <button
              onClick={() => {
                clearCart();
                setActiveTab("pos");
              }}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#FFFFFF",
                padding: "3px 10px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "0.72rem",
                fontWeight: 700,
                flexShrink: 0,
                marginLeft: "8px"
              }}
            >
              Fresh Bill
            </button>
          </div>
        )}

        {/* Main Header Bar */}
        <div style={{
          maxWidth: "1440px",
          margin: "0 auto",
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px"
        }}>
          {/* Logo & Brand Name */}
          <div 
            onClick={() => setActiveTab("stats")}
            style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
            title="Spices Dabba Overview"
          >
            <img 
              src={BUSINESS_INFO.logoPath} 
              alt="Spices Dabba" 
              onError={(e) => { 
                e.target.style.display = 'none'; 
              }}
              style={{ height: "40px", width: "auto", objectFit: "contain" }}
            />
            <span className="font-heading" style={{
              fontSize: "1.25rem",
              fontWeight: 900,
              color: "var(--sd-black)",
              letterSpacing: "-0.3px"
            }}>
              Spices Dabba
            </span>
          </div>

          {/* Desktop Navigation Tabs (Hidden on mobile) */}
          <nav className="desktop-nav">
            <button
              onClick={() => setActiveTab("stats")}
              className={`nav-tab-btn ${activeTab === "stats" ? "active" : ""}`}
            >
              <BarChart3 size={15} />
              <span>Overview</span>
            </button>

            <button
              onClick={() => setActiveTab("pos")}
              className={`nav-tab-btn ${activeTab === "pos" ? "active" : ""}`}
            >
              <ShoppingCart size={15} />
              <span>Spot Billing</span>
              {totalCartQty > 0 && (
                <span style={{
                  background: activeTab === "pos" ? "rgba(255,255,255,0.25)" : "var(--sd-black)",
                  color: "#FFFFFF",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "99px",
                  marginLeft: "2px"
                }}>
                  {totalCartQty}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`nav-tab-btn ${activeTab === "orders" ? "active" : ""}`}
            >
              <FileText size={15} />
              <span>Orders</span>
              {draftCount > 0 && (
                <span style={{
                  background: activeTab === "orders" ? "rgba(255,255,255,0.25)" : "var(--sd-black)",
                  color: "#FFFFFF",
                  fontSize: "0.68rem",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "99px",
                  marginLeft: "2px"
                }}>
                  {draftCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("finance")}
              className={`nav-tab-btn ${activeTab === "finance" ? "active" : ""}`}
            >
              <Receipt size={15} />
              <span>Purchase & Expenses</span>
            </button>

            <button
              onClick={() => setActiveTab("mixers")}
              className={`nav-tab-btn ${activeTab === "mixers" ? "active" : ""}`}
            >
              <FlaskConical size={15} />
              <span>Mixers</span>
            </button>

            <button
              onClick={() => setActiveTab("assets")}
              className={`nav-tab-btn ${activeTab === "assets" || activeTab === "products" || activeTab === "categories" || activeTab === "customers" ? "active" : ""}`}
            >
              <Boxes size={15} />
              <span>Master Assets</span>
            </button>
          </nav>

          {/* Quick Mobile Cart / Status Button (Visible only on mobile header) */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }} className="mobile-only-header-actions">
            {totalCartQty > 0 && activeTab !== "pos" && (
              <button
                type="button"
                onClick={() => setActiveTab("pos")}
                style={{
                  background: "var(--sd-black)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "10px",
                  padding: "6px 12px",
                  fontSize: "0.75rem",
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "pointer"
                }}
              >
                <ShoppingCart size={14} />
                <span>Bill ({totalCartQty})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible on mobile <= 768px) */}
      <nav className="mobile-bottom-nav no-print">
        <button
          type="button"
          onClick={() => setActiveTab("stats")}
          className={`mobile-nav-btn ${activeTab === "stats" ? "active" : ""}`}
        >
          <BarChart3 size={18} />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("pos")}
          className={`mobile-nav-btn ${activeTab === "pos" ? "active" : ""}`}
        >
          <ShoppingCart size={18} />
          <span>Billing</span>
          {totalCartQty > 0 && (
            <span className="mobile-nav-badge">{totalCartQty}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("orders")}
          className={`mobile-nav-btn ${activeTab === "orders" ? "active" : ""}`}
        >
          <FileText size={18} />
          <span>Orders</span>
          {draftCount > 0 && (
            <span className="mobile-nav-badge">{draftCount}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("finance")}
          className={`mobile-nav-btn ${activeTab === "finance" ? "active" : ""}`}
        >
          <Receipt size={18} />
          <span>Finance</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("mixers")}
          className={`mobile-nav-btn ${activeTab === "mixers" ? "active" : ""}`}
        >
          <FlaskConical size={18} />
          <span>Mixers</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("assets")}
          className={`mobile-nav-btn ${activeTab === "assets" || activeTab === "products" || activeTab === "categories" || activeTab === "customers" ? "active" : ""}`}
        >
          <Boxes size={18} />
          <span>Assets</span>
        </button>
      </nav>
    </>
  );
}
