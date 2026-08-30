import { useEffect, useRef, useState } from 'react';
import {
  Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Conversation } from '../../../src/api';
import { choisirPhoto, televerser } from '../../../src/photos';
import { Chargement, Ecran, EnTete, Etiquette } from '../../../src/components/ui';
import { colors, espacement, rayon } from '../../../src/theme';
import { useI18n, useFormat } from '../../../src/i18n';

/**
 * Le fil d'une demande.
 *
 * Les messages du client sont alignes a droite, ceux du service client a
 * gauche : c'est la convention de toutes les messageries, et elle evite d'avoir
 * a lire un nom pour savoir qui parle.
 */
export default function FilSupport() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const client = useQueryClient();
  const { t } = useI18n();
  const format = useFormat();

  const [texte, setTexte] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const defilement = useRef<ScrollView>(null);

  const fil = useQuery({
    queryKey: ['support', id],
    queryFn: () => api<Conversation>(`/api/support/conversations/${id}`),
    refetchInterval: 20_000,
  });

  // Le dernier message doit etre visible sans avoir a faire defiler.
  useEffect(() => {
    if (fil.data) {
      setTimeout(() => defilement.current?.scrollToEnd({ animated: false }), 50);
    }
  }, [fil.data?.messages.length]);

  const repondre = useMutation({
    mutationFn: async () => {
      let photoUrl: string | undefined;
      if (photo) photoUrl = (await televerser(photo, 'support')) ?? undefined;

      return api<Conversation>(`/api/support/conversations/${id}/messages`, {
        method: 'POST',
        body: { texte: texte.trim(), photoUrl },
      });
    },
    onSuccess: (misAJour) => {
      client.setQueryData(['support', id], misAJour);
      client.invalidateQueries({ queryKey: ['support', 'mes-conversations'] });
      setTexte('');
      setPhoto(null);
    },
  });

  if (fil.isLoading || !fil.data) {
    return (
      <Ecran bas>
        <EnTete titre={t('support.titre')} retour />
        <Chargement texte={t('commun.chargement')} />
      </Ecran>
    );
  }

  const c = fil.data;
  const resolue = c.statut === 'RESOLUE';

  return (
    <Ecran bas>
      <EnTete titre={c.reference} sousTitre={t(`support.motif.${c.motif}`)} retour />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          ref={defilement}
          contentContainerStyle={styles.fil}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.entete}>
            <Text style={styles.sujet}>{c.sujet}</Text>
            <Etiquette
              texte={t(`support.statut.${c.statut}`)}
              teinte={resolue ? colors.texteSecondaire : colors.primaryTexte}
              fond={resolue ? colors.surfaceAlt : colors.primaryClair}
            />
          </View>

          {c.messages.map((m) => {
            const aMoi = m.emetteur === 'CLIENT';
            return (
              <View
                key={m.id}
                style={[styles.bulle, aMoi ? styles.bulleMoi : styles.bulleSupport]}
              >
                {!aMoi && <Text style={styles.auteur}>{m.auteur ?? t('support.serviceClient')}</Text>}

                {!!m.photoUrl && (
                  <Image source={{ uri: m.photoUrl }} style={styles.photoMessage} />
                )}

                <Text style={[styles.texte, aMoi && styles.texteMoi]}>{m.texte}</Text>
                <Text style={[styles.heure, aMoi && styles.heureMoi]}>
                  {format.heure(m.createdAt)}
                </Text>
              </View>
            );
          })}

          {resolue && <Text style={styles.clos}>{t('support.filResolu')}</Text>}
        </ScrollView>

        {/* Barre de saisie : toujours accessible, meme sur un fil resolu —
            repondre le rouvre, c'est le comportement attendu quand le probleme
            revient. */}
        <View style={styles.barre}>
          {!!photo && (
            <View style={styles.apercuLigne}>
              <Image source={{ uri: photo }} style={styles.apercu} />
              <Pressable onPress={() => setPhoto(null)} hitSlop={10}>
                <Ionicons name="close-circle" size={20} color={colors.texteTertiaire} />
              </Pressable>
            </View>
          )}

          <View style={styles.saisieLigne}>
            <Pressable
              onPress={async () => setPhoto(await choisirPhoto())}
              hitSlop={8}
              accessibilityLabel={t('support.joindrePhoto')}
              style={styles.boutonPhoto}
            >
              <Ionicons name="image-outline" size={22} color={colors.texteSecondaire} />
            </Pressable>

            <View style={styles.champ}>
              <TextInput
                value={texte}
                onChangeText={setTexte}
                placeholder={t('support.repondre')}
                placeholderTextColor={colors.texteTertiaire}
                multiline
                style={styles.saisie}
              />
            </View>

            <Pressable
              onPress={() => repondre.mutate()}
              disabled={texte.trim().length === 0 || repondre.isPending}
              hitSlop={8}
              accessibilityLabel={t('support.envoyer')}
              style={[
                styles.boutonEnvoi,
                (texte.trim().length === 0 || repondre.isPending) && styles.boutonEnvoiInactif,
              ]}
            >
              <Ionicons name="send" size={18} color={colors.blanc} />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  fil: { padding: espacement.md, gap: espacement.sm, paddingBottom: espacement.lg },
  entete: {
    gap: espacement.sm,
    paddingBottom: espacement.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.bordure,
  },
  sujet: { fontSize: 15, fontWeight: '700', color: colors.texte },

  bulle: { maxWidth: '85%', padding: espacement.md, borderRadius: rayon.lg, gap: 4 },
  bulleMoi: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  bulleSupport: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.bordure,
  },
  auteur: { fontSize: 11, fontWeight: '700', color: colors.primary },
  texte: { fontSize: 14, color: colors.texte },
  texteMoi: { color: colors.blanc },
  heure: { fontSize: 10, color: colors.texteTertiaire, alignSelf: 'flex-end' },
  heureMoi: { color: 'rgba(255,255,255,0.75)' },
  photoMessage: { width: 200, height: 150, borderRadius: rayon.md, marginBottom: 4 },
  clos: { fontSize: 12, color: colors.texteSecondaire, textAlign: 'center', marginTop: espacement.md },

  barre: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.bordure,
    backgroundColor: colors.surface,
    padding: espacement.sm,
    gap: espacement.sm,
  },
  apercuLigne: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  apercu: { width: 48, height: 48, borderRadius: rayon.sm },
  saisieLigne: { flexDirection: 'row', alignItems: 'flex-end', gap: espacement.sm },
  boutonPhoto: { paddingBottom: 8 },
  champ: {
    flex: 1,
    maxHeight: 120,
    borderRadius: rayon.lg,
    borderWidth: 1,
    borderColor: colors.bordure,
    paddingHorizontal: espacement.md,
    backgroundColor: colors.fond,
  },
  saisie: { fontSize: 14, color: colors.texte, paddingVertical: espacement.sm },
  boutonEnvoi: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boutonEnvoiInactif: { opacity: 0.4 },
});
