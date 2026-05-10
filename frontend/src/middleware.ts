import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("mes_token")?.value;
  const { pathname } = request.nextUrl;

  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
