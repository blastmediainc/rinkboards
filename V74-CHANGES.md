# V74 — first band export reliability
- Fixes preview retry logic in getBoard; V73 did not actually include it.
- Decodes each board preview before generating its PDF.
- Clears previous board preview between batch records.
- Adds 450ms pacing between downloads, reducing browser download blocking.
- Keeps interface, PDF format, and V72 saving behavior.
- Requires browser permission for multiple automatic downloads; no browser-side script can override that permission.
