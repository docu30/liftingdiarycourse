# Data Mutations

## CRITICAL RULES

This document outlines **mandatory** data mutation patterns for this application. These rules are non-negotiable and must be followed in all cases.

---

## Rule #1: Server Actions ONLY

**ALL data mutations MUST be done via Server Actions in colocated `actions.ts` files.**

Server Actions are the ONLY way to mutate data in this application. No API routes, no client-side mutations, no exceptions.

### ✅ CORRECT

```tsx
// app/workouts/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";
import { z } from "zod";

const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().datetime(),
  notes: z.string().optional(),
});

type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Validate input
  const validated = createWorkoutSchema.parse(input);

  // Call data helper
  const workout = await createWorkout(userId, validated);

  revalidatePath("/workouts");
  return workout;
}
```

### ❌ NEVER DO THIS

```tsx
// DON'T: API Route Handler
// app/api/workouts/route.ts
export async function POST(req: Request) {
  // ❌ WRONG - Never use route handlers for mutations
}

// DON'T: Client-side mutations
"use client";
export function WorkoutForm() {
  const handleSubmit = async () => {
    await fetch('/api/workouts', { method: 'POST' });
    // ❌ WRONG - Never mutate from client components
  };
}

// DON'T: FormData type
"use server";
export async function createWorkoutAction(formData: FormData) {
  // ❌ WRONG - Never use FormData as parameter type
}

// DON'T: No validation
"use server";
export async function createWorkoutAction(input: any) {
  const workout = await createWorkout(userId, input);
  // ❌ WRONG - Must validate with Zod
}
```

---

## Rule #2: Data Directory Helper Functions

**ALL database mutations MUST go through helper functions in the `/src/data` directory.**

These functions:
- Encapsulate all Drizzle ORM database logic
- Enforce user data isolation
- Provide a consistent, typed API
- Are called ONLY by Server Actions

### ✅ CORRECT Pattern

```tsx
// src/data/workouts.ts
import { db } from "@/db";
import { workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";

type NewWorkout = {
  name: string;
  date: Date;
  notes?: string;
};

export async function createWorkout(userId: string, data: NewWorkout) {
  const [workout] = await db
    .insert(workouts)
    .values({
      ...data,
      userId,
      createdAt: new Date(),
    })
    .returning();

  return workout;
}

export async function updateWorkout(
  workoutId: string,
  userId: string,
  data: Partial<NewWorkout>
) {
  const [updated] = await db
    .update(workouts)
    .set({ ...data, updatedAt: new Date() })
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId) // ← CRITICAL: Ownership check
      )
    )
    .returning();

  return updated;
}

export async function deleteWorkout(workoutId: string, userId: string) {
  const [deleted] = await db
    .delete(workouts)
    .where(
      and(
        eq(workouts.id, workoutId),
        eq(workouts.userId, userId) // ← CRITICAL: Ownership check
      )
    )
    .returning();

  return deleted;
}
```

### ❌ NEVER DO THIS

```tsx
// DON'T: Raw SQL
const workout = await db.execute(
  sql`INSERT INTO workouts (name, user_id) VALUES (${name}, ${userId})`
);
// ❌ WRONG - Always use Drizzle ORM, never raw SQL

// DON'T: Direct database calls in Server Actions
"use server";
export async function createWorkoutAction(input: CreateWorkoutInput) {
  const [workout] = await db.insert(workouts).values(input).returning();
  // ❌ WRONG - Use data helper functions, not direct DB calls
}

// DON'T: Mutations without ownership verification
export async function deleteWorkout(workoutId: string) {
  return await db.delete(workouts).where(eq(workouts.id, workoutId));
  // ❌ SECURITY ISSUE - Must verify userId ownership!
}
```

---

## Rule #3: Zod Validation (MANDATORY)

**EVERY Server Action MUST validate its input using Zod schemas.**

No exceptions. All user input must be validated before any database operations.

### ✅ CORRECT: Full Validation Pattern

```tsx
// app/workouts/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { updateWorkout } from "@/data/workouts";
import { z } from "zod";

// Define schema
const updateWorkoutSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

// Infer type from schema
type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

export async function updateWorkoutAction(input: UpdateWorkoutInput) {
  // 1. Authenticate
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // 2. Validate (will throw if invalid)
  const validated = updateWorkoutSchema.parse(input);

  // 3. Extract ID and data
  const { id, ...data } = validated;

  // 4. Call data helper
  const workout = await updateWorkout(id, userId, data);

  // 5. Revalidate cache
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);

  return workout;
}
```

### ✅ CORRECT: Using safeParse for Error Handling

```tsx
"use server";

import { z } from "zod";

const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().datetime(),
});

type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  // Use safeParse for custom error handling
  const result = createWorkoutSchema.safeParse(input);

  if (!result.success) {
    return {
      error: result.error.flatten().fieldErrors,
    };
  }

  const workout = await createWorkout(userId, result.data);
  revalidatePath("/workouts");

  return { data: workout };
}
```

