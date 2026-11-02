# V68 connected test build

Render endpoint is configured as https://rinkboard-icc-converter.onrender.com.

1. Keep your existing V67 GitHub Pages site live while testing.
2. Open this package's index.html locally or publish it on a separate test branch/site. Local browser file:// requests may trigger CORS restrictions; serving via HTTPS is recommended.
3. Export a small single-board Production PDF, then inspect in Acrobat Output Preview for CMYK process image, ThruCut spot ink, dimensions, and output intent. Also verify physical print.
4. If you see a CORS error, verify the Render service allows your GitHub Pages origin.
5. Render Free may sleep and take time to wake. Large jobs may hit memory/time limits.

This is a connected test build, not a validated production release. Do not replace V67 until a test PDF passes preflight and RIP printing.
