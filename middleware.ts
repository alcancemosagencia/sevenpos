import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
]);

const protectedSegments = new Set([
  "admin",
  "api",
  "auth",
  "cash",
  "customer-display",
  "customers",
  "dashboard",
  "expenses",
  "inventory",
  "kds",
  "more",
  "onboarding",
  "pos",
  "pre-sales",
  "products",
  "public-menu",
  "receipts",
  "reports",
  "settings",
  "staff",
  "transfers",
]);

function isPublicStoreRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 1 && !protectedSegments.has(segments[0]);
}

export default clerkMiddleware(async (auth, request) => {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-sevenpos-pathname", request.nextUrl.pathname);

  if (!isPublicRoute(request) && !isPublicStoreRoute(request.nextUrl.pathname)) {
    await auth.protect();
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)", "/(api|trpc)(.*)"],
};
