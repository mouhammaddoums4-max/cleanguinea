import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Bac, type Mission, type SoldePoints } from '../../src/api';
import { useAuth } from '../../src/auth';
import { Bouton, Carte, Chargement, Ecran, PastilleBac } from '../../src/components/ui';
import { colors, couleursCategorie, espacement, formaterHeure, rayon } from '../../src/theme';

export default function Accueil() {
  const router = useRouter();
  const { utilisateur } = useAuth();

  const profil = useQuery({
    queryKey: ['moi'],
    queryFn: () => api<{ client: { adresse: string } | null }>('/api/auth/moi'),
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
    queryKey: ['points'],
    queryFn: () => api<SoldePoints>('/api/points/mon-solde'),
  });

  const enChargement = bacs.isLoading || prochaine.isLoading;
  const rafraichit = bacs.isRefetching || prochaine.isRefetching;

  function toutRafraichir() {
    bacs.refetch();
    prochaine.refetch();
    points.refetch();
    profil.refetch();
  }

  return (
    <Ecran>
      <ScrollView
        contentContainerStyle={styles.contenu}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={rafraichit} onRefresh={toutRafraichir} />}
      >
        <View style={styles.enTete}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bonjour}>Bonjour {utilisateur?.nom.split(' ')[0]} 👋</Text>
            <Text style={styles.lieu}>{profil.data?.client?.adresse ?? 'Conakry'}</Text>
          </View>
          <Ionicons name="notifications-outline" size={24} color={colors.texte} />
        </View>

        {enChargement ? (
          <Chargement />
        ) : (
          <>
            {/* Prochain passage */}
            <Carte style={styles.carteVerte}>
              <Text style={styles.carteVerteLibelle}>
                {prochaine.data ? 'Collecte en cours' : 'Prochain passage'}
              </Text>
              {prochaine.data ? (
                <>
                  <Text style={styles.carteVerteValeur}>
                    {prochaine.data.reference} · {libelleStatut(prochaine.data.statut)}
                  </Text>
                  <Text style={styles.carteVerteHeure}>
                    {prochaine.data.etaMinutes
                      ? `Arrivée estimée ${prochaine.data.etaMinutes} min`
                      : formaterHeure(prochaine.data.datePlanifiee)}
                  </Text>
                  <Bouton
                    titre="Suivre en temps réel"
                    variante="contour"
                    style={styles.boutonSuivi}
                    onPress={() => router.push('/(client)/suivi')}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.carteVerteValeur}>Aucune collecte planifiée</Text>
                  <Text style={styles.carteVerteHeure}>
                    Signalez un bac plein pour demander un passage
                  </Text>
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
                    {points.data?.solde ?? 0} points Clean
                  </Text>
                  <Text style={styles.petit}>
                    Niveau {points.data?.niveau ?? 'BRONZE'} ·{' '}
                    {(points.data?.valeurGnf ?? 0).toLocaleString('fr-FR')} GNF
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.texteTertiaire} />
              </View>
            </Carte>

            {/* Mes bacs */}
            <View style={styles.ligneTitre}>
              <Text style={styles.titreSection}>Mes bacs</Text>
              <Text style={styles.lien} onPress={() => router.push('/(client)/collectes')}>
                Voir tout
              </Text>
            </View>

            <View style={{ gap: espacement.sm }}>
              {bacs.data?.map((bac) => {
                const c = couleursCategorie[bac.categorie] ?? couleursCategorie.AUTRES;
                return (
                  <Carte key={bac.id} style={styles.carteBac}>
                    <PastilleBac categorie={bac.categorie} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bacNom}>{c.libelle}</Text>
                      <Text style={styles.petit}>Bac {bac.numero}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.bacNiveau, { color: c.teinte }]}>
                        {bac.niveauTiers}/3 plein
                      </Text>
                      <View style={styles.jauge}>
                        <View
                          style={[
                            styles.jaugeRemplie,
                            {
                              width: `${(bac.niveauTiers / 3) * 100}%`,
                              backgroundColor: c.teinte,
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
              titre="Ma poubelle est pleine"
              icone="trash-outline"
              onPress={() => router.push('/(client)/demande')}
            />
          </>
        )}
      </ScrollView>
    </Ecran>
  );
}

function libelleStatut(statut: string) {
  return (
    {
      EN_ATTENTE: 'En attente',
      ACCEPTEE: 'Acceptée',
      EN_ROUTE: 'En route',
      ARRIVE: 'Arrivé',
      TERMINEE: 'Terminée',
      ANNULEE: 'Annulée',
      MANQUEE: 'Manquée',
    }[statut] ?? statut
  );
}

const styles = StyleSheet.create({
  contenu: { padding: espacement.lg, gap: espacement.lg, paddingBottom: espacement.xxl },
  enTete: { flexDirection: 'row', alignItems: 'center' },
  bonjour: { fontSize: 20, fontWeight: '700', color: colors.texte },
  lieu: { fontSize: 13, color: colors.texteSecondaire, marginTop: 2 },

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

  carteBac: { flexDirection: 'row', alignItems: 'center', gap: espacement.md, paddingVertical: espacement.md },
  bacNom: { fontSize: 15, fontWeight: '600', color: colors.texte },
  bacNiveau: { fontSize: 13, fontWeight: '600' },
  jauge: { width: 56, height: 4, borderRadius: 2, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  jaugeRemplie: { height: '100%', borderRadius: 2 },

  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
});
