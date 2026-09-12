# Vendored dependencies

## `flowtts/` — ThonburianTTS

- **Upstream**: https://github.com/biodatlab/thonburian-tts
- **Commit vendored**: `032fe7e51674afe066a98e6d3cf47fc96d04b290`
  ("Adding setup.py to allow pip install thonburian-tts", 2026-02-17)
- **Why vendored instead of pip-installed**: upstream's `setup.py` uses
  `find_packages()`, but `flowtts/` has no `__init__.py`, so a
  `pip install git+...` installs project metadata only and
  `import flowtts` fails (see the plan's CONTEXT.md, "The three local
  models").
- **Delta from upstream**: added `flowtts/__init__.py` (empty except a
  provenance comment). Additionally `__pycache__/` directories (compiled
  artifacts upstream accidentally committed) are not carried. No other
  file is modified.
- **License**: code is MIT — upstream's `LICENSE-MIT` is carried at
  `flowtts/LICENSE-MIT`. The model **weights**
  (`hf://biodatlab/ThonburianTTS`) are **CC-BY-NC-SA (non-commercial)**;
  fine for this personal, locally-run tool — reconsider before any
  commercial or distributed use.
- **Import path**: `backend/app/models.py` inserts `backend/vendor/` into
  `sys.path` before `import flowtts` (the backend is a non-packaged `uv`
  project; nothing installs the vendored tree into site-packages).
- **Runtime deps**: the inference path imports the `f5_tts` PyPI package
  plus `pydub`, `pythainlp`, `cached-path`, `hydra-core`, `omegaconf`,
  `soundfile` — declared in `backend/pyproject.toml`.
