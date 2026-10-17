"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import AccessDenied from "./AccessDenied";
import { isAllowedPath } from "@/src/lib/rbac";
import { getActiveCompany, setActiveCompany } from "@/src/lib/auth";
import { getCompanies } from "@/src/services/company.service";

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
        getCompanies()
          .then((res) => {
            const list = res?.data || [];
            if (list.length === 1) {
              setActiveCompany(list[0]);
            } else if (list.length > 1) {
              router.replace("/select-company");
            }
          })
          .catch(() => {});
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
