import React, { useState } from "react";
import { usePOS } from "../context/POSContext";
import { useAuth } from "../context/AuthContext";
import StaffManager from "./StaffManager";
import { 
  CreditCard, 
  Upload, 
  Check, 
  RefreshCw, 
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
  Users,
  FileText,
  Plus,
  Search,
  Edit2,
  CheckCircle2,
  Star,
  X,
  Mail,
  Tag
} from "lucide-react";
import { compressImage, uploadProductImage } from "../utils/imageCompressor";

const BLANK_COMPANY = {
  businessName: "",
  invoiceStartingName: "",
  invoicePrefix: "",
  isDefault: false,
  companyName: "",
  brandName: "",
  address1: "",
  address2: "",
  city: "",
  state: "Tamil Nadu",
  pincode: "",
  address: "",
  phonePrimary: "",
  phoneSecondary: "",
  email: "",
  gstin: "",
  logoPath: "/images/logo/logo.png",
  bankName: "",
  accountName: "",
  accountNumber: "",
  ifscCode: "",
  upiId: "",
  upiHolder: "",
  qrCodePath: "/images/upi-qr.jpg"
};

// Helper: Convert File or Blob to persistent Base64 Data URL (never expires, no CORS issues)
const fileToDataUrl = (fileOrBlob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(fileOrBlob);
  });
};

