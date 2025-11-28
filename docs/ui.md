# UI Coding Standards

This document outlines the UI coding standards for the Lifting Diary Course project. **All developers must follow these standards without exception.**

---

## Component Library

### shadcn/ui Components ONLY

**CRITICAL RULE**: This project uses **ONLY** [shadcn/ui](https://ui.shadcn.com/) components for all UI elements.

#### ✅ ALLOWED
- shadcn/ui components (Button, Card, Input, Dialog, etc.)
- Composition of shadcn/ui components
- Customization of shadcn/ui components via className and props

#### ❌ FORBIDDEN
- Creating custom UI components from scratch
- Using other UI libraries (Material-UI, Ant Design, Chakra UI, etc.)
- Building custom buttons, inputs, modals, or any other UI primitives
- Creating wrapper components that reimplemented shadcn/ui functionality

### Installing shadcn/ui Components

When you need a component that isn't yet installed:

```bash
# Install a specific component
npx shadcn@latest add button

# Install multiple components at once
npx shadcn@latest add card dialog input label
```

### Component Usage Examples

```tsx
// ✅ CORRECT: Using shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function MyFeature() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>Click me</Button>
      </CardContent>
    </Card>
  );
}

// ❌ WRONG: Creating custom components
export function CustomButton({ children }: { children: React.ReactNode }) {
  return <button className="custom-styles">{children}</button>;
}
```

### Customizing shadcn/ui Components

If you need to customize a component's appearance:

```tsx
// ✅ CORRECT: Customize via className and variants
import { Button } from "@/components/ui/button";

<Button className="w-full bg-blue-600 hover:bg-blue-700">
  Custom Styled Button
</Button>

// Or use built-in variants
<Button variant="destructive" size="lg">
  Delete
</Button>
```

---

## Date Formatting

### date-fns Library

**All date formatting must use [date-fns](https://date-fns.org/)**.

#### Installation

```bash
npm install date-fns
```

### Standard Date Format

**The project uses a specific date format throughout:**

```
1st Sep 2025
2nd Aug 2025
3rd Jan 2026
4th Jun 2024
```

#### Implementation

Use the `format` function from date-fns with the `do MMM yyyy` pattern:

```typescript
import { format } from "date-fns";

// Example usage
const date = new Date("2025-09-01");
const formattedDate = format(date, "do MMM yyyy");
// Result: "1st Sep 2025"
```

#### Date Format Breakdown

- `do` - Day of month with ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
- `MMM` - Abbreviated month name (Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec)
- `yyyy` - Full year (4 digits)

#### Helper Function (Recommended)

Create a utility function for consistent formatting:

```typescript
// src/lib/date-utils.ts
import { format } from "date-fns";

export function formatDate(date: Date | string | number): string {
  return format(new Date(date), "do MMM yyyy");
}
```

Usage:

```typescript
import { formatDate } from "@/lib/date-utils";

const displayDate = formatDate(new Date());
// Result: "1st Jan 2025" (or current date)
```

### Date Formatting Rules

#### ✅ ALLOWED
- `format(date, "do MMM yyyy")` for the standard format
- Other date-fns functions for date manipulation (addDays, subMonths, etc.)
- Parsing dates with `parseISO`, `parse`, etc.

#### ❌ FORBIDDEN
- `toLocaleDateString()` or native JavaScript date formatting
- Moment.js or other date libraries
- Manual string concatenation for dates
- Hard-coded date strings

### Additional date-fns Usage

While `do MMM yyyy` is the standard display format, you may use other date-fns functions as needed:

```typescript
import {
  format,
  addDays,
  subMonths,
  isAfter,
  isBefore,
  parseISO
} from "date-fns";

// Add 7 days to current date
const nextWeek = addDays(new Date(), 7);

// Check if date is in the future
const isFutureDate = isAfter(someDate, new Date());

// Parse ISO string from API
const parsedDate = parseISO("2025-09-01T00:00:00Z");
```

---

## Summary

### Quick Reference

| Aspect | Standard | Library/Tool |
|--------|----------|--------------|
| UI Components | shadcn/ui ONLY | [shadcn/ui](https://ui.shadcn.com/) |
| Custom Components | ❌ FORBIDDEN | N/A |
| Date Formatting | `do MMM yyyy` | date-fns |
| Date Library | date-fns | [date-fns](https://date-fns.org/) |

### Key Principles

1. **Never create custom UI components** - Always use shadcn/ui
2. **Never format dates manually** - Always use date-fns
3. **Consistency is critical** - Follow these standards in every file
4. **When in doubt** - Check shadcn/ui docs or ask before creating anything custom

---

## Enforcement

Code reviews must verify:
- [ ] No custom UI components created
- [ ] All UI uses shadcn/ui components
- [ ] All dates formatted with date-fns
- [ ] Date format matches `do MMM yyyy` pattern

Any code violating these standards must be rejected and refactored.
