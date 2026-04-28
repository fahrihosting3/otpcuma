import { NextRequest, NextResponse } from "next/server";

interface TelegramNotifyRequest {
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
  botToken: string;
  channelId: string;
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

export async function POST(request: NextRequest) {
  try {
    const body: TelegramNotifyRequest = await request.json();

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
      botToken,
      channelId,
    } = body;

    if (!botToken || !channelId) {
      return NextResponse.json(
        { success: false, error: "Bot token and channel ID required" },
        { status: 400 }
      );
    }

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
      return NextResponse.json({ success: true });
    } else {
      console.error("Telegram API error:", telegramData);
      return NextResponse.json(
        { success: false, error: telegramData.description || "Telegram error" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Error sending Telegram notification:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
