// components/Footer.tsx
"use client";
import Link from "next/link";
import { Mail, MapPin, Phone, Github, Twitter, Globe } from "lucide-react";

export default function Footer() {
  return (
    <footer className="relative bg-gray-900 border-t border-gray-800 overflow-hidden">
      {/* Retro Pattern Background - Dark */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{ 
          backgroundImage: `radial-gradient(circle at 2px 2px, #fff 1px, transparent 1px)`,
          backgroundSize: '32px 32px'
        }}></div>
      </div>
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Main Footer Content - Layout lebih compact */}
        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-8">
          
          {/* Brand Section - Kiri */}
          <div className="lg:w-1/3 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-white/10 border border-gray-700 flex items-center justify-center">
                <img
                  src="https://www.image2url.com/r2/default/images/1776678648961-161ba711-db24-4803-af80-980db5b38c93.jpg"
                  alt="OTP CEPAT Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-semibold text-lg text-white tracking-tight">OTP CEPAT</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Platform nomor virtual OTP tercepat dan termurah di Indonesia.
            </p>
            <div className="flex gap-3 pt-2">
              <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">
                <Github size={15} />
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">
                <Twitter size={15} />
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors">
                <Globe size={15} />
              </a>
            </div>
          </div>

          {/* Menu & Layanan - Kanan (2 columns) */}
          <div className="lg:w-2/3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              {/* Menu */}
              <div>
                <h3 className="text-gray-500 text-xs font-mono tracking-wider mb-3">MENU</h3>
                <ul className="space-y-1.5">
                  <li>
                    <Link href="/" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Beranda
                    </Link>
                  </li>
                  <li>
                    <Link href="/#fitur" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Fitur
                    </Link>
                  </li>
                  <li>
                    <Link href="/auth/register" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Daftar
                    </Link>
                  </li>
                  <li>
                    <Link href="/auth/login" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Masuk
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Layanan */}
              <div>
                <h3 className="text-gray-500 text-xs font-mono tracking-wider mb-3">LAYANAN</h3>
                <ul className="space-y-1.5">
                  <li>
                    <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      WhatsApp
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Telegram
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      Instagram
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors text-sm">
                      TikTok
                    </a>
                  </li>
                </ul>
              </div>

              {/* Kontak */}
              <div>
                <h3 className="text-gray-500 text-xs font-mono tracking-wider mb-3">KONTAK</h3>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <Mail size={11} className="text-gray-500 flex-shrink-0" />
                    <a href="otpcepet@gmail.com" className="text-gray-500 hover:text-gray-300 transition-colors text-xs">
                      otpcepet@gmail.com
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone size={11} className="text-gray-500 flex-shrink-0" />
                    <a href="tel:+6285713279720" className="text-gray-500 hover:text-gray-300 transition-colors text-xs">
                      +62 857-1327-9720
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin size={11} className="text-gray-500 flex-shrink-0" />
                    <span className="text-gray-500 text-xs">
                      Jawa Tengah, Indonesia
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gray-800 my-5"></div>

        {/* Bottom Footer */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-500 text-xs">
            © 2026 OTP CEPAT. All rights reserved.
          </p>
          <div className="flex gap-4">
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors text-xs">
              Privacy
            </a>
            <span className="text-gray-700 text-xs">•</span>
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors text-xs">
              Terms
            </a>
            <span className="text-gray-700 text-xs">•</span>
            <a href="#" className="text-gray-500 hover:text-gray-300 transition-colors text-xs">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
