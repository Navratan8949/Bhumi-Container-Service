export const getStoredUser = () => {
    if (typeof window === "undefined")
        return null;
    try {
        const raw = sessionStorage.getItem("nrl_user");
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
};
export const getToken = () => typeof window !== "undefined" ? sessionStorage.getItem("nrl_token") : null;
export const saveSession = (token, user) => {
    sessionStorage.setItem("nrl_token", token);
    sessionStorage.setItem("nrl_user", JSON.stringify(user));
};
export const clearSession = () => {
    sessionStorage.removeItem("nrl_token");
    sessionStorage.removeItem("nrl_user");
    sessionStorage.removeItem("nrl_company");
    sessionStorage.removeItem("nrl_active_company");
};
export const roleLabel = (role) => (role || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
export const companyName = (user) => {
    const active = getActiveCompany();
    if (active?.name)
        return active.name;
    if (!user?.companyId)
        return "All Companies";
    return typeof user.companyId === "object" ? user.companyId.name : "Company";
};

export const getActiveCompany = () => {
    if (typeof window === "undefined")
        return null;
    try {
        const raw = sessionStorage.getItem("nrl_active_company");
        if (raw)
            return JSON.parse(raw);
        const user = getStoredUser();
        if (user?.companyId && typeof user.companyId === "object") {
            return user.companyId;
        }
        return null;
    }
    catch {
        return null;
    }
};

export const setActiveCompany = (company) => {
    if (typeof window === "undefined")
        return;
    if (!company) {
        sessionStorage.removeItem("nrl_company");
        sessionStorage.removeItem("nrl_active_company");
    }
    else {
        sessionStorage.setItem("nrl_company", company._id);
        sessionStorage.setItem("nrl_active_company", JSON.stringify(company));
        window.dispatchEvent(new CustomEvent("nrl_company_changed", { detail: company }));
    }
};

import { useEffect, useState } from "react";
import api from "@/src/services/api";

export const useActiveCompany = () => {
    // Initialize with null to match SSR output and prevent hydration mismatch
    const [company, setCompany] = useState(null);

    useEffect(() => {
        const syncCompany = async () => {
            const current = getActiveCompany();
            if (current) {
                setCompany(current);
                return;
            }
            const companyId = sessionStorage.getItem("nrl_company");
            if (companyId) {
                try {
                    const res = await api.get(`/companies/${companyId}`);
                    if (res?.data?.data) {
                        setActiveCompany(res.data.data);
                        setCompany(res.data.data);
                    }
                }
                catch (e) {
                    console.error("Failed to sync active company", e);
                }
            }
        };

        syncCompany();

        const onCompanyChange = (e) => {
            setCompany(e.detail);
        };
        window.addEventListener("nrl_company_changed", onCompanyChange);
        return () => window.removeEventListener("nrl_company_changed", onCompanyChange);
    }, []);

    return company;
};
