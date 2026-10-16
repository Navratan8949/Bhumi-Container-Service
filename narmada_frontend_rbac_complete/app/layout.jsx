import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/src/store/Provider";
import { Toaster } from "sonner";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata = { 
  title: "Fleet Operations TMS | Transport Management System", 
  description: "Enterprise multi-company transport and fleet management system" 
};

export default function RootLayout({ children }) { 
  return (
    <html lang="en" className={font.className}>
      <body className="min-h-screen bg-slate-50 text-slate-900">
        <StoreProvider>{children}</StoreProvider>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  ); 
}
