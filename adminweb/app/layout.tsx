import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Clean Guinée — Back-office',
  description: 'Supervision des collectes, du tri et de la valorisation des déchets à Conakry.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="font-sans">{children}</body>
    </html>
  );
}
