// lib/telegram.ts
// Telegram Notification Helper

interface TelegramNotification {
  orderId: string;
  userEmail: string;
  otpCode: string;
  phoneNumber: string;
  originalPrice: number;
  sellingPrice: number;
  profit: number;
  otpMessage?: string;
  serviceName?: string;
  countryName?: string;
}

// Mask email for privacy
function maskEmail(email: string): string {
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;
  const visible = name.slice(0, 3);
  const masked = "*".repeat(Math.max(name.length - 3, 3));
  return `${visible}${masked}@${domain.slice(0, 3)}`;
}

// Mask phone number for privacy
function maskPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, "");
  if (cleaned.length < 8) return phone;
  const prefix = cleaned.slice(0, 3);
  const suffix = cleaned.slice(-3);
  const masked = "*".repeat(cleaned.length - 6);
  return `${prefix}${masked}${suffix}`;
}

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 0,
  }).format(value);
}

export async function sendOTPNotificationToTelegram(
  data: TelegramNotification,
  botToken: string,
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!botToken || !channelId) {
      console.log("[Telegram] Bot token or channel ID not configured");
      return { success: false, error: "Telegram not configured" };
    }

    const {
      orderId,
      userEmail,
      otpCode,
      phoneNumber,
      originalPrice,
      sellingPrice,
      profit,
      otpMessage,
      serviceName,
      countryName,
    } = data;

    // Build the notification message
    const message = `🔐 *CODE RECEIVED 2.0*

• *ID:* \`${orderId}\`
• *Users:* ${maskEmail(userEmail)}
• *Code:* \`${otpCode}\`
• *Number:* ${maskPhone(phoneNumber)}
• *Price:* ${formatCurrency(sellingPrice)} IDR

${otpMessage ? `───────────────────\n📩 *Full Message:*\n\`\`\`\n${otpMessage}\n\`\`\`` : ""}

───────────────────
📊 *Profit Info:*
• Original: ${formatCurrency(originalPrice)} IDR
• Selling: ${formatCurrency(sellingPrice)} IDR
• *Profit: +${formatCurrency(profit)} IDR*

🌍 *${serviceName || "Service"}* - _${countryName || "Indonesia"}_`;

    // Send to Telegram
    const telegramRes = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: channelId,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    const telegramData = await telegramRes.json();

    if (telegramData.ok) {
      console.log("[Telegram] OTP notification sent successfully");
      return { success: true };
    } else {
      console.error("[Telegram] API error:", telegramData);
      return { success: false, error: telegramData.description || "Telegram error" };
    }
  } catch (error: any) {
    console.error("[Telegram] Error sending notification:", error);
    return { success: false, error: error.message };
  }
}

// Store settings in memory (will be populated from API)
let cachedSettings: {
  botToken: string;
  channelId: string;
  enabled: boolean;
  orderMarkup: number;
} | null = null;

export function setCachedTelegramSettings(settings: {
  botToken: string;
  channelId: string;
  enabled: boolean;
  orderMarkup: number;
}) {
  cachedSettings = settings;
}

export function getCachedTelegramSettings() {
  return cachedSettings;
}
