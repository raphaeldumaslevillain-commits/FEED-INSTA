# Contrôle visuel et fonctionnel

final result: passed

Date : 7 octobre 2026.

## Sources et preuves

- Source visuelle : `docs/evidence/reference.png`, capture fournie par l’utilisateur, 1018 × 1422 px.
- Rendu navigateur : `docs/evidence/implementation.jpg`, 1018 × 1422 px.
- Comparaison côte à côte : `docs/evidence/comparison.jpg`, 2036 × 1422 px ; source à gauche, implémentation à droite.
- Rendu mobile : `docs/evidence/mobile-375.jpg`, fenêtre CSS de 375 × 900 px.
- Mode éditeur : `docs/evidence/editor.jpg`, fenêtre CSS de 1280 × 1100 px ; écran de l’iPhone mesuré à 393 × 852 px.

Comparaison de référence : viewport CSS de 1018 × 1422 px, contenu sans le cadre, thème sombre, mode aperçu, six publications d’origine. Capture navigateur normalisée à une image par pixel CSS, sans étirement. Les éventuelles marges du navigateur ont été retirées. Le cadre iPhone, la barre système et la navigation décorative sont exclus de cette comparaison parce qu’ils sont ajoutés pour l’aperçu demandé.

Le haut de la grille est à 556,7 px, contre environ 557–558 px dans la capture ; sa largeur est de 971,3 px, contre environ 971 px dans la source. Les petites différences de rasterisation des fontes sont classées P3. Le rendu mobile adapte volontairement l’en-tête à la largeur disponible et montre les stories dans une bande défilable.

## Surfaces de fidélité

- **Typographie** : famille système proche de la source pour l’interface, italique Georgia pour la première ligne de bio. Taille, graisse, hiérarchie et retour à la ligne comparés sur l’en-tête agrandi et la vue complète. Les textes graphiques des posts restent dans les vrais assets.
- **Espacement** : proportions de l’avatar, largeur et position de l’en-tête, boutons, stories, espacement des onglets et grille recalibrés à partir de la capture. Grille de trois colonnes, ratio 3:4, séparation d’un pixel au format de référence.
- **Couleurs** : fond `#0b0f11`, texte clair, boutons gris `#25292d`, icônes secondaires atténuées. L’orange des contrôles d’édition est distinct du profil et cohérent avec les publications.
- **Images** : six publications originales, avatar et huit couvertures téléchargés depuis le profil observé. Aucun remplacement généré ni illustration redessinée. Logos, textes et cadrages contrôlés. Les images se chargent depuis le dépôt.
- **Contenu** : nom, bio, lien, compteurs, abonnés en commun, noms et ordre des stories vérifiés contre la référence. Les faux posts augmentent seulement le compteur d’aperçu.

La comparaison de l’en-tête a été examinée séparément à 1018 px de large afin de lire les textes, les compteurs et les icônes ; la vue complète côte à côte contrôle le rythme vertical et les cadrages des six publications.

## Historique des corrections

1. **P1 — Badges de posts surdimensionnés** : une règle d’image s’appliquait également aux icônes. La règle cible désormais uniquement l’image de contenu. La nouvelle capture montre des badges de petite taille dans le coin supérieur droit.
2. **P2 — Contenu du téléphone trop grand à l’échelle réduite** : les tailles fixes faisaient déborder l’en-tête et masquaient la grille. Les dimensions mobiles suivent maintenant la largeur du téléphone. La capture à 375 px et la capture d’ordinateur montrent les six visuels dans le téléphone.
3. **P2 — En-tête trop haut et onglets mal répartis** : correction de la hauteur du résumé, des marges, des graisses et des quatre colonnes d’onglets. La comparaison finale aligne le départ de grille à moins de deux pixels de la source.
4. **P2 — Tests partageant le stockage de l’utilisateur** : l’application dispose d’un stockage de test séparé avec `sandbox=1`. Le banc de tests et les fenêtres de contrôle ne modifient plus la composition réelle. Les 13 tests navigateur ont été relancés après cette correction.
5. **P2 — Poignées tactiles trop petites** : les zones de déplacement font 44 × 44 px. La capture finale du mode éditeur montre les poignées corrigées.

Les corrections ont été suivies de nouvelles captures et d’une nouvelle comparaison. Aucune différence P0, P1 ou P2 restante n’a été identifiée.

## Interactions vérifiées

8 tests automatisés du modèle et 13 tests dans le navigateur, tous réussis :

- échange exact de deux positions ; refus de déplacer ou de cibler l’épingle ;
- import multiple et ajout immédiatement après l’épingle, même en déposant un fichier sur cette dernière ;
- déplacement et suppression des faux posts ; interdiction de supprimer les originaux ;
- déplacement au clavier, annulation, réinitialisation et annulation de la réinitialisation ;
- restauration locale sans activer automatiquement l’éditeur ;
- rejet de fichier texte et de faux JPEG ; aucun import tardif après désactivation ;
- aucune réorganisation ni import hors mode éditeur ;
- stories et posts sans lien ; aucune image ou icône cassée.

Un import a également été effectué par le véritable sélecteur de fichiers du navigateur : le nouveau post apparaissait à la deuxième place, compteur à 542 et épingle conservée.

Responsive : fenêtres de 375 × 900, 768 × 1024 et 1280 × 1100 px ; largeur de document égale à la largeur disponible, sans débordement horizontal. Le bouton est latéral sur tablette/ordinateur et placé au-dessus sur mobile.

La console de l’aperçu principal a été contrôlée : aucune erreur ou alerte d’application observée. La fixture d’iframe a rencontré des erreurs `MutationObserver` des outils de navigateur pendant les changements de capture ; l’application ne contient aucun `MutationObserver` et les tests ont continué à passer.

## Limites et P3

- De petites différences d’anticrénelage, de graisse système et de tracé de certaines icônes dépendent du navigateur et du système.
- L’image source représente un instantané du compte ; l’application n’effectue pas de synchronisation Instagram.
- Le geste tactile depuis la poignée est implémenté, mais n’a pas été essayé sur un iPhone physique. Les boutons et commandes au clavier offrent une alternative testée.
- Une saturation du stockage local est signalée ; la composition reste alors en mémoire pendant la session.

## Checklist finale

- [x] Comparaison visuelle source/rendu et contrôle de l’en-tête.
- [x] Vrais visuels présents, aucun placeholder.
- [x] Épingle protégée par les règles de données et les interactions.
- [x] Imports, annulation, sauvegarde et aperçu fonctionnels.
- [x] Tests de données, tests navigateur et vérification de syntaxe réussis.
- [x] Responsive et captures de preuve enregistrés.
- [x] Prévisualisation locale maintenue ouverte pour l’utilisateur.
