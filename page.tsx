// app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import BuyNumber from "@/components/BuyNumber";
import { User, LogOut, Wallet, TrendingUp, Terminal, RefreshCw } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<any>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/auth/login");
      return;
    }
    setUser(current);
    fetchBalance();
  }, [router]);

  const fetchBalance = async () => {
    setRefreshing(true);
    if (!process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY) {
      setLoadingBalance(false);
      setRefreshing(false);
      return;
    }

    try {
      const res = await fetch("https://www.rumahotp.io/api/v1/user/balance", {
        headers: {
          "x-apikey": process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY,
          Accept: "application/json",
        },
      });
      const data = await res.json();
      if (data.success) setBalance(data.data);
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

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-80px)] relative overflow-hidden bg-gradient-to-br from-gray-50 to-white">
        {/* Retro Pattern Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,_#e5e7eb_1px,_transparent_1px),linear-gradient(90deg,_#e5e7eb_1px,_transparent_1px)] bg-[length:40px_40px] opacity-20"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 animate-fade-in-up">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Terminal size={16} className="text-gray-400" />
                <span className="text-xs font-mono text-gray-400 tracking-wider">DASHBOARD</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-light text-gray-900 tracking-tight">
                Dashboard
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Selamat datang kembali, <span className="font-semibold text-gray-700">{user?.name}</span>
              </p>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-5 py-2.5 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 shadow-sm"
            >
              <LogOut size={16} className="text-gray-500" />
              <span className="text-sm font-medium">Keluar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
            {/* Saldo Card */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Wallet size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-xs font-mono text-gray-400 tracking-wider">BALANCE</p>
                      <p className="text-2xl font-semibold text-gray-900 mt-1">
                        {loadingBalance ? "..." : balance?.formated || "Rp0"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={fetchBalance}
                    disabled={refreshing}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={12} className="text-gray-400" />
                    <p className="text-xs font-mono text-gray-400 tracking-wider">API USERNAME</p>
                  </div>
                  <p className="font-mono text-sm text-gray-700">{balance?.username || "-"}</p>
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="lg:col-span-7">
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300 h-full">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <User size={20} className="text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-gray-400 tracking-wider">ACCOUNT</p>
                    <p className="text-lg font-semibold text-gray-800 mt-1">{user?.name}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{user?.email}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fitur Beli Nomor */}
          <div className="mt-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <span className="text-gray-600 text-sm">🛒</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Beli Nomor Virtual OTP</h2>
                <p className="text-xs text-gray-400 font-mono tracking-wider">ORDER_NUMBER_SERVICE</p>
              </div>
            </div>

            <BuyNumber />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.5s ease-out forwards;
        }
      `}</style>
    </>
  );
}