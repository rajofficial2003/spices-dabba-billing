import React, { createContext, useContext, useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged 
} from "firebase/auth";
import { auth } from "../firebase/config";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    setAuthError("");
    return signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const signup = async (email, password) => {
    setAuthError("");
    return createUserWithEmailAndPassword(auth, email.trim(), password);
  };

  const logout = () => {
    return signOut(auth);
  };

  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email.trim());
  };

  const value = {
    currentUser,
    loading,
    login,
    signup,
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
