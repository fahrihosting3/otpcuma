// lib/auth.ts
import { registerUserAPI, loginUserAPI, getUserByEmail, updateUserBalance as updateBalanceAPI, type UserData } from "./externalDB";

export type User = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: "user" | "admin";
  balance: number;
  createdAt: string;
};

// Hardcoded admin account - langsung bisa login tanpa register
const HARDCODED_ADMIN = {
  email: "ASRGroup17@admin.com",
  password: "Asrgroup123.",
  username: "Admin ASRG",
  role: "admin" as const,
};

export async function registerUser(email: string, password: string, name: string, role: "user" | "admin" = "user"): Promise<User> {
  const result = await registerUserAPI(name, email, password, role);
  
  if (!result.success) {
    throw new Error(result.message || "Registrasi gagal");
  }

  const user: User = {
    id: result.user?.email || email,
    username: name,
    email: email,
    name: name,
    role: role,
    balance: 0,
    createdAt: new Date().toISOString(),
  };

  // Store in localStorage for session
  localStorage.setItem("currentUser", JSON.stringify(user));
  
  return user;
}

export async function loginUser(email: string, password: string): Promise<User> {
  // Check hardcoded admin first
  if (email === HARDCODED_ADMIN.email && password === HARDCODED_ADMIN.password) {
    const adminUser: User = {
      id: HARDCODED_ADMIN.email,
      username: HARDCODED_ADMIN.username,
      email: HARDCODED_ADMIN.email,
      name: HARDCODED_ADMIN.username,
      role: HARDCODED_ADMIN.role,
      balance: 999999999,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem("currentUser", JSON.stringify(adminUser));
    return adminUser;
  }

  const result = await loginUserAPI(email, password);
  
  if (!result.success) {
    throw new Error(result.message || "Login gagal");
  }

  const userData = result.user;
  
  const user: User = {
    id: userData?.email || email,
    username: userData?.username || email.split("@")[0],
    email: userData?.email || email,
    name: userData?.username || email.split("@")[0],
    role: (userData?.role as "user" | "admin") || "user",
    balance: userData?.balance || 0,
    createdAt: userData?.createdAt || new Date().toISOString(),
  };

  // Store in localStorage for session
  localStorage.setItem("currentUser", JSON.stringify(user));
  
  return user;
}

export const logoutUser = () => {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("pendingDeposit");
};

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const user = localStorage.getItem("currentUser");
  return user ? JSON.parse(user) : null;
};

export const isAdmin = (): boolean => {
  const user = getCurrentUser();
  return user?.role === "admin";
};

export const updateUserBalance = async (amount: number): Promise<User> => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error("User tidak ditemukan");
  }

  // Update balance via API
  const result = await updateBalanceAPI(currentUser.email, amount);
  
  if (!result.success) {
    throw new Error(result.message || "Gagal update saldo");
  }

  // Update local storage
  const updatedUser: User = {
    ...currentUser,
    balance: (currentUser.balance || 0) + amount,
  };
  
  localStorage.setItem("currentUser", JSON.stringify(updatedUser));
  
  return updatedUser;
};

export const getUserBalance = (): number => {
  const user = getCurrentUser();
  return user?.balance || 0;
};

export const resetPassword = async (email: string, newPassword: string): Promise<void> => {
  const { updateUserPassword } = await import("./externalDB");
  const result = await updateUserPassword(email, newPassword);
  
  if (!result.success) {
    throw new Error(result.message || "Gagal reset password");
  }
};

export { getUserByEmail };

export const refreshUserData = async (): Promise<User | null> => {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  try {
    console.log("[v0] Refreshing user data for:", currentUser.email);
    const result = await getUserByEmail(currentUser.email);
    console.log("[v0] getUserByEmail result:", result);
    
    if (result.success && result.data) {
      const apiBalance = result.data.balance;
      console.log("[v0] API balance:", apiBalance, "Current balance:", currentUser.balance);
      
      const updatedUser: User = {
        ...currentUser,
        balance: typeof apiBalance === 'number' ? apiBalance : (currentUser.balance || 0),
        role: result.data.role || currentUser.role,
      };
      console.log("[v0] Updated user:", updatedUser);
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      return updatedUser;
    }
  } catch (error) {
    console.error("Failed to refresh user data:", error);
  }
  
  return currentUser;
};
