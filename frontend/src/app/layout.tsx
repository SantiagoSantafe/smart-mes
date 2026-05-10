import type { Metadata } from "next";
import "./globals.css";
import SWRProvider from "@/components/SWRProvider";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Smart MES",
  description: "Sistema de Gestión de Manufactura",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-900">
        <SWRProvider>
          <AppShell>{children}</AppShell>
        </SWRProvider>
      </body>
    </html>
  );
}
