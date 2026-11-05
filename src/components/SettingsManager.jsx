import React, { useState, useEffect } from "react";
import { usePOS } from "../context/POSContext";
import { 
  CreditCard, 
  Upload, 
  Check, 
  RefreshCw, 
  Eye, 
  Image as ImageIcon, 
  AlertCircle,
  Building,
  Hash,
  User,
  QrCode,
  Save,
  Trash2
} from "lucide-react";
import { compressImage, uploadProductImage } from "../utils/imageCompressor";

export default function SettingsManager() {
  const { BUSINESS_INFO, updatePaymentSettings } = usePOS();

  const [activeSection, setActiveSection] = useState("payment-details");

  // Form State initialized from BUSINESS_INFO
  const [formData, setFormData] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
    qrCodePath: "/images/upi-qr.jpg"
  });

  const [qrFile, setQrFile] = useState(null);
  const [qrPreviewUrl, setQrPreviewUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // { type: 'success' | 'error', message: string }

  // Sync state when BUSINESS_INFO loads/updates
  useEffect(() => {
    if (BUSINESS_INFO) {
      setFormData({
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "ifscCode" ? value.toUpperCase().trim() : value
    }));
  };

  const handleQrFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveStatus({ type: "error", message: "Please select an image file (PNG, JPG, WEBP)." });
      return;
    }

    try {
      // Create local preview immediately
      const localUrl = URL.createObjectURL(file);
      setQrPreviewUrl(localUrl);
      setQrFile(file);
      setSaveStatus(null);
    } catch (err) {
      console.error("Preview error:", err);
    }
  };

  const handleResetQr = () => {
    setQrFile(null);
    setQrPreviewUrl("/images/upi-qr.jpg");
    setFormData(prev => ({ ...prev, qrCodePath: "/images/upi-qr.jpg" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    let finalQrPath = formData.qrCodePath;

    try {
      // If a new QR image was chosen, compress and upload it to Firebase Storage
      if (qrFile) {
        setIsUploading(true);
        setUploadProgress(10);
        try {
          const compressed = await compressImage(qrFile, {
            maxWidth: 600,
            maxHeight: 600,
            quality: 0.9,
            outputFormat: "image/jpeg"
          });
          setUploadProgress(40);

          const uploadResult = await uploadProductImage(compressed.file, "settings", (pct) => {
            setUploadProgress(40 + Math.round(pct * 0.55));
          });

          if (uploadResult?.url) {
            finalQrPath = uploadResult.url;
          }
        } catch (uploadErr) {
          console.warn("Storage upload failed, using Data URL fallback:", uploadErr);
          // If storage upload fails (e.g. offline / CORS), convert to base64 Data URL so it still works
          finalQrPath = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(qrFile);
          });
        } finally {
          setIsUploading(false);
          setUploadProgress(100);
        }
      }

      const updatedPayload = {
        bankName: formData.bankName.trim(),
        accountName: formData.accountName.trim(),
        accountNumber: formData.accountNumber.trim(),
        ifscCode: formData.ifscCode.trim(),
        upiId: formData.upiId.trim(),
        qrCodePath: finalQrPath
      };

      const result = await updatePaymentSettings(updatedPayload);

      if (result.success) {
        setFormData(prev => ({ ...prev, ...updatedPayload }));
        setQrPreviewUrl(finalQrPath);
        setQrFile(null);
        setSaveStatus({
          type: "success",
          message: "Payment Details updated successfully! These details will now appear on all Invoices & WhatsApp bills."
        });
        setTimeout(() => setSaveStatus(null), 5000);
      } else {
        throw new Error(result.error?.message || "Failed to save settings");
      }
    } catch (err) {
      console.error("Save settings error:", err);
      setSaveStatus({
        type: "error",
        message: err.message || "Failed to update payment settings. Please try again."
      });
    } finally {
      setIsSaving(false);
    }
  };

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
          gap: "3px"
        }}>
          <button
            type="button"
            onClick={() => setActiveSection("payment-details")}
            style={{
              padding: "6px 14px",
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
              transition: "all 0.15s ease"
            }}
          >
            <CreditCard size={14} />
            <span>Payment Details</span>
          </button>
        </div>

        {saveStatus && (
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "8px",
            fontSize: "0.80rem",
            fontWeight: 600,
            background: saveStatus.type === "success" ? "#ECFDF5" : "#FEF2F2",
            color: saveStatus.type === "success" ? "#065F46" : "#991B1B",
            border: `1px solid ${saveStatus.type === "success" ? "#A7F3D0" : "#FECACA"}`
          }}>
            {saveStatus.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
            <span>{saveStatus.message}</span>
          </div>
        )}
      </div>

      {/* Main Grid: Form + Invoice Preview */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
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

          <form onSubmit={handleSubmit} style={{ padding: "20px" }}>
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
                  value={formData.bankName}
                  onChange={handleChange}
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
                  value={formData.accountName}
                  onChange={handleChange}
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
                  value={formData.accountNumber}
                  onChange={handleChange}
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
                  value={formData.ifscCode}
                  onChange={handleChange}
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
                  value={formData.upiId}
                  onChange={handleChange}
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
                            setQrPreviewUrl(formData.qrCodePath);
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

                      {formData.qrCodePath !== "/images/upi-qr.jpg" && !qrFile && (
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

                    {isUploading && (
                      <div style={{ marginTop: "10px" }}>
                        <div style={{ fontSize: "0.72rem", color: "var(--sd-zinc-600)", marginBottom: "4px" }}>
                          Uploading image: {uploadProgress}%
                        </div>
                        <div style={{ width: "100%", height: "4px", background: "#E4E4E7", borderRadius: "2px", overflow: "hidden" }}>
                          <div style={{ width: `${uploadProgress}%`, height: "100%", background: "var(--sd-black)", transition: "width 0.2s" }} />
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
                  disabled={isSaving || isUploading}
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
                    cursor: (isSaving || isUploading) ? "not-allowed" : "pointer",
                    opacity: (isSaving || isUploading) ? 0.7 : 1,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    transition: "all 0.15s ease"
                  }}
                >
                  {isSaving ? (
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
                  <div><strong>Bank:</strong> {formData.bankName || "Tamilnad Mercantile Bank"}</div>
                  <div><strong>A/C Name:</strong> {formData.accountName || "SPICES DABBA"}</div>
                  <div><strong>A/C:</strong> {formData.accountNumber || "180150050800432"}</div>
                  <div><strong>IFSC:</strong> {formData.ifscCode || "TMBL0000180"}</div>
                  <div><strong>UPI:</strong> {formData.upiId || "9940159298 (Vaishno Devi)"}</div>
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
    </div>
  );
}
