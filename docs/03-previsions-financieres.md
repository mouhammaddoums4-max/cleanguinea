# 03 — Prévisions financières sur 5 ans

Tous les montants sont en **millions de GNF (M GNF)** sauf mention contraire.
Taux de conversion : **1 USD = 8 600 GNF**.
Les fichiers de calcul sont dans [`../finance/`](../finance/) (CSV, séparateur `;`).

---

## 1. Hypothèses structurantes

| Hypothèse | Valeur | Justification |
|---|---:|---|
| Tarif moyen ménage | 32 000 GNF/mois | Mix 60 % Essentiel / 40 % Confort |
| Tarif moyen PRO | 200 000 GNF/mois | Entrée de gamme commerces |
| Déchets par ménage | 1,1 t/an | 6,3 pers × 0,48 kg/j (net des refus non présentés) |
| Déchets par client PRO | 5,5 t/an | 15 kg/jour ouvré |
| Taux de recouvrement | 88 % | Prélèvement Mobile Money + relance automatique |
| Churn mensuel | 3,5 % en A1 → 1,8 % en A5 | Effet Points Clean |
| Charges sociales | 18 % de la masse salariale brute | CNSS employeur |
| Impôt sur les sociétés | 25 % | Régime de droit commun, avec report déficitaire |
| Amortissement | Linéaire 5 ans, prorata temporis | Véhicules, bacs, équipements, logiciel |

### Taux de valorisation (part du tonnage collecté effectivement vendue)

| | A1 | A2 | A3 | A4 | A5 |
|---|---:|---:|---:|---:|---:|
| Taux de valorisation | 8 % | 12 % | 16 % | 20 % | 24 % |
| Prix moyen (GNF/kg) | 1 200 | 1 200 | 1 050 | 950 | 900 |

La progression du taux vient du programme Points Clean (tri à la source) et de l'ouverture
du compostage en A3. La baisse du prix moyen vient de la part croissante du compost.

---

## 2. Portefeuille clients et volumes

| | A1 | A2 | A3 | A4 | A5 |
|---|---:|---:|---:|---:|---:|
| Ménages — fin d'exercice | 2 400 | 5 000 | 12 000 | 24 000 | 40 000 |
| Ménages — moyenne annuelle | 1 200 | 3 700 | 8 500 | 18 000 | 32 000 |
| PRO — fin d'exercice | 60 | 130 | 300 | 600 | 950 |
| PRO — moyenne annuelle | 30 | 95 | 215 | 450 | 775 |
| **Tonnage collecté (t)** | **1 485** | **4 593** | **10 533** | **22 275** | **39 463** |
| **Tonnage valorisé (t)** | **119** | **551** | **1 685** | **4 455** | **9 471** |
| Effectif | 20 | 52 | 108 | 198 | 335 |

---

## 3. Compte de résultat prévisionnel

| Poste | A1 | A2 | A3 | A4 | A5 |
|---|---:|---:|---:|---:|---:|
| Abonnements ménages | 460,8 | 1 420,8 | 3 264,0 | 6 912,0 | 12 288,0 |
| Abonnements PRO | 72,0 | 228,0 | 516,0 | 1 080,0 | 1 860,0 |
| Vente de matières valorisées | 142,6 | 661,3 | 1 769,5 | 4 232,3 | 8 523,9 |
| **Chiffre d'affaires** | **675,4** | **2 310,1** | **5 549,5** | **12 224,3** | **22 671,9** |
| | | | | | |
| Masse salariale (chargée) | 492,8 | 1 397,6 | 3 062,8 | 5 773,0 | 9 940,3 |
| Carburant et entretien | 96,0 | 260,0 | 530,0 | 1 080,0 | 1 880,0 |
| Centres de tri (loyer, énergie, consommables) | 90,0 | 185,0 | 385,0 | 790,0 | 1 330,0 |
| Redevances et taxes (décharge, communes) | 55,0 | 165,0 | 335,0 | 700,0 | 1 190,0 |
| Marketing et acquisition | 60,0 | 130,0 | 210,0 | 400,0 | 660,0 |
| Technologie (hébergement, SMS, commissions MM) | 45,0 | 95,0 | 195,0 | 385,0 | 630,0 |
| Programme Points Clean | 25,0 | 85,0 | 170,0 | 425,0 | 890,0 |
| Frais généraux et administratifs | 70,0 | 145,0 | 260,0 | 500,0 | 860,0 |
| **Total charges décaissées** | **933,8** | **2 462,6** | **5 147,8** | **10 053,0** | **17 380,3** |
| | | | | | |
| **EBITDA** | **−258,4** | **−152,5** | **+401,7** | **+2 171,3** | **+5 291,6** |
| *Marge EBITDA* | *−38,3 %* | *−6,6 %* | *+7,2 %* | *+17,8 %* | *+23,3 %* |
| Dotations aux amortissements | 186,0 | 333,0 | 558,0 | 918,0 | 1 398,0 |
| **Résultat d'exploitation** | **−444,4** | **−485,5** | **−156,3** | **+1 253,3** | **+3 893,6** |
| Impôt sur les sociétés (25 %, après report) | 0,0 | 0,0 | 0,0 | 41,8 | 973,4 |
| **RÉSULTAT NET** | **−444,4** | **−485,5** | **−156,3** | **+1 211,5** | **+2 920,2** |
| Résultat net cumulé | −444,4 | −929,9 | −1 086,2 | +125,3 | +3 045,5 |

### Lecture

- **EBITDA positif dès l'année 3** : l'exploitation s'autofinance à partir de ~8 500 abonnés.
- **Résultat net positif à partir de l'année 4** (mois 40), après absorption des amortissements.
- **Marge EBITDA de 23 % en année 5**, cohérente avec les opérateurs de déchets matures.

