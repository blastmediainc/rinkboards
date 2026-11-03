# V71 — Quality-first production export (experimental)

- Uses an embedded PDF Form XObject rather than flattening the full board into a low-resolution DeviceCMYK bitmap. Imported PDF vectors should remain vector.
- Raises raster preview resolution from a 6000px maximum to a 7500px maximum, and uses lossless PNG rather than JPEG for SVG and other flattened elements.
- Keeps the V70 cut-spot and Dropbox fixes.
- IMPORTANT: Production PDF can now contain RGB objects; it is NOT guaranteed all-CMYK. Use Acrobat Pro Print Production > Convert Colors (RGB objects only) with CoatedGRACoL2006, preserving the ThruCut spot, before production.
- SVGs are still rasterized in this version; they are NOT guaranteed vector. Large boards can still have low effective DPI. The original PDFs may also contain raster art.
- Not tested in the live browser, Dropbox or RIP. Keep V70 backed up and preflight all PDFs before printing.
