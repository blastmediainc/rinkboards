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
