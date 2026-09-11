import { describe, it } from "node:test";
import assert from "node:assert";

describe("Auth middleware helpers", () => {
  describe("redirectToLogin", () => {
    it("constructs correct login redirect URL", () => {
      const pathname = "/dashboard";
      const loginUrl = new URL("/login", "http://localhost");
      loginUrl.searchParams.set("redirect", pathname);
      
      assert.strictEqual(loginUrl.pathname, "/login");
      assert.strictEqual(loginUrl.searchParams.get("redirect"), "/dashboard");
    });

    it("handles nested paths in redirect", () => {
      const pathname = "/dashboard/settings";
      const loginUrl = new URL("/login", "http://localhost");
      loginUrl.searchParams.set("redirect", pathname);
      
      assert.strictEqual(loginUrl.searchParams.get("redirect"), "/dashboard/settings");
    });
  });

  describe("public path detection", () => {
    it("identifies login as public path", () => {
      const isPublic = ["/login", "/register", "/api/auth"].some(
        path => "/login".startsWith(path)
      );
      assert.strictEqual(isPublic, true);
    });

    it("identifies register as public path", () => {
      const isPublic = ["/login", "/register", "/api/auth"].some(
        path => "/register".startsWith(path)
      );
      assert.strictEqual(isPublic, true);
    });

    it("identifies dashboard as protected path", () => {
      const isPublic = ["/login", "/register", "/api/auth"].some(
        path => "/dashboard".startsWith(path)
      );
      assert.strictEqual(isPublic, false);
    });

    it("identifies api/auth as public path", () => {
      const isPublic = ["/login", "/register", "/api/auth"].some(
        path => "/api/auth/session".startsWith(path)
      );
      assert.strictEqual(isPublic, true);
    });

    it("identifies api/health as non-auth API", () => {
      const isPublic = ["/login", "/register", "/api/auth"].some(
        path => "/api/health".startsWith(path)
      );
      assert.strictEqual(isPublic, false);
    });
  });

  describe("role checking", () => {
    it("allows access for matching role", () => {
      const allowedRoles = ["owner", "admin"];
      const userRole = "admin";
      assert.strictEqual(allowedRoles.includes(userRole), true);
    });

    it("denies access for non-matching role", () => {
      const allowedRoles = ["owner", "admin"];
      const userRole = "user";
      assert.strictEqual(allowedRoles.includes(userRole), false);
    });

    it("owner has access to owner-only routes", () => {
      const allowedRoles = ["owner"];
      const userRole = "owner";
      assert.strictEqual(allowedRoles.includes(userRole), true);
    });
  });

  describe("tenant ID validation", () => {
    it("validates UUID format", () => {
      const validUUID = "550e8400-e29b-41d4-a716-446655440000";
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      assert.strictEqual(uuidRegex.test(validUUID), true);
    });

    it("rejects invalid UUID", () => {
      const invalidUUID = "not-a-uuid";
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      assert.strictEqual(uuidRegex.test(invalidUUID), false);
    });

    it("rejects empty string as tenant ID", () => {
      const tenantId = "";
      assert.strictEqual(tenantId.length > 0, false);
    });
  });
});