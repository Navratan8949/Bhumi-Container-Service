import { redirect } from "next/navigation";
import ResourcePage from "@/src/components/ResourcePage";
import { resources } from "@/src/lib/resources";

export default async function Page({ params }) {
  const p = await params;
  if (p?.module === "vehicle-documents") {
    redirect("/vehicles");
  }
  const resource = resources[p.module];
  return resource ? (
    <ResourcePage resource={resource} />
  ) : (
    <div className="rounded-2xl bg-white p-8">Module not found.</div>
  );
}
