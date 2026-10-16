import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import StoreProvider from "@/src/store/Provider";
import { Toaster } from "sonner";

const font = Plus_Jakarta_Sans({ subsets: ["latin"] });

export const metadata = { 
  title: "Bhumi Container Service | Container Transport & Fleet TMS", 
  description: "Bhumi Container Service (bhumicontainer.in) - Professional Container Transport, Logistics, and Fleet Operations Management System" 
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
