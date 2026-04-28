// OTP Management System

interface OTPData {
  code: string;
  email: string;
  expiresAt: number;
  type: 'register' | 'forgot-password';
}

// In-memory storage for OTPs (in production, use Redis or database)
const otpStorage: Map<string, OTPData> = new Map();

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Store OTP with expiration (5 minutes)
export function storeOTP(email: string, code: string, type: 'register' | 'forgot-password'): void {
  const key = `${type}:${email.toLowerCase()}`;
  otpStorage.set(key, {
    code,
    email: email.toLowerCase(),
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    type
  });
}

// Verify OTP
export function verifyOTP(email: string, code: string, type: 'register' | 'forgot-password'): { valid: boolean; message: string } {
  const key = `${type}:${email.toLowerCase()}`;
  const otpData = otpStorage.get(key);

  if (!otpData) {
    return { valid: false, message: 'Kode OTP tidak ditemukan. Silakan minta kode baru.' };
  }

  if (Date.now() > otpData.expiresAt) {
    otpStorage.delete(key);
    return { valid: false, message: 'Kode OTP sudah expired. Silakan minta kode baru.' };
  }

  if (otpData.code !== code) {
    return { valid: false, message: 'Kode OTP salah. Silakan coba lagi.' };
  }

  // OTP valid, delete it
  otpStorage.delete(key);
  return { valid: true, message: 'OTP valid' };
}

// Check if OTP exists and not expired
export function hasValidOTP(email: string, type: 'register' | 'forgot-password'): boolean {
  const key = `${type}:${email.toLowerCase()}`;
  const otpData = otpStorage.get(key);
  
  if (!otpData) return false;
  if (Date.now() > otpData.expiresAt) {
    otpStorage.delete(key);
    return false;
  }
  
  return true;
}

// Send OTP via email API
export async function sendOTPEmail(
  toEmail: string, 
  otpCode: string, 
  type: 'register' | 'forgot-password'
): Promise<{ success: boolean; error?: string }> {
  const fromEmail = 'otpcepet@gmail.com';
  const fromPass = 'jokrnpldttftlddn';
  
  const subject = type === 'register' 
    ? 'Kode Verifikasi Registrasi - OTP CEPAT'
    : 'Reset Password - OTP CEPAT';
  
  const htmlContent = type === 'register' 
    ? `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">OTP CEPET</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Verifikasi Email</p>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">Halo!</p>
          <p style="color: #334155; font-size: 14px; margin: 0 0 20px 0;">Gunakan kode berikut untuk menyelesaikan registrasi akun Anda:</p>
          <div style="background: #0f172a; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <span style="color: #38bdf8; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otpCode}</span>
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 20px 0 0 0;">Kode ini akan expired dalam 5 menit. Jangan bagikan kode ini kepada siapapun.</p>
        </div>
      </div>
    `
    : `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">OTP CEPET</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Reset Password</p>
        </div>
        <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="color: #334155; font-size: 16px; margin: 0 0 20px 0;">Halo!</p>
          <p style="color: #334155; font-size: 14px; margin: 0 0 20px 0;">Kami menerima permintaan untuk reset password akun Anda. Gunakan kode berikut:</p>
          <div style="background: #0f172a; padding: 20px; border-radius: 12px; text-align: center; margin: 20px 0;">
            <span style="color: #fbbf24; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${otpCode}</span>
          </div>
          <p style="color: #64748b; font-size: 12px; margin: 20px 0 0 0;">Kode ini akan expired dalam 5 menit. Jika Anda tidak meminta reset password, abaikan email ini.</p>
        </div>
      </div>
    `;

  try {
    const url = new URL('https://otp-app-coral.vercel.app/api/send-email');
    url.searchParams.set('to', toEmail);
    url.searchParams.set('from_email', fromEmail);
    url.searchParams.set('from_pass', fromPass);
    url.searchParams.set('subject', subject);
    url.searchParams.set('html', htmlContent);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error sending OTP email:', error);
    return { success: false, error: error.message || 'Failed to send email' };
  }
}
