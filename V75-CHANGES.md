# V75 — Rebuild all database previews

The new **Refresh All Previews** button rebuilds SVG preview files from saved Dropbox `.rinkboard.json` projects. It overwrites only `.preview.svg` files. It does not change editable project JSON or production PDFs. The current editor project is restored when the batch completes, including on error. Preview files are uploaded sequentially and errors are reported.

**Caution:** Do not edit artwork during the rebuild. The operation can take several minutes. A saved project containing missing external image assets may still produce a blank SVG.
