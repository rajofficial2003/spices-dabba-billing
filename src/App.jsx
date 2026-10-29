import React, { useState } from "react";
import { POSProvider, usePOS } from "./context/POSContext";
import Header from "./components/Header";
import POSBilling from "./components/POSBilling";
import DraftsAndOrders from "./components/DraftsAndOrders";
import CustomersManager from "./components/CustomersManager";
import ProductsManager from "./components/ProductsManager";
import MasterAssets from "./components/MasterAssets";
import FinanceERP from "./components/FinanceERP";
import QuickStats from "./components/QuickStats";
import InvoiceModal from "./components/InvoiceModal";
import MixersManager from "./components/MixersManager";

function POSApp() {
  const [activeTab, setActiveTab] = useState("stats"); // 'stats' (Overview) default on website load
  const [assetsSubTab, setAssetsSubTab] = useState("products"); // 'products', 'categories', 'customers'
  const [activeInvoice, setActiveInvoice] = useState(null);

  const { 
    loadDraftIntoCart, 
    setSelectedCustomer, 
    lastGeneratedInvoice, 
    setLastGeneratedInvoice 
  } = usePOS();

  // Navigation handler that seamlessly routes master sub-tabs (customers, customer-categories, products, categories, suppliers, raw-materials)
  const handleNavigate = (tab, subTab = null) => {
    if (tab === "customers" || tab === "customer-categories" || tab === "products" || tab === "categories" || tab === "suppliers" || tab === "expense-categories" || tab === "raw-materials") {
      setActiveTab("assets");
      setAssetsSubTab(tab);
    } else if (tab === "assets") {
      setActiveTab("assets");
      if (subTab) setAssetsSubTab(subTab);
    } else {
      setActiveTab(tab);
    }
  };

  // Resume a draft on the spot
  const handleResumeDraft = (draft) => {
    loadDraftIntoCart(draft);
    setActiveTab("pos");
  };

  // Start a fresh bill for a specific retailer
  const handleStartBillForCustomer = (customer) => {
    setSelectedCustomer(customer);
    setActiveTab("pos");
  };

  // When a bill is finalized, redirect to Orders page and open the generated order
  const handleBillGenerated = (bill) => {
    setActiveInvoice(bill);
    setActiveTab("orders");
  };

  const [visitedTabs, setVisitedTabs] = useState(() => new Set([activeTab, "pos", "assets"]));

  // Pre-cache and retain visited tabs in DOM so images and state don't reload
  React.useEffect(() => {
    setVisitedTabs(prev => {
      const tabToRecord = (activeTab === "products" || activeTab === "categories" || activeTab === "customers" || activeTab === "customer-categories" || activeTab === "suppliers" || activeTab === "expense-categories" || activeTab === "raw-materials") ? "assets" : activeTab;
      if (prev.has(tabToRecord)) return prev;
      const next = new Set(prev);
      next.add(tabToRecord);
      return next;
    });
  }, [activeTab]);

  return (
    <div className="app-container">
      {/* Brand Header */}
      <Header activeTab={activeTab} setActiveTab={handleNavigate} />

      {/* Main Content Area with DOM Caching to eliminate image reloading on tab switch */}
      <main style={{ flex: 1, paddingBottom: "40px" }}>
        {visitedTabs.has("pos") && (
          <div style={{ display: activeTab === "pos" ? "block" : "none" }}>
            <POSBilling 
              onOpenInvoice={(invoice) => setActiveInvoice(invoice)}
              onBillGenerated={handleBillGenerated}
            />
          </div>
        )}

        {visitedTabs.has("orders") && (
          <div style={{ display: activeTab === "orders" ? "block" : "none" }}>
            <DraftsAndOrders
              onResumeDraft={handleResumeDraft}
              onViewInvoice={(invoice) => setActiveInvoice(invoice)}
            />
          </div>
        )}

        {visitedTabs.has("assets") && (
          <div style={{ display: (activeTab === "assets" || activeTab === "products" || activeTab === "categories" || activeTab === "customers" || activeTab === "customer-categories" || activeTab === "suppliers" || activeTab === "expense-categories" || activeTab === "raw-materials") ? "block" : "none" }}>
            <MasterAssets 
              activeSubTab={assetsSubTab}
              onSubTabChange={(sub) => setAssetsSubTab(sub)}
              onStartBillForCustomer={handleStartBillForCustomer}
            />
          </div>
        )}

        {visitedTabs.has("finance") && (
          <div style={{ display: activeTab === "finance" ? "block" : "none" }}>
            <FinanceERP />
          </div>
        )}

        {visitedTabs.has("mixers") && (
          <div style={{ display: activeTab === "mixers" ? "block" : "none" }}>
            <MixersManager />
          </div>
        )}

        {visitedTabs.has("stats") && (
          <div style={{ display: activeTab === "stats" ? "block" : "none" }}>
            <QuickStats onNavigate={handleNavigate} />
          </div>
        )}
      </main>

      {/* Invoice Modal for Viewing, Printing, & WhatsApp Sharing */}
      {(activeInvoice || lastGeneratedInvoice) && (
        <InvoiceModal
          order={activeInvoice || lastGeneratedInvoice}
          onClose={() => {
            setActiveInvoice(null);
            setLastGeneratedInvoice(null);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <POSProvider>
      <POSApp />
    </POSProvider>
  );
}
