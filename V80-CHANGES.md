# V80 — Preview refresh invalid JSON handling

Validates saved Dropbox project JSON before attempting to render; identifies the specific corrupt/non-JSON record and continues refreshing other checked records. Never overwrites the editable record. Keeps existing checkbox-based preview refresh and original interface.

This does not repair corrupt editable JSON records; those must be restored from a valid backup or Dropbox version history.
