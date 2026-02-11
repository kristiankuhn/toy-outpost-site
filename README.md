# toy-outpost-site
Static website for the toy outpost (GitHub Pages).

## Logo assets
The illustrated logos in `assets/` are generated from PDFs. To regenerate:
```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf
.venv/bin/python scripts/convert-logos.py
```
Update the paths in `scripts/convert-logos.py` if your PDF locations change.
