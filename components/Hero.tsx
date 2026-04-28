// components/Hero.tsx
"use client";
import { ArrowRight, Zap, Lock, Rocket, Phone, Cpu } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Hero() {
  const router = useRouter();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50 py-20 sm:py-28">
      {/* Retro Pattern Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>
      
      {/* Subtle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,_#d1d5db_1px,_transparent_1px),linear-gradient(90deg,_#d1d5db_1px,_transparent_1px)] bg-[length:40px_40px] opacity-10"></div>

      {/* Subtle animated circles - gray tones */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-gray-400 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse"></div>
        <div className="absolute -bottom-32 left-20 w-72 h-72 bg-gray-500 rounded-full mix-blend-multiply filter blur-3xl opacity-5 animate-pulse animation-delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge - Retro Style */}
          <div className="inline-flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-full mb-8 shadow-sm">
            <Cpu size={14} className="text-gray-500" />
            <span className="text-xs font-mono text-gray-600 tracking-wide">OTP INSTANT • COMPETITIVE PRICE</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-gray-900 leading-tight mb-6">
            Nomor Virtual OTP
            <br />
            <span className="font-semibold text-gray-800">Tercepat & Termurah</span>
          </h1>

          {/* Subheading */}
          <p className="text-base sm:text-lg text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            Akses ribuan nomor virtual untuk WhatsApp, Telegram, Instagram, TikTok, Shopee dan lebih dari 100 platform lainnya. OTP diterima dalam hitungan detik.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => router.push("/auth/register")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all duration-300 group shadow-sm"
            >
              Daftar
              <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <button
              onClick={() => router.push("/auth/login")}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-gray-700 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all duration-300"
            >
              <Phone size={16} />
              Login
            </button>
          </div>

          {/* Stats Grid - Retro Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Rocket size={18} className="text-gray-600" />
                </div>
                <div className="text-2xl font-semibold text-gray-900">1.2M+</div>
              </div>
              <div className="text-xs text-gray-500 font-mono tracking-wide">SALDO AKTIF</div>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Zap size={18} className="text-gray-600" />
                </div>
                <div className="text-2xl font-semibold text-gray-900">487K</div>
              </div>
              <div className="text-xs text-gray-500 font-mono tracking-wide">NOMOR TERJUAL</div>
            </div>
            
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Lock size={18} className="text-gray-600" />
                </div>
                <div className="text-2xl font-semibold text-gray-900">4.9s</div>
              </div>
              <div className="text-xs text-gray-500 font-mono tracking-wide">RATA-RATA OTP</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.1; }
        }
        
        .animate-pulse {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
      `}</style>
    </section>
  );
}
