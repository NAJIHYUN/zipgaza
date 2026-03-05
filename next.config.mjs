/** @type {import('next').NextConfig} */
const repo = 'zipgaza'; // 예: 'kkumscore'

const nextConfig = {
  output: 'export',
  images: { unoptimized: true }, // next/image 쓰면 필요
  basePath: process.env.GITHUB_ACTIONS ? `/${repo}` : '',
  assetPrefix: process.env.GITHUB_ACTIONS ? `/${repo}/` : '',
};

export default nextConfig;
