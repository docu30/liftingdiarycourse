# Authentication

## CRITICAL RULES

This document outlines **mandatory** authentication patterns for this application. These rules are non-negotiable and must be followed in all cases.

**This application uses [Clerk](https://clerk.com) for authentication. No other authentication provider or custom auth implementation is permitted.**

---

## Rule #1: Clerk Only

**ALL authentication MUST use Clerk (`@clerk/nextjs`).**

### ✅ CORRECT
```tsx
import { auth } from "@clerk/nextjs/server";
import { SignInButton, SignOutButton, UserButton } from "@clerk/nextjs";

// Server Component
export default async function Page() {
  const { userId } = await auth();
  // ...
}

// Client Component
export function Header() {
  return <UserButton />;
}
```

### ❌ NEVER DO THIS
```tsx
// DON'T: Custom authentication
import NextAuth from "next-auth";
// ❌ WRONG - Only Clerk is allowed

// DON'T: Manual JWT handling
import jwt from "jsonwebtoken";
// ❌ WRONG - Clerk handles all tokens

// DON'T: Custom session management
import { cookies } from "next/headers";
const session = cookies().get("session");
// ❌ WRONG - Use Clerk's auth()
```

---

## Rule #2: Server-Side Auth Pattern

**ALL server-side authentication checks MUST use `auth()` from `@clerk/nextjs/server`.**

### ✅ CORRECT: Server Component Auth

```tsx
// app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  // Redirect unauthenticated users
  if (!userId) {
    redirect("/sign-in");
  }

  // User is authenticated, fetch their data
  const data = await getUserData(userId);

  return <Dashboard data={data} />;
}
```

### ✅ CORRECT: Server Action Auth

```tsx
// app/workouts/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { createWorkout } from "@/data/workouts";

export async function createWorkoutAction(formData: FormData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const workout = await createWorkout(userId, {
    name: formData.get("name") as string,
  });

  return workout;
}
```

### ❌ NEVER DO THIS

```tsx
// DON'T: Forget to await auth()
const { userId } = auth();  // ❌ Missing await
if (!userId) redirect("/sign-in");

// DON'T: Use auth() in Client Components
"use client";
import { auth } from "@clerk/nextjs/server";
const { userId } = await auth();  // ❌ Server-only function

// DON'T: Import from wrong package
import { auth } from "@clerk/nextjs";  // ❌ Missing /server
const { userId } = await auth();
```

---

## Rule #3: Client-Side Auth Pattern

**Client Components MUST use Clerk's provided components and hooks, NEVER server functions.**

### ✅ CORRECT: Client Component Auth

```tsx
// components/header.tsx
"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";

export function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton mode="modal">
          <button>Sign In</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button>Sign Up</button>
        </SignUpButton>
      </SignedOut>

      <SignedIn>
        <UserButton />
      </SignedIn>
    </header>
  );
}
```

### ✅ CORRECT: Using useUser Hook

```tsx
"use client";

import { useUser } from "@clerk/nextjs";

export function WelcomeMessage() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  return <div>Welcome, {user.firstName}!</div>;
}
```

### ❌ NEVER DO THIS

```tsx
// DON'T: Use auth() in Client Components
"use client";
import { auth } from "@clerk/nextjs/server";

export function MyComponent() {
  const { userId } = await auth();  // ❌ Can't use server functions in client
}

// DON'T: Create custom auth state
"use client";
export function MyComponent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  // ❌ WRONG - Use Clerk's hooks and components
}

// DON'T: Manually check cookies or tokens
"use client";
export function MyComponent() {
  const token = document.cookie.split("__session=")[1];
  // ❌ WRONG - Never manually handle Clerk tokens
}
```

---

## Rule #4: Middleware Configuration

**Authentication middleware MUST be configured in `src/proxy.ts` (NOT `middleware.ts`).**

### ✅ CORRECT: Middleware Setup

```tsx
// src/proxy.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/workouts(.*)",
  "/profile(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
```

### ❌ NEVER DO THIS

```tsx
// DON'T: Use deprecated authMiddleware
import { authMiddleware } from "@clerk/nextjs/server";
export default authMiddleware();  // ❌ Deprecated

// DON'T: Use middleware.ts filename
// src/middleware.ts  // ❌ Next.js 16 requires proxy.ts

// DON'T: Create custom authentication logic in middleware
export default async function middleware(req: NextRequest) {
  const token = req.cookies.get("session");
  // ❌ WRONG - Use clerkMiddleware()
}
```

**Important Notes:**
- Next.js 16 requires `proxy.ts` (not `middleware.ts`)
- Only `proxy.ts` should exist - having both files will cause errors
- Clerk may show detection warnings in the console, but functionality works correctly
- Always use `clerkMiddleware()`, never the deprecated `authMiddleware()`

---

## Rule #5: Environment Variables

**Clerk API keys MUST be stored in `.env.local` and NEVER committed to git.**

### ✅ CORRECT: Environment Setup

```bash
# .env.local (NEVER commit this file)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

```tsx
// Using environment variables (automatic with Clerk)
// No manual configuration needed - Clerk reads from env automatically
```

### ❌ NEVER DO THIS

```tsx
// DON'T: Hardcode API keys
const publishableKey = "pk_test_abc123...";  // ❌ SECURITY RISK

// DON'T: Commit .env.local
git add .env.local  // ❌ Contains secrets

// DON'T: Use different env variable names
NEXT_PUBLIC_AUTH_KEY=pk_test_...  // ❌ Must use Clerk's names
```

### Getting Your Clerk Keys

1. Visit [Clerk Dashboard](https://dashboard.clerk.com/last-active?path=api-keys)
2. Copy your **Publishable Key** and **Secret Key**
3. Add them to `.env.local` (create if doesn't exist)
4. Restart your development server

---

## Rule #6: Layout Provider

**The root layout MUST wrap the entire app with `<ClerkProvider>`.**

### ✅ CORRECT: Root Layout

```tsx
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### ❌ NEVER DO THIS

```tsx
// DON'T: Wrap only part of the app
export default function Layout({ children }) {
  return (
    <html>
      <body>
        <Header />
        <ClerkProvider>  {/* ❌ Must wrap <html> */}
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}

// DON'T: Forget ClerkProvider
export default function Layout({ children }) {
  return (
    <html>
      <body>{children}</body>  {/* ❌ Missing ClerkProvider */}
    </html>
  );
}

// DON'T: Use multiple ClerkProviders
export function MyComponent() {
  return (
    <ClerkProvider>  {/* ❌ Already in root layout */}
      {children}
    </ClerkProvider>
  );
}
```

---

## Complete Authentication Flow

```
1. User visits protected route (/dashboard)
                   ↓
2. Middleware (proxy.ts) → clerkMiddleware() checks auth
                   ↓
    ┌─────────────┴─────────────┐
    │                           │
Not Authenticated         Authenticated
    │                           │
    ↓                           ↓
Redirect to sign-in       Continue to page
                                ↓
3. Server Component → await auth() gets userId
                                ↓
4. Fetch user data → getUserData(userId)
                                ↓
5. Render page with data
```

---

## Common Patterns

### Pattern 1: Protected Page

```tsx
// app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // User is authenticated
  return <Dashboard />;
}
```

### Pattern 2: Optional Auth (Public + Private Content)

```tsx
// app/page.tsx
import { auth } from "@clerk/nextjs/server";
import { PublicContent } from "@/components/public-content";
import { PrivateContent } from "@/components/private-content";

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <div>
      <PublicContent />
      {userId && <PrivateContent userId={userId} />}
    </div>
  );
}
```

### Pattern 3: Sign In/Out Buttons

```tsx
// components/auth-buttons.tsx
"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
} from "@clerk/nextjs";

export function AuthButtons() {
  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button className="btn-primary">Sign In</button>
        </SignInButton>
      </SignedOut>

      <SignedIn>
        <SignOutButton>
          <button className="btn-secondary">Sign Out</button>
        </SignOutButton>
      </SignedIn>
    </>
  );
}
```

### Pattern 4: User Profile Button

```tsx
// components/user-profile.tsx
"use client";

import { UserButton } from "@clerk/nextjs";

export function UserProfile() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: "w-10 h-10"
        }
      }}
    />
  );
}
```

### Pattern 5: Getting User Information

```tsx
// Server Component
import { auth, currentUser } from "@clerk/nextjs/server";

export default async function ProfilePage() {
  const { userId } = await auth();
  const user = await currentUser();

  return (
    <div>
      <p>User ID: {userId}</p>
      <p>Email: {user?.emailAddresses[0]?.emailAddress}</p>
      <p>Name: {user?.firstName} {user?.lastName}</p>
    </div>
  );
}
```

```tsx
// Client Component
"use client";

import { useUser } from "@clerk/nextjs";

export function ProfileCard() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <div>Loading...</div>;
  if (!user) return null;

  return (
    <div>
      <p>Email: {user.emailAddresses[0]?.emailAddress}</p>
      <p>Name: {user.firstName} {user.lastName}</p>
    </div>
  );
}
```

---

## Security Checklist

Every authentication implementation must verify:

- ✅ Using `auth()` from `@clerk/nextjs/server` in Server Components
- ✅ Always `await`ing the `auth()` call
- ✅ Checking `userId` exists before accessing protected resources
- ✅ Using Clerk components (`<SignInButton>`, `<UserButton>`, etc.) in Client Components
- ✅ Never manually handling tokens or sessions
- ✅ `<ClerkProvider>` wraps the entire app in root layout
- ✅ Middleware configured in `proxy.ts` using `clerkMiddleware()`
- ✅ Environment variables in `.env.local` and not committed to git
- ✅ Passing `userId` to all data fetching functions (see `/docs/data-fetching.md`)

---

## Why These Rules?

### Clerk Only
- **Maintained**: Professional auth provider, regular updates
- **Secure**: Industry-standard security practices
- **Feature-rich**: MFA, social login, passwordless, etc.
- **Developer experience**: Excellent documentation and support

### Server vs Client Patterns
- **Type safety**: `auth()` gives proper TypeScript types
- **Performance**: Server-side checks are faster and more secure
- **Security**: Tokens and secrets never exposed to client
- **Simplicity**: Right tool for the right context

### Middleware
- **Global protection**: Protects entire route patterns
- **Performance**: Runs at edge, before page renders
- **Consistency**: Single source of truth for route protection

### Environment Variables
- **Security**: Secrets never in source code
- **Flexibility**: Different keys per environment
- **Safety**: `.env.local` in `.gitignore` prevents leaks

---

## Troubleshooting

### "auth is not a function" Error
```tsx
// ❌ WRONG
import { auth } from "@clerk/nextjs";

// ✅ CORRECT
import { auth } from "@clerk/nextjs/server";
```

### "Cannot use auth() in client component"
```tsx
// Move auth check to Server Component parent
// Pass data down as props to Client Component
```

### "Middleware not detecting authentication"
```tsx
// Ensure file is named proxy.ts (NOT middleware.ts)
// Ensure using clerkMiddleware() (NOT authMiddleware)
```

### Console warnings about middleware detection
```
// This is expected with Next.js 16 + Clerk
// The middleware functions correctly despite the warning
// Will be fixed in future Clerk updates
```

---

## Summary

1. **Clerk only** - Never use other auth providers or custom implementations
2. **Server auth** - Use `await auth()` from `@clerk/nextjs/server` in Server Components
3. **Client auth** - Use Clerk hooks (`useUser`) and components (`<UserButton>`) in Client Components
4. **Middleware** - Configure in `proxy.ts` using `clerkMiddleware()`
5. **Environment** - API keys in `.env.local`, never committed
6. **Provider** - Wrap app with `<ClerkProvider>` in root layout
7. **Security** - Always check `userId`, never manually handle tokens

**These rules are mandatory. No exceptions.**
