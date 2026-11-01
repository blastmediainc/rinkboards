# Rinkboard Builder V19 — Named production PDF layers

Upload `index.html` and `dropbox-database.js` to the root of your GitHub Pages repository.

Production PDFs have two actual PDF Optional Content Groups (layers), named **thru cut** (top) and **artwork** (bottom). The only item in thru cut is a 1 pt blue centre divider on two-copy pages. Single-copy pages have no cut line. Copies are imposed two per page at full size according to the artboard quantity. This applies to current-artboard export, all-artboards export and automatic Dropbox production PDF saves. Proof exports are unchanged.

Open a test PDF in Acrobat Pro > Layers to verify both names and visibility. Check page dimensions and confirm the printer recognizes the blue stroke in the thru cut layer before production. The PDF layer is an Optional Content Group, not an Illustrator-native layer. The PDF uses online JavaScript libraries, so the editor needs an internet connection.
