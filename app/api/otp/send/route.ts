import { NextRequest, NextResponse } from 'next/server';
import { generateOTP, storeOTP, sendOTPEmail, hasValidOTP } from '@/lib/otp';
import { getUserByEmail } from '@/lib/externalDB';

export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json();

    if (!email || !type) {
      return NextResponse.json(
        { success: false, error: 'Email dan type diperlukan' },
        { status: 400 }
      );
    }

    if (!['register', 'forgot-password'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type tidak valid' },
        { status: 400 }
      );
    }

    // For registration, check if email already exists
    if (type === 'register') {
      const result = await getUserByEmail(email);
      if (result.success && result.data) {
        return NextResponse.json(
          { success: false, error: 'Email sudah terdaftar' },
          { status: 400 }
        );
      }
    }

    // For forgot password, check if email exists
    if (type === 'forgot-password') {
      const result = await getUserByEmail(email);
      if (!result.success || !result.data) {
        return NextResponse.json(
          { success: false, error: 'Email tidak terdaftar' },
          { status: 400 }
        );
      }
    }

    // Check if OTP already sent and not expired (rate limiting)
    if (hasValidOTP(email, type)) {
      return NextResponse.json(
        { success: false, error: 'Kode OTP sudah dikirim. Tunggu 5 menit sebelum meminta kode baru.' },
        { status: 429 }
      );
    }

    // Generate and store OTP
    const otpCode = generateOTP();
    storeOTP(email, otpCode, type);

    // Send OTP via email
    const result = await sendOTPEmail(email, otpCode, type);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Gagal mengirim email. Silakan coba lagi.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Kode OTP telah dikirim ke email Anda'
    });

  } catch (error: any) {
    console.error('Error in send OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
