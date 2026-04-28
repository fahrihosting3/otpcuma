// components/SuccessPopup.tsx
"use client";
import { CheckCircle, X, Terminal } from "lucide-react";
import { useEffect } from "react";

interface SuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export default function SuccessPopup({ isOpen, onClose, title = "Berhasil!", message = "Akun Anda telah dibuat" }: SuccessPopupProps) {
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => onClose(), 2500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black/30 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 text-center animate-slide-up border border-gray-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <X size={16} className="text-gray-400" />
        </button>

        {/* Icon */}
        <div className="pt-10 pb-2">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
            <CheckCircle size={32} className="text-gray-600" />
          </div>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          <h3 className="text-xl font-semibold text-gray-800 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
        </div>

        {/* Retro Terminal Line */}
        <div className="border-t border-gray-100 px-8 py-4 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-center gap-2">
            <Terminal size={12} className="text-gray-400" />
            <span className="text-[10px] font-mono text-gray-400 tracking-wide">SYSTEM_NOTIFICATION</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}