# Linux desktop references

Home and Photos use reviewed Linux Chromium references. The default references remain the macOS captures. The other routes and mobile views continue to use their existing shared references.

Both platforms render the self-hosted Noto Sans font at weight 600. CDP confirms custom font glyphs, all required faces load, and font assets are byte-identical. Linux text metrics make the social controls wrap inside the existing responsive header; this moves content 37 pixels. No navigation labels, imagery, crops, styles, or production code changed. The first Photos image is byte-identical after accounting for that offset.

These full-page references were captured with focus on BODY, scrollY 0, and explicit font-loading barriers. `provenance.json` records the source commit, CI run, hashes, and rendered-font geometry. Visual tolerances and masks are unchanged. Never replace a reference solely to silence a test; inspect the actual render and compare content, geometry, fonts, and runtime diagnostics first.
