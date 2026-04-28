"use client";

import { useEffect, useState } from "react";
import { getPendingTransactions, type TransactionData } from "@/lib/externalDB";
import { Clock, Terminal, RefreshCw, CheckCircle2 } from "lucide-react";

export default function AdminPendingPage() {
  const [pendingTrx, setPendingTrx] = useState<TransactionData[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const res = await getPendingTransactions();
      if (res.success && res.data) {
        setPendingTrx(res.data);
      }
    } catch (error) {
      console.error("Error fetching pending transactions:", error);
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

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="animate-spin text-slate-600" size={24} />
          <span className="text-slate-600 font-medium">Memuat transaksi pending...</span>
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
            <div className="w-1 h-6 bg-amber-500 rounded-full"></div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Transaksi Pending
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            <span className="font-semibold text-slate-700">{pendingTrx.length}</span> transaksi menunggu pembayaran
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

      {/* Pending Transactions */}
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <Clock size={18} className="text-slate-800" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Transaksi Pending ({pendingTrx.length})</h2>
          </div>

          {pendingTrx.length > 0 ? (
            <div className="space-y-3">
              {pendingTrx.map((trx) => (
                <div key={trx.id} className="bg-amber-50 border-3 border-slate-800 rounded-xl p-4 shadow-[4px_4px_0px_#1e293b]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-slate-800">{trx.userEmail}</p>
                      <p className="text-xs font-mono text-slate-500">{trx.depositId}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 border-2 border-slate-800 rounded-lg text-xs font-bold text-slate-800">
                      <Clock size={12} /> PENDING
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500 text-xs">Nominal</p>
                      <p className="font-bold text-slate-800">{formatCurrency(trx.amount)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Total</p>
                      <p className="font-bold text-slate-800">{formatCurrency(trx.total)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 text-xs">Dibuat</p>
                      <p className="font-bold text-slate-800">{formatDate(trx.createdAt)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              <CheckCircle2 size={48} className="mx-auto mb-3 text-teal-500" />
              <p className="font-bold">Tidak ada transaksi pending</p>
              <p className="text-sm">Semua transaksi sudah diproses</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
