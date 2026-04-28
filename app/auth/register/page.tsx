"use client";

import { useState, useRef, useEffect } from "react";
import { registerUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { User, Mail, Lock, ArrowRight, Eye, EyeOff, Loader2, Shield, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";

type Step = 'form' | 'otp' | 'complete';

export default function RegisterPage() {
  const [step, setStep] = useState<Step>('form');
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sendingOTP, setSendingOTP] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  // Countdown timer for resend OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  // Send OTP to email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password || !confirmPassword) {
      setError("Semua field harus diisi");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    setSendingOTP(true);
    setError("");

    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register' })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim OTP');
      }

      toast.success('Kode OTP telah dikirim ke email Anda');
      setStep('otp');
      setOtpCountdown(300); // 5 minutes
      
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);

    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setSendingOTP(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (otpCountdown > 0) return;

    setSendingOTP(true);
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'register' })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengirim OTP');
      }

      toast.success('Kode OTP baru telah dikirim');
      setOtpCountdown(300);
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSendingOTP(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    if (value && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle OTP paste
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otpCode];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtpCode(newOtp);

    const lastIndex = Math.min(pastedData.length - 1, 5);
    otpInputRefs.current[lastIndex]?.focus();
  };

  // Handle OTP backspace
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // Verify OTP and complete registration
  const handleVerifyOTP = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setError("Masukkan 6 digit kode OTP");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const verifyRes = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, type: 'register' })
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok) {
        throw new Error(verifyData.error || 'Kode OTP tidak valid');
      }

      await registerUser(email, password, name, "user");
      
      setStep('complete');
      toast.success('Registrasi berhasil!');

      setTimeout(() => {
        router.push("/auth/login");
      }, 2000);

    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <Navbar />
      
      <div className="min-h-[calc(100vh-80px)] relative overflow-hidden flex items-center justify-center py-12 px-4 bg-gradient-to-br from-gray-50 to-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{ 
            backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}></div>
        </div>
        
        <div className="absolute inset-0 bg-[linear-gradient(0deg,_#e5e7eb_1px,_transparent_1px),linear-gradient(90deg,_#e5e7eb_1px,_transparent_1px)] bg-[length:40px_40px] opacity-20"></div>

        <div className="relative z-10 max-w-md w-full">
          <div className="transform transition-all duration-700 animate-fade-in-up">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow duration-300 relative">
              
              {/* Step: Form */}
              {step === 'form' && (
                <>
                  <div className="text-center mb-8">
                    <h1 className="text-3xl font-light text-gray-900 mb-2 tracking-tight">
                      Buat Akun Baru
                    </h1>
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <div className="w-8 h-px bg-gray-300"></div>
                      <p className="text-gray-500 font-mono text-xs tracking-wider">
                        VERIFIKASI EMAIL
                      </p>
                      <div className="w-8 h-px bg-gray-300"></div>
                    </div>
                    <p className="text-gray-400 text-sm mt-3 font-light">
                      Masukkan email aktif untuk verifikasi OTP
                    </p>
                  </div>

                  {error && (
                    <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                      <p className="text-red-600 text-sm font-medium">{error}</p>
                    </div>
                  )}

                  <form onSubmit={handleSendOTP} className="space-y-5">
                    {/* Name Field */}
                    <div className="group">
                      <label className="block text-gray-600 text-xs font-mono mb-2 tracking-wide">
                        NAMA LENGKAP
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" size={16} />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-300"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>

                    {/* Email Field */}
                    <div className="group">
                      <label className="block text-gray-600 text-xs font-mono mb-2 tracking-wide">
                        EMAIL AKTIF
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" size={16} />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-300"
                          placeholder="email@example.com"
                        />
                      </div>
                    </div>

                    {/* Password Field */}
                    <div className="group">
                      <label className="block text-gray-600 text-xs font-mono mb-2 tracking-wide">
                        PASSWORD
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" size={16} />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-300"
                          placeholder="Min. 6 karakter"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="group">
                      <label className="block text-gray-600 text-xs font-mono mb-2 tracking-wide">
                        KONFIRMASI PASSWORD
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-gray-600 transition-colors" size={16} />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          className="w-full pl-9 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 font-mono text-sm placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:bg-white transition-all duration-300"
                          placeholder="Ulangi password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={sendingOTP}
                      className="relative w-full py-2.5 bg-gray-900 text-white rounded-lg font-mono text-sm tracking-wide hover:bg-gray-800 transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group mt-2"
                    >
                      <span className="flex items-center justify-center gap-2">
                        {sendingOTP ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            MENGIRIM OTP...
                          </>
                        ) : (
                          <>
                            KIRIM KODE OTP
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

                  {/* Login Link */}
                  <div className="text-center">
                    <p className="text-gray-500 text-xs mb-3 font-mono">
                      SUDAH PUNYA AKUN?
                    </p>
                    <Link
                      href="/auth/login"
                      className="inline-flex items-center gap-2 text-gray-600 font-mono text-sm border border-gray-300 px-6 py-2.5 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-300"
                    >
                      MASUK KE AKUN ANDA
                    </Link>
                  </div>
                </>
              )}

              {/* Step: OTP Verification */}
              {step === 'otp' && (
                <>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield size={32} className="text-gray-700" />
                    </div>
                    <h1 className="text-2xl font-light text-gray-900 mb-2">Verifikasi Email</h1>
                    <p className="text-gray-500 text-sm">
                      Masukkan 6 digit kode yang dikirim ke
                    </p>
                    <p className="text-gray-900 font-mono text-sm mt-1">{email}</p>
                  </div>

                  {error && (
                    <div className="mb-6 p-3 bg-red-50 border-l-4 border-red-400 rounded">
                      <p className="text-red-600 text-sm font-medium">{error}</p>
                    </div>
                  )}

                  {/* OTP Inputs */}
                  <div className="flex justify-center gap-2 mb-6" onPaste={handleOtpPaste}>
                    {otpCode.map((digit, index) => (
                      <input
                        key={index}
                        ref={(el) => { otpInputRefs.current[index] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        className="w-11 h-13 bg-gray-50 border-2 border-gray-200 rounded-lg text-center text-xl font-mono font-bold text-gray-900 focus:outline-none focus:border-gray-900 transition-all"
                      />
                    ))}
                  </div>

                  {/* Countdown */}
                  <div className="text-center mb-6">
                    {otpCountdown > 0 ? (
                      <p className="text-gray-500 text-sm font-mono">
                        Kode expired dalam <span className="text-gray-900 font-bold">{formatCountdown(otpCountdown)}</span>
                      </p>
                    ) : (
                      <p className="text-amber-600 text-sm font-mono">Kode OTP sudah expired</p>
                    )}
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={handleVerifyOTP}
                    disabled={loading || otpCode.join('').length !== 6}
                    className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-mono text-sm hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-4"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        MEMVERIFIKASI...
                      </>
                    ) : (
                      <>
                        VERIFIKASI
                        <CheckCircle2 size={16} />
                      </>
                    )}
                  </button>

                  {/* Resend OTP */}
                  <div className="text-center">
                    <button
                      onClick={handleResendOTP}
                      disabled={sendingOTP || otpCountdown > 0}
                      className="text-sm text-gray-500 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-mono"
                    >
                      {sendingOTP ? 'MENGIRIM...' : 'KIRIM ULANG KODE'}
                    </button>
                  </div>

                  {/* Back Button */}
                  <button
                    onClick={() => {
                      setStep('form');
                      setOtpCode(['', '', '', '', '', '']);
                      setError('');
                    }}
                    className="w-full mt-4 text-gray-500 hover:text-gray-900 text-sm transition-colors font-mono"
                  >
                    ← KEMBALI
                  </button>
                </>
              )}

              {/* Step: Complete */}
              {step === 'complete' && (
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} className="text-emerald-600" />
                  </div>
                  <h1 className="text-2xl font-light text-gray-900 mb-2">Registrasi Berhasil!</h1>
                  <p className="text-gray-500 text-sm mb-6">
                    Akun Anda telah berhasil dibuat. Silakan login untuk melanjutkan.
                  </p>
                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm font-mono">MENGALIHKAN...</span>
                  </div>
                </div>
              )}

              {/* Decorative corners */}
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
