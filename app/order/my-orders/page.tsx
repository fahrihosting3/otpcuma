"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser, type User } from "@/lib/auth";
import { getActiveOrders, removeActiveOrder, type ActiveOrder } from "@/lib/orders";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Phone,
  RefreshCw,
  Terminal,
  ShoppingBag,
  ExternalLink,
  Trash2,
  AlertCircle,
} from "lucide-react";

export default function MyOrdersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/auth/login");
      return;
    }
    setUser(current);
    fetchOrders(current.email);
  }, [router]);

  const fetchOrders = (email: string) => {
    setRefreshing(true);
    const activeOrders = getActiveOrders(email);
    setOrders(activeOrders);
    setLoading(false);
    setRefreshing(false);
  };

  const handleRemoveOrder = (orderId: string) => {
    removeActiveOrder(orderId);
    if (user) {
      fetchOrders(user.email);
    }
  };

  const formatTime = (expiredAt: number) => {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiredAt - now) / 1000));
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  // Auto refresh timer
  useEffect(() => {
    const interval = setInterval(() => {
      if (user) {
        const activeOrders = getActiveOrders(user.email);
        setOrders(activeOrders);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [user]);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-80px)] relative overflow-hidden bg-slate-100">
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

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-20">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="space-y-2">
              <Link
                href="/services"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium"
              >
                <ArrowLeft size={16} />
                Kembali ke Layanan
              </Link>
              <div className="flex items-center gap-2">
                <Terminal size={12} className="text-slate-400" />
                <span className="text-[10px] font-mono text-slate-400 tracking-wider">MY ORDERS</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Orderan Aktif Saya</h1>
              </div>
              <p className="text-slate-500 text-sm ml-3">
                {orders.length} order aktif
              </p>
            </div>

            <button
              onClick={() => user && fetchOrders(user.email)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border-3 border-slate-800 shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm font-bold"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              REFRESH
            </button>
          </div>

          {/* Orders List */}
          {loading ? (
            <div className="bg-white border-4 border-slate-800 p-8 shadow-[6px_6px_0px_#1e293b] text-center">
              <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
              <p className="text-slate-600 font-medium">Memuat orderan...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="bg-white border-4 border-slate-800 p-8 shadow-[6px_6px_0px_#1e293b] text-center">
              <ShoppingBag size={48} className="mx-auto mb-3 text-slate-300" />
              <h3 className="text-lg font-bold text-slate-800 mb-1">Tidak Ada Order Aktif</h3>
              <p className="text-slate-500 text-sm mb-4">
                Semua orderan sudah selesai atau expired.
              </p>
              <Link
                href="/services"
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 border-3 border-slate-800 shadow-[4px_4px_0px_#1e293b] hover:shadow-[5px_5px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all font-bold text-slate-800"
              >
                <ShoppingBag size={16} />
                BELI NOMOR BARU
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {orders.map((order) => {
                const isExpiringSoon = order.expiredAt - Date.now() < 60000; // Less than 1 minute
                return (
                  <div
                    key={order.orderId}
                    className={`bg-white border-4 border-slate-800 shadow-[6px_6px_0px_#1e293b] overflow-hidden ${
                      isExpiringSoon ? "animate-pulse" : ""
                    }`}
                  >
                    {/* Order Header */}
                    <div className={`px-4 py-3 border-b-2 border-slate-800 ${isExpiringSoon ? "bg-rose-500" : "bg-slate-800"}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock size={14} className="text-white" />
                          <span className="text-white font-bold text-xs tracking-wider">
                            {isExpiringSoon ? "SEGERA EXPIRED" : "WAKTU TERSISA"}
                          </span>
                        </div>
                        <div className="font-mono text-lg font-black text-amber-400">
                          {formatTime(order.expiredAt)}
                        </div>
                      </div>
                    </div>

                    {/* Order Content */}
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-amber-200 border-2 border-slate-800 flex items-center justify-center">
                            <Phone size={18} className="text-slate-800" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{order.service}</p>
                            <p className="text-xs text-slate-500">{order.country}</p>
                            <p className="font-mono text-sm text-slate-600 mt-1">{order.phoneNumber}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-3 py-1 bg-emerald-100 border-2 border-slate-800 text-xs font-bold text-slate-800">
                            {formatCurrency(order.price)}
                          </span>
                          
                          <Link
                            href={`/order/active?order_id=${order.orderId}&phone_number=${encodeURIComponent(order.phoneNumber)}&service=${encodeURIComponent(order.service)}&country=${encodeURIComponent(order.country)}&expired_at=${order.expiredAt}&price=${order.price}&created_at=${order.createdAt}`}
                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-400 border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-xs font-bold text-slate-800"
                          >
                            <ExternalLink size={12} />
                            LIHAT ORDER
                          </Link>

                          <button
                            onClick={() => handleRemoveOrder(order.orderId)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-rose-100 border-2 border-slate-800 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-xs font-bold text-rose-600"
                          >
                            <Trash2 size={12} />
                            HAPUS
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Info Card */}
              <div className="bg-amber-50 border-3 border-slate-800 p-4 shadow-[4px_4px_0px_#1e293b]">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Info</p>
                    <p className="text-slate-600 text-xs mt-1">
                      Anda bisa melakukan order baru tanpa harus menunggu order sebelumnya selesai.
                      Klik &quot;LIHAT ORDER&quot; untuk melihat detail dan kode OTP.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
