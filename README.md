# VibeCheck

VibeCheck validates AI-built apps before shipping. Provide a public GitHub repo URL and describe the feature you meant to build. VibeCheck returns a risk report, relevant files, command evidence, suggested tests, and a paste-ready fix prompt for Cursor or Claude.

## MVP Scope

- Public GitHub URL input
- Intent text input
- Hosted demo report for the prepared auth scenario
- Typed report model
- Deterministic risk scanner utilities
- Fix prompt builder
- Web report UI

## Local Development

```bash
npm install
npm run dev
```

## Verification

```bash
npm test
npm run build
```

## Demo Flow

1. Open the app.
2. Keep the prefilled demo repo URL.
3. Keep the prefilled intent about protecting `/dashboard`.
4. Click `Run VibeCheck`.
5. Show the Vibe Score, risk files, critical finding, failed test evidence, and generated fix prompt.

## Product Positioning

AI coding made it easy to generate apps, but hard to know whether they are actually correct. VibeCheck turns that uncertainty into evidence and the next exact prompt.
