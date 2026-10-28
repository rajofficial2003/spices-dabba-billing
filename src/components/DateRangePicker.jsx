import React, { useState, useRef, useEffect } from "react";
import { Calendar, ChevronLeft, ChevronRight, ChevronDown, X } from "lucide-react";

export default function DateRangePicker({
  startDate,
  endDate,
  onRangeChange,
  datePreset,
  onPresetChange,
  onClear
}) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Month currently displayed in the calendar
  const initialDate = startDate ? new Date(startDate) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-11

  // Hover date for interactive preview while picking range
  const [hoverDate, setHoverDate] = useState(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
        setHoverDate(null);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Sync viewed month when startDate changes externally
  useEffect(() => {
    if (startDate) {
      const d = new Date(startDate);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [startDate]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Format date helper: YYYY-MM-DD
  const formatYMD = (year, month, day) => {
    const m = String(month + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return `${year}-${m}-${d}`;
  };

  // Days in month
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday

  // Days in previous month for leading blanks
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  // Click on a date cell in the calendar
  const handleDateClick = (dateStr) => {
    if (!startDate || (startDate && endDate)) {
      // Step 1: Start new range selection
      onRangeChange(dateStr, "");
      onPresetChange("custom");
    } else if (startDate && !endDate) {
      // Step 2: Selecting end date
      if (dateStr < startDate) {
        // Clicked date is earlier than start -> set as new start date
        onRangeChange(dateStr, "");
      } else {
        // Complete the range
        onRangeChange(startDate, dateStr);
        setHoverDate(null);
      }
      onPresetChange("custom");
    }
  };



  // Today string for highlighting
  const todayObj = new Date();
  const todayStr = formatYMD(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());

  // Effective preview end date when hovering
  const effectiveEnd = endDate || (startDate && hoverDate && hoverDate >= startDate ? hoverDate : null);

  // Trigger button label
  const getButtonLabel = () => {
    if (startDate && endDate) {
      if (startDate === endDate) return startDate;
      return `${startDate} ➔ ${endDate}`;
    }
    if (startDate && !endDate) {
      return `${startDate} ➔ Select End Date`;
    }
    return "Filter by Date";
  };

  const hasActiveDate = Boolean(startDate || endDate || (datePreset && datePreset !== "all"));

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={popoverRef}>
      {/* Single Calendar Trigger Button */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          background: hasActiveDate ? "var(--sd-white)" : "var(--sd-white)",
          border: hasActiveDate ? "1.5px solid var(--sd-black)" : "1px solid var(--sd-zinc-300)",
          borderRadius: "9px",
          padding: "5px 11px",
          fontSize: "0.78rem",
          fontWeight: 700,
          color: hasActiveDate ? "var(--sd-black)" : "var(--sd-zinc-700)",
          cursor: "pointer",
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          userSelect: "none",
          transition: "all 0.15s ease"
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="Click to choose date range"
      >
        <Calendar size={15} color="var(--sd-red)" style={{ flexShrink: 0 }} />
        <span>{getButtonLabel()}</span>
        <ChevronDown size={14} color="var(--sd-zinc-400)" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />

        {hasActiveDate && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
              setIsOpen(false);
            }}
            style={{
              border: "none",
              background: "var(--sd-zinc-100)",
              color: "var(--sd-zinc-600)",
              borderRadius: "50%",
              width: "18px",
              height: "18px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: 0,
              marginLeft: "2px"
            }}
            title="Clear date filter"
          >
            <X size={11} />
          </button>
        )}
      </div>

      {/* Single Calendar Dropdown Popover */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 9999,
            background: "#FFFFFF",
            borderRadius: "14px",
            border: "1px solid var(--sd-zinc-200)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.06)",
            width: "310px",
            padding: "14px",
            animation: "fadeIn 0.15s ease"
          }}
        >


          {/* Month / Year Navigation */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <button
              type="button"
              onClick={prevMonth}
              style={{
                border: "1px solid var(--sd-zinc-200)",
                background: "var(--sd-zinc-50)",
                borderRadius: "6px",
                padding: "4px 8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sd-zinc-700)"
              }}
              title="Previous month"
            >
              <ChevronLeft size={14} />
            </button>

            <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--sd-black)" }}>
              {monthNames[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={nextMonth}
              style={{
                border: "1px solid var(--sd-zinc-200)",
                background: "var(--sd-zinc-50)",
                borderRadius: "6px",
                padding: "4px 8px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--sd-zinc-700)"
              }}
              title="Next month"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Weekday Headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px", textAlign: "center", marginBottom: "6px" }}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
              <div key={day} style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--sd-zinc-400)", textTransform: "uppercase" }}>
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "2px" }}>
            {/* Leading blanks from previous month */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => {
              const prevDay = daysInPrevMonth - firstDayOfWeek + i + 1;
              return (
                <div
                  key={`prev-${i}`}
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.72rem",
                    color: "var(--sd-zinc-300)",
                    userSelect: "none"
                  }}
                >
                  {prevDay}
                </div>
              );
            })}

            {/* Current month days */}
            {Array.from({ length: daysInCurrentMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatYMD(viewYear, viewMonth, day);

              const isStart = startDate === dateStr;
              const isEnd = (endDate || (startDate && hoverDate && hoverDate >= startDate ? hoverDate : null)) === dateStr;
              const isInRange = Boolean(
                startDate &&
                effectiveEnd &&
                dateStr > startDate &&
                dateStr < effectiveEnd
              );
              const isToday = dateStr === todayStr;

              // Background styling for range
              let bg = "transparent";
              let textColor = "var(--sd-zinc-800)";
              let borderRadius = "6px";
              let fontWeight = 500;

              if (isStart || isEnd) {
                bg = "var(--sd-black)";
                textColor = "var(--sd-white)";
                fontWeight = 800;
                borderRadius = "6px";
              } else if (isInRange) {
                bg = "#FEE2E2"; // Spices dabba light red tint for range
                textColor = "var(--sd-red)";
                fontWeight = 700;
                borderRadius = "0";
              }

              return (
                <div
                  key={dateStr}
                  onClick={() => handleDateClick(dateStr)}
                  onMouseEnter={() => {
                    if (startDate && !endDate) {
                      setHoverDate(dateStr);
                    }
                  }}
                  style={{
                    height: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.76rem",
                    fontWeight,
                    cursor: "pointer",
                    background: bg,
                    color: textColor,
                    borderRadius,
                    position: "relative",
                    transition: "all 0.1s ease",
                    border: isToday && !isStart && !isEnd ? "1px solid var(--sd-red)" : "none"
                  }}
                  title={dateStr}
                >
                  {day}
                </div>
              );
            })}
          </div>

          {/* Hint / Helper Footer */}
          <div style={{ marginTop: "12px", paddingTop: "10px", borderTop: "1px solid var(--sd-zinc-100)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: "0.7rem", color: "var(--sd-zinc-500)", fontWeight: 600 }}>
              {!startDate ? (
                "1. Click start date"
              ) : !endDate ? (
                <span style={{ color: "var(--sd-red)", fontWeight: 700 }}>2. Click end date</span>
              ) : (
                <span style={{ color: "var(--sd-zinc-700)" }}>Range selected</span>
              )}
            </div>

            <div style={{ display: "flex", gap: "6px" }}>
              {(startDate || endDate) && (
                <button
                  type="button"
                  onClick={() => {
                    onClear();
                    setHoverDate(null);
                  }}
                  style={{
                    border: "none",
                    background: "none",
                    color: "var(--sd-zinc-500)",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    padding: "4px 6px"
                  }}
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setHoverDate(null);
                }}
                className="btn-accent"
                style={{
                  padding: "4px 10px",
                  fontSize: "0.72rem",
                  borderRadius: "6px"
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
