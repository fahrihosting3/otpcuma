"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import {
  Loader2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Search,
  TrendingUp,
  TrendingDown,
  Copy,
  RefreshCw,
  Inbox,
  HelpCircle,
  X,
  Wallet,
  ExternalLink,
  Bell,
  Sun,
  User,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  LayoutDashboard,
  Receipt,
  Clock,
  XCircle,
  Phone,
} from "lucide-react";
import { getAdminSettings, createTransaction, updateUserBalanceExternal, createOrderWithProfit, checkAndProcessExpiredOrdersFromDB } from "@/lib/externalDB";
import { getCurrentUser, refreshUserData } from "@/lib/auth";
import { addActiveOrder, addOrderToHistory, getOrderHistory, getOrderHistoryStats, type OrderHistory } from "@/lib/orders";
import { toast } from "sonner";

const API_KEY = process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY || "";
const BASE_URL = "https://www.rumahotp.io/api/v2";

/** jumlah aplikasi yang dianggap "populer" (ditampilkan di grid atas sheet) */
const POPULAR_COUNT = 6;

interface Service {
  service_code: number;
  service_name: string;
  service_img: string;
}

interface PriceItem {
  provider_id: string;
  server_id: number;
  stock: number;
  price: number;
  price_format: string;
  available: boolean;
}

interface Country {
  number_id: number;
  name: string;
  img: string;
  prefix: string;
  rate: number;
  stock_total: number;
  pricelist: PriceItem[];
}

interface Operator {
  id: number;
  name: string;
  image: string;
}

/** derive kode 2-huruf negara untuk badge (ID, US, dst) */
const deriveCountryCode = (country: Country) => {
  const match = country.img?.match(/\/([a-z]{2})\.(?:svg|png|webp|jpg)/i);
  if (match) return match[1].toUpperCase();
  return country.name.slice(0, 2).toUpperCase();
};

/** label versi server: heuristik dari server_id */
const getServerVersion = (serverId: number) => {
  if (serverId < 4000) return "2.0";
  return "3.0";
};

