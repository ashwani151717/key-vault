# MS Vault Manager

MS Vault Manager stores microservice Key Vault configuration as immutable versions. The React app has two pages, View Vault and Update Vault. The Express API keeps every published snapshot in MongoDB.

This repository does not include real credentials. `Keyvault_non-prod.xlsx` is ignored by git. Development and tests use fictional values such as `example-password-not-real`.

Authentication is intentionally not wired up. Do not point this app at real secrets until authentication, authorization, and a production secret store are in place.

## Stack

- Frontend: React, Vite, JavaScript, Tailwind CSS, shadcn-style components, React Router, Axios
- Backend: Node.js, Express, JavaScript, MongoDB, Mongoose, Zod, Multer, SheetJS

## Install

```bash
npm install
cp server/.env.example server/.env
docker compose up -d
```

MongoDB must be reachable at `MONGODB_URI`. The Compose file starts Mongo 7 on port 27017 with no authentication, which is only appropriate on your own machine. Each vault is one document in the `vaults` collection. Version writes use an atomic version check, so a stale preview cannot overwrite a newer save.

## Environment

| Variable | Purpose |
| --- | --- |
| `PORT` | API port. Default `4000`. |
| `MONGODB_URI` | Mongo connection string. |
| `CLIENT_ORIGIN` | Browser origin allowed by CORS. |
| `MAX_UPLOAD_BYTES` | Excel upload limit. Default 5 MB. |
| `AUTH_REQUIRED` | When `true`, requests need `x-user-id`. Import needs role `admin`. |
| `PREVIEW_SECRET` | HMAC key that binds a preview to the uploaded file and version. |
| `ADMIN_TOKEN` | When set, `POST /api/admin/import-workbook` also requires header `x-admin-token`. |

The API logs a warning when authentication is disabled. Errors returned to the browser do not include stack traces or cell contents.

## Develop

```bash
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:4000

Load fictional data:

```bash
npm run seed
```

That creates S6Web and SkyPlus, four sample microservices, and a few vault versions. Passwords and tokens in that data are placeholders.

## Initial workbook import

Import is an explicit admin action. It reads the workbook you pass on the command line and writes vaults into MongoDB. It does not copy the workbook into the repo.

```bash
npm run import:workbook -- /absolute/path/Keyvault_non-prod.xlsx
```

From this folder, if the workbook is still in the project root:

```bash
npm run import:workbook -- ../Keyvault_non-prod.xlsx
```

Sheet mapping:

| Sheet | Project | Environments |
| --- | --- | --- |
| `s6web` | S6Web | DEV1, DEV2, QA1, QA2, STAGE |
| `skyplus` | SkyPlus | DEV, QA, UAT, PREPROD, PREPROD CANARY |

Each data row is one microservice. `MS Name` becomes the microservice. `KeyVault Name` is ignored. An environment cell must be a JSON object. The importer keeps nested objects, arrays, strings, numbers, booleans, and null. In MongoDB, open `vaults`: each document has `project`, `microservice`, `environment`, and `value`. Older copies are in `history` on that same document.

It skips blank cells and `No KV`. Invalid JSON, non-object values, and duplicate keys are reported and are not saved as empty vaults. A repeated microservice row, or a vault that already exists, is reported as a duplicate and the stored vault is left unchanged.

The command prints counts plus sheet, row, microservice, environment, and error text. It does not print secret values.

The same import is available at `POST /api/admin/import-workbook` with a multipart field named `file`.

## Excel update template

View Vault and Update Vault are the only pages. View Vault shows the current JSON and every previous version, each with its own copy button. It does not ask for a date or show the KeyVault name.

On Update Vault, use **Download Excel template**. The file has one sheet and two columns, `Key` and `Value`.

- Text stays text, including values such as `007`.
- Excel numbers and booleans keep those types.
- The exact text `true`, `false`, or `null` becomes a boolean or null.
- A value that starts with `{` or `[` must be valid JSON. An object or array is stored as JSON. Broken JSON rejects the file.
- Duplicate keys reject the file. The API does not pick one of the values.
- Blank rows are ignored. A blank key is an error.

Example:

| Key | Value |
| --- | --- |
| LOG_LEVEL | info |
| RETRY_LIMIT | 3 |
| FEATURE_FLAGS | {"sms":false} |

Preview shows Key, Current Value, Uploaded Value, and Action (`added`, `updated`, or `unchanged`). Keys missing from the file are kept and are not deleted. If every uploaded value already matches, confirming does not create a version.

Confirm sends the same file plus the preview token and base version. If another update landed after the preview, the API returns a conflict and you need a new preview.

## Tests

```bash
npm test
```

The suite uses an in-memory MongoDB replica set and fictional spreadsheets. It covers workbook mapping, JSON types, invalid JSON, duplicate keys, project/environment checks, partial updates, preserved keys, no-op updates, history, date lookup, concurrent updates, and a failed database write.

## API

- `GET /api/projects`
- `GET /api/projects/:projectId/environments`
- `GET /api/microservices`
- `GET /api/vaults/resolve`
- `GET /api/vaults/:vaultId`
- `GET /api/vaults/:vaultId/versions`
- `GET /api/vaults/:vaultId/versions/by-date?date=YYYY-MM-DD`
- `POST /api/vaults/preview-update`
- `POST /api/vaults/update`
- `GET /api/templates/vault.xlsx`
- `POST /api/admin/import-workbook`

A date uses the end of that UTC day. The response is the newest version published at or before that instant.

Vault responses include the stored values. Audit events record the action and counts only, not the values.

## Project layout

- `client/` React application
- `server/src/models/` Mongoose models
- `server/src/routes/` HTTP routes
- `server/src/controllers/` request handlers
- `server/src/services/` vault, version, and Excel logic
- `server/src/middleware/` auth hooks, uploads, validation, errors
- `server/src/scripts/` seed data and workbook import
