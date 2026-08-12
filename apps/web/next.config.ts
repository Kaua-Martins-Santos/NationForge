import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // O Next.js gera AGENTS.md/CLAUDE.md automaticamente a cada `next dev` com
  // instruções genéricas para agentes de IA. O nome colide com o CLAUDE.md do
  // projeto (na raiz, com as regras reais), então desativamos.
  agentRules: false,
};

export default nextConfig;
