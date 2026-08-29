'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Bell, ChevronDown, LogOut, Recycle } from 'lucide-react';

import { api, effacerJeton, lireJeton } from '@/lib/api';

const NAVIGATION = [
  { libelle: 'Tableau de bord', href: '/tableau-de-bord' },
  { libelle: 'Clients', href: '/clients' },
  { libelle: 'Abonnements', href: '/abonnements' },
  { libelle: 'Collectes', href: '/collectes' },
  { libelle: 'Collecteurs', href: '/collecteurs' },
  { libelle: 'Déchets', href: '/dechets' },
  { libelle: 'Stock & Tri', href: '/stock' },
  { libelle: 'Ventes', href: '/ventes' },
  { libelle: 'Finance', href: '/finance' },
  { libelle: 'Rapports', href: '/rapports' },
  { libelle: 'Paramètres', href: '/parametres' },
];

type Moi = { utilisateur: { nom: string; role: string } };

/** En-tête et navigation communs à toutes les pages du back-office. */
export function Coquille({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const [moi, setMoi] = useState<Moi | null>(null);
  const [verifie, setVerifie] = useState(false);

  useEffect(() => {
    if (!lireJeton()) {
      router.replace('/connexion');
      return;
    }
    api<Moi>('/api/auth/moi')
      .then((rep) => {
        // Le back-office est réservé à l'encadrement.
        if (!['ADMIN', 'SUPERVISEUR'].includes(rep.utilisateur.role)) {
          effacerJeton();
          router.replace('/connexion');
          return;
        }
        setMoi(rep);
        setVerifie(true);
      })
      .catch(() => router.replace('/connexion'));
  }, [router]);

  if (!verifie) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-gray-500">
        Vérification de la session…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-6 px-6 py-3">
          <Link href="/tableau-de-bord" className="flex shrink-0 items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primaire-100">
              <Recycle className="h-5 w-5 text-primaire-500" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold text-gray-900">CleanGuinée</span>
              <span className="block text-[10px] text-gray-500">Du déchet à la valeur</span>
            </span>
          </Link>

          <nav className="table-scroll flex flex-1 items-center gap-1">
            {NAVIGATION.map((entree) => {
              const actif = chemin.startsWith(entree.href);
              return (
                <Link
                  key={entree.href}
                  href={entree.href}
                  className={clsxLocal(
                    'whitespace-nowrap rounded-md px-3 py-2 text-sm transition',
                    actif
                      ? 'border-b-2 border-primaire-500 font-semibold text-primaire-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  {entree.libelle}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-4">
            <button className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5 text-gray-500" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primaire-500 text-[10px] font-bold text-white">
                4
              </span>
            </button>

            <div className="flex items-center gap-2">
              <div className="text-right leading-tight">
                <div className="text-sm font-semibold text-gray-900">{moi?.utilisateur.nom}</div>
                <div className="text-xs text-gray-500">
                  {moi?.utilisateur.role === 'ADMIN' ? 'Administrateur' : 'Superviseur'}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>

            <button
              onClick={() => {
                effacerJeton();
                router.replace('/connexion');
              }}
              aria-label="Se déconnecter"
              className="rounded-md p-2 text-gray-500 hover:bg-gray-50 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="px-6 py-6">{children}</main>
    </div>
  );
}

/** clsx minimal, pour éviter une dépendance sur un composant client. */
function clsxLocal(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
