// lib/orders.ts
// Active Orders Management - supports multiple concurrent orders

const ACTIVE_ORDERS_KEY = "panel_active_orders";
const PROCESSED_EXPIRED_KEY = "panel_processed_expired_orders";
const ORDER_HISTORY_KEY = "panel_order_history";

export interface ActiveOrder {
  orderId: string;
  phoneNumber: string;
  service: string;
  country: string;
  expiredAt: number;
  price: number;
  createdAt: number;
  userEmail: string;
}

export interface ExpiredProcessResult {
  orderId: string;
  refunded: boolean;
  amount: number;
  error?: string;
}

export interface OrderHistory {
  orderId: string;
  userEmail: string;
  phoneNumber: string;
  serviceName: string;
  serviceCode?: string;
  serviceIcon?: string;
  countryName: string;
  countryCode?: string;
  sellingPrice: number;
  originalPrice: number;
  profit?: number;
  status: "pending" | "success" | "expired" | "cancel";
  otpCode?: string;
  createdAt: string;
  expiredAt: number;
}

// Get all active orders for a user
export function getActiveOrders(userEmail: string): ActiveOrder[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(ACTIVE_ORDERS_KEY);
  const allOrders: ActiveOrder[] = data ? JSON.parse(data) : [];
  
  // Filter by user and remove expired orders
  const now = Date.now();
  const userOrders = allOrders.filter(
    (order) => order.userEmail === userEmail && order.expiredAt > now
  );
  
  // Clean up expired orders
  const validOrders = allOrders.filter((order) => order.expiredAt > now);
  if (validOrders.length !== allOrders.length) {
    localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(validOrders));
  }
  
  return userOrders;
}

// Add a new active order
export function addActiveOrder(order: ActiveOrder): void {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(ACTIVE_ORDERS_KEY);
  const allOrders: ActiveOrder[] = data ? JSON.parse(data) : [];
  
  // Check if order already exists
  const existingIndex = allOrders.findIndex((o) => o.orderId === order.orderId);
  if (existingIndex === -1) {
    allOrders.push(order);
    localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(allOrders));
  }
}

// Remove an active order
export function removeActiveOrder(orderId: string): void {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(ACTIVE_ORDERS_KEY);
  const allOrders: ActiveOrder[] = data ? JSON.parse(data) : [];
  
  const filteredOrders = allOrders.filter((o) => o.orderId !== orderId);
  localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(filteredOrders));
}

// Get count of active orders for a user
export function getActiveOrdersCount(userEmail: string): number {
  return getActiveOrders(userEmail).length;
}

// Check if user has any active orders
export function hasActiveOrders(userEmail: string): boolean {
  return getActiveOrders(userEmail).length > 0;
}

// Get processed expired orders to avoid double processing
function getProcessedExpiredOrders(): string[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(PROCESSED_EXPIRED_KEY);
  return data ? JSON.parse(data) : [];
}

// Mark order as processed for expiration
function markOrderAsProcessed(orderId: string): void {
  if (typeof window === "undefined") return;
  const processed = getProcessedExpiredOrders();
  if (!processed.includes(orderId)) {
    processed.push(orderId);
    // Keep only last 100 processed orders to avoid bloating localStorage
    const trimmed = processed.slice(-100);
    localStorage.setItem(PROCESSED_EXPIRED_KEY, JSON.stringify(trimmed));
  }
}

// Check if order was already processed for expiration
function isOrderProcessed(orderId: string): boolean {
  return getProcessedExpiredOrders().includes(orderId);
}

