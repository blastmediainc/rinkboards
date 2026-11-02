# V68 ICC conversion — test build

This build uses the supplied **CoatedGRACoL2006.icc** profile and converts the flattened artwork image from RGB to CMYK via LittleCMS (Pillow ImageCms). It retains the V67 PDF OCG layer references and ThruCut spot path. **Not tested on Render or through your RIP.** Keep V67 live until a complete test passes.

## Deploy the converter
1. Create a **separate GitHub repository** for the files in `render-service/`. Upload its contents to the repository root (including the ICC file). Do not publish this service in the public rinkboards GitHub Pages repository unless you are comfortable distributing the ICC profile.
2. Render → New → Web Service → connect the service repository → Docker runtime → Free plan → Deploy.
3. Wait for deployment; visit `https://YOUR-SERVICE.onrender.com/health` and check it returns `status: ok`.
4. Open `index.html` and replace `https://REPLACE-WITH-YOUR-RENDER-URL.onrender.com` with your actual Render URL.
5. Deploy updated website files to GitHub Pages. **Back up V67 first.**
6. Export a single board and inspect in Acrobat Output Preview / Preflight for CMYK artwork, ThruCut spot, correct dimensions, and output intent. Print a test before production.

## Limitations
- Flattened artwork is raster at the V67 effective resolution (target 150 DPI, reduced on huge boards).
- The service must be online and can time out or run out of memory on large files, especially on Render Free.
- This is a browser-to-service upload. The service does not store uploaded PDFs intentionally.
- The converter rejects unexpected RGB image formats instead of returning a misleading print-ready PDF.
- The PDF's named OCG layers may not become native Illustrator layers; test in the software you use.
- Output intent is added; this does not make the file formally PDF/X compliant.
