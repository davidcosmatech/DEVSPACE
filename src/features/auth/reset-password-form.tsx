"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

import { resetPasswordAction } from "@/features/auth/actions";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function submit(values: ResetPasswordInput) {
    setServerError(null);
    setLoading(true);
    try {
      const result = await resetPasswordAction(values);
      if (!result.ok) {
        setServerError(result.error ?? "Unable to reset your password.");
        return;
      }
      setSuccess(true);
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <>
        <h2>Password updated</h2>
        <p>Your previous sessions have been signed out.</p>
        <div className="form-success" style={{ marginTop: 22 }} role="status">
          <CheckCircle2 size={16} />
          You can now sign in with your new password.
        </div>
        <Link href="/login" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 18 }}>
          Continue to sign in <ArrowRight size={16} />
        </Link>
      </>
    );
  }

  return (
    <>
      <h2>Choose a new password</h2>
      <p>Make it strong and unique to DEVSPACE.</p>

      <form className="auth-form" method="post" onSubmit={handleSubmit(submit)} noValidate>
        {serverError ? (
          <div className="form-error" role="alert">
            <AlertCircle size={15} />
            {serverError}
          </div>
        ) : null}
        <input type="hidden" {...register("token")} />

        <div className="field">
          <label className="label" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            autoComplete="new-password"
            placeholder="8+ chars, upper, lower & number"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          {errors.password ? (
            <span className="field-error">{errors.password.message}</span>
          ) : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="confirmPassword">
            Confirm new password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="input"
            autoComplete="new-password"
            placeholder="Repeat your password"
            aria-invalid={Boolean(errors.confirmPassword)}
            {...register("confirmPassword")}
          />
          {errors.confirmPassword ? (
            <span className="field-error">{errors.confirmPassword.message}</span>
          ) : null}
        </div>

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Updating password…" : "Update password"}
        </button>
      </form>
    </>
  );
}

