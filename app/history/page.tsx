// app/history/page.tsx
"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getTransactionsByUser, type TransactionData, getAllOrdersWithProfit, type OrderWithProfit } from "@/lib/externalDB";
import { getOrderHistory, getOrderHistoryStats, type OrderHistory } from "@/lib/orders";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import {
  ArrowLeft,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  Calendar,
  Filter,
  BarChart3,
  TrendingUp,
  Phone,
  ShoppingCart,
  Wallet,
} from "lucide-react";
import TransactionChart from "@/components/TransactionChart";

type TabType = "transactions" | "orders";

export default function HistoryPage() {
  const [user, setUser] = useState<any>(null);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [filteredTrx, setFilteredTrx] = useState<TransactionData[]>([]);
  const [orders, setOrders] = useState<OrderWithProfit[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<OrderWithProfit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "success" | "pending" | "failed" | "cancel">("all");
  const [activeTab, setActiveTab] = useState<TabType>("orders");
  const router = useRouter();

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/auth/login");
      return;
    }
    setUser(current);
    fetchAllData(current.email);
  }, [router]);

  useEffect(() => {
    // Filter transactions
    if (filter === "all") {
      setFilteredTrx(transactions);
    } else if (filter === "failed") {
      setFilteredTrx(transactions.filter((t) => t.status === "expired"));
    } else if (filter === "cancel") {
      setFilteredTrx(transactions.filter((t) => t.status === "cancel"));
    } else {
      setFilteredTrx(transactions.filter((t) => t.status === filter));
    }

    // Filter orders
    if (filter === "all") {
      setFilteredOrders(orders);
    } else if (filter === "failed") {
      setFilteredOrders(orders.filter((o) => o.status === "expired"));
    } else if (filter === "cancel") {
      setFilteredOrders(orders.filter((o) => o.status === "cancel"));
    } else {
      setFilteredOrders(orders.filter((o) => o.status === filter));
    }
  }, [filter, transactions, orders]);

  const fetchAllData = async (email: string) => {
    setRefreshing(true);
    try {
      // Fetch transactions
      const trxRes = await getTransactionsByUser(email);
      if (trxRes.success && trxRes.data) {
        setTransactions(trxRes.data);
        setFilteredTrx(trxRes.data);
      }

      // Fetch orders from external API first
      let userOrders: OrderWithProfit[] = [];
      
      try {
        const ordersRes = await getAllOrdersWithProfit();
        if (ordersRes.success && ordersRes.data) {
          userOrders = ordersRes.data.filter((o) => o.userEmail === email);
        }
      } catch (extErr) {
        console.error("External API error, falling back to local:", extErr);
      }

      // Also fetch from local GitHub DB and merge
      try {
        const localRes = await fetch(`/api/orders/history?userEmail=${encodeURIComponent(email)}`);
        const localData = await localRes.json();
        if (localData.success && localData.data) {
          // Merge with external orders, avoiding duplicates
          const existingIds = new Set(userOrders.map(o => o.orderId));
          for (const order of localData.data) {
            if (!existingIds.has(order.orderId)) {
              userOrders.push({
                id: order.orderId,
                orderId: order.orderId,
                userEmail: order.userEmail,
                serviceName: order.serviceName,
                countryName: order.countryName,
                phoneNumber: order.phoneNumber,
                originalPrice: order.originalPrice,
                sellingPrice: order.sellingPrice,
                profit: order.profit,
                otpCode: order.otpCode,
                status: order.status,
                createdAt: order.createdAt,
              });
            }
          }
        }
      } catch (localErr) {
        console.error("Local API error:", localErr);
      }
      
      // Also fetch from localStorage (most reliable for same-device)
      try {
        const localStorageOrders = getOrderHistory(email);
        const existingIds = new Set(userOrders.map(o => o.orderId));
        for (const order of localStorageOrders) {
          if (!existingIds.has(order.orderId)) {
            userOrders.push({
              id: order.orderId,
              orderId: order.orderId,
              userEmail: order.userEmail,
              serviceName: order.serviceName,
              countryName: order.countryName,
              phoneNumber: order.phoneNumber,
              originalPrice: order.originalPrice,
              sellingPrice: order.sellingPrice,
              profit: order.profit || 0,
              otpCode: order.otpCode,
              status: order.status,
              createdAt: order.createdAt,
            });
          }
        }
      } catch (lsErr) {
        console.error("LocalStorage error:", lsErr);
      }

      // Sort by newest first
      userOrders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setOrders(userOrders);
      setFilteredOrders(userOrders);
    } catch (err) {
      console.error("Gagal ambil data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
      case "otp_received":
        return <CheckCircle2 size={20} className="text-teal-600" />;
      case "pending":
        return <Clock size={20} className="text-amber-600" />;
      default:
        return <XCircle size={20} className="text-rose-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
      case "otp_received":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-100 border-3 border-slate-800 text-xs font-black text-slate-800">
            <CheckCircle2 size={12} /> {status === "otp_received" ? "OTP DITERIMA" : "SUKSES"}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 border-3 border-slate-800 text-xs font-black text-slate-800">
            <Clock size={12} /> PENDING
          </span>
        );
      case "cancel":
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-100 border-3 border-slate-800 text-xs font-black text-slate-800">
            <XCircle size={12} /> {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 border-3 border-slate-800 text-xs font-black text-slate-800">
            {status}
          </span>
        );
    }
  };

  // Calculate stats for transactions
  const pendingTrx = transactions.filter((t) => t.status === "pending");
  const cancelTrx = transactions.filter((t) => t.status === "cancel");
  const expiredTrx = transactions.filter((t) => t.status === "expired");
  
  const trxStats = {
    total: transactions.length,
    success: transactions.filter((t) => t.status === "success").length,
    pending: pendingTrx.length,
    cancel: cancelTrx.length,
    failed: expiredTrx.length,
    totalPending: pendingTrx.reduce((sum, t) => sum + t.amount, 0),
    totalCancel: cancelTrx.reduce((sum, t) => sum + t.amount, 0),
    totalExpired: expiredTrx.reduce((sum, t) => sum + t.amount, 0),
  };

  // Calculate stats for orders (use localStorage stats as source of truth)
  const localStats = user ? getOrderHistoryStats(user.email) : { total: 0, success: 0, pending: 0, expired: 0, cancel: 0 };
  const orderStats = {
    total: Math.max(orders.length, localStats.total),
    success: Math.max(orders.filter((o) => o.status === "success" || o.status === "otp_received").length, localStats.success),
    pending: Math.max(orders.filter((o) => o.status === "pending").length, localStats.pending),
    cancel: Math.max(orders.filter((o) => o.status === "cancel").length, localStats.cancel),
    expired: Math.max(orders.filter((o) => o.status === "expired").length, localStats.expired),
  };

  const currentStats = activeTab === "transactions" ? trxStats : {
    total: orderStats.total,
    success: orderStats.success,
    pending: orderStats.pending,
    cancel: orderStats.cancel,
    failed: orderStats.expired,
  };

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
          ></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div className="space-y-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm font-medium mb-2"
              >
                <ArrowLeft size={16} />
                Kembali ke Dashboard
              </Link>
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-slate-400" />
                <span className="text-[10px] font-mono text-slate-400 tracking-wider">HISTORY</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-sky-500 rounded-full"></div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">
                  Riwayat
                </h1>
              </div>
            </div>

            <button
              onClick={() => user && fetchAllData(user.email)}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border-3 border-slate-800 shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm font-bold"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              REFRESH
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-3 border-slate-800 transition-all ${
                activeTab === "orders"
                  ? "bg-amber-400 text-slate-800 shadow-[4px_4px_0px_#1e293b]"
                  : "bg-white text-slate-600 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b]"
              }`}
            >
              <ShoppingCart size={16} />
              Pembelian OTP ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`flex items-center gap-2 px-5 py-3 font-bold text-sm border-3 border-slate-800 transition-all ${
                activeTab === "transactions"
                  ? "bg-sky-400 text-slate-800 shadow-[4px_4px_0px_#1e293b]"
                  : "bg-white text-slate-600 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b]"
              }`}
            >
              <Wallet size={16} />
              Deposit ({transactions.filter(t => t.type === "deposit").length})
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white border-4 border-slate-800 p-4 shadow-[4px_4px_0px_#1e293b]">
              <div className="flex items-center gap-2 mb-2">
                <Receipt size={16} className="text-slate-600" />
                <p className="text-[10px] font-mono text-slate-500 tracking-wider">TOTAL</p>
              </div>
              <p className="text-2xl font-black text-slate-800">{currentStats.total}</p>
            </div>
            <div className="bg-teal-50 border-4 border-slate-800 p-4 shadow-[4px_4px_0px_#1e293b]">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={16} className="text-teal-600" />
                <p className="text-[10px] font-mono text-slate-500 tracking-wider">SUKSES</p>
              </div>
              <p className="text-2xl font-black text-slate-800">{currentStats.success}</p>
            </div>
            <div className="bg-amber-50 border-4 border-slate-800 p-4 shadow-[4px_4px_0px_#1e293b]">
              <div className="flex items-center gap-2 mb-2">
                <Clock size={16} className="text-amber-600" />
                <p className="text-[10px] font-mono text-slate-500 tracking-wider">PENDING</p>
              </div>
              <p className="text-2xl font-black text-slate-800">{currentStats.pending}</p>
            </div>
            <div className="bg-orange-50 border-4 border-slate-800 p-4 shadow-[4px_4px_0px_#1e293b]">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-orange-600" />
                <p className="text-[10px] font-mono text-slate-500 tracking-wider">CANCEL</p>
              </div>
              <p className="text-2xl font-black text-slate-800">{currentStats.cancel}</p>
            </div>
            <div className="bg-rose-50 border-4 border-slate-800 p-4 shadow-[4px_4px_0px_#1e293b]">
              <div className="flex items-center gap-2 mb-2">
                <XCircle size={16} className="text-rose-600" />
                <p className="text-[10px] font-mono text-slate-500 tracking-wider">EXPIRED</p>
              </div>
              <p className="text-2xl font-black text-slate-800">{currentStats.failed}</p>
            </div>
          </div>

          {/* Transaction Chart - Only show for transactions tab */}
          {activeTab === "transactions" && (
            <div className="bg-white border-4 border-slate-800 p-5 shadow-[6px_6px_0px_#1e293b] mb-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-violet-200 border-2 border-slate-800 flex items-center justify-center">
                  <BarChart3 size={18} className="text-slate-800" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-slate-600" />
                    <h2 className="text-lg font-black text-slate-800">Grafik Transaksi</h2>
                  </div>
                  <p className="text-xs text-slate-500">7 hari terakhir</p>
                </div>
              </div>
              <TransactionChart transactions={transactions} type="line" height={250} />
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: "all", label: "SEMUA", count: currentStats.total },
              { id: "success", label: "SUKSES", count: currentStats.success },
              { id: "pending", label: "PENDING", count: currentStats.pending },
              { id: "cancel", label: "CANCEL", count: currentStats.cancel },
              { id: "failed", label: "EXPIRED", count: currentStats.failed },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 font-bold text-sm border-3 border-slate-800 transition-all whitespace-nowrap ${
                  filter === tab.id
                    ? "bg-slate-800 text-white shadow-[3px_3px_0px_#475569]"
                    : "bg-white text-slate-800 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                }`}
              >
                <Filter size={14} />
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Content */}
          {loading ? (
            <div className="bg-white border-2 border-slate-800 rounded-xl p-8 text-center shadow-[3px_3px_0px_#1e293b]">
              <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-slate-400" />
              <p className="text-slate-500 font-medium text-sm">Memuat data...</p>
            </div>
          ) : activeTab === "orders" ? (
            // Orders List
            filteredOrders.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredOrders.map((order) => (
                  <div key={order.id || order.orderId} className="bg-white border-2 border-slate-800 rounded-xl p-4 shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 flex items-center justify-center border-2 border-slate-800 rounded-lg ${
                          order.status === "success" || order.status === "otp_received" ? "bg-teal-100" :
                          order.status === "pending" ? "bg-amber-100" :
                          order.status === "cancel" ? "bg-orange-100" :
                          "bg-rose-100"
                        }`}>
                          <Phone size={18} className={
                            order.status === "success" || order.status === "otp_received" ? "text-teal-600" :
                            order.status === "pending" ? "text-amber-600" :
                            "text-rose-600"
                          } />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {order.serviceName || "OTP Service"}
                          </p>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <Calendar size={10} />
                            <span>{formatDate(order.createdAt)}</span>
                          </div>
                          <p className="font-mono text-xs text-slate-600 mt-1">
                            {order.phoneNumber || "-"} | {order.countryName || "-"}
                          </p>
                          {order.otpCode && (
                            <p className="font-mono text-sm font-bold text-teal-600 mt-1">
                              OTP: {order.otpCode}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className={`text-base font-black ${
                          order.status === "success" || order.status === "otp_received"
                            ? "text-teal-600" 
                            : order.status === "cancel" || order.status === "expired"
                            ? "text-rose-600"
                            : order.status === "pending"
                            ? "text-amber-600"
                            : "text-slate-800"
                        }`}>
                          {formatCurrency(order.sellingPrice)}
                        </p>
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-800 rounded-xl p-8 text-center shadow-[3px_3px_0px_#1e293b]">
                <ShoppingCart size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500 font-bold text-sm">Tidak ada pembelian OTP</p>
                <p className="text-slate-400 text-xs mt-1">
                  {filter !== "all" ? "Coba filter lainnya" : "Pembelian OTP Anda akan muncul di sini"}
                </p>
                <Link
                  href="/services"
                  className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-amber-400 border-3 border-slate-800 shadow-[4px_4px_0px_#1e293b] hover:shadow-[5px_5px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all font-bold text-slate-800"
                >
                  <ShoppingCart size={16} />
                  BELI NOMOR OTP
                </Link>
              </div>
            )
          ) : (
            // Transactions List
            filteredTrx.length > 0 ? (
              <div className="flex flex-col gap-3">
                {filteredTrx.map((trx) => (
                  <div key={trx.id} className="bg-white border-2 border-slate-800 rounded-xl p-4 shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:-translate-y-0.5 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 flex items-center justify-center border-2 border-slate-800 rounded-lg ${
                          trx.status === "success" ? "bg-teal-100" :
                          trx.status === "pending" ? "bg-amber-100" :
                          trx.status === "cancel" ? "bg-orange-100" :
                          "bg-rose-100"
                        }`}>
                          {getStatusIcon(trx.status)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm">
                            {trx.type === "deposit" ? "Deposit Saldo" : "Pembelian"}
                          </p>
                          <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                            <Calendar size={10} />
                            <span>{formatDate(trx.createdAt)}</span>
                            {trx.depositId && (
                              <span className="font-mono text-slate-400">| {trx.depositId}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <p className={`text-base font-black ${
                          trx.status === "success" && trx.type === "deposit" 
                            ? "text-teal-600" 
                            : trx.status === "cancel" || trx.status === "expired"
                            ? "text-rose-600"
                            : trx.status === "pending"
                            ? "text-amber-600"
                            : "text-slate-800"
                        }`}>
                          {trx.status === "cancel" || trx.status === "expired" 
                            ? "-" 
                            : trx.type === "deposit" 
                            ? "+" 
                            : "-"}{formatCurrency(trx.amount)}
                        </p>
                        {getStatusBadge(trx.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border-2 border-slate-800 rounded-xl p-8 text-center shadow-[3px_3px_0px_#1e293b]">
                <Receipt size={32} className="mx-auto mb-2 text-slate-300" />
                <p className="text-slate-500 font-bold text-sm">Tidak ada transaksi</p>
                <p className="text-slate-400 text-xs mt-1">
                  {filter !== "all" ? "Coba filter lainnya" : "Transaksi Anda akan muncul di sini"}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </>
  );
}
