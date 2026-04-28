import { NextRequest, NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/otp';

export async function POST(req: NextRequest) {
  try {
    const { email, code, type } = await req.json();

    if (!email || !code || !type) {
      return NextResponse.json(
        { success: false, error: 'Email, code, dan type diperlukan' },
        { status: 400 }
      );
    }

    if (!['register', 'forgot-password'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type tidak valid' },
        { status: 400 }
      );
    }

    const result = verifyOTP(email, code, type);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully'
    });

  } catch (error: any) {
    console.error('Error in verify OTP:', error);
    return NextResponse.json(
      { success: false, error: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}
