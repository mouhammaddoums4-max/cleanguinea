import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Zone, type ResumeZones } from '../../src/api';
import { useAuth } from '../../src/auth';
import { useI18n, useFormat } from '../../src/i18n';
import { ouvrirItineraire } from '../../src/geo';
import { Avatar } from '../../src/components/Avatar';
import {
  Bouton, Carte, Chargement, Ecran, useHautBarreStatut, Etiquette, Vide,
} from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';
import { useResponsive } from '../../src/responsive';

/** Couleur et fond de l'étiquette de statut. */
const TEINTES: Record<string, { teinte: string; fond: string }> = {
  A_FAIRE: { teinte: colors.texteSecondaire, fond: colors.surfaceAlt },
  EN_COURS: { teinte: colors.alerte, fond: colors.alerteClair },
  TERMINEE: { teinte: colors.primaryTexte, fond: colors.primaryClair },
  ANNULEE: { teinte: colors.danger, fond: colors.dangerClair },
};

/**
 * Écran principal du collecteur : les zones à collecter aujourd'hui.
 * Rien d'autre — pas de liste de clients, pas de missions individuelles.
 */
export default function Zones() {
  const router = useRouter();
  const { utilisateur } = useAuth();
  const { t } = useI18n();
  const format = useFormat();
  const hautBarre = useHautBarreStatut();
  const r = useResponsive();

  const donnees = useQuery({
    queryKey: ['mes-zones'],
    queryFn: () => api<{ zones: Zone[]; resume: ResumeZones }>('/api/tournees/mes-zones'),
    refetchInterval: 60_000,
  });

  const zones = donnees.data?.zones ?? [];
  const resume = donnees.data?.resume;

  // Les zones restant à faire passent devant celles qui sont terminées.
  const aTraiter = zones.filter((z) => z.statut !== 'TERMINEE');
  const faites = zones.filter((z) => z.statut === 'TERMINEE');

  return (
    <Ecran>
      <ScrollView
        contentContainerStyle={[styles.contenu, r.contenu, { paddingTop: hautBarre + espacement.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={donnees.isRefetching} onRefresh={() => donnees.refetch()} />
        }
      >
        {/* Photo, nom, matricule : le collecteur doit reconnaitre son compte
            d'un coup d'oeil, plusieurs se partagent parfois un telephone. */}
        <View style={styles.enTete}>
          <Pressable
            onPress={() => router.push('/(collecteur)/profil')}
            accessibilityRole="button"
            accessibilityLabel={t('profil.titre')}
          >
            <Avatar nom={utilisateur?.nom} taille={46} />
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={styles.nom} numberOfLines={1}>
              {utilisateur?.nom}
            </Text>
            <Text style={styles.petit}>
              {utilisateur?.identifiant ? `${utilisateur.identifiant} · ` : ''}
              {format.dateLongue(new Date())}
            </Text>
          </View>

          <Ionicons name="notifications-outline" size={24} color={colors.texte} />
        </View>

        {donnees.isLoading ? (
          <Chargement texte={t('commun.chargement')} />
        ) : (
          <>
            {/* Compteurs du jour */}
            <View style={styles.compteurs}>
              {[
                { libelle: t('zones.aFaire'), valeur: resume?.aFaire ?? 0, teinte: colors.texte },
                { libelle: t('zones.enCours'), valeur: resume?.enCours ?? 0, teinte: colors.alerte },
                { libelle: t('zones.terminees'), valeur: resume?.terminees ?? 0, teinte: colors.primary },
              ].map((c) => (
                <Carte key={c.libelle} style={styles.compteur}>
                  <Text style={[styles.compteurValeur, { color: c.teinte }]}>{c.valeur}</Text>
                  <Text style={styles.petit}>{c.libelle}</Text>
                </Carte>
              ))}
            </View>

            {!!resume?.poidsTotalKg && (
              <Carte style={styles.bandeau}>
                <Ionicons name="scale-outline" size={18} color={colors.blanc} />
                <Text style={styles.bandeauTexte}>
                  {resume.poidsTotalKg} kg · {resume.foyersServis} {t('zones.foyersServis')}
                </Text>
              </Carte>
            )}

            {zones.length === 0 ? (
              <Vide
                icone="map-outline"
                titre={t('zones.aucuneZone')}
                message={t('zones.aucuneZoneDetail')}
              />
            ) : (
              <>
                <Text style={styles.titreSection}>{t('zones.aCollecter')}</Text>
                {aTraiter.length === 0 ? (
                  <Carte style={styles.termine}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                    <Text style={styles.termineTexte}>{t('zones.toutFait')}</Text>
                  </Carte>
                ) : (
                  aTraiter.map((z) => (
                    <CarteZone
                      key={z.id}
                      zone={z}
                      onPress={() => router.push(`/(collecteur)/zone/${z.id}`)}
                    />
                  ))
                )}

                {faites.length > 0 && (
                  <>
                    <Text style={styles.titreSection}>{t('zones.terminees')}</Text>
                    {faites.map((z) => (
                      <CarteZone
                        key={z.id}
                        zone={z}
                        onPress={() => router.push(`/(collecteur)/zone/${z.id}`)}
                      />
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </Ecran>
  );
}

function CarteZone({ zone, onPress }: { zone: Zone; onPress: () => void }) {
  const { t } = useI18n();
  const format = useFormat();
  const teinte = TEINTES[zone.statut] ?? TEINTES.A_FAIRE;

  return (
    <Carte onPress={onPress} style={{ gap: espacement.md }}>
      <View style={styles.ligneHaut}>
        <View style={{ flex: 1 }}>
          <Text style={styles.zoneNom}>{zone.zone}</Text>
          <Text style={styles.petit}>
            {zone.commune} · {zone.reference}
          </Text>
        </View>
        <Etiquette texte={t(`zones.statut.${zone.statut}`)} teinte={teinte.teinte} fond={teinte.fond} />
      </View>

      <View style={styles.infos}>
        <Info icone="home-outline" texte={`${zone.nbFoyers} ${t('zones.foyers')}`} />
        {!!zone.heureDebutPrevue && (
          <Info
            icone="time-outline"
            texte={`${format.heure(zone.heureDebutPrevue)}${
              zone.heureFinPrevue ? ` – ${format.heure(zone.heureFinPrevue)}` : ''
            }`}
          />
        )}
        {zone.statut === 'TERMINEE' && (
          <Info icone="scale-outline" texte={`${zone.poidsTotalKg} kg`} />
        )}
      </View>

      {!!zone.position && zone.statut !== 'TERMINEE' && (
        <Bouton
          titre={t('zones.itineraire')}
          variante="contour"
          icone="navigate-outline"
          style={{ height: 42 }}
          onPress={() => ouvrirItineraire(zone.position!, zone.zone)}
        />
      )}
    </Carte>
  );
}

function Info({ icone, texte }: { icone: keyof typeof Ionicons.glyphMap; texte: string }) {
  return (
    <View style={styles.info}>
      <Ionicons name={icone} size={14} color={colors.texteSecondaire} />
      <Text style={styles.infoTexte}>{texte}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Marges horizontales et ecart fournis par useResponsive.
  contenu: { paddingBottom: espacement.xxl },
  enTete: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    marginBottom: espacement.xs,
  },
  nom: { fontSize: 17, fontWeight: '700', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },

  compteurs: { flexDirection: 'row', gap: espacement.sm },
  compteur: { flex: 1, alignItems: 'center', paddingVertical: espacement.md },
  compteurValeur: { fontSize: 24, fontWeight: '800' },

  bandeau: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.sm,
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    paddingVertical: espacement.md,
  },
  bandeauTexte: { fontSize: 14, fontWeight: '600', color: colors.blanc },

  titreSection: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.texte,
    marginTop: espacement.sm,
  },

  ligneHaut: { flexDirection: 'row', alignItems: 'flex-start', gap: espacement.md },
  zoneNom: { fontSize: 17, fontWeight: '700', color: colors.texte },

  infos: { flexDirection: 'row', flexWrap: 'wrap', gap: espacement.lg },
  info: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  infoTexte: { fontSize: 13, color: colors.texteSecondaire },

  termine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.sm,
    backgroundColor: colors.primaryClair,
    borderColor: colors.primaryClair,
  },
  termineTexte: { fontSize: 14, fontWeight: '600', color: colors.primaryTexte },
});
