'use client';

import { useEffect, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Boxes,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Moon,
  Recycle,
  Settings,
  Sun,
  Truck,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react';

import { api, effacerJeton, lireJeton } from '@/lib/api';
import { useConfig, type CleTexte, type Langue } from '@/lib/config';

type Icone = ComponentType<{ className?: string }>;

type SousPage = { cle: CleTexte; href: string };
type Rubrique = { cle: CleTexte; href: string; icone: Icone; sous?: SousPage[] };

/**
 * Cinq rubriques, pas une de plus.
 *
 * Onze icones alignees demandaient au lecteur de choisir avant de comprendre.
 * Les pages sont donc regroupees par metier : on choisit d'abord un domaine,
 * puis une page a l'interieur. Les URL ne changent pas — /abonnements,
 * /collecteurs, /stock... restent valides, elles apparaissent simplement en
 * sous-navigation de leur rubrique.
 *
 * Parametres a quitte la barre pour le menu du compte : c'est un reglage,
 * consulte rarement, pas une etape du travail quotidien.
 */
const NAVIGATION: Rubrique[] = [
  { cle: 'tableauDeBord', href: '/tableau-de-bord', icone: LayoutDashboard },
  {
    cle: 'clients',
    href: '/clients',
    icone: Users,
    sous: [
      { cle: 'annuaire', href: '/clients' },
      { cle: 'abonnements', href: '/abonnements' },
    ],
  },
  {
    cle: 'operations',
    href: '/collectes',
    icone: Truck,
    sous: [
      { cle: 'collectes', href: '/collectes' },
      { cle: 'collecteurs', href: '/collecteurs' },
    ],
  },
  {
    cle: 'valorisation',
    href: '/dechets',
    icone: Boxes,
    sous: [
      { cle: 'dechets', href: '/dechets' },
      { cle: 'stock', href: '/stock' },
      { cle: 'ventes', href: '/ventes' },
    ],
  },
  {
    cle: 'finance',
    href: '/finance',
    icone: Wallet,
    sous: [
      { cle: 'synthese', href: '/finance' },
      { cle: 'rapports', href: '/rapports' },
    ],
  },
];

/** Vrai si le chemin courant est cette page ou l'une de ses sous-pages. */
function estActif(href: string, chemin: string) {
  return chemin === href || chemin.startsWith(`${href}/`);
}

/** Rubrique a laquelle appartient le chemin courant, s'il y en a une. */
function rubriqueDe(chemin: string) {
  return NAVIGATION.find(
    (r) => estActif(r.href, chemin) || r.sous?.some((p) => estActif(p.href, chemin)),
  );
}

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
      <main className="px-6 pb-28 pt-6">
        <SousNavigation chemin={chemin} t={t} />
        {children}
      </main>

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

          {/* Reglages de l'entreprise : consultes rarement, ils n'ont pas leur
              place dans la navigation du travail quotidien. */}
          <Link
            href="/parametres"
            role="menuitem"
            onClick={() => setOuvert(false)}
            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-50"
          >
            <Settings className="h-4 w-4 text-gray-500" />
            {t('parametres')}
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
 *
 * Cinq rubriques seulement : le libellé tient à côté de l'icône, et personne
 * n'a plus à survoler une icône pour savoir où elle mène. Sur écran étroit
 * seul le libellé de la rubrique ouverte reste affiché.
 */
function Dock({ chemin, t }: { chemin: string; t: (cle: CleTexte) => string }) {
  const courante = rubriqueDe(chemin);

  return (
    <nav
      aria-label={t('navigationPrincipale')}
      className="fixed inset-x-0 bottom-5 z-30 flex justify-center px-4"
    >
      <div className="flex max-w-full items-center gap-1 rounded-2xl border border-gray-200 bg-white/90 p-1.5 shadow-lg shadow-gray-900/10 backdrop-blur">
        {NAVIGATION.map((rubrique) => {
          const actif = rubrique === courante;
          const libelle = t(rubrique.cle);
          const Icone = rubrique.icone;

          return (
            <Link
              key={rubrique.href}
              href={rubrique.href}
              aria-label={libelle}
              aria-current={actif ? 'page' : undefined}
              className={clsxLocal(
                'flex h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-medium outline-none transition',
                'focus-visible:ring-2 focus-visible:ring-primaire-500 focus-visible:ring-offset-2',
                actif
                  ? 'bg-primaire-500 text-white shadow-sm'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
              )}
            >
              <Icone className="h-5 w-5 shrink-0" />
              {/* Le libellé de la rubrique ouverte ne disparaît jamais : c'est
                  le repère qui dit où l'on se trouve. */}
              <span className={actif ? 'whitespace-nowrap' : 'hidden whitespace-nowrap md:inline'}>
                {libelle}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Pages de la rubrique ouverte, en onglets sous l'en-tête.
 * Rien ne s'affiche pour une rubrique qui n'a qu'une seule page.
 */
function SousNavigation({ chemin, t }: { chemin: string; t: (cle: CleTexte) => string }) {
  const rubrique = rubriqueDe(chemin);
  if (!rubrique?.sous || rubrique.sous.length < 2) return null;

  return (
    <nav
      aria-label={t('sousNavigation')}
      className="mb-6 flex gap-6 border-b border-gray-200 text-sm"
    >
      {rubrique.sous.map((page) => {
        const actif = estActif(page.href, chemin);
        return (
          <Link
            key={page.href}
            href={page.href}
            aria-current={actif ? 'page' : undefined}
            className={clsxLocal(
              '-mb-px border-b-2 pb-2.5 font-medium outline-none transition',
              'focus-visible:ring-2 focus-visible:ring-primaire-500',
              actif
                ? 'border-primaire-500 text-primaire-600'
                : 'border-transparent text-gray-500 hover:text-gray-900',
            )}
          >
            {t(page.cle)}
          </Link>
        );
      })}
    </nav>
  );
}

/** clsx minimal, pour éviter une dépendance sur un composant client. */
function clsxLocal(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}
