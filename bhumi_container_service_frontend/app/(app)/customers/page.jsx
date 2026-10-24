import CustomerMasterPage from "@/src/components/CustomerMasterPage";

export const metadata = {
  title: "Customer Master (Party Directory) | Bhumi Container Service",
  description:
    "Manage client master list, consignor and consignee profiles, GST & PAN tax records, credit limits, payment terms and commercial ledger accounts.",
};

export default function Page() {
  return <CustomerMasterPage />;
}
