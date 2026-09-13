# Added by this repository (not upstream): upstream's setup.py uses
# find_packages(), which omits `flowtts/` because this file was missing —
# `pip install git+.../thonburian-tts.git` installs metadata only and
# `import flowtts` fails. This file is the vendoring delta that makes the
# package importable. See backend/vendor/README.md for provenance.
