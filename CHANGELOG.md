# Changelog

## [Unreleased]

### Added
- Toast notification system with error/warning/success support
- Global ToastProvider in AppShell
- Service errors tracking (TMDB unavailable detection + banner)
- ARIA labels on EditorPanel, preview frame, poster tiles
- Keyboard navigation for tab panels (ArrowLeft/ArrowRight)
- Focus trap in mobile SettingsPanel
- Skip-to-main-content link in layout
- "Export as file" download button in settings
- Anime TMDB fallback when MDBList key is empty
- Light mode toggle in settings panel
- Context splitting: useBadgeContext, usePosterContext, useAppContext
- docs/BADGES.md documentation for badge extension
- CHANGELOG.md

### Changed
- Improved tab chip contrast (zinc-400 → zinc-300)
- Badge cache key normalization (voteAverage rounded to 1 decimal)
- Tab chips use role="tablist" + aria-selected for accessibility
- useSearch shows toast on search failure

### Fixed
- Image loading failures show toast notification
- TMDB fetch failures tracked in serviceErrors state

## [0.15.0] - 2026-07-19

### Added
- **analyzeLumaWithGrid** — edge detection a stride 4px con griglia calore per penalizzare dettagli sotto il logo
- **Skin-tone detection** — cerca pixel pelle nel bottom 35% del poster, penalizza se il logo si sovrappone a volti/busti
- **Gradient smoothness** — confronta mean top/bottom half della safety area, penalizza gradienti brusci
- **Text penalty migliorato** — rilevamento crediti cinematografici con pattern alternante chiaro/scuro in computeTextPenalty
- **Offset Y variants** — valuta 3 posizioni verticali ([-20, 0, +20]), punteggio finale = 70% base + 30% worst-case
- **Candidati aumentati** — TMDB_CANDIDATE_COUNT da 8 a 12 per pool più ampio
- **Supporto "Prime Video"** in NETWORKS per matchare etichette Wikidata senza "Amazon"
- **Fallback studios da Wikidata** — awards API ora restituisce studios; se TMDB non ha networks, il client usa wikidata

### Changed
- computeTextPenalty ora usa weighting: density 0.25 + edge 0.25 + pattern 0.20 + textLineScore 0.30
- scorePosterLogoFit integra gradualmente tutte le nuove metriche nello score composito

### Fixed
- Duplicato "Ritorna" nel dropdown badge rimosso (params.extra era aggiunto due volte in getAllBadgeOptions)
- Badge studio mostrava "Ritorna" invece del network per titoli senza networks TMDB (fallback a wikidata)
- Offset Y variants threadato attraverso rankBestFitPosters, poster-auto-fit e API route
