# Rinkboard Builder V21

Upload `index.html` and `dropbox-database.js` to the root of the GitHub Pages repository, replacing both existing files.

## Database batch exports
- Tick the checkbox beside each artboard name. Select visible and Clear selection are available. Selections persist when changing filters.
- Choose Proof PDFs, Production PDFs, or both. Click Export selected.
- Each format downloads a combined PDF containing only selected artboards. Proofs use the builder's proof format (10% scale). Production uses the same 100% quantity-based two-copies-per-page imposed layout with `artwork` and `thru cut` PDF layers and a blue centre divider.
- Saved Dropbox project JSON is used to regenerate the PDFs. The current editor project is restored afterwards.
- Existing save/edit/Dropbox workflows remain available.

Note: When both output formats are checked, the browser may ask for permission to download multiple files. Production PDF layer compatibility should be validated in Acrobat before sending to the printer.
