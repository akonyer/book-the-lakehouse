<p align="center">
  <img src="./public/calendar-hero.png" alt="Book the lakehouse month view" width="100%">
</p>

<div align="center">

### A tiny, beautiful, and free to host booking calendar for the family holiday home.

[MIT licensed](./LICENSE) · built with Next.js, React, Drizzle, MySQL, and optional Vercel Blob

</div>

<br>

A small app for sharing the family holiday home without turning the family chat into a booking tribunal: a private calendar with a shared PIN, optional stay costs, bank transfer details, photos from the trip, and just enough ceremony to keep everyone honest.

Fork maintenance and upstream-sync guidance is documented in
[UPSTREAM.md](UPSTREAM.md).

## Portable container deployment

The application still runs without a database in demonstration mode. For
persistent deployments, configure a standard MySQL 8 `DATABASE_URL`; startup
applies the committed Drizzle migrations before serving traffic.

```bash
docker build -t book-the-lakehouse .
docker run --rm -p 3000:3000 \
  -e DATABASE_URL='mysql://user:password@database:3306/calendar' \
  -e FAMILY_PIN='<shared-pin>' \
  book-the-lakehouse
```

`PEOPLE_FILE` may point to a mounted JSON file shaped like
`people.example.json`. Do not bake names, access codes, payment details or
other private deployment data into the image.

Set `TRUST_AUTHENTICATING_PROXY=true` only when the application has no direct
network path and every request passes through an authenticating reverse proxy.
That mode removes the application's shared PIN prompt in favor of upstream SSO.

The GitHub workflow validates migrations against MySQL 8.4 LTS and publishes
amd64/arm64 images to GHCR after changes reach `master`. Images use immutable
`sha-<full-commit>` tags; deployment repositories should additionally pin the
reported manifest digest.

## What It Does

For families with a lakehouse, bach, cabin, cottage, or other beloved place that
people take turns using.

- Pick your identity, then claim dates on a spacious month calendar.
- Edit and delete your own stays — no global admin powers required.
- Optional nightly costs, bank details, and a transfer prompt at booking time.
- **Mary mode** — a quiet admin area where trusted users can tick off paid stays.
- Profile and stay photos when Vercel Blob is configured.
- Runs locally with demo data before you connect MySQL.
- Rename the place, people, footer, PIN, colors, and cookie prefix to suit your own family.
- Agent-friendly: hand the codebase to an AI assistant, or run `/setup` (or `npm run setup`) to wire up database, storage, and family settings in one go.

Mary mode is named for my aunt Mary, who embodies the idea of an admin far
better than the word "admin" ever could.

<p align="center">
  <video src="https://github.com/user-attachments/assets/d66c1d04-bea1-4f1b-849d-8a083c297ccd" controls width="100%" muted playsinline></video>
</p>


## Simple Setup

If you have an AI coding assistant, type `/setup` in the chat. Otherwise run
the interactive wizard:

```bash
npm run setup
```

It creates `.env.local`, prompts for reusable site settings, and can apply the
committed migrations and optional demonstration seed when a MySQL URL is
configured. Add secrets and private deployment data directly to the ignored
file rather than entering them into source control.

Once it finishes, you're good to go.

---

### Manual Setup (Alternative)

If you prefer to configure the application manually:

