import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged 
} from "firebase/auth";
import { collection, query, where, limit, getDocs, doc, getDoc } from "firebase/firestore";
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

  // Dual Login: Supports Firestore billing_staff (Employee username/email) and Firebase Auth (Super Admin email)
  const login = async (identifier, password) => {
    setAuthError("");
    const cleanId = String(identifier || "").trim();
    const cleanPass = String(password || "");

    if (!cleanId || !cleanPass) {
      throw new Error("Please enter both username/email and password.");
    }

    const lowerId = cleanId.toLowerCase();

    // 1. First, check if there is a staff member in Firestore billing_staff by username or email
    try {
      let matchedStaff = null;

      // Smart targeted query with limit(1) to avoid redundant reads
      if (lowerId.includes("@")) {
        // Query only by email
        const qEmail = query(collection(db, "billing_staff"), where("email", "==", lowerId), limit(1));
        const snapEmail = await getDocs(qEmail);
        if (!snapEmail.empty) {
          matchedStaff = { id: snapEmail.docs[0].id, ...snapEmail.docs[0].data() };
        }
      } else {
        // Query only by username
        const qUser = query(collection(db, "billing_staff"), where("username", "==", lowerId), limit(1));
        const snapUser = await getDocs(qUser);
        if (!snapUser.empty) {
          matchedStaff = { id: snapUser.docs[0].id, ...snapUser.docs[0].data() };
        }
      }

      if (matchedStaff) {
        if (matchedStaff.isActive === false) {
          throw new Error("This employee account has been deactivated. Please contact Super Admin.");
        }
        if (String(matchedStaff.password) !== cleanPass) {
          throw new Error("Incorrect password for staff account. Please check your credentials.");
        }

        setStaffUser(matchedStaff);
        setCurrentUser(null);
        localStorage.setItem("spices_dabba_active_staff", JSON.stringify(matchedStaff));
        return { type: "staff", staff: matchedStaff };
      }
    } catch (staffErr) {
      // If error is about deactivated account or wrong password, rethrow so the user gets clear feedback
      if (staffErr.message && !staffErr.code) {
        throw staffErr;
      }
      console.warn("Staff lookup notice:", staffErr.message);
    }

    // 2. If not found in billing_staff, attempt Firebase Auth (Super Admin login)
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanId, cleanPass);
      setCurrentUser(cred.user);
      setStaffUser(null);
      localStorage.removeItem("spices_dabba_active_staff");
      return { type: "admin", user: cred.user };
    } catch (adminErr) {
      throw adminErr;
    }
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
