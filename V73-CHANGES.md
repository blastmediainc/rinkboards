# V73 — Band preview reliability
- Retries missing Dropbox SVG previews (V72 uploads previews asynchronously).
- Avoids stale asynchronous canvas image loads overwriting newer band renders.
- Rejects trivially empty preview data rather than silently exporting.
- Original interface and V72 database save behavior preserved.
Note: this does not guarantee a non-blank image if the underlying SVG is missing embedded resources.
