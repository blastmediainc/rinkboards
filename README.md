# Rinkboard Builder V25

Removed the V24 Active database dropdown and Find databases button. The database now uses cascading Team → Season → Board size dropdowns, populated from the existing Dropbox folder structure and saved artboards. Each dropdown has an “+ Add new…” option; this creates the matching folder in Dropbox. Team and Season must be selected before creating a new size; sizes are 30 inches high and use the entered width. All teams/seasons/sizes can still be browsed via the All options. The existing Shared folder path setting remains for the root database. Individual selection checkboxes, export quantities, proof and production exports remain intact.

Deploy both index.html and dropbox-database.js. Test in the connected browser before production use.
