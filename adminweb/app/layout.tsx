import type { Metadata } from 'next';

import { ConfigProvider } from '@/lib/config';

import './globals.css';

export const metadata: Metadata = {
  title: 'Sényi — Back-office',
  description: 'Supervision des collectes, du tri et de la valorisation des déchets à Conakry.',
};

/**
 * Pose la classe `dark` avant le premier rendu : sans ce script, la page
 * s'affiche en clair puis bascule, ce qui produit un flash blanc au chargement.
 * A defaut de choix enregistre, on suit la preference du systeme.
 */
const SCRIPT_THEME = `
try {
  var choix = localStorage.getItem('cleanguinea.admin.theme');
  var sombre = choix
    ? choix === 'sombre'
    : window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (sombre) document.documentElement.classList.add('dark');
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body className="font-sans">
        <ConfigProvider>{children}</ConfigProvider>
      </body>
    </html>
  );
}
