"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowLeft, ArrowRight, Loader2, MailCheck } from "lucide-react";

import { requestPasswordResetAction } from "@/features/auth/actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function submit(values: ForgotPasswordInput) {
    setServerError(null);
    setSuccess(null);
    setResetUrl(null);
    setLoading(true);
    try {
      const result = await requestPasswordResetAction(values);
      if (!result.ok) {
        setServerError(result.error ?? "Unable to create a reset link.");
        return;
      }
      setSuccess(result.message ?? "If the account exists, a reset link was created.");
      setResetUrl(result.resetUrl ?? null);
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2>Reset your password</h2>
      <p>Enter the email address linked to your workspace.</p>

      <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
        {serverError ? (
          <div className="form-error" role="alert">
            <AlertCircle size={15} />
            {serverError}
          </div>
        ) : null}
        {success ? (
          <div className="form-success" role="status">
            <MailCheck size={15} />
            {success}
          </div>
        ) : null}
        {resetUrl ? (
          <Link href={resetUrl} className="btn btn-secondary btn-block">
            Open development reset link <ArrowRight size={15} />
          </Link>
        ) : null}

        <div className="field">
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="input"
            autoComplete="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Creating reset link…" : "Send reset link"}
        </button>
      </form>

      <div className="auth-bottom">
        <Link href="/login" className="auth-link" style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <ArrowLeft size={12} /> Back to sign in
        </Link>
      </div>
    </>
  );
}
