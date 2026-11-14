# Chroniques — jeu de rôle multijoueur avec Groq

Jeu de rôle narratif en français, jouable à plusieurs **sur un même appareil**. Le navigateur héberge l'interface et conserve la partie. Groq joue le rôle du maître du jeu.

## Fonctionnalités

- Création de 1 à 8 personnages avec race, classe et description personnelle (240 caractères).
- Les profils permanents (race, classe et description) sont injectés dans chaque prompt système envoyé à Groq.
- Ambiances prédéfinies ou prompt personnalisé.
- Chaque joueur écrit son action pendant le même tour.
- Le maître du jeu demande les jets nécessaires.
- **Les dés sont tirés réellement par le navigateur** avec `crypto.getRandomValues()` : l'IA ne choisit pas les résultats.
- Une deuxième requête Groq interprète les résultats, raconte la scène et met à jour PV, XP, or, conditions et inventaires.
- État de la partie sauvegardé dans `localStorage`.
- Export et import de sauvegardes JSON.
- Clé API saisie par l'utilisateur, sans serveur intermédiaire.

## Déploiement GitHub Pages

1. Crée un dépôt GitHub.
2. Ajoute `index.html`, `style.css`, `app.js` et `README.md` à la racine du dépôt.
3. Ouvre **Settings → Pages**.
4. Dans **Build and deployment**, choisis **Deploy from a branch**.
5. Sélectionne la branche `main` et le dossier `/ (root)`, puis enregistre.
6. Attends la fin du déploiement et ouvre l'adresse GitHub Pages affichée par GitHub.

Aucune compilation, installation ou configuration serveur n'est nécessaire.

## Première utilisation

1. Ouvre le site publié.
2. Clique sur ⚙ puis colle ta clé API Groq.
3. Choisis le modèle et clique sur **Tester la clé**, puis **Enregistrer**.
4. Ajoute les joueurs, choisis l'ambiance et démarre.
5. Chaque joueur écrit son action, puis le groupe clique sur **Résoudre le tour**.

La clé API doit être créée dans ton compte Groq. Le site utilise l'endpoint officiel `https://api.groq.com/openai/v1/chat/completions`.

## Confidentialité et limites

- La clé est enregistrée dans le `localStorage` du navigateur et envoyée directement à Groq. Elle n'est pas intégrée au dépôt GitHub.
- Ne publie jamais une clé API dans le code, dans un dépôt ou dans une capture d'écran.
- Le jeu est un mode **pass-and-play local** : les joueurs partagent le même ordinateur et le même navigateur. Ce n'est pas une synchronisation réseau entre plusieurs téléphones/ordinateurs.
- Les données de campagne restent dans le navigateur utilisé. Utilise l'export JSON pour les transférer ou les sauvegarder.
- Le modèle peut parfois produire un JSON incorrect ou une mise à jour incohérente. Dans ce cas, le jeu affiche une erreur et ne valide pas le tour.
- Les jets sont aléatoires côté navigateur ; les modificateurs et le nombre de dés sont proposés par le maître du jeu.

## Modifier le maître du jeu

Le prompt système se trouve dans `systemPrompt()` dans `app.js`. Les styles de campagne prédéfinis se trouvent dans l'objet `THEMES`.


## Illustrations automatiques (facultatif)

Le maître du jeu Groq fournit aussi un prompt visuel en anglais à chaque réponse. Pour générer une illustration de chaque scène, déploie le Worker Cloudflare présent dans `worker/` en suivant `worker/README.md`, puis renseigne son URL et son secret dans les paramètres du jeu. Sans cette configuration, le jeu continue normalement sans images.
