"use client";

import { useEffect, useState } from "react";
import { getAllUsers, deleteUser, updateUserBalance, getAllOrdersWithProfit, type UserData, type OrderWithProfit } from "@/lib/externalDB";
import { Users, Terminal, RefreshCw, AlertCircle, Trash2, Loader2, Plus, Minus, X, Trophy, ShoppingCart, Search } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [orders, setOrders] = useState<OrderWithProfit[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingEmail, setDeletingEmail] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // Balance modal state
  const [balanceModal, setBalanceModal] = useState<{
    open: boolean;
    type: "add" | "subtract";
    user: UserData | null;
  }>({ open: false, type: "add", user: null });
  const [balanceAmount, setBalanceAmount] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [usersRes, ordersRes] = await Promise.all([
        getAllUsers(),
        getAllOrdersWithProfit()
      ]);
      
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (ordersRes.success && ordersRes.data) {
        setOrders(ordersRes.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
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

  const handleDeleteUser = async (email: string) => {
    if (deleteConfirm !== email) {
      setDeleteConfirm(email);
      return;
    }
    
    setDeletingEmail(email);
    try {
      const res = await deleteUser(email);
      if (res.success) {
        setUsers(users.filter(u => u.email !== email));
      }
    } catch (error) {
      console.error("Error deleting user:", error);
    } finally {
      setDeletingEmail(null);
      setDeleteConfirm(null);
    }
  };

  const openBalanceModal = (user: UserData, type: "add" | "subtract") => {
    setBalanceModal({ open: true, type, user });
    setBalanceAmount("");
  };

  const closeBalanceModal = () => {
    setBalanceModal({ open: false, type: "add", user: null });
    setBalanceAmount("");
  };

  const handleBalanceUpdate = async () => {
    if (!balanceModal.user || !balanceAmount) return;
    
    const amount = parseInt(balanceAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    const finalAmount = balanceModal.type === "add" ? amount : -amount;
    
    setBalanceLoading(true);
    try {
      const res = await updateUserBalance(balanceModal.user.email, finalAmount);
      if (res.success) {
        // Update local state
        setUsers(users.map(u => 
          u.email === balanceModal.user!.email 
            ? { ...u, balance: (u.balance || 0) + finalAmount }
            : u
        ));
        closeBalanceModal();
      }
    } catch (error) {
      console.error("Error updating balance:", error);
    } finally {
      setBalanceLoading(false);
    }
  };

  // Calculate top orders by user
  const getTopOrderUsers = () => {
    const successOrders = orders.filter(o => o.status === "success");
    const userOrderTotals: { [email: string]: { total: number; count: number; username: string } } = {};
    
    successOrders.forEach(order => {
      const email = order.userEmail;
      if (!userOrderTotals[email]) {
        const user = users.find(u => u.email === email);
        userOrderTotals[email] = { total: 0, count: 0, username: user?.username || email };
      }
      userOrderTotals[email].total += order.price || 0;
      userOrderTotals[email].count += 1;
    });

    return Object.entries(userOrderTotals)
      .map(([email, data]) => ({ email, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const topOrderUsers = getTopOrderUsers();

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <RefreshCw className="animate-spin text-slate-600" size={24} />
          <span className="text-slate-600 font-medium">Memuat data users...</span>
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
            <div className="w-1 h-6 bg-sky-500 rounded-full"></div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Data Users
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            Total <span className="font-semibold text-slate-700">{users.length}</span> user terdaftar
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

      {/* Top Order Section */}
      {topOrderUsers.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-4 border-slate-800 rounded-2xl shadow-[6px_6px_0px_#1e293b] p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-300 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <Trophy size={18} className="text-slate-800" />
            </div>
            <h2 className="text-xl font-black text-slate-800">Top Order Users</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {topOrderUsers.map((user, idx) => (
              <div key={user.email} className="bg-white border-3 border-slate-800 rounded-xl p-4 shadow-[3px_3px_0px_#1e293b]">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm ${
                    idx === 0 ? "bg-amber-500" : idx === 1 ? "bg-slate-400" : idx === 2 ? "bg-amber-700" : "bg-slate-600"
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-800 text-sm truncate">{user.username}</p>
                    <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t-2 border-slate-200">
                  <div className="flex items-center gap-1">
                    <ShoppingCart size={12} className="text-slate-500" />
                    <span className="text-xs text-slate-500">{user.count}x</span>
                  </div>
                  <p className="font-black text-emerald-600 text-sm">{formatCurrency(user.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b] overflow-hidden">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-sky-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
                <Users size={18} className="text-slate-800" />
              </div>
              <h2 className="text-xl font-black text-slate-800">
                Daftar User ({filteredUsers.length}{searchQuery && ` / ${users.length}`})
              </h2>
            </div>
            
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari email atau username..."
                className="w-full pl-10 pr-10 py-2.5 border-3 border-slate-800 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 text-left text-xs font-bold tracking-wider">USERNAME</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">EMAIL</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">ROLE</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">SALDO</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">TERDAFTAR</th>
                  <th className="p-3 text-left text-xs font-bold tracking-wider">AKSI</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, idx) => (
                  <tr key={u.email} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="p-3 font-bold text-sm text-slate-800">{u.username}</td>
                    <td className="p-3 text-sm text-slate-600">{u.email}</td>
                    <td className="p-3">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-bold border-2 border-slate-800 rounded-lg ${
                        u.role === "admin" ? "bg-rose-100" : "bg-sky-100"
                      }`}>
                        {u.role?.toUpperCase() || "USER"}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-sm text-slate-800">{formatCurrency(u.balance || 0)}</td>
                    <td className="p-3 text-sm text-slate-600">{formatDate(u.createdAt)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Add Balance Button */}
                        <button
                          onClick={() => openBalanceModal(u, "add")}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 border-2 border-slate-800 rounded-lg shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                        >
                          <Plus size={12} />
                          ADD
                        </button>
                        
                        {/* Subtract Balance Button */}
                        <button
                          onClick={() => openBalanceModal(u, "subtract")}
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-bold bg-amber-100 text-amber-700 border-2 border-slate-800 rounded-lg shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                        >
                          <Minus size={12} />
                          KURANG
                        </button>
                        
                        {/* Delete Button */}
                        {u.role !== "admin" && (
                          <button
                            onClick={() => handleDeleteUser(u.email)}
                            disabled={deletingEmail === u.email}
                            className={`flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold border-2 border-slate-800 rounded-lg transition-all ${
                              deleteConfirm === u.email
                                ? "bg-rose-500 text-white shadow-[2px_2px_0px_#1e293b]"
                                : "bg-rose-100 text-rose-600 hover:bg-rose-200 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                            }`}
                          >
                            {deletingEmail === u.email ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                            {deleteConfirm === u.email ? "YAKIN?" : "HAPUS"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                <AlertCircle size={48} className="mx-auto mb-3 opacity-50" />
                {searchQuery ? (
                  <div>
                    <p className="font-medium">Tidak ditemukan user dengan "{searchQuery}"</p>
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="mt-2 text-sky-600 hover:text-sky-700 text-sm font-medium"
                    >
                      Hapus pencarian
                    </button>
                  </div>
                ) : (
                  <p>Belum ada user terdaftar</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Balance Modal */}
      {balanceModal.open && balanceModal.user && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b] w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-black text-slate-800">
                  {balanceModal.type === "add" ? "Tambah Saldo" : "Kurangi Saldo"}
                </h3>
                <button
                  onClick={closeBalanceModal}
                  className="w-8 h-8 flex items-center justify-center bg-slate-100 border-2 border-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="mb-4 p-3 bg-slate-50 border-2 border-slate-200 rounded-xl">
                <p className="text-sm text-slate-600">User:</p>
                <p className="font-bold text-slate-800">{balanceModal.user.username}</p>
                <p className="text-xs text-slate-500">{balanceModal.user.email}</p>
                <p className="text-sm text-slate-600 mt-2">Saldo saat ini:</p>
                <p className="font-black text-lg text-slate-800">{formatCurrency(balanceModal.user.balance || 0)}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Jumlah (IDR)
                </label>
                <input
                  type="number"
                  value={balanceAmount}
                  onChange={(e) => setBalanceAmount(e.target.value)}
                  placeholder="Masukkan jumlah..."
                  className="w-full px-4 py-3 border-3 border-slate-800 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeBalanceModal}
                  className="flex-1 px-4 py-3 bg-slate-100 text-slate-700 font-bold border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                >
                  BATAL
                </button>
                <button
                  onClick={handleBalanceUpdate}
                  disabled={balanceLoading || !balanceAmount}
                  className={`flex-1 px-4 py-3 font-bold border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    balanceModal.type === "add" 
                      ? "bg-emerald-500 text-white" 
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {balanceLoading ? (
                    <Loader2 size={18} className="animate-spin mx-auto" />
                  ) : (
                    balanceModal.type === "add" ? "TAMBAH" : "KURANGI"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
