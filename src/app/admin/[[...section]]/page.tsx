import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  adminConfigured,
  adminSession,
  previewAllowed,
} from "@/lib/admin/auth";
import { menu, type Section } from "@/lib/admin/model";
import AdminConsole from "@/components/admin/admin-console";
import AdminLogin from "@/components/admin/admin-login";

export const metadata: Metadata = {
  title: "NextGame Admin",
  robots: { index: false, follow: false },
};
export default async function AdminPage({
  params,
}: {
  params: Promise<{ section?: string[] }>;
}) {
  const { section } = await params;
  const current = section?.join("/") || "dashboard";
  if (!menu.some((group) => group.items.some((item) => item[0] === current)))
    notFound();
  if (!adminConfigured()) {
    if (!previewAllowed()) return <AdminLogin configured={false} />;
    return (
      <AdminConsole
        key={current}
        section={current as Section}
        mode="preview"
        operator="Local preview"
      />
    );
  }
  const session = await adminSession();
  if (!session) return <AdminLogin configured />;
  return (
    <AdminConsole
      key={current}
      section={current as Section}
      mode="live"
      operator={session.email}
    />
  );
}
