# 11 — Évaluation du projet et plan d'action

Ce document reprend l'évaluation critique du projet Clean Guinée et la traduit en actions
concrètes, chacune renvoyant au document du dossier qui la traite.

---

## 1. Note d'ensemble : **9,5 / 10**

Le projet couvre les trois dimensions attendues — **opérationnelle, technologique et
économique** — ce qui est rare à ce stade.

## 2. Points forts reconnus

| Force | Pourquoi cela compte | Où c'est développé |
|---|---|---|
| **Double source de revenus** — abonnements + vente de matières | Réduit la dépendance à un seul flux et permet un tarif d'abonnement plus bas que la concurrence | [01](01-presentation-projet.md) §3 · [03](03-previsions-financieres.md) |
| **Déploiement progressif** (pilote → expansion) | Limite le risque : chaque phase valide ses hypothèses avant d'engager la suivante | [01](01-presentation-projet.md) §4 |
| **Numérique au service de la traçabilité** | C'est la différence structurelle avec les PME informelles : le ménage voit ce qu'il paie | [08](08-architecture-technique.md) · [`appmobile/`](../appmobile/) |
| **Création d'emplois et impact environnemental** | 335 emplois formels et 16 300 t détournées sur 5 ans — argument décisif pour les bailleurs | [09](09-risques-et-kpi.md) §2 |
| **Vision de long terme** (transformation des déchets) | Fait passer le projet du statut de prestataire de service à celui d'acteur industriel | [01](01-presentation-projet.md) §6 |

## 3. Ce qui manquait pour passer au niveau « investisseur »

Les cinq manques identifiés sont désormais traités dans le dossier.

| # | Manque identifié | Traitement | Statut |
|---:|---|---|---|
| 1 | **Étude de marché** — taille du marché, ménages ciblés, concurrents, pénétration visée | [Document 02](02-etude-de-marche.md) : TAM 286 Md GNF, 333 000 ménages, 6 concurrents analysés, 12 % de pénétration visée à 5 ans | ✅ Rédigé — à confirmer par l'enquête terrain |
| 2 | **Prévisions financières 3–5 ans** — compte de résultat, trésorerie, seuil de rentabilité, ROI | [Document 03](03-previsions-financieres.md) + [`finance/`](../finance/) : CR sur 5 ans, plan de trésorerie, point mort au mois 40, ROI au mois 55, analyse de sensibilité | ✅ Fait |
| 3 | **Budget de démarrage détaillé** | [Document 04](04-budget-demarrage.md) : 1,9 Md GNF ventilés en 7 blocs — application, 300 bacs, tricycles et camionnette, centre de tri, EPI, marketing, fonds de roulement | ✅ Fait |
| 4 | **Partenaires clés** | [Document 05](05-partenaires-cles.md) : communes, ministère, ANASP, Orange, MTN, recycleurs, ONG, bailleurs — avec les 6 accords prioritaires et leur calendrier | ✅ Fait |
| 5 | **Cadre juridique** | [Document 06](06-cadre-juridique.md) : SARL puis SAS avant la série A, autorisations de collecte, agrément environnemental, contrats types, fiscalité | ✅ Rédigé — à valider par un avocat guinéen |

### Le manque qui reste

| Manque | Pourquoi il est décisif | Action |
|---|---|---|
| **Preuve de traction** | Aucun jury ni investisseur ne finance une hypothèse. 100 ménages payants pendant 3 mois valent plus que tout le reste du dossier | Pilote manuel, 25 M GNF, 3 mois — voir [10](10-financements-et-concours.md) §2 |
| **Lettres d'intention** | 1 commune + 2 recycleurs + 20 ménages : le document le plus convaincant d'une data room | À obtenir au T2 — voir [05](05-partenaires-cles.md) §4 |

---

## 4. L'idée qui fait la différence : le programme de récompenses

> *Chaque kilogramme de déchet recyclable rapporte des points Clean, convertibles en
> réduction d'abonnement, crédit Orange Money, bons d'achat ou cadeaux.*

