"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMaintenanceStatus, isMaintenanceCurrentlyActive, getMaintenanceEndTime, type MaintenanceData } from "@/lib/externalDB";
import { getCurrentUser } from "@/lib/auth";
import { Wrench, Clock, X, AlertTriangle, RefreshCw, ShieldAlert } from "lucide-react";

// Create context for maintenance state
interface MaintenanceContextType {
  isMaintenanceActive: boolean;
  showMaintenancePopup: () => void;
  isAdmin: boolean;
}

const MaintenanceContext = createContext<MaintenanceContextType>({
  isMaintenanceActive: false,
  showMaintenancePopup: () => {},
  isAdmin: false,
});

export const useMaintenanceContext = () => useContext(MaintenanceContext);

interface MaintenanceOverlayProps {
  children: React.ReactNode;
}

export default function MaintenanceOverlay({ children }: MaintenanceOverlayProps) {
  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null);
  const [countdown, setCountdown] = useState<string>("");
  const [showWarning, setShowWarning] = useState(false);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showBlockedPopup, setShowBlockedPopup] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = getCurrentUser();
    setIsAdmin(user?.role === "admin");
  }, []);

  // Check maintenance status every second for real-time updates
  useEffect(() => {
    if (!mounted) return;

    const checkMaintenance = async () => {
      const data = await getMaintenanceStatus();
      setMaintenance(data);
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 1000);
    return () => clearInterval(interval);
  }, [mounted]);

  // Countdown timer and warning logic
  useEffect(() => {
    if (!maintenance?.isActive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const nowTime = now.getTime();

      // For recurring daily schedule
      if (maintenance.isRecurring && maintenance.dailyStartTime && maintenance.dailyEndTime) {
        const [startH, startM] = maintenance.dailyStartTime.split(":").map(Number);
        const [endH, endM] = maintenance.dailyEndTime.split(":").map(Number);
        
        // Check if it's an overnight schedule
        const isOvernight = endH < startH || (endH === startH && endM < startM);
        
        let todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startH, startM);
        let endTime: number;
        let startTime: number;
        let isInMaintenance = false;
        
        if (isOvernight) {
          // For overnight schedules, check both windows
          const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, startH, startM);
          const todayEndForYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM);
          const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, endH, endM);
          
          // Check if we're in yesterday's window (morning portion)
          if (nowTime >= yesterdayStart.getTime() && nowTime <= todayEndForYesterday.getTime()) {
            startTime = yesterdayStart.getTime();
            endTime = todayEndForYesterday.getTime();
            isInMaintenance = true;
          }
          // Check if we're in today's window (evening portion)
          else if (nowTime >= todayStart.getTime() && nowTime <= tomorrowEnd.getTime()) {
            startTime = todayStart.getTime();
            endTime = tomorrowEnd.getTime();
            isInMaintenance = true;
          }
          // Not in maintenance
          else {
            startTime = todayStart.getTime();
            endTime = tomorrowEnd.getTime();
            isInMaintenance = false;
          }
        } else {
          // Same-day schedule
          startTime = todayStart.getTime();
          endTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endH, endM).getTime();
          isInMaintenance = nowTime >= startTime && nowTime <= endTime;
        }
        
        // Check if we're within 10 minutes before maintenance starts
        const tenMinutesBefore = startTime - 10 * 60 * 1000;
        if (nowTime >= tenMinutesBefore && nowTime < startTime && !warningDismissed) {
          setShowWarning(true);
          const diffToStart = startTime - nowTime;
          const minutes = Math.floor(diffToStart / (1000 * 60));
          const seconds = Math.floor((diffToStart % (1000 * 60)) / 1000);
          setCountdown(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        } else if (isInMaintenance) {
          // During maintenance
          setShowWarning(false);
          const diff = endTime - nowTime;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        } else {
          // Outside maintenance window
          setShowWarning(false);
        }
        return;
      }

      // For one-time schedule
      if (!maintenance?.startTime || !maintenance?.endTime) return;

      const start = new Date(maintenance.startTime).getTime();
      const end = new Date(maintenance.endTime).getTime();

      // Check if we're within 10 minutes before maintenance starts
      const tenMinutesBefore = start - 10 * 60 * 1000;
      if (nowTime >= tenMinutesBefore && nowTime < start && !warningDismissed) {
        setShowWarning(true);
        const diffToStart = start - nowTime;
        const minutes = Math.floor(diffToStart / (1000 * 60));
        const seconds = Math.floor((diffToStart % (1000 * 60)) / 1000);
        setCountdown(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      } else if (nowTime >= start && nowTime <= end) {
        // During maintenance
        setShowWarning(false);
        const diff = end - nowTime;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
      } else if (nowTime > end) {
        // Maintenance ended
        setMaintenance(null);
        setShowWarning(false);
        setCountdown("");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [maintenance, warningDismissed]);

  const checkIsMaintenanceActive = useCallback(() => {
    return isMaintenanceCurrentlyActive(maintenance);
  }, [maintenance]);

  const maintenanceActive = checkIsMaintenanceActive();

  const showMaintenancePopup = useCallback(() => {
    if (maintenanceActive && !isAdmin) {
      setShowBlockedPopup(true);
    }
  }, [maintenanceActive, isAdmin]);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!mounted) return <>{children}</>;

  // Admin bypass - admins can still use the site
  if (isAdmin) {
    return (
      <MaintenanceContext.Provider value={{ isMaintenanceActive: maintenanceActive, showMaintenancePopup, isAdmin }}>
        {children}
        {maintenanceActive && (
          <div className="fixed bottom-4 right-4 z-50 bg-amber-400 border-2 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] px-4 py-2">
            <div className="flex items-center gap-2">
              <Wrench size={14} className="text-slate-800" />
              <span className="text-xs font-bold text-slate-800">ADMIN MODE - MAINTENANCE AKTIF</span>
            </div>
          </div>
        )}
      </MaintenanceContext.Provider>
    );
  }

  // Maintenance active - full screen lock
  if (maintenanceActive) {
    return (
      <MaintenanceContext.Provider value={{ isMaintenanceActive: maintenanceActive, showMaintenancePopup, isAdmin }}>
        <div className="fixed inset-0 z-[9999] bg-slate-900 flex items-center justify-center p-4">
          <div className="absolute inset-0 pointer-events-none opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 20px, #fff 20px, #fff 22px)`,
              }}
            />
          </div>

          <div className="relative w-full max-w-lg">
            {/* Main card */}
            <div className="bg-white border-4 border-slate-800 rounded-3xl shadow-[12px_12px_0px_#0f172a] p-8">
              {/* Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-20 h-20 bg-orange-300 border-4 border-slate-800 rounded-2xl flex items-center justify-center animate-pulse">
                  <Wrench size={40} className="text-slate-800" />
                </div>
              </div>

              <h1 className="text-3xl font-black text-slate-800 text-center mb-2 tracking-tight">
                MAINTENANCE
              </h1>
              <p className="text-center text-slate-600 mb-6">
                {maintenance?.reason || "Sistem sedang dalam perbaikan"}
              </p>

              {/* Countdown */}
              <div className="bg-slate-100 border-2 border-slate-800 rounded-2xl p-6 mb-6">
                <p className="text-[10px] font-mono text-slate-500 tracking-wider text-center mb-2">
                  SISA WAKTU MAINTENANCE
                </p>
                <div className="flex items-center justify-center gap-2">
                  <Clock size={24} className="text-orange-500" />
                  <span className="text-4xl font-black font-mono text-slate-800 tracking-widest">
                    {countdown || "00:00:00"}
                  </span>
                </div>
              </div>

              {/* Time info grid */}
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div className="text-center p-3 bg-teal-50 border-2 border-slate-800 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-500 mb-1">
                    {maintenance?.isRecurring ? "JAM MULAI" : "MULAI"}
                  </p>
                  <p className="font-bold text-slate-800 text-xs">
                    {maintenance?.isRecurring 
                      ? maintenance.dailyStartTime 
                      : (maintenance?.startTime ? formatDateTime(maintenance.startTime) : "-")}
                  </p>
                </div>
                <div className="text-center p-3 bg-rose-50 border-2 border-slate-800 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-500 mb-1">
                    {maintenance?.isRecurring ? "JAM SELESAI" : "SELESAI"}
                  </p>
                  <p className="font-bold text-slate-800 text-xs">
                    {maintenance?.isRecurring 
                      ? maintenance.dailyEndTime
                      : (maintenance?.endTime ? formatDateTime(maintenance.endTime) : "-")}
                  </p>
                </div>
              </div>
              
              {maintenance?.isRecurring && (
                <div className="bg-teal-100 border-2 border-slate-800 rounded-xl p-3 mb-6 text-center">
                  <p className="text-xs font-bold text-slate-800">Jadwal Harian Berulang</p>
                  <p className="text-[10px] text-slate-600">Maintenance aktif setiap hari pada jam yang sama</p>
                </div>
              )}

              {/* Refresh button */}
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-700 transition-colors"
              >
                <RefreshCw size={16} />
                REFRESH HALAMAN
              </button>
            </div>

            {/* Decorative corner accents */}
            <div className="absolute -top-4 -left-4 w-8 h-8 bg-orange-400 border-2 border-slate-800 rounded-lg" />
            <div className="absolute -bottom-4 -right-4 w-8 h-8 bg-teal-400 border-2 border-slate-800 rounded-lg" />
          </div>

          {/* Blocked popup */}
          {showBlockedPopup && (
            <div className="fixed inset-0 z-[10000] bg-black/70 flex items-center justify-center p-4">
              <div className="w-full max-w-sm bg-white border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b]">
                <div className="flex items-center justify-between p-4 bg-rose-400 border-b-2 border-slate-800 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={20} className="text-white" />
                    <span className="font-black text-white">FITUR DIBLOKIR</span>
                  </div>
                  <button
                    onClick={() => setShowBlockedPopup(false)}
                    className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <X size={16} className="text-slate-800" />
                  </button>
                </div>
                <div className="p-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-rose-100 border-2 border-slate-800 rounded-2xl flex items-center justify-center">
                      <Wrench size={32} className="text-rose-500" />
                    </div>
                  </div>
                  <h3 className="text-lg font-black text-slate-800 text-center mb-2">
                    Website Sedang Maintenance
                  </h3>
                  <p className="text-sm text-slate-600 text-center mb-4">
                    Fitur ini tidak dapat digunakan selama maintenance berlangsung.
                  </p>
                  <div className="bg-slate-100 border-2 border-slate-800 rounded-xl p-3 text-center mb-4">
                    <p className="text-[10px] font-mono text-slate-500 mb-1">SISA WAKTU</p>
                    <span className="text-xl font-black font-mono text-slate-800">{countdown || "00:00:00"}</span>
                  </div>
                  <button
                    onClick={() => setShowBlockedPopup(false)}
                    className="w-full px-4 py-3 bg-slate-800 text-white font-bold text-sm rounded-xl hover:bg-slate-700 transition-colors"
                  >
                    MENGERTI
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </MaintenanceContext.Provider>
    );
  }

  // Warning popup - 10 minutes before maintenance
  if (showWarning && !warningDismissed) {
    return (
      <MaintenanceContext.Provider value={{ isMaintenanceActive: maintenanceActive, showMaintenancePopup, isAdmin }}>
        {children}
        <div className="fixed inset-0 z-[9998] bg-black/50 flex items-start justify-center pt-20 p-4">
          <div className="w-full max-w-md bg-amber-50 border-4 border-slate-800 rounded-2xl shadow-[8px_8px_0px_#1e293b]">
            <div className="flex items-center justify-between p-4 bg-amber-300 border-b-2 border-slate-800 rounded-t-xl">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} className="text-slate-800" />
                <span className="font-black text-slate-800">PERINGATAN MAINTENANCE</span>
              </div>
              <button
                onClick={() => setWarningDismissed(true)}
                className="w-8 h-8 flex items-center justify-center bg-white border-2 border-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={16} className="text-slate-800" />
              </button>
            </div>

            <div className="p-6">
              <p className="text-center text-slate-700 mb-4">
                Website akan memasuki mode maintenance dalam:
              </p>
              
              <div className="flex items-center justify-center gap-2 mb-4">
                <Clock size={24} className="text-amber-600" />
                <span className="text-3xl font-black font-mono text-slate-800">
                  {countdown}
                </span>
              </div>

              <p className="text-sm text-center text-slate-600 mb-4">
                {maintenance?.reason || "Sistem akan diperbaiki"}
              </p>

              <button
                onClick={() => setWarningDismissed(true)}
                className="w-full px-4 py-2 bg-white border-2 border-slate-800 rounded-xl font-bold text-sm text-slate-800 hover:bg-slate-50 transition-colors"
              >
                MENGERTI
              </button>
            </div>
          </div>
        </div>
      </MaintenanceContext.Provider>
    );
  }

  return (
    <MaintenanceContext.Provider value={{ isMaintenanceActive: maintenanceActive, showMaintenancePopup, isAdmin }}>
      {children}
    </MaintenanceContext.Provider>
  );
}
