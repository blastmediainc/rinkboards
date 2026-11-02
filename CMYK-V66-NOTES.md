# V66 experimental flattened CMYK Production PDF

This build modifies only the Production PDF artwork path. The source PDF is rendered by PDF.js to a bitmap (target 100 DPI, reduced automatically above 40 million pixels), then pixels are converted using a simple unprofiled RGB-to-CMYK formula and embedded as a PDF /DeviceCMYK image. The vector ThruCut separation path and OCG structure from V63 are generated afterward.

**Important:** This is a test build, NOT a preflighted production release. The bitmap may be too low resolution for your printer; colour conversion is generic, not ICC-calibrated; rendering PDFs can alter transparency and appearance. The PDF optional-content groups are not equivalent to native Illustrator layers. Verify DeviceCMYK, ThruCut spot and dimensions in Acrobat Output Preview and perform a test print before using in production.

Proof and band generator paths were not intentionally modified. The export may take time and memory on long boards. If it fails, use V63.