// Check and process all expired orders for a user
// This should be called on dashboard load, services page load, etc.
export async function checkAndProcessExpiredOrders(userEmail: string): Promise<ExpiredProcessResult[]> {
  if (typeof window === "undefined") return [];
  
  // Dynamic import to avoid circular dependency
  const { updateTransactionStatus, updateUserBalanceExternal, updateOrderOTP } = await import("./externalDB");
  
  const data = localStorage.getItem(ACTIVE_ORDERS_KEY);
  const allOrders: ActiveOrder[] = data ? JSON.parse(data) : [];
  
  const now = Date.now();
  const results: ExpiredProcessResult[] = [];
  
  // Find expired orders for this user that haven't been processed yet
  const expiredOrders = allOrders.filter(
    (order) => order.userEmail === userEmail && order.expiredAt <= now && !isOrderProcessed(order.orderId)
  );
  
  for (const order of expiredOrders) {
    const result: ExpiredProcessResult = {
      orderId: order.orderId,
      refunded: false,
      amount: order.price,
    };
    
    try {
      // Check localStorage for existing expiration marker
      const expiredKey = `order_expired_${order.orderId}`;
      const alreadyExpired = localStorage.getItem(expiredKey) === "true";
      
      if (!alreadyExpired) {
        // Update transaction status to expired
        await updateTransactionStatus(order.orderId, "expired");
        
        // Update order status to expired in the database
        await updateOrderOTP(order.orderId, "", "expired");
        
        // Refund the balance
        if (order.price > 0) {
          const refundResult = await updateUserBalanceExternal(userEmail, order.price);
          
          if (refundResult.success) {
            result.refunded = true;
            
            // Update localStorage balance
            const storedUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
            if (storedUser.email === userEmail) {
              const newBalance = refundResult.data?.balance ?? (storedUser.balance || 0) + order.price;
              storedUser.balance = newBalance;
              localStorage.setItem("currentUser", JSON.stringify(storedUser));
            }
          } else {
            result.error = refundResult.message || "Gagal refund saldo";
          }
        }
        
        // Mark as expired in localStorage
        localStorage.setItem(expiredKey, "true");
      } else {
        // Already expired by another session/tab
        result.refunded = true; // Assume it was already refunded
      }
      
      // Mark as processed
      markOrderAsProcessed(order.orderId);
      
    } catch (err: any) {
      console.error(`[v0] Failed to process expired order ${order.orderId}:`, err);
      result.error = err.message || "Error processing expired order";
    }
    
    results.push(result);
  }
  
  // Clean up expired orders from active list
  if (expiredOrders.length > 0) {
    const validOrders = allOrders.filter((order) => order.expiredAt > now);
    localStorage.setItem(ACTIVE_ORDERS_KEY, JSON.stringify(validOrders));
  }
  
  return results;
}

// Get total refund amount from expired orders processing
export function getTotalRefundFromResults(results: ExpiredProcessResult[]): number {
  return results
    .filter((r) => r.refunded)
    .reduce((sum, r) => sum + r.amount, 0);
}

// ===== ORDER HISTORY MANAGEMENT =====
// Get all order history for a user from localStorage
export function getOrderHistory(userEmail: string): OrderHistory[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(ORDER_HISTORY_KEY);
  const allHistory: OrderHistory[] = data ? JSON.parse(data) : [];
  
  // Filter by user and sort by newest first
  return allHistory
    .filter((order) => order.userEmail === userEmail)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Add order to history (called when order is created)
export function addOrderToHistory(order: OrderHistory): void {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(ORDER_HISTORY_KEY);
  const allHistory: OrderHistory[] = data ? JSON.parse(data) : [];
  
  // Check if order already exists
  const existingIndex = allHistory.findIndex((o) => o.orderId === order.orderId);
  if (existingIndex === -1) {
    allHistory.push(order);
    // Keep only last 500 orders to prevent localStorage bloat
    const trimmed = allHistory.slice(-500);
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(trimmed));
  }
}

// Update order status in history
export function updateOrderHistoryStatus(orderId: string, status: OrderHistory["status"], otpCode?: string): void {
  if (typeof window === "undefined") return;
  const data = localStorage.getItem(ORDER_HISTORY_KEY);
  const allHistory: OrderHistory[] = data ? JSON.parse(data) : [];
  
  const orderIndex = allHistory.findIndex((o) => o.orderId === orderId);
  if (orderIndex !== -1) {
    allHistory[orderIndex].status = status;
    if (otpCode) {
      allHistory[orderIndex].otpCode = otpCode;
    }
    localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(allHistory));
  }
}

// Get order history stats for a user
export function getOrderHistoryStats(userEmail: string): { total: number; success: number; pending: number; expired: number; cancel: number } {
  const history = getOrderHistory(userEmail);
  return {
    total: history.length,
    success: history.filter((o) => o.status === "success").length,
    pending: history.filter((o) => o.status === "pending").length,
    expired: history.filter((o) => o.status === "expired").length,
    cancel: history.filter((o) => o.status === "cancel").length,
  };
}
