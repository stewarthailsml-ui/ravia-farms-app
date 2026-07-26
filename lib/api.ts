import { NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { requireUser, SessionUser } from "@/lib/auth";

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// Wrap a handler with auth + Zod validation + try/catch.
// `scoped` handlers receive the authenticated user (with farmId) after passing `requireUser`.
export function withHandler<T>(
  schema: ZodSchema<T> | null,
  handler: (body: T, user: SessionUser, req: Request) => Promise<unknown>,
) {
  return async (req: Request) => {
    try {
      const user = await requireUser();

      if (req.method === "GET" || req.method === "DELETE") {
        const data = (await req.json().catch(() => ({}))) as T;
        return NextResponse.json(await handler(data, user, req));
      }

      const raw = await req.json().catch(() => ({}));
      if (schema) {
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Validation failed", issues: parsed.error.flatten() },
            { status: 400 },
          );
        }
        return NextResponse.json(await handler(parsed.data, user, req));
      }
      return NextResponse.json(await handler(raw as T, user, req));
    } catch (err) {
      if (err instanceof HttpError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (err instanceof Error && err.message === "UNAUTHENTICATED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.error(err);
      return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  };
}
