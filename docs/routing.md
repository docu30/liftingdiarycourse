# Routing Standards

This document outlines the routing architecture and standards for this Next.js application.

## Route Structure

All application routes must be accessed through the `/dashboard` path:

- **Public routes**: Only the root `/` landing page is public
- **Protected routes**: All routes under `/dashboard/*` require authentication
- **Route organization**: All authenticated features live under `/dashboard`

### Examples

```
✅ Correct:
/                           # Public landing page
/dashboard                  # Protected dashboard home
/dashboard/workout          # Protected workout features
/dashboard/workout/123      # Protected individual workout
/dashboard/profile          # Protected user profile

❌ Incorrect:
/workout                    # Should be /dashboard/workout
/profile                    # Should be /dashboard/profile
/app/dashboard              # Don't nest under /app
```

## Route Protection

### Middleware-Based Protection

Route protection is implemented using Next.js middleware with Clerk authentication:

**File**: `src/proxy.ts` (Next.js 16 requires this filename)

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Define public routes (accessible without authentication)
const isPublicRoute = createRouteMatcher([
  "/",                    // Landing page
  "/sign-in(.*)",        // Clerk sign-in pages
  "/sign-up(.*)",        // Clerk sign-up pages
]);

export default clerkMiddleware(async (auth, request) => {
  // Protect all routes except public ones
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Match all routes except static files and Next.js internals
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### Key Principles

1. **Default Protected**: All routes are protected by default
2. **Explicit Public Routes**: Only explicitly listed routes are public
3. **Automatic Redirects**: Unauthenticated users are automatically redirected to sign-in
4. **No Manual Checks**: Don't add auth checks in individual pages/components (middleware handles it)

### Public Route Configuration

To make a route public, add it to the `isPublicRoute` matcher:

```typescript
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/about",              // Add new public routes here
  "/pricing",
]);
```

## Route Organization Patterns

### Feature-Based Organization

Organize routes by feature under `/dashboard`:

```
src/app/dashboard/
  page.tsx                    # Dashboard home
  layout.tsx                  # Shared dashboard layout
  workout/
    page.tsx                  # Workout list/home
    [workoutId]/
      page.tsx                # Individual workout detail
      edit/
        page.tsx              # Edit workout
    new/
      page.tsx                # Create new workout
  profile/
    page.tsx                  # User profile
    settings/
      page.tsx                # Profile settings
  history/
    page.tsx                  # Workout history
```

### Dynamic Routes

Use Next.js dynamic segments for resource-specific pages:

```typescript
// src/app/dashboard/workout/[workoutId]/page.tsx
export default async function WorkoutPage({
  params,
}: {
  params: Promise<{ workoutId: string }>;
}) {
  const { workoutId } = await params;
  // Fetch and display workout data
}
```

**Important**: In Next.js 15+, `params` is a Promise and must be awaited.

### Route Groups (Optional Layouts)

Use route groups for shared layouts without affecting URLs:

```
src/app/dashboard/
  (main)/              # Group with main layout
    page.tsx
    workout/
      page.tsx
  (settings)/          # Group with settings layout
    layout.tsx
    profile/
      page.tsx
    preferences/
      page.tsx
```

The parentheses `()` don't appear in URLs.

## Server-Side Auth Checks

While middleware protects routes, you may need user info in server components:

```typescript
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    // This shouldn't happen due to middleware, but handle it
    redirect("/sign-in");
  }

  // Use userId to fetch user-specific data
}
```

**Always use `await auth()`** and import from `@clerk/nextjs/server`.

## Navigation Best Practices

### Using Next.js Link

Always use `next/link` for internal navigation:

```typescript
import Link from "next/link";

export function Navigation() {
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <Link href="/dashboard/workout">Workouts</Link>
      <Link href="/dashboard/profile">Profile</Link>
    </nav>
  );
}
```

### Programmatic Navigation

Use `useRouter` from `next/navigation` (App Router):

```typescript
"use client";

import { useRouter } from "next/navigation";

export function CreateWorkoutButton() {
  const router = useRouter();

  const handleCreate = () => {
    // Create workout, then navigate
    router.push("/dashboard/workout/123");
  };

  return <button onClick={handleCreate}>Create Workout</button>;
}
```

### Redirects in Server Components

Use `redirect` from `next/navigation`:

```typescript
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export default async function ProtectedPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Page content
}
```

## Common Patterns

### Protected Page Template

```typescript
// src/app/dashboard/feature/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function FeaturePage() {
  // Get authenticated user
  const { userId } = await auth();

  // Middleware should catch this, but be defensive
  if (!userId) {
    redirect("/sign-in");
  }

  // Fetch user-specific data
  const data = await fetchUserData(userId);

  return (
    <div>
      {/* Page content */}
    </div>
  );
}
```

### Dashboard Layout with Navigation

```typescript
// src/app/dashboard/layout.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return (
    <div className="dashboard-layout">
      <DashboardNav />
      <main>{children}</main>
    </div>
  );
}
```

## Important Notes

- **Next.js 16**: Use `proxy.ts` for middleware (not `middleware.ts`)
- **App Router Only**: This project uses App Router, not Pages Router
- **Server Components**: Most pages should be server components for auth checks
- **Client Components**: Only use `"use client"` when you need interactivity
- **Route Params**: Always await `params` in Next.js 15+ (they're Promises)
- **Clerk Integration**: Let middleware handle protection; don't duplicate auth logic

## Anti-Patterns to Avoid

❌ **Don't** check auth in every component:
```typescript
// Bad: Redundant checks everywhere
export function MyComponent() {
  const { userId } = useAuth(); // Unnecessary
  if (!userId) return null;
  // ...
}
```

✅ **Do** rely on middleware protection:
```typescript
// Good: Middleware protects the route
export function MyComponent() {
  // Just render, user is already authenticated
  return <div>...</div>;
}
```

❌ **Don't** create routes outside `/dashboard`:
```typescript
// Bad: Route not under dashboard
src/app/workout/page.tsx
```

✅ **Do** nest all app routes under `/dashboard`:
```typescript
// Good: Route under dashboard
src/app/dashboard/workout/page.tsx
```

❌ **Don't** use Pages Router patterns:
```typescript
// Bad: This is Pages Router syntax
export async function getServerSideProps() {
  // ...
}
```

✅ **Do** use App Router patterns:
```typescript
// Good: This is App Router syntax
export default async function Page() {
  const data = await fetchData();
  // ...
}
```

## Related Documentation

- [Clerk Authentication](./clerk.md) - Detailed Clerk setup and usage
- [Next.js Patterns](./nextjs.md) - Next.js App Router best practices
- [Data Fetching](./data-fetching.md) - Fetching user-specific data in protected routes
