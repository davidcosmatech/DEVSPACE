"use server";

import { revalidatePath } from "next/cache";

import { requireViewer } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { tickets } from "@/lib/db/schema";
import { ticketSchema } from "@/lib/validation/admin";

export type SupportActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export async function createTicketAction(input: unknown): Promise<SupportActionResult> {
  const viewer = await requireViewer();
  const parsed = ticketSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the ticket details." };
  }

  const db = await getDb();
  await db.insert(tickets).values({
    userId: viewer.id,
    subject: parsed.data.subject,
    message: parsed.data.message,
    priority: parsed.data.priority,
    status: "open",
  });

  revalidatePath("/support");
  revalidatePath("/admin");
  return { ok: true, message: "Ticket sent. An administrator will review it." };
}
