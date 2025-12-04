# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL: Always Check Documentation First

**BEFORE generating any code, you MUST:**

1. **Check the `/docs` directory** for relevant documentation files
2. **Read and follow** the patterns, examples, and guidelines in those docs
3. **Reference the official documentation** for the technology you're implementing

The `/docs` directory contains authoritative reference documentation for all major technologies and patterns used in this project. Always consult these files to ensure you're using the correct APIs, patterns, and best practices.

**Example workflow:**
- Fetching data? → Read `/docs/data-fetching.md` first
- Mutating data? → Read `/docs/data-mutations.md` first
- Building UI components? → Read `/docs/ui.md` first
- Implementing auth? → Read `/docs/clerk.md` first
- Working with Next.js? → Read `/docs/nextjs.md` first
- Setting up routes or navigation? → Read `/docs/routing.md` first
- Setting up database? → Read `/docs/neon.md` first
- Adding styling? → Read `/docs/tailwind.md` first

**Never guess at API usage or patterns when documentation is available.**

## Project Overview

This is a Next.js 16 application for a lifting diary course, bootstrapped with `create-next-app`. It uses the App Router architecture (not Pages Router) with React 19 and TypeScript.

## Tech Stack

- **Framework**: Next.js 16.0.5 (App Router)
- **React**: 19.2.0 with React Compiler enabled
- **TypeScript**: 5.x with strict mode
- **Authentication**: Clerk (@clerk/nextjs)
- **Styling**: Tailwind CSS v4 (via PostCSS)
- **Fonts**: Geist Sans and Geist Mono (via next/font)
- **Linting**: ESLint with Next.js config

## Development Commands

```bash
# Start development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Project Structure

```
src/
  app/                    # App Router directory
    layout.tsx           # Root layout with fonts and metadata
    page.tsx             # Home page
    dashboard/           # Dashboard page
    globals.css          # Global Tailwind styles
  proxy.ts               # Clerk middleware (Next.js 16)
public/                  # Static assets
```

## Key Configuration

### TypeScript
- Path alias: `@/*` maps to `./src/*`
- Target: ES2017
- JSX: react-jsx (not preserve)
- Strict mode enabled

### Next.js
- React Compiler enabled (`reactCompiler: true` in next.config.ts)
- App Router architecture (all routes in `src/app/`)
- Automatic font optimization with next/font

### Styling
- Tailwind CSS v4 via PostCSS (no separate tailwind.config file needed)
- Global styles in `src/app/globals.css`
- Dark mode support via CSS classes

## Authentication (Clerk)

This project uses Clerk for authentication with the App Router pattern:

- **Middleware**:
  - `src/proxy.ts` - Clerk middleware implementation using `clerkMiddleware()` from `@clerk/nextjs/server`
  - Note: Next.js 16 requires `proxy.ts` (not `middleware.ts`). Clerk may show detection warnings but functionality works correctly
- **Provider**: `<ClerkProvider>` wraps the app in `src/app/layout.tsx`
- **Components**: Uses `<SignInButton>`, `<SignUpButton>`, `<UserButton>`, `<SignedIn>`, `<SignedOut>`
- **Environment Variables**: Stored in `.env.local` (excluded from git)
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`

### Getting Clerk Keys

1. Visit [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)
2. Copy your Publishable Key and Secret Key
3. Add them to `.env.local`

### Server-Side Auth

For server components or API routes, use `auth()` from `@clerk/nextjs/server`:

```typescript
import { auth } from "@clerk/nextjs/server";

export default async function ServerComponent() {
  const { userId } = await auth();
  // Use userId...
}
```

**Important**: Always use `await auth()` (not `auth()` without await) and import from `@clerk/nextjs/server`.

## Important Notes

- This project uses Next.js App Router, NOT Pages Router. All routes go in `src/app/`
- React Compiler is enabled - be mindful of component optimization rules
- Uses Tailwind v4 which has a different setup than v3 (PostCSS-based)
- Font loading uses next/font with Geist fonts configured in layout.tsx
- Clerk authentication uses `clerkMiddleware()` NOT deprecated `authMiddleware()`
- **Only `proxy.ts` is used**: Next.js 16 requires `proxy.ts` and will error if both `proxy.ts` and `middleware.ts` exist. Clerk may show detection warnings in the console, but the middleware functions correctly.
