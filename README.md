# Blast Media Rinkboard Builder

A browser-based tool for designing, organizing, and exporting hockey rinkboard graphics. The app can be hosted as a static website on GitHub Pages and connects to Dropbox for a shared artwork database.

## What it does

### Build rinkboard artwork
- Create and edit rinkboard designs on artboards with adjustable widths and a standard 30-inch height.
- Add and arrange artwork, including supported image, SVG, and PDF assets.
- Manage multiple artboards, sponsor details, quantities, scale, bleed, and proof contact information.
- Save editable project data for future changes.

### Organize designs in Dropbox
- Connect to Dropbox using your own account to access the team's shared database.
- Browse saved rinkboards by **Team**, **Season**, and **Size**.
- Add new teams, seasons, or sizes from the database interface.
- Find saved artboards by name and reopen them for editing.

### Export proofs and production files
- Export proof PDFs for review, including contact information.
- Export full-size production PDFs with quantity-based imposition, up to two rinkboards per page.
- Production PDFs use separate named PDF layers: **artwork** for the design and **thru cut** for the blue centre dividing line on two-copy pages.
- Select individual saved artboards using checkboxes, set an export quantity for each, and export proofs, production files, or both directly from the database.
- Optionally override the proof contact name during database export without changing the saved artboard.
- Selected proof artboards export together as **one multipage proof PDF**. A single-board proof uses `Team_Season_Sponsor_Size_Proof.pdf`; a multi-board proof uses a descriptive selection filename.
- Each selected production artboard exports as a **separate production PDF**, named `Team_Season_Sponsor_Size_Production.pdf` (with its selected quantity imposed inside that PDF).

## Files

- `index.html` — Main application and interface.
- `dropbox-database.js` — Dropbox connection and database functionality.

Keep both files together in the same directory when publishing.

## Publish with GitHub Pages

1. Upload `index.html` and `dropbox-database.js` to your GitHub repository.
2. Enable GitHub Pages for the repository's publishing branch if it is not already enabled.
3. Open the published site, connect your Dropbox account, and select the shared database folder.

## Notes

- Dropbox access requires an appropriately configured Dropbox application and authorization from each user.
- Browser settings may require permission for multiple downloads when exporting several artboards.
- Before sending production files to print, verify the final PDF dimensions and named layers in your production software and confirm the cutter recognizes the blue centre line.

### Illustrator and EPS logos

PDF-compatible Adobe Illustrator `.ai` files can be uploaded directly; their PDF content is preserved as vector artwork in production exports. To use an EPS or legacy AI file, open it in Adobe Illustrator and save a PDF or SVG copy first. EPS PostScript cannot be reliably interpreted in a browser without a dedicated conversion engine. The Live Trace tool has been removed.

## Saving from the builder

Choose **Team** and **Season / Year** from the builder sidebar, then click **Save to Database** in the top toolbar. The dropdowns show existing Dropbox folders and offer **+ Add new** to create a team or season. The active artboard is saved with its editable project and production PDF. Connect Dropbox in the Database panel first.

## Database previews

Hover over or focus a rinkboard name in the database to see its saved artwork preview at approximately 10% physical scale (subject to screen fitting). Previews are fetched from Dropbox on demand; the name-only database listing remains unchanged.


## AI and EPS logos

Upload PDF-compatible Illustrator (.ai) files directly. Other AI and EPS files are automatically converted to PDF through the Blast Media Cloudflare Worker and CloudConvert before being placed on the board. Converted PDFs are kept as vector originals for production export where supported. Files are sent to the third-party conversion service; do not upload confidential assets without authorization. Conversion requires a working Worker deployment, CloudConvert API key and service availability.

The site favicon is supplied as `favicon.png` and `favicon.ico` and uses the Blast Media icon from the app logo.


## Packaging bands

Use **Generate Band** on the Builder screen, or select exactly one database rinkboard and choose **Generate Band**. Bands export as 17 × 3.222 inches with a deliberately blank left wrap area. The shipment month defaults to the current month and can be changed before export. Team logos are shared via Dropbox under `/Rinkboard Database/Team Logos/`, named after the team with spaces removed (e.g. `AbbotsfordCanucks.png`). Use **Upload / replace team logo in Dropbox** in the Band Generator. Dropbox must be connected before loading or uploading logos. Band PDFs use a high-resolution raster composite of the layout, including the rinkboard preview.


V37: Band export uses vector PDF text/outlines and SVG rinkboard artwork. Uploaded PNG logos retain native resolution; raster elements in rinkboard SVG remain raster.


V38: Improved Blast Media logo embedding in band PDF exports.

V39: Restored the Blast Media Print header logo with a validated, optimized embedded PNG.

V40: Proof builder header logo now uses the same embedded, verified Blast Media Print PNG as the main app header.

V42: Fix band vector PDF export by using jsPDF svg plugin method.

V43: Band generator supports multiple selected database rinkboards, exported as separate PDF downloads. Missing SVG PDF plugin falls back to high-resolution board raster.

## Database deletion (V44)
Select one or more rinkboards in Database and click **Delete selected**. Type `DELETE` to confirm. Deletes the selected `.rinkboard.json` records and associated `.preview.svg` and `.production-100pct.pdf` files from Dropbox; does not delete team logos or folders. Dropbox permissions must include `files.content.write`. Deletions affect all users of the shared database.


V48: Width changes automatically vertically center the artwork as a group; database size sections can be shown/hidden individually or all at once.

V54: production thru cut is a named PDF Separation spot colour (ThruCut), alternate RGB 0/0/255, with full perimeter and inter-board divider on the thru cut optional-content layer.

V55: fix spot-colour PDF export crash when page resources have no ColorSpace dictionary. Uses optional lookup and creates it when missing.

V56: production PDF trim sheet and spot cut path use exact 72 pt/in from user-entered width and 30-inch height, independent of imported PDF page rounding.

V60 production workflow: Export > Production PDF downloads the layered source PDF; Illustrator must finalize it. File > Scripts > Other Script > Finalize-Production-PDF.jsx, select downloaded PDF. Saves _Illustrator.pdf with editable Artwork and Thru Cut native layers, spot ink and preserveEditability enabled. This is NOT silent browser-to-Illustrator automation. Validate geometry, spot ink and vector content before production.

V61: Confirmed Illustrator Layered SVG export is absent. Production PDF and Illustrator finalizer remain.

V62: Production PDFs remove unused inherited font resource dictionaries from graphics-only page/Form XObject streams, avoiding RIP Helvetica requests. Fonts in streams with PDF text objects or undecodable streams are retained. Both single and batch production exports use the cleanup; proof exports unchanged. Verify with printer RIP before live production.