Cette idée a été retenue et développée intégralement au
**[document 07](07-programme-points-clean.md)**.

Elle est traitée comme un **levier économique**, pas comme un argument marketing, parce
qu'elle agit sur trois variables du modèle financier :

| Effet | Traduction chiffrée |
|---|---|
| Meilleur tri à la source | Taux de valorisation de 8 % (A1) à 24 % (A5) — chaque point vaut ≈ 355 M GNF de CA en A5 |
| Fidélisation | Churn mensuel de 3,5 % à 1,8 % — ≈ 6 800 abonnés conservés sur 5 ans |
| Acquisition par parrainage | Coût d'acquisition réduit d'environ 30 % |

Coût du programme : **890 M GNF en A5, soit 3,9 % du CA**, pour une contribution directe à
plus de 8 500 M GNF de vente de matières. Le programme est **rentable dès le premier
kilogramme** : récompenser 100 GNF pour une matière revendue 1 200 GNF représente 8,3 % de
sa valeur, très en dessous du coût d'un tri mécanique équivalent.

Le document 07 ajoute ce qui manquait à l'idée initiale pour être exploitable :
un **barème par matière**, des **plafonds**, des **niveaux de fidélité**, un **classement de
quartier**, un **dispositif anti-fraude complet** et un **règlement juridique** annexable
aux conditions générales.

---

## 5. Potentiel

Avec une bonne exécution, Clean Guinée peut devenir :

1. **La première plateforme numérique de gestion des déchets en Guinée** — l'avance se prend
   maintenant, avant l'arrivée d'un acteur régional.
2. **Un fournisseur de matières premières recyclées** — 9 471 tonnes valorisées par an à
   l'horizon A5, avec une capacité de transformation locale à partir de l'an 6.
3. **Un acteur de l'économie circulaire en Afrique de l'Ouest** — le modèle est réplicable
   à Kankan, Labé, N'Zérékoré, puis dans les capitales voisines.

### Le slogan

> **« Du déchet à la valeur »**

Simple, mémorable, et fidèle à la mission : il dit à la fois la transformation physique
(déchet → matière première) et la transformation économique (charge → revenu pour le ménage).
Il fonctionne aussi bien devant un ménage de Ratoma que devant un fonds d'impact.

**À faire** : le déposer avec la marque auprès de l'OAPI — voir
[document 06](06-cadre-juridique.md) §2.

---

## 6. Éligibilité aux programmes de financement

Le projet a le profil pour candidater à la **Tony Elumelu Foundation**, à **Orange Corners**
et aux fonds dédiés à l'entrepreneuriat vert et à l'économie circulaire.

Les deux conditions posées — **prévisions financières solides** et **étude de marché** —
sont désormais remplies par les documents 02 et 03. Le détail des programmes, du calendrier
de candidature et de la data room à constituer est au
**[document 10](10-financements-et-concours.md)**.

---

## 7. Plan d'action des 90 prochains jours

| Priorité | Action | Livrable | Coût |
|---:|---|---|---:|
| **1** | Lancer le pilote manuel à 100 ménages | 3 mois de CA réel, taux de recouvrement mesuré | 25 M GNF |
| **2** | Réaliser l'enquête terrain (500 ménages) | Consentement à payer validé, tarifs confirmés | 45 M GNF |
| **3** | Déposer le dossier d'agrément environnemental | Chemin critique — 3 à 6 mois d'instruction | 45 M GNF |
| **4** | Constituer la société (SARL) | RCCM, NIF, CNSS, compte bancaire | 25 M GNF |
| **5** | Obtenir 3 lettres d'intention | 1 commune + 2 recycleurs | — |
| **6** | Finaliser pitch deck FR/EN + vidéo de 2 min | Support de candidature | 8 M GNF |
| **7** | Candidater aux 3 premiers programmes | TEF, Orange Corners, concours national | — |
| | **Total** | | **148 M GNF** |

**148 M GNF (≈ 17 200 USD)** pour passer d'un dossier bien construit à un dossier
**démontré**. C'est le seul investissement qui conditionne tous les autres.
