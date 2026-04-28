"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getCurrentUser, updateUserBalance, refreshUserData, type User } from "@/lib/auth";
import { addActiveOrder } from "@/lib/orders";
import { createTransaction, updateUserBalanceExternal, createOrderWithProfit, getAdminSettings } from "@/lib/externalDB";
import Navbar from "@/components/Navbar";
import axios from "axios";
import {
  ArrowLeft,
  Loader2,
  Terminal,
  Globe,
  Phone,
  Signal,
  ShoppingCart,
  Zap,
  Wallet,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";

const API_KEY = process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY || "";
const BASE_URL = "https://www.rumahotp.io/api/v2"; // For services, countries, operators, orders/create
const BASE_URL_V1 = "https://www.rumahotp.io/api/v1"; // For orders/set_status (cancel, done, resend)

interface Operator {
  id: number;
  name: string;
  image: string;
}

function OrderDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Get params from URL
  const countryId = searchParams.get("country_id");
  const countryName = searchParams.get("country_name");
  const countryImg = searchParams.get("country_img");
  const prefix = searchParams.get("prefix");
  const stock = searchParams.get("stock");
  const priceFormat = searchParams.get("price_format");
  const price = searchParams.get("price");
  const originalPrice = searchParams.get("original_price");
  const markup = searchParams.get("markup");
  const providerId = searchParams.get("provider_id");
  const serviceCode = searchParams.get("service_code");
  const serviceName = searchParams.get("service_name");

  useEffect(() => {
    const fetchUserData = async () => {
      const current = getCurrentUser();
      if (!current) {
        router.push("/auth/login");
        return;
      }
      setUser(current);
      
      // Refresh user data to get latest balance
      setLoadingBalance(true);
      try {
        const refreshedUser = await refreshUserData();
        if (refreshedUser) {
          setUser(refreshedUser);
          setUserBalance(refreshedUser.balance || 0);
        } else {
          setUserBalance(current.balance || 0);
        }
      } catch (error) {
        console.error("Failed to refresh user data:", error);
        setUserBalance(current.balance || 0);
      } finally {
        setLoadingBalance(false);
      }
    };
    
    fetchUserData();
  }, [router]);

  useEffect(() => {
    const fetchOperators = async () => {
      if (!countryName || !providerId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${BASE_URL}/operators`, {
          params: {
            country: countryName,
            provider_id: providerId,
          },
          headers: {
            "x-apikey": API_KEY,
            Accept: "application/json",
          },
        });

        if (response.data.success) {
          setOperators(response.data.data);
          // Auto-select first operator (usually "any")
          if (response.data.data.length > 0) {
            setSelectedOperator(response.data.data[0]);
          }
        }
      } catch (error) {
        console.error("Failed to fetch operators:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOperators();
  }, [countryName, providerId]);

  const priceNumber = Number(price) || 0;
  const originalPriceNumber = Number(originalPrice) || priceNumber;
  const markupNumber = Number(markup) || 0;
  const profitNumber = priceNumber - originalPriceNumber;
  const hasEnoughBalance = userBalance >= priceNumber;

  const handlePurchase = async () => {
    if (!selectedOperator || !user) return;
    
    setPurchaseError(null);

    // Check if user has enough balance
    if (!hasEnoughBalance) {
      setPurchaseError("Saldo tidak mencukupi. Silakan deposit terlebih dahulu.");
      return;
    }

    setPurchasing(true);
    
    try {
      // Call the actual purchase API (v2/orders)
      // provider_id comes from the price list, number_id from country
      const response = await axios.get(`${BASE_URL}/orders`, {
        params: {
          number_id: countryId,
          provider_id: providerId,
          operator_id: selectedOperator.id,
        },
        headers: {
          "x-apikey": API_KEY,
          Accept: "application/json",
        },
      });

      console.log("[v0] Purchase API response:", JSON.stringify(response.data));

      // Handle different response formats
      const isSuccess = response.data.success === true || 
                       response.data.status === "success" || 
                       response.data.order_id || 
                       response.data.data?.order_id ||
                       response.data.id;
      
      const orderId = response.data.order_id || 
                     response.data.data?.order_id || 
                     response.data.id ||
                     response.data.data?.id ||
                     `order_${Date.now()}`;

      if (isSuccess) {
        // Extract order data first
        const orderData = response.data.data || response.data;
        
        // Try to deduct balance from user
        try {
          // 1. Deduct balance from user (both local and external)
          await updateUserBalance(-priceNumber);
          await updateUserBalanceExternal(user.email, -priceNumber);
          
          // 2. Create transaction record in JSON for purchase (status pending, akan di-update saat finish/cancel)
          await createTransaction({
            userId: user.email,
            userEmail: user.email,
            type: "purchase",
            amount: priceNumber,
            fee: profitNumber,
            total: priceNumber,
            status: "pending",
            depositId: orderId,
          });

          // 3. Create order with profit tracking
          await createOrderWithProfit({
            orderId,
            userEmail: user.email,
            serviceName: serviceName || "",
            countryName: countryName || "",
            phoneNumber: orderData.phone_number || orderData.phoneNumber || "",
            originalPrice: originalPriceNumber,
            sellingPrice: priceNumber,
            profit: profitNumber,
            status: "pending",
          });
          
          // Update local state
          setUserBalance((prev) => prev - priceNumber);
          
          // Redirect to active order page with order data
          const phoneNumber = orderData.phone_number || orderData.phoneNumber || "";
          const expiredAt = orderData.expired_at || orderData.expiredAt || (Date.now() + 10 * 60 * 1000);
          const createdAt = Date.now();
          
          // Save to active orders for multi-order support
          addActiveOrder({
            orderId,
            phoneNumber,
            service: serviceName || "",
            country: countryName || "",
            expiredAt: Number(expiredAt),
            price: priceNumber,
            createdAt,
            userEmail: user.email,
          });
          
          // Show success popup then redirect
          setShowSuccessPopup(true);
          setTimeout(() => {
            router.push(`/order/active?order_id=${orderId}&phone_number=${encodeURIComponent(phoneNumber)}&service=${encodeURIComponent(serviceName || "")}&country=${encodeURIComponent(countryName || "")}&expired_at=${expiredAt}&price=${priceNumber}&original_price=${originalPriceNumber}&created_at=${createdAt}`);
          }, 1500);
        } catch (balanceError) {
          // If balance update fails, log but still consider purchase successful
          // The order was created, balance will need manual adjustment
          console.error("[v0] Balance update failed:", balanceError);
          
          // Still redirect to active order page (orderData already declared above)
          const phoneNumber = orderData.phone_number || orderData.phoneNumber || "";
          const expiredAt = orderData.expired_at || orderData.expiredAt || (Date.now() + 10 * 60 * 1000);
          const createdAtFallback = Date.now();
          
          // Save to active orders for multi-order support
          addActiveOrder({
            orderId,
            phoneNumber,
            service: serviceName || "",
            country: countryName || "",
            expiredAt: Number(expiredAt),
            price: priceNumber,
            createdAt: createdAtFallback,
            userEmail: user.email,
          });
          
          // Show success popup then redirect
          setShowSuccessPopup(true);
          setTimeout(() => {
            router.push(`/order/active?order_id=${orderId}&phone_number=${encodeURIComponent(phoneNumber)}&service=${encodeURIComponent(serviceName || "")}&country=${encodeURIComponent(countryName || "")}&expired_at=${expiredAt}&price=${priceNumber}&original_price=${originalPriceNumber}&created_at=${createdAtFallback}`);
          }, 1500);
        }
      } else {
        // Purchase failed - NO balance was deducted
        // Handle error that might be an object with message property
        let errorMsg = "Pembelian gagal. Saldo tidak dipotong.";
        if (typeof response.data.message === "string") {
          errorMsg = response.data.message;
        } else if (typeof response.data.error === "string") {
          errorMsg = response.data.error;
        } else if (response.data.error?.message) {
          errorMsg = response.data.error.message;
        } else if (typeof response.data.msg === "string") {
          errorMsg = response.data.msg;
        }
        setPurchaseError(errorMsg);
      }
    } catch (error: any) {
      // API error - NO balance was deducted
      console.error("[v0] Purchase error:", error);
      // Handle error that might be an object with message property
      let errorMsg = "Terjadi kesalahan. Saldo tidak dipotong.";
      const errData = error.response?.data;
      if (typeof errData?.message === "string") {
        errorMsg = errData.message;
      } else if (typeof errData?.error === "string") {
        errorMsg = errData.error;
      } else if (errData?.error?.message) {
        errorMsg = errData.error.message;
      }
      setPurchaseError(errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden" style={{ background: "#FFFEF0" }}>
      {/* Success Popup */}
      {showSuccessPopup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)" }}
        >
          <div
            className="animate-bounce-in"
            style={{
              background: "#FFFFFF",
              border: "4px solid #0A0A0A",
              boxShadow: "8px 8px 0 #0A0A0A",
              padding: "32px 48px",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                background: "#10B981",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                border: "4px solid #0A0A0A",
              }}
            >
              <CheckCircle size={32} color="#FFFFFF" />
            </div>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontWeight: "900",
                fontSize: "18px",
                color: "#0A0A0A",
                letterSpacing: "2px",
                marginBottom: "8px",
              }}
            >
              ORDER BERHASIL!
            </p>
            <p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "12px",
                color: "#666",
                letterSpacing: "1px",
              }}
            >
              Mengalihkan ke halaman order...
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-bounce-in {
          animation: bounceIn 0.5s ease-out forwards;
        }
      `}</style>

      <Navbar />
      <div
        style={{
          fontFamily: "'Space Mono', 'Courier New', monospace",
          minHeight: "calc(100vh - 80px)",
          width: "100%",
          maxWidth: "100vw",
          overflowX: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "#0A0A0A",
            borderBottom: "4px solid #FFD600",
            padding: "20px 16px",
            position: "relative",
            overflow: "hidden",
          }}
          className="sm:px-10 sm:py-6"
        >
          {/* Grid Pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage:
                "linear-gradient(rgba(255,214,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,214,0,0.1) 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              pointerEvents: "none",
            }}
          />

          <div style={{ position: "relative", zIndex: 10, maxWidth: "1100px", margin: "0 auto" }}>
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "transparent",
                border: "2px solid #FFD600",
                padding: "8px 16px",
                color: "#FFD600",
                fontFamily: "'Space Mono', monospace",
                fontWeight: "700",
                fontSize: "12px",
                letterSpacing: "1px",
                cursor: "pointer",
                marginBottom: "16px",
              }}
            >
              <ArrowLeft size={16} />
              KEMBALI
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Terminal size={14} style={{ color: "#FFD600" }} />
              <span
                style={{
                  color: "#FFD600",
                  fontSize: "10px",
                  fontWeight: "900",
                  letterSpacing: "3px",
                }}
              >
                RUMAHOTP.IO // DETAIL ORDER
              </span>
            </div>

            <h1
              style={{
                color: "#FFFFFF",
                fontSize: "clamp(20px, 4vw, 28px)",
                fontWeight: "900",
                letterSpacing: "-1px",
                lineHeight: 1.2,
              }}
            >
              PILIH OPERATOR
            </h1>
          </div>
        </div>

        {/* Main Content */}
        <div style={{ padding: "24px 16px", maxWidth: "1100px", margin: "0 auto" }} className="sm:px-10 sm:py-8">
          {/* Order Info Card */}
          <div
            style={{
              background: "#FFFFFF",
              border: "4px solid #0A0A0A",
              boxShadow: "6px 6px 0 #0A0A0A",
              marginBottom: "24px",
            }}
          >
            {/* Card Header */}
            <div
              style={{
                background: "#0A0A0A",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Globe size={14} style={{ color: "#FFD600" }} />
              <span
                style={{
                  color: "#FFD600",
                  fontSize: "10px",
                  fontWeight: "900",
                  letterSpacing: "2px",
                }}
              >
                DETAIL PESANAN
              </span>
            </div>

            {/* Card Content */}
            <div style={{ padding: "20px" }}>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
                {/* Country Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  {countryImg && (
                    <img
                      src={countryImg}
                      alt={countryName || ""}
                      style={{
                        width: "48px",
                        height: "36px",
                        objectFit: "cover",
                        border: "3px solid #0A0A0A",
                      }}
                    />
                  )}
                  <div>
                    <p style={{ fontWeight: "900", fontSize: "16px", color: "#0A0A0A" }}>
                      {countryName}
                    </p>
                    <p style={{ fontSize: "12px", color: "#666", fontFamily: "monospace" }}>
                      {prefix}
                    </p>
                  </div>
                </div>

                {/* Service Info */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    style={{
                      width: "40px",
                      height: "40px",
                      background: "#FFD600",
                      border: "3px solid #0A0A0A",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Phone size={18} />
                  </div>
                  <div>
                    <p style={{ fontWeight: "900", fontSize: "14px", color: "#0A0A0A" }}>
                      {serviceName}
                    </p>
                    <p style={{ fontSize: "12px", color: "#666" }}>Service Code: {serviceCode}</p>
                  </div>
                </div>

                {/* Stock & Price */}
                <div className="flex gap-6">
                  <div>
                    <p style={{ fontSize: "10px", color: "#666", letterSpacing: "1px", marginBottom: "2px" }}>
                      STOK
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          width: "8px",
                          height: "8px",
                          background: Number(stock) > 0 ? "#00C851" : "#333333",
                          border: "2px solid #0A0A0A",
                        }}
                      />
                      <span style={{ fontWeight: "900", fontSize: "14px" }}>{stock}</span>
                    </div>
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", color: "#666", letterSpacing: "1px", marginBottom: "2px" }}>
                      HARGA
                    </p>
                    <span
                      style={{
                        fontWeight: "900",
                        fontSize: "16px",
                        color: "#0A0A0A",
                        background: "#FFD600",
                        padding: "2px 8px",
                        border: "2px solid #0A0A0A",
                      }}
                    >
                      {priceFormat}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Card */}
          <div
            style={{
              background: hasEnoughBalance ? "#E8F5E9" : "#FFEBEE",
              border: `4px solid ${hasEnoughBalance ? "#2E7D32" : "#C62828"}`,
              boxShadow: `6px 6px 0 ${hasEnoughBalance ? "#1B5E20" : "#B71C1C"}`,
              marginBottom: "24px",
              padding: "20px",
            }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background: hasEnoughBalance ? "#2E7D32" : "#C62828",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Wallet size={24} style={{ color: "#FFFFFF" }} />
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "4px" }}>
                    SALDO ANDA
                  </p>
                  <p style={{ fontWeight: "900", fontSize: "24px", color: "#0A0A0A" }}>
                    {loadingBalance ? "..." : `Rp${userBalance.toLocaleString("id-ID")}`}
                  </p>
                </div>
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div>
                  <p style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "4px" }}>
                    HARGA LAYANAN
                  </p>
                  <p style={{ fontWeight: "900", fontSize: "20px", color: "#0A0A0A" }}>
                    {priceFormat}
                  </p>
                </div>
                {!loadingBalance && (
                  <div
                    style={{
                      background: hasEnoughBalance ? "#2E7D32" : "#C62828",
                      padding: "8px 16px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    {hasEnoughBalance ? (
                      <>
                        <Zap size={14} style={{ color: "#FFFFFF" }} />
                        <span style={{ color: "#FFFFFF", fontSize: "11px", fontWeight: "900", letterSpacing: "1px" }}>
                          SALDO CUKUP
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={14} style={{ color: "#FFFFFF" }} />
                        <span style={{ color: "#FFFFFF", fontSize: "11px", fontWeight: "900", letterSpacing: "1px" }}>
                          SALDO KURANG
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {!hasEnoughBalance && !loadingBalance && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  background: "#FFCDD2",
                  border: "2px solid #C62828",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertTriangle size={16} style={{ color: "#C62828" }} />
                  <span style={{ fontSize: "12px", color: "#C62828", fontWeight: "700" }}>
                    Saldo tidak mencukupi. Anda perlu deposit Rp{(priceNumber - userBalance).toLocaleString("id-ID")} lagi.
                  </span>
                </div>
                <button
                  onClick={() => router.push("/deposit")}
                  style={{
                    background: "#C62828",
                    border: "none",
                    padding: "8px 16px",
                    color: "#FFFFFF",
                    fontFamily: "'Space Mono', monospace",
                    fontWeight: "700",
                    fontSize: "11px",
                    letterSpacing: "1px",
                    cursor: "pointer",
                  }}
                >
                  DEPOSIT SEKARANG
                </button>
              </div>
            )}
          </div>

          {/* Operators Section */}
          <div
            style={{
              background: "#FFFFFF",
              border: "4px solid #0A0A0A",
              boxShadow: "6px 6px 0 #0A0A0A",
              marginBottom: "24px",
            }}
          >
            {/* Section Header */}
            <div
              style={{
                background: "#0A0A0A",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Signal size={14} style={{ color: "#FFD600" }} />
              <span
                style={{
                  color: "#FFD600",
                  fontSize: "10px",
                  fontWeight: "900",
                  letterSpacing: "2px",
                }}
              >
                PILIH OPERATOR
              </span>
            </div>

            {/* Operators Grid */}
            <div style={{ padding: "20px" }}>
              {loading ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
                  <Loader2 size={32} className="animate-spin" style={{ color: "#0A0A0A" }} />
                </div>
              ) : operators.length === 0 ? (
                <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>
                  Tidak ada operator tersedia
                </p>
              ) : (
                <div
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
                  style={{ gap: "12px" }}
                >
                  {operators.map((operator) => (
                    <button
                      key={operator.id}
                      onClick={() => setSelectedOperator(operator)}
                      style={{
                        background:
                          selectedOperator?.id === operator.id ? "#FFD600" : "#FFFEF0",
                        border:
                          selectedOperator?.id === operator.id
                            ? "4px solid #0A0A0A"
                            : "3px solid #0A0A0A",
                        padding: "16px 12px",
                        cursor: "pointer",
                        boxShadow:
                          selectedOperator?.id === operator.id
                            ? "4px 4px 0 #0A0A0A"
                            : "3px 3px 0 #0A0A0A",
                        transition: "all 0.1s",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <img
                        src={operator.image}
                        alt={operator.name}
                        style={{
                          width: "40px",
                          height: "40px",
                          objectFit: "contain",
                          border: "2px solid #0A0A0A",
                          background: "#FFFFFF",
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://via.placeholder.com/40?text=" + operator.name.charAt(0).toUpperCase();
                        }}
                      />
                      <span
                        style={{
                          fontWeight: "900",
                          fontSize: "11px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "#0A0A0A",
                        }}
                      >
                        {operator.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Purchase Error */}
          {purchaseError && (
            <div
              style={{
                marginBottom: "16px",
                padding: "16px",
                background: "#FFEBEE",
                border: "3px solid #C62828",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <AlertTriangle size={20} style={{ color: "#C62828", flexShrink: 0 }} />
              <p style={{ fontSize: "13px", color: "#C62828", fontWeight: "700" }}>
                {purchaseError}
              </p>
            </div>
          )}

          {/* Purchase Button */}
          <button
            onClick={handlePurchase}
            disabled={!selectedOperator || purchasing || !hasEnoughBalance || loadingBalance}
            style={{
              width: "100%",
              background: selectedOperator && !purchasing && hasEnoughBalance && !loadingBalance ? "#FFD600" : "#CCCCCC",
              border: "4px solid #0A0A0A",
              padding: "20px",
              cursor: selectedOperator && !purchasing && hasEnoughBalance && !loadingBalance ? "pointer" : "not-allowed",
              boxShadow: "6px 6px 0 #0A0A0A",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              fontFamily: "'Space Mono', monospace",
              fontWeight: "900",
              fontSize: "16px",
              letterSpacing: "2px",
              color: "#0A0A0A",
              transition: "all 0.15s",
              opacity: hasEnoughBalance ? 1 : 0.6,
            }}
          >
            {purchasing ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                MEMPROSES...
              </>
            ) : !hasEnoughBalance ? (
              <>
                <AlertTriangle size={20} />
                SALDO TIDAK CUKUP
              </>
            ) : (
              <>
                <ShoppingCart size={20} />
                BELI SEKARANG - {priceFormat}
              </>
            )}
          </button>

          {/* Info Note */}
          <div
            style={{
              marginTop: "20px",
              padding: "16px",
              background: "#F5F4E0",
              border: "3px solid #0A0A0A",
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
            }}
          >
            <Zap size={18} style={{ color: "#0A0A0A", flexShrink: 0 }} />
            <p style={{ fontSize: "12px", color: "#0A0A0A", lineHeight: 1.5 }}>
              Setelah pembelian, nomor virtual akan langsung aktif dan siap menerima OTP.
              Pastikan saldo Anda mencukupi sebelum melakukan pembelian.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading component for Suspense
function LoadingFallback() {
  return (
    <div className="min-h-screen w-full" style={{ background: "#FFFEF0" }}>
      <Navbar />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 80px)",
        }}
      >
        <Loader2 size={48} className="animate-spin" style={{ color: "#0A0A0A" }} />
      </div>
    </div>
  );
}

// Main export with Suspense wrapper
export default function OrderDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OrderDetailContent />
    </Suspense>
  );
}