### ❌ NEVER DO THIS

```tsx
// DON'T: No validation
"use server";
export async function updateWorkoutAction(input: any) {
  const workout = await updateWorkout(input.id, userId, input);
  // ❌ WRONG - Must validate with Zod
}

// DON'T: Partial validation
"use server";
export async function createWorkoutAction(input: { name: string }) {
  if (!input.name) throw new Error("Name required");
  // ❌ WRONG - Use Zod schemas, not manual checks
}

// DON'T: Using FormData type
"use server";
export async function createWorkoutAction(formData: FormData) {
  const name = formData.get("name");
  // ❌ WRONG - Use typed objects validated by Zod
}
```

---

## Rule #4: Typed Parameters (No FormData)

**Server Action parameters MUST be typed objects, NEVER FormData.**

### ✅ CORRECT

```tsx
// Define input type
type CreateExerciseInput = {
  workoutId: string;
  name: string;
  sets: number;
  reps: number;
  weight?: number;
};

// Use typed parameter
export async function createExerciseAction(input: CreateExerciseInput) {
  const validated = createExerciseSchema.parse(input);
  // ...
}

// Client usage
const handleSubmit = async (data: CreateExerciseInput) => {
  await createExerciseAction(data);
};
```

### ❌ NEVER DO THIS

```tsx
// DON'T: FormData parameter
"use server";
export async function createExerciseAction(formData: FormData) {
  const name = formData.get("name") as string;
  // ❌ WRONG - Use typed objects
}

// DON'T: Untyped parameters
"use server";
export async function createExerciseAction(data: any) {
  // ❌ WRONG - Always type your parameters
}
```

---

## Rule #5: No redirect() in Server Actions

**Server Actions MUST NOT use redirect(). Handle navigation client-side after the action resolves.**

Server Actions should return data, not perform navigation. This allows for better error handling, loading states, and client-side control.

### ✅ CORRECT

```tsx
// app/workouts/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";
import { z } from "zod";

const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().datetime(),
});

type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = createWorkoutSchema.parse(input);
  const workout = await createWorkout(userId, validated);

  revalidatePath("/workouts");

  // ✅ Return data, let client handle navigation
  return { success: true, workout };
}
```

```tsx
// app/workouts/workout-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createWorkoutAction } from "./actions";

export function WorkoutForm() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleSubmit = async (data: CreateWorkoutInput) => {
    setIsPending(true);
    try {
      const result = await createWorkoutAction(data);

      // ✅ Handle navigation client-side after action resolves
      if (result.success) {
        router.push("/workouts");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    // form implementation
  );
}
```

### ❌ NEVER DO THIS

```tsx
// DON'T: Using redirect() in Server Action
"use server";

import { redirect } from "next/navigation";
import { createWorkout } from "@/data/workouts";

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = createWorkoutSchema.parse(input);
  const workout = await createWorkout(userId, validated);

  revalidatePath("/workouts");
  redirect("/workouts"); // ❌ WRONG - Never use redirect() in server actions
}
```

### Why This Rule?

- **Error Handling**: Client can catch errors and show appropriate UI feedback
- **Loading States**: Client maintains control over loading indicators
- **Conditional Navigation**: Client can decide whether/where to navigate based on result
- **User Experience**: Prevents abrupt navigation on errors
- **Flexibility**: Allows different navigation based on context

---

## Complete Mutation Flow

```
1. User interacts with form in Client Component
                ↓
2. Client Component → Call Server Action with typed data
                ↓
3. Server Action    → Authenticate with auth()
                ↓
4. Server Action    → Validate input with Zod
                ↓
5. Server Action    → Call data helper function in /src/data
                ↓
6. Data Helper      → Execute Drizzle ORM mutation
   (/src/data/*.ts) → Filter/verify by userId
                ↓
7. Server Action    → Revalidate cache paths
                ↓
8. Server Action    → Return result to client
                ↓
9. Client Component → Update UI based on result
```

---

## File Organization

### Colocated `actions.ts` Files

Server Actions MUST be in colocated `actions.ts` files within the app directory:

```
app/
  workouts/
    page.tsx
    actions.ts          ← Server actions for workouts
    [id]/
      page.tsx
      actions.ts        ← Server actions for individual workout
  exercises/
    page.tsx
    actions.ts          ← Server actions for exercises
```

### ✅ CORRECT Structure

```tsx
// app/workouts/actions.ts
"use server";

export async function createWorkoutAction(input: CreateWorkoutInput) { }
export async function updateWorkoutAction(input: UpdateWorkoutInput) { }
export async function deleteWorkoutAction(input: DeleteWorkoutInput) { }
```

### ❌ WRONG Structure

```tsx
// DON'T: actions in random locations
// lib/actions.ts
// utils/mutations.ts
// actions/workout-actions.ts
// ❌ WRONG - Must be colocated in app directory
```

