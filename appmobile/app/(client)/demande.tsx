import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api, type Bac } from '../../src/api';
import { Bouton, Carte, Chargement, Contenu, Ecran, EnTete, PastilleBac } from '../../src/components/ui';
import { colors, espacement } from '../../src/theme';
import { useConfig } from '../../src/config';
import { useI18n } from '../../src/i18n';

/** Ecran 4 des maquettes : "Demander une collecte". */
export default function Demande() {
  const router = useRouter();
  const client = useQueryClient();

  const { categorie, parametre } = useConfig();
  const { t } = useI18n();
  const niveauMax = parametre<number>('bac.niveauMaxTiers', 3);

  const [selection, setSelection] = useState<string[]>([]);
  const [immediate, setImmediate] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const bacs = useQuery({ queryKey: ['mes-bacs'], queryFn: () => api<Bac[]>('/api/bacs/mes-bacs') });

  const envoyer = useMutation({
    mutationFn: () =>
      api('/api/missions/demande', {
        method: 'POST',
        body: { bacIds: selection, immediate },
      }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['mission-en-cours'] });
      router.replace('/(client)/suivi');
    },
    onError: (e) => setErreur(e instanceof Error ? e.message : 'Demande impossible'),
  });

  function basculer(id: string) {
    setErreur(null);
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  return (
    <Ecran bas>
      <EnTete titre={t('demande.titre')} retour />
      <Contenu>
        <Text style={styles.question}>{t('demande.question')}</Text>

        {bacs.isLoading ? (
          <Chargement />
        ) : (
          <View style={{ gap: espacement.sm }}>
            {bacs.data?.map((bac) => {
              const choisi = selection.includes(bac.id);
              const c = categorie(bac.categorie);
              return (
                <Carte
                  key={bac.id}
                  onPress={() => basculer(bac.id)}
                  style={[styles.option, choisi && styles.optionChoisie]}
                >
                  <PastilleBac
                    couleur={c.couleur}
                    couleurFond={c.couleurFond}
                    icone={c.icone}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionNom}>{c.libelle}</Text>
                    <Text style={styles.petit}>
                      {t('bacs.bac')} {bac.numero} · {bac.niveauTiers}/{niveauMax}{' '}
                      {t('bacs.plein')}
                    </Text>
                  </View>
                  <Ionicons
                    name={choisi ? 'checkmark-circle' : 'ellipse-outline'}
                    size={24}
                    color={choisi ? colors.primary : colors.bordure}
                  />
                </Carte>
              );
            })}
          </View>
        )}

        <Text style={styles.titreSection}>{t('demande.typeDemande')}</Text>
        <View style={{ gap: espacement.sm }}>
          {[
            { valeur: true, libelle: t('demande.immediate'), detail: t('demande.immediateDetail') },
            { valeur: false, libelle: t('demande.programmer'), detail: t('demande.programmerDetail') },
          ].map((o) => (
            <Pressable
              key={String(o.valeur)}
              onPress={() => setImmediate(o.valeur)}
              style={styles.radioLigne}
            >
              <Ionicons
                name={immediate === o.valeur ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={immediate === o.valeur ? colors.primary : colors.texteTertiaire}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.radioLibelle}>{o.libelle}</Text>
                <Text style={styles.petit}>{o.detail}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        {!!erreur && <Text style={styles.erreur}>{erreur}</Text>}

        <Bouton
          titre={t('demande.valider')}
          onPress={() => envoyer.mutate()}
          charge={envoyer.isPending}
          desactive={selection.length === 0}
        />
      </Contenu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  question: { fontSize: 15, color: colors.texte, fontWeight: '500' },
  option: { flexDirection: 'row', alignItems: 'center', gap: espacement.md, paddingVertical: espacement.md },
  optionChoisie: { borderColor: colors.primary, borderWidth: 1.5 },
  optionNom: { fontSize: 15, fontWeight: '600', color: colors.texte },
  titreSection: { fontSize: 14, fontWeight: '700', color: colors.texte, marginTop: espacement.sm },
  radioLigne: { flexDirection: 'row', alignItems: 'center', gap: espacement.md, paddingVertical: espacement.sm },
  radioLibelle: { fontSize: 15, color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  erreur: {
    fontSize: 13,
    color: colors.danger,
    backgroundColor: colors.dangerClair,
    padding: espacement.md,
    borderRadius: 8,
  },
});
