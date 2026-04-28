"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getAllUsers, getAllTransactions, getPendingTransactions, calculateFinanceSummary, getAllOrdersWithProfit, getAdminSettings, type UserData, type TransactionData, type FinanceSummary, type OrderWithProfit, type AdminSettings } from "@/lib/externalDB";
import {
  Users,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  Terminal,
  RefreshCw,
  AlertCircle,
  BarChart3,
  TrendingUp,
  DollarSign,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PiggyBank,
  CreditCard,
  Banknote,
  Coins,
  ShoppingCart,
} from "lucide-react";
import TransactionChart from "@/components/TransactionChart";

export default function AdminOverview() {
  const [user, setUser] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    successTransactions: 0,
    cancelledTransactions: 0,
    totalDeposit: 0,
  });
  const [users, setUsers] = useState<UserData[]>([]);
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(null);
  const [ordersWithProfit, setOrdersWithProfit] = useState<OrderWithProfit[]>([]);
  const [adminSettings, setAdminSettings] = useState<AdminSettings | null>(null);
  const [profitStats, setProfitStats] = useState({
    totalProfit: 0,
    todayProfit: 0,
    weekProfit: 0,
    monthProfit: 0,
    orderCount: 0,
  });

  useEffect(() => {
    const current = getCurrentUser();
    setUser(current);
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [usersRes, trxRes, ordersRes, settingsRes] = await Promise.all([
        getAllUsers(),
        getAllTransactions(),
        getAllOrdersWithProfit(),
        getAdminSettings(),
      ]);

      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }

      if (settingsRes.success && settingsRes.data) {
        setAdminSettings(settingsRes.data);
      }

      if (ordersRes.success && ordersRes.data) {
        setOrdersWithProfit(ordersRes.data);
        
        // Calculate profit stats
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const successOrders = ordersRes.data.filter(o => o.status === "success");
        const totalProfit = successOrders.reduce((sum, o) => sum + (o.profit || 0), 0);
        const todayProfit = successOrders
          .filter(o => new Date(o.createdAt) >= today)
          .reduce((sum, o) => sum + (o.profit || 0), 0);
        const weekProfit = successOrders
          .filter(o => new Date(o.createdAt) >= weekAgo)
          .reduce((sum, o) => sum + (o.profit || 0), 0);
        const monthProfit = successOrders
          .filter(o => new Date(o.createdAt) >= monthAgo)
          .reduce((sum, o) => sum + (o.profit || 0), 0);

        setProfitStats({
          totalProfit,
          todayProfit,
          weekProfit,
          monthProfit,
          orderCount: successOrders.length,
        });
      }

      if (trxRes.success && trxRes.data) {
        setTransactions(trxRes.data);
        
        const successTrx = trxRes.data.filter((t) => t.status === "success");
        const cancelTrx = trxRes.data.filter((t) => t.status === "cancel" || t.status === "expired");
        const pendingCount = trxRes.data.filter((t) => t.status === "pending");
        const totalDeposit = successTrx.reduce((sum, t) => sum + (t.amount || 0), 0);

        setStats({
          totalUsers: usersRes.data?.length || 0,
          totalTransactions: trxRes.data.length,
          pendingTransactions: pendingCount.length,
          successTransactions: successTrx.length,
          cancelledTransactions: cancelTrx.length,
          totalDeposit,
        });

        // Calculate finance summary
        const finance = calculateFinanceSummary(trxRes.data);
        setFinanceSummary(finance);
      }
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 border-2 border-slate-800 text-xs font-bold text-slate-800">
            <CheckCircle2 size={12} /> SUKSES
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 border-2 border-slate-800 text-xs font-bold text-slate-800">
            <Clock size={12} /> PENDING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 border-2 border-slate-800 text-xs font-bold text-slate-800">
            <XCircle size={12} /> {status.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-slate-400" />
            <span className="text-[10px] font-mono text-slate-400 tracking-wider">ADMIN PANEL</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-rose-500 rounded-full"></div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Overview
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            Selamat datang, <span className="font-semibold text-slate-700">{user?.name}</span>
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm font-bold"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-sky-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <Users size={18} className="text-slate-800" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 tracking-wider">TOTAL USER</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats.totalUsers}</p>
        </div>

        <div className="bg-white border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-teal-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <Receipt size={18} className="text-slate-800" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 tracking-wider">TOTAL TRX</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats.totalTransactions}</p>
        </div>

        <div className="bg-white border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-amber-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-slate-800" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 tracking-wider">PENDING</p>
          </div>
          <p className="text-3xl font-black text-slate-800">{stats.pendingTransactions}</p>
        </div>

        <div className="bg-white border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <Wallet size={18} className="text-slate-800" />
            </div>
            <p className="text-[10px] font-mono text-slate-500 tracking-wider">TOTAL DEPOSIT</p>
          </div>
          <p className="text-xl font-black text-slate-800">{formatCurrency(stats.totalDeposit)}</p>
        </div>
      </div>

      {/* Success/Failed Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-teal-50 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">TRX SUKSES</p>
              <p className="text-2xl font-black text-slate-800">{stats.successTransactions}</p>
            </div>
            <CheckCircle2 size={32} className="text-teal-600" />
          </div>
        </div>
        <div className="bg-rose-50 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">TRX GAGAL/EXPIRED</p>
              <p className="text-2xl font-black text-slate-800">{stats.cancelledTransactions}</p>
            </div>
            <XCircle size={32} className="text-rose-600" />
          </div>
        </div>
      </div>

      {/* Profit Statistics Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-amber-200 border-2 border-slate-800 rounded-lg flex items-center justify-center">
            <Coins size={16} className="text-slate-800" />
          </div>
          <h2 className="text-xl font-black text-slate-800">Statistik Keuntungan</h2>
        </div>

        {/* Profit Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-gradient-to-br from-amber-100 to-amber-200 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-amber-400 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                <Coins size={18} className="text-slate-800" />
              </div>
              <TrendingUp size={20} className="text-amber-700" />
            </div>
            <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">TOTAL PROFIT</p>
            <p className="text-xl font-black text-slate-800">{formatCurrency(profitStats.totalProfit)}</p>
          </div>

          <div className="bg-gradient-to-br from-teal-100 to-teal-200 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-teal-400 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                <Calendar size={18} className="text-slate-800" />
              </div>
              <ArrowUpRight size={20} className="text-teal-700" />
            </div>
            <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">PROFIT HARI INI</p>
            <p className="text-xl font-black text-slate-800">{formatCurrency(profitStats.todayProfit)}</p>
          </div>

          <div className="bg-gradient-to-br from-sky-100 to-sky-200 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-sky-400 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                <ShoppingCart size={18} className="text-slate-800" />
              </div>
              <PiggyBank size={20} className="text-sky-700" />
            </div>
            <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">PROFIT 7 HARI</p>
            <p className="text-xl font-black text-slate-800">{formatCurrency(profitStats.weekProfit)}</p>
          </div>

          <div className="bg-gradient-to-br from-violet-100 to-violet-200 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 bg-violet-400 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                <DollarSign size={18} className="text-slate-800" />
              </div>
              <Banknote size={20} className="text-violet-700" />
            </div>
            <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">PROFIT 30 HARI</p>
            <p className="text-xl font-black text-slate-800">{formatCurrency(profitStats.monthProfit)}</p>
          </div>
        </div>

        {/* Current Settings Info */}
        {adminSettings && (
          <div className="bg-slate-50 border-4 border-slate-800 rounded-2xl shadow-[6px_6px_0px_#1e293b] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Terminal size={14} className="text-slate-600" />
              <p className="text-sm font-bold text-slate-700">Pengaturan Fee Saat Ini</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white border-2 border-slate-800 rounded-xl">
                <p className="text-[10px] font-mono text-slate-500 tracking-wider mb-1">FEE DEPOSIT</p>
                <p className="text-lg font-black text-emerald-600">{formatCurrency(adminSettings.fees.depositFee)}</p>
              </div>
              <div className="text-center p-3 bg-white border-2 border-slate-800 rounded-xl">
                <p className="text-[10px] font-mono text-slate-500 tracking-wider mb-1">MARKUP ORDER</p>
                <p className="text-lg font-black text-amber-600">{formatCurrency(adminSettings.fees.orderMarkup)}</p>
              </div>
              <div className="text-center p-3 bg-white border-2 border-slate-800 rounded-xl">
                <p className="text-[10px] font-mono text-slate-500 tracking-wider mb-1">TELEGRAM</p>
                <p className={`text-lg font-black ${adminSettings.telegram.enabled ? "text-teal-600" : "text-slate-400"}`}>
                  {adminSettings.telegram.enabled ? "AKTIF" : "NONAKTIF"}
                </p>
              </div>
              <div className="text-center p-3 bg-white border-2 border-slate-800 rounded-xl">
                <p className="text-[10px] font-mono text-slate-500 tracking-wider mb-1">TOTAL ORDER</p>
                <p className="text-lg font-black text-slate-700">{profitStats.orderCount}</p>
              </div>
            </div>
          </div>
        )}
      </div>

