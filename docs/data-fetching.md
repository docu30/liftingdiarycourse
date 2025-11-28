# Data Fetching

## CRITICAL RULES

This document outlines **mandatory** data fetching patterns for this application. These rules are non-negotiable and must be followed in all cases.

---

## Rule #1: Server Components Only

**ALL data fetching MUST be done via Server Components.**

### ✅ CORRECT
```tsx
// app/dashboard/page.tsx (Server Component)
import { getWorkouts } from "@/data/workouts";
import { auth } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workouts = await getWorkouts(userId);

  return <WorkoutList workouts={workouts} />;
}
```

### ❌ NEVER DO THIS
```tsx
// DON'T: Fetching in Client Components
"use client";
export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch('/api/workouts').then(r => r.json()).then(setData);
  }, []);
  // ❌ WRONG - Never fetch in client components
}

// DON'T: Creating API Route Handlers for data
// app/api/workouts/route.ts
export async function GET() {
  // ❌ WRONG - Don't use route handlers for data fetching
}
```

---

## Rule #2: Data Directory Helper Functions

**ALL database queries MUST go through helper functions in the `/data` directory.**

These functions:
- Encapsulate all database logic
- Use Drizzle ORM (never raw SQL)
- Enforce user data isolation
- Provide a consistent API

### ✅ CORRECT Pattern

```tsx
// data/workouts.ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function getWorkouts(userId: string) {
  return await db
    .select()
    .from(workouts)
    .where(eq(workouts.userId, userId));
}

export async function getWorkout(workoutId: string, userId: string) {
  const [workout] = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId)
      )
    )
    .limit(1);

  return workout;
}

export async function createWorkout(userId: string, data: NewWorkout) {
  const [workout] = await db
    .insert(workouts)
    .values({ ...data, userId })
    .returning();

  return workout;
}
```

### ❌ NEVER DO THIS

```tsx
// DON'T: Raw SQL queries
const workouts = await db.execute(sql`SELECT * FROM workouts WHERE user_id = ${userId}`);
// ❌ WRONG - Always use Drizzle ORM, never raw SQL

// DON'T: Direct database queries in components
export default async function Page() {
  const workouts = await db.select().from(workouts);
  // ❌ WRONG - Use helper functions from /data directory
}

// DON'T: Queries without user filtering
export async function getAllWorkouts() {
  return await db.select().from(workouts);
  // ❌ WRONG - Must ALWAYS filter by userId
}
```

---

## Rule #3: User Data Isolation (CRITICAL SECURITY)

**Users MUST ONLY be able to access their own data. NEVER.**

Every data function must:
1. Accept `userId` as a parameter
2. Filter queries by `userId`
3. Never return data from other users

### ✅ Security Checklist

- ✅ Every query includes `.where(eq(table.userId, userId))`
- ✅ Helper functions require `userId` parameter
- ✅ No public/shared data endpoints without explicit filtering
- ✅ Update/delete operations verify ownership via `userId`

### ✅ CORRECT: Secure Update

```tsx
// data/workouts.ts
export async function updateWorkout(
  workoutId: string,
  userId: string,
  data: Partial<Workout>
) {
  // Verify ownership AND update in one query
  const [updated] = await db
    .update(workouts)
    .set(data)
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId)  // ← CRITICAL: Ownership check
      )
    )
    .returning();

  return updated;
}
```

### ❌ WRONG: Security Vulnerability

```tsx
// DON'T: No user filtering
export async function updateWorkout(workoutId: string, data: Partial<Workout>) {
  return await db
    .update(workouts)
    .set(data)
    .where(eq(workouts.id, workoutId));
  // ❌ SECURITY ISSUE: Any user can update any workout!
}
```

---

## Complete Data Flow

```
1. User visits page → Server Component renders
                         ↓
2. Server Component  → await auth() to get userId
                         ↓
3. Server Component  → Call data helper function with userId
                         ↓
4. Data Helper       → Query database using Drizzle ORM
   (/data/*.ts)      → Filter by userId
                         ↓
5. Server Component  → Pass data as props to Client Components
                         ↓
6. Client Component  → Render UI (no data fetching here!)
```

---

## Why These Rules?

### Server Components Only
- **Performance**: No client-side waterfalls, no loading spinners
- **Security**: Database credentials never exposed to client
- **SEO**: Fully rendered HTML for search engines
- **Simplicity**: No API layer needed

### Data Directory Pattern
- **Consistency**: Single source of truth for data access
- **Testability**: Easy to test and mock data functions
- **Maintainability**: All queries in one place
- **Type Safety**: Full TypeScript support with Drizzle

### User Data Isolation
- **Security**: Prevents unauthorized data access
- **Privacy**: Users can only see their own data
- **Compliance**: Meets data protection requirements
- **Trust**: Fundamental to application security

---

## Common Patterns

### Loading Current User's Data

```tsx
// app/workouts/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getWorkouts } from "@/data/workouts";

export default async function WorkoutsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workouts = await getWorkouts(userId);

  return <WorkoutList workouts={workouts} />;
}
```

### Loading Single Item (with ownership check)

```tsx
// app/workouts/[id]/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { getWorkout } from "@/data/workouts";

export default async function WorkoutPage({
  params
}: {
  params: { id: string }
}) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const workout = await getWorkout(params.id, userId);
  if (!workout) notFound();

  return <WorkoutDetail workout={workout} />;
}
```

### Mutations (Server Actions)

```tsx
// app/workouts/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";

export async function createWorkoutAction(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const workout = await createWorkout(userId, {
    name: formData.get("name") as string,
    // ... other fields
  });

  revalidatePath("/workouts");
  return workout;
}
```

---

## Summary

1. **Server Components ONLY** - Never fetch in client components or route handlers
2. **Data directory helpers** - All queries through `/data` functions using Drizzle ORM
3. **User isolation** - Always filter by `userId`, never expose other users' data
4. **No raw SQL** - Use Drizzle ORM for type safety and consistency

**These rules are mandatory. No exceptions.**
