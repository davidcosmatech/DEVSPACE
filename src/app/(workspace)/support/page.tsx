import type { Metadata } from "next";

import { SupportView } from "@/features/support/support-view";
import { getSupportTickets } from "@/features/admin/queries";
import { requireViewer } from "@/lib/auth";

export const metadata: Metadata = { title: "Support" };

export default async function SupportPage() {
  const viewer = await requireViewer();
  const tickets = await getSupportTickets(viewer.id);

  return <SupportView tickets={tickets} />;
}
