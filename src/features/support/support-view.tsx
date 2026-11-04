"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Clock3, LifeBuoy, Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/ui/page-header";
import { createTicketAction } from "@/features/support/actions";
import type { SupportTicket } from "@/features/admin/queries";
import {
  ticketPriorities,
  ticketPriorityLabels,
  ticketStatusLabels,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/admin";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

const emptyForm = { subject: "", message: "", priority: "normal" as TicketPriority };

export function SupportView({ tickets }: { tickets: SupportTicket[] }) {
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<string | null>(tickets[0]?.id ?? null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    const result = await createTicketAction(form);
    setSending(false);
    if (!result.ok) {
      toast.error(result.error ?? "Could not send the ticket.");
      return;
    }
    toast.success(result.message ?? "Ticket sent.");
    setForm(emptyForm);
    startTransition(() => window.location.reload());
  }

  const current = tickets.find((ticket) => ticket.id === selected) ?? tickets[0] ?? null;
  const awaiting = tickets.filter((ticket) => ticket.status === "open" || ticket.status === "in_progress").length;

  return (
    <>
      <PageHeader
        eyebrow="Help desk"
        icon={LifeBuoy}
        title="Support"
        description="Open a ticket for the workspace administrator and follow the reply in one place."
      />

      <div className="support-grid">
        <section className="panel support-form-panel">
          <div className="support-panel-head">
            <h2>New ticket</h2>
            <span className="badge badge-slate">Replies in this app</span>
          </div>
          <form onSubmit={submit} className="form-stack">
            <div className="field">
              <label className="label" htmlFor="ticket-subject">
                Subject
              </label>
              <input
                id="ticket-subject"
                className="input"
                value={form.subject}
                onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))}
                placeholder="e.g. Private repositories are not loading"
                maxLength={140}
                required
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="ticket-priority">
                Priority
              </label>
              <select
                id="ticket-priority"
                className="select"
                value={form.priority}
                onChange={(event) =>
                  setForm((current) => ({ ...current, priority: event.target.value as TicketPriority }))
                }
              >
                {ticketPriorities.map((priority) => (
                  <option key={priority} value={priority}>
                    {ticketPriorityLabels[priority]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="ticket-message">
                What do you need?
              </label>
              <textarea
                id="ticket-message"
                className="textarea"
                rows={6}
                value={form.message}
                onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                placeholder="Describe the problem, what you expected and what happened."
                maxLength={4000}
                required
              />
              <span className="label-hint">{form.message.length}/4000 characters</span>
            </div>
            <button type="submit" className="btn btn-primary" disabled={sending}>
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Send ticket
            </button>
          </form>
        </section>

        <section className="panel support-list-panel">
          <div className="support-panel-head">
            <h2>Your tickets</h2>
            <span className="support-meta">
              {pending ? <Loader2 size={12} className="animate-spin" /> : null}
              {awaiting} awaiting · {tickets.length} total
            </span>
          </div>

          {tickets.length === 0 ? (
            <div className="support-empty">
              <span className="empty-icon">
                <MessageSquare size={19} />
              </span>
              <h3>No tickets yet</h3>
              <p>Send your first ticket with the form on the left. Replies appear here.</p>
            </div>
          ) : (
            <div className="support-ticket-list">
              {tickets.map((ticket) => {
                const active = current?.id === ticket.id;
                return (
                  <button
                    key={ticket.id}
                    type="button"
                    className={cn("support-ticket", active && "active")}
                    onClick={() => setSelected(ticket.id)}
                  >
                    <span className={cn("support-status", ticket.status)}>
                      {ticket.status === "open" || ticket.status === "in_progress" ? (
                        <Clock3 size={10} />
                      ) : (
                        <CheckCircle2 size={10} />
                      )}
                      {ticketStatusLabels[ticket.status as TicketStatus]}
                    </span>
                    <span className="support-ticket-subject">{ticket.subject}</span>
                    <span className="support-ticket-meta">
                      {ticketPriorityLabels[ticket.priority as TicketPriority]} ·{" "}
                      {relativeTime(ticket.createdAt)}
                      {ticket.adminReply ? " · replied" : ""}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {current ? (
            <article className="support-detail">
              <header>
                <h3>{current.subject}</h3>
                <span className={cn("support-status", current.status)}>
                  {ticketStatusLabels[current.status as TicketStatus]}
                </span>
              </header>
              <p className="support-detail-meta">
                Opened {formatDateTime(current.createdAt)} · priority{" "}
                {ticketPriorityLabels[current.priority as TicketPriority].toLowerCase()}
              </p>
              <p className="support-detail-message">{current.message}</p>
              {current.adminReply ? (
                <div className="support-reply">
                  <strong>Administrator reply</strong>
                  <p>{current.adminReply}</p>
                  {current.repliedAt ? <span>{formatDateTime(current.repliedAt)}</span> : null}
                </div>
              ) : (
                <p className="support-waiting">Awaiting an administrator reply.</p>
              )}
            </article>
          ) : null}
        </section>
      </div>
    </>
  );
}
