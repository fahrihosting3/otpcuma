"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getActiveOrders, type ActiveOrder } from "@/lib/orders";
import { MessageSquare, X, Phone, ExternalLink } from "lucide-react";
import Link from "next/link";

const API_KEY = process.env.NEXT_PUBLIC_RUMAHOTP_API_KEY || "";
const BASE_URL_V1 = "https://www.rumahotp.io/api/v1";

interface OTPNotification {
  id: string;
  orderId: string;
  otpCode: string;
  phoneNumber: string;
  service: string;
  country: string;
  expiredAt: number;
  price: number;
  createdAt: number;
  timestamp: number;
}

export default function OTPNotificationToast() {
  const [notifications, setNotifications] = useState<OTPNotification[]>([]);
  const [activeOrders, setActiveOrders] = useState<ActiveOrder[]>([]);
  const lastOtpCodes = useRef<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const notifiedOrders = useRef<Set<string>>(new Set());

  // Initialize audio
  useEffect(() => {
    // Create audio element with a notification sound
    audioRef.current = new Audio();
    // Use a base64 encoded notification sound (short beep)
    audioRef.current.src = "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleOOEj3aJmpugj3lsaGRnbHKAk6WoloNvYF5nc4yeqZ2JdGRaXGmAlKmrnI9/bmFbYW+En6+rnYpzX1ZYZn6XraycjHpmX2JsfoySn5qQhXprZmludn+IkJSSiYB2bmpscHd+hImKh4J8d3RycHN2eXx+fn5+fHp5eHd3d3d4eXp6enp5eHd3d3d4eXp6enp5eHd3d3d3eHl6enp5eHd3d3d3eHl6enp5eHh4eHh4eHl5eXl5eHh4eHh4eHl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXh4eHh5eXl5eXh4eHh5eXl5eXh4eHh5eXl5eXh4eHl5eXl5eXh4eHl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5eXl5";
    audioRef.current.volume = 0.5;
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Play notification sound
  const playSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay might be blocked, ignore
      });
    }
  }, []);

  // Check for OTP updates
  const checkOTPStatus = useCallback(async () => {
    const user = getCurrentUser();
    if (!user) return;

    const orders = getActiveOrders(user.email);
    setActiveOrders(orders);

    for (const order of orders) {
      try {
        const response = await fetch(
          `${BASE_URL_V1}/orders/get_status?order_id=${order.orderId}`,
          {
            method: "GET",
            headers: {
              "x-apikey": API_KEY,
              Accept: "application/json",
            },
          }
        );

        const data = await response.json();

        if (data.success && data.data?.otp_code) {
          const otpCode = data.data.otp_code;
          const previousOtp = lastOtpCodes.current[order.orderId];
          
          // Check if this is a new OTP and we haven't shown notification for this order
          if (otpCode !== previousOtp && !notifiedOrders.current.has(order.orderId)) {
            lastOtpCodes.current[order.orderId] = otpCode;
            notifiedOrders.current.add(order.orderId);

            // Create notification with all order params
            const newNotification: OTPNotification = {
              id: `${order.orderId}-${Date.now()}`,
              orderId: order.orderId,
              otpCode,
              phoneNumber: order.phoneNumber,
              service: order.service,
              country: order.country,
              expiredAt: order.expiredAt,
              price: order.price,
              createdAt: order.createdAt,
              timestamp: Date.now(),
            };

            setNotifications((prev) => [...prev, newNotification]);
            playSound();

            // Auto-remove notification after 10 seconds
            setTimeout(() => {
              setNotifications((prev) =>
                prev.filter((n) => n.id !== newNotification.id)
              );
            }, 10000);
          }
        }
      } catch (err) {
        // Silently fail
      }
    }
  }, [playSound]);

  // Poll for OTP status
  useEffect(() => {
    checkOTPStatus();
    const interval = setInterval(checkOTPStatus, 5000);
    return () => clearInterval(interval);
  }, [checkOTPStatus]);

  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto bg-white border-2 border-slate-800 shadow-[4px_4px_0px_#1e293b] rounded-xl p-4 animate-slide-in-right"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center flex-shrink-0 border-2 border-slate-800">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-bold text-teal-600 uppercase tracking-wide">
                  OTP Masuk!
                </span>
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="p-1 hover:bg-slate-100 rounded"
                >
                  <X size={14} className="text-slate-400" />
                </button>
              </div>
              <p className="text-lg font-black text-slate-800 font-mono tracking-wider mb-1">
                {notification.otpCode}
              </p>
              <div className="flex items-center gap-1 text-xs text-slate-500 mb-2">
                <Phone size={12} />
                <span className="truncate">{notification.phoneNumber}</span>
                <span className="text-slate-300 mx-1">|</span>
                <span className="truncate">{notification.service}</span>
              </div>
              <Link
                href={`/order/active?order_id=${notification.orderId}&phone_number=${encodeURIComponent(notification.phoneNumber)}&service=${encodeURIComponent(notification.service)}&country=${encodeURIComponent(notification.country)}&expired_at=${notification.expiredAt}&price=${notification.price}&created_at=${notification.createdAt}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-teal-600 hover:text-teal-700"
              >
                Lihat Detail
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      ))}

      <style jsx>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slideInRight 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
