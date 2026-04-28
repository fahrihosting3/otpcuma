// lib/externalDB.ts
// External API Database Integration
// API: https://api-orkut-olive.vercel.app

import { getFile, writeFile } from "./githubDB";

const API_BASE = "https://api-orkut-gules.vercel.app/api";

export interface UserData {
  id?: string;
  username: string;
  email: string;
  password?: string;
  role: "user" | "admin";
  balance: number;
  createdAt: string;
}

export interface TransactionData {
  id: string;
  userId: string;
  userEmail: string;
  type: "deposit" | "purchase";
  amount: number;
  fee: number;
  total: number;
  status: "pending" | "success" | "cancel" | "expired";
  depositId?: string;
  qrImage?: string;
  qrString?: string;
  expiredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  user?: T;
}

// ============ USER FUNCTIONS ============

export async function registerUserAPI(
  username: string,
  email: string,
  password: string,
  role: "user" | "admin" = "user"
): Promise<ApiResponse<UserData>> {
  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, role }),
    });
    return await res.json();
  } catch (error) {
    console.error("Register API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function loginUserAPI(
  email: string,
  password: string
): Promise<ApiResponse<UserData>> {
  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return await res.json();
  } catch (error) {
    console.error("Login API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}
export async function updateUserBalance(
  email: string,
  amount: number
): Promise<ApiResponse<UserData>> {
  try {
    const res = await fetch(`${API_BASE}/users/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount }),
    });

    const data = await res.json();

    if (!data.success) {
      return { success: false, message: data.message };  // ✅ ganti error → message
    }

    return { success: true, data: data.user };
  } catch (error) {
    return { success: false, message: "Failed to update balance" };  // ✅ ganti error → message
  }
}

export async function getUserByEmail(
  email: string
): Promise<ApiResponse<UserData>> {
  try {
    const res = await fetch(
      `${API_BASE}/users?email=${encodeURIComponent(email)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    const data = await res.json();
    console.log("[v0] getUserByEmail API response:", data);

    // Normalize berbagai format response dari API
    if (data.success && data.user) {
      return { success: true, data: data.user };
    }
    if (data.success && data.data) {
      return { success: true, data: data.data };
    }
    if (data.email && data.balance !== undefined) {
      return { success: true, data: data };
    }

    return data;
  } catch (error) {
    console.error("Get user API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function getAllUsers(): Promise<ApiResponse<UserData[]>> {
  try {
    const res = await fetch(`${API_BASE}/users/all`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  } catch (error) {
    console.error("Get all users API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function updateUserBalanceExternal(
  email: string,
  amount: number
): Promise<ApiResponse<UserData>> {
  try {
    const res = await fetch(`${API_BASE}/users/balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, amount }),
    });
    const response = await res.json();
    
    // Handle both 'data' and 'user' response formats
    if (response.success) {
      return {
        success: true,
        data: response.data || response.user,
        message: response.message
      };
    }
    
    return { success: false, message: response.message || "Gagal update saldo" };
  } catch (error) {
    console.error("Update balance API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function deleteUser(
  email: string
): Promise<ApiResponse<null>> {
  try {
    const res = await fetch(`${API_BASE}/users/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return await res.json();
  } catch (error) {
    console.error("Delete user API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function updateUserPassword(
  email: string,
  newPassword: string
): Promise<ApiResponse<null>> {
  try {
    const res = await fetch(`${API_BASE}/users/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: newPassword }),
    });
    return await res.json();
  } catch (error) {
    console.error("Update password API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

// ============ TRANSACTION FUNCTIONS ============

export async function createTransaction(
  transaction: Omit<TransactionData, "id" | "createdAt" | "updatedAt">
): Promise<ApiResponse<TransactionData>> {
  try {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(transaction),
    });
    return await res.json();
  } catch (error) {
    console.error("Create transaction API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function updateTransactionStatus(
  depositId: string,
  status: "pending" | "success" | "cancel" | "expired"
): Promise<ApiResponse<TransactionData>> {
  try {
    const res = await fetch(`${API_BASE}/transactions/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ depositId, status }),
    });
    return await res.json();
  } catch (error) {
    console.error("Update transaction status API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function getTransactionsByUser(
  userEmail: string
): Promise<ApiResponse<TransactionData[]>> {
  try {
    const res = await fetch(
      `${API_BASE}/transactions?email=${encodeURIComponent(userEmail)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return await res.json();
  } catch (error) {
    console.error("Get transactions by user API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function getTransactionByDepositId(
  depositId: string
): Promise<ApiResponse<TransactionData>> {
  try {
    const res = await fetch(
      `${API_BASE}/transactions/deposit?depositId=${encodeURIComponent(depositId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );
    return await res.json();
  } catch (error) {
    console.error("Get transaction by depositId API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function getAllTransactions(): Promise<
  ApiResponse<TransactionData[]>
> {
  try {
    const res = await fetch(`${API_BASE}/transactions/all`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  } catch (error) {
    console.error("Get all transactions API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

export async function getPendingTransactions(): Promise<
  ApiResponse<TransactionData[]>
> {
  try {
    const res = await fetch(`${API_BASE}/transactions/pending`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  } catch (error) {
    console.error("Get pending transactions API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

// ============ ADMIN STATS ============

export async function getAdminStats(): Promise<
  ApiResponse<{
    totalUsers: number;
    totalTransactions: number;
    pendingTransactions: number;
    successTransactions: number;
    totalDeposit: number;
    totalRevenue: number;
  }>
> {
  try {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    return await res.json();
  } catch (error) {
    console.error("Get admin stats API error:", error);
    return { success: false, message: "Gagal terhubung ke server" };
  }
}

// ============ MAINTENANCE FUNCTIONS ============
export interface MaintenanceData {
  isActive: boolean;
  isRecurring?: boolean; // Jadwal harian berulang
  dailyStartTime?: string; // Format "HH:mm" untuk jadwal harian
  dailyEndTime?: string; // Format "HH:mm" untuk jadwal harian
  startTime: string | null;
  endTime: string | null;
  reason: string;
  createdBy: string;
  updatedAt: string;
}


// GET Maintenance
export async function getMaintenanceStatus(): Promise<MaintenanceData> {
  try {
    const res = await fetch(`${API_BASE}/maintenance`);

    const json = await res.json();

    if (!json.success) throw new Error(json.message);

    return json.data;

  } catch (error) {
    console.error("Error getting maintenance status:", error);

    return {
      isActive: false,
      startTime: null,
      endTime: null,
      reason: "",
      createdBy: "",
      updatedAt: "",
    };
  }
}


// SET Maintenance
export async function setMaintenanceStatus(
  data: MaintenanceData
): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/maintenance/set`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    return json.success;

  } catch (error) {
    console.error("Error setting maintenance status:", error);
    return false;
  }
}


// CLEAR Maintenance
export async function clearMaintenance(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/maintenance/clear`, {
      method: "DELETE",
    });

    const json = await res.json();

    return json.success;

  } catch (error) {
    console.error("Error clearing maintenance:", error);
    return false;
  }
}

// CHECK if maintenance is currently active (works for both one-time and recurring)
export function isMaintenanceCurrentlyActive(maintenance: MaintenanceData | null): boolean {
  if (!maintenance?.isActive) {
    return false;
  }

  const now = new Date();
  const nowTime = now.getTime();

  // For recurring daily schedule
  if (maintenance.isRecurring && maintenance.dailyStartTime && maintenance.dailyEndTime) {
    const [startH, startM] = maintenance.dailyStartTime.split(":").map(Number);
    const [endH, endM] = maintenance.dailyEndTime.split(":").map(Number);

    // Check if it's an overnight schedule (end time is earlier than start time)
    const isOvernight = endH < startH || (endH === startH && endM < startM);

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);

    if (isOvernight) {
      // For overnight schedules, check two possible windows:
      // 1. Yesterday's start to today's end (morning portion)
      // 2. Today's start to tomorrow's end (evening portion)
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, startH, startM);
      const todayEndForYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
      const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, endH, endM);

      // Check if we're in yesterday's window (morning portion)
      const inYesterdayWindow = nowTime >= yesterdayStart.getTime() && nowTime <= todayEndForYesterday.getTime();
      // Check if we're in today's window (evening portion)
      const inTodayWindow = nowTime >= todayStart.getTime() && nowTime <= tomorrowEnd.getTime();

      return inYesterdayWindow || inTodayWindow;
    } else {
      // Normal same-day schedule
      return nowTime >= todayStart.getTime() && nowTime <= todayEnd.getTime();
    }
  }

  // For one-time schedule
  if (!maintenance.startTime || !maintenance.endTime) {
    return false;
  }
  const start = new Date(maintenance.startTime).getTime();
  const end = new Date(maintenance.endTime).getTime();
  return nowTime >= start && nowTime <= end;
}

// GET maintenance end time (for countdown)
export function getMaintenanceEndTime(maintenance: MaintenanceData | null): number | null {
  if (!maintenance?.isActive) return null;

  const now = new Date();

  // For recurring daily schedule
  if (maintenance.isRecurring && maintenance.dailyStartTime && maintenance.dailyEndTime) {
    const [startH, startM] = maintenance.dailyStartTime.split(":").map(Number);
    const [endH, endM] = maintenance.dailyEndTime.split(":").map(Number);

    const isOvernight = endH < startH || (endH === startH && endM < startM);

    if (isOvernight) {
      // Check if we're in morning portion (end is today)
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
      const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, startH, startM);

      if (now.getTime() >= yesterdayStart.getTime() && now.getTime() <= todayEnd.getTime()) {
        return todayEnd.getTime();
      }

      // We're in evening portion (end is tomorrow)
      const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, endH, endM);
      return tomorrowEnd.getTime();
    } else {
      // Same-day schedule
      const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
      return todayEnd.getTime();
    }
  }

  // For one-time schedule
  if (maintenance.endTime) {
    return new Date(maintenance.endTime).getTime();
  }

  return null;
}
// ============ FINANCE CALCULATIONS ============

export interface FinanceSummary {
  totalRevenue: number;
  totalDeposit: number;
  totalPurchases: number;
  pendingAmount: number;
  successfulTransactions: number;
  failedTransactions: number;
  averageTransaction: number;
  todayRevenue: number;
  weekRevenue: number;
  monthRevenue: number;
}

export function calculateFinanceSummary(transactions: TransactionData[]): FinanceSummary {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const successTrx = transactions.filter(t => t.status === "success");
  const failedTrx = transactions.filter(t => t.status === "cancel" || t.status === "expired");
  const pendingTrx = transactions.filter(t => t.status === "pending");
  
  const depositTrx = successTrx.filter(t => t.type === "deposit");
  const purchaseTrx = successTrx.filter(t => t.type === "purchase");

  const totalDeposit = depositTrx.reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalPurchases = purchaseTrx.reduce((sum, t) => sum + (t.amount || 0), 0);
  const pendingAmount = pendingTrx.reduce((sum, t) => sum + (t.amount || 0), 0);
  
  // Revenue from fees
  const totalRevenue = successTrx.reduce((sum, t) => sum + (t.fee || 0), 0);
  
  // Time-based revenue calculations
  const todayRevenue = successTrx
    .filter(t => new Date(t.createdAt) >= today)
    .reduce((sum, t) => sum + (t.fee || 0), 0);
    
  const weekRevenue = successTrx
    .filter(t => new Date(t.createdAt) >= weekAgo)
    .reduce((sum, t) => sum + (t.fee || 0), 0);
    
  const monthRevenue = successTrx
    .filter(t => new Date(t.createdAt) >= monthAgo)
    .reduce((sum, t) => sum + (t.fee || 0), 0);

  const averageTransaction = successTrx.length > 0 
    ? totalDeposit / successTrx.length 
    : 0;

  return {
    totalRevenue,
    totalDeposit,
    totalPurchases,
    pendingAmount,
    successfulTransactions: successTrx.length,
    failedTransactions: failedTrx.length,
    averageTransaction,
    todayRevenue,
    weekRevenue,
    monthRevenue,
  };
}

// ==================== KONFIGURASI API ====================
// ==================== TIPE DATA ====================
export type NotificationData = {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  createdAt: string;
  readBy: string[];
  isGlobal: true;
};

// ==================== HELPER FETCH ====================
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || `HTTP error ${res.status}`);
  return data;
}

// ==================== NOTIFIKASI GLOBAL ====================
export const sendGlobalNotification = async (
  title: string,
  message: string,
  type: 'info' | 'warning' | 'success' | 'error' = 'info'
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiFetch("/notifications", {
      method: "POST",
      body: JSON.stringify({ title, message, type }),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error sending global notification:", error);
    return { success: false, error: error.message };
  }
};

export const getAllNotifications = async (): Promise<{
  success: boolean;
  data?: NotificationData[];
}> => {
  try {
    const res = await apiFetch<{ success: boolean; data: NotificationData[] }>(
      "/notifications"
    );
    return { success: true, data: res.data };
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return { success: false };
  }
};

export const markNotificationAsRead = async (
  notifId: string,
  userEmail: string
): Promise<void> => {
  try {
    await apiFetch(`/notifications/${notifId}/read`, {
      method: "PATCH",
      body: JSON.stringify({ email: userEmail }),
    });
  } catch (e) {
    console.error("Failed to mark notification as read", e);
  }
};

export const deleteNotification = async (
  notifId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiFetch(`/notifications/${notifId}`, {
      method: "DELETE",
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return { success: false, error: error.message };
  }
};

export const getMaintenance = async (): Promise<{
  success: boolean;
  data?: any;
}> => {
  try {
    const res = await apiFetch<{ success: boolean; data: any }>(
      "/maintenance"
    );
    return { success: true, data: res.data };
  } catch (error) {
    console.error("Error fetching maintenance:", error);
    return { success: false };
  }
};

// ==================== ADMIN SETTINGS ====================
export interface AdminSettings {
  telegram: {
    botToken: string;
    channelId: string;
    enabled: boolean;
  };
  fees: {
    depositFee: number; // Fee deposit dalam IDR (default 500)
    orderMarkup: number; // Markup harga order dalam IDR (default 1000)
  };
  updatedAt: string;
  updatedBy: string;
}

const DEFAULT_SETTINGS: AdminSettings = {
  telegram: {
    botToken: "",
    channelId: "",
    enabled: false,
  },
  fees: {
    depositFee: 500,
    orderMarkup: 1000,
  },
  updatedAt: new Date().toISOString(),
  updatedBy: "",
};

const SETTINGS_PATH = "data/settings.json";

export const getAdminSettings = async (): Promise<{
  success: boolean;
  data?: AdminSettings;
}> => {
  try {
    const file = await getFile(SETTINGS_PATH);
    if (!file) {
      return { success: true, data: DEFAULT_SETTINGS };
    }
    return { success: true, data: file.content as AdminSettings };
  } catch (error) {
    console.error("Error fetching admin settings:", error);
    return { success: true, data: DEFAULT_SETTINGS };
  }
};

export const updateAdminSettings = async (
  settings: Partial<AdminSettings>
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Get existing file to get sha
    const file = await getFile(SETTINGS_PATH);
    
    // Merge with existing settings or use defaults
    const existingSettings = file?.content as AdminSettings || DEFAULT_SETTINGS;
    const newSettings: AdminSettings = {
      telegram: {
        ...existingSettings.telegram,
        ...settings.telegram,
      },
      fees: {
        ...existingSettings.fees,
        ...settings.fees,
      },
      updatedAt: settings.updatedAt || new Date().toISOString(),
      updatedBy: settings.updatedBy || existingSettings.updatedBy,
    };
    
    // Write to GitHub
    await writeFile(SETTINGS_PATH, newSettings, file?.sha);
    
    return { success: true };
  } catch (error: any) {
    console.error("Error updating admin settings:", error);
    return { success: false, error: error.message };
  }
};

// ==================== TELEGRAM NOTIFICATION ====================
export interface TelegramOTPNotification {
  orderId: string;
  userEmail: string;
  otpCode: string;
  phoneNumber: string;
  originalPrice: number;
  sellingPrice: number;
  profit: number;
  otpMessage?: string;
  serviceName?: string;
  countryName?: string;
}

export const sendTelegramOTPNotification = async (
  data: TelegramOTPNotification
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiFetch("/telegram/notify-otp", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error sending telegram notification:", error);
    return { success: false, error: error.message };
  }
};

// ==================== PROFIT STATISTICS ====================
export interface ProfitStats {
  totalDepositFeeProfit: number;
  totalOrderMarkupProfit: number;
  totalProfit: number;
  todayProfit: number;
  weekProfit: number;
  monthProfit: number;
  orderCount: number;
  depositCount: number;
}

export const getProfitStats = async (): Promise<{
  success: boolean;
  data?: ProfitStats;
}> => {
  try {
    const res = await apiFetch<{ success: boolean; data: ProfitStats }>(
      "/stats/profit"
    );
    return { success: true, data: res.data };
  } catch (error) {
    console.error("Error fetching profit stats:", error);
    return { success: false };
  }
};

// ==================== ORDER HISTORY WITH PROFIT ====================
export interface OrderWithProfit {
  id: string;
  orderId: string;
  userEmail: string;
  serviceName: string;
  countryName: string;
  phoneNumber: string;
  originalPrice: number;
  sellingPrice: number;
  profit: number;
  otpCode?: string;
  status: "pending" | "success" | "cancel" | "expired";
  createdAt: string;
}

export const createOrderWithProfit = async (
  order: Omit<OrderWithProfit, "id" | "createdAt">
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiFetch("/orders/profit", {
      method: "POST",
      body: JSON.stringify(order),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error creating order with profit:", error);
    return { success: false, error: error.message };
  }
};

export const getAllOrdersWithProfit = async (): Promise<{
  success: boolean;
  data?: OrderWithProfit[];
}> => {
  try {
    const res = await apiFetch<{ success: boolean; data: OrderWithProfit[] }>(
      "/orders/profit"
    );
    return { success: true, data: res.data };
  } catch (error) {
    console.error("Error fetching orders with profit:", error);
    return { success: false };
  }
};

export const updateOrderOTP = async (
  orderId: string,
  otpCode: string,
  status: "success" | "cancel" | "expired" | "otp_received"
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiFetch(`/orders/profit/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ otpCode, status }),
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error updating order OTP:", error);
    return { success: false, error: error.message };
  }
};

// Get orders by user email with pending status
export const getPendingOrdersByUser = async (
  userEmail: string
): Promise<{ success: boolean; data?: OrderWithProfit[] }> => {
  try {
    const res = await apiFetch<{ success: boolean; data: OrderWithProfit[] }>(
      "/orders/profit"
    );
    if (res.success && res.data) {
      // Filter orders for this user with pending status
      const userPendingOrders = res.data.filter(
        (order) => order.userEmail === userEmail && order.status === "pending"
      );
      return { success: true, data: userPendingOrders };
    }
    return { success: false };
  } catch (error) {
    console.error("Error fetching pending orders by user:", error);
    return { success: false };
  }
};

// Check and process expired orders from database (cross-device compatible)
export const checkAndProcessExpiredOrdersFromDB = async (
  userEmail: string
): Promise<{
  success: boolean;
  processedOrders: { orderId: string; refunded: boolean; amount: number }[];
}> => {
  const processedOrders: { orderId: string; refunded: boolean; amount: number }[] = [];
  
  try {
    // Get all pending orders for this user from database
    const ordersRes = await getPendingOrdersByUser(userEmail);
    
    if (!ordersRes.success || !ordersRes.data) {
      return { success: false, processedOrders: [] };
    }
    
    const now = Date.now();
    
    for (const order of ordersRes.data) {
      // Check if order is expired (20 minutes = 1200000ms from creation)
      const createdAt = new Date(order.createdAt).getTime();
      const expiredAt = createdAt + 20 * 60 * 1000; // 20 minutes
      
      if (now >= expiredAt) {
        try {
          // Update order status to expired
          await updateOrderOTP(order.orderId, "", "expired");
          
          // Update transaction status to expired
          await updateTransactionStatus(order.orderId, "expired");
          
          // Refund the balance
          const refundResult = await updateUserBalanceExternal(userEmail, order.sellingPrice);
          
          processedOrders.push({
            orderId: order.orderId,
            refunded: refundResult.success,
            amount: order.sellingPrice,
          });
          
          console.log(`[v0] Processed expired order ${order.orderId}, refunded: ${refundResult.success}`);
        } catch (err) {
          console.error(`[v0] Failed to process expired order ${order.orderId}:`, err);
          processedOrders.push({
            orderId: order.orderId,
            refunded: false,
            amount: order.sellingPrice,
          });
        }
      }
    }
    
    return { success: true, processedOrders };
  } catch (error) {
    console.error("Error checking expired orders from DB:", error);
    return { success: false, processedOrders: [] };
  }
};