export default function BuyNumber() {
  const router = useRouter();

  const [userEmail, setUserEmail] = useState<string>("");
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingCountries, setLoadingCountries] = useState(false);

  // search
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  // sort countries
  const [sortBy, setSortBy] = useState<"rate" | "price">("rate");

  // expanded country rows (dropdown of servers)
  const [openDropdowns, setOpenDropdowns] = useState<Record<number, boolean>>({});

  // admin markup
  const [orderMarkup, setOrderMarkup] = useState<number>(0);

  // Bottom sheet
  const [sheetMounted, setSheetMounted] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);

  // Active orders (Pesanan Pending) - from GitHub database
  interface PendingOrderData {
    orderId: string;
    userEmail: string;
    phoneNumber: string;
    serviceName: string;
    serviceCode: string;
    countryName: string;
    countryCode: string;
    sellingPrice: number;
    originalPrice: number;
    profit: number;
    status: string;
    otpCode?: string;
    createdAt: string;
    expiredAt: number;
  }
  const [activeOrders, setActiveOrders] = useState<PendingOrderData[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [, forceTick] = useState(0);
  
  // Order history state
  const [orderHistory, setOrderHistory] = useState<OrderHistory[]>([]);
  const [orderStats, setOrderStats] = useState({ total: 0, success: 0, pending: 0, expired: 0, cancel: 0 });

  // Operator selection popup
  const [showOperatorPopup, setShowOperatorPopup] = useState(false);
  const [operatorPopupData, setOperatorPopupData] = useState<{
    country: Country;
    priceItem: PriceItem;
  } | null>(null);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loadingOperators, setLoadingOperators] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState<Operator | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  // Track if expired check was done
  const expiredCheckDoneRef = useRef(false);

  // Fetch pending orders from GitHub database API
  const fetchPendingOrders = async (email: string) => {
    setLoadingOrders(true);
    try {
      const res = await fetch(`/api/orders/pending?userEmail=${encodeURIComponent(email)}`);
      const result = await res.json();
      if (result.success && result.data) {
        // Filter only pending orders that are not expired
        const now = Date.now();
        const validOrders = result.data.filter((o: PendingOrderData) => o.status === "pending" && o.expiredAt > now);
        setActiveOrders(validOrders);
      }
    } catch (err) {
      console.error("[v0] Error fetching pending orders:", err);
    } finally {
      setLoadingOrders(false);
    }
  };

  // ===== LOAD USER + ACTIVE ORDERS =====
  useEffect(() => {
    const u = getCurrentUser();
    if (u?.email) {
      setUserEmail(u.email);
      setUser(u);
      setUserBalance(u.balance || 0);
      fetchBalance();
      fetchPendingOrders(u.email);
      
      // Load order history from localStorage
      const history = getOrderHistory(u.email);
      setOrderHistory(history);
      setOrderStats(getOrderHistoryStats(u.email));
      
      // Check and process expired orders from DATABASE (cross-device compatible)
      if (!expiredCheckDoneRef.current) {
        expiredCheckDoneRef.current = true;
        checkAndProcessExpiredOrdersFromDB(u.email).then((result) => {
          if (result.success && result.processedOrders.length > 0) {
            const totalRefund = result.processedOrders
              .filter((o) => o.refunded)
              .reduce((sum, o) => sum + o.amount, 0);
            
            if (totalRefund > 0) {
              // Refresh balance and pending orders after refund
              refreshUserData().then((updatedUser) => {
                if (updatedUser) {
                  setUserBalance(updatedUser.balance || 0);
                  setUser(updatedUser);
                }
              });
              fetchPendingOrders(u.email);
              toast.success(`Order expired! Saldo Rp ${totalRefund.toLocaleString("id-ID")} telah dikembalikan.`);
            }
          }
        }).catch((err) => {
          console.error("[v0] Error checking expired orders:", err);
        });
      }
    }
  }, []);

  const fetchBalance = async () => {
    setRefreshingBalance(true);
    setLoadingBalance(true);
    try {
      const updatedUser = await refreshUserData();
      if (updatedUser) {
        setUserBalance(updatedUser.balance || 0);
        setUser(updatedUser);
      }
    } catch (err) {
      console.error("Gagal ambil saldo", err);
    } finally {
      setLoadingBalance(false);
      setRefreshingBalance(false);
    }
  };

  // Tick every second for timer updates + refresh orders from DB every 10 seconds
  useEffect(() => {
    if (!userEmail) return;
    let tickCount = 0;
    const interval = setInterval(() => {
      forceTick((x) => x + 1);
      tickCount++;
      // Refresh from database every 10 seconds
      if (tickCount % 10 === 0) {
        fetchPendingOrders(userEmail);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [userEmail]);

  const refreshPending = async () => {
    if (userEmail) {
      setLoadingOrders(true);
      await fetchPendingOrders(userEmail);
      toast.success("Pesanan diperbarui");
    }
  };

  // ===== BOTTOM SHEET CONTROLS =====
  const openSheet = () => {
    setSheetMounted(true);
    // kick a frame so transition triggers
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setSheetVisible(true));
    });
  };

  const closeSheet = () => {
    setSheetVisible(false);
    setTimeout(() => {
      setSheetMounted(false);
      setSelectedService(null);
      setCountries([]);
      setOpenDropdowns({});
      setAppSearchQuery("");
      setCountrySearchQuery("");
    }, 280);
  };

  // lock body scroll while open
  useEffect(() => {
    if (sheetMounted) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [sheetMounted]);

  const toggleDropdown = (countryId: number) => {
    setOpenDropdowns((prev) => ({ ...prev, [countryId]: !prev[countryId] }));
  };

  const formatSellingPrice = (originalPrice: number) => {
    const selling = (originalPrice || 0) + orderMarkup;
    return `Rp${selling.toLocaleString("id-ID")}`;
  };

  const getCountryMinSellingPrice = (country: Country) => {
    if (!country.pricelist?.length) return null;
    const minOriginal = Math.min(...country.pricelist.map((p) => p.price));
    return minOriginal + orderMarkup;
  };

  // ===== FETCH SERVICES + SETTINGS =====
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/services`, {
          headers: { "x-apikey": API_KEY, Accept: "application/json" },
        });
        if (res.data.success) setServices(res.data.data);
      } catch (err) {
        console.error("[v0] fetch services error:", err);
      } finally {
        setLoadingServices(false);
      }
    };

    const fetchSettings = async () => {
      try {
        const settings = await getAdminSettings();
        if (settings.success && settings.data) {
          setOrderMarkup(settings.data.fees.orderMarkup || 0);
        }
      } catch (err) {
        console.error("[v0] fetch settings error:", err);
      }
    };

    fetchServices();
    fetchSettings();
  }, []);

  // ===== FETCH COUNTRIES WHEN SERVICE SELECTED =====
  useEffect(() => {
    if (!selectedService) return;
    setOpenDropdowns({});
    setCountrySearchQuery("");
    const fetchCountries = async () => {
      setLoadingCountries(true);
      setCountries([]);
      try {
        const res = await axios.get(
          `${BASE_URL}/countries?service_id=${selectedService.service_code}`,
          { headers: { "x-apikey": API_KEY, Accept: "application/json" } }
        );
        if (res.data.success) setCountries(res.data.data);
      } catch (err) {
        console.error("[v0] fetch countries error:", err);
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchCountries();
  }, [selectedService]);

  // ===== SERVICES FILTER =====
  const filteredServices = useMemo(() => {
    const q = appSearchQuery.trim().toLowerCase();
    if (!q) return services;
    return services.filter((s) => s.service_name.toLowerCase().includes(q));
  }, [services, appSearchQuery]);

  const popularServices = appSearchQuery.trim()
    ? []
    : filteredServices.slice(0, POPULAR_COUNT);
  const restServices = appSearchQuery.trim()
    ? filteredServices
    : filteredServices.slice(POPULAR_COUNT);

  // ===== COUNTRY FILTER + SORT =====
  const displayedCountries = useMemo(() => {
    let list = [...countries];
    const q = countrySearchQuery.trim().toLowerCase();
    if (q) list = list.filter((c) => c.name.toLowerCase().includes(q));

    if (sortBy === "rate") {
      list.sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));
    } else {
      list.sort((a, b) => {
        const ap = a.pricelist[0]?.price ?? Number.POSITIVE_INFINITY;
        const bp = b.pricelist[0]?.price ?? Number.POSITIVE_INFINITY;
        return ap - bp;
      });
    }
    return list;
  }, [countries, countrySearchQuery, sortBy]);

  // ===== OPEN OPERATOR POPUP =====
  const openOperatorPopup = async (country: Country, priceItem: PriceItem) => {
    setOperatorPopupData({ country, priceItem });
    setShowOperatorPopup(true);
    setLoadingOperators(true);
    setOperators([]);
    setSelectedOperator(null);
    setPurchaseError(null);

    try {
      const response = await axios.get(`${BASE_URL}/operators`, {
        params: {
          country: country.name,
          provider_id: priceItem.provider_id,
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
      toast.error("Gagal memuat operator");
    } finally {
      setLoadingOperators(false);
    }
  };

  const closeOperatorPopup = () => {
    setShowOperatorPopup(false);
    setTimeout(() => {
      setOperatorPopupData(null);
      setOperators([]);
      setSelectedOperator(null);
      setPurchaseError(null);
    }, 300);
  };

  // ===== HANDLE PURCHASE =====
  const handlePurchase = async () => {
    if (!selectedOperator || !user || !operatorPopupData) return;
    
    const { country, priceItem } = operatorPopupData;
    const sellingPrice = priceItem.price + orderMarkup;
    const originalPrice = priceItem.price;
    const profitNumber = sellingPrice - originalPrice;

    setPurchaseError(null);

    // Check if user has enough balance
    if (userBalance < sellingPrice) {
      setPurchaseError("Saldo tidak mencukupi. Silakan deposit terlebih dahulu.");
      return;
    }

    setPurchasing(true);
    
    try {
      // Call the actual purchase API
      const response = await axios.get(`${BASE_URL}/orders`, {
        params: {
          number_id: country.number_id,
          provider_id: priceItem.provider_id,
          operator_id: selectedOperator.id,
        },
        headers: {
          "x-apikey": API_KEY,
          Accept: "application/json",
        },
      });

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
        const orderData = response.data.data || response.data;
        
        try {
          // Deduct balance - only call one function to avoid double deduction
          await updateUserBalanceExternal(user.email, -sellingPrice);
          
          // Create transaction record
          await createTransaction({
            userId: user.email,
            userEmail: user.email,
            type: "purchase",
            amount: sellingPrice,
            fee: profitNumber,
            total: sellingPrice,
            status: "pending",
            depositId: orderId,
          });

          // Create order with profit tracking
          await createOrderWithProfit({
            orderId,
            userEmail: user.email,
            serviceName: selectedService?.service_name || "",
            countryName: country.name || "",
            phoneNumber: orderData.phone_number || orderData.phoneNumber || "",
            originalPrice: originalPrice,
            sellingPrice: sellingPrice,
            profit: profitNumber,
            status: "pending",
          });
          
          // Update local state and sync localStorage
          const newBalance = userBalance - sellingPrice;
          setUserBalance(newBalance);
          
          // Sync localStorage with new balance
          const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
          if (currentUser.email) {
            currentUser.balance = newBalance;
            localStorage.setItem("currentUser", JSON.stringify(currentUser));
          }
          
          // Save to active orders (localStorage for backward compatibility)
          const phoneNumber = orderData.phone_number || orderData.phoneNumber || "";
          const expiredAt = orderData.expired_at || orderData.expiredAt || (Date.now() + 20 * 60 * 1000);
          const createdAt = Date.now();
          
          addActiveOrder({
            orderId,
            phoneNumber,
            service: selectedService?.service_name || "",
            country: country.name || "",
            expiredAt: Number(expiredAt),
            price: sellingPrice,
            createdAt,
            userEmail: user.email,
          });
          
          // Save to localStorage order history (persistent across sessions)
          addOrderToHistory({
            orderId,
            userEmail: user.email,
            phoneNumber,
            serviceName: selectedService?.service_name || "",
            serviceCode: selectedService?.service_code?.toString() || "",
            serviceIcon: selectedService?.service_img || "",
            countryName: country.name || "",
            countryCode: country.code || "",
            sellingPrice,
            originalPrice,
            profit: profitNumber,
            status: "pending",
            createdAt: new Date().toISOString(),
            expiredAt: Number(expiredAt),
          });
          
          // Save to GitHub database (cross-device compatible)
          try {
            await fetch("/api/orders/pending", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                userEmail: user.email,
                phoneNumber,
                serviceName: selectedService?.service_name || "",
                serviceCode: selectedService?.service_code?.toString() || "",
                countryName: country.name || "",
                countryCode: country.code || "",
                sellingPrice,
                originalPrice,
                profit: profitNumber,
              }),
            });
          } catch (saveErr) {
            console.error("[v0] Failed to save to GitHub DB:", saveErr);
          }
          
  // Refresh order history and stats
  if (user?.email) {
    setOrderHistory(getOrderHistory(user.email));
    setOrderStats(getOrderHistoryStats(user.email));
  }
  
  // Show success popup
  setShowSuccessPopup(true);
  setTimeout(() => {
  setShowSuccessPopup(false);
  closeOperatorPopup();
            closeSheet();
            // Refresh pending orders from DATABASE
            fetchPendingOrders(user.email);
            // Navigate to active order
            router.push(`/order/active?order_id=${orderId}&phone_number=${encodeURIComponent(phoneNumber)}&service=${encodeURIComponent(selectedService?.service_name || "")}&country=${encodeURIComponent(country.name || "")}&expired_at=${expiredAt}&price=${sellingPrice}&original_price=${originalPrice}&created_at=${createdAt}`);
          }, 1500);
        } catch (balanceError) {
          console.error("[v0] Balance update failed:", balanceError);
          // Still redirect
          const phoneNumber = orderData.phone_number || orderData.phoneNumber || "";
          const expiredAt = orderData.expired_at || orderData.expiredAt || (Date.now() + 20 * 60 * 1000);
          const createdAtFallback = Date.now();
          
          addActiveOrder({
            orderId,
            phoneNumber,
            service: selectedService?.service_name || "",
            country: country.name || "",
            expiredAt: Number(expiredAt),
            price: sellingPrice,
            createdAt: createdAtFallback,
            userEmail: user.email,
          });
          
          // Save to localStorage order history
          addOrderToHistory({
            orderId,
            userEmail: user.email,
            phoneNumber,
            serviceName: selectedService?.service_name || "",
            serviceCode: selectedService?.service_code?.toString() || "",
            serviceIcon: selectedService?.service_img || "",
            countryName: country.name || "",
            countryCode: country.code || "",
            sellingPrice,
            originalPrice,
            profit: 0,
            status: "pending",
            createdAt: new Date().toISOString(),
            expiredAt: Number(expiredAt),
          });
          
          // Save to GitHub database (cross-device compatible)
          try {
            await fetch("/api/orders/pending", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                userEmail: user.email,
                phoneNumber,
                serviceName: selectedService?.service_name || "",
                serviceCode: selectedService?.service_code?.toString() || "",
                countryName: country.name || "",
                countryCode: country.code || "",
                sellingPrice,
                originalPrice,
                profit: 0,
              }),
            });
          } catch (saveErr) {
  console.error("[v0] Failed to save to GitHub DB:", saveErr);
  }
  
  // Refresh order history and stats
  if (user?.email) {
    setOrderHistory(getOrderHistory(user.email));
    setOrderStats(getOrderHistoryStats(user.email));
  }
  
  setShowSuccessPopup(true);
  setTimeout(() => {
  setShowSuccessPopup(false);
  closeOperatorPopup();
            closeSheet();
            fetchPendingOrders(user.email);
            router.push(`/order/active?order_id=${orderId}&phone_number=${encodeURIComponent(phoneNumber)}&service=${encodeURIComponent(selectedService?.service_name || "")}&country=${encodeURIComponent(country.name || "")}&expired_at=${expiredAt}&price=${sellingPrice}&original_price=${originalPrice}&created_at=${createdAtFallback}`);
          }, 1500);
        }
      } else {
        let errorMsg = "Pembelian gagal. Saldo tidak dipotong.";
        if (typeof response.data.message === "string") {
          errorMsg = response.data.message;
        } else if (typeof response.data.error === "string") {
          errorMsg = response.data.error;
        }
        setPurchaseError(errorMsg);
      }
    } catch (error: any) {
      console.error("[v0] Purchase error:", error);
      let errorMsg = "Terjadi kesalahan. Saldo tidak dipotong.";
      const errData = error.response?.data;
      if (typeof errData?.message === "string") {
        errorMsg = errData.message;
      } else if (typeof errData?.error === "string") {
        errorMsg = errData.error;
      }
      setPurchaseError(errorMsg);
    } finally {
      setPurchasing(false);
    }
  };

  // ===== ACTIVE ORDER HELPERS =====
  const formatTimer = (expiredAt: number) => {
    const remaining = Math.max(0, Math.floor((expiredAt - Date.now()) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const copyPhone = async (phone: string) => {
    try {
      // Remove spaces and special characters for clean copy
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");
      await navigator.clipboard.writeText(cleanPhone);
      toast.success("Nomor berhasil disalin!");
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = phone.replace(/[\s\-\(\)]/g, "");
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        toast.success("Nomor berhasil disalin!");
      } catch (e) {
        toast.error("Gagal menyalin nomor");
      }
      document.body.removeChild(textArea);
    }
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Selamat pagi";
    if (hour < 15) return "Selamat siang";
    if (hour < 18) return "Selamat sore";
    return "Selamat malam";
  };

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-50 text-slate-800">
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-8 text-center animate-bounce-in">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-black">
              <CheckCircle size={32} className="text-white" />
            </div>
            <p className="font-black text-lg text-black tracking-wide mb-2">ORDER BERHASIL!</p>
            <p className="text-sm text-gray-600">Mengalihkan ke halaman order...</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        .animate-bounce-in { animation: bounceIn 0.5s ease-out forwards; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5 pb-20">
        {/* Back to Dashboard Link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
        >
          <ArrowLeft size={15} />
          Kembali ke Dashboard
        </Link>

        {/* ====== HEADER with Balance ====== */}
        <div className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Balance Icon */}
              <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
                <Wallet size={24} className="text-white" />
              </div>
              <div>
                <p className="text-gray-500 text-xs font-medium tracking-wide">Saldo Kamu</p>
                <p className="text-gray-900 font-bold text-xl sm:text-2xl tracking-tight">
                  {loadingBalance ? (
                    <span className="inline-block w-24 h-6 bg-gray-200 rounded animate-pulse" />
                  ) : (
                    `Rp ${userBalance.toLocaleString("id-ID")}`
                  )}
                </p>
              </div>
            </div>
            {/* Top Up Button */}
            <Link
              href="/deposit"
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 rounded-lg font-semibold text-white text-sm hover:bg-gray-800 transition-all"
            >
              <ExternalLink size={16} />
              <span>Top Up</span>
            </Link>
          </div>
          {/* Status Bar */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-600 text-xs font-semibold">Online</span>
            </div>
            <span className="text-gray-500 text-xs">
              <span className="text-gray-700 font-mono font-semibold">191ms</span> response server
            </span>
          </div>
        </div>

        {/* ====== HERO: Beli Nomor Virtual (opens sheet) ====== */}
        <button
          onClick={openSheet}
          className="group relative w-full overflow-hidden text-left bg-gray-900 hover:bg-gray-800 transition-all rounded-xl shadow-lg"
        >
          <div className="relative flex items-center justify-between gap-4 p-5 sm:p-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-white font-black text-lg sm:text-xl tracking-tight">
                Beli Nomor Virtual
              </h2>
              <p className="text-white/90 text-[11px] sm:text-xs mt-1 leading-snug text-pretty">
                Sebelum membeli harap baca informasi yang tersedia, jadilah SDM
                yang berkualitas
              </p>

              {/* app icon cluster */}
              <div className="mt-3 flex items-center">
                <HeroAppIcon
                  src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
                  label="WhatsApp"
                />
                <HeroAppIcon
                  src="https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"
                  label="Telegram"
                  offset
                />
                <HeroAppIcon
                  src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
                  label="Facebook"
                  offset
                />
                <div
                  className="relative -ml-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white flex items-center justify-center ring-2 ring-white/80"
                  aria-label="Any other app"
                >
                  <HelpCircle size={16} className="text-gray-600" />
                </div>
                <span className="ml-2 inline-flex items-center justify-center min-w-[34px] h-6 px-2 rounded-full bg-white/20 text-white text-[11px] font-bold backdrop-blur-sm">
                  +99
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0 text-white font-bold text-sm sm:text-base">
              <span>Beli Nomor</span>
              <ChevronRight
                size={18}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </div>
        </button>

        {/* ====== PESANAN PENDING ====== */}
        <section className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-bold text-base sm:text-lg">
              Pesanan Pending
            </h3>
            <button
              onClick={refreshPending}
              disabled={loadingOrders}
              aria-label="Refresh pesanan"
              className="w-9 h-9 bg-gray-100 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
            >
              <RefreshCw size={15} className={loadingOrders ? "animate-spin" : ""} />
            </button>
          </div>

          {activeOrders.length === 0 ? (
            <PendingEmpty onCreate={openSheet} />
          ) : (
            <PendingTable
              orders={activeOrders}
              formatTimer={formatTimer}
              onCopy={copyPhone}
            />
          )}

          {/* Link to Order History */}
          <Link
            href="/history"
            className="mt-4 flex items-center justify-center gap-2 text-sky-600 hover:text-sky-700 text-sm font-semibold"
          >
            <Receipt size={16} />
            Lihat Semua Riwayat Pembelian
          </Link>
        </section>
        
        {/* ====== RIWAYAT PEMBELIAN OTP ====== */}
        <section className="bg-white border border-gray-200 shadow-sm rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-900 font-bold text-base sm:text-lg flex items-center gap-2">
              <Receipt size={18} className="text-sky-600" />
              Riwayat Pembelian OTP
            </h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {orderStats.total} order
            </span>
          </div>
          
          {/* Statistics Cards */}
          <div className="grid grid-cols-5 gap-2 mb-4">
            <div className="bg-slate-800 rounded-lg p-2 text-center border border-slate-700">
              <p className="text-[10px] text-slate-400 font-medium mb-0.5">TOTAL</p>
              <p className="text-lg font-bold text-white">{orderStats.total}</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2 text-center border border-emerald-200">
              <p className="text-[10px] text-emerald-600 font-medium mb-0.5">SUKSES</p>
              <p className="text-lg font-bold text-emerald-600">{orderStats.success}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 text-center border border-amber-200">
              <p className="text-[10px] text-amber-600 font-medium mb-0.5">PENDING</p>
              <p className="text-lg font-bold text-amber-600">{orderStats.pending}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
              <p className="text-[10px] text-red-500 font-medium mb-0.5">EXPIRED</p>
              <p className="text-lg font-bold text-red-500">{orderStats.expired}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-2 text-center border border-gray-200">
              <p className="text-[10px] text-gray-500 font-medium mb-0.5">CANCEL</p>
              <p className="text-lg font-bold text-gray-500">{orderStats.cancel}</p>
            </div>
          </div>
          
          {orderHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Inbox size={40} className="mb-3 opacity-60" />
              <p className="text-sm font-semibold text-gray-500">Belum ada riwayat</p>
              <p className="text-xs text-gray-400 mt-1">Pembelian OTP akan muncul di sini</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {orderHistory.slice(0, 10).map((order) => {
                const statusConfig = {
                  pending: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200", icon: Clock, label: "Pending" },
                  success: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", icon: CheckCircle, label: "Sukses" },
                  expired: { bg: "bg-red-50", text: "text-red-500", border: "border-red-200", icon: XCircle, label: "Expired" },
                  cancel: { bg: "bg-gray-50", text: "text-gray-500", border: "border-gray-200", icon: XCircle, label: "Cancel" },
                };
                const config = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                
                // Build URL for order detail view
                const handleOrderClick = () => {
                  if (order.status === "pending") {
                    // If pending, go to active order page
                    router.push(`/order/active?order_id=${order.orderId}&phone_number=${encodeURIComponent(order.phoneNumber)}&service=${encodeURIComponent(order.serviceName)}&country=${encodeURIComponent(order.countryName)}&expired_at=${order.expiredAt}&price=${order.sellingPrice}&original_price=${order.originalPrice}&created_at=${new Date(order.createdAt).getTime()}`);
                  } else {
                    // For completed/expired/cancel, show detail modal or go to history
                    router.push(`/history?highlight=${order.orderId}`);
                  }
                };
                
                return (
                  <button
                    key={order.orderId}
                    onClick={handleOrderClick}
                    className={`w-full text-left p-3 rounded-lg border ${config.border} ${config.bg} transition-all hover:shadow-md hover:scale-[1.01] active:scale-[0.99] cursor-pointer`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Service Icon */}
                      <div className="shrink-0">
                        {order.serviceIcon ? (
                          <img
                            src={order.serviceIcon}
                            alt={order.serviceName}
                            className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-200 p-1"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200">
                            <Phone size={18} />
                          </div>
                        )}
                      </div>
                      
                      {/* Order Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 text-sm truncate">
                            {order.serviceName}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${config.bg} ${config.text}`}>
                            <StatusIcon size={10} />
                            {config.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone size={12} />
                          <span className="font-mono">{order.phoneNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                          <span>{order.countryName}</span>
                          <span>•</span>
                          <span>{new Date(order.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                        {order.otpCode && order.status === "success" && (
                          <div className="mt-2 flex items-center gap-2 bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-mono font-bold">
                            OTP: {order.otpCode}
                          </div>
                        )}
                      </div>
                      
                      {/* Price & Arrow */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            Rp {order.sellingPrice.toLocaleString("id-ID")}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">
                            {order.orderId}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-gray-400" />
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {orderHistory.length > 10 && (
                <Link
                  href="/history"
                  className="block text-center text-sm text-sky-600 hover:text-sky-700 font-semibold py-2"
                >
                  Lihat {orderHistory.length - 10} order lainnya
                </Link>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ====== BOTTOM SHEET ====== */}
      {sheetMounted && (
        <div
          className="fixed inset-0 z-[100]"
          role="dialog"
          aria-modal="true"
          aria-label="Pilih aplikasi dan negara"
        >
          {/* backdrop */}
          <div
            onClick={closeSheet}
            className={`absolute inset-0 bg-black/70 backdrop-blur-[2px] transition-opacity duration-300 ${
              sheetVisible ? "opacity-100" : "opacity-0"
            }`}
          />
          {/* sheet */}
          <div
            className={`absolute inset-x-0 bottom-0 top-[6vh] sm:top-[10vh] bg-[#0B1220] rounded-t-3xl border-t-4 border-x-4 border-black shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
              sheetVisible ? "translate-y-0" : "translate-y-full"
            }`}
          >
            {/* drag handle */}
            <div className="pt-3 pb-2 flex justify-center">
              <span className="block w-12 h-1.5 rounded-full bg-white/30" />
            </div>

            {/* Scroll area */}
            <div className="flex-1 overflow-y-auto overscroll-contain pb-8">
              {/* Header */}
              <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-white font-black text-xl sm:text-2xl tracking-tight">
                    Beli Nomor Virtual
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    Pilih sebuah aplikasi dan negaranya
                  </p>
                </div>
                <button
                  onClick={closeSheet}
                  aria-label="Tutup"
                  className="w-9 h-9 rounded-lg bg-rose-500 border-2 border-black text-white hover:bg-rose-400 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#000]"
                >
                  <X size={18} />
                </button>
              </div>

              {selectedService ? (
                // ---- STAGE 2: COUNTRIES ----
                <CountryStage
                  selectedService={selectedService}
                  onChangeService={() => {
                    setSelectedService(null);
                    setCountries([]);
                    setOpenDropdowns({});
                  }}
                  countrySearchQuery={countrySearchQuery}
                  setCountrySearchQuery={setCountrySearchQuery}
                  sortBy={sortBy}
                  setSortBy={setSortBy}
                  loadingCountries={loadingCountries}
                  displayedCountries={displayedCountries}
                  openDropdowns={openDropdowns}
                  toggleDropdown={toggleDropdown}
                  formatSellingPrice={formatSellingPrice}
                  getCountryMinSellingPrice={getCountryMinSellingPrice}
                  onPick={openOperatorPopup}
                  orderMarkup={orderMarkup}
                />
              ) : (
                // ---- STAGE 1: APPS ----
                <AppStage
                  loadingServices={loadingServices}
                  appSearchQuery={appSearchQuery}
                  setAppSearchQuery={setAppSearchQuery}
                  popularServices={popularServices}
                  restServices={restServices}
                  filteredCount={filteredServices.length}
                  onPick={(svc) => setSelectedService(svc)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====== OPERATOR SELECTION POPUP - Neo Brutalism ====== */}
      {showOperatorPopup && operatorPopupData && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* backdrop */}
          <div
            onClick={closeOperatorPopup}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          {/* popup */}
          <div className="relative w-full sm:max-w-lg bg-[#0f172a] border-4 border-black shadow-[8px_8px_0px_#000] rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b-4 border-black bg-[#1e293b]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-black text-lg">Pilih Operator Seluler</h3>
                <button
                  onClick={closeOperatorPopup}
                  className="w-8 h-8 bg-rose-500 border-2 border-black rounded-lg text-white hover:bg-rose-400 flex items-center justify-center shadow-[2px_2px_0px_#000]"
                >
                  <X size={16} />
                </button>
              </div>
              {/* Country & Service Info */}
              <div className="flex items-center gap-3 bg-[#0f172a] border-2 border-black rounded-lg p-3">
                {operatorPopupData.country.img && (
                  <img
                    src={operatorPopupData.country.img}
                    alt={operatorPopupData.country.name}
                    className="w-8 h-6 object-cover border-2 border-black rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{operatorPopupData.country.name}</p>
                  <p className="text-slate-400 text-xs">
                    {selectedService?.service_name} · Server {getServerVersion(operatorPopupData.priceItem.server_id)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-cyan-400 font-black text-lg">
                    {formatSellingPrice(operatorPopupData.priceItem.price)}
                  </p>
                </div>
              </div>
            </div>

            {/* Operators Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {loadingOperators ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-500">
                  <Loader2 className="animate-spin mb-3" size={32} />
                  <span className="text-sm font-semibold">Memuat operator...</span>
                </div>
              ) : operators.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Tidak ada operator tersedia
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {operators.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => setSelectedOperator(op)}
                      className={`relative flex flex-col items-center p-3 sm:p-4 rounded-xl border-3 transition-all ${
                        selectedOperator?.id === op.id
                          ? "bg-cyan-500/20 border-cyan-500 shadow-[4px_4px_0px_#06b6d4]"
                          : "bg-white/5 border-black hover:bg-white/10 shadow-[3px_3px_0px_#000]"
                      }`}
                    >
                      {selectedOperator?.id === op.id && (
                        <div className="absolute top-1 right-1 w-5 h-5 bg-cyan-500 border-2 border-black rounded-full flex items-center justify-center">
                          <CheckCircle size={12} className="text-black" />
                        </div>
                      )}
                      <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-lg border-2 border-black flex items-center justify-center mb-2 overflow-hidden">
                        {op.image ? (
                          <img
                            src={op.image}
                            alt={op.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                          />
                        ) : (
                          <span className="text-2xl font-black text-slate-400">?</span>
                        )}
                      </div>
                      <span className="text-white font-bold text-xs sm:text-sm text-center line-clamp-1">
                        {op.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {purchaseError && (
                <div className="mt-4 p-3 bg-rose-500/20 border-2 border-rose-500 rounded-lg flex items-center gap-2">
                  <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                  <span className="text-rose-300 text-sm font-medium">{purchaseError}</span>
                </div>
              )}
            </div>

            {/* Footer with Order Button */}
            <div className="p-4 sm:p-5 border-t-4 border-black bg-[#1e293b]">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-slate-400 text-xs font-semibold">Server {getServerVersion(operatorPopupData.priceItem.server_id)}</p>
                  <p className="text-white font-mono text-sm">ID: {operatorPopupData.priceItem.server_id}</p>
                </div>
                <div className="flex items-center gap-3">
                  {operatorPopupData.country.rate > 0 && (
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold border-2 ${
                      operatorPopupData.country.rate >= 50
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                        : "bg-amber-500/20 border-amber-500 text-amber-400"
                    }`}>
                      {operatorPopupData.country.rate.toFixed(2)}%
                    </span>
                  )}
                  <span className="text-white font-black text-lg">
                    {formatSellingPrice(operatorPopupData.priceItem.price)}
                  </span>
                  <button
                    onClick={handlePurchase}
                    disabled={!selectedOperator || purchasing || userBalance < (operatorPopupData.priceItem.price + orderMarkup)}
                    className={`px-5 py-2.5 rounded-lg font-black text-sm border-3 transition-all ${
                      !selectedOperator || purchasing || userBalance < (operatorPopupData.priceItem.price + orderMarkup)
                        ? "bg-slate-600 border-slate-500 text-slate-400 cursor-not-allowed"
                        : "bg-cyan-500 border-black text-black shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                    }`}
                  >
                    {purchasing ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      "Order"
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

/* ============================================================
   HERO APP ICON (small circle inside card)
============================================================ */
function HeroAppIcon({
  src,
  label,
  offset = false,
}: {
  src: string;
  label: string;
  offset?: boolean;
}) {
  return (
    <div
      className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white ring-2 ring-white/80 flex items-center justify-center overflow-hidden ${
        offset ? "-ml-2" : ""
      }`}
      aria-label={label}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src || "/placeholder.svg"}
        alt={label}
        className="w-5 h-5 object-contain"
      />
    </div>
  );
}

/* ============================================================
   PESANAN PENDING — EMPTY STATE
============================================================ */
function PendingEmpty({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-4">
      <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
        <Inbox size={28} className="text-gray-400" />
      </div>
      <h4 className="text-gray-800 font-bold text-base">Tidak ada pesanan</h4>
      <p className="text-gray-500 text-xs sm:text-sm mt-1">
        Pesanan aktif akan muncul disini
      </p>
      <button
        onClick={onCreate}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gray-900 text-white font-semibold text-sm hover:bg-gray-800 transition-all"
      >
        + Buat Pesanan
      </button>
    </div>
  );
}

/* ============================================================
   PESANAN PENDING — TABLE / LIST
============================================================ */
interface PendingOrderItem {
  orderId: string;
  userEmail: string;
  phoneNumber: string;
  serviceName: string;
  serviceCode: string;
  countryName: string;
  countryCode: string;
  sellingPrice: number;
  originalPrice: number;
  profit: number;
  status: string;
  otpCode?: string;
  createdAt: string;
  expiredAt: number;
}

function PendingTable({
  orders,
  formatTimer,
  onCopy,
}: {
  orders: PendingOrderItem[];
  formatTimer: (ts: number) => string;
  onCopy: (phone: string) => void;
}) {
  return (
    <>
      {/* Desktop / Tablet table */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[70px_1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 px-2 text-[11px] font-semibold tracking-[0.1em] uppercase text-gray-500">
          <div>SRV</div>
          <div>Layanan</div>
          <div>Nomor</div>
          <div>Harga</div>
          <div>Status</div>
          <div>Code</div>
          <div className="text-right pr-1">Tindakan</div>
        </div>
        <div className="mt-2 divide-y divide-gray-100">
          {orders.map((o) => (
            <div
              key={o.orderId}
              className="grid grid-cols-[70px_1.2fr_1.4fr_0.9fr_0.9fr_0.9fr_0.8fr] gap-3 items-center py-3 px-2 text-sm"
            >
              <div className="text-gray-600 font-mono font-semibold">v2.0</div>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-white">
                    {o.serviceName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <span className="truncate text-gray-800 font-medium">{o.serviceName}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-gray-800 font-medium">
                  {o.phoneNumber}
                </span>
                <button
                  onClick={() => onCopy(o.phoneNumber)}
                  className="p-1 text-gray-400 hover:text-gray-700 shrink-0"
                  aria-label="Salin nomor"
                >
                  <Copy size={13} />
                </button>
              </div>
              <div className="text-gray-800 font-semibold">
                Rp{o.sellingPrice.toLocaleString("id-ID")}
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-mono font-semibold text-xs">
                  {formatTimer(o.expiredAt)}
                </span>
              </div>
              <div className="text-amber-600 text-sm font-semibold">Menunggu</div>
              <div className="flex items-center justify-end gap-1.5">
                <Link
                  href={`/order/active?order_id=${o.orderId}&phone_number=${encodeURIComponent(
                    o.phoneNumber
                  )}&service=${encodeURIComponent(o.serviceName)}&country=${encodeURIComponent(
                    o.countryName
                  )}&expired_at=${o.expiredAt}&price=${o.sellingPrice}&created_at=${new Date(o.createdAt).getTime()}`}
                  aria-label="Lihat detail pesanan"
                  className="w-8 h-8 rounded-lg bg-gray-900 text-white hover:bg-gray-800 flex items-center justify-center"
                >
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile list */}
      <div className="md:hidden flex flex-col gap-3">
        {orders.map((o) => (
          <div
            key={o.orderId}
            className="rounded-xl bg-gray-50 border border-gray-200 p-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-white">
                    {o.serviceName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-gray-800 font-semibold truncate">{o.serviceName}</p>
                  <p className="text-gray-500 text-xs font-medium">v2.0 · {o.countryName}</p>
                </div>
              </div>
              <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-100 text-amber-700 font-mono font-semibold text-xs">
                {formatTimer(o.expiredAt)}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="truncate text-gray-800 font-medium">
                  {o.phoneNumber}
                </span>
                <button
                  onClick={() => onCopy(o.phoneNumber)}
                  className="p-1 text-gray-400 hover:text-gray-700 shrink-0"
                  aria-label="Salin nomor"
                >
                  <Copy size={13} />
                </button>
              </div>
              <span className="text-gray-800 font-semibold">
                Rp{o.sellingPrice.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Link
                href={`/order/active?order_id=${o.orderId}&phone_number=${encodeURIComponent(
                  o.phoneNumber
                )}&service=${encodeURIComponent(o.serviceName)}&country=${encodeURIComponent(
                  o.countryName
                )}&expired_at=${o.expiredAt}&price=${o.sellingPrice}&created_at=${new Date(o.createdAt).getTime()}`}
                className="w-full text-center py-2 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800"
              >
                Detail
              </Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ============================================================
   ANIMATED APP ITEM - with intersection observer for scroll animation
============================================================ */
function AnimatedAppItem({
  service,
  onPick,
  index,
  isPopular = false,
}: {
  service: Service;
  onPick: (s: Service) => void;
  index: number;
  isPopular?: boolean;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Add staggered delay based on index
          setTimeout(() => setIsVisible(true), index * 50);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "50px" }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => observer.disconnect();
  }, [index]);

  if (isPopular) {
    return (
      <button
        ref={itemRef}
        onClick={() => onPick(service)}
        className={`group rounded-xl bg-[#1e293b] border border-slate-700 hover:border-cyan-500 p-4 flex flex-col items-center justify-center transition-all duration-500 active:scale-[0.98] hover:shadow-lg ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        }`}
      >
        <div className="w-14 h-14 rounded-xl bg-white p-1.5 flex items-center justify-center mb-3">
          {service.service_img ? (
            <img
              src={service.service_img || "/placeholder.svg"}
              alt={service.service_name}
              className="w-full h-full object-contain"
            />
          ) : (
            <HelpCircle size={24} className="text-slate-400" />
          )}
        </div>
        <span className="text-white font-semibold text-sm text-center line-clamp-1">
          {service.service_name}
        </span>
      </button>
    );
  }

  return (
    <button
      ref={itemRef}
      onClick={() => onPick(service)}
      className={`w-full flex items-center gap-3 p-3.5 hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-all duration-500 text-left ${
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
      }`}
    >
      <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0">
        {service.service_img ? (
          <img
            src={service.service_img || "/placeholder.svg"}
            alt={service.service_name}
            className="w-full h-full object-contain"
          />
        ) : (
          <HelpCircle size={18} className="text-slate-400" />
        )}
      </div>
      <span className="flex-1 text-white font-semibold text-sm truncate">
        {service.service_name}
      </span>
      <ChevronRight size={16} className="text-slate-500" />
    </button>
  );
}

/* ============================================================
   BOTTOM SHEET STAGE 1 — APP SELECTION
============================================================ */
function AppStage({
  loadingServices,
  appSearchQuery,
  setAppSearchQuery,
  popularServices,
  restServices,
  filteredCount,
  onPick,
}: {
  loadingServices: boolean;
  appSearchQuery: string;
  setAppSearchQuery: (v: string) => void;
  popularServices: Service[];
  restServices: Service[];
  filteredCount: number;
  onPick: (s: Service) => void;
}) {
  return (
    <div className="px-5 pb-4 space-y-5">
      {/* Search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          value={appSearchQuery}
          onChange={(e) => setAppSearchQuery(e.target.value)}
          placeholder="Cari nama aplikasi..."
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#1e293b] border border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition-colors"
        />
      </div>

      {loadingServices ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="animate-spin mb-3" size={26} />
          <span className="text-sm font-semibold">Memuat aplikasi...</span>
        </div>
      ) : filteredCount === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm font-semibold">
          Aplikasi tidak ditemukan
        </div>
      ) : (
        <>
          {/* Populer */}
          {popularServices.length > 0 && (
            <div>
              <h4 className="text-white font-bold text-base mb-3">
                Aplikasi Populer
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {popularServices.map((s, idx) => (
                  <AnimatedAppItem
                    key={s.service_code}
                    service={s}
                    onPick={onPick}
                    index={idx}
                    isPopular
                  />
                ))}
              </div>
            </div>
          )}

          {/* Semua */}
          {restServices.length > 0 && (
            <div>
              <h4 className="text-white font-bold text-base mb-3">
                {appSearchQuery.trim() ? "Hasil Pencarian" : "Semua Aplikasi"}
              </h4>
              <div className="rounded-xl bg-[#1e293b] border border-slate-700 divide-y divide-slate-700/50 overflow-hidden">
                {restServices.map((s, idx) => (
                  <AnimatedAppItem
                    key={s.service_code}
                    service={s}
                    onPick={onPick}
                    index={idx}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ============================================================
   BOTTOM SHEET STAGE 2 — COUNTRY SELECTION
============================================================ */
function CountryStage({
  selectedService,
  onChangeService,
  countrySearchQuery,
  setCountrySearchQuery,
  sortBy,
  setSortBy,
  loadingCountries,
  displayedCountries,
  openDropdowns,
  toggleDropdown,
  formatSellingPrice,
  getCountryMinSellingPrice,
  onPick,
  orderMarkup,
}: {
  selectedService: Service;
  onChangeService: () => void;
  countrySearchQuery: string;
  setCountrySearchQuery: (v: string) => void;
  sortBy: "rate" | "price";
  setSortBy: (v: "rate" | "price") => void;
  loadingCountries: boolean;
  displayedCountries: Country[];
  openDropdowns: Record<number, boolean>;
  toggleDropdown: (id: number) => void;
  formatSellingPrice: (n: number) => string;
  getCountryMinSellingPrice: (c: Country) => number | null;
  onPick: (c: Country, p: PriceItem) => void;
  orderMarkup: number;
}) {
  return (
    <div className="px-5 pb-4 space-y-4">
      {/* Selected app card (tap to change) */}
      <button
        onClick={onChangeService}
        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1e293b] border-3 border-black hover:border-cyan-500 transition-colors text-left shadow-[3px_3px_0px_#000]"
      >
        <div className="w-12 h-12 rounded-xl bg-white p-1.5 flex items-center justify-center shrink-0 border-2 border-black">
          {selectedService.service_img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedService.service_img || "/placeholder.svg"}
              alt={selectedService.service_name}
              className="w-full h-full object-contain"
            />
          ) : (
            <HelpCircle size={22} className="text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-black text-base truncate">
            {selectedService.service_name}
          </p>
          <p className="text-slate-400 text-xs font-semibold">Aplikasi yang dipilih</p>
        </div>
        <ChevronRight size={18} className="text-slate-500 shrink-0" />
      </button>

      {/* Country search */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
        />
        <input
          type="text"
          value={countrySearchQuery}
          onChange={(e) => setCountrySearchQuery(e.target.value)}
          placeholder="Cari nama negara..."
          className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#1e293b] border-3 border-black text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-cyan-500 transition-colors shadow-[3px_3px_0px_#000]"
        />
      </div>

      {/* Sort tabs - Neo Brutalism */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setSortBy("rate")}
          className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-3 ${
            sortBy === "rate"
              ? "bg-cyan-500 border-black text-black shadow-[3px_3px_0px_#000]"
              : "bg-[#1e293b] border-black text-slate-400 hover:bg-slate-700 shadow-[3px_3px_0px_#000]"
          }`}
          aria-pressed={sortBy === "rate"}
        >
          <TrendingUp size={15} />
          Rate
        </button>
        <button
          onClick={() => setSortBy("price")}
          className={`h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all border-3 ${
            sortBy === "price"
              ? "bg-cyan-500 border-black text-black shadow-[3px_3px_0px_#000]"
              : "bg-[#1e293b] border-black text-slate-400 hover:bg-slate-700 shadow-[3px_3px_0px_#000]"
          }`}
          aria-pressed={sortBy === "price"}
        >
          <TrendingDown size={15} />
          Harga
        </button>
      </div>

      {/* Country list */}
      {loadingCountries ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="animate-spin mb-3" size={26} />
          <span className="text-sm font-semibold">Memuat negara...</span>
        </div>
      ) : displayedCountries.length === 0 ? (
        <div className="py-12 text-center text-slate-500 text-sm font-semibold">
          Negara tidak ditemukan
        </div>
      ) : (
        <div className="rounded-xl bg-[#1e293b] border-3 border-black divide-y divide-black/30 overflow-hidden shadow-[3px_3px_0px_#000]">
          {displayedCountries.map((country) => {
            const isOpen = !!openDropdowns[country.number_id];
            const minPrice = getCountryMinSellingPrice(country);
            const code = deriveCountryCode(country);
            return (
              <div key={country.number_id}>
                <button
                  onClick={() => toggleDropdown(country.number_id)}
                  className="w-full flex items-center gap-2 p-3.5 hover:bg-cyan-500/10 active:bg-cyan-500/20 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border-2 border-black bg-white/5">
                    {country.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={country.img || "/placeholder.svg"}
                        alt={country.name}
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                  <span className="flex-1 text-white font-bold text-sm truncate">
                    {country.name}
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 h-6 rounded-lg bg-slate-700 border border-black text-slate-300 text-[11px] font-mono font-semibold">
                    {country.prefix?.startsWith("+")
                      ? country.prefix
                      : `+${country.prefix || ""}`}
                  </span>
                  <span className="hidden sm:inline-flex items-center px-2 h-6 rounded-lg bg-slate-700 border border-black text-slate-300 text-[11px] font-bold">
                    {code}
                  </span>
                  {minPrice !== null && (
                    <span className="inline-flex items-center px-2 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500 text-cyan-300 text-[11px] font-bold whitespace-nowrap">
                      Mulai Rp{minPrice.toLocaleString("id-ID")}
                    </span>
                  )}
                  {isOpen ? (
                    <ChevronUp size={16} className="text-slate-400 shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 shrink-0" />
                  )}
                </button>

                {/* server rows */}
                {isOpen && (
                  <div className="bg-black/30 divide-y divide-black/30">
                    {country.pricelist?.length ? (
                      country.pricelist.map((p, idx) => {
                        const version = getServerVersion(p.server_id);
                        const sellingPrice = formatSellingPrice(p.price);
                        const outOfStock = !p.available || p.stock <= 0;
                        return (
                          <div
                            key={`${p.provider_id}-${p.server_id}-${idx}`}
                            className="flex items-center gap-2 p-3 text-sm"
                          >
                            <span className="inline-flex items-center px-2 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500 text-cyan-300 text-[11px] font-bold">
                              Server {version}
                            </span>
                            <span className="inline-flex items-center px-2 h-6 rounded-lg bg-slate-700 border border-black text-slate-300 text-[11px] font-mono truncate max-w-[110px]">
                              ID: {p.server_id}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 h-6 rounded-lg text-[11px] font-bold border ${
                                country.rate >= 50
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                                  : country.rate > 0
                                  ? "bg-amber-500/20 border-amber-500 text-amber-300"
                                  : "bg-rose-500/20 border-rose-500 text-rose-300"
                              }`}
                            >
                              {country.rate ? `${country.rate.toFixed(2)}%` : "0%"}
                            </span>
                            <span className="ml-auto text-white font-black whitespace-nowrap">
                              {sellingPrice}
                            </span>
                            <button
                              onClick={() => onPick(country, p)}
                              disabled={outOfStock}
                              className={`px-3 h-8 rounded-lg text-xs font-bold border-2 transition-all ${
                                outOfStock
                                  ? "border-slate-600 bg-slate-700 text-slate-500 cursor-not-allowed"
                                  : "border-black bg-cyan-500 text-black shadow-[2px_2px_0px_#000] hover:shadow-[3px_3px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                              }`}
                            >
                              {outOfStock ? "Habis" : "Order"}
                            </button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-slate-500 text-xs font-semibold">
                        Tidak ada server tersedia
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
