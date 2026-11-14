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


## Illustrations automatiques avec Pollinations (facultatif)

Groq génère un prompt visuel en anglais à chaque scène et à chaque tour. Le navigateur envoie ce prompt à Pollinations, qui renvoie une illustration FLUX.1 Schnell en format paysage.

### Configuration

1. Crée une clé API sur [enter.pollinations.ai](https://enter.pollinations.ai/keys).
2. Dans le jeu, ouvre **⚙ Paramètres**.
3. Colle la clé dans **Clé API Pollinations**.
4. Clique sur **Tester l'image**, puis sur **Enregistrer**.

Aucun serveur, déploiement séparé, compte Cloudflare ou installation n'est nécessaire. Le bouton **Régénérer l'illustration** permet de relancer l'image de la scène actuelle.

### Quotas et sécurité

Pollinations demande une clé API pour les générations et utilise un système de crédits appelé *Pollen*. Ce n'est pas un service illimité ou garanti gratuit : vérifie le solde et les limites de ta clé dans ton compte. Les erreurs de quota n'interrompent pas la partie.

La clé est conservée dans le stockage local du navigateur et n'est pas ajoutée au dépôt GitHub. Comme il s'agit d'une clé secrète utilisée directement depuis le navigateur, ne l'utilise que pour ton usage personnel et règle un budget limité sur le compte Pollinations. Pour une application publique multi-utilisateurs, il faudrait une authentification utilisateur dédiée plutôt qu'une clé secrète partagée.
