# V70 production PDF recursion workaround

- Production PDF no longer sends the entire SVG through svg2pdf.js, a potential recursion source.
- Uses the existing per-layer canvas rendering for intermediate artwork and then the existing DeviceCMYK production flattening.
- Keeps the existing spot ThruCut path, OCG definitions, imposed layout and Dropbox save changes from V69.
- Adds a stage prefix to artwork preparation and CMYK conversion failures.

**Tradeoffs:** This is a rasterized CMYK export, not a native vector CMYK artwork workflow. Its RGB-to-CMYK conversion is generic and not ICC-managed. Artwork resolution is limited by the current raster cap. Imported original PDF vector art is not preserved in production output. The workaround has not been tested in a browser against a failing project.
