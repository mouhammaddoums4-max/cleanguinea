'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BadgeCheck,
  Bell,
  Boxes,
  ChevronDown,
  FileText,
  HardHat,
  LayoutDashboard,
  LogOut,
  Moon,
  Recycle,
  Settings,
  ShoppingCart,
  Sun,
  Trash2,
  Truck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';

import { api, effacerJeton, lireJeton } from '@/lib/api';
import { useConfig, type CleTexte, type Langue } from '@/lib/config';

type Icone = ComponentType<{ className?: string }>;

const NAVIGATION: { cle: CleTexte; href: string; icone: Icone }[] = [
  { cle: 'tableauDeBord', href: '/tableau-de-bord', icone: LayoutDashboard },
  { cle: 'clients', href: '/clients', icone: Users },
  { cle: 'abonnements', href: '/abonnements', icone: BadgeCheck },
  { cle: 'collectes', href: '/collectes', icone: Truck },
  { cle: 'collecteurs', href: '/collecteurs', icone: HardHat },
  { cle: 'dechets', href: '/dechets', icone: Trash2 },
  { cle: 'stock', href: '/stock', icone: Boxes },
  { cle: 'ventes', href: '/ventes', icone: ShoppingCart },
  { cle: 'finance', href: '/finance', icone: Wallet },
  { cle: 'rapports', href: '/rapports', icone: FileText },
  { cle: 'parametres', href: '/parametres', icone: Settings },
];

const LANGUES: Langue[] = ['fr', 'en'];

type Moi = { utilisateur: { nom: string; role: string } };

