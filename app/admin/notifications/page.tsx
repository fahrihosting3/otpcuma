"use client";

import { useState, useEffect } from "react";
import { Terminal, Send, Bell, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { sendGlobalNotification, getAllNotifications, deleteNotification, type NotificationData } from "@/lib/externalDB";
import { toast } from "sonner";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<"info" | "warning" | "success" | "error">("info");
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadNotifications = async () => {
    setLoading(true);
    const res = await getAllNotifications();
    if (res.success && res.data) {
      setNotifications(res.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Judul dan pesan tidak boleh kosong");
      return;
    }

    setSending(true);
    const res = await sendGlobalNotification(title, message, type);

    if (res.success) {
      toast.success("Notifikasi berhasil dikirim ke semua user!");
      setTitle("");
      setMessage("");
      loadNotifications();
    } else {
      toast.error("Gagal mengirim notifikasi");
    }
    setSending(false);
  };

  const handleDelete = async (id: string) => {
    if (deleteConfirm !== id) {
      setDeleteConfirm(id);
      return;
    }

    setDeletingId(id);
    try {
      const res = await deleteNotification(id);
      if (res.success) {
        setNotifications(notifications.filter(n => n.id !== id));
        toast.success("Notifikasi berhasil dihapus");
      } else {
        toast.error("Gagal menghapus notifikasi");
      }
    } catch (error) {
      toast.error("Gagal menghapus notifikasi");
    } finally {
      setDeletingId(null);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-1 h-8 bg-sky-500 rounded-full"></div>
        <div>
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-slate-400" />
            <span className="text-[10px] font-mono text-slate-400">ADMIN PANEL</span>
          </div>
          <h1 className="text-3xl font-black text-slate-800">Global Notification</h1>
        </div>
      </div>

      {/* Form Kirim Notifikasi */}
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b] p-6 sm:p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-sky-200 border-2 border-slate-800 rounded-xl flex items-center justify-center">
            <Bell size={18} className="text-slate-800" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black">Kirim Notifikasi</h2>
            <p className="text-slate-500 text-sm">Notifikasi akan muncul di dashboard semua user</p>
          </div>
        </div>

        <form onSubmit={handleSend} className="space-y-5">
          <div>
            <label className="block text-sm font-bold mb-2">Tipe Notifikasi</label>
            <div className="flex flex-wrap gap-2">
              {(["info", "success", "warning", "error"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-4 py-2 border-2 border-slate-800 rounded-lg font-bold text-sm capitalize transition-all ${
                    type === t 
                      ? "bg-sky-500 text-white shadow-[3px_3px_0px_#1e293b]" 
                      : "bg-white hover:bg-slate-100"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Judul Notifikasi</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Maintenance Besok"
              className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2">Isi Pesan</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Tulis pesan yang ingin disampaikan ke semua user..."
              className="w-full px-4 py-3 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-400 resize-y text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="flex items-center gap-3 px-6 py-3 bg-sky-500 text-white border-3 border-slate-800 rounded-xl shadow-[4px_4px_0px_#1e293b] hover:shadow-[6px_6px_0px_#1e293b] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all font-black text-base disabled:opacity-70"
          >
            {sending ? (
              <RefreshCw className="animate-spin" size={18} />
            ) : (
              <Send size={18} />
            )}
            KIRIM NOTIFIKASI
          </button>
        </form>
      </div>

      {/* Riwayat Notifikasi */}
      <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b] p-6 sm:p-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black">Riwayat Notifikasi</h3>
          <button 
            onClick={loadNotifications} 
            disabled={loading}
            className="text-sm flex items-center gap-2 px-3 py-1.5 border-2 border-slate-800 rounded-lg hover:bg-slate-100 transition-colors font-bold"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-center py-12 text-slate-500">Memuat riwayat...</p>
        ) : notifications.length === 0 ? (
          <p className="text-center py-12 text-slate-500">Belum ada notifikasi yang dikirim</p>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif) => (
              <div key={notif.id} className="border-2 border-slate-800 rounded-xl p-4 bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl border-2 border-slate-800 flex items-center justify-center flex-shrink-0
                    ${notif.type === 'success' ? 'bg-emerald-200' : ''}
                    ${notif.type === 'warning' ? 'bg-amber-200' : ''}
                    ${notif.type === 'error' ? 'bg-rose-200' : ''}
                    ${notif.type === 'info' ? 'bg-sky-200' : ''}`}>
                    <Bell size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-base truncate">{notif.title}</div>
                    <p className="text-slate-600 text-sm mt-1 line-clamp-2">{notif.message}</p>
                    <div className="text-xs text-slate-500 mt-2 font-mono">
                      {new Date(notif.createdAt).toLocaleString("id-ID")}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(notif.id)}
                    disabled={deletingId === notif.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border-2 border-slate-800 rounded-lg transition-all flex-shrink-0 ${
                      deleteConfirm === notif.id
                        ? "bg-rose-500 text-white shadow-[2px_2px_0px_#1e293b]"
                        : "bg-rose-100 text-rose-600 hover:bg-rose-200 shadow-[2px_2px_0px_#1e293b] hover:shadow-[3px_3px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px]"
                    }`}
                  >
                    {deletingId === notif.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Trash2 size={12} />
                    )}
                    {deleteConfirm === notif.id ? "HAPUS?" : "HAPUS"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
