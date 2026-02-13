# toy-outpost-site
Static website for the toy outpost.

## Deploy to Netlify

1. Push this repo to GitHub (or connect GitLab/Bitbucket).
2. In [Netlify](https://app.netlify.com): **Add new site** → **Import an existing project** → choose your Git provider and repo.
3. Netlify will use the repo’s `netlify.toml`: publish directory is the repo root (no build command).
4. Deploy. Optionally set a custom domain under **Domain settings**.

You can also deploy by dragging the project folder into [Netlify Drop](https://app.netlify.com/drop) (no Git required).

## Logo assets
The illustrated logos in `assets/` are generated from PDFs. To regenerate:
```bash
python3 -m venv .venv && .venv/bin/pip install pymupdf
.venv/bin/python scripts/convert-logos.py
```
Update the paths in `scripts/convert-logos.py` if your PDF locations change.
