"use client";
import { useEffect, useState } from "react";
import { BarChart3, RefreshCcw } from "lucide-react";
import api from "@/src/services/api";
import { reportConfigs } from "@/src/lib/resources";
import { Button, Input, Spinner, Badge, Empty } from "./ui";
function flatten(obj, prefix = "", out = []) {
  if (obj === null || obj === undefined) return out;
  if (typeof obj !== "object") {
    out.push({ key: prefix, value: obj });
    return out;
  }
  if (Array.isArray(obj)) {
    obj.slice(0, 100).forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return out;
  }
  Object.entries(obj).forEach(([k, v]) =>
    flatten(v, prefix ? `${prefix}.${k}` : k, out),
  );
  return out;
}
export default function ReportsPage() {
  const [selected, setSelected] = useState(reportConfigs[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get(selected.endpoint);
      setData(r.data?.data ?? r.data);
    } catch (e) {
      setData({
        error:
          e?.response?.data?.message || e?.message || "Failed to load report",
      });
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [selected]);
  const rows = flatten(data).filter(
    (x) =>
      !search ||
      x.key.toLowerCase().includes(search.toLowerCase()) ||
      String(x.value).toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Analytics
        </p>
        <h2 className="mt-1 text-2xl font-bold">Reports & Insights</h2>
        <p className="mt-1 text-sm text-slate-500">
          Read-only views backed by the reporting APIs.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <div className="rounded-2xl border bg-white p-3 shadow-sm">
          <div className="mb-3 flex items-center gap-2 px-2">
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-bold">Reports</span>
          </div>
          <div className="space-y-1 max-h-[65vh] overflow-y-auto">
            {reportConfigs.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelected(r)}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm ${selected.key === r.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
            <div className="flex-1">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter report fields..."
              />
            </div>
            <Button variant="secondary" onClick={load}>
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
          <div className="p-4">
            <h3 className="font-bold">{selected.title}</h3>
            {loading ? (
              <div className="grid place-items-center py-20">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <Empty text="No report data returned" />
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-slate-400">
                      <th className="px-3 py-2">Field</th>
                      <th className="px-3 py-2">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 font-medium text-slate-600">
                          {r.key}
                        </td>
                        <td className="px-3 py-2 text-slate-800">
                          {typeof r.value === "string" &&
                          [
                            "active",
                            "inactive",
                            "paid",
                            "pending",
                            "delivered",
                          ].includes(r.value) ? (
                            <Badge value={r.value} />
                          ) : (
                            String(r.value)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
