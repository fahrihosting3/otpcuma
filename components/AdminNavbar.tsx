"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  BarChart3, 
  Users, 
  Receipt, 
  Clock, 
  LogOut, 
  RefreshCw, 
  Shield, 
  Wrench,
  Bell,
  Settings,
} from "lucide-react";
import { logoutUser } from "@/lib/auth";

interface AdminNavbarProps {
  onRefresh?: () => void;
  refreshing?: boolean;
}

export default function AdminNavbar({ onRefresh, refreshing = false }: AdminNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logoutUser();
    router.push("/");
  };

  const navItems = [
    { href: "/admin", label: "Overview", icon: BarChart3 },
    { href: "/admin/users", label: "Users", icon: Users },
    { href: "/admin/transactions", label: "Transaksi", icon: Receipt },
    { href: "/admin/pending", label: "Pending", icon: Clock },
    { href: "/admin/maintenance", label: "Maintenance", icon: Wrench },
    { href: "/admin/notifications", label: "Notifikasi", icon: Bell },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b-4 border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-rose-500 border-2 border-slate-600 rounded-lg flex items-center justify-center">
              <Shield size={18} className="text-white" />
            </div>
            <div className="hidden sm:block">
              <p className="text-white font-black text-sm tracking-tight leading-none">ADMIN</p>
              <p className="text-slate-400 text-[10px] font-mono tracking-wider">PANEL</p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 py-2 font-bold text-xs sm:text-sm transition-all whitespace-nowrap rounded-lg ${
                  isActive(item.href)
                    ? "bg-white text-slate-900"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <item.icon size={16} className="shrink-0" />
                <span className="hidden md:inline">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-white font-bold text-sm transition-all rounded-lg"
                title="Refresh Data"
              >
                <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 font-bold text-sm transition-all rounded-lg"
              title="Keluar"
            >
              <LogOut size={16} />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