/** En-tête et navigation communs à toutes les pages du back-office. */
export function Coquille({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  const router = useRouter();
  const { t, langue, changerLangue } = useConfig();
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
        {t('verificationSession')}
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

          <div className="ml-auto flex shrink-0 items-center gap-4">
            <button className="relative" aria-label="Notifications">
              <Bell className="h-5 w-5 text-gray-500" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primaire-500 text-[10px] font-bold text-white">
                4
              </span>
            </button>

            <div className="flex items-center rounded-md border border-gray-200 text-xs">
              {LANGUES.map((l) => (
                <button
                  key={l}
                  onClick={() => changerLangue(l)}
                  className={clsxLocal(
                    'px-2 py-1 font-semibold uppercase transition',
                    langue === l ? 'bg-primaire-500 text-white' : 'text-gray-500 hover:bg-gray-50',
                    l === 'fr' ? 'rounded-l-md' : 'rounded-r-md',
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            <MenuUtilisateur
              nom={moi?.utilisateur.nom ?? ''}
              role={moi?.utilisateur.role === 'ADMIN' ? t('administrateur') : t('superviseur')}
              seDeconnecter={() => {
                effacerJeton();
                router.replace('/connexion');
              }}
            />
          </div>
        </div>
      </header>

      {/* pb-28 : le dock flotte au-dessus du contenu, on lui réserve la place. */}
      <main className="px-6 pb-28 pt-6">{children}</main>

      <Dock chemin={chemin} t={t} />
    </div>
  );
}

/**
 * Menu du compte, ouvert depuis le nom de l'utilisateur.
 * Contient la bascule clair / sombre, l'accès au profil et la déconnexion.
 */
function MenuUtilisateur({
  nom,
  role,
  seDeconnecter,
}: {
  nom: string;
  role: string;
  seDeconnecter: () => void;
}) {
  const { t, theme, basculerTheme } = useConfig();
  const [ouvert, setOuvert] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  // Fermeture au clic à l'extérieur et à la touche Échap.
  useEffect(() => {
    if (!ouvert) return;

    const auClic = (e: MouseEvent) => {
      if (!conteneur.current?.contains(e.target as Node)) setOuvert(false);
    };
    const auClavier = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false);
    };

    document.addEventListener('mousedown', auClic);
    document.addEventListener('keydown', auClavier);
    return () => {
      document.removeEventListener('mousedown', auClic);
      document.removeEventListener('keydown', auClavier);
    };
  }, [ouvert]);

  const sombre = theme === 'sombre';
  const initiales = nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="relative" ref={conteneur}>
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-label={t('menuUtilisateur')}
        className={clsxLocal(
          'flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition',
          'hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primaire-500',
          ouvert && 'bg-gray-50',
        )}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primaire-100 text-xs font-bold text-primaire-600">
          {initiales || <UserRound className="h-4 w-4" />}
        </span>
        <span className="hidden text-right leading-tight sm:block">
          <span className="block text-sm font-semibold text-gray-900">{nom}</span>
          <span className="block text-xs text-gray-500">{role}</span>
        </span>
        <ChevronDown
          className={clsxLocal(
            'h-4 w-4 text-gray-400 transition-transform',
            ouvert && 'rotate-180',
          )}
        />
      </button>

      {ouvert && (
        <div
          role="menu"
          aria-label={t('menuUtilisateur')}
          className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg shadow-gray-900/10"
        >
          {/* Rappel de l'identité : sur mobile le bouton n'affiche que l'avatar. */}
          <div className="border-b border-gray-200 px-3 pb-2 pt-1.5 sm:hidden">
            <div className="truncate text-sm font-semibold text-gray-900">{nom}</div>
            <div className="text-xs text-gray-500">{role}</div>
          </div>

          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={sombre}
            onClick={basculerTheme}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            {sombre ? (
              <Sun className="h-4 w-4 text-gray-500" />
            ) : (
              <Moon className="h-4 w-4 text-gray-500" />
            )}
            <span className="flex-1 text-left">{sombre ? t('modeClair') : t('modeSombre')}</span>
            {/* Interrupteur : l'état du thème doit se lire sans ouvrir de sous-menu. */}
            <span
              aria-hidden
              className={clsxLocal(
                'flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition',
                sombre ? 'bg-primaire-500' : 'bg-gray-100',
              )}
            >
              <span
                className={clsxLocal(
                  // bg-[#fff] et non bg-white : la pastille doit rester blanche,
                  // alors que le theme sombre assombrit bg-white partout ailleurs.
                  'h-4 w-4 rounded-full bg-[#fff] shadow transition-transform',
                  sombre && 'translate-x-4',
                )}
              />
            </span>
          </button>

          <Link
            href="/profil"
            role="menuitem"
            onClick={() => setOuvert(false)}
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            <UserRound className="h-4 w-4 text-gray-500" />
            {t('monProfil')}
          </Link>

          <div className="my-1 border-t border-gray-200" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOuvert(false);
              seDeconnecter();
            }}
            className="flex w-full items-center gap-3 px-3 py-2 text-sm text-red-600 transition hover:bg-gray-50"
          >
            <LogOut className="h-4 w-4" />
            {t('deconnexion')}
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Navigation flottante, centrée en bas de l'écran.
 * Icônes seules : le libellé n'apparaît qu'au survol ou au focus clavier.
 */
function Dock({ chemin, t }: { chemin: string; t: (cle: CleTexte) => string }) {
  return (
    <nav
      aria-label={t('navigationPrincipale')}
      className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4"
    >
      {/* Pas d'overflow ici : il découperait les infobulles, qui débordent vers le haut.
          Sur petit écran les icônes passent à la ligne plutôt que de défiler. */}
      <div className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-gray-200 bg-white/90 p-2 shadow-lg shadow-gray-900/10 backdrop-blur">
        {NAVIGATION.map((entree) => {
          const actif = chemin.startsWith(entree.href);
          const libelle = t(entree.cle);
          const Icone = entree.icone;

          return (
            <Link
              key={entree.href}
              href={entree.href}
              aria-label={libelle}
              aria-current={actif ? 'page' : undefined}
              className={clsxLocal(
                'group relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl outline-none transition',
                'focus-visible:ring-2 focus-visible:ring-primaire-500 focus-visible:ring-offset-2',
                actif
                  ? 'bg-primaire-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icone className="h-5 w-5" />

              {/* Infobulle : masquée aux lecteurs d'écran, qui lisent déjà aria-label. */}
              <span
                aria-hidden
                className={clsxLocal(
                  'pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1',
                  'whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white',
                  'opacity-0 shadow-md transition duration-150',
                  'group-hover:translate-y-0 group-hover:opacity-100',
                  'group-focus-visible:translate-y-0 group-focus-visible:opacity-100',
                )}
              >
                {libelle}
                <span className="absolute left-1/2 top-full -ml-1 border-4 border-transparent border-t-gray-900" />
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** clsx minimal, pour éviter une dépendance sur un composant client. */
function clsxLocal(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
