# Ridwan Amure Website

This repository now hosts a lightweight static personal website designed for direct deployment on GitHub Pages without the old Jekyll template.

## Main pages

- `index.html`
- `about.html`
- `cv.html`
- `research.html`
- `talks.html`
- `tools.html`

## Local preview

From the repository root, run:

```powershell
python -m http.server 8000
```

If `python` is not available on your PATH, use:

```powershell
py -m http.server 8000
```

Then open `http://localhost:8000/`.

## Content sources kept in the repo

- `markdown_generator/` for publication and talk generation scripts and notebooks
- `talkmap/` for the interactive talk map
- `files/` for downloadable papers, slides, and BibTeX
- `images/` for profile and site assets
- `data/site-content.json` for editable site content such as profile, experience, education, skills, interests, themes, and tools
- `data/talks.json` for rich talk entries and talk detail pages
- `articles.bib` for publication data on the research page

## Editing content

You usually do not need to edit the HTML pages to add common content updates.

- Add or update profile, experience, education, skills, interests, themes, and tools in `data/site-content.json`
- Add or update papers in `articles.bib`
- Add or update talks in `data/talks.json`

For publications, the research page will use:

- `url = {...}` when present
- otherwise `doi = {...}` and automatically build the `https://doi.org/...` link

For talks, each entry can include:

- title, venue, date, and location
- hero image and gallery images
- LinkedIn posts, slide decks, code links, and articles
- memories or notes from the event
- tags for grouping related talks

Recommended talk asset pattern:

```text
assets/talks/<slug>/
  hero.*
  photo-1.*
  photo-2.*
  README.md
```

The page layout stays in the HTML files, while the repeatable content lives in `data/site-content.json`, `data/talks.json`, and `articles.bib`.

## Deployment

This site is intended to be served as a static site on GitHub Pages with `.nojekyll` present at the repository root.
