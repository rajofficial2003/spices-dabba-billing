import React, { useState, useEffect } from "react";
import { usePOS } from "../context/POSContext";
import { useAuth } from "../context/AuthContext";
import StaffManager from "./StaffManager";
import { 
  CreditCard, 
  Upload, 
  Check, 
  RefreshCw, 
  Eye, 
  Image as ImageIcon, 
  AlertCircle,
  Building,
  Building2,
  Store,
  Phone,
  MapPin,
  Hash,
  User,
  QrCode,
  Save,
  Trash2,
  LogOut,
  ShieldCheck,
  Users,
  FileText
} from "lucide-react";
import { compressImage, uploadProductImage } from "../utils/imageCompressor";

export default function SettingsManager() {
  const { BUSINESS_INFO, updatePaymentSettings, updateCompanySettings, showConfirmModal } = usePOS();
  const { currentUser, logout, isSuperAdmin } = useAuth();

  const [activeSection, setActiveSection] = useState("company-profile");

  const handleLogout = async () => {
    if (!showConfirmModal) {
      if (window.confirm("Are you sure you want to log out of Spices Dabba?")) {
        await logout();
      }
      return;
    }

    const confirmed = await showConfirmModal({
      title: "Confirm Sign Out (வெளியேறுதல்)",
      message: `Are you sure you want to log out of Spices Dabba? You are currently signed in as "${currentUser?.email || "Staff User"}". You will need to enter your email and password to sign back in.`,
      confirmText: "Yes, Log Out",
      cancelText: "Cancel",
      isDanger: true
    });

    if (confirmed) {
      await logout();
    }
  };

  // ==========================================
  // SECTION 1: COMPANY PROFILE & INVOICE DETAILS
  // ==========================================
  const [companyData, setCompanyData] = useState({
    companyName: "",
    brandName: "",
    address1: "",
    address2: "",
    city: "",
    state: "Tamil Nadu",
    pincode: "",
    phonePrimary: "",
    gstin: "",
    logoPath: "/images/logo/logo.png"
  });

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("/images/logo/logo.png");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [companySaveStatus, setCompanySaveStatus] = useState(null);

  // ==========================================
  // SECTION 2: PAYMENT & BANK DETAILS
  // ==========================================
  const [paymentData, setPaymentData] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    qrCodePath: "/images/upi-qr.jpg"
  });

  const [qrFile, setQrFile] = useState(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState("/images/upi-qr.jpg");
  const [isUploadingQr, setIsUploadingQr] = useState(false);
  const [qrUploadProgress, setQrUploadProgress] = useState(0);
  const [isSavingPayment, setIsSavingPayment] = useState(false);
  const [paymentSaveStatus, setPaymentSaveStatus] = useState(null);

  // Sync state when BUSINESS_INFO loads/updates
  useEffect(() => {
    if (BUSINESS_INFO) {
      setCompanyData({
        companyName: BUSINESS_INFO.companyName || BUSINESS_INFO.manufacturer || "JEES FOODS",
        brandName: BUSINESS_INFO.brandName || BUSINESS_INFO.name || "Spices Dabba",
        address1: BUSINESS_INFO.address1 || "",
        address2: BUSINESS_INFO.address2 || "",
        city: BUSINESS_INFO.city || "Theni",
        state: BUSINESS_INFO.state || "Tamil Nadu",
        pincode: BUSINESS_INFO.pincode || "625513",
        phonePrimary: BUSINESS_INFO.phonePrimary || "+91 95666 59298",
        gstin: BUSINESS_INFO.gstin || "33ATDPV4802H1ZR",
        logoPath: BUSINESS_INFO.logoPath || "/images/logo/logo.png"
      });
      setLogoPreviewUrl(BUSINESS_INFO.logoPath || "/images/logo/logo.png");

      setPaymentData({
        bankName: BUSINESS_INFO.bankName || "Tamilnad Mercantile Bank",
        accountName: BUSINESS_INFO.accountName || "SPICES DABBA",
        accountNumber: BUSINESS_INFO.accountNumber || "180150050800432",
        ifscCode: BUSINESS_INFO.ifscCode || "TMBL0000180",
        upiId: BUSINESS_INFO.upiId || "9940159298 (Vaishno Devi)",
        qrCodePath: BUSINESS_INFO.qrCodePath || "/images/upi-qr.jpg"
      });
      setQrPreviewUrl(BUSINESS_INFO.qrCodePath || "/images/upi-qr.jpg");
    }
  }, [BUSINESS_INFO]);

  // Handlers for Company Profile
  const handleCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyData(prev => ({
      ...prev,
      [name]: name === "gstin" ? value.toUpperCase().trim() : value
    }));
  };

  const handleLogoFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setCompanySaveStatus({ type: "error", message: "Please select an image file (PNG, JPG, WEBP, SVG)." });
      return;
    }

    try {
      const localUrl = URL.createObjectURL(file);
      setLogoPreviewUrl(localUrl);
      setLogoFile(file);
      setCompanySaveStatus(null);
    } catch (err) {
      console.error("Preview error:", err);
    }
  };

  const handleResetLogo = () => {
    setLogoFile(null);
    setLogoPreviewUrl("/images/logo/logo.png");
    setCompanyData(prev => ({ ...prev, logoPath: "/images/logo/logo.png" }));
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    setIsSavingCompany(true);
    setCompanySaveStatus(null);

    let finalLogoPath = companyData.logoPath;

    try {
      if (logoFile) {
        setIsUploadingLogo(true);
        setLogoUploadProgress(10);
        try {
          const compressed = await compressImage(logoFile, {
            maxWidth: 600,
            maxHeight: 600,
            quality: 0.9,
            outputFormat: "image/png"
          });
          setLogoUploadProgress(40);

          const uploadResult = await uploadProductImage(compressed.file, "brand_logo", (pct) => {
            setLogoUploadProgress(40 + Math.round(pct * 0.55));
          });

          if (uploadResult?.url) {
            finalLogoPath = uploadResult.url;
          }
        } catch (uploadErr) {
          console.warn("Storage upload failed, using Data URL fallback:", uploadErr);
          finalLogoPath = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoFile);
          });
        } finally {
          setIsUploadingLogo(false);
          setLogoUploadProgress(100);
        }
      }

      const payload = {
        companyName: companyData.companyName.trim(),
        brandName: companyData.brandName.trim(),
        address1: companyData.address1.trim(),
        address2: companyData.address2.trim(),
        city: companyData.city.trim(),
        state: companyData.state.trim(),
        pincode: companyData.pincode.trim(),
        phonePrimary: companyData.phonePrimary.trim(),
        gstin: companyData.gstin.trim().toUpperCase(),
        logoPath: finalLogoPath
      };

      const result = await updateCompanySettings(payload);

      if (result.success) {
        setCompanyData(prev => ({ ...prev, ...payload }));
        setLogoPreviewUrl(finalLogoPath);
        setLogoFile(null);
        setCompanySaveStatus({
          type: "success",
          message: "Company Details updated successfully! These details will now appear on all Invoices, Bills & WhatsApp messages."
        });
        setTimeout(() => setCompanySaveStatus(null), 5000);
      } else {
        throw new Error(result.error?.message || "Failed to save company settings");
      }
    } catch (err) {
      console.error("Save company settings error:", err);
      setCompanySaveStatus({
        type: "error",
        message: err.message || "Failed to update company settings. Please try again."
      });
    } finally {
      setIsSavingCompany(false);
    }
  };

  // Handlers for Payment Details
  const handlePaymentChange = (e) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: name === "ifscCode" ? value.toUpperCase().trim() : value
    }));
  };

  const handleQrFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPaymentSaveStatus({ type: "error", message: "Please select an image file (PNG, JPG, WEBP)." });
      return;
    }

    try {
      const localUrl = URL.createObjectURL(file);
      setQrPreviewUrl(localUrl);
      setQrFile(file);
      setPaymentSaveStatus(null);
    } catch (err) {
      console.error("Preview error:", err);
    }
  };

  const handleResetQr = () => {
    setQrFile(null);
    setQrPreviewUrl("/images/upi-qr.jpg");
    setPaymentData(prev => ({ ...prev, qrCodePath: "/images/upi-qr.jpg" }));
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsSavingPayment(true);
    setPaymentSaveStatus(null);

    let finalQrPath = paymentData.qrCodePath;

    try {
      if (qrFile) {
        setIsUploadingQr(true);
        setQrUploadProgress(10);
        try {
          const compressed = await compressImage(qrFile, {
            maxWidth: 600,
            maxHeight: 600,
            quality: 0.9,
            outputFormat: "image/jpeg"
          });
          setQrUploadProgress(40);

          const uploadResult = await uploadProductImage(compressed.file, "settings", (pct) => {
            setQrUploadProgress(40 + Math.round(pct * 0.55));
          });

          if (uploadResult?.url) {
            finalQrPath = uploadResult.url;
          }
        } catch (uploadErr) {
          console.warn("Storage upload failed, using Data URL fallback:", uploadErr);
          finalQrPath = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(qrFile);
          });
        } finally {
          setIsUploadingQr(false);
          setQrUploadProgress(100);
        }
      }

      const updatedPayload = {
        bankName: paymentData.bankName.trim(),
        accountName: paymentData.accountName.trim(),
        accountNumber: paymentData.accountNumber.trim(),
        ifscCode: paymentData.ifscCode.trim().toUpperCase(),
        upiId: paymentData.upiId.trim(),
        qrCodePath: finalQrPath
      };

      const result = await updatePaymentSettings(updatedPayload);

      if (result.success) {
        setPaymentData(prev => ({ ...prev, ...updatedPayload }));
        setQrPreviewUrl(finalQrPath);
        setQrFile(null);
        setPaymentSaveStatus({
          type: "success",
          message: "Payment Details updated successfully! These details will now appear on all Invoices & WhatsApp bills."
        });
        setTimeout(() => setPaymentSaveStatus(null), 5000);
      } else {
        throw new Error(result.error?.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      setPaymentSaveStatus({
        type: "error",
        message: err.message || "Failed to update payment settings. Please try again."
      });
    } finally {
      setIsSavingPayment(false);
    }
  };

  // Formatted combined address for the live invoice preview
  const previewCombinedAddress = [
    companyData.address1,
    companyData.address2,
    companyData.city,
    companyData.state ? (companyData.pincode ? `${companyData.state} - ${companyData.pincode}` : companyData.state) : companyData.pincode
  ].filter(Boolean).join(", ");

  return (
    <div className="responsive-page-container" style={{ paddingBottom: "30px" }}>
      {/* Settings Navigation / Header */}
      <div style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        marginBottom: "20px"
      }}>
        <div style={{
          display: "inline-flex",
          background: "var(--sd-zinc-100)",
          padding: "3px",
          borderRadius: "12px",
          border: "1px solid var(--sd-zinc-200)",
          gap: "3px",
          overflowX: "auto",
          maxWidth: "100%"
        }}>
          {/* Tab 1: Company Profile & Invoice Details */}
          <button
            type="button"
            onClick={() => setActiveSection("company-profile")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "0.80rem",
              fontWeight: activeSection === "company-profile" ? 800 : 600,
              background: activeSection === "company-profile" ? "var(--sd-black)" : "transparent",
              color: activeSection === "company-profile" ? "#FFFFFF" : "var(--sd-zinc-700)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: activeSection === "company-profile" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap"
            }}
          >
            <Building2 size={14} />
            <span>Company & Invoice Details</span>
          </button>

          {/* Tab 2: Payment Details */}
          <button
            type="button"
            onClick={() => setActiveSection("payment-details")}
            style={{
              padding: "7px 14px",
              borderRadius: "8px",
              fontSize: "0.80rem",
              fontWeight: activeSection === "payment-details" ? 800 : 600,
              background: activeSection === "payment-details" ? "var(--sd-black)" : "transparent",
              color: activeSection === "payment-details" ? "#FFFFFF" : "var(--sd-zinc-700)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: activeSection === "payment-details" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap"
            }}
          >
            <CreditCard size={14} />
            <span>Payment Details</span>
          </button>

          {/* Tab 3: Staff & Permissions */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveSection("staff-management")}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                fontSize: "0.80rem",
                fontWeight: activeSection === "staff-management" ? 800 : 600,
                background: activeSection === "staff-management" ? "var(--sd-black)" : "transparent",
                color: activeSection === "staff-management" ? "#FFFFFF" : "var(--sd-zinc-700)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: activeSection === "staff-management" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap"
              }}
            >
              <Users size={14} />
              <span>Staff & Permissions (ஊழியர்கள்)</span>
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Active section status badge */}
          {(activeSection === "company-profile" ? companySaveStatus : paymentSaveStatus) && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.80rem",
              fontWeight: 600,
              background: (activeSection === "company-profile" ? companySaveStatus : paymentSaveStatus)?.type === "success" ? "#ECFDF5" : "#FEF2F2",
              color: (activeSection === "company-profile" ? companySaveStatus : paymentSaveStatus)?.type === "success" ? "#065F46" : "#991B1B",
              border: `1px solid ${(activeSection === "company-profile" ? companySaveStatus : paymentSaveStatus)?.type === "success" ? "#A7F3D0" : "#FECACA"}`
            }}>
              {(activeSection === "company-profile" ? companySaveStatus : paymentSaveStatus)?.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{(activeSection === "company-profile" ? companySaveStatus : paymentSaveStatus)?.message}</span>
            </div>
          )}

          {/* Quick Logout Button with Confirmation */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              padding: "6px 14px",
              fontSize: "0.80rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease"
            }}
            title="Log Out with confirmation"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: STAFF MANAGEMENT */}
      {activeSection === "staff-management" && isSuperAdmin && (
        <StaffManager />
      )}

      {/* VIEW 2: COMPANY PROFILE & INVOICE DETAILS */}
      {activeSection === "company-profile" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "24px",
          alignItems: "start"
        }}>
          {/* Form Card */}
          <div style={{
            background: "#FFFFFF",
            border: "1px solid var(--sd-zinc-200)",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              background: "linear-gradient(to right, #FAFAFA, #FFFFFF)",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
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
                <Building2 size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "var(--sd-black)" }}>
                  Company Profile & Invoice Details
                </h2>
                <p style={{ fontSize: "0.76rem", color: "var(--sd-zinc-500)", margin: "2px 0 0 0" }}>
                  These business details are dynamically rendered on customer Tax Invoices, A4 printouts & WhatsApp bills.
                </p>
              </div>
            </div>

            <form onSubmit={handleCompanySubmit} style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* Row 1: Company Name & Brand Name */}
                <div className="form-grid-2col">
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                      <Building size={14} color="var(--sd-zinc-500)" />
                      <span>Company Name</span>
                      <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="companyName"
                      value={companyData.companyName}
                      onChange={handleCompanyChange}
                      placeholder="e.g. JEES FOODS"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        outline: "none",
                        fontWeight: 700,
                        color: "var(--sd-black)"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                      <Store size={14} color="var(--sd-zinc-500)" />
                      <span>Brand Name</span>
                      <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      value={companyData.brandName}
                      onChange={handleCompanyChange}
                      placeholder="e.g. Spices Dabba"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        outline: "none",
                        fontWeight: 700,
                        color: "var(--sd-black)"
                      }}
                    />
                  </div>
                </div>

                {/* Row 2: Address 1 (Door No. / Plot No) */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                    <MapPin size={14} color="var(--sd-zinc-500)" />
                    <span>Address 1 (Door No. / Plot No)</span>
                    <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <input
                    type="text"
                    name="address1"
                    value={companyData.address1}
                    onChange={handleCompanyChange}
                    placeholder="e.g. Door No. 12, Plot No. 4"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      outline: "none",
                      fontWeight: 600,
                      color: "var(--sd-black)"
                    }}
                  />
                </div>

                {/* Row 3: Address 2 (Street Name, Area) */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                    <MapPin size={14} color="var(--sd-zinc-500)" />
                    <span>Address 2 (Street Name, Area)</span>
                  </label>
                  <input
                    type="text"
                    name="address2"
                    value={companyData.address2}
                    onChange={handleCompanyChange}
                    placeholder="e.g. Main Bazaar Road, Bodinayakanur"
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      outline: "none",
                      fontWeight: 600,
                      color: "var(--sd-black)"
                    }}
                  />
                </div>

                {/* Row 4: City, State, Pincode */}
                <div className="form-grid-3col">
                  <div>
                    <label style={{ display: "block", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                      City <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={companyData.city}
                      onChange={handleCompanyChange}
                      placeholder="e.g. Theni"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        outline: "none",
                        fontWeight: 600,
                        color: "var(--sd-black)"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                      State <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={companyData.state}
                      onChange={handleCompanyChange}
                      placeholder="e.g. Tamil Nadu"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        outline: "none",
                        fontWeight: 600,
                        color: "var(--sd-black)"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                      Pincode <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      value={companyData.pincode}
                      onChange={handleCompanyChange}
                      placeholder="e.g. 625513"
                      maxLength={6}
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                        outline: "none",
                        fontWeight: 600,
                        color: "var(--sd-black)"
                      }}
                    />
                  </div>
                </div>

                {/* Row 5: Phone Number & GST Number */}
                <div className="form-grid-2col">
                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                      <Phone size={14} color="var(--sd-zinc-500)" />
                      <span>Phone Number</span>
                      <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="phonePrimary"
                      value={companyData.phonePrimary}
                      onChange={handleCompanyChange}
                      placeholder="e.g. +91 95666 59298"
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        outline: "none",
                        fontWeight: 600,
                        color: "var(--sd-black)"
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                      <Hash size={14} color="var(--sd-zinc-500)" />
                      <span>GST Number (GSTIN)</span>
                      <span style={{ color: "#DC2626" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="gstin"
                      value={companyData.gstin}
                      onChange={handleCompanyChange}
                      placeholder="e.g. 33ATDPV4802H1ZR"
                      maxLength={15}
                      required
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        fontFamily: "monospace",
                        letterSpacing: "0.5px",
                        outline: "none",
                        fontWeight: 700,
                        color: "var(--sd-black)",
                        textTransform: "uppercase"
                      }}
                    />
                  </div>
                </div>

                {/* Row 6: Brand Logo Upload Section */}
                <div style={{
                  border: "1px dashed var(--sd-zinc-300)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "var(--sd-zinc-50)"
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-800)", marginBottom: "10px" }}>
                    <ImageIcon size={15} color="var(--sd-zinc-600)" />
                    <span>Brand Logo</span>
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "10px",
                      background: "#FFFFFF",
                      border: "1px solid var(--sd-zinc-200)",
                      padding: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                    }}>
                      {logoPreviewUrl ? (
                        <img
                          src={logoPreviewUrl}
                          alt="Brand Logo Preview"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <ImageIcon size={32} color="var(--sd-zinc-400)" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: "180px" }}>
                      <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-600)", margin: "0 0 10px 0" }}>
                        Upload your business brand logo (PNG, JPG, SVG, or WEBP). Transparent PNG with 300x300px recommended.
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <label style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "7px 12px",
                          borderRadius: "8px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          background: "var(--sd-black)",
                          color: "#FFFFFF",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                        }}>
                          <Upload size={13} />
                          <span>{logoFile ? "Change Logo" : "Upload Brand Logo"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoFileSelect}
                            style={{ display: "none" }}
                          />
                        </label>

                        {logoFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreviewUrl(companyData.logoPath);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "7px 10px",
                              borderRadius: "8px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              background: "transparent",
                              color: "var(--sd-zinc-600)",
                              border: "1px solid var(--sd-zinc-300)",
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        )}

                        {companyData.logoPath !== "/images/logo/logo.png" && !logoFile && (
                          <button
                            type="button"
                            onClick={handleResetLogo}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "7px 10px",
                              borderRadius: "8px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              background: "transparent",
                              color: "var(--sd-zinc-600)",
                              border: "1px solid var(--sd-zinc-300)",
                              cursor: "pointer"
                            }}
                            title="Reset to default Spices Dabba logo"
                          >
                            <RefreshCw size={12} />
                            <span>Reset Default</span>
                          </button>
                        )}
                      </div>

                      {isUploadingLogo && (
                        <div style={{ marginTop: "10px" }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-600)", marginBottom: "4px" }}>
                            Uploading logo: {logoUploadProgress}%
                          </div>
                          <div style={{ width: "100%", height: "4px", background: "#E4E4E7", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${logoUploadProgress}%`, height: "100%", background: "var(--sd-black)", transition: "width 0.2s" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button
                    type="submit"
                    disabled={isSavingCompany || isUploadingLogo}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 22px",
                      borderRadius: "10px",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      background: "var(--sd-black)",
                      color: "#FFFFFF",
                      border: "none",
                      cursor: (isSavingCompany || isUploadingLogo) ? "not-allowed" : "pointer",
                      opacity: (isSavingCompany || isUploadingLogo) ? 0.7 : 1,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {isSavingCompany ? (
                      <>
                        <RefreshCw size={15} className="spin-animation" />
                        <span>Saving Details...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Company Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Live Invoice Header Preview Card */}
          <div style={{
            background: "#FFFFFF",
            border: "1px solid var(--sd-zinc-200)",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              background: "linear-gradient(to right, #FAFAFA, #FFFFFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={18} color="var(--sd-black)" />
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "var(--sd-black)" }}>
                  Live Invoice Header Preview
                </h3>
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#F4F4F5", padding: "3px 8px", borderRadius: "6px", color: "var(--sd-zinc-600)" }}>
                As rendered on Invoice
              </span>
            </div>

            <div style={{ padding: "20px" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", marginBottom: "14px" }}>
                This is how the invoice title, brand logo and sender address will appear on printed invoices and PDF bills:
              </p>

              {/* Mock Invoice Container */}
              <div style={{
                background: "#FFFFFF",
                border: "1px solid #D4D4D8",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
              }}>
                {/* Brand & Title Header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: "12px",
                  borderBottom: "2px solid #09090b",
                  marginBottom: "12px",
                  gap: "12px"
                }}>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{
                      width: "52px",
                      height: "52px",
                      border: "1px solid #E4E4E7",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                      background: "#FFFFFF"
                    }}>
                      <img
                        src={logoPreviewUrl || "/images/logo/logo.png"}
                        alt="Logo"
                        onError={(e) => { e.target.style.display = 'none'; }}
                        style={{ width: "95%", height: "95%", objectFit: "contain" }}
                      />
                    </div>

                    <div>
                      <h1 className="font-heading" style={{ fontSize: "1.35rem", fontWeight: 900, color: "#09090b", margin: 0, lineHeight: 1.1 }}>
                        {companyData.companyName || "JEES FOODS"}
                      </h1>
                      <div style={{ fontSize: "0.78rem", color: "#52525B", marginTop: "2px", fontWeight: 600 }}>
                        {companyData.brandName || "Spices Dabba"} &bull; We Prepare . You Cook
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{
                      background: "#09090b",
                      color: "#FFFFFF",
                      padding: "3px 10px",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.5px"
                    }}>
                      TAX INVOICE
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 800, fontFamily: "monospace", marginTop: "3px", color: "#09090b" }}>
                      #INV-2026-001
                    </div>
                  </div>
                </div>

                {/* FROM Address Box */}
                <div style={{
                  background: "#F8F9FA",
                  padding: "10px 12px",
                  borderRadius: "6px",
                  border: "1px solid #E4E4E7",
                  fontSize: "0.78rem"
                }}>
                  <div style={{ fontSize: "0.70rem", textTransform: "uppercase", fontWeight: 800, color: "#09090b", letterSpacing: "0.5px" }}>
                    From / Seller
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 800, color: "#09090b", marginTop: "2px" }}>
                    {companyData.companyName || "JEES FOODS"}
                  </div>
                  {companyData.brandName && (
                    <div style={{ fontSize: "0.74rem", fontWeight: 700, color: "#71717A" }}>
                      Brand: {companyData.brandName}
                    </div>
                  )}
                  <div style={{ color: "#52525B", marginTop: "2px", lineHeight: "1.35" }}>
                    Address: {previewCombinedAddress || "Door No. 12, Main Bazaar, Bodinayakanur, Theni District, Theni, Tamil Nadu - 625513"}
                  </div>
                  <div style={{ color: "#09090b", fontWeight: 600, marginTop: "2px" }}>
                    Phone: {companyData.phonePrimary || "+91 95666 59298"}
                  </div>
                  <div style={{ color: "#52525B", marginTop: "2px" }}>
                    GSTIN: <strong style={{ fontFamily: "monospace", color: "#09090b" }}>{companyData.gstin || "33ATDPV4802H1ZR"}</strong>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: "16px",
                padding: "12px 14px",
                borderRadius: "8px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                fontSize: "0.75rem",
                color: "#475569",
                lineHeight: 1.5
              }}>
                <strong>💡 Automatic Invoice Sync:</strong><br />
                Every change saved here updates in real time to the invoice generator, Spot Billing counter, A4 print layout, and WhatsApp bill messages.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PAYMENT DETAILS */}
      {activeSection === "payment-details" && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: "24px",
          alignItems: "start"
        }}>
          {/* Form Card */}
          <div style={{
            background: "#FFFFFF",
            border: "1px solid var(--sd-zinc-200)",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              background: "linear-gradient(to right, #FAFAFA, #FFFFFF)",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}>
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
                <CreditCard size={20} />
              </div>
              <div>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "var(--sd-black)" }}>
                  Bank & UPI Payment Details
                </h2>
                <p style={{ fontSize: "0.76rem", color: "var(--sd-zinc-500)", margin: "2px 0 0 0" }}>
                  Update company bank account and UPI QR code to display on invoices.
                </p>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} style={{ padding: "20px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Bank Name */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                    <Building size={14} color="var(--sd-zinc-500)" />
                    <span>Bank Name</span>
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={paymentData.bankName}
                    onChange={handlePaymentChange}
                    placeholder="e.g. Tamilnad Mercantile Bank"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      outline: "none",
                      fontWeight: 600,
                      color: "var(--sd-black)"
                    }}
                  />
                </div>

                {/* Account Name */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                    <User size={14} color="var(--sd-zinc-500)" />
                    <span>A/C Name (Account Holder)</span>
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={paymentData.accountName}
                    onChange={handlePaymentChange}
                    placeholder="e.g. SPICES DABBA"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      outline: "none",
                      fontWeight: 600,
                      color: "var(--sd-black)"
                    }}
                  />
                </div>

                {/* Account Number */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                    <Hash size={14} color="var(--sd-zinc-500)" />
                    <span>Account Number (A/C)</span>
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={paymentData.accountNumber}
                    onChange={handlePaymentChange}
                    placeholder="e.g. 180150050800432"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      fontFamily: "monospace",
                      letterSpacing: "0.5px",
                      outline: "none",
                      fontWeight: 600,
                      color: "var(--sd-black)"
                    }}
                  />
                </div>

                {/* IFSC Code */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                    <Hash size={14} color="var(--sd-zinc-500)" />
                    <span>IFSC Code</span>
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={paymentData.ifscCode}
                    onChange={handlePaymentChange}
                    placeholder="e.g. TMBL0000180"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      fontFamily: "monospace",
                      letterSpacing: "0.5px",
                      outline: "none",
                      fontWeight: 600,
                      color: "var(--sd-black)",
                      textTransform: "uppercase"
                    }}
                  />
                </div>

                {/* UPI ID / Details */}
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "6px" }}>
                    <CreditCard size={14} color="var(--sd-zinc-500)" />
                    <span>UPI ID / Details</span>
                  </label>
                  <input
                    type="text"
                    name="upiId"
                    value={paymentData.upiId}
                    onChange={handlePaymentChange}
                    placeholder="e.g. 9940159298 (Vaishno Devi)"
                    required
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--sd-zinc-300)",
                      fontSize: "0.85rem",
                      outline: "none",
                      fontWeight: 600,
                      color: "var(--sd-black)"
                    }}
                  />
                </div>

                {/* QR Code Image Upload Section */}
                <div style={{
                  border: "1px dashed var(--sd-zinc-300)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: "var(--sd-zinc-50)"
                }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.80rem", fontWeight: 700, color: "var(--sd-zinc-800)", marginBottom: "10px" }}>
                    <QrCode size={15} color="var(--sd-zinc-600)" />
                    <span>Payment QR Code Image</span>
                  </label>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
                    <div style={{
                      width: "90px",
                      height: "90px",
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      border: "1px solid var(--sd-zinc-200)",
                      padding: "4px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      flexShrink: 0
                    }}>
                      {qrPreviewUrl ? (
                        <img
                          src={qrPreviewUrl}
                          alt="QR Code Preview"
                          style={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <ImageIcon size={32} color="var(--sd-zinc-400)" />
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: "180px" }}>
                      <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-600)", margin: "0 0 10px 0" }}>
                        Upload your Google Pay / PhonePe / Paytm / UPI QR code image (PNG, JPG, or WEBP).
                      </p>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <label style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          padding: "7px 12px",
                          borderRadius: "8px",
                          fontSize: "0.78rem",
                          fontWeight: 700,
                          background: "var(--sd-black)",
                          color: "#FFFFFF",
                          cursor: "pointer",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.15)"
                        }}>
                          <Upload size={13} />
                          <span>{qrFile ? "Change Image" : "Upload New QR"}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleQrFileSelect}
                            style={{ display: "none" }}
                          />
                        </label>

                        {qrFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setQrFile(null);
                              setQrPreviewUrl(paymentData.qrCodePath);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "7px 10px",
                              borderRadius: "8px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              background: "transparent",
                              color: "var(--sd-zinc-600)",
                              border: "1px solid var(--sd-zinc-300)",
                              cursor: "pointer"
                            }}
                          >
                            Cancel
                          </button>
                        )}

                        {paymentData.qrCodePath !== "/images/upi-qr.jpg" && !qrFile && (
                          <button
                            type="button"
                            onClick={handleResetQr}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "7px 10px",
                              borderRadius: "8px",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              background: "transparent",
                              color: "var(--sd-zinc-600)",
                              border: "1px solid var(--sd-zinc-300)",
                              cursor: "pointer"
                            }}
                            title="Reset to default QR image"
                          >
                            <RefreshCw size={12} />
                            <span>Reset</span>
                          </button>
                        )}
                      </div>

                      {isUploadingQr && (
                        <div style={{ marginTop: "10px" }}>
                          <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-600)", marginBottom: "4px" }}>
                            Uploading image: {qrUploadProgress}%
                          </div>
                          <div style={{ width: "100%", height: "4px", background: "#E4E4E7", borderRadius: "2px", overflow: "hidden" }}>
                            <div style={{ width: `${qrUploadProgress}%`, height: "100%", background: "var(--sd-black)", transition: "width 0.2s" }} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                  <button
                    type="submit"
                    disabled={isSavingPayment || isUploadingQr}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "10px 22px",
                      borderRadius: "10px",
                      fontSize: "0.85rem",
                      fontWeight: 800,
                      background: "var(--sd-black)",
                      color: "#FFFFFF",
                      border: "none",
                      cursor: (isSavingPayment || isUploadingQr) ? "not-allowed" : "pointer",
                      opacity: (isSavingPayment || isUploadingQr) ? 0.7 : 1,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {isSavingPayment ? (
                      <>
                        <RefreshCw size={15} className="spin-animation" />
                        <span>Saving Changes...</span>
                      </>
                    ) : (
                      <>
                        <Save size={15} />
                        <span>Save Payment Settings</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Live Invoice Preview Box */}
          <div style={{
            background: "#FFFFFF",
            border: "1px solid var(--sd-zinc-200)",
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            overflow: "hidden"
          }}>
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--sd-zinc-200)",
              background: "linear-gradient(to right, #FAFAFA, #FFFFFF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Eye size={18} color="var(--sd-black)" />
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: 0, color: "var(--sd-black)" }}>
                  Live Invoice Preview
                </h3>
              </div>
              <span style={{ fontSize: "0.72rem", fontWeight: 700, background: "#F4F4F5", padding: "3px 8px", borderRadius: "6px", color: "var(--sd-zinc-600)" }}>
                As seen on Invoice
              </span>
            </div>

            <div style={{ padding: "24px 20px" }}>
              <p style={{ fontSize: "0.75rem", color: "var(--sd-zinc-500)", marginBottom: "14px" }}>
                This is the exact layout rendered at the footer of customer tax invoices and generated PDFs:
              </p>

              {/* Simulated Invoice Payment Card */}
              <div style={{
                background: "#FAFAFA",
                border: "1px solid #E4E4E7",
                borderRadius: "10px",
                padding: "14px 16px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.02)"
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap"
                }}>
                  <div style={{ fontSize: "0.80rem", color: "#18181b", lineHeight: 1.55 }}>
                    <div style={{ fontWeight: 800, color: "#09090b", textTransform: "uppercase", fontSize: "0.74rem", marginBottom: "5px", letterSpacing: "0.4px" }}>
                      Bank & UPI Payment Details
                    </div>
                    <div><strong>Bank:</strong> {paymentData.bankName || "Tamilnad Mercantile Bank"}</div>
                    <div><strong>A/C Name:</strong> {paymentData.accountName || "SPICES DABBA"}</div>
                    <div><strong>A/C:</strong> {paymentData.accountNumber || "180150050800432"}</div>
                    <div><strong>IFSC:</strong> {paymentData.ifscCode || "TMBL0000180"}</div>
                    <div><strong>UPI:</strong> {paymentData.upiId || "9940159298 (Vaishno Devi)"}</div>
                  </div>

                  <div style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    background: "#FFFFFF",
                    padding: "5px 7px",
                    borderRadius: "6px",
                    border: "1px solid #D4D4D8",
                    flexShrink: 0
                  }}>
                    <img
                      src={qrPreviewUrl || "/images/upi-qr.jpg"}
                      alt="UPI QR Code"
                      style={{ width: "80px", height: "80px", objectFit: "contain", display: "block" }}
                    />
                    <span style={{ fontSize: "0.62rem", fontWeight: 800, color: "#09090b", marginTop: "3px" }}>
                      Scan & Pay (UPI)
                    </span>
                  </div>
                </div>
              </div>

              <div style={{
                marginTop: "18px",
                padding: "12px 14px",
                borderRadius: "8px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                fontSize: "0.76rem",
                color: "#475569",
                lineHeight: 1.5
              }}>
                <strong>💡 WhatsApp Sharing Note:</strong><br />
                When you send invoices via WhatsApp, these bank and UPI details are automatically formatted and appended into the message text so customers can pay with a single click.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
