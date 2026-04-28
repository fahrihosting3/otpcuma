// app/auth/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginUser, isAdmin } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import { Lock, Mail, ArrowRight, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = await loginUser(email, password);
      // Set flag to show welcome notification modal after login
      if (user.role !== "admin") {
        sessionStorage.setItem("show_welcome_modal", "true");
      }
      // Redirect based on role
      if (user.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login gagal. Periksa email dan password Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-[calc(100vh-80px)] relative overflow-hidden flex items-center justify-center py-12 px-4 bg-gradient-to-br from-gray-50 to-white">
        {/* Retro Pattern Background - Elegan */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        {/* Subtle Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(0deg,_#e5e7eb_1px,_transparent_1px),linear-gradient(90deg,_#e5e7eb_1px,_transparent_1px)] bg-[length:40px_40px] opacity-20"></div>

        {/* Content */}
        <div className="relative z-10 max-w-md w-full">
          {/* Retro Card - Clean & Elegant */}
          <div className="transform transition-all duration-700 animate-fade-in-up">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300">
              
              {/* Header dengan sentuhan retro */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 mx-auto mb-6 relative">
                  <div className="absolute inset-0 bg-gray-100 rounded-2xl rotate-6"></div>
                  <div className="relative w-16 h-16 bg-white border-2 border-gray-300 rounded-2xl flex items-center justify-center">
                    <LogIn className="w-7 h-7 text-gray-600" strokeWidth={1.5} />
                  </div>
                </div>
                
                <h1 className="text-3xl font-light text-gray-900 mb-2 tracking-tight">
                  Selamat Datang
                </h1>
                <div className="flex items-center justify-center gap-2 text-sm">
                  <div className="w-8 h-px bg-gray-300"></div>
                  <p className="text-gray-500 font-mono text-xs tracking-wider">
                    RETRO TERMINAL v1.0
                  </p>
                  <div className="w-8 h-px bg-gray-300"></div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                  <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Field */}
                <div className="group">
                  <label className="block text-gray-600 text-xs font-mono mb-2 tracking-wide">
                    USERNAME / EMAIL
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" size={16} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-300"
                      placeholder="hello@retro.com"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-gray-600 text-xs font-mono tracking-wide">
                      PASSWORD
                    </label>
                    <Link
                      href="/auth/forgot-password"
                      className="text-xs font-mono text-gray-500 hover:text-gray-900 transition-colors"
                    >
                      LUPA PASSWORD?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" size={16} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-300"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-2.5 bg-gray-900 text-white rounded-lg font-mono text-sm tracking-wide hover:bg-gray-800 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        PROCESSING...
                      </>
                    ) : (
                      <>
                        <span className="group-hover:translate-x-[-2px] transition-transform">→</span>
                        LOGIN
                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </span>
                </button>
              </form>

              {/* Divider */}
              <div className="my-8 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-400 font-mono">ATAU</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Register Link */}
              <div className="text-center">
                <p className="text-gray-500 text-xs mb-3 font-mono">
                  BELUM PUNYA AKUN?
                </p>
                <Link
                  href="/auth/register"
                  className="inline-flex items-center gap-2 text-gray-600 font-mono text-sm border border-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
                >
                  BUAT AKUN BARU
                </Link>
              </div>

              {/* Footer dengan gaya retro minimalis */}
              <div className="mt-8 pt-5 border-t border-gray-100">
                <div className="flex items-center justify-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                    <span className="text-gray-400 font-mono text-[10px] tracking-wider">
                      SYSTEM STATUS: ONLINE
                    </span>
                  </div>
                </div>
                <p className="text-center text-[10px] text-gray-400 font-mono mt-3 tracking-wide">
                  © 2024 RETRO TERMINAL — ALL RIGHTS RESERVED
                </p>
              </div>

              {/* Retro decorative elements - subtle */}
              <div className="absolute -top-2 -left-2 w-4 h-4 border-l border-t border-gray-200"></div>
              <div className="absolute -top-2 -right-2 w-4 h-4 border-r border-t border-gray-200"></div>
              <div className="absolute -bottom-2 -left-2 w-4 h-4 border-l border-b border-gray-200"></div>
              <div className="absolute -bottom-2 -right-2 w-4 h-4 border-r border-b border-gray-200"></div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </>
  );
}
