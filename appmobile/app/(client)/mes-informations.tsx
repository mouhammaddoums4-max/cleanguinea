import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/api';
import { useI18n } from '../../src/i18n';
import { relevePosition } from '../../src/geo';
import { Bouton, Carte, Champ, Chargement, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useEcranProtege } from '../../src/securite';

type Moi = {
  utilisateur: { nom: string; telephone: string; email: string | null };
  client: {
    adresse: string;
    notes: string | null;
    nbPersonnes: number;
    latitude: number | null;
    longitude: number | null;
  } | null;
};

/** Modification des informations personnelles et de la position du domicile. */
export default function MesInformations() {
  // Ecran sensible : ni capture, ni apercu dans les applications recentes.
  useEcranProtege();
  const client = useQueryClient();
  const { t } = useI18n();

  const moi = useQuery({ queryKey: ['moi'], queryFn: () => api<Moi>('/api/auth/moi') });

  const [f, setF] = useState({ nom: '', email: '', adresse: '', notes: '', nbPersonnes: '' });
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [modifie, setModifie] = useState(false);

  // Le formulaire est initialisé une fois les données chargées.
  useEffect(() => {
    if (!moi.data) return;
    setF({
      nom: moi.data.utilisateur.nom,
      email: moi.data.utilisateur.email ?? '',
      adresse: moi.data.client?.adresse ?? '',
      notes: moi.data.client?.notes ?? '',
      nbPersonnes: String(moi.data.client?.nbPersonnes ?? ''),
    });
    if (moi.data.client?.latitude != null && moi.data.client.longitude != null) {
      setPosition({
        latitude: moi.data.client.latitude,
        longitude: moi.data.client.longitude,
      });
    }
  }, [moi.data]);

  const maj = (cle: keyof typeof f) => (v: string) => {
    setF((p) => ({ ...p, [cle]: v }));
    setModifie(true);
  };

  const localiser = useMutation({
    mutationFn: relevePosition,
    onSuccess: (p) => {
      if (!p) {
        Alert.alert(t('inscriptionGeo.titre'), t('inscriptionGeo.refusee'));
        return;
      }
      setPosition(p);
      setModifie(true);
    },
  });

  const enregistrer = useMutation({
    mutationFn: () =>
      api('/api/compte/profil', {
        method: 'PATCH',
        body: {
          nom: f.nom.trim(),
          email: f.email.trim() || null,
          adresse: f.adresse.trim(),
          notes: f.notes.trim() || null,
          nbPersonnes: Number(f.nbPersonnes) || undefined,
          ...(position ?? {}),
        },
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['moi'] });
      setModifie(false);
      Alert.alert(t('infos.enregistre'));
    },
    onError: (e) => Alert.alert(t('infos.echec'), e instanceof Error ? e.message : ''),
  });

  if (moi.isLoading) {
    return (
      <Ecran bas>
        <EnTete titre={t('profil.mesInformations')} retour />
        <Chargement texte={t('commun.chargement')} />
      </Ecran>
    );
  }

  return (
    <Ecran bas>
      <EnTete titre={t('profil.mesInformations')} retour />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Contenu>
          <Carte style={{ gap: espacement.md }}>
            <Champ
              libelle={t('inscription.nomComplet')}
              icone="person-outline"
              value={f.nom}
              onChangeText={maj('nom')}
            />

            {/* Le téléphone identifie le compte : il se change auprès du service
                client, pas ici, sinon on perdrait le canal des SMS. */}
            <View>
              <Champ
                libelle={t('inscription.telephone')}
                icone="call-outline"
                value={moi.data?.utilisateur.telephone ?? ''}
                editable={false}
              />
              <Text style={styles.note}>{t('infos.telephoneFige')}</Text>
            </View>

            <Champ
              libelle={t('inscription.email')}
              icone="mail-outline"
              keyboardType="email-address"
              autoCapitalize="none"
              value={f.email}
              onChangeText={maj('email')}
            />
          </Carte>

          <Carte style={{ gap: espacement.md }}>
            <Text style={styles.titreBloc}>{t('infos.domicile')}</Text>

            <Champ
              libelle={t('inscription.adresse')}
              icone="location-outline"
              value={f.adresse}
              onChangeText={maj('adresse')}
            />

            <Champ
              libelle={t('infos.consignes')}
              icone="chatbox-outline"
              placeholder={t('infos.consignesPlaceholder')}
              value={f.notes}
              onChangeText={maj('notes')}
              multiline
            />

            <Champ
              libelle={t('infos.nbPersonnes')}
              icone="people-outline"
              keyboardType="number-pad"
              value={f.nbPersonnes}
              onChangeText={maj('nbPersonnes')}
            />

            {/* La position sert au collecteur à trouver la porte : l'adresse
                seule est souvent trop imprécise. */}
            <View style={styles.position}>
              <Ionicons
                name={position ? 'location' : 'location-outline'}
                size={18}
                color={position ? colors.primary : colors.texteTertiaire}
              />
              <Text style={styles.positionTexte}>
                {position
                  ? `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
                  : t('infos.aucunePosition')}
              </Text>
            </View>

            <Bouton
              titre={t('inscriptionGeo.utiliserPosition')}
              variante="contour"
              icone="navigate-outline"
              charge={localiser.isPending}
              onPress={() => localiser.mutate()}
            />

            <Text style={styles.aide}>{t('inscriptionGeo.aide')}</Text>
          </Carte>

          <Bouton
            titre={t('commun.enregistrer')}
            onPress={() => enregistrer.mutate()}
            charge={enregistrer.isPending}
            desactive={!modifie || !f.nom.trim() || !f.adresse.trim()}
          />
        </Contenu>
      </KeyboardAvoidingView>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  titreBloc: { fontSize: 15, fontWeight: '700', color: colors.texte },
  note: { fontSize: 11, color: colors.texteTertiaire, marginTop: 4 },
  aide: { fontSize: 12, color: colors.texteSecondaire, lineHeight: 17 },
  position: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  positionTexte: { fontSize: 13, color: colors.texteSecondaire },
});