export default function SettingsManager() {
  const { 
    businesses = [], 
    defaultBusiness, 
    addBusiness, 
    updateBusiness, 
    deleteBusiness, 
    setDefaultBusiness,
    showConfirmModal 
  } = usePOS();
  
  const { currentUser, logout, isSuperAdmin } = useAuth();

  const [activeSection, setActiveSection] = useState("companies-listing");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedback, setFeedback] = useState(null);

  // Add/Edit Company Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBizId, setEditingBizId] = useState(null);
  const [formData, setFormData] = useState(BLANK_COMPANY);

  // Logo upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("/images/logo/logo.png");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  // QR upload state
  const [qrFile, setQrFile] = useState(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState("/images/upi-qr.jpg");
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const showNotification = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 4000);
  };

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

  // Open modal to add new company
  const handleOpenAddModal = () => {
    setEditingBizId(null);
    setFormData({
      ...BLANK_COMPANY,
      isDefault: businesses.length === 0
    });
    setLogoFile(null);
    setLogoPreviewUrl("/images/logo/logo.png");
    setQrFile(null);
    setQrPreviewUrl("/images/upi-qr.jpg");
    setFormError("");
    setIsModalOpen(true);
  };

  // Open modal to edit existing company
  const handleOpenEditModal = (biz) => {
    setEditingBizId(biz.id);
    setFormData({
      businessName: biz.businessName || "",
      invoiceStartingName: biz.invoicePrefix || biz.invoiceStartingName || "SBD",
      invoicePrefix: biz.invoicePrefix || biz.invoiceStartingName || "SBD",
      isDefault: Boolean(biz.isDefault),
      companyName: biz.companyName || biz.manufacturer || "",
      brandName: biz.brandName || biz.name || "",
      address1: biz.address1 || "",
      address2: biz.address2 || "",
      city: biz.city || "",
      state: biz.state || "Tamil Nadu",
      pincode: biz.pincode || "",
      address: biz.address || "",
      phonePrimary: biz.phonePrimary || biz.phone || "",
      phoneSecondary: biz.phoneSecondary || "",
      email: biz.email || "",
      gstin: biz.gstin || "",
      logoPath: biz.logoPath || "/images/logo/logo.png",
      bankName: biz.bankName || "",
      accountName: biz.accountName || "",
      accountNumber: biz.accountNumber || "",
      ifscCode: biz.ifscCode || "",
      upiId: biz.upiId || "",
      upiHolder: biz.upiHolder || "",
      qrCodePath: biz.qrCodePath || "/images/upi-qr.jpg"
    });
    setLogoFile(null);
    setLogoPreviewUrl(biz.logoPath || "/images/logo/logo.png");
    setQrFile(null);
    setQrPreviewUrl(biz.qrCodePath || "/images/upi-qr.jpg");
    setFormError("");
    setIsModalOpen(true);
  };

  // Handle Logo file select
  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file (PNG, JPG, WebP) for the company logo.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setLogoPreviewUrl(dataUrl);
      setLogoFile(file);
      setFormError("");
    } catch (err) {
      console.error("Logo file preview error:", err);
    }
  };

  // Handle QR code file select
  const handleQrFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file (PNG, JPG, WebP) for the UPI QR code.");
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      setQrPreviewUrl(dataUrl);
      setQrFile(file);
      setFormError("");
    } catch (err) {
      console.error("QR code file preview error:", err);
    }
  };

  // Save Company Form (Add or Edit)
  const handleSaveCompany = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setFormError("");

    const bName = (formData.businessName || "").trim();
    const invPrefix = (formData.invoiceStartingName || formData.invoicePrefix || "").trim().toUpperCase();
    const compName = (formData.companyName || "").trim() || bName;

    if (!bName) {
      setFormError("Please enter a Business Name (e.g. B1 – Masalas / B2 – Juices / B3 - Others).");
      return;
    }

    if (!invPrefix) {
      setFormError("Please enter an Invoice Starting Name (e.g. SBD / JUC / OTH).");
      return;
    }

    setIsSaving(true);
    try {
      let finalLogoPath = formData.logoPath || "/images/logo/logo.png";
      let finalQrPath = formData.qrCodePath || "/images/upi-qr.jpg";

      // Upload Logo if new file selected
      if (logoFile) {
        setIsUploadingLogo(true);
        try {
          const compressed = await compressImage(logoFile, {
            maxWidth: 600,
            maxHeight: 600,
            quality: 0.85,
            outputFormat: "image/webp"
          });
          const base64DataUrl = await fileToDataUrl(compressed.blob || logoFile);

          // Try uploading compressed file to Firebase Storage
          try {
            const uploadRes = await uploadProductImage(compressed.file, "brand_logo");
            if (uploadRes && uploadRes.url) {
              finalLogoPath = uploadRes.url;
            } else {
              finalLogoPath = base64DataUrl;
            }
          } catch (storageErr) {
            console.warn("Storage upload note, saving permanent base64 image:", storageErr.message);
            finalLogoPath = base64DataUrl;
          }
        } catch (compErr) {
          console.warn("Image compression error, saving original base64:", compErr);
          finalLogoPath = await fileToDataUrl(logoFile);
        } finally {
          setIsUploadingLogo(false);
        }
      }

      // Upload QR Code if new file selected
      if (qrFile) {
        setIsUploadingQr(true);
        try {
          const compressed = await compressImage(qrFile, {
            maxWidth: 600,
            maxHeight: 600,
            quality: 0.85,
            outputFormat: "image/webp"
          });
          const base64DataUrl = await fileToDataUrl(compressed.blob || qrFile);

          // Try uploading compressed file to Firebase Storage
          try {
            const uploadRes = await uploadProductImage(compressed.file, "settings");
            if (uploadRes && uploadRes.url) {
              finalQrPath = uploadRes.url;
            } else {
              finalQrPath = base64DataUrl;
            }
          } catch (storageErr) {
            console.warn("QR storage upload note, saving permanent base64 image:", storageErr.message);
            finalQrPath = base64DataUrl;
          }
        } catch (compErr) {
          console.warn("QR compression error, saving original base64:", compErr);
          finalQrPath = await fileToDataUrl(qrFile);
        } finally {
          setIsUploadingQr(false);
        }
      }

      // Defensive check: NEVER allow temporary blob URLs in Firestore
      if (finalLogoPath && finalLogoPath.startsWith("blob:")) {
        finalLogoPath = "/images/logo/logo.png";
      }
      if (finalQrPath && finalQrPath.startsWith("blob:")) {
        finalQrPath = "/images/upi-qr.jpg";
      }

      // Format full address
      const addrComponents = [
        (formData.address1 || "").trim(),
        (formData.address2 || "").trim(),
        (formData.city || "").trim(),
        formData.state ? (formData.pincode ? `${(formData.state || "").trim()} - ${(formData.pincode || "").trim()}` : (formData.state || "").trim()) : (formData.pincode || "").trim()
      ].filter(Boolean);
      const combinedAddress = addrComponents.length > 0 ? addrComponents.join(", ") : (formData.address || "");

      const payload = {
        businessName: bName,
        invoicePrefix: invPrefix,
        invoiceStartingName: invPrefix,
        isDefault: Boolean(formData.isDefault),
        companyName: compName,
        brandName: (formData.brandName || "").trim() || compName,
        address1: (formData.address1 || "").trim(),
        address2: (formData.address2 || "").trim(),
        city: (formData.city || "").trim(),
        state: (formData.state || "Tamil Nadu").trim(),
        pincode: (formData.pincode || "").trim(),
        address: combinedAddress,
        phonePrimary: (formData.phonePrimary || "").trim(),
        phoneSecondary: (formData.phoneSecondary || "").trim(),
        email: (formData.email || "").trim(),
        gstin: (formData.gstin || "").trim().toUpperCase(),
        logoPath: finalLogoPath,
        bankName: (formData.bankName || "").trim(),
        accountName: (formData.accountName || "").trim(),
        accountNumber: (formData.accountNumber || "").trim(),
        ifscCode: (formData.ifscCode || "").trim().toUpperCase(),
        upiId: (formData.upiId || "").trim(),
        upiHolder: (formData.upiHolder || "").trim(),
        qrCodePath: finalQrPath
      };

      if (editingBizId) {
        await updateBusiness(editingBizId, payload);
        showNotification(`Company "${bName}" updated successfully!`);
      } else {
        await addBusiness(payload);
        showNotification(`New Company "${bName}" added successfully!`);
      }

      setIsModalOpen(false);
      setEditingBizId(null);
    } catch (err) {
      console.error("Save company error:", err);
      setFormError(err.message || "Failed to save company details.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete business with confirmation
  const handleDeleteBusiness = async (biz) => {
    if (businesses.length <= 1) {
      showNotification("Cannot delete the only remaining company. At least one business must exist.", "error");
      return;
    }

    const confirmed = await showConfirmModal({
      title: "Confirm Delete Company (நிறுவனத்தை நீக்கு)",
      message: `Are you sure you want to permanently delete "${biz.businessName}" (${biz.companyName || biz.invoicePrefix})? This action cannot be undone.`,
      confirmText: "Yes, Delete Company",
      cancelText: "Cancel",
      isDanger: true
    });

    if (confirmed) {
      try {
        await deleteBusiness(biz.id);
        showNotification(`Company "${biz.businessName}" deleted successfully.`);
      } catch (err) {
        showNotification(err.message || "Failed to delete company.", "error");
      }
    }
  };

  // Set as default
  const handleSetDefault = async (biz) => {
    try {
      await setDefaultBusiness(biz.id);
      showNotification(`"${biz.businessName}" is now the default business entity!`);
    } catch (err) {
      showNotification(err.message || "Failed to set default business.", "error");
    }
  };

  // Filter businesses by search query
  const filteredBusinesses = businesses.filter(b => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (b.businessName && b.businessName.toLowerCase().includes(q)) ||
      (b.invoicePrefix && b.invoicePrefix.toLowerCase().includes(q)) ||
      (b.companyName && b.companyName.toLowerCase().includes(q)) ||
      (b.brandName && b.brandName.toLowerCase().includes(q)) ||
      (b.gstin && b.gstin.toLowerCase().includes(q)) ||
      (b.phonePrimary && b.phonePrimary.toLowerCase().includes(q)) ||
      (b.city && b.city.toLowerCase().includes(q))
    );
  });

  return (
    <div className="responsive-page-container" style={{ padding: "16px 20px 40px" }}>
      {/* Top Banner / Navigation */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        flexWrap: "wrap",
        marginBottom: "20px"
      }}>
        {/* Navigation Tabs */}
        <div style={{
          display: "flex",
          background: "var(--sd-zinc-100)",
          padding: "3px",
          borderRadius: "12px",
          border: "1px solid var(--sd-zinc-200)",
          gap: "3px",
          overflowX: "auto",
          maxWidth: "100%"
        }}>
          {/* Tab 1: Company Directory Listing */}
          <button
            type="button"
            onClick={() => setActiveSection("companies-listing")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: activeSection === "companies-listing" ? 800 : 600,
              background: activeSection === "companies-listing" ? "var(--sd-black)" : "transparent",
              color: activeSection === "companies-listing" ? "#FFFFFF" : "var(--sd-zinc-700)",
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              boxShadow: activeSection === "companies-listing" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap"
            }}
          >
            <Building2 size={15} />
            <span>Company Details (நிறுவனங்கள்)</span>
          </button>

          {/* Tab 2: Staff & Permissions */}
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setActiveSection("staff-management")}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: activeSection === "staff-management" ? 800 : 600,
                background: activeSection === "staff-management" ? "var(--sd-black)" : "transparent",
                color: activeSection === "staff-management" ? "#FFFFFF" : "var(--sd-zinc-700)",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "7px",
                boxShadow: activeSection === "staff-management" ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                transition: "all 0.15s ease",
                whiteSpace: "nowrap"
              }}
            >
              <Users size={15} />
              <span>Staff & Permissions (ஊழியர்கள்)</span>
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Feedback notification toast */}
          {feedback && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.80rem",
              fontWeight: 700,
              background: feedback.type === "success" ? "#ECFDF5" : "#FEF2F2",
              color: feedback.type === "success" ? "#065F46" : "#991B1B",
              border: `1px solid ${feedback.type === "success" ? "#A7F3D0" : "#FECACA"}`
            }}>
              {feedback.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Quick Logout Button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "#FEF2F2",
              color: "#DC2626",
              border: "1px solid #FECACA",
              borderRadius: "8px",
              padding: "7px 14px",
              fontSize: "0.80rem",
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
            title="Log Out with confirmation"
          >
            <LogOut size={14} />
            <span>Log Out</span>
          </button>
        </div>
      </div>

      {/* VIEW: STAFF MANAGEMENT */}
      {activeSection === "staff-management" && isSuperAdmin && (
        <StaffManager />
      )}

      {/* VIEW: COMPANY DETAILS LISTING PAGE */}
      {activeSection === "companies-listing" && (
        <div>
          {/* Header Action Bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "18px",
            background: "#FFFFFF",
            padding: "16px 20px",
            borderRadius: "14px",
            border: "1px solid var(--sd-zinc-200)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
          }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", fontWeight: 900, color: "var(--sd-black)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={22} color="var(--sd-red)" />
                <span>Company & Business Directory</span>
              </h2>
              <p style={{ fontSize: "0.78rem", color: "var(--sd-zinc-500)", margin: "3px 0 0 0" }}>
                Manage multiple business entities, invoice starting prefixes, company profile & banking details.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              {/* Search Bar */}
              <div style={{ position: "relative", minWidth: "220px" }}>
                <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--sd-zinc-400)" }} />
                <input
                  type="text"
                  placeholder="Search company or prefix..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 12px 8px 32px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    fontSize: "0.80rem",
                    outline: "none"
                  }}
                />
              </div>

              {/* Add New Company Button */}
              <button
                type="button"
                onClick={handleOpenAddModal}
                style={{
                  background: "var(--sd-red)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  padding: "8px 16px",
                  fontSize: "0.82rem",
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(107, 20, 20, 0.25)"
                }}
              >
                <Plus size={16} />
                <span>Add New Company</span>
              </button>
            </div>
          </div>

          {/* Companies Cards Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 380px), 1fr))",
            gap: "18px"
          }}>
            {filteredBusinesses.map((biz) => {
              const isDefault = Boolean(biz.isDefault);
              return (
                <div
                  key={biz.id}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "14px",
                    border: isDefault ? "2px solid var(--sd-red)" : "1px solid var(--sd-zinc-200)",
                    boxShadow: isDefault ? "0 4px 14px rgba(107, 20, 20, 0.08)" : "0 2px 8px rgba(0,0,0,0.04)",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column"
                  }}
                >
                  {/* Card Header */}
                  <div style={{
                    padding: "14px 16px",
                    background: isDefault ? "var(--sd-red-subtle)" : "var(--sd-zinc-50)",
                    borderBottom: `1px solid ${isDefault ? "var(--sd-red-border)" : "var(--sd-zinc-200)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "8px",
                        background: "#FFFFFF",
                        border: "1px solid var(--sd-zinc-200)",
                        padding: "3px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        flexShrink: 0
                      }}>
                        <img
                          src={biz.logoPath || "/images/logo/logo.png"}
                          alt="Logo"
                          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                          onError={(e) => { e.currentTarget.src = "/images/logo/logo.png"; }}
                        />
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.95rem", fontWeight: 900, color: "var(--sd-black)" }}>
                            {biz.businessName || "Unnamed Business"}
                          </span>
                          {isDefault && (
                            <span style={{
                              background: "#059669",
                              color: "#FFFFFF",
                              fontSize: "0.65rem",
                              fontWeight: 800,
                              padding: "2px 6px",
                              borderRadius: "99px",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px"
                            }}>
                              <Star size={10} fill="#FFFFFF" />
                              <span>Default</span>
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--sd-zinc-600)", marginTop: "2px" }}>
                          {biz.companyName || "JEES FOODS"} {biz.brandName ? `(${biz.brandName})` : ""}
                        </div>
                      </div>
                    </div>

                    {/* Invoice Starting Name Badge */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <span style={{
                        background: "var(--sd-black)",
                        color: "#FFFFFF",
                        fontSize: "0.75rem",
                        fontWeight: 900,
                        padding: "4px 8px",
                        borderRadius: "6px",
                        letterSpacing: "0.5px",
                        display: "inline-block"
                      }}
                      title="Invoice Starting Name used for sequential billing"
                      >
                        {biz.invoicePrefix || "SBD"}
                      </span>
                      <div style={{ fontSize: "0.65rem", color: "var(--sd-zinc-500)", marginTop: "2px", fontWeight: 700 }}>
                        Prefix
                      </div>
                    </div>
                  </div>

                  {/* Card Body Details */}
                  <div style={{ padding: "14px 16px", flex: 1, display: "flex", flexDirection: "column", gap: "10px", fontSize: "0.78rem" }}>
                    {/* Tax & Contact */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <div>
                        <span style={{ color: "var(--sd-zinc-500)", display: "block", fontSize: "0.70rem", fontWeight: 700 }}>GSTIN</span>
                        <strong style={{ fontFamily: "monospace", color: "var(--sd-black)" }}>{biz.gstin || "N/A"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--sd-zinc-500)", display: "block", fontSize: "0.70rem", fontWeight: 700 }}>Phone</span>
                        <strong style={{ color: "var(--sd-black)" }}>{biz.phonePrimary || "N/A"}</strong>
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <span style={{ color: "var(--sd-zinc-500)", display: "block", fontSize: "0.70rem", fontWeight: 700 }}>Billing Address</span>
                      <span style={{ color: "var(--sd-zinc-700)", lineHeight: 1.3 }}>
                        {biz.address || [biz.address1, biz.city, biz.state].filter(Boolean).join(", ") || "N/A"}
                      </span>
                    </div>

                    {/* Payment Info Box */}
                    <div style={{
                      background: "var(--sd-zinc-50)",
                      borderRadius: "8px",
                      padding: "10px",
                      border: "1px solid var(--sd-zinc-200)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "10px"
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: "0.70rem", fontWeight: 800, color: "var(--sd-zinc-600)", textTransform: "uppercase" }}>
                          Bank & UPI
                        </div>
                        <div style={{ fontWeight: 800, color: "var(--sd-black)", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {biz.bankName || "No Bank Configured"}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-600)", fontFamily: "monospace" }}>
                          A/C: {biz.accountNumber || "N/A"} | IFSC: {biz.ifscCode || "N/A"}
                        </div>
                        {biz.upiId && (
                          <div style={{ fontSize: "0.72rem", color: "var(--sd-red)", fontWeight: 700, marginTop: "2px" }}>
                            UPI: {biz.upiId} {biz.upiHolder ? `(${biz.upiHolder})` : ""}
                          </div>
                        )}
                      </div>

                      {/* QR Thumbnail */}
                      {biz.qrCodePath && (
                        <div style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "6px",
                          border: "1px solid var(--sd-zinc-300)",
                          background: "#FFFFFF",
                          padding: "2px",
                          flexShrink: 0,
                          overflow: "hidden"
                        }}>
                          <img
                            src={biz.qrCodePath}
                            alt="QR"
                            style={{ width: "100%", height: "100%", objectFit: "contain" }}
                            onError={(e) => { e.currentTarget.src = "/images/upi-qr.jpg"; }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div style={{
                    padding: "10px 16px",
                    borderTop: "1px solid var(--sd-zinc-200)",
                    background: "var(--sd-zinc-50)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {!isDefault && (
                        <button
                          type="button"
                          onClick={() => handleSetDefault(biz)}
                          style={{
                            background: "#FFFFFF",
                            border: "1px solid var(--sd-zinc-300)",
                            color: "var(--sd-zinc-700)",
                            borderRadius: "6px",
                            padding: "4px 8px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                          title="Make this the primary default business"
                        >
                          <Star size={12} />
                          <span>Make Default</span>
                        </button>
                      )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(biz)}
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid var(--sd-zinc-300)",
                          color: "var(--sd-black)",
                          borderRadius: "6px",
                          padding: "5px 12px",
                          fontSize: "0.74rem",
                          fontWeight: 800,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Edit Details</span>
                      </button>

                      {businesses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteBusiness(biz)}
                          style={{
                            background: "#FEF2F2",
                            border: "1px solid #FECACA",
                            color: "#DC2626",
                            borderRadius: "6px",
                            padding: "5px 8px",
                            fontSize: "0.74rem",
                            cursor: "pointer"
                          }}
                          title="Delete Company"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredBusinesses.length === 0 && (
              <div style={{
                gridColumn: "1 / -1",
                padding: "40px 20px",
                textAlign: "center",
                background: "#FFFFFF",
                borderRadius: "14px",
                border: "1px dashed var(--sd-zinc-300)"
              }}>
                <Building2 size={32} color="var(--sd-zinc-400)" style={{ margin: "0 auto 10px" }} />
                <h4 style={{ margin: 0, fontWeight: 800, color: "var(--sd-black)" }}>No Companies Found</h4>
                <p style={{ margin: "4px 0 14px", fontSize: "0.80rem", color: "var(--sd-zinc-500)" }}>
                  {searchQuery ? `No companies match "${searchQuery}".` : "No businesses added yet."}
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  style={{
                    background: "var(--sd-red)",
                    color: "#FFFFFF",
                    border: "none",
                    borderRadius: "8px",
                    padding: "8px 16px",
                    fontSize: "0.80rem",
                    fontWeight: 800,
                    cursor: "pointer"
                  }}
                >
                  + Add New Company
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* ADD / EDIT COMPANY MODAL (Full Company, Invoice & Payment) */}
      {/* ========================================================= */}
      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px"
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "760px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              background: "linear-gradient(to right, var(--sd-zinc-900), var(--sd-black))",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Building2 size={20} color="var(--sd-red)" />
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900 }}>
                    {editingBizId ? "Edit Company & Invoice Details" : "Add New Company"}
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.74rem", color: "var(--sd-zinc-300)" }}>
                    Define Business Name, unique Invoice Starting Prefix, and Banking Setup.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--sd-zinc-400)",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveCompany} noValidate style={{ padding: "20px", overflowY: "auto", flex: 1 }}>
              {formError && (
                <div style={{
                  background: "#FEF2F2",
                  border: "1px solid #FCA5A5",
                  color: "#991B1B",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.80rem",
                  marginBottom: "16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}>
                  <AlertCircle size={15} />
                  <span>{formError}</span>
                </div>
              )}

              {/* SECTION 1: BUSINESS IDENTIFICATION & INVOICE PREFIX */}
              <div style={{
                background: "var(--sd-zinc-50)",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "18px"
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-red)", textTransform: "uppercase", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Tag size={14} />
                  <span>1. Business Identification & Invoice Starting Prefix</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
                  {/* Field 1: Business Name */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-800)", marginBottom: "4px" }}>
                      Business Name <span style={{ color: "var(--sd-red)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. B1 – Masalas / B2 – Juices / B3 - Others"
                      value={formData.businessName || ""}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        outline: "none"
                      }}
                    />
                    <span style={{ fontSize: "0.70rem", color: "var(--sd-zinc-500)", marginTop: "2px", display: "block" }}>
                      Appears in Spot Billing, Purchases & Expenses, and Orders dropdown filters.
                    </span>
                  </div>

                  {/* Field 2: Invoice Starting Name */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-800)", marginBottom: "4px" }}>
                      Invoice Starting Name <span style={{ color: "var(--sd-red)" }}>*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="e.g. SBD / JUC / OTH"
                      value={formData.invoiceStartingName || formData.invoicePrefix || ""}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "");
                        setFormData({ ...formData, invoiceStartingName: val, invoicePrefix: val });
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--sd-zinc-300)",
                        fontSize: "0.85rem",
                        fontWeight: 900,
                        letterSpacing: "1px",
                        fontFamily: "monospace",
                        outline: "none"
                      }}
                    />
                    <span style={{ fontSize: "0.70rem", color: "var(--sd-zinc-500)", marginTop: "2px", display: "block" }}>
                      Prefix for invoice numbers: {formData.invoiceStartingName || formData.invoicePrefix || "SBD"}/26-27/0001
                    </span>
                  </div>
                </div>

                {/* Default business toggle */}
                <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="checkbox"
                    id="isDefaultBiz"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    style={{ width: "16px", height: "16px", accentColor: "var(--sd-red)", cursor: "pointer" }}
                  />
                  <label htmlFor="isDefaultBiz" style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--sd-zinc-700)", cursor: "pointer" }}>
                    Set as Default Business Entity (முதன்மை நிறுவனம்)
                  </label>
                </div>
              </div>

              {/* SECTION 2: COMPANY & INVOICE DETAILS */}
              <div style={{
                background: "#FFFFFF",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "18px"
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", textTransform: "uppercase", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building size={14} />
                  <span>2. Company & Invoice Details</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Company / Legal Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. JEES FOODS (Defaults to Business Name if blank)"
                      value={formData.companyName || ""}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Brand / Trading Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Spices Dabba"
                      value={formData.brandName || ""}
                      onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Phone (Primary)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 95666 59298"
                      value={formData.phonePrimary || ""}
                      onChange={(e) => setFormData({ ...formData, phonePrimary: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Secondary Phone (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +91 98408 39699"
                      value={formData.phoneSecondary || ""}
                      onChange={(e) => setFormData({ ...formData, phoneSecondary: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Email Address
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. hello@spicesdabba.com"
                      value={formData.email || ""}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      GSTIN Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 33ATDPV4802H1ZR"
                      value={formData.gstin || ""}
                      onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none", fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                {/* Address Row */}
                <div style={{ marginTop: "12px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", marginBottom: "2px" }}>
                      Address Line 1
                    </label>
                    <input
                      type="text"
                      placeholder="Door No. 12, Main Street"
                      value={formData.address1}
                      onChange={(e) => setFormData({ ...formData, address1: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.80rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", marginBottom: "2px" }}>
                      Address Line 2 (Area/Locality)
                    </label>
                    <input
                      type="text"
                      placeholder="Bodinayakanur, Theni"
                      value={formData.address2}
                      onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.80rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", marginBottom: "2px" }}>
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="Theni"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.80rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 700, color: "var(--sd-zinc-600)", marginBottom: "2px" }}>
                      Pincode
                    </label>
                    <input
                      type="text"
                      placeholder="625513"
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.80rem", outline: "none" }}
                    />
                  </div>
                </div>

                {/* Logo Upload Box */}
                <div style={{ marginTop: "14px", borderTop: "1px solid var(--sd-zinc-100)", paddingTop: "12px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    background: "#FFFFFF",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}>
                    <img
                      src={logoPreviewUrl}
                      alt="Logo Preview"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      onError={(e) => { e.currentTarget.src = "/images/logo/logo.png"; }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Company Logo Image
                    </label>
                    <label style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "var(--sd-zinc-100)",
                      border: "1px solid var(--sd-zinc-300)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}>
                      <Upload size={13} />
                      <span>{logoFile ? logoFile.name : "Choose Logo Image..."}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileChange}
                        style={{ display: "none" }}
                      />
                    </label>
                    <span style={{ fontSize: "0.68rem", color: "var(--sd-zinc-500)", display: "block", marginTop: "3px" }}>
                      Recommended: Transparent PNG or high-res JPG. Displayed on bills and WhatsApp invoices.
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 3: PAYMENT & BANKING DETAILS */}
              <div style={{
                background: "#FFFFFF",
                border: "1px solid var(--sd-zinc-200)",
                borderRadius: "12px",
                padding: "16px"
              }}>
                <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "var(--sd-zinc-700)", textTransform: "uppercase", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <CreditCard size={14} />
                  <span>3. Payment & Banking Details</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Bank Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Tamilnad Mercantile Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      A/C Name (Account Holder)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SPICES DABBA"
                      value={formData.accountName}
                      onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      Account Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 180150050800432"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none", fontFamily: "monospace" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      IFSC Code
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TMBL0000180"
                      value={formData.ifscCode}
                      onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value.toUpperCase() })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none", fontFamily: "monospace" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      UPI ID / VPA
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9940159298@okaxis"
                      value={formData.upiId}
                      onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      UPI Payee Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Vaishno Devi"
                      value={formData.upiHolder}
                      onChange={(e) => setFormData({ ...formData, upiHolder: e.target.value })}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: "8px", border: "1px solid var(--sd-zinc-300)", fontSize: "0.82rem", outline: "none" }}
                    />
                  </div>
                </div>

                {/* QR Code Upload Box */}
                <div style={{ marginTop: "14px", borderTop: "1px solid var(--sd-zinc-100)", paddingTop: "12px", display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
                  <div style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "8px",
                    border: "1px solid var(--sd-zinc-300)",
                    background: "#FFFFFF",
                    padding: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden"
                  }}>
                    <img
                      src={qrPreviewUrl}
                      alt="UPI QR Preview"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                      onError={(e) => { e.currentTarget.src = "/images/upi-qr.jpg"; }}
                    />
                  </div>

                  <div style={{ flex: 1, minWidth: "200px" }}>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "var(--sd-zinc-700)", marginBottom: "3px" }}>
                      UPI QR Code Image
                    </label>
                    <label style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "var(--sd-zinc-100)",
                      border: "1px solid var(--sd-zinc-300)",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}>
                      <Upload size={13} />
                      <span>{qrFile ? qrFile.name : "Choose QR Image..."}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleQrFileChange}
                        style={{ display: "none" }}
                      />
                    </label>
                    <span style={{ fontSize: "0.68rem", color: "var(--sd-zinc-500)", display: "block", marginTop: "3px" }}>
                      Will be printed on invoices so customers can scan & pay instantly.
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{
                marginTop: "20px",
                paddingTop: "16px",
                borderTop: "1px solid var(--sd-zinc-200)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: "10px"
              }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--sd-zinc-300)",
                    color: "var(--sd-zinc-700)",
                    padding: "9px 18px",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 700,
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    background: "var(--sd-red)",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "9px 22px",
                    borderRadius: "8px",
                    fontSize: "0.82rem",
                    fontWeight: 800,
                    cursor: isSaving ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    boxShadow: "0 2px 6px rgba(107, 20, 20, 0.25)"
                  }}
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="spin-animation" />
                      <span>Saving Company...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>{editingBizId ? "Update Company" : "Save Company"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
