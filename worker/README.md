# Générateur d'images Chroniques (Cloudflare Workers AI)

Ce Worker protège l'accès au modèle FLUX.1 Schnell. Le site GitHub Pages appelle ce Worker à chaque nouveau tour. Le prompt visuel est produit par Groq.

## 1. Prérequis

- Un compte Cloudflare.
- Node.js et npm installés.
- Le site Chroniques publié sur GitHub Pages.

Le forfait Workers Free inclut un quota quotidien de Workers AI (10 000 Neurons/jour à la date de rédaction). Ce quota n'est pas illimité : le nombre d'images dépend de la résolution et du nombre d'étapes du modèle. Les dépassements peuvent échouer sur le forfait gratuit.

## 2. Configurer

Dans `wrangler.toml`, remplace `https://TON-PSEUDO.github.io` par l'origine exacte de ton site. Exemple : `https://moncompte.github.io` ou `https://moncompte.github.io/mon-depot` ? Pour GitHub Pages de projet, l'origine reste `https://moncompte.github.io` : le navigateur n'envoie pas le chemin dans l'en-tête Origin.

Dans un terminal ouvert dans ce dossier :

```bash
npx wrangler login
npx wrangler secret put IMAGE_API_SECRET
```

Choisis un secret long et garde-le pour le saisir dans les paramètres de Chroniques.

Puis déploie :

```bash
npx wrangler deploy
```

Copie l'URL `https://...workers.dev` affichée.

## 3. Configurer le jeu

Sur le site Chroniques, ouvre ⚙ Paramètres et renseigne :

- Clé API Groq et modèle comme avant.
- URL du générateur : l'adresse `workers.dev` obtenue.
- Secret du générateur : la valeur donnée à `wrangler secret put`.

Clique sur **Tester l'image**, puis **Enregistrer**. Une illustration sera ensuite demandée automatiquement au prologue et après chaque tour. Le bouton « Régénérer » permet de refaire l'image de la scène actuelle.

## Sécurité

Le secret du Worker est saisi dans le navigateur et y est stocké localement : cette configuration est destinée à un usage personnel. Ne distribue pas le secret et ne publie pas une clé partagée dans un dépôt public. Pour un jeu public multi-utilisateur, il faudrait une authentification côté serveur et des limites d'utilisation par compte.
