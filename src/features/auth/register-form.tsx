"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";

import { registerAction } from "@/features/auth/actions";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      displayName: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function submit(values: RegisterInput) {
    setServerError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const result = await registerAction(values);
      if (!result.ok) {
        setServerError(result.error ?? "Unable to create your account.");
        return;
      }
      if (result.requiresConfirmation) {
        setSuccess(result.message ?? "Check your inbox to confirm your email.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h2>Create your workspace</h2>
      <p>Free to start. Your data stays private to your account.</p>

      <form className="auth-form" method="post" onSubmit={handleSubmit(submit)} noValidate>
        {serverError ? (
          <div className="form-error" role="alert">
            <AlertCircle size={15} />
            {serverError}
          </div>
        ) : null}
        {success ? (
          <div className="form-success" role="status">
            <CheckCircle2 size={15} />
            {success}
          </div>
        ) : null}

        <div className="form-grid">
          <div className="field">
            <label className="label" htmlFor="displayName">
              Display name
            </label>
            <input
              id="displayName"
              className="input"
              autoComplete="name"
              placeholder="David Cosma"
              aria-invalid={Boolean(errors.displayName)}
              {...register("displayName")}
            />
            {errors.displayName ? (
              <span className="field-error">{errors.displayName.message}</span>
            ) : null}
          </div>

          <div className="field">
            <label className="label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="input"
              autoComplete="username"
              placeholder="davidcosma"
              aria-invalid={Boolean(errors.username)}
              {...register("username")}
            />
            {errors.username ? (
              <span className="field-error">{errors.username.message}</span>
            ) : null}
          </div>
        </div>

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

        <div className="field">
          <label className="label" htmlFor="password">
            Password <span className="label-hint">8+ chars, upper, lower & number</span>
          </label>
          <div className="password-wrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              className="input"
              autoComplete="new-password"
              placeholder="Create a strong password"
              aria-invalid={Boolean(errors.password)}
              {...register("password")}
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errors.password ? (
            <span className="field-error">{errors.password.message}</span>
          ) : null}
        </div>

        <div className="field">
          <label className="label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
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
          {loading ? "Creating workspace…" : "Create account"}
          {!loading ? <ArrowRight size={16} /> : null}
        </button>
      </form>

      <div className="auth-bottom">
        Already have an account?{" "}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </div>
    </>
  );
}

