"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import {
  getAdminSettings,
  updateAdminSettings,
  type AdminSettings,
} from "@/lib/externalDB";
import {
  Terminal,
  Settings,
  Send,
  DollarSign,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  TestTube,
  Loader2,
  Hash,
  Wallet,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

export default function AdminSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);

  const [settings, setSettings] = useState<AdminSettings>({
    telegram: {
      botToken: "",
      channelId: "",
      enabled: false,
    },
    fees: {
      depositFee: 500,
      orderMarkup: 1000,
    },
    updatedAt: "",
    updatedBy: "",
  });

  useEffect(() => {
    const current = getCurrentUser();
    setUser(current);
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await getAdminSettings();
      if (res.success && res.data) {
        setSettings(res.data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateAdminSettings({
        ...settings,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.email || "",
      });

      if (res.success) {
        toast.success("Pengaturan berhasil disimpan!");
      } else {
        toast.error(res.error || "Gagal menyimpan pengaturan");
      }
    } catch (error) {
      toast.error("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!settings.telegram.botToken || !settings.telegram.channelId) {
      toast.error("Token dan Channel ID harus diisi terlebih dahulu");
      return;
    }

    setTesting(true);
    try {
      const testMessage = `🔐 *TEST NOTIFICATION*

• ID: TEST001
• Users: test@example.com
• Code: 123456
• Number: +6281234567890
• Price: Rp 6.200

_Test dari Admin Panel_

✅ Konfigurasi Telegram berhasil!`;

      const res = await fetch(
        `https://api.telegram.org/bot${settings.telegram.botToken}/sendMessage`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chat_id: settings.telegram.channelId,
            text: testMessage,
            parse_mode: "Markdown",
          }),
        }
      );

      const data = await res.json();

      if (data.ok) {
        toast.success("Test notifikasi berhasil dikirim ke Telegram!");
      } else {
        toast.error(`Gagal: ${data.description || "Unknown error"}`);
      }
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-slate-600" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Terminal size={14} className="text-slate-400" />
            <span className="text-[10px] font-mono text-slate-400 tracking-wider">
              ADMIN PANEL
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-violet-500 rounded-full"></div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Pengaturan
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-3">
            Konfigurasi Telegram, Fee Deposit, dan Markup Harga
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm font-bold"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          REFRESH
        </button>
      </div>

      <div className="space-y-6">
        {/* Telegram Settings */}
        <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[6px_6px_0px_#1e293b] overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-sky-100 border-b-4 border-slate-800">
            <div className="w-10 h-10 bg-sky-500 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <Send size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-800">Telegram Notification</h2>
              <p className="text-xs text-slate-600">
                Kirim notifikasi OTP ke channel Telegram
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-800 rounded-xl">
              <div>
                <p className="font-bold text-slate-800">Aktifkan Notifikasi</p>
                <p className="text-xs text-slate-500">
                  Kirim notifikasi ke Telegram saat OTP diterima
                </p>
              </div>
              <button
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    telegram: {
                      ...prev.telegram,
                      enabled: !prev.telegram.enabled,
                    },
                  }))
                }
                className={`w-14 h-8 rounded-full border-3 border-slate-800 transition-colors relative ${
                  settings.telegram.enabled ? "bg-teal-500" : "bg-slate-300"
                }`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 bg-white border-2 border-slate-800 rounded-full transition-all ${
                    settings.telegram.enabled ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>

            {/* Bot Token */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 tracking-wide">
                BOT TOKEN
              </label>
              <div className="relative">
                <input
                  type={showToken ? "text" : "password"}
                  value={settings.telegram.botToken}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      telegram: { ...prev.telegram, botToken: e.target.value },
                    }))
                  }
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  className="w-full px-4 py-3 bg-white border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] focus:shadow-[4px_4px_0px_#1e293b] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all outline-none font-mono text-sm text-slate-800 placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                >
                  {showToken ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Dapatkan dari @BotFather di Telegram
              </p>
            </div>

            {/* Channel ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 tracking-wide">
                CHANNEL ID
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Hash size={16} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  value={settings.telegram.channelId}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      telegram: { ...prev.telegram, channelId: e.target.value },
                    }))
                  }
                  placeholder="-1001234567890"
                  className="w-full pl-10 pr-4 py-3 bg-white border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] focus:shadow-[4px_4px_0px_#1e293b] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all outline-none font-mono text-sm text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ID channel/grup (mulai dengan -100 untuk channel)
              </p>
            </div>

            {/* Test Button */}
            <button
              onClick={handleTestTelegram}
              disabled={testing || !settings.telegram.botToken || !settings.telegram.channelId}
              className="flex items-center gap-2 px-4 py-2 bg-sky-500 text-white border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] hover:shadow-[4px_4px_0px_#1e293b] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <TestTube size={14} />
              )}
              TEST KIRIM NOTIFIKASI
            </button>
          </div>
        </div>

        {/* Fee Settings */}
        <div className="bg-white border-4 border-slate-800 rounded-2xl shadow-[6px_6px_0px_#1e293b] overflow-hidden">
          <div className="flex items-center gap-3 p-4 bg-emerald-100 border-b-4 border-slate-800">
            <div className="w-10 h-10 bg-emerald-500 border-2 border-slate-800 rounded-xl flex items-center justify-center">
              <DollarSign size={18} className="text-white" />
            </div>
            <div>
              <h2 className="font-black text-slate-800">Fee & Markup</h2>
              <p className="text-xs text-slate-600">
                Pengaturan fee deposit dan markup harga order
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Deposit Fee */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 tracking-wide">
                FEE DEPOSIT
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <Wallet size={16} className="text-slate-400" />
                </div>
                <input
                  type="number"
                  value={settings.fees.depositFee}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      fees: { ...prev.fees, depositFee: Number(e.target.value) },
                    }))
                  }
                  placeholder="500"
                  className="w-full pl-10 pr-4 py-3 bg-white border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] focus:shadow-[4px_4px_0px_#1e293b] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all outline-none font-mono text-sm text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Fee tetap untuk setiap deposit (dalam IDR). Contoh: {formatCurrency(settings.fees.depositFee)}
              </p>
            </div>

            {/* Order Markup */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 tracking-wide">
                MARKUP HARGA ORDER (NOKOS)
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2">
                  <TrendingUp size={16} className="text-slate-400" />
                </div>
                <input
                  type="number"
                  value={settings.fees.orderMarkup}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      fees: { ...prev.fees, orderMarkup: Number(e.target.value) },
                    }))
                  }
                  placeholder="1000"
                  className="w-full pl-10 pr-4 py-3 bg-white border-3 border-slate-800 rounded-xl shadow-[3px_3px_0px_#1e293b] focus:shadow-[4px_4px_0px_#1e293b] focus:translate-x-[-1px] focus:translate-y-[-1px] transition-all outline-none font-mono text-sm text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Markup harga untuk setiap order nomor (dalam IDR). Contoh: {formatCurrency(settings.fees.orderMarkup)}
              </p>
            </div>

            {/* Preview Calculation */}
            <div className="bg-slate-100 border-2 border-slate-800 rounded-xl p-4">
              <p className="text-[10px] font-mono text-slate-500 tracking-wider mb-3">
                PREVIEW PERHITUNGAN KEUNTUNGAN
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Harga asli nomor:</span>
                  <span className="font-bold text-slate-800">{formatCurrency(5200)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">+ Markup:</span>
                  <span className="font-bold text-emerald-600">
                    +{formatCurrency(settings.fees.orderMarkup)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t-2 border-slate-300">
                  <span className="font-bold text-slate-800">Harga jual ke user:</span>
                  <span className="font-black text-slate-800">
                    {formatCurrency(5200 + settings.fees.orderMarkup)}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-600">
                  <span className="font-bold">Keuntungan per order:</span>
                  <span className="font-black">{formatCurrency(settings.fees.orderMarkup)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border-4 border-slate-800 rounded-2xl shadow-[6px_6px_0px_#1e293b] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-800 mb-1">Format Notifikasi Telegram</p>
              <p className="text-sm text-slate-600 mb-2">
                Notifikasi akan dikirim dengan format berikut saat OTP diterima:
              </p>
              <div className="bg-slate-800 text-slate-100 p-3 font-mono text-xs rounded-xl">
                <p>CODE RECEIVED 2.0</p>
                <p className="mt-2">- ID: RO0007131966</p>
                <p>- Users: dia*********sha</p>
                <p>- Code: 242535</p>
                <p>- Number: +62***********022</p>
                <p>- Price: 6.200 IDR</p>
                <p className="mt-2 text-slate-400">[Pesan OTP lengkap]</p>
                <p className="mt-2 text-emerald-400">WhatsApp - Indonesia</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-teal-500 text-white border-4 border-slate-800 rounded-xl shadow-[4px_4px_0px_#1e293b] hover:shadow-[6px_6px_0px_#1e293b] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all font-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Save size={18} />
            )}
            SIMPAN PENGATURAN
          </button>
        </div>

        {/* Last Updated */}
        {settings.updatedAt && (
          <div className="text-center text-xs text-slate-500">
            Terakhir diperbarui:{" "}
            {new Date(settings.updatedAt).toLocaleString("id-ID")}
            {settings.updatedBy && ` oleh ${settings.updatedBy}`}
          </div>
        )}
      </div>
    </div>
  );
}
