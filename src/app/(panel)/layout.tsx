import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { PanelShell } from "@/components/PanelShell";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return (
    <PanelShell
      initialSession={{
        name: session.name,
        email: session.email,
        role: session.role,
        isSuperAdmin: session.isSuperAdmin,
        tenantName: session.tenantName,
      }}
    >
      {children}
    </PanelShell>
  );
}
