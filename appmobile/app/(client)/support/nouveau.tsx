import { useState } from 'react';
import {
  Alert, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Conversation, type MotifSupport } from '../../../src/api';
import { choisirPhoto, prendrePhoto, televerser } from '../../../src/photos';
import { Bouton, Carte, Champ, Contenu, Ecran, EnTete } from '../../../src/components/ui';
import { colors, espacement, rayon } from '../../../src/theme';
import { useI18n } from '../../../src/i18n';

/**
 * Nouvelle demande.
 *
 * Le motif est choisi dans une liste courte : il sert a router la demande au
 * back-office, pas a la decrire. Le detail tient dans le message, et une photo
 * dit souvent en une seconde ce qu'un paragraphe explique mal — un bac casse,
 * un depot sauvage, une facture contestee.
 */

const MOTIFS: { code: MotifSupport; icone: keyof typeof Ionicons.glyphMap }[] = [
  { code: 'INCIDENT_COLLECTE', icone: 'alert-circle-outline' },
  { code: 'BAC', icone: 'trash-outline' },
  { code: 'FACTURATION', icone: 'card-outline' },
  { code: 'ABONNEMENT', icone: 'repeat-outline' },
  { code: 'RECLAMATION', icone: 'sad-outline' },
  { code: 'AUTRE', icone: 'chatbubble-ellipses-outline' },
];

export default function NouvelleDemande() {
  const router = useRouter();
  const client = useQueryClient();
  const { t } = useI18n();

  const [motif, setMotif] = useState<MotifSupport | null>(null);
  const [texte, setTexte] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [envoiPhoto, setEnvoiPhoto] = useState(false);

  const envoyer = useMutation({
    mutationFn: async () => {
      // La photo part d'abord : sans son URL, le message n'aurait rien a citer.
      let photoUrl: string | undefined;
      if (photo) {
        setEnvoiPhoto(true);
        photoUrl = (await televerser(photo, 'support')) ?? undefined;
        setEnvoiPhoto(false);
      }

      return api<Conversation>('/api/support/conversations', {
        method: 'POST',
        body: { motif, texte: texte.trim(), photoUrl },
      });
    },
    onSuccess: (conversation) => {
      client.invalidateQueries({ queryKey: ['support'] });
      router.replace(`/(client)/support/${conversation.id}`);
    },
    onError: (e) =>
      Alert.alert(t('support.echecEnvoi'), e instanceof Error ? e.message : ''),
  });

  async function ajouterPhoto() {
    Alert.alert(t('support.photo'), t('support.photoChoix'), [
      { text: t('support.appareilPhoto'), onPress: async () => setPhoto(await prendrePhoto()) },
      { text: t('support.galerie'), onPress: async () => setPhoto(await choisirPhoto()) },
      { text: t('commun.annuler'), style: 'cancel' },
    ]);
  }

  const pret = motif !== null && texte.trim().length > 2;

  return (
    <Ecran bas>
      <EnTete titre={t('support.nouveau')} retour />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Contenu>
          <Text style={styles.libelleGroupe}>{t('support.motifQuestion')}</Text>

          <View style={styles.motifs}>
            {MOTIFS.map((m) => {
              const actif = motif === m.code;
              return (
                <Pressable
                  key={m.code}
                  onPress={() => setMotif(m.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: actif }}
                  style={[styles.motif, actif && styles.motifActif]}
                >
                  <Ionicons
                    name={m.icone}
                    size={18}
                    color={actif ? colors.primary : colors.texteTertiaire}
                  />
                  <Text style={[styles.motifTexte, actif && styles.motifTexteActif]}>
                    {t(`support.motif.${m.code}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Champ
            libelle={t('support.votreMessage')}
            placeholder={t('support.messagePlaceholder')}
            value={texte}
            onChangeText={setTexte}
            multiline
            style={styles.zoneTexte}
          />

          {photo ? (
            <Carte style={styles.apercu}>
              <Image source={{ uri: photo }} style={styles.image} />
              <Pressable
                onPress={() => setPhoto(null)}
                hitSlop={10}
                accessibilityLabel={t('support.retirerPhoto')}
                style={styles.retirer}
              >
                <Ionicons name="close" size={16} color={colors.blanc} />
              </Pressable>
            </Carte>
          ) : (
            <Bouton
              titre={t('support.joindrePhoto')}
              variante="contour"
              icone="camera-outline"
              onPress={ajouterPhoto}
            />
          )}

          <Bouton
            titre={envoiPhoto ? t('support.envoiPhoto') : t('support.envoyer')}
            icone="send-outline"
            onPress={() => envoyer.mutate()}
            charge={envoyer.isPending}
            desactive={!pret}
          />

          <Text style={styles.note}>{t('support.delaiReponse')}</Text>
        </Contenu>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  libelleGroupe: { fontSize: 13, fontWeight: '600', color: colors.texteSecondaire },
  motifs: { flexDirection: 'row', flexWrap: 'wrap', gap: espacement.sm },
  motif: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: espacement.sm,
    paddingHorizontal: espacement.md,
    borderRadius: rayon.plein,
    borderWidth: 1,
    borderColor: colors.bordure,
    backgroundColor: colors.surface,
  },
  motifActif: { borderColor: colors.primary, backgroundColor: colors.primaryClair },
  motifTexte: { fontSize: 13, color: colors.texteSecondaire },
  motifTexteActif: { color: colors.primaryTexte, fontWeight: '700' },
  zoneTexte: { minHeight: 120, textAlignVertical: 'top', paddingTop: espacement.md },
  apercu: { padding: espacement.sm },
  image: { width: '100%', height: 180, borderRadius: rayon.md },
  retirer: {
    position: 'absolute',
    top: espacement.md,
    right: espacement.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: { fontSize: 12, color: colors.texteSecondaire, textAlign: 'center' },
});
