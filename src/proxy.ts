export { middleware as proxy } from "@/lib/auth/middleware";
export const config = { matcher: ["/dashboard/:path*", "/api/:path*"] };
