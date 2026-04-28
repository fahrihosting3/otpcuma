"use client";

import { useEffect, useState, useMemo } from "react";
import { getAllTransactions, type TransactionData } from "@/lib/externalDB";
import { Receipt, Terminal, RefreshCw, AlertCircle, CheckCircle2, Clock, XCircle, Filter, Calendar, BarChart3 } from "lucide-react";
import TransactionChart from "@/components/TransactionChart";

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [filterType, setFilterType] = useState<"all" | "deposit" | "purchase">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "success" | "cancel">("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const res = await getAllTransactions();
      if (res.success && res.data) {
        setTransactions(res.data);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((trx) => {
      // Filter by type
      if (filterType !== "all" && trx.type !== filterType) return false;
      
      // Filter by status
      if (filterStatus !== "all" && trx.status !== filterStatus) return false;
      
      // Filter by date range
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom);
        const trxDate = new Date(trx.createdAt);
        if (trxDate < fromDate) return false;
      }
      
      if (filterDateTo) {
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        const trxDate = new Date(trx.createdAt);
        if (trxDate > toDate) return false;
      }
      
      return true;
    });
  }, [transactions, filterType, filterStatus, filterDateFrom, filterDateTo]);

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
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 border-2 border-slate-800 rounded-lg text-xs font-bold text-slate-800">
            <CheckCircle2 size={12} /> SUKSES
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 border-2 border-slate-800 rounded-lg text-xs font-bold text-slate-800">
            <Clock size={12} /> PENDING
          </span>
        );
      case "cancel":
      case "expired":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 border-2 border-slate-800 rounded-lg text-xs font-bold text-slate-800">
            <XCircle size={12} /> {status.toUpperCase()}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 border-2 border-slate-800 rounded-lg text-xs font-bold text-slate-800">
            {status}
          </span>
        );
    }
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="animate-spin text-slate-600" size={24} />
          <span className="text-slate-600 font-medium">Memuat transaksi...</span>
        </div>
      </div>
    );
  }

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
            <div className="w-1 h-6 bg-teal-500 rounded-full"></div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Semua Transaksi
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            Total <span className="font-semibold text-slate-700">{transactions.length}</span> transaksi
            {filteredTransactions.length !== transactions.length && (
              <span className="text-amber-600"> ({filteredTransactions.length} ditampilkan)</span>
            )}
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

      {/* Chart Section */}
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b] p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-violet-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
            <BarChart3 size={18} className="text-slate-800" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800">Grafik Transaksi</h2>
            <p className="text-xs text-slate-500">7 hari terakhir</p>
          </div>
        </div>
        <TransactionChart transactions={filteredTransactions} type="bar" height={250} />
      </div>

      {/* Filter Section */}
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b] p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-amber-200 border-2 border-slate-800 rounded-lg flex items-center justify-center">
            <Filter size={14} className="text-slate-800" />
          </div>
          <h2 className="text-lg font-black text-slate-800">Filter Transaksi</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Type Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 tracking-wider">TIPE</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "all" | "deposit" | "purchase")}
              className="w-full px-3 py-2 text-sm font-bold bg-white border-3 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">Semua Tipe</option>
              <option value="deposit">Deposit</option>
              <option value="purchase">Pembelian</option>
            </select>
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 tracking-wider">STATUS</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as "all" | "pending" | "success" | "cancel")}
              className="w-full px-3 py-2 text-sm font-bold bg-white border-3 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Pending</option>
              <option value="success">Sukses</option>
              <option value="cancel">Cancel</option>
            </select>
          </div>
          
          {/* Date From */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 tracking-wider">DARI TANGGAL</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm font-bold bg-white border-3 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          
          {/* Date To */}
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-2 tracking-wider">SAMPAI TANGGAL</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm font-bold bg-white border-3 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>
          
          {/* Clear Filters */}
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="w-full px-4 py-2 text-sm font-bold bg-slate-100 border-3 border-slate-800 rounded-xl hover:bg-slate-200 transition-colors"
            >
              RESET
            </button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-teal-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <Receipt size={18} className="text-slate-800" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Daftar Transaksi ({filteredTransactions.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 text-left text-xs font-bold tracking-wider">ID</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">USER</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">TIPE</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">NOMINAL</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">STATUS</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">TANGGAL</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((trx, idx) => (
                  <tr key={trx.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-3 font-mono text-xs text-slate-600">{trx.depositId || trx.id}</td>
                    <td className="p-3 text-sm text-slate-800">{trx.userEmail}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-bold border-2 border-slate-800 rounded-lg ${
                        trx.type === "purchase" ? "bg-violet-100" : "bg-sky-100"
                      }`}>
                        {trx.type === "purchase" ? "PEMBELIAN" : "DEPOSIT"}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-sm text-slate-800">{formatCurrency(trx.amount)}</td>
                    <td className="p-3">{getStatusBadge(trx.status)}</td>
                    <td className="p-3 text-sm text-slate-600">{formatDate(trx.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTransactions.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                <p>Tidak ada transaksi yang sesuai filter</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
