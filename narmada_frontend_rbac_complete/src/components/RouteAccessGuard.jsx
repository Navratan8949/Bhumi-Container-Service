"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import AccessDenied from "./AccessDenied";
import { isAllowedPath } from "@/src/lib/rbac";
import { getActiveCompany } from "@/src/lib/auth";

export default function RouteAccessGuard({ user, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const allowed = isAllowedPath(user?.role, pathname);

  useEffect(() => {
    if (user?.role === "super_admin") {
      const active = getActiveCompany();
      const storedCompanyId =
        typeof window !== "undefined"
          ? sessionStorage.getItem("nrl_company")
          : null;
      if (!active && !storedCompanyId) {
        router.replace("/select-company");
      }
    }
  }, [user, router]);

  if (!allowed) {
    return <AccessDenied />;
  }

  if (user?.role === "super_admin") {
    const active = getActiveCompany();
    const storedCompanyId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("nrl_company")
        : null;
    if (!active && !storedCompanyId) {
      return (
        <div className="grid min-h-[50vh] place-items-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        </div>
      );
    }
  }

  return children;
}
