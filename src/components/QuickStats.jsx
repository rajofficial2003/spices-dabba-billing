import React from "react";
import { usePOS } from "../context/POSContext";
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Users, 
  CreditCard, 
  Clock, 
  Package, 
  Flame, 
  ArrowRight, 
  FileText, 
  Fuel, 
  Truck, 
  Receipt, 
  Boxes,
  Plus,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";

export default function QuickStats({ onNavigate }) {
  const { 
    orders, 
    customers, 
    products, 
    expenses = [] 
  } = usePOS();

  const completedOrders = orders.filter(o => o.status === "completed");
  const draftOrders = orders.filter(o => o.status === "draft");

  // Financial Totals
  const totalIncome = completedOrders.reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const totalOutstanding = customers.reduce((sum, c) => sum + (Number(c.outstandingBalance) || 0), 0);

  // Raw Materials vs Operational Expenses
  const rawMaterialPurchases = expenses.filter(e => e.category === "Raw Materials");
  const rawMaterialsTotal = rawMaterialPurchases.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const operationalExpensesTotal = totalExpenses - rawMaterialsTotal;

  // Expense Categories Map
  const expenseByCategory = {};
  expenses.forEach(e => {
    const cat = e.category || "Other";
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (Number(e.amount) || 0);
  });

  // Top Selling Products Map
  const productSalesMap = {};
  completedOrders.forEach(o => {
    (o.items || []).forEach(i => {
      productSalesMap[i.name] = (productSalesMap[i.name] || 0) + (i.quantity || 1);
    });
  });

  const topProducts = Object.entries(productSalesMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Recent 5 financial activities (combined orders & expenses)
  const recentActivities = [
    ...completedOrders.slice(0, 4).map(o => ({
      id: o.id,
      type: "income",
      title: `${o.customer?.shopName || 'Retailer Shop'} - Wholesale Bill`,
      subtitle: `${o.items?.length || 0} items (${o.totalItemsCount || 0} packs)`,
      amount: Number(o.grandTotal) || 0,
      date: o.timestamp || o.createdAt,
      refNumber: o.invoiceNumber
    })),
    ...expenses.slice(0, 4).map(e => ({
      id: e.id,
      type: "expense",
      title: e.title,
      subtitle: e.category === "Raw Materials" ? `Raw Material Bill: ${e.supplierName || 'Mandi'} (${(e.items || []).length || 1} items)` : e.category,
      amount: Number(e.amount) || 0,
      date: e.date || e.createdAt,
      proofUrl: e.proofUrl || e.billProofUrl
    }))
  ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 6);

  return (
    <div className="responsive-page-container">
      {/* Header Banner */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
        marginBottom: "24px",
        paddingBottom: "16px",
        borderBottom: "1px solid var(--sd-zinc-200)"
      }}>
        <div>
          <span style={{
            fontSize: "0.72rem",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            color: "var(--sd-red)",
            background: "var(--sd-red-subtle)",
            border: "1px solid var(--sd-red-border)",
            padding: "3px 8px",
            borderRadius: "6px"
          }}>
            Spices Dabba Wholesale ERP & Finance
          </span>
          <h1 className="font-heading" style={{
            fontSize: "1.75rem",
            fontWeight: 900,
            color: "var(--sd-black)",
            margin: "8px 0 2px"
          }}>
            Business Dashboard & Accounting
          </h1>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", margin: 0 }}>
            Real-time billing income, raw material procurement, operational expenses, and net cash flow margin.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            onClick={() => onNavigate("pos")}
            className="btn-primary"
            style={{ padding: "8px 14px", fontSize: "0.82rem" }}
          >
            <ShoppingBag size={15} />
            <span>Open Spot Billing</span>
          </button>
          <button
            onClick={() => onNavigate("finance")}
            className="btn-accent"
            style={{ padding: "8px 14px", fontSize: "0.82rem" }}
          >
            <Receipt size={15} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="responsive-metrics-grid" style={{ marginBottom: "20px" }}>
        {/* Metric 1: Total Billing Revenue (Income) */}
        <div 
          className="bw-card" 
          onClick={() => onNavigate("orders")}
          style={{ padding: "18px 20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "var(--sd-zinc-500)", letterSpacing: "0.5px" }}>
                Total Billing Income
              </span>
              <div className="font-heading" style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "2px" }}>
                {formatCurrency(totalIncome)}
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--sd-zinc-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sd-black)"
            }}>
              <TrendingUp size={18} />
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", marginTop: "6px" }}>
            From <strong>{completedOrders.length}</strong> finalized wholesale bills →
          </div>
        </div>

        {/* Metric 2: Total Expenses (Raw Materials + Daily Ops) */}
        <div 
          className="bw-card" 
          onClick={() => onNavigate("finance")}
          style={{ padding: "18px 20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "var(--sd-zinc-500)", letterSpacing: "0.5px" }}>
                Total Outflow / Expenses
              </span>
              <div className="font-heading" style={{ fontSize: "1.7rem", fontWeight: 900, color: "var(--sd-red)", marginTop: "2px" }}>
                {formatCurrency(totalExpenses)}
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--sd-red-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sd-red)"
            }}>
              <Fuel size={18} />
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--sd-red)", marginTop: "6px", fontWeight: 700 }}>
            {expenses.length} expense & raw material records →
          </div>
        </div>

        {/* Metric 3: Net Cash Flow / Margin */}
        <div className="bw-card" style={{ padding: "18px 20px", background: netProfit >= 0 ? "var(--sd-white)" : "var(--sd-red-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: netProfit >= 0 ? "var(--sd-zinc-500)" : "var(--sd-red)", letterSpacing: "0.5px" }}>
                Net Operating Margin
              </span>
              <div className="font-heading" style={{ fontSize: "1.7rem", fontWeight: 900, color: netProfit >= 0 ? "#15803d" : "var(--sd-red)", marginTop: "2px" }}>
                {formatCurrency(netProfit)}
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: netProfit >= 0 ? "#f0fdf4" : "var(--sd-red-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: netProfit >= 0 ? "#15803d" : "var(--sd-red)"
            }}>
              {netProfit >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: netProfit >= 0 ? "#15803d" : "var(--sd-red)", marginTop: "6px", fontWeight: 700 }}>
            {netProfit >= 0 ? "Profitable cash flow" : "Outflow exceeds revenue"}
          </div>
        </div>

        {/* Metric 4: Retailer Khata Due (Receivables) */}
        <div 
          className="bw-card" 
          onClick={() => onNavigate("customers")}
          style={{ padding: "18px 20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "var(--sd-zinc-500)", letterSpacing: "0.5px" }}>
                Retailer Khata Due
              </span>
              <div className="font-heading" style={{ fontSize: "1.7rem", fontWeight: 900, color: totalOutstanding > 0 ? "var(--sd-red)" : "var(--sd-black)", marginTop: "2px" }}>
                {formatCurrency(totalOutstanding)}
              </div>
            </div>
            <div style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "var(--sd-zinc-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sd-black)"
            }}>
              <CreditCard size={18} />
            </div>
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", marginTop: "6px" }}>
            Across <strong>{customers.length}</strong> registered stores →
          </div>
        </div>
      </div>

      {/* Secondary Row: Raw Materials Procurement & Active Drafts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginBottom: "20px" }}>
        {/* Raw Materials Highlight */}
        <div 
          className="bw-card" 
          onClick={() => onNavigate("finance")}
          style={{ padding: "18px 20px", cursor: "pointer", borderLeft: "4px solid var(--sd-black)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "var(--sd-zinc-500)", letterSpacing: "0.5px" }}>
                Raw Materials Procurement
              </span>
              <div className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--sd-black)", marginTop: "2px" }}>
                {formatCurrency(rawMaterialsTotal)}
              </div>
            </div>
            <Package size={22} color="var(--sd-black)" />
          </div>
          <p style={{ fontSize: "0.76rem", color: "var(--sd-zinc-600)", marginTop: "6px", margin: 0 }}>
            {rawMaterialPurchases.length} batches procured with HSN codes & vendor receipts.
          </p>
        </div>

        {/* Daily Operations Highlight */}
        <div 
          className="bw-card" 
          onClick={() => onNavigate("finance")}
          style={{ padding: "18px 20px", cursor: "pointer", borderLeft: "4px solid var(--sd-red)" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "var(--sd-zinc-500)", letterSpacing: "0.5px" }}>
                Logistics & Operations
              </span>
              <div className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--sd-red)", marginTop: "2px" }}>
                {formatCurrency(operationalExpensesTotal)}
              </div>
            </div>
            <Truck size={22} color="var(--sd-red)" />
          </div>
          <p style={{ fontSize: "0.76rem", color: "var(--sd-zinc-600)", marginTop: "6px", margin: 0 }}>
            Delivery fuel, tempo rent, staff salaries & packaging expenses.
          </p>
        </div>

        {/* Active Field Drafts */}
        <div 
          className="bw-card" 
          onClick={() => onNavigate("orders")}
          style={{ padding: "18px 20px", cursor: "pointer" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <span style={{ fontSize: "0.72rem", textTransform: "uppercase", fontWeight: 800, color: "var(--sd-zinc-500)", letterSpacing: "0.5px" }}>
                Active Field Drafts
              </span>
              <div className="font-heading" style={{ fontSize: "1.45rem", fontWeight: 900, color: "var(--sd-red)", marginTop: "2px" }}>
                {draftOrders.length} Drafts
              </div>
            </div>
            <Clock size={22} color="var(--sd-red)" />
          </div>
          <p style={{ fontSize: "0.76rem", color: "var(--sd-zinc-600)", marginTop: "6px", margin: 0 }}>
            Saved on counter; ready to resume and finalize on-spot.
          </p>
        </div>
      </div>

      {/* Main Two Column Section: Expense Breakdown & Recent Cash Flow Activity */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "16px" }}>
        
        {/* Left: Expense Breakdown by Category */}
        <div className="bw-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Receipt size={18} color="var(--sd-red)" />
              <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
                Expense Breakdown
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("finance")}
              style={{ background: "none", border: "none", color: "var(--sd-red)", fontSize: "0.78rem", fontWeight: 800, cursor: "pointer" }}
            >
              View Hub →
            </button>
          </div>

          {Object.keys(expenseByCategory).length === 0 ? (
            <div style={{ color: "var(--sd-zinc-500)", fontSize: "0.82rem", padding: "18px 0", textAlign: "center" }}>
              No expenses recorded yet. Click "Record Expense" to add entries.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {Object.entries(expenseByCategory).map(([cat, amount]) => {
                const percent = totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0;

                return (
                  <div key={cat} style={{ background: "var(--sd-zinc-50)", padding: "10px 12px", borderRadius: "10px", border: "1px solid var(--sd-zinc-200)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", fontWeight: 700, marginBottom: "5px" }}>
                      <span>{cat}</span>
                      <span className="font-heading" style={{ fontWeight: 800, color: "var(--sd-black)" }}>
                        {formatCurrency(amount)} ({percent}%)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: "100%", height: "6px", background: "var(--sd-zinc-200)", borderRadius: "99px", overflow: "hidden" }}>
                      <div style={{
                        width: `${percent}%`,
                        height: "100%",
                        background: cat === "Raw Materials" ? "var(--sd-black)" : "var(--sd-red)",
                        borderRadius: "99px"
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Recent Cash Flow Activity (Income & Expense Timeline) */}
        <div className="bw-card" style={{ padding: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={18} color="var(--sd-black)" />
              <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0 }}>
                Recent Cash Flow Activity
              </h3>
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)" }}>Live ERP Feed</span>
          </div>

          {recentActivities.length === 0 ? (
            <div style={{ color: "var(--sd-zinc-500)", fontSize: "0.82rem", padding: "18px 0", textAlign: "center" }}>
              No transactions recorded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {recentActivities.map((act) => {
                const isIncome = act.type === "income";

                return (
                  <div
                    key={`${act.type}_${act.id}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "9px 12px",
                      borderRadius: "10px",
                      background: isIncome ? "#fdfbfb" : "var(--sd-zinc-50)",
                      border: "1px solid var(--sd-zinc-200)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "8px",
                        background: isIncome ? "var(--sd-black)" : "var(--sd-red-subtle)",
                        color: isIncome ? "var(--sd-white)" : "var(--sd-red)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0
                      }}>
                        {isIncome ? <ArrowUpRight size={17} /> : <ArrowDownRight size={17} />}
                      </div>

                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--sd-black)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {act.title}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "var(--sd-zinc-500)", marginTop: "1px" }}>
                          {act.subtitle}
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "12px" }}>
                      <div className="font-heading" style={{
                        fontWeight: 900,
                        fontSize: "0.95rem",
                        color: isIncome ? "#15803d" : "var(--sd-red)"
                      }}>
                        {isIncome ? `+${formatCurrency(act.amount)}` : `-${formatCurrency(act.amount)}`}
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--sd-zinc-400)" }}>
                        {formatDate(act.date)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
