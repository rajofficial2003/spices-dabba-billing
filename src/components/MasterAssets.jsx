import React, { useState } from "react";
import { Package, Store, Boxes, DollarSign, Tag, Building2 } from "lucide-react";
import ProductsManager from "./ProductsManager";
import CustomersManager from "./CustomersManager";
import ExpenseCategoriesManager from "./ExpenseCategoriesManager";
import SuppliersManager from "./SuppliersManager";
import { usePOS } from "../context/POSContext";

export default function MasterAssets({ 
  activeSubTab = "products", 
  onSubTabChange, 
  onStartBillForCustomer 
}) {
  const { products, customers, suppliers = [], expenseCategories = [] } = usePOS();

  const [financeSubView, setFinanceSubView] = useState(
    activeSubTab === "suppliers" ? "suppliers" : "categories"
  );

  React.useEffect(() => {
    if (activeSubTab === "suppliers") {
      setFinanceSubView("suppliers");
    } else if (activeSubTab === "expense-categories") {
      setFinanceSubView("categories");
    }
  }, [activeSubTab]);

  const isProductsActive = activeSubTab === "products" || activeSubTab === "categories";
  const isFinanceActive = activeSubTab === "finance" || activeSubTab === "suppliers" || activeSubTab === "expense-categories";

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
              Unified catalog for Products, Customers, Suppliers, and Expense Categories.
            </p>
          </div>

          {/* Segmented Sub-Tab Switcher: Products vs Customers vs Finance */}
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
              className={`pos-mobile-toggle-btn ${isProductsActive ? "active" : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: isProductsActive ? 800 : 700,
                background: isProductsActive ? "var(--sd-black)" : "transparent",
                color: isProductsActive ? "var(--sd-white)" : "var(--sd-zinc-600)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: isProductsActive ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
              }}
            >
              <Package size={15} />
              <span>Products ({products.length})</span>
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

            <button
              type="button"
              onClick={() => onSubTabChange("finance")}
              className={`pos-mobile-toggle-btn ${isFinanceActive ? "active" : ""}`}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                fontWeight: isFinanceActive ? 800 : 700,
                background: isFinanceActive ? "var(--sd-black)" : "transparent",
                color: isFinanceActive ? "var(--sd-white)" : "var(--sd-zinc-600)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
                boxShadow: isFinanceActive ? "0 2px 8px rgba(0,0,0,0.15)" : "none"
              }}
            >
              <DollarSign size={15} />
              <span>Finance</span>
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Views Content with DOM caching so images and inputs never reload */}
      <div style={{ display: isProductsActive ? "block" : "none" }}>
        <ProductsManager initialSubView={activeSubTab === "categories" ? "categories" : "products"} />
      </div>

      <div style={{ display: activeSubTab === "customers" ? "block" : "none" }}>
        <CustomersManager onStartBillForCustomer={onStartBillForCustomer} />
      </div>

      {/* Finance Section: Expense Categories & Suppliers */}
      <div style={{ display: isFinanceActive ? "block" : "none" }}>
        <div className="responsive-page-container" style={{ paddingBottom: "0" }}>
          {/* Sub-view Switcher Toggle for Finance: Expense Categories vs Suppliers */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: "10px",
            marginBottom: "16px"
          }}>
            <div style={{
              display: "inline-flex",
              background: "var(--sd-zinc-100)",
              padding: "4px",
              borderRadius: "12px",
              border: "1px solid var(--sd-zinc-200)",
              gap: "3px"
            }}>
              <button
                type="button"
                onClick={() => setFinanceSubView("categories")}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: financeSubView === "categories" ? 800 : 600,
                  background: financeSubView === "categories" ? "var(--sd-black)" : "transparent",
                  color: financeSubView === "categories" ? "#FFFFFF" : "var(--sd-zinc-700)",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: financeSubView === "categories" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                <Tag size={14} />
                <span>Expense Categories ({expenseCategories.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFinanceSubView("suppliers")}
                style={{
                  padding: "7px 16px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: financeSubView === "suppliers" ? 800 : 600,
                  background: financeSubView === "suppliers" ? "var(--sd-black)" : "transparent",
                  color: financeSubView === "suppliers" ? "#FFFFFF" : "var(--sd-zinc-700)",
                  border: "none",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: financeSubView === "suppliers" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                  transition: "all 0.15s ease"
                }}
              >
                <Building2 size={14} />
                <span>Suppliers ({suppliers.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Finance Sub-view 1: Expense Categories */}
        <div style={{ display: financeSubView === "categories" ? "block" : "none" }}>
          <ExpenseCategoriesManager />
        </div>

        {/* Finance Sub-view 2: Suppliers */}
        <div style={{ display: financeSubView === "suppliers" ? "block" : "none" }}>
          <SuppliersManager />
        </div>
      </div>
    </div>
  );
}
