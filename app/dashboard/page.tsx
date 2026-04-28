// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser, refreshUserData } from "@/lib/auth";
import { 
  getMaintenanceStatus, 
  isMaintenanceCurrentlyActive, 
  getMaintenanceEndTime,
  checkAndProcessExpiredOrdersFromDB
} from "@/lib/externalDB";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import WelcomeNotificationModal from "@/components/WelcomeNotificationModal";
import OTPNotificationToast from "@/components/OTPNotificationToast";
import Link from "next/link";
import {
  User,
  LogOut,
  Wallet,
  Terminal,
  RefreshCw,
  ShoppingCart,
  ArrowRight,
  CreditCard,
  Receipt,
  Shield,
  History,
  Wrench,
  Clock
} from "lucide-react";
import { toast } from "sonner";
import { useRef } from "react";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceCountdown, setMaintenanceCountdown] = useState("");
  
  // Welcome Modal State
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  // Ref to track if expired orders check was already done
  const expiredCheckDoneRef = useRef(false);

  const router = useRouter();

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/auth/login");
      return;
    }
    setUser(current);
    setUserBalance(current.balance || 0);
    fetchBalance();
    
    // Check and process expired orders from DATABASE (cross-device compatible)
    if (!expiredCheckDoneRef.current && current.email) {
      expiredCheckDoneRef.current = true;
      checkAndProcessExpiredOrdersFromDB(current.email).then((result) => {
        if (result.success && result.processedOrders.length > 0) {
          const totalRefund = result.processedOrders
            .filter((o) => o.refunded)
            .reduce((sum, o) => sum + o.amount, 0);
          
          if (totalRefund > 0) {
            // Refresh balance after refund
            refreshUserData().then((updatedUser) => {
              if (updatedUser) {
                setUserBalance(updatedUser.balance || 0);
                setUser(updatedUser);
              }
            });
            toast.success(`Order expired! Saldo Rp ${totalRefund.toLocaleString("id-ID")} telah dikembalikan.`);
          }
        }
      }).catch((err) => {
        console.error("[v0] Error checking expired orders:", err);
      });
    }
    
    // Check if we should show welcome modal (after login)
    const shouldShowModal = sessionStorage.getItem("show_welcome_modal");
    if (shouldShowModal === "true") {
      setShowWelcomeModal(true);
      sessionStorage.removeItem("show_welcome_modal");
    }
  }, [router]);

  // Check maintenance status
  useEffect(() => {
    const checkMaintenance = async () => {
      const maintenance = await getMaintenanceStatus();
      const currentUser = getCurrentUser();
      
      if (isMaintenanceCurrentlyActive(maintenance) && currentUser?.role !== "admin") {
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

  const fetchBalance = async () => {
    setRefreshing(true);
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
      setRefreshing(false);
    }
  };

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  // Show maintenance block
  if (isMaintenanceActive) {
    return (
      <>
        <Navbar />
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md bg-white border-4 border-slate-800 shadow-[8px_8px_0px_#1e293b] p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-orange-300 border-4 border-slate-800 flex items-center justify-center animate-pulse">
                <Wrench size={32} className="text-slate-800" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-800 text-center mb-2">
              WEBSITE SEDANG MAINTENANCE
            </h1>
            <p className="text-center text-slate-600 mb-6">
              Dashboard tidak dapat diakses selama maintenance berlangsung. Silakan tunggu hingga maintenance selesai.
            </p>
            <div className="bg-slate-100 border-2 border-slate-800 p-4 mb-6">
              <p className="text-[10px] font-mono text-slate-500 tracking-wider text-center mb-2">
                SISA WAKTU MAINTENANCE
              </p>
              <div className="flex items-center justify-center gap-2">
                <Clock size={20} className="text-orange-500" />
                <span className="text-2xl font-black font-mono text-slate-800 tracking-widest">
                  {maintenanceCountdown || "00:00:00"}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={16} />
              REFRESH HALAMAN
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      
      {/* OTP Notification Toast */}
      <OTPNotificationToast />
      
      {/* Welcome Notification Modal */}
      <WelcomeNotificationModal
        isOpen={showWelcomeModal}
        onClose={() => setShowWelcomeModal(false)}
        onComplete={() => setShowWelcomeModal(false)}
      />
      
      <div className="min-h-[calc(100vh-80px)] relative overflow-hidden bg-gray-50">
        {/* Retro Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(0deg,_#d1d5db_1px,_transparent_1px),linear-gradient(90deg,_#d1d5db_1px,_transparent_1px)] bg-[length:40px_40px] opacity-10"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-gray-400" />
                <span className="text-[10px] font-mono text-gray-400 tracking-wider">DASHBOARD</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gray-800 rounded-full"></div>
                <h1 className="text-3xl sm:text-4xl font-light text-gray-900 tracking-tight">
                  Dashboard
                </h1>
              </div>
              <p className="text-gray-500 text-sm ml-3">
                Selamat datang kembali, <span className="font-semibold text-gray-700">{user?.name}</span>
              </p>
            </div>

            <div className="flex items-center gap-3">
              {user?.role === "admin" && (
                <Link
                  href="/admin"
                  className="flex items-center gap-2 px-4 py-2 text-white bg-rose-500 border border-rose-600 rounded-lg hover:bg-rose-600 transition-all duration-300 text-sm font-medium"
                >
                  <Shield size={14} />
                  Admin Panel
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-300 text-sm"
              >
                <LogOut size={14} />
                Keluar
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Saldo Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Wallet size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-gray-400">SALDO ANDA</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {loadingBalance ? "..." : `Rp ${userBalance.toLocaleString("id-ID")}`}
                    </p>
                  </div>
                </div>
                <button onClick={fetchBalance} disabled={refreshing} className="p-1 text-gray-400 hover:text-gray-600">
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                </button>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-[9px] font-mono text-gray-400">EMAIL</p>
                <p className="font-mono text-xs text-gray-700">{user?.email || "-"}</p>
              </div>
            </div>

            {/* User Card */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <User size={18} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono text-gray-400">AKUN</p>
                    <p className="text-base font-semibold text-gray-800">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                    user?.role === "admin" 
                      ? "bg-rose-100 text-rose-700" 
                      : "bg-sky-100 text-sky-700"
                  }`}>
                    {user?.role === "admin" ? <Shield size={12} /> : <User size={12} />}
                    {user?.role?.toUpperCase() || "USER"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons Grid - 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pilih Layanan Button */}
            <Link href="/services" className="block">
              <div 
                className="border-4 border-gray-900 bg-amber-400 p-6 shadow-[6px_6px_0px_#0A0A0A] hover:shadow-[8px_8px_0px_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-150 cursor-pointer h-full"
                style={{ fontFamily: "'Space Mono', 'Courier New', monospace" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-900 flex items-center justify-center">
                      <ShoppingCart size={24} className="text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Terminal size={10} className="text-gray-900" />
                        <span className="text-[10px] font-bold tracking-[3px] text-gray-900">OTP CEPET</span>
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-gray-900">PILIH LAYANAN</h3>
                      <p className="text-xs text-gray-700 tracking-wide mt-1">Beli nomor virtual untuk verifikasi OTP</p>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center">
                    <ArrowRight size={20} className="text-amber-400" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Deposit Button */}
            <Link href="/deposit" className="block">
              <div 
                className="border-4 border-gray-900 bg-emerald-400 p-6 shadow-[6px_6px_0px_#0A0A0A] hover:shadow-[8px_8px_0px_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-150 cursor-pointer h-full"
                style={{ fontFamily: "'Space Mono', 'Courier New', monospace" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-900 flex items-center justify-center">
                      <CreditCard size={24} className="text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Terminal size={10} className="text-gray-900" />
                        <span className="text-[10px] font-bold tracking-[3px] text-gray-900">TOP UP</span>
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-gray-900">DEPOSIT SALDO</h3>
                      <p className="text-xs text-gray-700 tracking-wide mt-1">Isi saldo untuk membeli nomor OTP</p>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center">
                    <ArrowRight size={20} className="text-emerald-400" />
                  </div>
                </div>
              </div>
            </Link>

            {/* History Button */}
            <Link href="/history" className="block md:col-span-2">
              <div 
                className="border-4 border-gray-900 bg-sky-400 p-6 shadow-[6px_6px_0px_#0A0A0A] hover:shadow-[8px_8px_0px_#0A0A0A] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-150 cursor-pointer"
                style={{ fontFamily: "'Space Mono', 'Courier New', monospace" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gray-900 flex items-center justify-center">
                      <History size={24} className="text-sky-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt size={10} className="text-gray-900" />
                        <span className="text-[10px] font-bold tracking-[3px] text-gray-900">TRANSAKSI</span>
                      </div>
                      <h3 className="text-xl font-black tracking-tight text-gray-900">RIWAYAT TRANSAKSI</h3>
                      <p className="text-xs text-gray-700 tracking-wide mt-1">Lihat semua riwayat deposit dan pembelian</p>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-gray-900 flex items-center justify-center">
                    <ArrowRight size={20} className="text-sky-400" />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
