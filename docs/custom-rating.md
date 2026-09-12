# Custom Rating Provider

Optional backend enrichment from any external rating service, using IMDb IDs.
The existing TMDb/MDBList `voteAverage` badge remains unchanged. Custom ratings
appear in a separate horizontal pill row above the existing bottom badge.
When disabled, no multi-rating row is rendered. When enabled, available internal
IMDb data is combined with the provider items for non-mapped, saved and query posters.

The IMDb ID is resolved without an extra TMDB call when possible: a `tt...`
path ID is preserved by the poster route, `?imdbId=` wins in preview/query,
and saved mappings persist `imdbId` at save time. Only when none is available
does the route fall back to `getExternalIds` (which needs a TMDB key).

## Configuration

Endpoint can be set from the editor (Settings, admin) or via environment
variables. The canonical prefix is `PICTORIUM_`; `POSTERIUM_` is supported as
a legacy fallback through `envWithFallback()`. Canonical values take
precedence. Precedence for the endpoint: **saved UI value > env** (empty UI
value falls back to env). The API key header is env-only (`X-API-Key` default;
previously saved UI values are still honored). The API key is env-only and
never appears in the UI, tokens, mappings or URLs (`GET /api/defaults` is
public).
`PICTORIUM_CUSTOM_RATINGS` (or the editor display toggle) controls the row;
the endpoint needs `{imdbId}`, http(s) and no URL credentials (rejected on
save with 400).

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `PICTORIUM_CUSTOM_RATING_ENABLED` | `false` | Enable with `true` or `1` |
| `PICTORIUM_CUSTOM_RATING_ENDPOINT` | empty | HTTP(S) URL containing `{imdbId}` |
| `PICTORIUM_CUSTOM_RATING_API_KEY` | unset | Optional secret sent only in a header |
| `PICTORIUM_CUSTOM_RATING_API_KEY_HEADER` | `X-API-Key` | Header for the secret |

Example endpoint: `https://example.com/ratings/{imdbId}`.
For IMDb ID `tt1375666`, Pictorium sends:

```http
GET /ratings/tt1375666 HTTP/1.1
Host: example.com
Accept: application/json
X-API-Key: <configured secret, if any>
```

Required response contract:

```json
{
  "ratings": [
    { "id": "source1", "name": "Source 1", "value": 8.8, "format": "decimal" },
    { "id": "source2", "name": "Source 2", "value": 87, "format": "percent" }
  ]
}
```

`fetchCustomRatings(imdbId, config, signal?)` returns `RatingItem[]`. The data
model has no fixed item count, subject to the response size limit below; the
renderer displays at most `MAX_CUSTOM_RATINGS` (5). Every item is validated
independently: `id` and `name` must be non-empty strings after trimming, `value`
must be a finite number, and `format` must be `decimal` or `percent`. Invalid items
are ignored; an empty or entirely invalid array returns `[]`. Extra fields are
ignored. Percent renders `87` as `87%`; decimal renders `8.8` as `8.8`, without
scale conversion. Names and formats come from the API.

IDs are case-sensitive and trimmed. For duplicate IDs, the last valid API item
wins while retaining the first occurrence's position. Provider items override
internal items with the same ID. The internal IMDb slot stays first when present;
remaining provider items follow API order. Invalid duplicates never erase a valid item.

Errors, invalid JSON, non-2xx responses and timeouts return `[]` and must never
prevent poster rendering. The
request has a 1.5-second timeout combined with the main render AbortSignal,
and a 16 KiB response limit. Only public HTTP(S) destinations are supported:
private/loopback/link-local addresses are blocked at connection time, URL
credentials and redirects are rejected. Configure secrets through the header,
never in the endpoint URL. Provider errors are not logged.
API-key authentication requires HTTPS. An HTTP endpoint with a configured API
key is rejected without making a request and returns `[]`; HTTP without an API
key remains supported.

Poster cache hits return before custom fetching. On a miss, fetching runs with
luminance and optional metadata work after IMDb ID resolution. A SHA-256 digest
of enabled configuration participates in poster cache identity, including key
changes without storing plaintext secrets in cache keys. There is no additional
rating cache; freshness follows the existing poster TTL. Restart after env changes.
Enabled custom ratings use the existing normal poster HTTP cache policy, including
for saved mappings with versioned URLs; they never use one-year immutable caching.

`GenerationInput.ratings?: RatingItem[]` supports any number of ratings; the
renderer displays at most `MAX_CUSTOM_RATINGS` (5) pills in a horizontal row
above the bottom badge, scaled to the available width. Omission preserves the
old renderer. Each item has `id`, `name`, `value`, `format`, and optional `logo`.
Logo is reserved for later trusted assets; this phase renders the name as text.
Pill colors follow the ranking-badge convention (dark pill on light posters,
light pill on dark ones via `topLight`); text uses per-label font selection and
`textLength` stabilization like every other badge. Display is controlled
per title via query `cr` > mapping `customRatings` > config token > server
defaults (`PICTORIUM_CUSTOM_RATINGS`) > ON, ANDed with the env `enabled` above:
the row renders only when the provider is configured and display is on.
The editor preview always sends an explicit `cr=0/1` so the WYSIWYG toggle
never desyncs from a saved mapping default.
Endpoint, API key and header stay env-only — they never travel in URLs, tokens
or mappings. Asset uploads are left for a separate change; no public endpoint
or token schema changes here beyond the `customRatings` display boolean.

## Provider test endpoint

`POST /api/custom-rating/test` (admin-gated, same gate as `PUT /api/defaults`)
probes the configured provider with the fixed sample `tt1375666` and returns
`{ ok, status, ms, ratings }` or `{ ok: false, error, status, ms }` with one of
`disabled | no-endpoint | unsafe-endpoint | unreachable | http-error | oversized | invalid-response`.
It tests only the saved/env endpoint (never a client-supplied URL) and never
exposes the API key. The Settings panel exposes it as a "Test provider" button
next to the endpoint fields.