---

## Common Patterns

### Pattern: Create with Validation

```tsx
// app/workouts/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createWorkout } from "@/data/workouts";
import { z } from "zod";

const createWorkoutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  date: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

type CreateWorkoutInput = z.infer<typeof createWorkoutSchema>;

export async function createWorkoutAction(input: CreateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = createWorkoutSchema.parse(input);
  const workout = await createWorkout(userId, validated);

  revalidatePath("/workouts");
  return workout;
}
```

### Pattern: Update with Ownership Verification

```tsx
// app/workouts/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { updateWorkout } from "@/data/workouts";
import { z } from "zod";

const updateWorkoutSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  date: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

type UpdateWorkoutInput = z.infer<typeof updateWorkoutSchema>;

export async function updateWorkoutAction(input: UpdateWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = updateWorkoutSchema.parse(input);
  const { id, ...data } = validated;

  // updateWorkout helper verifies userId ownership
  const workout = await updateWorkout(id, userId, data);
  if (!workout) throw new Error("Workout not found");

  revalidatePath("/workouts");
  revalidatePath(`/workouts/${id}`);

  return workout;
}
```

### Pattern: Delete with Confirmation

```tsx
// app/workouts/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { deleteWorkout } from "@/data/workouts";
import { z } from "zod";

const deleteWorkoutSchema = z.object({
  id: z.string().uuid(),
});

type DeleteWorkoutInput = z.infer<typeof deleteWorkoutSchema>;

export async function deleteWorkoutAction(input: DeleteWorkoutInput) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const validated = deleteWorkoutSchema.parse(input);

  // deleteWorkout helper verifies userId ownership
  const deleted = await deleteWorkout(validated.id, userId);
  if (!deleted) throw new Error("Workout not found");

  revalidatePath("/workouts");

  return { success: true, deleted };
}
```

### Pattern: Client Component Usage

```tsx
// app/workouts/workout-form.tsx
"use client";

import { useState } from "react";
import { createWorkoutAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function WorkoutForm() {
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsPending(true);

    const formData = new FormData(e.currentTarget);

    try {
      // Call server action with typed object
      await createWorkoutAction({
        name: formData.get("name") as string,
        date: new Date().toISOString(),
        notes: formData.get("notes") as string,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input name="name" placeholder="Workout name" required />
      <Input name="notes" placeholder="Notes" />
      <Button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Workout"}
      </Button>
    </form>
  );
}
```

---

## Security Checklist

Every Server Action must:

- ✅ Have `"use server";` directive at the top of the file
- ✅ Authenticate user with `await auth()`
- ✅ Define a Zod schema for input validation
- ✅ Type parameters using `z.infer<typeof schema>`
- ✅ Call `.parse()` or `.safeParse()` to validate input
- ✅ Call data helpers from `/src/data` directory
- ✅ Pass `userId` to data helpers for ownership verification
- ✅ Call `revalidatePath()` to update cache
- ✅ Return data (never use `redirect()`)
- ✅ Handle errors appropriately

Every Data Helper must:

- ✅ Accept `userId` as a parameter
- ✅ Use Drizzle ORM (never raw SQL)
- ✅ Verify ownership with `.where(and(eq(table.id, id), eq(table.userId, userId)))`
- ✅ Return typed results
- ✅ Be located in `/src/data` directory

---

## Why These Rules?

### Server Actions Only
- **Security**: No client-side mutations, credentials never exposed
- **Type Safety**: Full TypeScript support end-to-end
- **Performance**: No API layer overhead, direct database access
- **Developer Experience**: Colocated with features, easy to find

### Data Directory Pattern
- **Consistency**: Single source of truth for data operations
- **Testability**: Easy to test and mock data functions
- **Security**: Centralized ownership verification
- **Maintainability**: All database logic in one place

### Zod Validation
- **Security**: Prevents injection attacks and malformed data
- **Type Safety**: Runtime validation matches TypeScript types
- **Error Handling**: Clear, structured validation errors
- **Developer Experience**: Autocomplete and type inference

### Typed Parameters (No FormData)
- **Type Safety**: Full TypeScript support in actions
- **Developer Experience**: Better autocomplete and refactoring
- **Validation**: Zod schemas work seamlessly with typed objects
- **Clarity**: Explicit about what data is expected

---

## Summary

1. **Server Actions ONLY** - All mutations in colocated `actions.ts` files
2. **Data directory helpers** - All database mutations through `/src/data` using Drizzle ORM
3. **Zod validation** - EVERY Server Action validates input with Zod schemas
4. **Typed parameters** - Use typed objects, NEVER FormData
5. **No redirect() in Server Actions** - Handle navigation client-side after action resolves
6. **User isolation** - Always verify `userId` ownership in data helpers
7. **Cache revalidation** - Call `revalidatePath()` after mutations

**These rules are mandatory. No exceptions.**
