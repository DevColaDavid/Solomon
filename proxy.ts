import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Auth is handled at the component level via authClient.useSession()
// The dashboard and admin pages redirect to /login if no session is found
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
