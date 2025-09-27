## My Book Shelf

My Book Shelf is a Next.js App Router project that combines Tailwind CSS, shadcn/ui, and Supabase for data, auth, and storage. The dashboard lets you browse books in a card or table view with filters, search, and pagination.

## Requirements

- Node.js 18+
- npm (ships with Node.js) or your package manager of choice
- A Supabase project with the following resources enabled:
  - Tables: `shelves`, `shelf_tiers`, `borrowers`, `books`, `loans`
  - Storage bucket for cover images (default name: `covers`)
  - Row Level Security turned on for all tables

## Environment variables

Create a `.env.local` file and add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# Optional but recommended for server-side rendering, storage signing, and server actions
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: override the storage bucket used for book covers
NEXT_PUBLIC_SUPABASE_COVERS_BUCKET=covers
```

> ⚠️ Never expose the `SUPABASE_SERVICE_ROLE_KEY` in the browser. It is only read on the server.

## Local development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the dashboard. The `/books` route fetches data from Supabase using the filters supplied in the query string.

## Running lint checks

```bash
npm run lint
```

## Deploying to Vercel

1. Push your changes to GitHub.
2. Create a new Vercel project and import the repository.
3. Configure the same environment variables in the Vercel dashboard (Project Settings → Environment Variables).
4. Trigger a deployment. Vercel will build the Next.js app and expose the dashboard once the build succeeds.

For more information see the [Vercel documentation](https://vercel.com/docs) and the [Next.js deployment guide](https://nextjs.org/docs/app/building-your-application/deploying).
