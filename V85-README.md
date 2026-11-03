# V85 — BCHL team / season Dropbox database

Switch between Blast Media and BCHL in the top toolbar. BCHL uses `/BCHL Rinkboards/<Team>/<Season>/30x<Width>/<Rinkboard>.rinkboard.json`; Blast Media continues using its existing configured folder. Twenty BCHL team names are preloaded in the Team dropdown. Seasons are added through the existing '+ Add new season…' control. Selecting a team and season and saving creates the required Dropbox folders. The BCHL root can be changed under the collapsed Dropbox Settings panel without affecting Blast Media's folder. Existing project data and production PDF format are unchanged.

Upload all four files to the repository root, replacing existing `index.html`, `dropbox-database.js`, and `band-generator.js`. Keep `bchl-logo.png` beside `index.html`. Back up the live site before deployment.

The JavaScript has passed syntax checking; the Dropbox integration and UI have not been tested against your live account. Switching brands clears the current database selection but does not discard current unsaved editor artwork; save your work before opening another project.