---

## 4. Seuil de rentabilité

### Décomposition des charges (structure année 3)

| Nature | Montant A3 | Part |
|---|---:|---:|
| **Charges variables** (collecteurs, carburant, redevances, Points Clean) | 3 148,0 | 55 % |
| **Charges fixes** (encadrement, centres de tri, technologie, marketing, FG, amortissements) | 2 557,8 | 45 % |

- Chiffre d'affaires A3 : **5 549,5 M GNF**
- Marge sur coûts variables : 5 549,5 − 3 148,0 = **2 401,5 M GNF**, soit **43,3 %** du CA
- **Seuil de rentabilité** = 2 557,8 / 0,433 = **5 906 M GNF de chiffre d'affaires annuel**

### Traduction en nombre d'abonnés

| Indicateur | Valeur |
|---|---:|
| CA au point mort | 5 906 M GNF |
| Équivalent en abonnés ménages (avec 250 PRO et le mix matières A3) | **≈ 9 100 ménages** |
| Date d'atteinte | **Mois 40** (courant année 4) |
| Seuil **EBITDA** (point mort de trésorerie d'exploitation) | ≈ 7 700 ménages — **mois 32** |

---

## 5. Plan de trésorerie

| Flux | A0 | A1 | A2 | A3 | A4 | A5 |
|---|---:|---:|---:|---:|---:|---:|
| Financement amorçage | +1 900,0 | | | | | |
| Levée série A | | | +2 500,0 | | | |
| Investissements initiaux | −1 242,0 | | | | | |
| Frais de lancement | −135,0 | | | | | |
| Résultat net | | −444,4 | −485,5 | −156,3 | +1 211,5 | +2 920,2 |
| + Dotations aux amortissements | | +186,0 | +333,0 | +558,0 | +918,0 | +1 398,0 |
| − Investissements de croissance | | 0,0 | −850,0 | −1 400,0 | −2 200,0 | −2 600,0 |
| **Flux net de la période** | **+523,0** | **−258,4** | **+1 497,5** | **−998,3** | **−70,5** | **+1 718,2** |
| **Trésorerie de fin de période** | **523,0** | **264,6** | **1 762,1** | **763,8** | **693,3** | **2 411,5** |

**Point d'attention** : sans la série A de 2 500 M GNF au démarrage de l'année 2, la trésorerie
devient négative dès le mois 20. Cette levée n'est pas optionnelle — elle finance l'achat des
véhicules et des bacs nécessaires au passage de 2 400 à 12 000 abonnés.

### Calendrier des investissements de croissance

| Année | Montant | Contenu |
|---|---:|---|
| A2 | 850,0 | 2 tricycles, 1 camion 7 t, 1 200 bacs, extension du centre de tri |
| A3 | 1 400,0 | 2 camions, 2 500 bacs, unité de compostage, presse hydraulique |
| A4 | 2 200,0 | 2e centre de tri, 3 camions, 5 000 bacs, flotte de supervision |
| A5 | 2 600,0 | 3e centre de tri, 4 camions, 8 000 bacs, ligne de lavage plastique |

---

## 6. Retour sur investissement

| Indicateur | Valeur |
|---|---:|
| Capitaux investis (amorçage + série A) | 4 400 M GNF (≈ 512 000 USD) |
| Résultat net cumulé à fin A5 | +3 045,5 M GNF |
| **Récupération de la mise d'amorçage (1 900 M GNF)** | **Mois 55** |
| EBITDA année 5 | 5 291,6 M GNF (≈ 615 000 USD) |
| Valorisation indicative à 6 × EBITDA | **≈ 31 750 M GNF (≈ 3,69 M USD)** |
| Multiple sur capitaux investis | **≈ 7,2 ×** |
| **TRI indicatif sur 5 ans** | **35 % – 45 %** |

La fourchette de TRI tient compte de l'incertitude sur la répartition dette / capital de la
série A et sur son calendrier exact. Le multiple de sortie de 6 × EBITDA est conservateur pour
un actif d'infrastructure de services essentiels à croissance rapide.

---

## 7. Analyse de sensibilité (sur le résultat net A5)

| Variable | −20 % | Référence | +20 % |
|---|---:|---:|---:|
| Nombre d'abonnés ménages | +1 019 | +2 920 | +4 821 |
| Prix moyen des matières | +1 641 | +2 920 | +4 199 |
| Taux de valorisation | +1 641 | +2 920 | +4 199 |
| Masse salariale | +4 411 | +2 920 | +1 429 |
| Taux de recouvrement (88 % → 70 % / 100 %) | +798 | +2 920 | +4 021 |

**Variables les plus sensibles** : le **nombre d'abonnés** et le **taux de recouvrement**.
D'où la priorité donnée au prélèvement Mobile Money automatique et au programme de fidélité.

**Scénario pessimiste** (−20 % abonnés, −20 % prix matières, +10 % masse salariale) :
résultat net A5 ≈ **−250 M GNF**, EBITDA A5 ≈ **+1 850 M GNF**. Le modèle reste positif
au niveau de l'exploitation même dans ce cas.

---

## 8. Ce qui reste à consolider

1. **Devis fermes** pour les véhicules, bacs et équipements de tri (3 fournisseurs par ligne).
2. **Lettres d'intention** de 2 à 3 recycleurs sur les volumes et les prix de reprise.
3. **Enquête de consentement à payer** pour valider les tarifs de 25 000 et 40 000 GNF.
4. **Coût réel de collecte à la tonne** mesuré sur 3 mois de pilote — c'est la variable qui
   décide de tout le reste du modèle.
