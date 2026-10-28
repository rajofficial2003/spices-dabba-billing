import React, { useState, useEffect } from "react";
import { usePOS } from "../context/POSContext";
import { 
  FileText, 
  Search, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Edit3, 
  Printer, 
  Trash2, 
  Store, 
  Phone, 
  Calendar, 
  CreditCard,
  X,
  Filter,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { formatCurrency, formatDate } from "../utils/formatters";
import DateRangePicker from "./DateRangePicker";

export default function DraftsAndOrders({ onResumeDraft, onViewInvoice }) {
  const { 
    orders, 
    deleteOrder, 
    markOrderPaymentStatus,
    showConfirmModal
  } = usePOS();

  const [filterTab, setFilterTab] = useState("completed");
  const [searchQuery, setSearchQuery] = useState("");

  // Date Filtering State
  const [datePreset, setDatePreset] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Pagination State (12 bills per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Reset to first page when any filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTab, searchQuery, datePreset, startDate, endDate]);

  // Helper to extract YYYY-MM-DD from order timestamp or dates
  const getOrderDateStr = (order) => {
    if (order.date && /^\d{4}-\d{2}-\d{2}/.test(order.date)) {
      return order.date.substring(0, 10);
    }
    const ts = order.timestamp || (order.createdAt?.seconds ? order.createdAt.seconds * 1000 : null) || order.finalizedAt;
    if (ts) {
      const d = new Date(ts);
      if (!isNaN(d.getTime())) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
    return "";
  };

  const handlePresetClick = (presetId) => {
    setDatePreset(presetId);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    if (presetId === "all") {
      setStartDate("");
      setEndDate("");
    } else if (presetId === "today") {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (presetId === "yesterday") {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (presetId === "week") {
      const w = new Date();
      w.setDate(w.getDate() - 6);
      const wStr = `${w.getFullYear()}-${String(w.getMonth() + 1).padStart(2, "0")}-${String(w.getDate()).padStart(2, "0")}`;
      setStartDate(wStr);
      setEndDate(todayStr);
    } else if (presetId === "month") {
      const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      setStartDate(mStr);
      setEndDate(todayStr);
    } else if (presetId === "custom") {
      if (!startDate) {
        const mStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        setStartDate(mStr);
      }
      if (!endDate) {
        setEndDate(todayStr);
      }
    }
  };

  const handleClearDateFilter = () => {
    setDatePreset("all");
    setStartDate("");
    setEndDate("");
  };

  const filteredOrders = orders.filter(order => {
    if (filterTab === "draft" && order.status !== "draft") return false;
    if (filterTab === "completed" && order.status !== "completed") return false;
    if (filterTab === "credit" && (order.status !== "completed" || order.paymentStatus !== "pending")) return false;

    // Date range filtering
    if (startDate || endDate) {
      const orderDate = getOrderDateStr(order);
      if (startDate && orderDate && orderDate < startDate) return false;
      if (endDate && orderDate && orderDate > endDate) return false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const shop = order.customer?.shopName || "";
    const phone = order.customer?.phone || "";
    const inv = order.invoiceNumber || "";
    const contact = order.customer?.customerName || "";

    return shop.toLowerCase().includes(q) || 
           phone.includes(q) || 
           inv.toLowerCase().includes(q) ||
           contact.toLowerCase().includes(q);
  });

  const draftCount = orders.filter(o => o.status === "draft").length;
  const completedCount = orders.filter(o => o.status === "completed").length;
  const creditCount = orders.filter(o => o.status === "completed" && o.paymentStatus === "pending").length;

  const filteredTotalAmount = filteredOrders
    .filter(o => o.status === "completed")
    .reduce((sum, o) => sum + (Number(o.grandTotal) || 0), 0);

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  return (
    <div className="responsive-page-container">
      {/* Header */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "12px",
        marginBottom: "16px",
        paddingBottom: "14px",
        borderBottom: "1px solid var(--sd-zinc-200)"
      }}>
        <div style={{ minWidth: 0, flex: "1 1 200px" }}>
          <h2 className="font-heading" style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--sd-black)", margin: 0 }}>
            Orders
          </h2>
          <p style={{ fontSize: "0.8rem", color: "var(--sd-zinc-600)", marginTop: "2px" }}>
            Finalized wholesale tax invoices, retailer khata records, and on-field drafts.
          </p>
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: "100%", maxWidth: "340px", minWidth: 0, flex: "1 1 220px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
          <input
            type="text"
            placeholder="Search by Shop, Phone, Bill #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-input"
            style={{ width: "100%", paddingLeft: "36px", paddingRight: "12px", fontSize: "0.82rem" }}
          />
        </div>
      </div>

      {/* Filter Tabs (Finalized Bills selected by default) */}
      <div style={{
        display: "flex",
        gap: "6px",
        marginBottom: "12px",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        paddingBottom: "4px"
      }}>
        <button
          onClick={() => setFilterTab("completed")}
          className={`category-pill ${filterTab === "completed" ? "active" : ""}`}
        >
          Finalized Bills ({completedCount})
        </button>

        <button
          onClick={() => setFilterTab("draft")}
          className={`category-pill ${filterTab === "draft" ? "active" : ""}`}
        >
          Saved Drafts ({draftCount})
        </button>

        <button
          onClick={() => setFilterTab("credit")}
          className={`category-pill ${filterTab === "credit" ? "active" : ""}`}
        >
          Credit ({creditCount})
        </button>

        <button
          onClick={() => setFilterTab("all")}
          className={`category-pill ${filterTab === "all" ? "active" : ""}`}
        >
          All Orders ({orders.length})
        </button>
      </div>

      {/* Date Filter Bar */}
      <div style={{
        background: "var(--sd-zinc-50)",
        borderRadius: "12px",
        padding: "10px 14px",
        border: "1px solid var(--sd-zinc-200)",
        marginBottom: "16px",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "10px"
      }}>
        {/* Quick Date Presets */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--sd-zinc-600)", textTransform: "uppercase", marginRight: "2px", display: "inline-flex", alignItems: "center", gap: "4px" }}>
            <Calendar size={13} color="var(--sd-red)" />
            <span>Date:</span>
          </span>

          {[
            { id: "all", label: "All Time" },
            { id: "today", label: "Today" },
            { id: "yesterday", label: "Yesterday" },
            { id: "week", label: "Last 7 Days" },
            { id: "month", label: "This Month" }
          ].map(p => {
            const isActive = datePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                style={{
                  border: isActive ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                  background: isActive ? "var(--sd-black)" : "var(--sd-white)",
                  color: isActive ? "var(--sd-white)" : "var(--sd-zinc-700)",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "0.74rem",
                  fontWeight: isActive ? 800 : 600,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Single Calendar Popover & Summary Info */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onRangeChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            datePreset={datePreset}
            onPresetChange={setDatePreset}
            onClear={handleClearDateFilter}
          />

          {/* Revenue badge if completed filter */}
          {filterTab !== "draft" && (
            <span style={{
              fontSize: "0.75rem",
              fontWeight: 800,
              color: "var(--sd-black)",
              background: "#FFFFFF",
              border: "1px solid var(--sd-zinc-200)",
              borderRadius: "8px",
              padding: "6px 12px",
              whiteSpace: "nowrap"
            }}>
              Revenue: {formatCurrency(filteredTotalAmount)}
            </span>
          )}
        </div>
      </div>

      {/* Orders Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bw-card" style={{ padding: "48px 24px", textAlign: "center", color: "var(--sd-zinc-500)" }}>
          <FileText size={44} strokeWidth={1.5} color="var(--sd-zinc-300)" style={{ margin: "0 auto 10px" }} />
          <h3 className="font-heading" style={{ fontSize: "1.05rem", fontWeight: 700 }}>No orders found</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--sd-zinc-400)", marginTop: "3px" }}>
            {filterTab === "draft"
              ? "No active drafts. You can create a draft in Spot Billing to resume on the counter."
              : "No orders match your filter criteria."}
          </p>
        </div>
      ) : (
        <div className="responsive-cards-grid">
          {paginatedOrders.map(order => {
            const isDraft = order.status === "draft";
            const isPendingCredit = order.status === "completed" && order.paymentStatus === "pending";

            return (
              <div
                key={order.id}
                className="bw-card"
                style={{
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  width: "100%",
                  maxWidth: "100%",
                  minWidth: 0,
                  boxSizing: "border-box",
                  overflow: "hidden"
                }}
              >
                {/* Header row: Shop Name & Status Badge */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "8px",
                  marginBottom: "8px",
                  width: "100%",
                  minWidth: 0
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Store size={16} color="var(--sd-red)" style={{ flexShrink: 0 }} />
                      <h3 className="font-heading" style={{
                        fontSize: "0.98rem",
                        fontWeight: 800,
                        margin: 0,
                        color: "var(--sd-black)",
                        wordBreak: "break-word"
                      }}>
                        {order.customer?.shopName || "Retailer Shop"}
                      </h3>
                    </div>
                    {order.customer?.customerName && (
                      <div style={{
                        fontSize: "0.78rem",
                        color: "var(--sd-zinc-500)",
                        marginLeft: "22px",
                        wordBreak: "break-word"
                      }}>
                        Contact: {order.customer.customerName}
                      </div>
                    )}
                  </div>

                  {/* Clean Status Badge */}
                  <span style={{
                    flexShrink: 0,
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "0.7rem",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    background: isDraft 
                      ? "var(--sd-zinc-100)" 
                      : isPendingCredit 
                      ? "var(--sd-red-subtle)" 
                      : "var(--sd-black)",
                    color: isDraft 
                      ? "var(--sd-zinc-800)" 
                      : isPendingCredit 
                      ? "var(--sd-red)" 
                      : "var(--sd-white)",
                    border: isPendingCredit ? "1px solid var(--sd-red-border)" : "1px solid var(--sd-zinc-200)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}>
                    {isDraft ? <Clock size={11} /> : isPendingCredit ? <AlertCircle size={11} /> : <CheckCircle size={11} />}
                    {isDraft ? "Draft" : isPendingCredit ? "Credit Due" : "Completed"}
                  </span>
                </div>

                {/* Metadata row */}
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "6px 8px",
                  fontSize: "0.76rem",
                  color: "var(--sd-zinc-500)",
                  margin: "2px 0 10px",
                  paddingBottom: "8px",
                  borderBottom: "1px dashed var(--sd-zinc-200)",
                  width: "100%",
                  minWidth: 0
                }}>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, wordBreak: "break-all" }}>{order.invoiceNumber || "NO-NUM"}</span>
                  <span style={{ color: "var(--sd-zinc-300)" }}>•</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}>
                    <Calendar size={12} style={{ flexShrink: 0 }} />
                    {formatDate(order.timestamp || order.createdAt)}
                  </span>
                  <span style={{ color: "var(--sd-zinc-300)" }}>•</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "3px", whiteSpace: "nowrap" }}>
                    <Phone size={12} color="var(--sd-red)" style={{ flexShrink: 0 }} />
                    {order.customer?.phone || "-"}
                  </span>
                </div>

                {/* Items Summary preview */}
                <div style={{
                  background: "var(--sd-zinc-50)",
                  borderRadius: "8px",
                  padding: "8px 10px",
                  marginBottom: "10px",
                  fontSize: "0.8rem",
                  border: "1px solid var(--sd-zinc-200)",
                  width: "100%",
                  minWidth: 0,
                  boxSizing: "border-box"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700, marginBottom: "3px", gap: "8px" }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--sd-zinc-700)" }}>
                      {order.totalItemsCount || order.items?.length || 0} packs ({order.items?.length || 0} items)
                    </span>
                    <span className="font-heading" style={{ color: "var(--sd-black)", fontSize: "0.95rem", fontWeight: 900, flexShrink: 0 }}>
                      {formatCurrency(order.grandTotal)}
                    </span>
                  </div>
                  <div style={{
                    color: "var(--sd-zinc-500)",
                    fontSize: "0.74rem",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                    maxWidth: "100%",
                    display: "block"
                  }}>
                    {(order.items || []).map(i => `${i.name} [HSN:${i.hsnCode || '0910'}] (x${i.quantity})`).join(", ")}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{
                  marginTop: "auto",
                  paddingTop: "8px",
                  borderTop: "1px solid var(--sd-zinc-200)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "8px",
                  width: "100%",
                  minWidth: 0
                }}>
                  {isDraft ? (
                    <>
                      <button
                        type="button"
                        onClick={() => onResumeDraft(order)}
                        className="btn-accent"
                        style={{ padding: "6px 12px", fontSize: "0.8rem", flex: 1, minWidth: "140px" }}
                        title="Resume draft on spot"
                      >
                        <Edit3 size={14} />
                        <span>Resume & Edit on Spot</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await showConfirmModal({
                            title: "Delete Draft Bill",
                            message: `Are you sure you want to delete draft ${order.invoiceNumber}? This action cannot be reversed.`,
                            confirmText: "Delete Draft",
                            isDanger: true
                          });
                          if (ok) {
                            deleteOrder(order.id);
                          }
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--sd-red)",
                          cursor: "pointer",
                          padding: "6px"
                        }}
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </>
                  ) : (
                    <>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => onViewInvoice(order)}
                          className="btn-secondary"
                          style={{ padding: "5px 12px", fontSize: "0.78rem" }}
                          title="View tax invoice"
                        >
                          <FileText size={13} />
                          <span>Invoice</span>
                        </button>

                        {isPendingCredit && (
                          <button
                            type="button"
                            onClick={async () => {
                              const ok = await showConfirmModal({
                                title: "Confirm Payment Received",
                                message: `Are you sure you want to mark Bill #${order.invoiceNumber || ""} (${order.customer?.shopName || "Retailer"}) for ${formatCurrency(order.grandTotal)} as PAID? This will clear the pending credit balance.`,
                                confirmText: "Yes, Mark Paid",
                                cancelText: "Cancel",
                                isDanger: false
                              });
                              if (ok) {
                                markOrderPaymentStatus(order.id, "paid");
                              }
                            }}
                            style={{
                              background: "#059669",
                              color: "var(--sd-white)",
                              border: "none",
                              borderRadius: "8px",
                              padding: "5px 12px",
                              fontSize: "0.76rem",
                              fontWeight: 700,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            title="Mark as paid"
                          >
                            <CheckCircle size={12} />
                            <span>Mark Paid</span>
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modern Pagination Controls (10 Bills per page) */}
      {filteredOrders.length > 0 && (
        <div style={{
          marginTop: "20px",
          padding: "12px 16px",
          background: "var(--sd-zinc-50)",
          borderRadius: "12px",
          border: "1px solid var(--sd-zinc-200)",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px"
        }}>
          {/* Summary text */}
          <div style={{ fontSize: "0.82rem", color: "var(--sd-zinc-600)", fontWeight: 600 }}>
            Showing <strong style={{ color: "var(--sd-black)" }}>{startIndex + 1}</strong> to <strong style={{ color: "var(--sd-black)" }}>{Math.min(endIndex, filteredOrders.length)}</strong> of <strong style={{ color: "var(--sd-black)" }}>{filteredOrders.length}</strong> {filterTab === "draft" ? "drafts" : "orders"}
            {totalPages > 1 && ` • Page ${validCurrentPage} of ${totalPages}`}
          </div>

          {/* Page Buttons */}
          {totalPages > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                type="button"
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={validCurrentPage === 1}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--sd-zinc-300)",
                  background: validCurrentPage === 1 ? "var(--sd-zinc-100)" : "var(--sd-white)",
                  color: validCurrentPage === 1 ? "var(--sd-zinc-400)" : "var(--sd-zinc-800)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: validCurrentPage === 1 ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              {/* Numbered page pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return page === 1 || page === totalPages || Math.abs(page - validCurrentPage) <= 1;
                })
                .map((page, index, array) => {
                  const showEllipsisBefore = index > 0 && page - array[index - 1] > 1;
                  return (
                    <React.Fragment key={page}>
                      {showEllipsisBefore && (
                        <span style={{ padding: "0 4px", color: "var(--sd-zinc-400)", fontSize: "0.8rem" }}>...</span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPage(page);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          border: page === validCurrentPage ? "1px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
                          background: page === validCurrentPage ? "var(--sd-black)" : "var(--sd-white)",
                          color: page === validCurrentPage ? "var(--sd-white)" : "var(--sd-zinc-800)",
                          fontSize: "0.78rem",
                          fontWeight: page === validCurrentPage ? 800 : 600,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                type="button"
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={validCurrentPage === totalPages}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid var(--sd-zinc-300)",
                  background: validCurrentPage === totalPages ? "var(--sd-zinc-100)" : "var(--sd-white)",
                  color: validCurrentPage === totalPages ? "var(--sd-zinc-400)" : "var(--sd-zinc-800)",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  cursor: validCurrentPage === totalPages ? "not-allowed" : "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
