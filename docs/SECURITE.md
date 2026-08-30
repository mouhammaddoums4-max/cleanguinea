# Sécurité — Clean Guinée

## Ce qui ne peut pas être protégé

Il faut le dire d'emblée, parce que tout le reste en découle.

**Une application installée est entre les mains de qui l'installe.** L'APK peut
être extrait du téléphone, décompilé, le bundle JavaScript lu, le trafic réseau
observé avec un mandataire. Aucune technique ne rend cela faux. Les produits
vendus comme « protection anti-décompilation » augmentent le coût de l'analyse ;
ils ne l'empêchent pas.

**Les interfaces sont copiables.** Une capture d'écran suffit à reproduire une
maquette. Ce qui protège un design est le droit d'auteur, pas le code.

La conséquence pratique est simple : **rien de ce qui est dans l'application ne
doit être secret.** Une clé embarquée est une clé publiée, quelle que soit
l'obfuscation appliquée par-dessus.

## Ce qui est réellement protégé

La valeur du système n'est pas dans l'APK. Elle est dans la base de données, les
comptes clients, l'historique de collecte et les comptes de service. Tout cela
vit sur le serveur, qui lui n'est pas copiable.

### Aucun secret dans l'application

Vérifié : le bundle mobile ne contient aucune clé Cloudinary, aucun identifiant
SMS, aucune chaîne de connexion. Le téléversement d'images passe par une
signature demandée au serveur ; le secret Cloudinary ne quitte jamais l'API.

### Le serveur ne croit rien de ce que l'application affirme

Les prix d'abonnement sont recalculés côté API — un client qui envoie
`montantGnf: 1` se voit facturer le tarif réel. Les rôles viennent du jeton
vérifié, pas d'un champ envoyé par l'application. Les droits sont contrôlés à
chaque route.

C'est le point le plus important du document : une application modifiée ne peut
rien obtenir qu'une application intacte n'obtiendrait pas.

### Révocation des sessions

Un JWT est autonome : on ne peut pas l'annuler une fois émis. Chaque compte
porte donc un numéro de génération (`jetonVersion`), inscrit dans le jeton et
comparé à chaque requête.

Un changement de mot de passe l'incrémente. Tous les jetons émis avant
deviennent invalides sur-le-champ. Sans ce mécanisme, une victime qui
réinitialisait son mot de passe ne chassait pas l'intrus : elle lui retirait
seulement le moyen d'obtenir un *nouveau* jeton, l'ancien restant valable
jusqu'à trente jours.

### Verrouillage de compte et limitation de débit

Deux défenses complémentaires, parce qu'aucune ne suffit seule.

| | Vise | Seuil |
|---|---|---|
| Limitation par IP | les rafales automatisées | 20 tentatives d'authentification / 15 min |
| Verrouillage de compte | l'attaquant patient qui change d'adresse | 5 échecs, puis 5 → 10 → 20 → 40 min, plafond 1 h |

La limitation par IP seule est insuffisante en Guinée : un quartier entier peut
sortir derrière la même adresse d'opérateur, ce qui oblige à des plafonds larges.
Le verrouillage vise l'individu et reste serré.

Le blocage s'allonge à chaque échec plutôt que d'être définitif : une faute de
frappe coûte quelques minutes, un script en essuie des heures, et personne ne se
retrouve enfermé dehors sans recours.

### Réinitialisation de mot de passe

- Le code à six chiffres n'est **pas stocké** : seule son empreinte SHA-256 l'est.
- Cinq essais maximum, après quoi le code est brûlé — six chiffres se devinent
  en quelques milliers de tentatives.
- Trois envois par heure et par compte : le crédit SMS est limité et chaque
  message coûte.
- **La réponse ne révèle pas si le compte existe** — même message *et même forme
  d'objet*, sinon un champ supplémentaire suffirait à transformer la route en
  annuaire d'abonnés.
- Un code déjà échangé contre un jeton n'est plus vérifiable.

## Durcissement de l'application

Ces mesures augmentent le coût d'une analyse. Elles ne la rendent pas
impossible, et ne sont pas ce qui protège le système.

- **ProGuard / R8** en build release : le code natif est minifié et obfusqué.
- **Hermes** compile le JavaScript en bytecode : le bundle expédié n'est pas du
  source lisible.
- **`console.*` retirés** des builds de production. Ils donnaient une lecture
  commentée du fonctionnement : noms de routes, formes de réponses,
  identifiants dans les journaux. `console.error` est conservé pour les rapports
  de plantage.
- **Trafic en clair interdit** (`usesCleartextTraffic: false`). C'est le vrai
  risque réseau : sur un wifi partagé, du HTTP laisse lire le jeton de session,
  ce qui donne le compte sans deviner le moindre mot de passe.
- **Captures d'écran bloquées** sur les écrans sensibles — paiement, abonnement,
  profil, code reçu par SMS, données personnelles. Le contenu disparaît aussi de
  l'aperçu des applications récentes. Cela ne protège pas d'une photo prise avec
  un second appareil ; rien ne le peut.
- **Permission microphone retirée.** L'application ne l'utilisait pas : une
  permission inutile est une surface d'attaque et un motif de rejet sur le
  Play Store.

## À faire avant la mise en production

Ces points sont ouverts et relèvent d'une décision ou d'une action de votre part.

1. **Régénérer les secrets exposés.** Le mot de passe Railway, les clés NimbaSMS
   et les clés Cloudinary ont circulé en clair dans une conversation. Ils
   doivent être considérés comme compromis et remplacés.
2. **Servir l'API en HTTPS** et définir `EXPO_PUBLIC_API_URL` en conséquence.
   L'application journalise une erreur si ce n'est pas le cas.
3. **Renseigner `CORS_ORIGINS`** avec le domaine réel du back-office. Vide, il
   bloque tout appel navigateur.
4. **Raccourcir `JWT_EXPIRES_IN`.** Trente jours est confortable pour un
   collecteur sur le terrain, long pour un compte administrateur.
5. **Signer l'APK avec une clé conservée hors du dépôt**, et sauvegarder cette
   clé : la perdre interdit toute mise à jour de l'application publiée.
6. **Play Integrity API** si vous voulez refuser les clients modifiés. Utile
   surtout contre la fraude aux points ; à évaluer une fois le programme de
   fidélité actif.
