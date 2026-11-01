# Rinkboard Builder V16 — Dropbox Database

## Deploy to GitHub Pages
Upload **both** `index.html` and `dropbox-database.js` to the **same directory** in your GitHub Pages repository. Keep existing filenames. The HTML file alone will not enable the database.

## Dropbox setup (one-time)
1. Make sure every employee has access to the same Dropbox shared folder (for example `/Rinkboard Database`). Each person's Dropbox mount path must match the path entered in the app.
2. Go to https://www.dropbox.com/developers/apps and create an API app. Choose **Scoped access** and **Full Dropbox** (needed to access an existing shared team folder, rather than only a dedicated app folder).
3. Under **Permissions**, enable `files.metadata.read`, `files.content.read`, and `files.content.write`, and save.
4. Under **Settings > OAuth 2 > Redirect URIs**, add the exact public URL of your builder, such as `https://YOURNAME.github.io/YOURREPO/` (or `https://YOURNAME.github.io/YOURREPO/index.html` if that is the URL you actually use). The redirect URI must exactly match the URL in your browser when clicking Connect Dropbox. If employees use both URLs, add both.
5. Copy the **App key** (NOT the App secret). Open the deployed builder, click **Database**, enter the App key and shared folder path, then click **Save Settings** and **Connect Dropbox**. Employees sign in with their own accounts and authorize access.
6. Choose a team and season, then use **Save Current Artboard** or **Save All Artboards**. Click a tile to reopen its editable project. Click Refresh to see teammates' latest changes.

## How data is stored
`/Rinkboard Database/<Team>/<Season>/30x<Width>/<Sponsor>.rinkboard.json` contains the editable one-artboard project; a companion `<Sponsor>.preview.svg` is created for the alphabetical grid. Artboards are 30 inches tall and categorized by width. The grid displays thumbnails at up to 96 CSS pixels (about 1 inch at standard CSS scale), rather than physically sized print artwork.

## Important limitations
- Dropbox is **file storage**, not a transactional database. Revision checks detect many conflicting saves, but do not provide real-time collaborative editing. Coordinate editing of the same sponsor.
- Existing artwork can contain embedded images and PDFs, so project files may be large. Dropbox upload limits and browser memory still apply.
- Authentication uses OAuth 2 PKCE with a short-lived token stored in browser session storage; employees may need to reconnect after expiry. The App key and shared folder path are stored locally in the browser; **never put an App secret into the website**.
- Access is controlled by Dropbox shared-folder permissions. A Dropbox API app using Full Dropbox access requests broad permissions from each employee; review this with your Dropbox admin before rollout.
- Dropbox folder paths can differ between users even for the same shared folder. Each employee can configure their own folder path.
- Preview SVGs are generated from editable artwork; some complex embedded PDF artwork may display as a fallback preview.
- No Dropbox connection or live multi-account browser test was performed during packaging. Test with two staff accounts before production use.
