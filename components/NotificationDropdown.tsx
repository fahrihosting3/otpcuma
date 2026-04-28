"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, RefreshCw, BookOpen, Shield, CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import { getAllNotifications, markNotificationAsRead, type NotificationData } from "@/lib/externalDB";

interface NotificationDropdownProps {
  userEmail: string;
}

type TabType = "info" | "refund";

export default function NotificationDropdown({ userEmail }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await getAllNotifications();
      if (res.success && res.data) {
        setNotifications(res.data);
        // Count unread
        const unread = res.data.filter(n => !n.readBy?.includes(userEmail)).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [userEmail]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark notification as read when dropdown opens
  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && notifications.length > 0) {
      // Mark all as read
      for (const notif of notifications) {
        if (!notif.readBy?.includes(userEmail)) {
          await markNotificationAsRead(notif.id, userEmail);
        }
      }
      setUnreadCount(0);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success": return "bg-emerald-100 text-emerald-600 border-emerald-200";
      case "warning": return "bg-amber-100 text-amber-600 border-amber-200";
      case "error": return "bg-rose-100 text-rose-600 border-rose-200";
      default: return "bg-sky-100 text-sky-600 border-sky-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle2 size={12} />;
      case "warning": return <AlertTriangle size={12} />;
      case "error": return <AlertTriangle size={12} />;
      default: return <Bell size={12} />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleOpen}
        className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors duration-200"
        title="Notifikasi"
      >
        <Bell size={18} className="text-gray-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
        {/* Always show info badge when there's important info */}
        {unreadCount === 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white"></span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-600" />
              <span className="font-semibold text-gray-800 text-sm">Notifikasi</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X size={14} className="text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                activeTab === "info"
                  ? "text-gray-800 border-b-2 border-gray-800 bg-gray-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Bell size={12} />
              Pemberitahuan
            </button>
            <button
              onClick={() => setActiveTab("refund")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                activeTab === "refund"
                  ? "text-gray-800 border-b-2 border-gray-800 bg-gray-50"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <BookOpen size={12} />
              Info Penting
            </button>
          </div>

          {/* Content */}
          <div className="max-h-72 overflow-y-auto">
            {activeTab === "info" ? (
              <NotificationList
                notifications={notifications}
                loading={loading}
                getTypeColor={getTypeColor}
                getTypeIcon={getTypeIcon}
                onRefresh={fetchNotifications}
              />
            ) : (
              <ImportantInfoContent />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationList({ 
  notifications, 
  loading, 
  getTypeColor, 
  getTypeIcon,
  onRefresh 
}: { 
  notifications: NotificationData[];
  loading: boolean;
  getTypeColor: (type: string) => string;
  getTypeIcon: (type: string) => React.ReactNode;
  onRefresh: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw size={16} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Bell size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500 text-xs">Belum ada notifikasi</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {notifications.map((notif) => (
        <div key={notif.id} className="p-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-start gap-2.5">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 border ${getTypeColor(notif.type)}`}>
              {getTypeIcon(notif.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{notif.title}</p>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{notif.message}</p>
              <p className="text-[10px] text-gray-400 mt-1">
                {new Date(notif.createdAt).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ImportantInfoContent() {
  return (
    <div className="p-3 space-y-3">
      {/* Refund Info */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <RefreshCw size={12} className="text-emerald-500" />
          <span className="text-xs font-semibold text-gray-800">Refund Otomatis</span>
        </div>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <span className="text-[11px] text-gray-600">Pesanan belum menerima SMS/code verifikasi</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <span className="text-[11px] text-gray-600">Bukan resend yang sudah terima code</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 size={10} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            <span className="text-[11px] text-gray-600">Saldo 100% kembali tanpa potongan</span>
          </li>
        </ul>
      </div>

      {/* Terms */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen size={12} className="text-sky-500" />
          <span className="text-xs font-semibold text-gray-800">Ketentuan</span>
        </div>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-sky-500 mt-0.5 flex-shrink-0">1</span>
            <span className="text-[11px] text-gray-600">Nomor hanya untuk 1x verifikasi OTP</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-sky-500 mt-0.5 flex-shrink-0">2</span>
            <span className="text-[11px] text-gray-600">Saldo deposit tidak dapat ditarik</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-sky-500 mt-0.5 flex-shrink-0">3</span>
            <span className="text-[11px] text-gray-600">Harga dapat berubah sewaktu-waktu</span>
          </li>
        </ul>
      </div>

      {/* Tutorial */}
      <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb size={12} className="text-amber-500" />
          <span className="text-xs font-semibold text-gray-800">Cara Pakai</span>
        </div>
        <ul className="space-y-1.5">
          <li className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-amber-500 mt-0.5 flex-shrink-0">1</span>
            <span className="text-[11px] text-gray-600">Pilih layanan & negara di halaman Layanan</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-amber-500 mt-0.5 flex-shrink-0">2</span>
            <span className="text-[11px] text-gray-600">Klik beli untuk dapat nomor virtual</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-amber-500 mt-0.5 flex-shrink-0">3</span>
            <span className="text-[11px] text-gray-600">Gunakan nomor untuk verifikasi</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-amber-500 mt-0.5 flex-shrink-0">4</span>
            <span className="text-[11px] text-gray-600">Tunggu SMS di halaman detail order</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
