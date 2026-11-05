import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  LogIn, 
  KeyRound,
  User
} from "lucide-react";
import { BUSINESS_INFO } from "../data/initialData";

export default function Login() {
  const { login, resetPassword } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Friendly error formatter
  const formatAuthError = (err) => {
    if (err.message && !err.code) {
      return err.message;
    }
    const code = err.code || "";
    if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
      return "Incorrect email/username or password. Please check your credentials.";
    }
    if (code === "auth/invalid-email") {
      return "Please enter a valid email or staff username.";
    }
    if (code === "auth/too-many-requests") {
      return "Too many failed attempts. Please wait a few moments or reset your password.";
    }
    if (code === "auth/network-request-failed") {
      return "Network connection issue. Please check your internet connection.";
    }
    return err.message || "Authentication failed. Please try again.";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in both email and password.");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSendPasswordReset = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setError("Please enter your email to receive a password reset link.");
      return;
    }
    try {
      setResetLoading(true);
      await resetPassword(resetEmail);
      setResetSent(true);
      setTimeout(() => {
        setResetSent(false);
        setShowResetModal(false);
      }, 3500);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #09090B 0%, #18181B 50%, #27272A 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      fontFamily: "var(--sd-font-family, system-ui, -apple-system, sans-serif)"
    }}>
      <div style={{
        width: "100%",
        maxWidth: "440px",
        background: "#FFFFFF",
        borderRadius: "20px",
        boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        overflow: "hidden"
      }}>
        {/* Brand Header */}
        <div style={{
          background: "linear-gradient(135deg, #09090B 0%, #18181B 100%)",
          color: "#FFFFFF",
          padding: "32px 28px 24px 28px",
          textAlign: "center",
          borderBottom: "3px solid #8B1E1E"
        }}>
          <div style={{
            width: "68px",
            height: "68px",
            borderRadius: "16px",
            background: "#FFFFFF",
            padding: "8px",
            margin: "0 auto 14px auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 8px 20px rgba(0, 0, 0, 0.3)"
          }}>
            <img 
              src={BUSINESS_INFO.logoPath} 
              alt="Spices Dabba" 
              onError={(e) => { e.target.style.display = 'none'; }}
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

          <h1 style={{ fontSize: "1.45rem", fontWeight: 900, margin: 0, letterSpacing: "-0.5px" }}>
            {BUSINESS_INFO.businessName || "Spices Dabba"}
          </h1>
          <p style={{ fontSize: "0.78rem", color: "var(--sd-zinc-400, #A1A1AA)", margin: "4px 0 0 0", fontWeight: 600 }}>
            {BUSINESS_INFO.tagline || "We Prepare . You Cook"} &bull; Billing & ERP Portal
          </p>

          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            marginTop: "12px",
            padding: "4px 10px",
            background: "rgba(139, 30, 30, 0.3)",
            border: "1px solid rgba(139, 30, 30, 0.5)",
            borderRadius: "20px",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#FECACA"
          }}>
            <ShieldCheck size={13} color="#F87171" />
            <span>Staff & Admin Secure Access</span>
          </div>
        </div>

        {/* Form Body */}
        <div style={{ padding: "28px" }}>
          {error && (
            <div style={{
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              borderRadius: "10px",
              padding: "10px 14px",
              marginBottom: "18px",
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontSize: "0.8rem",
              color: "#991B1B",
              lineHeight: 1.4
            }}>
              <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: "2px" }} />
              <div style={{ flex: 1, fontWeight: 600 }}>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email or Username Field */}
            <div>
              <label style={{
                display: "block",
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#18181B",
                marginBottom: "6px"
              }}>
                Email or Staff Username (மின்னஞ்சல் / பயனர் பெயர்)
              </label>
              <div style={{ position: "relative" }}>
                <User size={16} color="#71717A" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  placeholder="admin@spicesdabba.com or staff username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px 10px 38px",
                    borderRadius: "10px",
                    border: "1.5px solid #E4E4E7",
                    fontSize: "0.88rem",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#09090B"}
                  onBlur={(e) => e.target.style.borderColor = "#E4E4E7"}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <label style={{
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "#18181B"
                }}>
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowResetModal(true);
                    setError("");
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    color: "#8B1E1E",
                    fontSize: "0.74rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    textDecoration: "underline"
                  }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <Lock size={16} color="#71717A" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 40px 10px 38px",
                    borderRadius: "10px",
                    border: "1.5px solid #E4E4E7",
                    fontSize: "0.88rem",
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s"
                  }}
                  onFocus={(e) => e.target.style.borderColor = "#09090B"}
                  onBlur={(e) => e.target.style.borderColor = "#E4E4E7"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    color: "#71717A"
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "#09090B",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "12px",
                padding: "12px 16px",
                fontSize: "0.92rem",
                fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginTop: "10px",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                transition: "opacity 0.2s"
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In to Spices Dabba</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Reset Modal */}
      {showResetModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
          zIndex: 9999
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: "16px",
            maxWidth: "400px",
            width: "100%",
            padding: "24px",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <div style={{
                width: "40px",
                height: "40px",
                borderRadius: "10px",
                background: "#FEE2E2",
                color: "#991B1B",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}>
                <KeyRound size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 800, margin: 0, color: "#09090B" }}>
                  Reset Password
                </h3>
                <div style={{ fontSize: "0.75rem", color: "#71717A" }}>
                  Receive password reset instructions
                </div>
              </div>
            </div>

            {resetSent ? (
              <div style={{
                background: "#DCFCE7",
                border: "1px solid #86EFAC",
                color: "#166534",
                padding: "14px",
                borderRadius: "10px",
                fontSize: "0.82rem",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                margin: "16px 0"
              }}>
                <CheckCircle2 size={18} color="#16A34A" />
                <span>Password reset link sent to <strong>{resetEmail}</strong>. Check your inbox!</span>
              </div>
            ) : (
              <form onSubmit={handleSendPasswordReset} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <p style={{ fontSize: "0.8rem", color: "#52525B", margin: 0, lineHeight: 1.45 }}>
                  Enter your registered Spices Dabba email address, and Firebase will send you a password reset link.
                </p>

                <input
                  type="email"
                  required
                  placeholder="admin@spicesdabba.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "10px",
                    border: "1.5px solid #E4E4E7",
                    fontSize: "0.85rem",
                    outline: "none",
                    boxSizing: "border-box"
                  }}
                />

                <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(false)}
                    style={{
                      background: "#F4F4F5",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      fontSize: "0.8rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      color: "#71717A"
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    style={{
                      background: "#09090B",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 16px",
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      cursor: resetLoading ? "not-allowed" : "pointer"
                    }}
                  >
                    {resetLoading ? "Sending..." : "Send Reset Email"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

