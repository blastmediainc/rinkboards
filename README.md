# Rinkboard Builder V24

Adds **Active database** dropdown to the Dropbox database window. Click **Find databases** to list top-level folders accessible in your connected Dropbox account. Selecting a folder changes the active database and refreshes its contents. Existing **Shared folder path** remains available for nested folders; enter a custom path and click **Save Settings**. Switching databases clears old selections and the currently selected edit record, avoiding accidental cross-database updates.

Deploy `index.html` and `dropbox-database.js` together to GitHub Pages. Database folders must use the same Team / Season / 30xWidth / Sponsor.rinkboard.json structure.

Note: Discovery lists top-level Dropbox folders; nested folders can be entered using the Shared folder path. Browser/Dropbox live testing has not been performed.
