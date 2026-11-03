# V89 — Bands logo upload formats

The Bands team-logo upload now accepts PNG, SVG, PDF and WEBP.

- PDF: renders the first page at high resolution.
- SVG: sanitizes potentially active/external content and renders to PNG.
- WEBP: renders to PNG.
- PNG: retained as-is.

All formats are saved to Dropbox as the team's existing `.png` logo key, keeping the Load Team Logo and batch PDF export behavior compatible. The conversion is for display/export and does not preserve SVG/PDF vector paths in the stored team logo.
