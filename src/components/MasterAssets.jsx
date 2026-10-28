import React from "react";
import { Package, Layers, Store, Boxes } from "lucide-react";
import ProductsManager from "./ProductsManager";
import CategoriesManager from "./CategoriesManager";
import CustomersManager from "./CustomersManager";
import { usePOS } from "../context/POSContext";

export default function MasterAssets({ 
  activeSubTab = "products", 
  onSubTabChange, 
  onStartBillForCustomer 
}) {
  const { products, categories, customers } = usePOS();

  return (
    <div className="master-assets-container">
      {/* Top Assets Navigation Bar */}
      <div className="responsive-page-container" style={{ paddingBottom: "0" }}>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "14px",
          marginBottom: "12px",
          paddingBottom: "14px",
          borderBottom: "1px solid var(--sd-zinc-200)"
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Boxes size={22} color="var(--sd-red)" />
              <h1 className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--sd-black)", margin: 0 }}>
                Master Assets
              </h1>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", marginTop: "3px" }}>
              Unified catalog for Products, Categories, and Customers.
            </p>
          </div>

          {/* Segmented Sub-Tab Switcher */}
          <div style={{
            display: "inline-flex",
            background: "var(--sd-zinc-100)",
            padding: "4px",
            borderRadius: "14px",
            border: "1px solid var(--sd-zinc-200)",
            gap: "4px",
            overflowX: "auto",
            maxWidth: "100%"
          }}>
            <button
              type="button"
              onClick={() => onSubTabChange("products")}
              className={`pos-mobile-toggle-btn ${activeSubTab === "products" ? "active" : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: activeSubTab === "products" ? 800 : 700,
                background: activeSubTab === "products" ? "var(--sd-black)" : "transparent",
                color: activeSubTab === "products" ? "var(--sd-white)" : "var(--sd-zinc-600)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: activeSubTab === "products" ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
              }}
            >
              <Package size={15} />
              <span>Products ({products.length})</span>
            </button>

            <button
              type="button"
              onClick={() => onSubTabChange("categories")}
              className={`pos-mobile-toggle-btn ${activeSubTab === "categories" ? "active" : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: activeSubTab === "categories" ? 800 : 700,
                background: activeSubTab === "categories" ? "var(--sd-black)" : "transparent",
                color: activeSubTab === "categories" ? "var(--sd-white)" : "var(--sd-zinc-600)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: activeSubTab === "categories" ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
              }}
            >
              <Layers size={15} />
              <span>Categories ({categories.length})</span>
            </button>

            <button
              type="button"
              onClick={() => onSubTabChange("customers")}
              className={`pos-mobile-toggle-btn ${activeSubTab === "customers" ? "active" : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: activeSubTab === "customers" ? 800 : 700,
                background: activeSubTab === "customers" ? "var(--sd-black)" : "transparent",
                color: activeSubTab === "customers" ? "var(--sd-white)" : "var(--sd-zinc-600)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: activeSubTab === "customers" ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
              }}
            >
              <Store size={15} />
              <span>Customers ({customers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Views Content with DOM caching so images and inputs never reload */}
      <div style={{ display: activeSubTab === "products" ? "block" : "none" }}>
        <ProductsManager />
      </div>

      <div style={{ display: activeSubTab === "categories" ? "block" : "none" }}>
        <CategoriesManager />
      </div>

      <div style={{ display: activeSubTab === "customers" ? "block" : "none" }}>
        <CustomersManager onStartBillForCustomer={onStartBillForCustomer} />
      </div>
    </div>
  );
}
