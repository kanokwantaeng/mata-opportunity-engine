# MATA Opportunity Engine — Production V1 Foundation

This package is the first production-code foundation, not the earlier static prototype.

## What already works

- Netlify-ready static UI
- Server-only Supabase access through Netlify Functions
- Server-only OpenAI call through the Responses API
- Opportunity CRUD foundation
- Evidence + Assumption storage
- Deterministic Scoring Engine v1.0
- Score snapshot persistence
- Validation API foundation
- Multi-device central-storage architecture once Supabase is connected
- Optional app access key (no full login)
- Paid Ads are not required for scoring

## Security model

Browser never receives:
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY

All database and AI calls go through Netlify Functions.

`APP_ACCESS_KEY` is a lightweight V1 protection mechanism for a private one-person app. The user enters the same key in the Settings screen; it is stored only in that browser's localStorage.

## Setup order

### 1. Create a Supabase project
Do not paste the service-role key into chat or into frontend files.

### 2. Run SQL
Open Supabase SQL Editor and run:

`supabase/schema.sql`

### 3. Add Netlify environment variables
In Netlify Site configuration > Environment variables, add:

- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY
- OPENAI_API_KEY
- OPENAI_MODEL = gpt-5.6
- APP_ACCESS_KEY = a long private passphrase you choose

These values must be configured in Netlify UI/environment settings, not placed in `netlify.toml` for runtime Functions.

### 4. Deploy
This project has dependencies, so use one of:

- connect the project to GitHub and let Netlify run npm install; or
- deploy with Netlify CLI

Build settings are already in `netlify.toml`.

### 5. Open the app
Go to Settings and enter the exact same `APP_ACCESS_KEY`.

## Local test

```bash
npm install
npm test
npx netlify dev
```

For local Functions, copy `.env.example` to `.env` and add your own local secrets. Never commit `.env`.

## Current deliberate limitations

This is the production foundation pass. The following UI/data wiring is intentionally next:

- persistent Buyer Hypothesis form
- persistent Motivation form
- persistent 3 Product Hypotheses UI
- Offer editor
- Economics editor
- Validation Lab UI and automatic evidence creation from results
- editable scoring inputs instead of conservative foundation defaults
- Decision Log override UI
- export/backup endpoint

The database tables and service architecture for these are already present, so they do not require an architecture rewrite.
