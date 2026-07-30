# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single static landing page (no build step, no framework, no package manager) for a
Spanish-language course: "Ingeniería de Software con IA y Coding Agents". The page is
plain HTML/CSS/JS served as-is.

## Running locally

There is no dev server or build tooling. Serve the directory with any static file server
and open it in a browser, e.g.:

```
python3 -m http.server 8934
```

Then visit `http://localhost:8934/index.html`. There are no tests, linters, or build
commands — verify changes visually in a browser.

## Structure

- `index.html` — all page markup and copy, in Spanish. Sections are anchored by id
  (`#problema`, `#programa`, `#para-quien`, `#inscripcion`, `#faq`) and referenced by
  the nav links at the top of the file.
- `styles.css` — all styling, organized top-to-bottom in the same order sections
  appear in `index.html` (nav → hero → sections → footer). Design tokens (colors,
  fonts, max width) are CSS custom properties at the top of the file under `:root`.
- `script.js` — three independent, self-invoking behaviors with no shared state:
  1. `heroDiff` — types out a fake code diff in the hero terminal mockup
     character-by-character (the page's signature visual element).
  2. `scrollReveal` — fades in `.reveal`-classed elements via `IntersectionObserver`
     as they scroll into view.
  3. `signupForm` — intercepts the email signup form submit; currently client-side
     only (no backend), just swaps in a status message. Wire this to a real
     endpoint/service before relying on it to capture leads.

All three respect `prefers-reduced-motion` and degrade to a static/instant state.

## Design system

The visual identity is a code-editor/terminal metaphor (monospace display type via
IBM Plex Mono, dark charcoal background, amber accent, diff-style green/red for
additions/removals) chosen because the course content is literally about reading and
directing AI-generated diffs. When adding sections or copy:

- Keep headings and labels in `var(--mono)`; body copy stays in `var(--sans)` (Inter).
- Reuse the diff vocabulary (`+`/`−` markers, `.diff-add`/`.diff-rm` colors) for any
  new "this vs. that" content instead of introducing new iconography.
- New scroll-in content should get the `.reveal` class to stay consistent with
  existing sections.
