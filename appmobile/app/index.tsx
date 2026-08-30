import { View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '../src/auth';
import { Chargement } from '../src/components/ui';
import { colors } from '../src/theme';

/**
 * Point d'entree : oriente vers l'espace correspondant au role.
 * On attend la fin de la revalidation du jeton avant de rediriger, sinon
 * l'utilisateur deja connecte verrait passer l'ecran de bienvenue.
 */
export default function Index() {
  const { utilisateur, chargement } = useAuth();

  if (chargement) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.fond }}>
        <Chargement texte="Clean Guinée" />
      </View>
    );
  }

  if (!utilisateur) return <Redirect href="/(auth)/bienvenue" />;

  return utilisateur.role === 'CLIENT' ? (
    <Redirect href="/(client)/accueil" />
  ) : (
    <Redirect href="/(collecteur)/tableau-de-bord" />
  );
}
