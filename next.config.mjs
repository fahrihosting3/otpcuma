/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Batasi jumlah worker agar tidak kena limit nproc di shared hosting (EAGAIN).
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  typescript: {
    // cPanel kadang strict soal type-checking saat build di environment terbatas.
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
