# V76 — Copy/Paste editable artwork

- Copy and Paste buttons beside Duplicate in builder toolbar.
- Cmd/Ctrl+C copies the selected layer; Cmd/Ctrl+V pastes it.
- Works between artboards in the same open browser tab.
- Duplicates full editable layer data including original imported source references, with a new layer ID.
- Paste offsets by 15 editor units so it is visible; Undo can revert.
- Existing paste-from-Illustrator handling is retained when there is no internal copied layer.

Limitations: Internal layer clipboard is session-only, not the OS clipboard. When a layer has been copied, Ctrl/Cmd+V pastes it rather than external artwork; use the existing upload workflow to bring in new external art. No live browser end-to-end tests performed.
