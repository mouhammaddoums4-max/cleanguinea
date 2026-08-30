import { useEffect, useRef, useState } from 'react';
import {
  ImageBackground, Pressable, ScrollView, StyleSheet, Text, View,
  useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';

import { api } from '../api';
import { useConfig } from '../config';
import { useI18n } from '../i18n';
import { useResponsive } from '../responsive';
import { colors, espacement, rayon } from '../theme';

export type Banniere = {
  id: string;
  titre: string;
  sousTitre: string | null;
  imageUrl: string | null;
  couleur: string;
  lien: string | null;
  libelleAction: string | null;
};

const HAUTEUR = 132;

/**
 * Carrousel de bannières de l'accueil.
 *
 * Le contenu vient de l'API : le back-office pilote les campagnes sans qu'on
 * republie l'application. Les vues et les clics sont remontés, sinon personne
 * ne saura si une bannière sert à quelque chose.
 */
export function Bannieres() {
  const router = useRouter();
  const { t, langue } = useI18n();
  const { parametre } = useConfig();
  const r = useResponsive();
  const { width } = useWindowDimensions();

  const [actif, setActif] = useState(0);
  const defilement = useRef<ScrollView>(null);
  const vues = useRef(new Set<string>());

  const requete = useQuery({
    queryKey: ['bannieres', langue],
    queryFn: () => api<Banniere[]>(`/api/bannieres?langue=${langue}`, { sansAuth: true }),
    staleTime: 5 * 60 * 1000,
  });

  const bannieres = requete.data ?? [];
  const largeur = width - r.marge * 2;
  const rotation = parametre<number>('banniere.rotationSecondes', 6);

  // Rotation automatique. On s'arrête à une seule bannière : faire défiler
  // un élément unique donnerait une impression de bug.
  useEffect(() => {
    if (bannieres.length < 2) return;

    const minuterie = setInterval(() => {
      setActif((courant) => {
        const suivant = (courant + 1) % bannieres.length;
        defilement.current?.scrollTo({ x: suivant * largeur, animated: true });
        return suivant;
      });
    }, rotation * 1000);

    return () => clearInterval(minuterie);
  }, [bannieres.length, largeur, rotation]);

  // Une vue n'est comptée qu'une fois par session et par bannière.
  useEffect(() => {
    const banniere = bannieres[actif];
    if (!banniere || vues.current.has(banniere.id)) return;
    vues.current.add(banniere.id);
    api(`/api/bannieres/${banniere.id}/vue`, { method: 'POST', sansAuth: true }).catch(() => {});
  }, [actif, bannieres]);

  if (bannieres.length === 0) return null;

  function ouvrir(banniere: Banniere) {
    api(`/api/bannieres/${banniere.id}/clic`, { method: 'POST', sansAuth: true }).catch(() => {});
    if (!banniere.lien) return;

    // Une route interne commence par « / », tout le reste part au navigateur.
    if (banniere.lien.startsWith('/')) router.push(banniere.lien as never);
    else Linking.openURL(banniere.lien).catch(() => {});
  }

  function surDefilement(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setActif(Math.round(e.nativeEvent.contentOffset.x / largeur));
  }

  return (
    <View style={{ gap: espacement.sm }}>
      <ScrollView
        ref={defilement}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={surDefilement}
        style={{ height: HAUTEUR }}
      >
        {bannieres.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => ouvrir(b)}
            style={{ width: largeur }}
            accessibilityRole="button"
            accessibilityLabel={b.titre}
          >
            <CorpsBanniere banniere={b} action={b.libelleAction ?? t('commun.voirPlus')} />
          </Pressable>
        ))}
      </ScrollView>

      {bannieres.length > 1 && (
        <View style={styles.points}>
          {bannieres.map((b, i) => (
            <View key={b.id} style={[styles.point, i === actif && styles.pointActif]} />
          ))}
        </View>
      )}
    </View>
  );
}

function CorpsBanniere({ banniere, action }: { banniere: Banniere; action: string }) {
  const contenu = (
    <View style={styles.contenu}>
      <Text style={styles.titre} numberOfLines={2}>
        {banniere.titre}
      </Text>
      {!!banniere.sousTitre && (
        <Text style={styles.sousTitre} numberOfLines={2}>
          {banniere.sousTitre}
        </Text>
      )}
      {!!banniere.lien && (
        <View style={styles.action}>
          <Text style={styles.actionTexte}>{action}</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.blanc} />
        </View>
      )}
    </View>
  );

  if (banniere.imageUrl) {
    return (
      <ImageBackground
        source={{ uri: banniere.imageUrl }}
        style={styles.carte}
        imageStyle={{ borderRadius: rayon.lg }}
      >
        {/* Voile sombre : sans lui, un texte blanc devient illisible sur une
            image claire, et on ne maîtrise pas les images du back-office. */}
        <View style={styles.voile} />
        {contenu}
      </ImageBackground>
    );
  }

  return <View style={[styles.carte, { backgroundColor: banniere.couleur }]}>{contenu}</View>;
}

const styles = StyleSheet.create({
  carte: {
    flex: 1,
    borderRadius: rayon.lg,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  voile: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.42)' },
  contenu: { padding: espacement.lg, gap: 4 },
  titre: { fontSize: 17, fontWeight: '800', color: colors.blanc },
  sousTitre: { fontSize: 13, color: 'rgba(255,255,255,0.92)', lineHeight: 18 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: espacement.sm,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: espacement.md,
    paddingVertical: 6,
    borderRadius: rayon.plein,
  },
  actionTexte: { fontSize: 12, fontWeight: '700', color: colors.blanc },

  points: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  point: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.bordure,
  },
  pointActif: { backgroundColor: colors.primary, width: 18 },
});
