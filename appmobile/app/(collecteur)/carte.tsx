import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Zone, type ResumeZones } from '../../src/api';
import { useI18n, useFormat } from '../../src/i18n';
import {
  distanceM, formaterDistance, ouvrirItineraire, positionAutorisee, relevePosition,
  type Position,
} from '../../src/geo';
import { CarteZones } from '../../src/components/CarteZones';
import { Carte, Chargement, Ecran, EnTete, Etiquette, Vide } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';
import { useResponsive } from '../../src/responsive';

/** Carte de toutes les zones du jour, ordonnées par distance au collecteur. */
export default function CarteTournee() {
  const router = useRouter();
  const { t } = useI18n();
  const r = useResponsive();
  const format = useFormat();
  const [moi, setMoi] = useState<Position | null>(null);

  const donnees = useQuery({
    queryKey: ['mes-zones'],
    queryFn: () => api<{ zones: Zone[]; resume: ResumeZones }>('/api/tournees/mes-zones'),
  });

  // Position relevée une fois à l'ouverture, puis mise à jour côté serveur pour
  // que le client puisse suivre le collecteur.
  useEffect(() => {
    (async () => {
      const position = (await positionAutorisee()) ? await relevePosition() : null;
      if (!position) return;
      setMoi(position);
      api('/api/tournees/collecteur/position', { method: 'PATCH', body: position }).catch(
        () => {
          // Sans conséquence : le suivi temps réel est un confort, pas un prérequis.
        },
      );
    })();
  }, []);

  const zones = donnees.data?.zones ?? [];

  const avecDistance = zones
    .map((z) => ({
      ...z,
      distance: moi && z.position ? distanceM(moi, z.position) : null,
    }))
    .sort((a, b) => {
      // Les zones à faire d'abord, puis la plus proche.
      const faite = (z: typeof a) => (z.statut === 'TERMINEE' ? 1 : 0);
      if (faite(a) !== faite(b)) return faite(a) - faite(b);
      if (a.distance == null || b.distance == null) return 0;
      return a.distance - b.distance;
    });

  const marqueurs = zones
    .filter((z) => z.position)
    .map((z) => ({
      id: z.id,
      position: z.position!,
      titre: z.zone,
      sousTitre: `${z.commune} · ${z.nbFoyers} ${t('zones.foyers')}`,
      couleur: z.statut === 'EN_COURS' ? colors.alerte : colors.primary,
      attenue: z.statut === 'TERMINEE',
    }));

  return (
    <Ecran bas>
      <EnTete titre={t('onglets.carte')} sousTitre={t('zones.carteSousTitre')} retour />
      <ScrollView
        contentContainerStyle={[styles.contenu, r.contenu]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={donnees.isRefetching} onRefresh={() => donnees.refetch()} />
        }
      >
        {donnees.isLoading ? (
          <Chargement texte={t('commun.chargement')} />
        ) : zones.length === 0 ? (
          <Vide icone="map-outline" titre={t('zones.aucuneZone')} />
        ) : (
          <>
            <CarteZones
              marqueurs={marqueurs}
              moi={moi}
              hauteur={300}
              messageReplis={t('zones.carteIndisponible')}
            />

            {!moi && (
              <View style={styles.avis}>
                <Ionicons name="location-outline" size={15} color={colors.texteTertiaire} />
                <Text style={styles.avisTexte}>{t('zones.positionIndisponible')}</Text>
              </View>
            )}

            {avecDistance.map((z) => (
              <Carte
                key={z.id}
                onPress={() => router.push(`/(collecteur)/zone/${z.id}`)}
                style={styles.ligne}
              >
                <View
                  style={[
                    styles.pastille,
                    {
                      backgroundColor:
                        z.statut === 'TERMINEE'
                          ? colors.primaryClair
                          : z.statut === 'EN_COURS'
                            ? colors.alerteClair
                            : colors.surfaceAlt,
                    },
                  ]}
                >
                  <Ionicons
                    name={z.statut === 'TERMINEE' ? 'checkmark' : 'location'}
                    size={16}
                    color={
                      z.statut === 'TERMINEE'
                        ? colors.primary
                        : z.statut === 'EN_COURS'
                          ? colors.alerte
                          : colors.texteSecondaire
                    }
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.nom}>{z.zone}</Text>
                  <Text style={styles.petit}>
                    {z.commune} · {z.nbFoyers} {t('zones.foyers')}
                    {z.heureDebutPrevue ? ` · ${format.heure(z.heureDebutPrevue)}` : ''}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  {z.distance != null && (
                    <Text style={styles.distance}>{formaterDistance(z.distance)}</Text>
                  )}
                  {z.statut !== 'TERMINEE' && !!z.position && (
                    <Ionicons
                      name="navigate-circle"
                      size={26}
                      color={colors.primary}
                      onPress={() => ouvrirItineraire(z.position!, z.zone)}
                    />
                  )}
                </View>
              </Carte>
            ))}
          </>
        )}
      </ScrollView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  contenu: { gap: espacement.sm, paddingBottom: espacement.xxl },
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.md,
  },
  pastille: {
    width: 32,
    height: 32,
    borderRadius: rayon.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: { fontSize: 15, fontWeight: '600', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  distance: { fontSize: 12, fontWeight: '600', color: colors.texteSecondaire },
  avis: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  avisTexte: { flex: 1, fontSize: 12, color: colors.texteTertiaire },
});
