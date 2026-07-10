import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@smart-gym/shared', '@smart-gym/supabase'],
};

export default nextConfig;
