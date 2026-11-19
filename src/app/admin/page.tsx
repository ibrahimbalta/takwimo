import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AdminConsoleClient from "./AdminConsoleClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || !session.isSuperAdmin) {
    redirect("/admin/login");
  }
  return <AdminConsoleClient />;
}
