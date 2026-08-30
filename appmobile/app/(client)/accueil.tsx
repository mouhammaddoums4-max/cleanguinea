import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Bac, type Mission, type SoldePoints } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useConfig } from '../../src/config';
import { useI18n, useFormat } from '../../src/i18n';
import { Avatar } from '../../src/components/Avatar';
import { Bannieres } from '../../src/components/Bannieres';
import {
  Bouton, Carte, Chargement, Ecran, useHautBarreStatut, PastilleBac,
} from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';
import { useResponsive } from '../../src/responsive';

export default function Accueil() {
  const router = useRouter();
  const { utilisateur } = useAuth();
  const { categorie, parametre, devise } = useConfig();
  const { t, langue } = useI18n();
  const format = useFormat();
  const hautBarre = useHautBarreStatut();
  const r = useResponsive();

  const niveauMax = parametre<number>('bac.niveauMaxTiers', 3);

  const profil = useQuery({
    queryKey: ['moi'],
    queryFn: () =>
      api<{
        utilisateur: { photoUrl: string | null };
        client: { quartier: { nom: string; commune: { nom: string } } } | null;
      }>('/api/auth/moi'),
  });

  const notifs = useQuery({
    queryKey: ['notifications-compteur'],
    queryFn: () => api<{ nonLues: number }>('/api/notifications/compteur'),
    refetchInterval: 60_000,
  });

  const bacs = useQuery({
    queryKey: ['mes-bacs'],
    queryFn: () => api<Bac[]>('/api/bacs/mes-bacs'),
  });

  const prochaine = useQuery({
    queryKey: ['mission-en-cours'],
    queryFn: () => api<Mission | null>('/api/missions/en-cours'),
    // Le suivi doit rester frais : une mission peut changer d'etat a tout moment.
    refetchInterval: 30_000,
  });

  const points = useQuery({
    queryKey: ['points', langue],
    queryFn: () => api<SoldePoints>(`/api/points/mon-solde?langue=${langue}`),
  });

  const enChargement = bacs.isLoading || prochaine.isLoading;
  const rafraichit = bacs.isRefetching || prochaine.isRefetching;

  function toutRafraichir() {
    bacs.refetch();
    prochaine.refetch();
    points.refetch();
    profil.refetch();
    notifs.refetch();
  }

  return (
    <Ecran>
      <ScrollView
        contentContainerStyle={[styles.contenu, r.contenu, { paddingTop: hautBarre + espacement.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={toutRafraichir} />}
      >
        {/* Identite : photo, nom, quartier. Pas de salutation — elle occupe la
            largeur sans rien apprendre a qui ouvre l'application. */}
        <View style={styles.enTete}>
          <Pressable
            onPress={() => router.push('/(client)/profil')}
            accessibilityRole="button"
            accessibilityLabel={t('profil.titre')}
          >
            <Avatar
              nom={utilisateur?.nom}
              photoUrl={profil.data?.utilisateur.photoUrl}
              taille={46}
            />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.nom} numberOfLines={1}>
              {utilisateur?.nom}
            </Text>
            <Text style={styles.lieu} numberOfLines={1}>
              {profil.data?.client
                ? `${profil.data.client.quartier.nom}, ${profil.data.client.quartier.commune.nom}`
                : 'Conakry'}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push('/(client)/notifications-liste')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('profil.notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.texte} />
            {(notifs.data?.nonLues ?? 0) > 0 && (
              <View style={styles.pastilleNotif}>
                <Text style={styles.pastilleNotifTexte}>
                  {notifs.data!.nonLues > 9 ? '9+' : notifs.data!.nonLues}
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <Bannieres />

        {enChargement ? (
          <Chargement texte={t('commun.chargement')} />
        ) : (
          <>
            {/* Prochain passage */}
            <Carte style={styles.carteVerte}>
              <Text style={styles.carteVerteLibelle}>
                {prochaine.data ? t('accueil.collecteEnCours') : t('accueil.prochainPassage')}
              </Text>
              {prochaine.data ? (
                <>
                  <Text style={styles.carteVerteValeur}>
                    {prochaine.data.reference} · {t(`statuts.${prochaine.data.statut}`)}
                  </Text>
                  <Text style={styles.carteVerteHeure}>
                    {prochaine.data.etaMinutes
                      ? `${t('accueil.arriveeEstimee')} ${prochaine.data.etaMinutes} ${t('suivi.minutes')}`
                      : format.heure(prochaine.data.datePlanifiee)}
                  </Text>
                  <Bouton
                    titre={t('accueil.suivreTempsReel')}
                    variante="contour"
                    style={styles.boutonSuivi}
                    onPress={() => router.push('/(client)/suivi')}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.carteVerteValeur}>{t('accueil.aucuneCollecte')}</Text>
                  <Text style={styles.carteVerteHeure}>{t('accueil.signalerBacPlein')}</Text>
                </>
              )}
            </Carte>

            {/* Points Clean */}
            <Carte onPress={() => router.push('/(client)/points')} style={styles.cartePoints}>
              <View style={styles.ligne}>
                <View style={styles.iconePoints}>
                  <Ionicons name="leaf" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pointsValeur}>
                    {points.data?.solde ?? 0} {t('accueil.pointsClean')}
                  </Text>
                  <Text style={styles.petit}>
                    {t('accueil.niveau')} {points.data?.niveauLibelle ?? points.data?.niveau ?? '—'}{' '}
                    · {format.montant(points.data?.valeurGnf ?? 0, devise)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.texteTertiaire} />
              </View>
            </Carte>

            {/* Mes bacs */}
            <View style={styles.ligneTitre}>
              <Text style={styles.titreSection}>{t('accueil.mesBacs')}</Text>
              <Text style={styles.lien} onPress={() => router.push('/(client)/collectes')}>
                {t('commun.voirTout')}
              </Text>
            </View>

            <View style={{ gap: espacement.sm }}>
              {bacs.data?.map((bac) => {
                const c = categorie(bac.categorie);
                return (
                  <Carte key={bac.id} style={styles.carteBac}>
                    <PastilleBac
                      couleur={c.couleur}
                      couleurFond={c.couleurFond}
                      icone={c.icone}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bacNom}>{c.libelle}</Text>
                      <Text style={styles.petit}>
                        {t('bacs.bac')} {bac.numero}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.bacNiveau, { color: c.couleur }]}>
                        {bac.niveauTiers}/{niveauMax} {t('bacs.plein')}
                      </Text>
                      <View style={styles.jauge}>
                        <View
                          style={[
                            styles.jaugeRemplie,
                            {
                              width: `${(bac.niveauTiers / niveauMax) * 100}%`,
                              backgroundColor: c.couleur,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </Carte>
                );
              })}
            </View>

            <Bouton
              titre={t('accueil.poubellePleine')}
              icone="trash-outline"
              onPress={() => router.push('/(client)/demande')}
            />
          </>
        )}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  // Marges horizontales et ecart fournis par useResponsive.
  contenu: { paddingBottom: espacement.xxl },
  enTete: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  nom: { fontSize: 17, fontWeight: '700', color: colors.texte },
  lieu: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  pastilleNotif: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pastilleNotifTexte: { fontSize: 10, fontWeight: '800', color: colors.blanc },

  carteVerte: { backgroundColor: colors.primary, borderColor: colors.primary, gap: 4 },
  carteVerteLibelle: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  carteVerteValeur: { fontSize: 18, fontWeight: '700', color: colors.blanc },
  carteVerteHeure: { fontSize: 14, color: 'rgba(255,255,255,0.9)' },
  boutonSuivi: {
    marginTop: espacement.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: colors.blanc,
  },

  cartePoints: { paddingVertical: espacement.md },
  ligne: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  iconePoints: {
    width: 38,
    height: 38,
    borderRadius: rayon.sm,
    backgroundColor: colors.primaryClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsValeur: { fontSize: 15, fontWeight: '700', color: colors.texte },

  ligneTitre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titreSection: { fontSize: 16, fontWeight: '700', color: colors.texte },
  lien: { fontSize: 13, fontWeight: '600', color: colors.primary },

  carteBac: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
  bacNom: { fontSize: 15, fontWeight: '600', color: colors.texte },
  bacNiveau: { fontSize: 13, fontWeight: '600' },
  jauge: { width: 56, height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  jaugeRemplie: { height: '100%', borderRadius: 2 },

  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
});
