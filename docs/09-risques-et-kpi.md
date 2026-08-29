# 09 — Risques et indicateurs de pilotage

## 1. Matrice des risques

Probabilité et impact notés de 1 (faible) à 5 (fort). **Criticité = P × I.**

| # | Risque | P | I | Crit. | Mesures de réduction |
|---:|---|---:|---:|---:|---|
| 1 | **Impayés et faible recouvrement** | 4 | 5 | **20** | Prélèvement Mobile Money automatique · relance J+3/J+10/J+20 · suspension à J+45 · perte des Points Clean · abonnement prépayé pour les profils à risque |
| 2 | **Effondrement du prix des matières recyclées** | 3 | 4 | **12** | Contrats à prix plancher sur 12 mois · diversification des matières · stockage tampon pour attendre la remontée · le CA abonnements reste majoritaire |
| 3 | **Retard de l'agrément environnemental** | 3 | 4 | **12** | Dépôt au mois 0 · bureau d'études agréé · contact préalable avec le ministère · centre de tri provisoire en attendant |
| 4 | **Concurrence des PME informelles sur le prix** | 4 | 3 | **12** | Différenciation par la preuve de service · offre Essentiel à 25 000 GNF · Points Clean qui réduit le coût net · offre groupée par concession |
| 5 | **Panne ou immobilisation des véhicules** | 4 | 3 | **12** | Maintenance préventive planifiée · stock de pièces d'usure · 1 véhicule de réserve dès l'A2 · contrat avec un garage partenaire |
| 6 | **Difficulté d'accès aux quartiers non lotis** | 4 | 3 | **12** | Tricycles adaptés aux ruelles · points d'apport volontaire mutualisés · collecte à pied avec chariots sur les derniers 100 m |
| 7 | **Changement de majorité communale** | 3 | 4 | **12** | Conventions de 3 ans opposables · relations avec les services techniques (permanents) et pas seulement les élus · résultats chiffrés publiés |
| 8 | **Fraude sur les Points Clean** | 3 | 3 | **9** | Dispositif complet décrit au [document 07](07-programme-points-clean.md) §4 |
| 9 | **Rotation et absentéisme des collecteurs** | 4 | 2 | **8** | Salaire au-dessus du marché informel · CNSS et contrat écrit · primes de tonnage et d'assiduité · EPI de qualité |
| 10 | **Dépendance à un prestataire technologique** | 3 | 3 | **9** | Cession pleine des droits sur le code · dépôt sur notre propre dépôt git · internalisation d'un développeur en A2 |
| 11 | **Accident du travail** | 3 | 4 | **12** | EPI obligatoires · formation aux risques biologiques · vaccination (tétanos, hépatite B) · assurance accidents du travail · registre de sécurité |
| 12 | **Dépréciation du GNF sur les achats importés** | 3 | 3 | **9** | Achats groupés anticipés · fournisseurs régionaux · révision tarifaire annuelle prévue aux CGA |
| 13 | **Saison des pluies : tournées perturbées** | 5 | 2 | **10** | Planning saisonnier · véhicules bâchés · passages rattrapés · communication proactive aux abonnés |
| 14 | **Échec de la levée série A** | 3 | 5 | **15** | Démarrer les discussions dès le mois 9 · scénario de repli : croissance ralentie autofinancée (12 000 abonnés en A4 au lieu d'A3) · crédit-bail plutôt qu'achat |

### Les quatre risques à surveiller en priorité

**#1 Impayés** — c'est la variable qui détruit le plus vite le modèle. Une chute du taux de
recouvrement de 88 % à 70 % coûte **2 170 M GNF de résultat net en A5**.

**#14 Échec de la série A** — sans elle, la trésorerie devient négative au mois 20. Le plan de
repli doit être écrit **avant** d'en avoir besoin.

**#2 Prix des matières** — 38 % du chiffre d'affaires en A5. Les contrats à prix plancher sont
la seule protection réelle.

**#3 Agrément** — c'est le chemin critique du calendrier. Trois mois de retard décalent tout
le prévisionnel d'un trimestre.

---

## 2. Indicateurs de pilotage

### Commercial

| KPI | Cible A1 | Cible A3 | Cible A5 | Fréquence |
|---|---:|---:|---:|---|
| Abonnés ménages actifs | 2 400 | 12 000 | 40 000 | Hebdomadaire |
| Clients PRO actifs | 60 | 300 | 950 | Mensuelle |
| Nouveaux abonnés par mois | 200 | 600 | 1 400 | Hebdomadaire |
| Churn mensuel | < 3,5 % | < 2,5 % | < 1,8 % | Mensuelle |
| Coût d'acquisition (CAC) | < 25 000 GNF | < 18 000 GNF | < 15 000 GNF | Mensuelle |
| Valeur vie client (LTV) | > 500 000 GNF | > 700 000 GNF | > 900 000 GNF | Trimestrielle |
| **Ratio LTV / CAC** | **> 20** | **> 38** | **> 60** | Trimestrielle |

### Opérationnel

| KPI | Cible | Fréquence |
|---|---:|---|
| Taux de passages réalisés / planifiés | > 96 % | Quotidienne |
| Passages avec preuve (scan + GPS) | > 98 % | Quotidienne |
| Coût de collecte à la tonne | < 320 000 GNF | Mensuelle |
| Tonnage collecté par équipe et par jour | > 1,4 t | Quotidienne |
| Taux de valorisation | 8 % → 24 % | Mensuelle |
| Taux de contamination des lots | < 12 % | Hebdomadaire |
| Taux de disponibilité de la flotte | > 90 % | Hebdomadaire |
| Délai de traitement d'un incident | < 24 h | Quotidienne |

### Financier

| KPI | Cible | Fréquence |
|---|---:|---|
| Taux de recouvrement | > 88 % | Mensuelle |
| Délai moyen d'encaissement | < 12 jours | Mensuelle |
| Part des paiements Mobile Money | > 80 % | Mensuelle |
| Marge brute sur matières vendues | > 55 % | Mensuelle |
| Marge EBITDA | −38 % → +23 % | Mensuelle |
| Trésorerie disponible (mois de charges) | > 3 mois | Hebdomadaire |
| Prix moyen de vente à la tonne | Suivi vs marché | Mensuelle |

### Impact

| KPI | A1 | A3 | A5 | Cumul 5 ans |
|---|---:|---:|---:|---:|
| Tonnes collectées | 1 485 | 10 533 | 39 463 | **78 348** |
| Tonnes détournées de la décharge | 119 | 1 685 | 9 471 | **16 281** |
| CO₂e évité (t, ≈ 1 t/t valorisée) | 119 | 1 685 | 9 471 | **≈ 16 300** |
| Emplois directs formels | 20 | 108 | 335 | **335** |
| Dont femmes | ≥ 35 % | ≥ 40 % | ≥ 45 % | — |
| Personnes desservies | 15 120 | 75 600 | 252 000 | **252 000** |
| Ménages formés au tri | 2 400 | 12 000 | 40 000 | **40 000** |

Ces indicateurs alimentent directement les rapports aux communes et aux bailleurs, et
correspondent aux **ODD 8, 11, 12 et 13**.

---

## 3. Rituels de pilotage

| Rythme | Réunion | Participants | Décisions |
|---|---|---|---|
| **Quotidien — 15 min** | Point tournées | Exploitation, chefs d'équipe | Réaffectations, incidents du jour |
| **Hebdomadaire — 1 h** | Revue commerciale et opérations | Direction, commercial, exploitation | Objectifs d'acquisition, recouvrement, maintenance |
| **Mensuel — 3 h** | Revue de gestion | Comité de direction | Compte de résultat du mois, écarts vs budget, plan d'action |
| **Trimestriel — ½ journée** | Comité stratégique | Direction + investisseurs | Passage de phase, investissements, recrutements clés |
| **Annuel** | Revue de conformité et d'impact | Direction + conseil externe | Renouvellement des agréments, rapport d'impact |
