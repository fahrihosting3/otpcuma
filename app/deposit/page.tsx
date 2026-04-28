"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getCurrentUser, updateUserBalance, refreshUserData } from "@/lib/auth";
import { createTransaction, updateTransactionStatus, getTransactionByDepositId, getMaintenanceStatus, isMaintenanceCurrentlyActive, getMaintenanceEndTime, getAdminSettings, type AdminSettings, getTransactionsByUser } from "@/lib/externalDB";
import { useRouter } from "next/navigation";
import {
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Wallet,
  ChevronRight,
  CreditCard,
  Activity,
  TrendingUp,
  QrCode,
  Wrench,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";

type DepositStatus = "idle" | "loading" | "pending" | "success" | "cancel" | "expired" | "error";
type ActiveTab = "activity" | "deposit";

interface DepositData {
  id: string;
  status: string;
  method: string;
  currency?: {
    type: string;
    total: string;
    fee: string;
    diterima: string;
  };
  total: number;
  fee: number;
  diterima: number;
  qr_string: string;
  qr_image: string;
  created_at: string;
  created_at_ts: number;
  expired_at: string;
  expired_at_ts: number;
  brand?: {
    name: string;
    icon: string;
    type: string;
  };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  fee?: number;
  total?: number;
  status: string;
  depositId?: string;
  createdAt: string;
  qrImage?: string;
}

interface TrendingService {
  id: string;
  name: string;
  icon: string;
  country: string;
  countryFlag: string;
  price: number;
}

const PRESET_AMOUNTS = [10000, 25000, 50000, 100000, 200000, 500000];

// Sample trending services
const trendingServices: TrendingService[] = [
  { id: "wa", name: "WhatsApp", icon: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg", country: "ID", countryFlag: "🇮🇩", price: 2250 },
  { id: "other", name: "Any Other", icon: "", country: "ID", countryFlag: "🇮🇩", price: 650 },
  { id: "wa2", name: "WhatsApp", icon: "https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg", country: "PH", countryFlag: "🇵🇭", price: 1500 },
  { id: "tg", name: "Telegram", icon: "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg", country: "ID", countryFlag: "🇮🇩", price: 1800 },
  { id: "fb", name: "Facebook", icon: "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg", country: "ID", countryFlag: "🇮🇩", price: 2000 },
];

export default function DepositPage() {
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [amount, setAmount] = useState<string>("");
  const [status, setStatus] = useState<DepositStatus>("idle");
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceCountdown, setMaintenanceCountdown] = useState("");
  const [depositFee, setDepositFee] = useState<number>(0);
  const [originalAmount, setOriginalAmount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<ActiveTab>("deposit");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [refreshingBalance, setRefreshingBalance] = useState(false);
  // Guard: track which deposit IDs have already been credited to prevent double-credit
  // (auto-check interval + manual "CEK STATUS" button could otherwise fire twice)
  const creditedDepositsRef = useRef<Set<string>>(new Set());
  // Guard: lock to prevent concurrent checkPaymentStatus calls from double-processing
  const processingCheckRef = useRef<boolean>(false);
  const router = useRouter();

  // Load user and transactions
  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/auth/login");
      return;
    }
    setUser(current);
    setUserBalance(current.balance || 0);
    fetchBalance();
    fetchTransactions(current.email);

    // Fetch admin settings for deposit fee
    const fetchSettings = async () => {
      const res = await getAdminSettings();
      if (res.success && res.data) {
        setDepositFee(res.data.fees.depositFee || 0);
      }
    };
    fetchSettings();
  }, [router]);

  const fetchBalance = async () => {
    setRefreshingBalance(true);
    try {
      const updatedUser = await refreshUserData();
      if (updatedUser) {
        setUserBalance(updatedUser.balance || 0);
        setUser(updatedUser);
      }
    } catch (err) {
      console.error("Gagal ambil saldo", err);
    } finally {
      setRefreshingBalance(false);
    }
  };

  const fetchTransactions = async (email: string) => {
    setLoadingTransactions(true);
    try {
      const result = await getTransactionsByUser(email);
      if (result.success && result.data) {
        // Filter deposit transactions only
        const depositTransactions = result.data.filter((t: Transaction) => t.type === "deposit");
        setTransactions(depositTransactions);
      }
    } catch (err) {
      console.error("Gagal ambil transaksi", err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Check maintenance status
  useEffect(() => {
    const checkMaintenance = async () => {
      const maintenance = await getMaintenanceStatus();
      const user = getCurrentUser();
      
      if (isMaintenanceCurrentlyActive(maintenance) && user?.role !== "admin") {
        setIsMaintenanceActive(true);
        
        const endTime = getMaintenanceEndTime(maintenance);
        if (endTime) {
          const now = new Date().getTime();
          const diff = endTime - now;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setMaintenanceCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        }
      } else {
        setIsMaintenanceActive(false);
      }
    };
    
    checkMaintenance();
    const interval = setInterval(checkMaintenance, 1000);
    return () => clearInterval(interval);
  }, []);

  // Countdown timer for pending deposit
  useEffect(() => {
    if (status !== "pending" || !depositData) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const expiredAt = depositData.expired_at_ts;
      const remaining = Math.max(0, Math.floor((expiredAt - now) / 1000));

      if (remaining <= 0) {
        setStatus("expired");
        updateTransactionStatus(depositData.id, "expired");
        clearInterval(interval);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, depositData]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID").format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, "0");
    const month = date.toLocaleString("id-ID", { month: "short" });
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    return `${day} ${month} ${year}, ${hours}.${minutes} WIB`;
  };

  const handleCreateDeposit = async () => {
    const numAmount = parseInt(amount.replace(/\D/g, ""));
    if (!numAmount || numAmount < 1000) {
      toast.error("Minimal deposit Rp1.000");
      return;
    }

    setStatus("loading");
    const totalAmount = numAmount + depositFee;

    try {
      const res = await fetch(
        `https://www.rumahotp.io/api/v2/deposit/create?amount=${totalAmount}&payment_id=qris`,
        {
          method: "GET",
          headers: {
            "x-apikey": process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY || "",
            Accept: "application/json",
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        setDepositData(data.data);
        setOriginalAmount(numAmount);
        setStatus("pending");
        toast.success("QRIS berhasil dibuat!");

        if (user) {
          await createTransaction({
            userId: user.id,
            userEmail: user.email,
            type: "deposit",
            amount: numAmount,
            fee: depositFee,
            total: totalAmount,
            status: "pending",
            depositId: data.data.id,
            qrImage: data.data.qr_image,
            qrString: data.data.qr_string,
            expiredAt: data.data.expired_at,
          });
        }
      } else {
        toast.error(data.message || "Gagal membuat deposit");
        setStatus("error");
      }
    } catch (err) {
      console.error("Error creating deposit:", err);
      toast.error("Terjadi kesalahan. Silakan coba lagi.");
      setStatus("error");
    }
  };

  const checkPaymentStatus = useCallback(async (showNotif = true) => {
    if (!depositData) return;

    // Prevent concurrent executions (manual click + auto-interval race)
    if (processingCheckRef.current) return;
    // If this deposit was already credited, do nothing
    if (creditedDepositsRef.current.has(depositData.id)) return;

    processingCheckRef.current = true;
    setCheckingStatus(true);

    try {
      const res = await fetch(
        `https://www.rumahotp.io/api/v2/deposit/get_status?deposit_id=${depositData.id}`,
        {
          method: "GET",
          headers: {
            "x-apikey": process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY || "",
            Accept: "application/json",
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        if (data.data.status === "success") {
          // Double-check guard AFTER await: another call may have credited in the meantime
          if (creditedDepositsRef.current.has(depositData.id)) {
            return;
          }
          // Mark as credited BEFORE the balance update to close the race window
          creditedDepositsRef.current.add(depositData.id);

          setStatus("success");
          toast.success("Pembayaran berhasil!");

          await updateTransactionStatus(depositData.id, "success");
          if (user) {
            await updateUserBalance(originalAmount);
            fetchBalance();
            fetchTransactions(user.email);
          }
        } else if (data.data.status === "cancel") {
          setStatus("cancel");
          toast.error("Pembayaran dibatalkan");
          await updateTransactionStatus(depositData.id, "cancel");
        } else if (data.data.status === "pending" && showNotif) {
          toast.info("Pembayaran belum selesai");
        }
      }
    } catch (err) {
      console.error("Error checking status:", err);
    } finally {
      setCheckingStatus(false);
      processingCheckRef.current = false;
    }
  }, [depositData, user, originalAmount]);

  // Auto-check payment status every 10 seconds
  useEffect(() => {
    if (status !== "pending") return;

    const interval = setInterval(() => {
      checkPaymentStatus(false);
    }, 10000);

    return () => clearInterval(interval);
  }, [status, checkPaymentStatus]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Disalin ke clipboard!");
  };

  const resetDeposit = () => {
    setStatus("idle");
    setDepositData(null);
    setAmount("");
    setTimeLeft(0);
    setOriginalAmount(0);
  };

  const cancelDeposit = async () => {
    if (depositData) {
      await updateTransactionStatus(depositData.id, "cancel");
    }
    resetDeposit();
    toast.info("Deposit dibatalkan");
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    if (value) {
      setAmount(parseInt(value).toLocaleString("id-ID"));
    } else {
      setAmount("");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-emerald-600";
      case "cancel":
      case "expired":
        return "text-rose-600";
      default:
        return "text-amber-600";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "success":
        return "success";
      case "cancel":
        return "cancel";
      case "expired":
        return "expired";
      default:
        return "pending";
    }
  };

  // Handle click on pending transaction to resume payment
  const handleTransactionClick = async (tx: Transaction) => {
    if (tx.status !== "pending") {
      toast.info(`Transaksi sudah ${getStatusLabel(tx.status)}`);
      return;
    }

    // Check if transaction is expired based on time (5 minutes from creation)
    const createdAt = new Date(tx.createdAt).getTime();
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    if (now - createdAt > fiveMinutes) {
      toast.error("Transaksi sudah kadaluarsa");
      await updateTransactionStatus(tx.depositId || tx.id, "expired");
      fetchTransactions(user.email);
      return;
    }

    // Fetch QR data from API to resume payment
    if (tx.depositId) {
      try {
        const res = await fetch(
          `https://www.rumahotp.io/api/v2/deposit/get_status?deposit_id=${tx.depositId}`,
          {
            method: "GET",
            headers: {
              "x-apikey": process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY || "",
              Accept: "application/json",
            },
          }
        );

        const data = await res.json();

        if (data.success) {
          if (data.data.status === "success") {
            // Guard against double-credit: only credit if not already credited
            if (!creditedDepositsRef.current.has(tx.depositId)) {
              creditedDepositsRef.current.add(tx.depositId);
              toast.success("Pembayaran sudah berhasil!");
              await updateTransactionStatus(tx.depositId, "success");
              if (user) {
                await updateUserBalance(tx.amount);
                fetchBalance();
                fetchTransactions(user.email);
              }
            } else {
              toast.info("Pembayaran sudah berhasil!");
              fetchBalance();
              fetchTransactions(user.email);
            }
            return;
          } else if (data.data.status === "cancel" || data.data.status === "expired") {
            toast.error(`Transaksi sudah ${data.data.status}`);
            await updateTransactionStatus(tx.depositId, data.data.status);
            fetchTransactions(user.email);
            return;
          }

          // Resume pending payment - set deposit data and show QR
          setDepositData({
            id: tx.depositId,
            status: "pending",
            method: "qris",
            total: tx.total || tx.amount,
            fee: tx.fee || 0,
            diterima: tx.amount,
            qr_string: "",
            qr_image: tx.qrImage || data.data.qr_image || "",
            created_at: tx.createdAt,
            created_at_ts: new Date(tx.createdAt).getTime(),
            expired_at: "",
            expired_at_ts: createdAt + fiveMinutes,
          });
          setOriginalAmount(tx.amount);
          setStatus("pending");
          toast.success("Melanjutkan pembayaran...");
        } else {
          toast.error("Gagal memuat data transaksi");
        }
      } catch (err) {
        console.error("Error fetching transaction:", err);
        toast.error("Terjadi kesalahan");
      }
    } else {
      toast.error("Deposit ID tidak ditemukan");
    }
  };

  // Maintenance Block - Neo Brutalism
  if (isMaintenanceActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4">
        <div className="w-full max-w-md bg-white border-4 border-black shadow-[8px_8px_0px_#000] p-8 rounded-xl">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-orange-400 border-4 border-black rounded-xl flex items-center justify-center animate-pulse">
              <Wrench size={32} className="text-black" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-black text-center mb-2">
            DEPOSIT TIDAK TERSEDIA
          </h1>
          <p className="text-center text-slate-600 font-medium mb-6">
            Website sedang dalam maintenance.
          </p>
          <div className="bg-slate-100 border-2 border-black p-4 rounded-lg mb-6">
            <p className="text-[10px] font-mono text-slate-500 tracking-wider text-center mb-2 font-bold">
              SISA WAKTU MAINTENANCE
            </p>
            <div className="flex items-center justify-center gap-2">
              <Clock size={20} className="text-orange-500" />
              <span className="text-2xl font-black font-mono text-black tracking-widest">
                {maintenanceCountdown || "00:00:00"}
              </span>
            </div>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-black text-white font-bold text-sm hover:bg-slate-800 transition-colors rounded-lg border-2 border-black"
          >
            <RefreshCw size={16} />
            REFRESH HALAMAN
          </button>
        </div>
      </div>
    );
  }

  // QR Payment View - Neo Brutalism
  if (status === "pending" || status === "success" || status === "cancel" || status === "expired") {
    return (
      <div className="min-h-screen bg-slate-200">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-white border-b-4 border-black px-4 py-3">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <button
              onClick={resetDeposit}
              className="w-10 h-10 bg-slate-100 border-2 border-black rounded-lg flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <ArrowLeft size={18} className="text-black" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-emerald-400 rounded border-2 border-black flex items-center justify-center">
                <span className="text-black font-black text-xs">OC</span>
              </div>
              <span className="text-black font-black">OTP CEPAT</span>
            </div>
            <div className="w-10 h-10" />
          </div>
        </div>

        <div className="max-w-lg mx-auto px-4 py-6">
          {status === "pending" ? (
            <div className="space-y-6">
              {/* Timer - Neo */}
              <div className="flex items-center justify-center gap-2 bg-rose-400 border-3 border-black rounded-lg px-4 py-3 shadow-[4px_4px_0px_#000]">
                <Clock size={18} className="text-black" />
                <span className="font-mono font-black text-lg text-black">
                  {formatTime(timeLeft)}
                </span>
                <span className="text-black text-sm font-bold">tersisa</span>
              </div>

              {/* QR Card - Neo */}
              <div className="bg-white border-4 border-black rounded-xl p-6 shadow-[6px_6px_0px_#000]">
                <div className="text-center mb-4">
                  <p className="text-slate-600 text-sm font-medium">Scan QRIS untuk membayar</p>
                  <p className="text-3xl font-black text-black mt-2">
                    Rp {formatCurrency(depositData?.total || 0)}
                  </p>
                </div>

                {/* QR Image */}
                <div className="flex justify-center mb-6">
                  <div className="bg-white rounded-lg p-4 border-3 border-black">
                    {depositData?.qr_image && (
                      <Image
                        src={depositData.qr_image}
                        alt="QRIS Code"
                        width={200}
                        height={200}
                        className="w-48 h-48"
                        unoptimized
                      />
                    )}
                  </div>
                </div>

                {/* Payment Info */}
                <div className="space-y-3 mb-6 bg-slate-100 rounded-lg p-4 border-2 border-black">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Nominal</span>
                    <span className="text-black font-bold">Rp {formatCurrency(depositData?.diterima || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Biaya Admin</span>
                    <span className="text-black font-bold">Rp {formatCurrency(depositData?.fee || 0)}</span>
                  </div>
                  <div className="border-t-2 border-black pt-3 flex justify-between">
                    <span className="text-black font-bold">Total Bayar</span>
                    <span className="text-emerald-600 font-black">Rp {formatCurrency(depositData?.total || 0)}</span>
                  </div>
                </div>

                {/* Deposit ID */}
                <div className="bg-slate-100 rounded-lg p-3 flex items-center justify-between border-2 border-black">
                  <div>
                    <p className="text-[10px] text-slate-500 font-bold">DEPOSIT ID</p>
                    <p className="font-mono text-sm text-black font-bold">{depositData?.id}</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(depositData?.id || "")}
                    className="p-2 hover:bg-slate-200 rounded-lg transition-colors border-2 border-black"
                  >
                    <Copy size={16} className="text-black" />
                  </button>
                </div>
              </div>

              {/* Action Buttons - Neo */}
              <div className="flex gap-3">
                <button
                  onClick={() => checkPaymentStatus(true)}
                  disabled={checkingStatus}
                  className="flex-1 py-4 font-black bg-emerald-400 text-black rounded-lg border-3 border-black hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  <RefreshCw size={18} className={checkingStatus ? "animate-spin" : ""} />
                  CEK STATUS
                </button>
                <button
                  onClick={cancelDeposit}
                  className="py-4 px-6 font-black bg-rose-400 text-black border-3 border-black rounded-lg hover:bg-rose-500 transition-colors shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                >
                  BATAL
                </button>
              </div>
            </div>
          ) : (
            /* Success / Cancel / Expired States - Neo */
            <div className="bg-white border-4 border-black rounded-xl p-8 text-center shadow-[6px_6px_0px_#000]">
              {status === "success" ? (
                <>
                  <div className="w-20 h-20 bg-emerald-400 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-black" />
                  </div>
                  <h2 className="text-2xl font-black text-black mb-2">
                    PEMBAYARAN BERHASIL!
                  </h2>
                  <p className="text-slate-600 mb-6 font-medium">
                    Saldo Anda telah ditambahkan sebesar{" "}
                    <span className="font-black text-emerald-600">
                      Rp {formatCurrency(depositData?.diterima || 0)}
                    </span>
                  </p>
                </>
              ) : status === "cancel" ? (
                <>
                  <div className="w-20 h-20 bg-rose-400 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle size={40} className="text-black" />
                  </div>
                  <h2 className="text-2xl font-black text-black mb-2">
                    PEMBAYARAN DIBATALKAN
                  </h2>
                  <p className="text-slate-600 mb-6 font-medium">
                    Pembayaran Anda telah dibatalkan
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-amber-400 border-4 border-black rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock size={40} className="text-black" />
                  </div>
                  <h2 className="text-2xl font-black text-black mb-2">
                    WAKTU HABIS
                  </h2>
                  <p className="text-slate-600 mb-6 font-medium">
                    Kode QRIS telah kedaluwarsa
                  </p>
                </>
              )}

              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetDeposit}
                  className="py-3 px-6 font-black bg-emerald-400 text-black rounded-lg border-3 border-black hover:bg-emerald-500 transition-colors shadow-[3px_3px_0px_#000]"
                >
                  DEPOSIT LAGI
                </button>
                <Link
                  href="/dashboard"
                  className="py-3 px-6 font-black bg-white text-black border-3 border-black rounded-lg hover:bg-slate-100 transition-colors shadow-[3px_3px_0px_#000]"
                >
                  KE DASHBOARD
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main Deposit Page - Neo Brutalism
  return (
    <div className="min-h-screen bg-slate-200 pb-6">
      {/* Header - Neo Brutalism */}
      <div className="sticky top-0 z-50 bg-white border-b-4 border-black px-4 py-3">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-400 rounded border-2 border-black flex items-center justify-center">
              <span className="text-black font-black text-xs">OC</span>
            </div>
            <span className="text-black font-black">OTP CEPAT</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-400 border-2 border-black rounded-lg shadow-[2px_2px_0px_#000]">
              <Wallet size={14} className="text-black" />
              <span className="text-sm font-bold text-black">
                {refreshingBalance ? "..." : `${formatCurrency(userBalance)} IDR`}
              </span>
            </div>
            <div className="w-8 h-8 bg-amber-400 rounded border-2 border-black flex items-center justify-center text-black text-xs font-black">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Balance Summary Card - Neo Brutalism */}
        <div className="bg-slate-100 border-4 border-black rounded-xl p-5 shadow-[6px_6px_0px_#000] mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-400 rounded-lg flex items-center justify-center border-2 border-black">
                <Wallet size={18} className="text-black" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 tracking-wider font-bold uppercase">ACCOUNT</p>
                <p className="text-black font-black">Balance Summary</p>
              </div>
            </div>
            <button onClick={fetchBalance} className="p-2 hover:bg-slate-200 rounded-lg transition-colors border-2 border-black">
              <RefreshCw size={16} className={`text-black ${refreshingBalance ? "animate-spin" : ""}`} />
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-600 text-sm font-medium">Saldo Akun Kamu</p>
              <p className="text-2xl font-black text-black">
                {refreshingBalance ? "..." : `${formatCurrency(userBalance)} IDR`}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("deposit")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-400 border-2 border-black rounded-lg text-black text-sm font-bold hover:bg-emerald-500 transition-colors shadow-[3px_3px_0px_#000]"
            >
              <Plus size={16} />
              Deposit
            </button>
          </div>

          {/* Tabs - Neo Brutalism */}
          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-colors border-2 border-black ${
                activeTab === "activity"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-slate-100"
              }`}
            >
              <Activity size={16} />
              Aktifitas
            </button>
            <button
              onClick={() => setActiveTab("deposit")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-sm transition-colors border-2 border-black ${
                activeTab === "deposit"
                  ? "bg-black text-white"
                  : "bg-white text-black hover:bg-slate-100"
              }`}
            >
              <CreditCard size={16} />
              Deposit
            </button>
          </div>
        </div>

        {activeTab === "deposit" ? (
          <>
            {/* Amount Input - Neo Brutalism */}
            <div className="bg-white border-4 border-black rounded-xl p-5 shadow-[6px_6px_0px_#000] mb-6">
              <p className="text-black font-black mb-4">Masukkan Nominal</p>
              
              <div className="relative mb-4">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-500">
                  Rp
                </span>
                <input
                  type="text"
                  value={amount}
                  onChange={handleAmountChange}
                  placeholder="0"
                  className="w-full pl-12 pr-4 py-4 text-2xl font-black text-black bg-slate-100 border-3 border-black rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                {PRESET_AMOUNTS.map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAmount(preset.toLocaleString("id-ID"))}
                    className={`py-2 px-3 text-sm font-bold rounded-lg transition-colors border-2 border-black ${
                      amount === preset.toLocaleString("id-ID")
                        ? "bg-emerald-400 text-black shadow-[2px_2px_0px_#000]"
                        : "bg-white text-black hover:bg-slate-100"
                    }`}
                  >
                    Rp{formatCurrency(preset)}
                  </button>
                ))}
              </div>

              {/* Fee & Total */}
              {amount && (
                <div className="bg-slate-100 rounded-lg p-4 mb-4 space-y-2 border-2 border-black">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Nominal</span>
                    <span className="text-black font-bold">Rp {amount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">Biaya Admin</span>
                    <span className="text-black font-bold">Rp {formatCurrency(depositFee)}</span>
                  </div>
                  <div className="border-t-2 border-black pt-2 flex justify-between">
                    <span className="text-black font-bold">Total Bayar</span>
                    <span className="text-emerald-600 font-black">
                      Rp {formatCurrency((parseInt(amount.replace(/\D/g, "")) || 0) + depositFee)}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Method - Neo Brutalism */}
              <div className="flex items-center gap-3 bg-slate-100 border-2 border-black rounded-lg p-3 mb-4">
                <div className="w-12 h-12 bg-amber-400 rounded-lg flex items-center justify-center border-2 border-black">
                  <QrCode size={24} className="text-black" />
                </div>
                <div className="flex-1">
                  <p className="text-black font-bold">QRIS</p>
                  <p className="text-slate-600 text-xs font-medium">Bayar dengan e-wallet & mobile banking</p>
                </div>
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>

              <button
                onClick={handleCreateDeposit}
                disabled={status === "loading" || !amount}
                className={`w-full py-4 text-lg font-black rounded-lg transition-all border-3 border-black ${
                  status === "loading" || !amount
                    ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                    : "bg-emerald-400 text-black hover:bg-emerald-500 shadow-[4px_4px_0px_#000] hover:shadow-[2px_2px_0px_#000] hover:translate-x-[2px] hover:translate-y-[2px]"
                }`}
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={20} className="animate-spin" />
                    MEMPROSES...
                  </span>
                ) : (
                  "BUAT PEMBAYARAN"
                )}
              </button>
            </div>

            {/* Trending Services - Neo Brutalism */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-rose-400 rounded border-2 border-black flex items-center justify-center">
                    <TrendingUp size={12} className="text-black" />
                  </div>
                  <span className="text-black font-black">Sedang trending</span>
                </div>
                <Link href="/services" className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:underline">
                  lihat semua <ChevronRight size={14} />
                </Link>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {trendingServices.map((service) => (
                  <Link
                    key={service.id}
                    href="/services"
                    className="flex-shrink-0 w-36 bg-white border-3 border-black rounded-lg p-3 hover:shadow-[4px_4px_0px_#000] transition-all hover:-translate-y-1"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {service.icon ? (
                        <img src={service.icon} alt={service.name} className="w-8 h-8" />
                      ) : (
                        <div className="w-8 h-8 bg-amber-400 rounded border-2 border-black flex items-center justify-center text-black text-xs font-black">
                          ?
                        </div>
                      )}
                      <span className="text-black text-sm font-bold truncate">{service.name}</span>
                    </div>
                    <div className="flex items-center gap-1 mb-1">
                      <span className="text-lg">{service.countryFlag}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">Harga Terbaru</p>
                    <p className="text-emerald-600 font-black text-sm">Rp{formatCurrency(service.price)}</p>
                  </Link>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {/* Payment History - Neo Brutalism */}
        <div className="bg-white border-4 border-black rounded-xl p-5 shadow-[6px_6px_0px_#000]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-black font-black">Riwayat pembayaran</span>
            <span className="text-slate-500 text-xs font-medium">
              Updated: {new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} WIB
            </span>
          </div>

          {loadingTransactions ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin text-black" size={24} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-slate-100 border-2 border-black rounded-lg p-8 text-center">
              <Clock size={40} className="mx-auto text-slate-400 mb-3" />
              <p className="text-slate-600 font-medium">Belum ada riwayat deposit</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 10).map((tx) => (
                <button
                  key={tx.id}
                  onClick={() => handleTransactionClick(tx)}
                  className={`w-full bg-slate-100 border-2 border-black rounded-lg p-4 flex items-center gap-3 transition-all text-left ${
                    tx.status === "pending" 
                      ? "hover:shadow-[3px_3px_0px_#000] hover:-translate-y-0.5 cursor-pointer" 
                      : "opacity-80 cursor-default"
                  }`}
                >
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center border-2 border-black ${
                    tx.status === "pending" ? "bg-amber-400" : tx.status === "success" ? "bg-emerald-400" : "bg-rose-400"
                  }`}>
                    <QrCode size={20} className="text-black" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-black font-bold">QRIS NOBU</p>
                    <p className="text-slate-500 text-xs font-medium truncate">{formatDate(tx.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-black font-black">{formatCurrency(tx.total || tx.amount)} IDR</p>
                    <p className={`text-xs font-bold ${getStatusColor(tx.status)}`}>
                      {getStatusLabel(tx.status)}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-black" />
                </button>
              ))}
            </div>
          )}

          {transactions.length > 0 && (
            <Link
              href="/history"
              className="flex items-center justify-center gap-2 text-emerald-600 text-sm font-bold mt-4 py-3 hover:underline"
            >
              Lihat riwayat topup <ChevronRight size={14} />
            </Link>
          )}
        </div>
      </div>

    </div>
  );
}
