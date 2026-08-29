import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';

import { api, type Mission, type StatutMission } from '../../../src/api';
import {
  Bouton, Carte, Champ, Chargement, Contenu, Ecran, EnTete, Etiquette, PastilleBac,
} from '../../../src/components/ui';
import { colors, espacement, formaterHeure } from '../../../src/theme';
import { useConfig } from '../../../src/config';

/** Ecrans 3 et 4 de l'application collecteur : detail de mission puis pesee. */
const SUIVANT: Partial<Record<StatutMission, { statut: StatutMission; libelle: string }>> = {
  EN_ATTENTE: { statut: 'ACCEPTEE', libelle: 'Accepter la mission' },
  ACCEPTEE: { statut: 'EN_ROUTE', libelle: 'Démarrer la mission' },
  EN_ROUTE: { statut: 'ARRIVE', libelle: 'Je suis arrivé' },
};

export default function DetailMission() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const client = useQueryClient();

  const [poids, setPoids] = useState('');

  const mission = useQuery({
    queryKey: ['mission', id],
    queryFn: () => api<Mission>(`/api/missions/${id}`),
  });

  function invalider() {
    client.invalidateQueries({ queryKey: ['mission', id] });
    client.invalidateQueries({ queryKey: ['mes-missions'] });
  }

  const avancer = useMutation({
    mutationFn: (statut: StatutMission) =>
      api(`/api/missions/${id}/statut`, { method: 'PATCH', body: { statut, etaMinutes: 12 } }),
    onSuccess: invalider,
    onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Action impossible'),
  });

  const confirmer = useMutation({
    mutationFn: () => {
      const bac = mission.data?.bacs[0]?.bac;
      return api<{ pointsCredites: number }>(`/api/missions/${id}/collecte`, {
        method: 'POST',
        body: {
          // clientRef rend l'envoi idempotent : si le reseau coupe et que le
          // collecteur reessaie, la collecte n'est pas comptee deux fois.
          clientRef: Crypto.randomUUID(),
          pesees: [
            {
              bacId: bac?.id,
              categorie: bac?.categorie ?? 'AUTRES',
              poidsKg: Number(poids.replace(',', '.')),
            },
          ],
        },
      });
    },
    onSuccess: (rep) => {
      invalider();
      Alert.alert(
        'Collecte confirmée',
        `${poids} kg enregistrés. ${rep.pointsCredites} points crédités au client.`,
        [{ text: 'OK', onPress: () => router.back() }],
      );
    },
    onError: (e) => Alert.alert('Erreur', e instanceof Error ? e.message : 'Envoi impossible'),
  });

  if (mission.isLoading || !mission.data) {
    return (
      <Ecran bas>
        <EnTete titre="Détail mission" retour />
        <Chargement />
      </Ecran>
    );
  }

  const m = mission.data;
  const etape = SUIVANT[m.statut];
  const poidsValide = Number(poids.replace(',', '.')) > 0;

  return (
    <Ecran bas>
      <EnTete titre="Détail mission" sousTitre={m.reference} retour />
      <Contenu>
        <View style={styles.ligneHaut}>
          <Text style={styles.heure}>{formaterHeure(m.datePlanifiee)}</Text>
          <Etiquette texte={libelleStatut(m.statut)} />
        </View>

        {/* Client */}
        <Carte>
          <View style={styles.ligneClient}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom}>{m.client.user.nom}</Text>
              <Text style={styles.petit}>{m.client.user.telephone}</Text>
            </View>
          </View>
          <View style={styles.lignePosition}>
            <Ionicons name="location-outline" size={16} color={colors.texteSecondaire} />
            <Text style={styles.adresse}>
              {m.client.adresse} · {m.client.quartier.commune.nom}
            </Text>
          </View>
        </Carte>

        {/* Bacs a collecter */}
        <Carte style={{ gap: espacement.sm }}>
          <Text style={styles.libelle}>Bac(s) à collecter</Text>
          {m.bacs.map(({ bac }) => (
            <View key={bac.id} style={styles.ligneBac}>
              <PastilleBac categorie={bac.categorie} taille={32} />
              <View style={{ flex: 1 }}>
                <Text style={styles.bacNom}>
                  {couleursCategorie[bac.categorie]?.libelle ?? bac.categorie}
                </Text>
                <Text style={styles.petit}>Bac {bac.numero} · {bac.codeQr}</Text>
              </View>
            </View>
          ))}
        </Carte>

        {/* Notes du client */}
        {!!m.client.notes && (
          <Carte style={styles.notes}>
            <Text style={styles.libelle}>Notes client</Text>
            <Text style={styles.notesTexte}>{m.client.notes}</Text>
          </Carte>
        )}

        {/* Action selon l'etape */}
        {etape && (
          <Bouton
            titre={etape.libelle}
            onPress={() => avancer.mutate(etape.statut)}
            charge={avancer.isPending}
          />
        )}

        {/* Pesee : disponible une fois arrive sur place */}
        {m.statut === 'ARRIVE' && (
          <Carte style={{ gap: espacement.md }}>
            <Text style={styles.libelle}>Pesée</Text>
            <Champ
              libelle="Poids (kg)"
              icone="scale-outline"
              placeholder="0.0"
              keyboardType="decimal-pad"
              value={poids}
              onChangeText={setPoids}
            />
            <Text style={styles.petit}>
              Poids relevé sur la balance. Photographiez le bac avant de confirmer.
            </Text>
            <Bouton
              titre="Confirmer la collecte"
              onPress={() => confirmer.mutate()}
              charge={confirmer.isPending}
              desactive={!poidsValide}
            />
          </Carte>
        )}

        {m.statut === 'TERMINEE' && (
          <Carte style={styles.termine}>
            <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            <Text style={styles.termineTexte}>
              Mission terminée · {m.poidsTotalKg} kg collectés
            </Text>
          </Carte>
        )}

        {!['TERMINEE', 'ANNULEE'].includes(m.statut) && (
          <Bouton
            titre="Annuler la mission"
            variante="texte"
            onPress={() =>
              Alert.alert('Annuler', 'Confirmer l’annulation de cette mission ?', [
                { text: 'Non', style: 'cancel' },
                { text: 'Oui', style: 'destructive', onPress: () => avancer.mutate('ANNULEE') },
              ])
            }
          />
        )}
      </Contenu>
    </Ecran>
  );
}

function libelleStatut(statut: StatutMission) {
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
  ligneHaut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heure: { fontSize: 20, fontWeight: '800', color: colors.primary },
  ligneClient: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nom: { fontSize: 15, fontWeight: '600', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  lignePosition: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: espacement.md,
  },
  adresse: { flex: 1, fontSize: 13, color: colors.texteSecondaire },
  libelle: { fontSize: 12, color: colors.texteSecondaire },
  ligneBac: { flexDirection: 'row', alignItems: 'center', gap: espacement.md },
  bacNom: { fontSize: 14, fontWeight: '600', color: colors.texte },
  notes: { backgroundColor: colors.alerteClair, borderColor: colors.alerteClair },
  notesTexte: { fontSize: 14, color: colors.texte, marginTop: 4 },
  termine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.sm,
    backgroundColor: colors.primaryClair,
    borderColor: colors.primaryClair,
  },
  termineTexte: { fontSize: 14, fontWeight: '600', color: colors.primaryTexte },
});