{/* Finance Summary Section */}
      {financeSummary && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-emerald-200 border-2 border-slate-800 rounded-lg flex items-center justify-center">
              <DollarSign size={16} className="text-slate-800" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Ringkasan Keuangan</h2>
          </div>

          {/* Main Finance Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-emerald-300 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                  <Banknote size={18} className="text-slate-800" />
                </div>
                <ArrowUpRight size={20} className="text-emerald-600" />
              </div>
              <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">TOTAL DEPOSIT SUKSES</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(financeSummary.totalDeposit)}</p>
            </div>

            <div className="bg-gradient-to-br from-sky-50 to-sky-100 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-sky-300 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                  <CreditCard size={18} className="text-slate-800" />
                </div>
                <ArrowDownRight size={20} className="text-sky-600" />
              </div>
              <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">TOTAL PEMBELIAN</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(financeSummary.totalPurchases)}</p>
            </div>

            <div className="bg-gradient-to-br from-violet-50 to-violet-100 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-violet-300 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                  <TrendingUp size={18} className="text-slate-800" />
                </div>
                <PiggyBank size={20} className="text-violet-600" />
              </div>
              <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">TOTAL REVENUE (FEE)</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(financeSummary.totalRevenue)}</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-amber-100 border-4 border-slate-800 p-5 rounded-2xl shadow-[6px_6px_0px_#1e293b]">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 bg-amber-300 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                  <Clock size={18} className="text-slate-800" />
                </div>
                <AlertCircle size={20} className="text-amber-600" />
              </div>
              <p className="text-[10px] font-mono text-slate-600 tracking-wider mb-1">PENDING AMOUNT</p>
              <p className="text-xl font-black text-slate-800">{formatCurrency(financeSummary.pendingAmount)}</p>
            </div>
          </div>

          {/* Time-based Revenue */}
          <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[6px_6px_0px_#1e293b] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-slate-600" />
              <p className="text-sm font-bold text-slate-700">Revenue Berdasarkan Waktu</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-teal-50 border-2 border-slate-800 rounded-xl">
                <p className="text-[10px] font-mono text-slate-500 tracking-wider mb-1">HARI INI</p>
                <p className="text-lg font-black text-teal-700">{formatCurrency(financeSummary.todayRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-sky-50 border-2 border-slate-800 rounded-xl">
                <p className="text-[10px] font-mono text-slate-500 tracking-wider mb-1">7 HARI TERAKHIR</p>
                <p className="text-lg font-black text-sky-700">{formatCurrency(financeSummary.weekRevenue)}</p>
              </div>
              <div className="text-center p-4 bg-violet-50 border-2 border-slate-800 rounded-xl">
                <p className="text-[10px] font-mono text-slate-500 tracking-wider mb-1">30 HARI TERAKHIR</p>
                <p className="text-lg font-black text-violet-700">{formatCurrency(financeSummary.monthRevenue)}</p>
              </div>
            </div>

            {/* Additional Stats */}
            <div className="mt-4 pt-4 border-t-2 border-slate-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-[10px] font-mono text-slate-500">TRX SUKSES</p>
                  <p className="text-lg font-black text-emerald-600">{financeSummary.successfulTransactions}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-slate-500">TRX GAGAL</p>
                  <p className="text-lg font-black text-rose-600">{financeSummary.failedTransactions}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-slate-500">RATA-RATA TRX</p>
                  <p className="text-lg font-black text-slate-700">{formatCurrency(financeSummary.averageTransaction)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-mono text-slate-500">SUCCESS RATE</p>
                  <p className="text-lg font-black text-slate-700">
                    {financeSummary.successfulTransactions + financeSummary.failedTransactions > 0
                      ? Math.round((financeSummary.successfulTransactions / (financeSummary.successfulTransactions + financeSummary.failedTransactions)) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Chart */}
        <div className="bg-white border-4 border-slate-800 shadow-[8px_8px_0px_#1e293b] p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-violet-200 border-2 border-slate-800 flex items-center justify-center">
              <BarChart3 size={18} className="text-slate-800" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800">Grafik Transaksi</h2>
              <p className="text-xs text-slate-500">7 hari terakhir</p>
            </div>
          </div>
          <TransactionChart transactions={transactions} type="bar" height={300} />
        </div>

        {/* Recent Data */}
        <div className="bg-white border-4 border-slate-800 shadow-[8px_8px_0px_#1e293b] p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Recent Transactions */}
          <div>
            <h3 className="text-sm font-bold text-slate-600 mb-3 tracking-wider">TRANSAKSI TERBARU</h3>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((trx) => (
                <div key={trx.id} className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-800">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{trx.userEmail}</p>
                    <p className="text-xs text-slate-500">{formatDate(trx.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-800">{formatCurrency(trx.amount)}</p>
                    {getStatusBadge(trx.status)}
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Belum ada transaksi</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Users */}
          <div>
            <h3 className="text-sm font-bold text-slate-600 mb-3 tracking-wider">USER TERBARU</h3>
            <div className="space-y-2">
              {users.slice(0, 5).map((u) => (
                <div key={u.email} className="flex items-center justify-between p-3 bg-slate-50 border-2 border-slate-800">
                  <div>
                    <p className="font-bold text-sm text-slate-800">{u.username}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-bold border-2 border-slate-800 ${
                      u.role === "admin" ? "bg-rose-100" : "bg-sky-100"
                    }`}>
                      {u.role?.toUpperCase() || "USER"}
                    </span>
                  </div>
                </div>
              ))}
              {users.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Belum ada user</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
