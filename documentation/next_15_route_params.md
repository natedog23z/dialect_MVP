# Next.js 15 Route Parameters Technical Specification

## Overview
This document outlines the handling of route parameters in Next.js 15, specifically focusing on the Promise-based parameter pattern required in API and page route handlers.

## Key Changes in Next.js 15
Next.js 15 introduces a significant change in how route parameters are handled. Route parameters are now asynchronously resolved and must be typed as Promises in route handlers.

## Correct Pattern

### API Route Handler
```typescript
// [paramName]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ paramName: string }> }
) {
  const { paramName } = await params;
  // Use paramName here
}
```

### Page Route Component
```typescript
// [paramName]/page.tsx
interface PageProps {
  params: Promise<{
    paramName: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { paramName } = await params;
  // Use paramName here
}
```

## Common Issues and Solutions

### 1. Type Errors
```typescript
// ❌ Incorrect - Will cause type error
export async function GET(
  request: Request,
  { params }: { params: { paramName: string } }
) {
  const { paramName } = params; // Error: params must be Promise-based
}

// ✅ Correct
export async function GET(
  request: Request,
  { params }: { params: Promise<{ paramName: string }> }
) {
  const { paramName } = await params;
}
```

### 2. Multiple Parameters
```typescript
// For routes like [category]/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ 
    category: string;
    id: string;
  }> }
) {
  const { category, id } = await params;
}
```

## Best Practices

1. **Always Await Params**
   - Always use `await` when accessing params
   - Destructure after awaiting

2. **Type Safety**
   - Explicitly type the params object
   - Use TypeScript interfaces for complex parameter shapes

3. **Error Handling**
   ```typescript
   try {
     const { paramName } = await params;
     // Use paramName
   } catch (error) {
     // Handle parameter resolution errors
   }
   ```

## Migration Guide

### From Next.js 13/14 to 15
```typescript
// Old (Next.js 13/14)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;
}

// New (Next.js 15)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
}
```

## Examples from Our Codebase

### Room Status Route
```typescript
// app/api/room/status/[roomId]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  // Handle room status logic
}
```

### User Route
```typescript
// app/api/user/[userId]/route.ts
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  // Handle user data logic
}
```

## Common Gotchas

1. **Request Type**
   - Use `Request` instead of `NextRequest` for simpler route handlers
   - `NextRequest` is only needed when using Next.js-specific request features

2. **Async/Await**
   - Route handlers must be async functions
   - Parameter destructuring must use await

3. **Type Definitions**
   - Don't use `@types/next` package (it's included in Next.js 15)
   - Ensure TypeScript version is 4.7 or newer

## Additional Resources

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [App Router Documentation](https://nextjs.org/docs/app)
- [Route Handlers Documentation](https://nextjs.org/docs/app/api-reference/file-conventions/route) 