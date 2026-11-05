import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged 
} from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const ALL_PERMISSIONS = [
  { key: "stats", label: "Overview / Dashboard", description: "View daily sales summary, performance metrics & quick stats" },
  { key: "pos", label: "Spot Billing", description: "Create customer bills, add items to cart & checkout orders" },
  { key: "orders", label: "Orders & Invoices", description: "View order history, view/reprint invoices & share bills" },
  { key: "finance", label: "Purchase & Expenses", description: "Record daily business expenses, raw materials & view reports" },
  { key: "mixers", label: "Recipe", description: "Formulate recipes and masala manufacturing formulas" },
  { key: "products", label: "Products Catalog & Stock", description: "Manage product list, pricing tiers & add incoming stock" },
  { key: "customers", label: "Retailer Customers", description: "Manage retailer accounts, balances & customer categories" },
  { key: "finance_assets", label: "Suppliers & Raw Materials", description: "Manage suppliers directory, raw materials & expense categories" },
  { key: "settings", label: "Company Settings", description: "Manage bank details, UPI QR code & payment settings" }
];

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null); // Firebase Auth User (Super Admin)
  const [staffUser, setStaffUser] = useState(null); // Employee / Staff User
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        setStaffUser(null);
        localStorage.removeItem("spices_dabba_active_staff");
        setLoading(false);
      } else {
        // If not logged in as Firebase Auth admin, check for active staff session in localStorage
        const storedStaff = localStorage.getItem("spices_dabba_active_staff");
        if (storedStaff) {
          try {
            const parsed = JSON.parse(storedStaff);
            if (parsed && parsed.id) {
              const staffSnap = await getDoc(doc(db, "billing_staff", parsed.id));
              if (staffSnap.exists()) {
                const freshStaffData = { id: staffSnap.id, ...staffSnap.data() };
                if (freshStaffData.isActive !== false) {
                  setStaffUser(freshStaffData);
                  localStorage.setItem("spices_dabba_active_staff", JSON.stringify(freshStaffData));
                } else {
                  localStorage.removeItem("spices_dabba_active_staff");
                  setStaffUser(null);
                }
              } else {
                localStorage.removeItem("spices_dabba_active_staff");
                setStaffUser(null);
              }
            }
          } catch (e) {
            console.warn("Failed to restore staff session:", e);
            localStorage.removeItem("spices_dabba_active_staff");
            setStaffUser(null);
          }
        } else {
          setStaffUser(null);
        }
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Dual Login: Supports Firebase Auth (Super Admin email) and Firestore billing_staff (Employee username/email)
  const login = async (identifier, password) => {
    setAuthError("");
    const cleanId = String(identifier || "").trim();
    const cleanPass = String(password || "");

    if (!cleanId || !cleanPass) {
      throw new Error("Please enter both username/email and password.");
    }

    // 1. If it looks like an email, first attempt Firebase Auth (Super Admin)
    if (cleanId.includes("@")) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanId, cleanPass);
        setCurrentUser(cred.user);
        setStaffUser(null);
        localStorage.removeItem("spices_dabba_active_staff");
        return { type: "admin", user: cred.user };
      } catch (adminErr) {
        // If Firebase Auth fails, fallback to check if staff was registered with this email
        try {
          const q = query(collection(db, "billing_staff"), where("email", "==", cleanId.toLowerCase()));
          const snap = await getDocs(q);
          if (!snap.empty) {
            const staffDoc = snap.docs[0];
            const staffData = { id: staffDoc.id, ...staffDoc.data() };
            if (staffData.isActive === false) {
              throw new Error("This staff account has been deactivated. Please contact Super Admin.");
            }
            if (String(staffData.password) !== cleanPass) {
              throw new Error("Incorrect password for staff account.");
            }
            setStaffUser(staffData);
            setCurrentUser(null);
            localStorage.setItem("spices_dabba_active_staff", JSON.stringify(staffData));
            return { type: "staff", staff: staffData };
          }
        } catch (innerErr) {
          if (innerErr.message && !innerErr.code) throw innerErr;
        }
        throw adminErr;
      }
    }

    // 2. If it's a username (no @), check Firestore billing_staff directly
    const staffQuery = query(
      collection(db, "billing_staff"), 
      where("username", "==", cleanId.toLowerCase())
    );
    const staffSnap = await getDocs(staffQuery);

    if (staffSnap.empty) {
      throw new Error("Staff account not found with this username. Please verify your credentials or contact Admin.");
    }

    const staffDoc = staffSnap.docs[0];
    const staffData = { id: staffDoc.id, ...staffDoc.data() };

    if (staffData.isActive === false) {
      throw new Error("This employee account has been deactivated. Please contact Super Admin.");
    }

    if (String(staffData.password) !== cleanPass) {
      throw new Error("Incorrect password for this staff account. Please try again.");
    }

    setStaffUser(staffData);
    setCurrentUser(null);
    localStorage.setItem("spices_dabba_active_staff", JSON.stringify(staffData));
    return { type: "staff", staff: staffData };
  };

  const logout = async () => {
    localStorage.removeItem("spices_dabba_active_staff");
    setStaffUser(null);
    if (auth.currentUser) {
      await signOut(auth);
    }
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email.trim());
  };

  // Permission Checker: Super Admin has all permissions, Staff checks their custom permissions
  const hasPermission = (permissionKey) => {
    if (currentUser) return true; // Super Admin has unrestricted access to everything
    if (!staffUser) return false;
    if (staffUser.isSuperAdmin) return true;
    if (!staffUser.permissions) return false;
    return Boolean(staffUser.permissions[permissionKey]);
  };

  const isSuperAdmin = Boolean(currentUser && !staffUser);
  const isStaff = Boolean(staffUser);
  const effectiveUser = currentUser 
    ? { 
        id: currentUser.uid, 
        email: currentUser.email, 
        name: "Super Admin", 
        role: "Super Admin", 
        isSuperAdmin: true 
      }
    : (staffUser 
        ? { 
            ...staffUser, 
            isSuperAdmin: false, 
            isStaff: true 
          } 
        : null);

  const value = {
    currentUser: effectiveUser,
    rawAuthUser: currentUser,
    staffUser,
    isSuperAdmin,
    isStaff,
    hasPermission,
    loading,
    login,
    logout,
    resetPassword,
    authError,
    setAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