1. Fork and clone this repo.
2. Copy `.env.example` to `.env.local` and set your application values.
3. Provision a MySQL 8 database and set `DATABASE_URL` if you need persistence.
4. Run `npm run db:migrate`, then optionally `npm run db:seed` for demonstration data.
5. Add the [Vercel Blob integration](https://vercel.com/docs/storage/vercel-blob) only if you want profile and stay photos.
6. Run the standalone container on any OCI-compatible host, or deploy through your preferred Node.js platform.

The runtime has no dependency on a specific cloud or orchestration platform.

## Local Development

For tinkering before deployment:

```bash
git clone https://github.com/shrimbly/book-the-lakehouse.git
cd book-the-lakehouse
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

With only `.env.example` copied, the app can render with demo data. Add
`DATABASE_URL` when you are ready for real bookings to stick around.

## Environment Variables

Create the ignored `.env.local` in the project root:

```bash
cp .env.example .env.local
```

Then add the app-specific bits, like `FAMILY_PIN`, display text, Marys, and any
optional stay-cost details.

```bash
FAMILY_PIN=<shared-pin>
TRUST_AUTHENTICATING_PROXY=false
DATABASE_URL=mysql://<user>:<password>@<host>:3306/<database>
PEOPLE_FILE=/run/config/people.json
BLOB_READ_WRITE_TOKEN=<optional-blob-token>

BOOKING_COST_PER_NIGHT=
BOOKING_COST_CURRENCY=
PAYMENT_ACCOUNT_NAME=
PAYMENT_ACCOUNT_NUMBER=
PAYMENT_REFERENCE=
PAYMENT_NOTE=
MARY_IDS=<comma-separated-person-ids>

NEXT_PUBLIC_HOME_NAME="Book the lakehouse"
NEXT_PUBLIC_SITE_DESCRIPTION="A private family booking calendar for the lakehouse."
NEXT_PUBLIC_FOOTER_TEXT="Book the lakehouse"
NEXT_PUBLIC_REPO_URL="https://github.com/shrimbly/book-the-lakehouse"
COOKIE_PREFIX=book-the-lakehouse
```

The database login needs privileges only on its own database. Migrations create
the booking overlap triggers, so a MySQL server with binary logging enabled must
also set `log_bin_trust_function_creators=1`; do not grant the application a
global administrative role to work around that server setting.

Only `FAMILY_PIN` is needed for the PIN gate. `DATABASE_URL` enables the real
database-backed calendar. `BLOB_READ_WRITE_TOKEN` enables photos.
`BOOKING_COST_PER_NIGHT` turns on the cost and bank-transfer prompt.
`MARY_IDS` is a comma-separated list of person IDs for Marys, the admin users
who can open `/mary` and check off paid stays.

## Database Setup

This project uses Drizzle with MySQL 8. Schema history is committed under
`drizzle/`; production startup runs the same migrations before the server.

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

`src/lib/data.ts` contains the starter people and bookings used by both demo
mode and `npm run db:seed`. Swap them out for your own family, then seed again.

`db:push` remains available for disposable local prototyping. Use
`db:migrate` for every persistent environment so changes are versioned and
repeatable.

Useful database commands:

```bash
npm run db:studio
```

## How It Is Organized

| Path | Purpose |
| --- | --- |
| `src/app/` | Next.js app route, metadata, and Server Actions. |
| `src/app/mary/` | Mary mode checklist view for tracking stay payments. |
| `src/components/` | Calendar, identity, PIN, photo, and month UI. |
| `src/db/` | Drizzle schema, client, queries, and seed script. |
| `src/lib/site.ts` | Reusable site branding and cookie configuration. |
| `src/lib/data.ts` | Demo and seed data for people and sample bookings. |

## Scripts

```bash
npm run dev          # Start the local Next.js dev server
npm run build        # Build for production
npm run start        # Run the production build
npm run lint         # Run ESLint
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Apply committed migrations to DATABASE_URL
npm run db:push      # Prototype schema changes against a disposable database
npm run db:seed      # Seed people and bookings from src/lib/data.ts
```

## Tech Stack

| Tool | Why |
| --- | --- |
| Next.js 16 | App Router, Server Components, Server Actions, and metadata. |
| React 19 | Client interactions for picking, dragging, uploading, and editing. |
| Drizzle | Typed schema, migrations, and query helpers for MySQL. |
| MySQL 8 | Portable persistent storage supported by common deployment platforms. |
| Vercel Blob | Simple public image storage for profile and stay photos. |
| Tailwind CSS 4 | Quiet, responsive styling with a small custom palette. |

## Contributing

PRs are welcome, especially improvements that make the calendar easier for
another family to adopt. Keep it small, private-by-default, and friendly to
people who just want to book a weekend away without learning a new system.

## License

MIT. 
