# V67 — CMYK production resolution update

- Production PDF raster target increased from **100 DPI to 150 DPI** at full physical size.
- A **55-million-pixel limit** reduces effective DPI automatically on oversized boards to protect browser memory.
- Export menu label changed to **Production PDF (CMYK)**; removed “Finalize in Illustrator” wording.
- Generic, unprofiled DeviceCMYK conversion and vector ThruCut spot path are retained from V66.
- Proof exports and band generator are unchanged.

**Caution:** This is a high-memory export; a 147 × 30 inch board at 150 DPI uses about 49.6 million pixels and can require hundreds of MB of memory. Source artwork resolution cannot be improved by increasing raster DPI. Confirm output quality, spot ink and dimensions with Acrobat Output Preview and a print test. PDF OCG layers do not necessarily become Illustrator native layers.
