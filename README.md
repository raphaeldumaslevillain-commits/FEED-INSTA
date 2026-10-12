# Feed Instagram Anekdote

Reproduction du profil sombre **@anekdotefr**, avec un aperçu iPhone et un éditeur local de composition. HTML, CSS et JavaScript natifs, sans dépendance à installer et sans connexion à Instagram nécessaire pour utiliser la page.

## Version en ligne

[Ouvrir le feed sur GitHub Pages](https://raphaeldumaslevillain-commits.github.io/FEED-INSTA/). Aucun serveur local n’est nécessaire.

GitHub Pages publie automatiquement la racine de la branche `main`. Le fichier `.nojekyll` conserve le site HTML/CSS/JavaScript tel quel. Les imports et compositions restent stockés dans votre navigateur.

## Ouvrir l’aperçu local

Ouvrir `index.html` directement dans un navigateur, ou utiliser Node.js :

```sh
npm run dev
```

L’aperçu est alors disponible sur `http://127.0.0.1:4173`. Pour choisir un autre port : `npm run dev -- --port 8080`.

## Mode éditeur

- Cliquer sur **mode éditeur**, à côté de l’iPhone. Sur un petit écran, le bouton est placé au-dessus du téléphone.
- Déposer une ou plusieurs images dans la zone d’import ou sur la grille. Le sélecteur de fichiers est également disponible.
- Chaque nouveau post s’insère **juste après le post épinglé**, et décale les autres. Un import multiple respecte l’ordre des fichiers.
- Glisser un post sur un autre pour **échanger exactement leurs places**. Les autres positions sont conservées.
- Le premier post, **Nos expertises**, ne peut jamais être déplacé, remplacé ni supprimé. Un fichier déposé sur lui est ajouté à la deuxième position.
- Sur écran tactile, glisser depuis la poignée du post. Le reste de la grille permet de faire défiler le téléphone normalement.
- Au clavier, sélectionner un post avec Tab, puis utiliser les flèches. Les flèches gauche/droite déplacent d’une case ; haut/bas de trois cases. Les boutons du panneau sont aussi disponibles.
- Seuls les faux posts importés peuvent être supprimés. **Annuler** restaure la dernière opération ; **Réinitialiser** restaure les six posts d’origine et peut aussi être annulé.
- Désactiver le mode éditeur pour retrouver l’aperçu. Les stories et les posts conservent leur survol, sans ouvrir de contenu ou naviguer vers Instagram.

Chaque import, déplacement, suppression et réinitialisation déclenche une sauvegarde automatique des photos et de leur ordre dans IndexedDB, sur le même navigateur et le même appareil, sans envoi vers un serveur. Les images reviennent après fermeture puis réouverture du site, et le mode éditeur reste désactivé lors du chargement. Les anciennes sauvegardes sont reprises automatiquement.

Le panneau indique « Enregistrement… », puis confirme la sauvegarde seulement quand elle est terminée. Si elle échoue, un bouton permet de réessayer et le navigateur avertit avant de quitter avec des modifications non enregistrées. Un échec de lecture ne remplace pas la sauvegarde existante. La protection contre l’effacement automatique du stockage est demandée aux navigateurs compatibles ; le navigateur garde le contrôle de cette autorisation. En navigation privée ou après effacement volontaire des données du site, les données ne peuvent pas être conservées. Si IndexedDB est indisponible, un repli sur le stockage simple du navigateur est utilisé, avec une capacité limitée.

Formats acceptés : JPEG, PNG, WebP et GIF, jusqu’à 15 Mo par image, 20 fichiers par import et 100 posts au total. Les images fixes sont optimisées à 1600 px maximum ; les GIF sont conservés. Les nouveaux posts utilisent le même cadrage central au format 3:4 que la grille.

## Référence et visuels

La capture « Capture d’écran 2026-10-07 à 15.26.45.png » fournie par l’utilisateur est la référence visuelle. Le compte public a été contrôlé le **7 octobre 2026** : ses six premiers visuels correspondaient à la capture.

Les six posts, la photo de profil et les huit couvertures de stories sont stockés dans `assets/`. Les titres intégrés aux publications restent dans les images originales. Le fragment des abonnés en commun provient de la capture fournie. Le profil représente cet instantané ; les publications ne se mettent pas à jour automatiquement.

`?view=reference` affiche le contenu sans cadre iPhone au format de la référence pour les comparaisons visuelles. Le mode standard adapte l’en-tête à la largeur du téléphone, avec une zone de défilement et une barre de navigation décorative.

## Vérification

```sh
npm test
npm run check
```

- 8 tests des invariants : échange, épingle, insertions multiples, suppression, restauration et données sauvegardées invalides.
- `http://127.0.0.1:4173/tests/browser.html` : 20 tests exécutés dans le navigateur, notamment fermeture et réouverture, migration des anciennes données, photo de plus de 5 Mo, écritures rapides et nouvelle tentative après échec, avec de vrais fichiers et événements de drag-and-drop. Ils utilisent un stockage **séparé** de la composition de l’utilisateur.
- `tests/responsive.html?width=375&height=900` : rendu dans une fenêtre de test de taille fixe. `edit=1` ouvre l’éditeur ; `reference=1` affiche la référence sans cadre. Cette page utilise également le stockage de test.
- Le rapport `design-qa.md` décrit les comparaisons visuelles et les limites vérifiées.

## Fichiers

- `index.html` : profil, stories, cadre et panneau d’édition.
- `styles.css` : reproduction visuelle, survols et adaptation aux écrans.
- `model.js` : données initiales et règles de déplacement qui protègent l’épingle.
- `app.js` : imports, drag-and-drop, commandes au clavier, annulation et état de sauvegarde.
- `storage.js` : enregistrements atomiques dans IndexedDB, migration des anciennes compositions et repli en cas d’indisponibilité.
- `scripts/serve.cjs` : serveur local pour l’aperçu et les tests.

Les visuels et marques Anekdote/Instagram conservent les droits de leurs propriétaires. Voir `assets/CREDITS.md` pour les sources des assets et les licences des icônes.
