import ReportDetail from "@/src/components/ReportDetail";
export default async function Page({ params }) { const p = await params; return <ReportDetail reportKey={p.report}/>; }
