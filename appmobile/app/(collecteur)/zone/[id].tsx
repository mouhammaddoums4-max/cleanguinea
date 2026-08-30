import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import { api, type DetailZone } from '../../../src/api';
import { useConfig } from '../../../src/config';
import { useI18n, useFormat } from '../../../src/i18n';
import { ouvrirItineraire, relevePosition } from '../../../src/geo';
import { CarteZones } from '../../../src/components/CarteZones';
import {
  Bouton, Carte, Champ, Chargement, Contenu, Ecran, EnTete, Etiquette, PastilleBac,
} from '../../../src/components/ui';
import { colors, espacement, rayon } from '../../../src/theme';

/**
 * Détail d'une zone : carte, foyers, puis démarrage et confirmation.
 *
 * Le collecteur ne pèse rien. Il passe chez les foyers, ramasse, et déclare la
 * zone faite : nombre de foyers servis et, s'il y a lieu, un commentaire. Le
 * chargement part ensuite à l'entrepôt, où les trieurs pèsent et trient.
 * Le reste (clôture des demandes du quartier, remise à zéro des bacs) est fait
 * par le serveur.
 */
export default function DetailZone() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();
  const { categorie } = useConfig();
  const { t } = useI18n();
  const format = useFormat();

  const [foyersServis, setFoyersServis] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [saisieOuverte, setSaisieOuverte] = useState(false);

  const zone = useQuery({
    queryKey: ['zone', id],
    queryFn: () => api<DetailZone>(`/api/tournees/${id}`),
  });

  function invalider() {
    client.invalidateQueries({ queryKey: ['zone', id] });
    client.invalidateQueries({ queryKey: ['mes-zones'] });
    client.invalidateQueries({ queryKey: ['tableau-de-bord-collecteur'] });
  }

  const demarrer = useMutation({
    mutationFn: async () => {
      const position = await relevePosition();
      return api(`/api/tournees/${id}/demarrer`, { method: 'PATCH', body: position ?? {} });
    },
    onSuccess: () => {
      invalider();
      setSaisieOuverte(true);
    },
    onError: (e) => Alert.alert(t('zones.echecDemarrage'), e instanceof Error ? e.message : ''),
  });

  const confirmer = useMutation({
    mutationFn: async () => {
      const position = await relevePosition();

      return api(`/api/tournees/${id}/confirmer`, {
        method: 'POST',
        body: {
          // Rend l'envoi idempotent si le réseau coupe et que le collecteur réessaie.
          clientRef: Crypto.randomUUID(),
          nbFoyersServis: Number(foyersServis) || 0,
          commentaire: commentaire.trim() || undefined,
          ...(position ?? {}),
        },
      });
    },
    onSuccess: () => {
      invalider();
      Alert.alert(
        t('zones.zoneConfirmee'),
        t('zones.confirmationResume', { foyers: Number(foyersServis) || 0 }),
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (e) => Alert.alert(t('zones.echecConfirmation'), e instanceof Error ? e.message : ''),
  });

  if (zone.isLoading || !zone.data) {
    return (
      <Ecran bas>
        <EnTete titre={t('zones.detail')} retour />
        <Chargement texte={t('commun.chargement')} />
      </Ecran>
    );
  }

  const z = zone.data;
  const enCours = z.statut === 'EN_COURS';
  const terminee = z.statut === 'TERMINEE';

  const peutConfirmer = Number(foyersServis) > 0;

  // Un foyer qui a signalé un bac plein passe en tête de liste.
  const foyers = [...z.foyers].sort(
    (a, b) => (b.demande ? 1 : 0) - (a.demande ? 1 : 0),
  );

  const marqueurs = foyers
    .filter((f) => f.latitude != null && f.longitude != null)
    .map((f) => ({
      id: f.id,
      position: { latitude: f.latitude!, longitude: f.longitude! },
      titre: f.nom,
      sousTitre: f.adresse,
      couleur: f.demande ? colors.alerte : colors.primary,
      attenue: terminee,
    }));

  return (
    <Ecran bas>
      <EnTete titre={z.zone} sousTitre={`${z.commune} · ${z.reference}`} retour />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Contenu>
          {/* Carte */}
          <CarteZones
            marqueurs={marqueurs}
            hauteur={220}
            messageReplis={t('zones.carteIndisponible')}
          />

          <View style={styles.ligneHaut}>
            <Etiquette
              texte={t(`zones.statut.${z.statut}`)}
              teinte={terminee ? colors.primaryTexte : colors.alerte}
              fond={terminee ? colors.primaryClair : colors.alerteClair}
            />
            {!!z.position && (
              <Bouton
                titre={t('zones.itineraire')}
                variante="contour"
                icone="navigate-outline"
                style={{ flex: 1, height: 42 }}
                onPress={() => ouvrirItineraire(z.position!, z.zone)}
              />
            )}
          </View>

          {/* Foyers de la zone */}
          <Carte style={{ gap: espacement.md }}>
            <View style={styles.ligneTitre}>
              <Text style={styles.titreBloc}>
                {foyers.length} {t('zones.foyers')}
              </Text>
              {foyers.some((f) => f.demande) && (
                <Etiquette
                  texte={`${foyers.filter((f) => f.demande).length} ${t('zones.demandes')}`}
                  teinte={colors.alerte}
                  fond={colors.alerteClair}
                />
              )}
            </View>

            {foyers.slice(0, 8).map((f) => (
              <Pressable
                key={f.id}
                style={styles.foyer}
                onPress={() =>
                  f.latitude != null && f.longitude != null
                    ? ouvrirItineraire({ latitude: f.latitude, longitude: f.longitude }, f.nom)
                    : undefined
                }
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.foyerNomLigne}>
                    <Text style={styles.foyerNom}>{f.nom}</Text>
                    {!!f.demande && (
                      <Ionicons name="alert-circle" size={15} color={colors.alerte} />
                    )}
                  </View>
                  <Text style={styles.petit}>{f.adresse}</Text>
                  {!!f.notes && <Text style={styles.note}>{f.notes}</Text>}
                </View>

                <View style={styles.bacsLigne}>
                  {f.bacs.map((b) => {
                    const c = categorie(b.categorie);
                    return (
                      <PastilleBac
                        key={b.id}
                        couleur={c.couleur}
                        couleurFond={c.couleurFond}
                        icone={c.icone}
                        taille={22}
                      />
                    );
                  })}
                </View>
              </Pressable>
            ))}

            {foyers.length > 8 && (
              <Text style={styles.petit}>
                + {foyers.length - 8} {t('zones.autresFoyers')}
              </Text>
            )}
          </Carte>

          {/* Action selon l'état */}
          {z.statut === 'A_FAIRE' && (
            <Bouton
              titre={t('zones.demarrer')}
              icone="play-outline"
              onPress={() => demarrer.mutate()}
              charge={demarrer.isPending}
            />
          )}

          {enCours && !saisieOuverte && (
            <Bouton
              titre={t('zones.confirmerCollecte')}
              icone="checkmark-done-outline"
              onPress={() => setSaisieOuverte(true)}
            />
          )}

          {/* Déclaration de fin de zone */}
          {enCours && saisieOuverte && (
            <Carte style={{ gap: espacement.md }}>
              <Text style={styles.titreBloc}>{t('zones.confirmerCollecte')}</Text>
              <Text style={styles.petit}>{t('zones.confirmationAide')}</Text>

              <Champ
                libelle={t('zones.foyersServisLabel')}
                icone="home-outline"
                placeholder={String(foyers.length)}
                keyboardType="number-pad"
                value={foyersServis}
                onChangeText={setFoyersServis}
              />

              <Champ
                libelle={t('zones.commentaire')}
                icone="chatbox-outline"
                placeholder={t('zones.commentairePlaceholder')}
                value={commentaire}
                onChangeText={setCommentaire}
                multiline
              />

              <Bouton
                titre={t('zones.confirmerCollecte')}
                icone="checkmark-done-outline"
                onPress={() => confirmer.mutate()}
                charge={confirmer.isPending}
                desactive={!peutConfirmer}
              />

              <Bouton
                titre={t('commun.annuler')}
                variante="texte"
                onPress={() => setSaisieOuverte(false)}
              />
            </Carte>
          )}

          {terminee && (
            <Carte style={styles.resultat}>
              <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.resultatTitre}>{t('zones.statut.TERMINEE')}</Text>
                <Text style={styles.resultatTexte}>
                  {z.nbFoyersServis} {t('zones.foyersServis')}
                  {z.termineeA ? ` · ${format.heure(z.termineeA)}` : ''}
                </Text>
              </View>
            </Carte>
          )}

        </Contenu>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligneHaut: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  ligneTitre: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titreBloc: { fontSize: 15, fontWeight: '700', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  note: { fontSize: 12, color: colors.alerte, marginTop: 3, fontStyle: 'italic' },

  foyer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingVertical: espacement.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bordure,
  },
  foyerNomLigne: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foyerNom: { fontSize: 14, fontWeight: '600', color: colors.texte },
  bacsLigne: { flexDirection: 'row', gap: 4 },


  resultat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    backgroundColor: colors.primaryClair,
    borderColor: colors.primaryClair,
  },
  resultatTitre: { fontSize: 15, fontWeight: '700', color: colors.primaryTexte },
  resultatTexte: { fontSize: 13, color: colors.primaryTexte, marginTop: 2 },

});
