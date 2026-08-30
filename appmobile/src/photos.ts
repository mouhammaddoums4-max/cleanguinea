import * as ImagePicker from 'expo-image-picker';

import { api } from './api';

/**
 * Photos jointes.
 *
 * Le fichier ne transite pas par notre serveur : celui-ci signe un
 * téléversement, l'application envoie l'image directement à Cloudinary. Une
 * photo de 3 Mo qui traverserait l'API doublerait le coût réseau, sur des
 * connexions déjà lentes, et ferait tomber la requête au moindre creux.
 *
 * L'échec de téléversement n'est jamais fatal pour l'appelant : on renvoie
 * null et le message part sans image, plutôt que de perdre ce qui a été écrit.
 */

type Signature = {
  url: string;
  champs: Record<string, string | number>;
  expireDansSecondes: number;
};

/** Ouvre la galerie. Renvoie l'URI locale, ou null si l'utilisateur renonce. */
export async function choisirPhoto(): Promise<string | null> {
  const { granted } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!granted) return null;

  const resultat = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.7,
    allowsEditing: false,
  });

  return resultat.canceled ? null : (resultat.assets[0]?.uri ?? null);
}

/** Ouvre l'appareil photo. Renvoie l'URI locale, ou null. */
export async function prendrePhoto(): Promise<string | null> {
  const { granted } = await ImagePicker.requestCameraPermissionsAsync();
  if (!granted) return null;

  const resultat = await ImagePicker.launchCameraAsync({ quality: 0.7 });
  return resultat.canceled ? null : (resultat.assets[0]?.uri ?? null);
}

/**
 * Téléverse une image locale et renvoie son URL publique.
 *
 * @param uri     URI locale renvoyée par le sélecteur
 * @param dossier Dossier autorisé côté serveur (« support », « profils »…)
 * @param cible   Identifiant métier, pour nommer le fichier
 */
export async function televerser(
  uri: string,
  dossier: string,
  cible?: string,
): Promise<string | null> {
  try {
    const signature = await api<Signature>('/api/televersement/signature', {
      method: 'POST',
      body: { dossier, cible },
    });

    const formulaire = new FormData();
    for (const [cle, valeur] of Object.entries(signature.champs)) {
      formulaire.append(cle, String(valeur));
    }

    // React Native accepte cette forme pour un fichier local ; le type MIME
    // vient de l'extension, faute de quoi Cloudinary refuse l'envoi.
    const extension = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    formulaire.append('file', {
      uri,
      name: `photo.${extension}`,
      type: `image/${extension === 'jpg' ? 'jpeg' : extension}`,
    } as unknown as Blob);

    const reponse = await fetch(signature.url, { method: 'POST', body: formulaire });
    if (!reponse.ok) return null;

    const donnees = (await reponse.json()) as { secure_url?: string };
    return donnees.secure_url ?? null;
  } catch {
    // Stockage non configuré, réseau coupé, refus de Cloudinary : le message
    // part sans photo. Perdre le texte écrit serait bien pire.
    return null;
  }
}
