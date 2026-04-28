// components/Features.tsx
"use client";
import { Zap, Shield, Clock, Globe, Smartphone, Cpu, Terminal, Package, BadgeDollarSign, Star, Quote } from "lucide-react";

export default function Features() {
  const features = [
    {
      icon: Zap,
      title: "Instant OTP",
      desc: "Dapatkan OTP dalam hitungan detik dengan kecepatan maksimal",
    },
    {
      icon: Shield,
      title: "Aman & Terpercaya",
      desc: "Nomor baru setiap transaksi untuk keamanan maksimal",
    },
    {
      icon: Clock,
      title: "Real-time Notifications",
      desc: "Notifikasi instan langsung ke dashboard Anda",
    },
    {
      icon: Globe,
      title: "85+ Negara",
      desc: "Jangkauan global untuk semua kebutuhan verifikasi",
    },
    {
      icon: Package,
      title: "Stok Banyak",
      desc: "Menerima dari berbagai layanan SMS. Kami menyediakan layanan Berbagai Server jika salah satu stok habis.",
    },
    {
      icon: BadgeDollarSign,
      title: "Harga Termurah",
      desc: "Harga yang kami sediakan sangat murah dan berkualitas. Cocok banget buat dompetmu.",
    },
    {
      icon: Cpu,
      title: "99.9% Uptime",
      desc: "Infrastruktur enterprise dengan reliabilitas tinggi",
    },
  ];

  const testimonials = [
    {
      name: "Rizky Pratama",
      role: "Reseller OTP",
      rating: 5,
      text: "Udah langganan 2 tahun, stok selalu ready dan harga paling murah dibanding kompetitor. Recommended banget!",
    },
    {
      name: "Dewi Sartika",
      role: "Online Shop Owner",
      rating: 5,
      text: "OTP nya cepet banget masuk, ga pernah gagal. Customer service juga fast response. Top dah!",
    },
    {
      name: "Ahmad Fauzi",
      role: "Developer",
      rating: 5,
      text: "API nya gampang diintegrasiin, dokumentasi lengkap. Cocok buat project automation gw.",
    },
    {
      name: "Siti Nurhaliza",
      role: "Digital Marketer",
      rating: 5,
      text: "Harga bersahabat, kualitas premium. Udah coba banyak provider, ini yang paling oke!",
    },
  ];

  return (
    <section id="fitur" className="relative overflow-hidden bg-gray-50 py-20 sm:py-28">
      {/* Retro Pattern Background */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>
      
      {/* Subtle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,_#d1d5db_1px,_transparent_1px),linear-gradient(90deg,_#d1d5db_1px,_transparent_1px)] bg-[length:40px_40px] opacity-10"></div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Terminal size={16} className="text-gray-400" />
            <span className="text-xs font-mono text-gray-500 tracking-wide">WHY CHOOSE US</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-4 tracking-tight">
            Mengapa Pilih OTP CEPAT?
          </h2>
          <div className="w-12 h-px bg-gray-300 mx-auto my-4"></div>
          <p className="text-base text-gray-500 leading-relaxed max-w-xl mx-auto">
            Kami menyediakan solusi OTP terpercaya dengan teknologi terdepan untuk keamanan akun Anda
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => {
            const IconComponent = f.icon;
            return (
              <div
                key={i}
                className="group bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-gray-200"
              >
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-5 group-hover:bg-gray-200 transition-colors duration-300">
                  <IconComponent size={20} className="text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Testimonials Section */}
        <div className="mt-24">
          <div className="text-center mb-12 max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Quote size={16} className="text-gray-400" />
              <span className="text-xs font-mono text-gray-500 tracking-wide">TESTIMONIALS</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-4 tracking-tight">
              Apa Kata Mereka?
            </h2>
            <div className="w-12 h-px bg-gray-300 mx-auto my-4"></div>
            <p className="text-base text-gray-500 leading-relaxed max-w-xl mx-auto">
              Ribuan pengguna sudah merasakan kemudahan layanan OTP CEPAT
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(t.rating)].map((_, idx) => (
                    <Star key={idx} size={14} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-4 italic">
                  &quot;{t.text}&quot;
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-600">
                      {t.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
