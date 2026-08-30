import { useCallback, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../../src/api';
import { useConfig } from '../../src/config';
import { useHorsLigne } from '../../src/hors-ligne';
import { useI18n } from '../../src/i18n';
import { Bouton, Carte, Champ, Ecran, EnTete, Etiquette } from '../../src/components/ui';
import { colors, espacement, rayon } from '../../src/theme';

/** Le code du bac porte la référence client : CG-2026-000001-B1 */
const MOTIF = /^CG-\d{4}-\d{6}-B\d{1,2}$/i;

type Foyer = {
  codeQr: string;
  numero: number;
  categorie: string;
  referenceAbonnement: string;
  abonnementActif: boolean;
  client: {
    adresse: string;
    notes: string | null;
    user: { nom: string; telephone: string };
    quartier: { nom: string; commune: { nom: string } };
  };
};

/**
 * Scan d'un bac chez le client.
 *
 * Le code QR porte la référence d'abonnement : le collecteur sait chez qui il
 * est DÈS LA LECTURE, sans réseau. C'est ce qui rend la collecte hors ligne
 * possible — avec un identifiant opaque, il faudrait interroger le serveur.
 *
 * Hors ligne, on affiche donc ce que le code contient et on enfile l'opération.
 * En ligne, on complète avec le nom du client et ses consignes d'accès.
 */
export default function Scanner() {
  const router = useRouter();
  const { t } = useI18n();
  const { categorie } = useConfig();
  const { enLigne, enfiler, enAttente } = useHorsLigne();

  const [permission, demanderPermission] = useCameraPermissions();
  const [foyer, setFoyer] = useState<Foyer | null>(null);
  const [codeBrut, setCodeBrut] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  // Une caméra déclenche plusieurs lectures par seconde sur le même code :
  // sans verrou, on enfilerait vingt collectes pour un seul bac.
  const verrou = useRef(false);

  const surLecture = useCallback(
    async ({ data }: { data: string }) => {
      if (verrou.current) return;
      verrou.current = true;

      const code = data.trim().toUpperCase();

      if (!MOTIF.test(code)) {
        Alert.alert(t('scan.codeInconnu'), t('scan.codeInconnuDetail'), [
          { text: 'OK', onPress: () => (verrou.current = false) },
        ]);
        return;
      }

      setCodeBrut(code);

      // Hors ligne, le code suffit à travailler : on n'attend pas le serveur.
      if (!enLigne) {
        setFoyer(null);
        return;
      }

      try {
        setFoyer(await api<Foyer>(`/api/bacs/qr/${code}`));
      } catch {
        setFoyer(null);
      }
    },
    [enLigne, t],
  );

  function reprendre() {
    verrou.current = false;
    setFoyer(null);
    setCodeBrut(null);
  }

  async function confirmer() {
    if (!codeBrut) return;
    setEnvoi(true);

    try {
      // Le collecteur ne pese pas : il declare le passage, rien d'autre.
      // Le chargement est pese a l'entrepot, par les trieurs.
      await enfiler('scan_bac', { codeQr: codeBrut });

      Alert.alert(
        t('scan.enregistre'),
        enLigne ? t('scan.enregistreEnLigne') : t('scan.enregistreHorsLigne'),
        [{ text: 'OK', onPress: reprendre }],
      );
    } finally {
      setEnvoi(false);
    }
  }

  // --- Permission -----------------------------------------------------------
  if (!permission) {
    return (
      <Ecran bas>
        <EnTete titre={t('scan.titre')} retour />
      </Ecran>
    );
  }

  if (!permission.granted) {
    return (
      <Ecran bas>
        <EnTete titre={t('scan.titre')} retour />
        <View style={styles.centre}>
          <Ionicons name="camera-outline" size={48} color={colors.texteTertiaire} />
          <Text style={styles.messageCentre}>{t('scan.permissionRequise')}</Text>
          <Bouton titre={t('scan.autoriser')} onPress={demanderPermission} />
        </View>
      </Ecran>
    );
  }

  // --- Après lecture --------------------------------------------------------
  if (codeBrut) {
    const c = foyer ? categorie(foyer.categorie) : null;

    return (
      <Ecran bas>
        <EnTete titre={t('scan.titre')} retour />
        <View style={styles.resultat}>
          <Carte style={{ gap: espacement.md }}>
            <View style={styles.ligneCode}>
              <Ionicons name="qr-code" size={20} color={colors.primary} />
              <Text style={styles.code}>{codeBrut}</Text>
            </View>

            {foyer ? (
              <>
                <View>
                  <Text style={styles.nom}>{foyer.client.user.nom}</Text>
                  <Text style={styles.petit}>
                    {foyer.client.adresse} · {foyer.client.quartier.commune.nom}
                  </Text>
                </View>

                <View style={styles.etiquettes}>
                  {!!c && (
                    <Etiquette
                      texte={`${c.libelle} · ${t('bacs.bac')} ${foyer.numero}`}
                      teinte={c.couleur}
                      fond={c.couleurFond}
                    />
                  )}
                  {!foyer.abonnementActif && (
                    <Etiquette
                      texte={t('scan.abonnementInactif')}
                      teinte={colors.danger}
                      fond={colors.dangerClair}
                    />
                  )}
                </View>

                {!!foyer.client.notes && (
                  <View style={styles.consignes}>
                    <Ionicons name="information-circle" size={15} color={colors.alerte} />
                    <Text style={styles.consignesTexte}>{foyer.client.notes}</Text>
                  </View>
                )}
              </>
            ) : (
              // Hors ligne : le code identifie le foyer, le nom viendra à la
              // synchronisation. On ne bloque pas la collecte pour si peu.
              <View style={styles.horsLigne}>
                <Ionicons name="cloud-offline-outline" size={18} color={colors.texteSecondaire} />
                <Text style={styles.horsLigneTexte}>
                  {enLigne ? t('scan.foyerIntrouvable') : t('scan.modeHorsLigne')}
                </Text>
              </View>
            )}
          </Carte>

          <View style={{ flex: 1 }} />

          <Bouton
            titre={t('scan.confirmerCollecte')}
            icone="checkmark-done-outline"
            onPress={confirmer}
            charge={envoi}
          />
          <Bouton titre={t('scan.scannerAutre')} variante="contour" onPress={reprendre} />
        </View>
      </Ecran>
    );
  }

  // --- Caméra ---------------------------------------------------------------
  return (
    <Ecran bas>
      <EnTete
        titre={t('scan.titre')}
        sousTitre={enLigne ? undefined : t('scan.modeHorsLigne')}
        retour
        action={
          enAttente.length > 0 ? (
            <Etiquette
              texte={`${enAttente.length} ${t('scan.enAttente')}`}
              teinte={colors.alerte}
              fond={colors.alerteClair}
            />
          ) : undefined
        }
      />

      <View style={styles.camera}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={surLecture}
        />

        {/* Cadre de visée : sans repère, on ne sait pas où présenter le bac. */}
        <View style={styles.viseur} pointerEvents="none">
          <View style={styles.cadre} />
          <Text style={styles.consigne}>{t('scan.presenterCode')}</Text>
        </View>
      </View>

      <Pressable style={styles.saisieManuelle} onPress={() => setCodeBrut('')}>
        <Ionicons name="create-outline" size={16} color={colors.primary} />
        <Text style={styles.saisieManuelleTexte}>{t('scan.saisirManuellement')}</Text>
      </Pressable>
    </Ecran>
  );
}

const styles = StyleSheet.create({
  centre: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacement.lg,
    padding: espacement.xl,
  },
  messageCentre: {
    fontSize: 14,
    color: colors.texteSecondaire,
    textAlign: 'center',
    lineHeight: 20,
  },

  camera: { flex: 1, margin: espacement.lg, borderRadius: rayon.lg, overflow: 'hidden' },
  viseur: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: espacement.lg },
  cadre: {
    width: 220,
    height: 220,
    borderWidth: 3,
    borderColor: colors.blanc,
    borderRadius: rayon.lg,
    backgroundColor: 'transparent',
  },
  consigne: {
    fontSize: 14,
    color: colors.blanc,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: espacement.lg,
    paddingVertical: 8,
    borderRadius: rayon.plein,
  },

  saisieManuelle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: espacement.md,
  },
  saisieManuelleTexte: { fontSize: 13, fontWeight: '600', color: colors.primary },

  resultat: { flex: 1, padding: espacement.lg, gap: espacement.md },
  ligneCode: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  code: { fontSize: 15, fontWeight: '800', color: colors.texte, letterSpacing: 0.5 },
  nom: { fontSize: 17, fontWeight: '700', color: colors.texte },
  petit: { fontSize: 12, color: colors.texteSecondaire, marginTop: 2 },
  etiquettes: { flexDirection: 'row', gap: espacement.sm, flexWrap: 'wrap' },

  consignes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: colors.alerteClair,
    padding: espacement.md,
    borderRadius: rayon.sm,
  },
  consignesTexte: { flex: 1, fontSize: 13, color: colors.texte },

  horsLigne: { flexDirection: 'row', alignItems: 'center', gap: espacement.sm },
  horsLigneTexte: { flex: 1, fontSize: 13, color: colors.texteSecondaire },
});
