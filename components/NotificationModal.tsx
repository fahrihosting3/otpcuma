"use client";

import { useState, useEffect } from "react";
import { 
  Lightbulb, 
  X, 
  RefreshCw, 
  BookOpen, 
  Shield, 
  CheckCircle2,
  AlertTriangle,
  Check
} from "lucide-react";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type TabType = "refund" | "ketentuan" | "tutorial";

export default function NotificationModal({ isOpen, onClose, onComplete }: NotificationModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("refund");
  const [hasReadAll, setHasReadAll] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab("refund");
      setHasReadAll(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "refund", label: "Refund", icon: <RefreshCw size={16} /> },
    { id: "ketentuan", label: "Ketentuan", icon: <BookOpen size={16} /> },
    { id: "tutorial", label: "Tutorial", icon: <Lightbulb size={16} /> },
  ];

  const handleComplete = () => {
    if (hasReadAll) {
      onComplete();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal - Smaller and more rounded */}
      <div className="relative w-full max-w-sm bg-[#0f172a] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Lightbulb size={16} className="text-sky-400" />
            <h2 className="text-white font-semibold text-base">Tutorial dan Informasi</h2>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-full border border-slate-600">
            <AlertTriangle size={12} className="text-amber-400" />
            <span className="text-[10px] font-medium text-slate-300">Penting!</span>
          </div>
        </div>

        {/* Description */}
        <div className="px-4 py-3 border-b border-slate-700">
          <p className="text-slate-300 text-xs leading-relaxed">
            Pahami segala informasi yang telah kami berikan serta perhatikan segala syarat dan ketentuan yang berlaku pada website termasuk segala resiko yang anda alami jika akan membeli nomor virtual.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "text-sky-400 border-b-2 border-sky-400 bg-slate-800/50"
                  : "text-slate-400 hover:text-slate-300"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-4 max-h-[240px] overflow-y-auto">
          {activeTab === "refund" && <RefundContent />}
          {activeTab === "ketentuan" && <KetentuanContent />}
          {activeTab === "tutorial" && <TutorialContent />}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700 bg-slate-800/30">
          {/* Checkbox */}
          <label className="flex items-center gap-2.5 mb-3 cursor-pointer group">
            <div 
              onClick={() => setHasReadAll(!hasReadAll)}
              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                hasReadAll 
                  ? "bg-sky-500 border-sky-500" 
                  : "border-slate-500 group-hover:border-slate-400"
              }`}
            >
              {hasReadAll && <Check size={10} className="text-white" />}
            </div>
            <span className="text-slate-300 text-xs">Saya telah membaca semuanya</span>
          </label>

          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-3 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-xl transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handleComplete}
              disabled={!hasReadAll}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                hasReadAll
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              Selesai
              <CheckCircle2 size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RefundContent() {
  return (
    <div className="space-y-3">
      {/* Refund Otomatis Card */}
      <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 size={16} className="text-slate-400" />
          <h3 className="text-white font-semibold text-sm">Refund Otomatis</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 size={10} className="text-emerald-400" />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Pesanan belum pernah menerima SMS ataupun code verifikasi sebelumnya.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 size={10} className="text-emerald-400" />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Status orderan bukan resend yang telah menerima SMS ataupun code verifikasi.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <CheckCircle2 size={10} className="text-emerald-400" />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Saldo dikembalikan 100% sesuai dengan nominal pembelian nomor tanpa potongan sedikitpun.
            </p>
          </div>
        </div>
      </div>

      {/* Refund Admin Card */}
      <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-slate-400" />
          <h3 className="text-white font-semibold text-sm">Refund Admin</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={10} className="text-amber-400" />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Jika terjadi kendala dan membutuhkan refund manual, hubungi admin dengan menyertakan bukti screenshot.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle size={10} className="text-amber-400" />
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Refund admin hanya berlaku untuk kasus-kasus tertentu yang tidak dapat diproses otomatis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function KetentuanContent() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={16} className="text-slate-400" />
          <h3 className="text-white font-semibold text-sm">Syarat dan Ketentuan</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sky-400 text-[10px] font-bold">1</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Nomor virtual hanya dapat digunakan satu kali untuk verifikasi OTP.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sky-400 text-[10px] font-bold">2</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Kami tidak bertanggung jawab atas penyalahgunaan layanan oleh pengguna.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sky-400 text-[10px] font-bold">3</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Saldo yang sudah di-deposit tidak dapat ditarik kembali.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sky-400 text-[10px] font-bold">4</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Harga layanan dapat berubah sewaktu-waktu tanpa pemberitahuan sebelumnya.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sky-400 text-[10px] font-bold">5</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Dengan menggunakan layanan ini, anda menyetujui semua syarat dan ketentuan yang berlaku.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TutorialContent() {
  return (
    <div className="space-y-3">
      <div className="bg-slate-800/50 rounded-2xl p-3 border border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-slate-400" />
          <h3 className="text-white font-semibold text-sm">Cara Menggunakan</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-emerald-400 text-[10px] font-bold">1</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Pilih layanan dan negara yang tersedia di halaman layanan.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-emerald-400 text-[10px] font-bold">2</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Klik tombol beli untuk mendapatkan nomor virtual.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-emerald-400 text-[10px] font-bold">3</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Gunakan nomor tersebut untuk verifikasi di aplikasi/website yang dituju.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-emerald-400 text-[10px] font-bold">4</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Tunggu SMS masuk pada halaman detail order. Kode OTP akan otomatis tampil.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-emerald-400 text-[10px] font-bold">5</span>
            </div>
            <p className="text-slate-400 text-xs leading-relaxed">
              Jika tidak menerima SMS dalam waktu yang ditentukan, saldo akan otomatis dikembalikan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
