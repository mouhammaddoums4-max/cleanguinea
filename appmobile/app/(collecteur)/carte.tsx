import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Mission } from '../../src/api';
import { Carte, Chargement, Contenu, Ecran, EnTete, Vide } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useI18n, useFormat } from '../../src/i18n';

type Reponse = { missions: Mission[] };

/**
 * Tournee du jour, regroupee par commune.
 *
 * La carte interactive (react-native-maps) demande une cle Google Maps et un build
 * natif : en attendant, on affiche la tournee ordonnee par quartier, qui est
 * l'information dont le collecteur a reellement besoin sur le terrain.
 */
export default function CarteTournee() {
  const router = useRouter();
  const { t } = useI18n();
  const format = useFormat();

  const donnees = useQuery({
    queryKey: ['mes-missions'],
    queryFn: () => api<Reponse>('/api/missions/mes-missions'),
  });

  const parCommune = new Map<string, Mission[]>();
  for (const m of donnees.data?.missions ?? []) {
    const zone = m.client.quartier.commune.nom;
    if (!parCommune.has(zone)) parCommune.set(zone, []);
    parCommune.get(zone)!.push(m);
  }

  return (
    <Ecran>
      <EnTete titre={t('collecteur.maTournee')} sousTitre={t('collecteur.groupeeParCommune')} />
      {donnees.isLoading ? (
        <Chargement texte={t('commun.chargement')} />
      ) : parCommune.size === 0 ? (
        <Vide icone="map-outline" titre={t('collecteur.aucuneMission')} />
      ) : (
        <Contenu>
          {[...parCommune.entries()].map(([zone, missions]) => (
            <View key={zone} style={{ gap: espacement.sm }}>
              <View style={styles.ligneZone}>
                <Ionicons name="location" size={16} color={colors.primary} />
                <Text style={styles.zone}>{zone}</Text>
                <Text style={styles.compte}>
                  {missions.length} {t('collecteur.arrets')}
                </Text>
              </View>

              {missions.map((m, i) => (
                <Carte
                  key={m.id}
                  onPress={() => router.push(`/(collecteur)/mission/${m.id}`)}
                  style={styles.arret}
                >
                  <View style={styles.rang}>
                    <Text style={styles.rangTexte}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.nom}>{m.client.user.nom}</Text>
                    <Text style={styles.petit}>
                      {m.client.quartier.nom} · {format.heure(m.datePlanifiee)}
                    </Text>
                  </View>
                  <Ionicons
                    name={m.statut === 'TERMINEE' ? 'checkmark-circle' : 'chevron-forward'}
                    size={18}
                    color={m.statut === 'TERMINEE' ? colors.primary : colors.texteTertiaire}
                  />
                </Carte>
              ))}
            </View>
          ))}
        </Contenu>
      )}
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligneZone: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  zone: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.texte },
  compte: { fontSize: 12, color: colors.texteSecondaire },
  arret: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
  rang: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primaryClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangTexte: { fontSize: 12, fontWeight: '700', color: colors.primaryTexte },
  nom: { fontSize: 14, fontWeight: '600', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
});
