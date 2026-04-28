"use client";

import { useEffect, useState, Suspense, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getCurrentUser, type User } from "@/lib/auth";
import { updateTransactionStatus, getAdminSettings, updateOrderOTP, updateUserBalanceExternal } from "@/lib/externalDB";
import { sendOTPNotificationToTelegram } from "@/lib/telegram";
import { removeActiveOrder, updateOrderHistoryStatus } from "@/lib/orders";
import Navbar from "@/components/Navbar";
import {
  Phone,
  Clock,
  XCircle,
  RefreshCw,
  CheckCircle,
  Copy,
  MessageSquare,
  Loader2,
  AlertTriangle,
  Terminal,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

const API_KEY = process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY || "";
const BASE_URL_V1 = "https://www.rumahotp.io/api/v1";

interface OrderStatus {
  order_id: string;
  status: string;
  phone_number: string;
  service: string;
  country: string;
  created_at: number;
  expired_at: number;
  otp_code?: string;
  otp_msg?: string;
}

function ActiveOrderContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [telegramSettings, setTelegramSettings] = useState<{
    botToken: string;
    channelId: string;
    enabled: boolean;
    orderMarkup: number;
  } | null>(null);
  // Check if this order's OTP was already notified (persist across page refresh)
  const getNotifiedKey = (oid: string) => `otp_notified_${oid}`;
  const wasAlreadyNotified = (oid: string) => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(getNotifiedKey(oid)) === 'true';
  };
  const markAsNotified = (oid: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getNotifiedKey(oid), 'true');
    }
  };
  
  // Check if this order's expiration was already handled (persist across page refresh)
  const getExpiredKey = (oid: string) => `order_expired_${oid}`;
  const wasAlreadyExpired = (oid: string) => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(getExpiredKey(oid)) === 'true';
  };
  const markAsExpired = (oid: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(getExpiredKey(oid), 'true');
    }
  };
  
  const [otpNotified, setOtpNotified] = useState(false);
  
  // Use refs to avoid dependency issues
  const telegramSettingsRef = useRef(telegramSettings);
  const otpNotifiedRef = useRef(otpNotified);
  const userRef = useRef(user);
  const lastOtpCodeRef = useRef<string | null>(null);
  const pendingNotificationRef = useRef<{otp: string, status: any} | null>(null);
  const expiredHandledRef = useRef(false);
  
  // Keep refs in sync
  useEffect(() => {
    telegramSettingsRef.current = telegramSettings;
  }, [telegramSettings]);
  
  useEffect(() => {
    otpNotifiedRef.current = otpNotified;
  }, [otpNotified]);
  
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const orderId = searchParams.get("order_id");
  const phoneNumber = searchParams.get("phone_number");
  const service = searchParams.get("service");
  const country = searchParams.get("country");
  const expiredAt = searchParams.get("expired_at");
  const price = searchParams.get("price");
  const originalPrice = searchParams.get("original_price");
  const createdAt = searchParams.get("created_at");

  // Cancel lock state - 5 minutes (300 seconds) before cancel is allowed
  const [cancelLockTime, setCancelLockTime] = useState<number>(300);

  const checkStatus = useCallback(async () => {
    if (!orderId) return;
    
    // Don't refresh if order is already expired or completed
    const currentStatus = orderStatus?.status;
    if (currentStatus === "expired" || currentStatus === "success" || currentStatus === "cancel") {
      return;
    }

    try {
      const response = await fetch(`${BASE_URL_V1}/orders/get_status?order_id=${orderId}`, {
        method: "GET",
        headers: {
          "x-apikey": API_KEY,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        const newStatus = data.data;

        // Check if we got a new OTP code
        if (newStatus.otp_code && newStatus.otp_code !== lastOtpCodeRef.current) {
          lastOtpCodeRef.current = newStatus.otp_code;
          setNotification(`Kode OTP diterima: ${newStatus.otp_code}`);
          
          try {
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => {});
          } catch {}

          // Check if already notified for this order (persistent across page refresh)
          const alreadyNotifiedPersistent = wasAlreadyNotified(orderId);
          
          // DON'T mark transaction as success when OTP arrives
          // Only update the order with OTP code (doesn't change transaction status)
          // Transaction status should only be "success" when user clicks "Done" button
          if (!alreadyNotifiedPersistent) {
            // Only update order with OTP code - don't change transaction status
            updateOrderOTP(orderId, newStatus.otp_code, "otp_received").catch((err) => {
              console.error("[v0] Failed to update order OTP:", err);
            });
          }
          
          // Send Telegram notification if enabled and not already sent
          const settings = telegramSettingsRef.current;
          const currentUser = userRef.current;
          
          if (alreadyNotifiedPersistent) {
            setOtpNotified(true);
          } else if (settings?.enabled && !otpNotifiedRef.current && currentUser) {
            const priceNum = Number(price) || 0;
            const origPriceNum = Number(originalPrice) || priceNum;
            const profit = priceNum - origPriceNum;

            sendOTPNotificationToTelegram(
              {
                orderId,
                userEmail: currentUser.email,
                otpCode: newStatus.otp_code,
                phoneNumber: newStatus.phone_number || phoneNumber || "",
                originalPrice: origPriceNum,
                sellingPrice: priceNum,
                profit,
                otpMessage: newStatus.otp_msg,
                serviceName: service || "",
                countryName: country || "",
              },
              settings.botToken,
              settings.channelId
            ).then((res) => {
              if (res.success) {
                setOtpNotified(true);
                markAsNotified(orderId); // Persist notification status
              }
            }).catch((err) => {
              console.error("[v0] Telegram notification error:", err);
            });
          } else if (!settings && !alreadyNotifiedPersistent) {
            // Settings not loaded yet, save for later
            pendingNotificationRef.current = { otp: newStatus.otp_code, status: newStatus };
          }
        }

        setOrderStatus(newStatus);
      }
    } catch (err) {
      console.error("[v0] Failed to check status:", err);
    }
  }, [orderId, price, originalPrice, phoneNumber, service, country]);

  const setStatus = async (status: "cancel" | "resend" | "done") => {
    if (!orderId || !user) return;

    setActionLoading(status);
    setError(null);

    try {
      const response = await fetch(`${BASE_URL_V1}/orders/set_status?order_id=${orderId}&status=${status}`, {
        method: "GET",
        headers: {
          "x-apikey": API_KEY,
          Accept: "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        if (status === "cancel") {
          // Update existing transaction status to cancel (don't create new one)
          await updateTransactionStatus(orderId, "cancel");
          
          // Update GitHub database status
          try {
            await fetch("/api/orders/pending", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, status: "cancel" }),
            });
          } catch (ghErr) {
            console.error("[v0] Failed to update GitHub DB:", ghErr);
          }
          
          // Refund the balance to external DB and sync localStorage
          const priceNum = Number(price) || 0;
          
          // Get user from state or fallback to localStorage
          let currentUser = user;
          if (!currentUser) {
            const storedUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
            if (storedUser.email) {
              currentUser = storedUser;
            }
          }
          
          if (currentUser && currentUser.email && priceNum > 0) {
            const refundResult = await updateUserBalanceExternal(currentUser.email, priceNum);
            
            if (refundResult.success) {
              // Update localStorage balance with the new balance from API response
              const storedUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
              if (storedUser.email) {
                const newBalance = refundResult.data?.balance ?? (storedUser.balance || 0) + priceNum;
                storedUser.balance = newBalance;
                localStorage.setItem("currentUser", JSON.stringify(storedUser));
              }
              setNotification(`Order dibatalkan. Saldo Rp ${priceNum.toLocaleString("id-ID")} dikembalikan.`);
            } else {
              setNotification(`Order dibatalkan. Gagal refund: ${refundResult.message}`);
            }
          } else {
            setNotification("Order dibatalkan. User tidak ditemukan untuk refund.");
          }
          
          // Remove from active orders
          if (orderId) removeActiveOrder(orderId);
          // Update localStorage history status
          updateOrderHistoryStatus(orderId, "cancel");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else if (status === "done") {
          // Update existing transaction status to success
          await updateTransactionStatus(orderId, "success");
          // Update GitHub database status
          try {
            await fetch("/api/orders/pending", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId, status: "success" }),
            });
          } catch (ghErr) {
            console.error("[v0] Failed to update GitHub DB:", ghErr);
          }
          // Remove from active orders
          if (orderId) removeActiveOrder(orderId);
          // Update localStorage history status with OTP code
          updateOrderHistoryStatus(orderId, "success", orderStatus?.otp_code);
          setNotification("Order selesai!");
          setTimeout(() => router.push("/dashboard"), 2000);
        } else if (status === "resend") {
          setNotification("Permintaan kirim ulang SMS berhasil.");
        }

        await checkStatus();
      } else {
        const errMsg = data.error?.message || data.message || "Gagal mengubah status";
        setError(errMsg);
      }
    } catch (err: any) {
      console.error("[v0] Set status error:", err);
      setError("Terjadi kesalahan jaringan");
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      // Clean the text - remove spaces and special characters
      const cleanText = text.replace(/[\s\-\(\)]/g, "");
      await navigator.clipboard.writeText(cleanText);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      // Fallback for older browsers or permission issues
      const textArea = document.createElement("textarea");
      textArea.value = text.replace(/[\s\-\(\)]/g, "");
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
      } catch (e) {
        console.error("[v0] Copy failed:", e);
      }
      document.body.removeChild(textArea);
    }
  };

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/auth/login");
      return;
    }
    setUser(current);

    // Load Telegram settings first, then start checking status
    const initialize = async () => {
      try {
        const settings = await getAdminSettings();
        if (settings.success && settings.data) {
          const tgSettings = {
            botToken: settings.data.telegram.botToken,
            channelId: settings.data.telegram.channelId,
            enabled: settings.data.telegram.enabled,
            orderMarkup: settings.data.fees.orderMarkup,
          };
          setTelegramSettings(tgSettings);
          telegramSettingsRef.current = tgSettings;
          console.log("[v0] Telegram settings loaded:", {
            enabled: tgSettings.enabled,
            hasBotToken: !!tgSettings.botToken,
            hasChannelId: !!tgSettings.channelId,
          });
          
          // Process any pending notification that was waiting for settings
          const pending = pendingNotificationRef.current;
          if (pending && orderId && !wasAlreadyNotified(orderId)) {
            // Only update order with OTP code - don't change transaction status yet
            updateOrderOTP(orderId, pending.otp, "otp_received").catch((err) => {
              console.error("[v0] Failed to update order OTP:", err);
            });
            
            // Send Telegram notification if enabled
            if (tgSettings.enabled && current) {
              const priceNum = Number(price) || 0;
              const origPriceNum = Number(originalPrice) || priceNum;
              const profit = priceNum - origPriceNum;
              
              sendOTPNotificationToTelegram(
                {
                  orderId,
                  userEmail: current.email,
                  otpCode: pending.otp,
                  phoneNumber: pending.status.phone_number || phoneNumber || "",
                  originalPrice: origPriceNum,
                  sellingPrice: priceNum,
                  profit,
                  otpMessage: pending.status.otp_msg,
                  serviceName: service || "",
                  countryName: country || "",
                },
                tgSettings.botToken,
                tgSettings.channelId
              ).then((res) => {
                if (res.success) {
                  setOtpNotified(true);
                  markAsNotified(orderId);
                }
              }).catch((err) => {
                console.error("[v0] Pending Telegram notification error:", err);
              });
            }
            
            pendingNotificationRef.current = null;
          }
        }
      } catch (err) {
        console.error("[v0] Failed to load telegram settings:", err);
      }
      
      // Start checking status after settings are loaded
      checkStatus();
    };
    
    initialize();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [router, checkStatus]);

  useEffect(() => {
    if (!expiredAt) return;

    const handleExpiration = async () => {
      // Only handle expiration once
      if (!orderId) return;
      if (expiredHandledRef.current) return;
      if (wasAlreadyExpired(orderId)) {
        expiredHandledRef.current = true;
        setNotification("Waktu habis! Order expired.");
        return;
      }
      
      // NOTE: We should NOT skip expiration just because OTP was notified
      // Even if OTP was received, if the order expires, we need to handle it
      // The user must click "Selesai" button to complete and keep the order
      // If they don't click it before expiration, the order is expired and should be refunded
      
      // Double check with API before expiring - fetch latest status
      // ONLY check for REAL OTP code, ignore status field completely
      try {
        const response = await fetch(`${BASE_URL_V1}/orders/get_status?order_id=${orderId}`, {
          method: "GET",
          headers: {
            "x-apikey": API_KEY,
            Accept: "application/json",
          },
        });
        const data = await response.json();
        
        if (data.success && data.data) {
          const latestStatus = data.data;
          const otpCode = latestStatus.otp_code;
          
          // STRICT CHECK: Only consider OTP valid if it's a real code (numbers)
          // "-", "", null, undefined, "Menunggu SMS" are NOT valid OTPs
          const isValidOtp = otpCode && 
            typeof otpCode === "string" && 
            otpCode.trim() !== "" && 
            otpCode !== "-" && 
            otpCode !== "Menunggu SMS" &&
            /\d/.test(otpCode); // Must contain at least one digit
          
          if (isValidOtp) {
            // Real OTP received - only update order, don't change transaction status
            // User must click "Selesai" button to mark as success
            await updateOrderOTP(orderId, otpCode, "otp_received");
            markAsNotified(orderId);
            setNotification(`Kode OTP diterima: ${otpCode}`);
            return;
          }
        }
      } catch (err) {
        console.error("[v0] Failed to check latest status before expiring:", err);
      }
      
      // OTP NOT received - proceed with expiration and refund
      
      expiredHandledRef.current = true;
      markAsExpired(orderId);
      
      // Update transaction status to expired
      try {
        await updateTransactionStatus(orderId, "expired");
        
        // Update GitHub database status
        try {
          await fetch("/api/orders/pending", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, status: "expired" }),
          });
        } catch (ghErr) {
          console.error("[v0] Failed to update GitHub DB:", ghErr);
        }
        
        // IMMEDIATELY update local state to show expired status
        setOrderStatus((prev) => prev ? { ...prev, status: "expired" } : null);
        
        // Refund the balance - get user from localStorage if ref is null
        const priceNum = Number(price) || 0;
        let currentUser = userRef.current;
        
        // Fallback to localStorage if userRef is null
        if (!currentUser) {
          const storedUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
          if (storedUser.email) {
            currentUser = storedUser;
          }
        }
        
        if (currentUser && currentUser.email && priceNum > 0) {
          const refundResult = await updateUserBalanceExternal(currentUser.email, priceNum);
          
          if (refundResult.success) {
            // Update localStorage balance with the new balance from API response
            const storedUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
            if (storedUser.email) {
              // Use the balance from API response if available, otherwise calculate
              const newBalance = refundResult.data?.balance ?? (storedUser.balance || 0) + priceNum;
              storedUser.balance = newBalance;
              localStorage.setItem("currentUser", JSON.stringify(storedUser));
            }
            setNotification(`Waktu habis! Order expired. Saldo Rp ${priceNum.toLocaleString("id-ID")} dikembalikan.`);
          } else {
            setNotification(`Waktu habis! Order expired. Gagal refund: ${refundResult.message}`);
          }
        } else {
          setNotification("Waktu habis! Order expired. User tidak ditemukan untuk refund.");
        }
        
        // Remove from active orders
        removeActiveOrder(orderId);
        
        // Update localStorage history status
        updateOrderHistoryStatus(orderId, "expired");
      } catch (err) {
        console.error("[v0] Failed to handle expiration:", err);
        setNotification("Waktu habis! Order expired. Error saat refund.");
      }
    };

    const updateTimer = () => {
      const now = Date.now();
      const expired = Number(expiredAt);
      const remaining = Math.max(0, Math.floor((expired - now) / 1000));
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        handleExpiration();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiredAt, orderId, price]);

  // Cancel lock timer - 5 minutes from order creation
  useEffect(() => {
    if (!createdAt) return;

    const updateCancelLock = () => {
      const now = Date.now();
      const created = Number(createdAt);
      const unlockTime = created + (5 * 60 * 1000); // 5 minutes after creation
      const remaining = Math.max(0, Math.floor((unlockTime - now) / 1000));
      setCancelLockTime(remaining);
    };

    updateCancelLock();
    const interval = setInterval(updateCancelLock, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!user) return null;

  const displayPhone = orderStatus?.phone_number || phoneNumber || "";
  const displayService = orderStatus?.service || service || "";
  const displayCountry = orderStatus?.country || country || "";
  const currentStatus = orderStatus?.status || "waiting"; // Default to waiting, not received
  const otpCode = orderStatus?.otp_code;
  const otpMsg = orderStatus?.otp_msg;

  const isExpired = currentStatus === "expired" || timeLeft <= 0;
  const isCompleted = currentStatus === "completed" || currentStatus === "canceled" || currentStatus === "expired" || currentStatus === "success";
  
  // Status-based button rules (from rumahotp.io API):
  // - Cancel: Only when status is "waiting" (no OTP received yet)
  // - Resend: Only when status is "received" (OTP already received, want another)
  // - Done/Finish: Only when status is "received" (confirming order completion)
  const canCancel = currentStatus === "waiting" && cancelLockTime <= 0 && !isExpired;
  const canResend = currentStatus === "received" && !isExpired;
  const canFinish = currentStatus === "received" && !!otpCode && !isExpired;

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-80px)] relative overflow-hidden bg-gray-50">
        {/* Background Pattern */}
        <div className="absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, #475569 1px, transparent 1px)`,
              backgroundSize: "24px 24px",
              opacity: 0.06,
            }}
          />
        </div>

        <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 py-6 pb-20">
          {/* Header */}
          <div className="mb-6">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium mb-3"
            >
              <ArrowLeft size={15} />
              Kembali ke Layanan
            </Link>
            <div className="flex items-center gap-2 mb-1">
              <Terminal size={12} className="text-slate-400" />
              <span className="text-[10px] font-mono text-slate-400 tracking-wider">ORDER AKTIF</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-amber-500 rounded-full" />
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">{displayService}</h1>
            </div>
            <p className="text-slate-500 text-sm mt-0.5 ml-3">{displayCountry}</p>
          </div>

          {/* Notification Banner */}
          {notification && (
            <div
              className={`flex items-center gap-3 p-3 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] mb-4 ${
                otpCode ? "bg-teal-400" : "bg-amber-400"
              }`}
            >
              {otpCode ? (
                <CheckCircle size={18} className="text-slate-800 shrink-0" />
              ) : (
                <MessageSquare size={18} className="text-slate-800 shrink-0" />
              )}
              <span className="font-bold text-slate-800 text-sm">{notification}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="flex items-center gap-3 p-3 bg-rose-100 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] mb-4">
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
              <span className="font-bold text-slate-800 text-sm">{error}</span>
            </div>
          )}

          {/* Main Card */}
          <div className="bg-white rounded-2xl border-2 border-slate-800 shadow-[5px_5px_0px_#1e293b] overflow-hidden">
            {/* Timer Header */}
            <div
              className={`px-4 py-3 border-b-2 border-slate-800 ${
                isExpired ? "bg-rose-500" : "bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-white" />
                  <span className="text-white font-bold text-xs tracking-wider">
                    {isExpired ? "EXPIRED" : "WAKTU TERSISA"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {/* Status Badge */}
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wider ${
                    currentStatus === "expired"
                      ? "bg-red-500 text-white"
                      : currentStatus === "received" 
                      ? "bg-teal-400 text-slate-800" 
                      : currentStatus === "waiting"
                      ? "bg-amber-400 text-slate-800"
                      : currentStatus === "completed" || currentStatus === "success"
                      ? "bg-green-400 text-slate-800"
                      : currentStatus === "canceled"
                      ? "bg-rose-400 text-white"
                      : "bg-slate-400 text-white"
                  }`}>
                    {currentStatus === "expired" ? "WAKTU HABIS"
                      : currentStatus === "received" ? "OTP DITERIMA" 
                      : currentStatus === "waiting" ? "MENUNGGU OTP"
                      : currentStatus === "completed" || currentStatus === "success" ? "SELESAI"
                      : currentStatus === "canceled" ? "DIBATALKAN"
                      : currentStatus?.toUpperCase()}
                  </span>
                  <div className="font-mono text-xl font-black text-amber-400">{formatTime(timeLeft)}</div>
                </div>
              </div>
            </div>

            {/* Phone Number Row */}
            <div className="px-4 py-4 border-b-2 border-slate-200">
              <div className="flex items-center gap-1.5 mb-2">
                <Phone size={13} className="text-slate-400" />
                <span className="text-[10px] font-mono text-slate-400 tracking-wider">NOMOR TELEPON</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-lg font-black text-slate-800 font-mono tracking-wider">
                  {displayPhone}
                </span>
                <button
                  onClick={() => copyToClipboard(displayPhone, "phone")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-xs font-bold whitespace-nowrap"
                >
                  <Copy size={12} />
                  {copied === "phone" ? "TERSALIN!" : "SALIN"}
                </button>
              </div>
            </div>

            {/* OTP Row */}
            <div className="px-4 py-4 border-b-2 border-slate-200">
              <div className="flex items-center gap-1.5 mb-2">
                <MessageSquare size={13} className="text-slate-400" />
                <span className="text-[10px] font-mono text-slate-400 tracking-wider">PESAN / KODE OTP</span>
              </div>
              {otpCode ? (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-2xl font-black text-teal-600 font-mono tracking-[6px]">
                      {otpCode}
                    </span>
                    <button
                      onClick={() => copyToClipboard(otpCode, "otp")}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-100 rounded-lg border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-xs font-bold text-teal-700 whitespace-nowrap"
                    >
                      <Copy size={12} />
                      {copied === "otp" ? "TERSALIN!" : "SALIN"}
                    </button>
                  </div>
                  {otpMsg && (
                    <div className="bg-slate-50 rounded-lg border-2 border-slate-200 p-2.5 text-xs text-slate-600">
                      <span className="text-[10px] font-mono text-slate-400 block mb-1">PESAN LENGKAP:</span>
                      {otpMsg}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2.5 text-slate-400 py-1">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm font-medium">Menunggu kode OTP...</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {!isCompleted && (
              <div className="px-4 py-4">
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Cancel - Only when waiting (no OTP yet) and lock time passed */}
                  <button
                    onClick={() => setStatus("cancel")}
                    disabled={actionLoading !== null || !canCancel}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] transition-all font-bold text-sm disabled:cursor-not-allowed ${
                      !canCancel
                        ? "bg-slate-300 text-slate-500"
                        : "bg-rose-500 text-white hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] disabled:opacity-50"
                    }`}
                    title={isExpired ? "Waktu habis - order sudah expired" : currentStatus === "received" ? "Tidak bisa cancel - OTP sudah diterima" : cancelLockTime > 0 ? `Tunggu ${formatTime(cancelLockTime)}` : "Batalkan order"}
                  >
                    {actionLoading === "cancel" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : cancelLockTime > 0 && currentStatus === "waiting" ? (
                      <Clock size={15} />
                    ) : (
                      <XCircle size={15} />
                    )}
                    {cancelLockTime > 0 && currentStatus === "waiting" ? (
                      <span className="font-mono">{formatTime(cancelLockTime)}</span>
                    ) : currentStatus === "received" ? (
                      "OTP DITERIMA"
                    ) : (
                      "CANCEL"
                    )}
                  </button>

                  {/* Resend - Only when OTP already received */}
                  <button
                    onClick={() => setStatus("resend")}
                    disabled={actionLoading !== null || !canResend}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] transition-all font-bold text-sm disabled:cursor-not-allowed ${
                      canResend
                        ? "bg-amber-500 text-slate-800 hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                        : "bg-slate-300 text-slate-500"
                    }`}
                    title={!canResend ? "Resend hanya tersedia setelah OTP diterima" : "Minta SMS ulang"}
                  >
                    {actionLoading === "resend" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <RefreshCw size={15} />
                    )}
                    {canResend ? "RESEND" : "MENUNGGU..."}
                  </button>

                  {/* Finish - Only when OTP received */}
                  <button
                    onClick={() => setStatus("done")}
                    disabled={actionLoading !== null || !canFinish}
                    className={`flex items-center justify-center gap-2 py-3 px-3 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] transition-all font-bold text-sm disabled:cursor-not-allowed ${
                      canFinish 
                        ? "bg-teal-500 text-white hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px]" 
                        : "bg-slate-200 text-slate-400"
                    }`}
                    title={!canFinish ? "Finish hanya tersedia setelah OTP diterima" : "Selesaikan order"}
                  >
                    {actionLoading === "done" ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <CheckCircle size={15} />
                    )}
                    FINISH
                  </button>

                  {/* Copy Number */}
                  <button
                    onClick={() => copyToClipboard(displayPhone, "phone2")}
                    className="flex items-center justify-center gap-2 py-3 px-3 bg-sky-500 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all font-bold text-white text-sm"
                  >
                    <Copy size={15} />
                    {copied === "phone2" ? "TERSALIN!" : "COPY NO"}
                  </button>
                </div>
              </div>
            )}

            {/* Completed State */}
            {isCompleted && (
              <div className="px-4 py-4">
                <button
                  onClick={() => router.push("/dashboard")}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-slate-800 rounded-xl border-2 border-slate-800 shadow-[3px_3px_0px_#475569] hover:shadow-[4px_4px_0px_#475569] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all font-bold text-white text-sm"
                >
                  <ArrowLeft size={15} />
                  KEMBALI KE DASHBOARD
                </button>
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="mt-4 bg-slate-200 rounded-xl border-2 border-slate-800 p-3.5 shadow-[3px_3px_0px_#1e293b]">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-[10px] font-mono text-slate-500 tracking-wider block mb-0.5">ORDER ID</span>
                <span className="font-bold text-slate-800 text-xs">{orderId}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-slate-500 tracking-wider block mb-0.5">HARGA</span>
                <span className="font-bold text-slate-800 text-sm">
                  Rp {Number(price || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ActiveOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen w-full items-center justify-center bg-gray-50">
          <Loader2 className="animate-spin" size={40} color="#475569" />
        </div>
      }
    >
      <ActiveOrderContent />
    </Suspense>
  );
}
