import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '../../src/i18n';
import { Carte, Contenu, Ecran, EnTete } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';

const CLE = 'cleanguinea.notifications';

type Preferences = {
  passagePrevu: boolean;
  collecteurEnRoute: boolean;
  collecteTerminee: boolean;
  rappelPaiement: boolean;
  pointsClean: boolean;
};

const DEFAUTS: Preferences = {
  passagePrevu: true,
  collecteurEnRoute: true,
  collecteTerminee: true,
  // Les rappels de paiement ne se désactivent pas : un impayé suspend le service.
  rappelPaiement: true,
  pointsClean: true,
};

/**
 * Préférences de notification.
 *
 * Stockées sur l'appareil pour l'instant. Quand les notifications push seront
 * branchées, ces mêmes clés partiront au serveur — d'où la forme d'objet plutôt
 * que cinq booléens séparés.
 */
export default function Notifications() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<Preferences>(DEFAUTS);

  useEffect(() => {
    AsyncStorage.getItem(CLE)
      .then((v) => v && setPrefs({ ...DEFAUTS, ...JSON.parse(v) }))
      .catch(() => {
        // Préférences illisibles : on garde les valeurs par défaut.
      });
  }, []);

  function basculer(cle: keyof Preferences) {
    const suivant = { ...prefs, [cle]: !prefs[cle] };
    setPrefs(suivant);
    AsyncStorage.setItem(CLE, JSON.stringify(suivant)).catch(() => {});
  }

  const lignes: {
    cle: keyof Preferences;
    icone: keyof typeof Ionicons.glyphMap;
    libelle: string;
    detail: string;
    verrouille?: boolean;
  }[] = [
    {
      cle: 'passagePrevu',
      icone: 'calendar-outline',
      libelle: t('notifs.passagePrevu'),
      detail: t('notifs.passagePrevuDetail'),
    },
    {
      cle: 'collecteurEnRoute',
      icone: 'navigate-outline',
      libelle: t('notifs.collecteurEnRoute'),
      detail: t('notifs.collecteurEnRouteDetail'),
    },
    {
      cle: 'collecteTerminee',
      icone: 'checkmark-done-outline',
      libelle: t('notifs.collecteTerminee'),
      detail: t('notifs.collecteTermineeDetail'),
    },
    {
      cle: 'pointsClean',
      icone: 'leaf-outline',
      libelle: t('notifs.pointsClean'),
      detail: t('notifs.pointsCleanDetail'),
    },
    {
      cle: 'rappelPaiement',
      icone: 'card-outline',
      libelle: t('notifs.rappelPaiement'),
      detail: t('notifs.rappelPaiementDetail'),
      verrouille: true,
    },
  ];

  return (
    <Ecran bas>
      <EnTete titre={t('profil.notifications')} retour />
      <Contenu>
        <Carte style={{ padding: 0, overflow: 'hidden' }}>
          {lignes.map((l, i) => (
            <View key={l.cle} style={[styles.ligne, i > 0 && styles.separateur]}>
              <View style={styles.icone}>
                <Ionicons name={l.icone} size={17} color={colors.texteSecondaire} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.libelle}>{l.libelle}</Text>
                <Text style={styles.detail}>{l.detail}</Text>
              </View>

              <Switch
                value={prefs[l.cle]}
                onValueChange={() => basculer(l.cle)}
                disabled={l.verrouille}
                trackColor={{ true: colors.primary, false: colors.bordure }}
                thumbColor={colors.blanc}
              />
            </View>
          ))}
        </Carte>

        <View style={styles.avis}>
          <Ionicons name="information-circle-outline" size={15} color={colors.texteTertiaire} />
          <Text style={styles.avisTexte}>{t('notifs.avisSms')}</Text>
        </View>
      </Contenu>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  ligne: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacement.md,
    paddingHorizontal: espacement.lg,
    paddingVertical: espacement.md,
  },
  separateur: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.bordure },
  icone: {
    width: 32,
    height: 32,
    borderRadius: rayon.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libelle: { fontSize: 15, color: colors.texte },
  detail: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  avis: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  avisTexte: { flex: 1, fontSize: 12, color: colors.texteTertiaire, lineHeight: 17 },
});
