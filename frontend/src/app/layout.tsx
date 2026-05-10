import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SWRProvider from "@/components/SWRProvider";

export const metadata: Metadata = {
  title: "Smart MES",
  description: "Sistema de Gestión de Manufactura",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex h-screen overflow-hidden">
        <SWRProvider>
          <Sidebar />
          <main className="flex-1 overflow-y-auto bg-slate-900 p-6">{children}</main>
        </SWRProvider>
      </body>
    </html>
  );
}
