// components/SidebarMenu.tsx
"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getCurrentUser, logoutUser, refreshUserData } from "@/lib/auth";
import { useMaintenanceContext } from "@/components/MaintenanceOverlay";
import {
  X,
  Home,
  CreditCard,
  Users,
  History,
  BookOpen,
  User,
  Flame,
  Play,
  FileText,
  LogOut,
  Sun,
  Moon,
  Power,
  Wrench,
  Shield,
  Settings,
  Bell,
  BarChart3,
  Clock,
  Gift,
} from "lucide-react";

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SidebarMenu({ isOpen, onClose }: SidebarMenuProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { isMaintenanceActive, showMaintenancePopup, isAdmin } = useMaintenanceContext();

  useEffect(() => {
    if (isOpen) {
      const currentUser = getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        setUserBalance(currentUser.balance || 0);
        fetchBalance();
      }
    }
  }, [isOpen]);

  const fetchBalance = async () => {
    try {
      const updatedUser = await refreshUserData();
      if (updatedUser) {
        setUserBalance(updatedUser.balance || 0);
        setUser(updatedUser);
      }
    } catch (err) {
      console.error("Gagal mengambil saldo:", err);
    }
  };

  const handleProtectedClick = (href: string) => {
    if (isMaintenanceActive && !isAdmin) {
      showMaintenancePopup();
      return;
    }
    onClose();
    router.push(href);
  };

  const handleLogout = () => {
    logoutUser();
    setUser(null);
    onClose();
    router.push("/");
  };

  const menuItems = [
    {
      label: "Beranda",
      href: "/dashboard",
      icon: Home,
      protected: true,
    },
    {
      label: "Top Up Saldo",
      href: "/deposit",
      icon: CreditCard,
      protected: true,
    },
    {
      label: "Referral",
      href: "/referral",
      icon: Users,
      protected: true,
      badge: "Bonus",
    },
    {
      label: "Riwayat",
      href: "/history",
      icon: History,
      protected: true,
    },
    {
      label: "Informasi Terbaru",
      href: "/info",
      icon: BookOpen,
      protected: false,
    },
    {
      label: "Akun",
      href: "/account",
      icon: User,
      protected: true,
    },
    {
      label: "API",
      href: "/api-docs",
      icon: Flame,
      protected: true,
    },
    {
      label: "Tutorial",
      href: "/tutorial",
      icon: Play,
      protected: false,
    },
    {
      label: "Ketentuan Layanan",
      href: "/terms",
      icon: FileText,
      protected: false,
    },
  ];

  // Admin menu items
  const adminMenuItems = [
    {
      label: "Dashboard Admin",
      href: "/admin",
      icon: Shield,
    },
    {
      label: "Kelola User",
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Transaksi",
      href: "/admin/transactions",
      icon: BarChart3,
    },
    {
      label: "Pending Deposit",
      href: "/admin/pending",
      icon: Clock,
    },
    {
      label: "Notifikasi",
      href: "/admin/notifications",
      icon: Bell,
    },
    {
      label: "Maintenance",
      href: "/admin/maintenance",
      icon: Wrench,
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  const isActiveRoute = (href: string) => {
    return pathname === href;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] transition-opacity"
        onClick={onClose}
      />

      {/* Sidebar - Neo Brutalism */}
      <div className="fixed top-0 left-0 h-full w-72 bg-slate-900 z-[101] shadow-[8px_0px_0px_#000] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Logo Section */}
        <div className="pt-8 pb-6 px-6 flex flex-col items-center">
          <div className="w-24 h-24 mb-4 relative">
            {/* Planet/Chat bubble logo representation */}
            <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 border-4 border-cyan-300 flex items-center justify-center relative">
              <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-slate-900 rounded-full absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
              </div>
              {/* Orbit rings */}
              <div className="absolute inset-[-8px] border-2 border-dashed border-cyan-400/50 rounded-full"></div>
              <div className="absolute inset-[-16px] border border-dashed border-cyan-400/30 rounded-full"></div>
            </div>
          </div>
          <h1 className="text-2xl font-black text-cyan-400 tracking-wider">OTPCEPAT</h1>
        </div>

        {/* Theme Toggle & Power */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <Sun size={16} className="text-slate-500" />
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-12 h-6 rounded-full relative transition-colors ${
              isDarkMode ? "bg-cyan-500" : "bg-slate-700"
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                isDarkMode ? "left-7" : "left-1"
              }`}
            />
          </button>
          <Moon size={16} className="text-slate-500" />
          <button className="ml-auto p-2 text-slate-500 hover:text-white transition-colors">
            <Power size={18} />
          </button>
        </div>

        {/* Menu Items */}
        <div className="px-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);
            const isProtected = item.protected && isMaintenanceActive && !isAdmin;

            return (
              <button
                key={item.href}
                onClick={() => {
                  if (item.protected) {
                    handleProtectedClick(item.href);
                  } else {
                    onClose();
                    router.push(item.href);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-left transition-all ${
                  isActive
                    ? "bg-cyan-500 text-white shadow-[4px_4px_0px_#0e7490]"
                    : isProtected
                    ? "text-slate-600 cursor-not-allowed"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
                disabled={isProtected}
              >
                {isProtected && <Wrench size={12} className="text-orange-400 absolute -ml-1" />}
                <Icon size={18} className={isActive ? "text-white" : ""} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className="ml-auto px-2 py-0.5 bg-amber-400 text-black text-xs font-bold rounded flex items-center gap-1">
                    {item.badge} <Gift size={12} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Admin Section - ONLY visible for admin users */}
        {user && user.role === "admin" && (
          <>
            <div className="px-6 py-4">
              <div className="border-t border-slate-700" />
            </div>
            <div className="px-4 pb-2">
              <p className="px-4 text-[10px] font-bold text-rose-400 tracking-widest uppercase mb-2">
                Admin Panel
              </p>
              <div className="space-y-1">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = isActiveRoute(item.href);

                  return (
                    <button
                      key={item.href}
                      onClick={() => {
                        onClose();
                        router.push(item.href);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-left transition-all ${
                        isActive
                          ? "bg-rose-500 text-white shadow-[4px_4px_0px_#be123c]"
                          : "text-slate-400 hover:text-white hover:bg-slate-800"
                      }`}
                    >
                      <Icon size={18} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Logout Button */}
        <div className="px-4 py-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-xl font-medium transition-all"
          >
            <LogOut size={18} />
            <span>Keluar</span>
          </button>
        </div>

        {/* User Info Footer */}
        {user && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-400 rounded-lg border-2 border-black flex items-center justify-center text-black text-sm font-black">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <div className="mt-3 px-3 py-2 bg-emerald-400/20 border border-emerald-400/30 rounded-lg">
              <p className="text-[10px] text-emerald-400/70 font-medium">SALDO</p>
              <p className="text-emerald-400 font-black">Rp {userBalance.toLocaleString("id-ID")}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
