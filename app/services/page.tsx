"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { getMaintenanceStatus, isMaintenanceCurrentlyActive, getMaintenanceEndTime } from "@/lib/externalDB";
import Navbar from "@/components/Navbar";
import BuyNumber from "@/components/BuyNumber";
import { Wrench, Clock, RefreshCw } from "lucide-react";

export default function ServicesPage() {
  const [user, setUser] = useState<any>(null);
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(false);
  const [maintenanceCountdown, setMaintenanceCountdown] = useState("");
  const router = useRouter();

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.push("/auth/login");
      return;
    }
    setUser(current);
  }, [router]);

  // Check maintenance status (supports both one-time and recurring daily schedules)
  useEffect(() => {
    const checkMaintenance = async () => {
      const maintenance = await getMaintenanceStatus();
      const user = getCurrentUser();
      
      // Use helper function that supports both one-time and recurring schedules
      if (isMaintenanceCurrentlyActive(maintenance) && user?.role !== "admin") {
        setIsMaintenanceActive(true);
        
        // Calculate countdown
        const endTime = getMaintenanceEndTime(maintenance);
        if (endTime) {
          const now = new Date().getTime();
          const diff = endTime - now;
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          setMaintenanceCountdown(`${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
        }
      } else {
        setIsMaintenanceActive(false);
      }
    };

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!user) {
    return null;
  }

  // Show maintenance block
  if (isMaintenanceActive) {
    return (
      <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh] p-4">
          <div className="w-full max-w-md bg-white border-4 border-slate-800 shadow-[8px_8px_0px_#1e293b] p-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 bg-orange-300 border-4 border-slate-800 flex items-center justify-center animate-pulse">
                <Wrench size={32} className="text-slate-800" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-800 text-center mb-2">
              LAYANAN TIDAK TERSEDIA
            </h1>
            <p className="text-center text-slate-600 mb-6">
              Website sedang dalam maintenance. Fitur layanan tidak dapat digunakan saat ini.
            </p>
            <div className="bg-slate-100 border-2 border-slate-800 p-4 mb-6">
              <p className="text-[10px] font-mono text-slate-500 tracking-wider text-center mb-2">
                SISA WAKTU MAINTENANCE
              </p>
              <div className="flex items-center justify-center gap-2">
                <Clock size={20} className="text-orange-500" />
                <span className="text-2xl font-black font-mono text-slate-800 tracking-widest">
                  {maintenanceCountdown || "00:00:00"}
                </span>
              </div>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold text-sm hover:bg-slate-700 transition-colors"
            >
              <RefreshCw size={16} />
              REFRESH HALAMAN
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gray-50">
      <Navbar />
      <div className="w-full">
        <BuyNumber />
      </div>
    </div>
  );
}
