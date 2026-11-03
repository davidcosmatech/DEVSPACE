"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Play, Sparkles } from "lucide-react";

import { loginAction } from "@/features/auth/actions";
import { loginSchema, type LoginInput } from "@/lib/validation/auth";

export function LoginForm({
  showDemo,
  demoEmail,
  demoPassword,
}: {
  showDemo: boolean;
  demoEmail: string;
  demoPassword: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function submit(values: LoginInput) {
    setServerError(null);
    setLoading(true);
    try {
      const result = await loginAction(values);
      if (!result.ok) {
        setServerError(result.error ?? "Unable to sign in.");
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

  async function useDemo() {
    setServerError(null);
    setDemoLoading(true);
    setValue("email", demoEmail);
    setValue("password", demoPassword);
    try {
      const result = await loginAction({ email: demoEmail, password: demoPassword });
      if (!result.ok) {
        setServerError(result.error ?? "Unable to open the demo workspace.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setServerError("Something went wrong. Please try again.");
    } finally {
      setDemoLoading(false);
    }
  }

  return (
    <>
      <h2>Welcome back</h2>
      <p>Sign in to pick up where you left off.</p>

      <form className="auth-form" onSubmit={handleSubmit(submit)} noValidate>
        {serverError ? (
          <div className="form-error" role="alert">
            <AlertCircle size={15} />
            {serverError}
          </div>
        ) : null}

        <div className="field">
          <label className="label" htmlFor="email">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
          {errors.email ? <span className="field-error">{errors.email.message}</span> : null}
        </div>

        <div className="field">
          <div className="auth-row">
            <label className="label" htmlFor="password">
              Password
            </label>
            <Link href="/forgot-password" className="auth-link">
              Forgot password?
            </Link>
          </div>
          <div className="password-wrap">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="input"
              placeholder="Your password"
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

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading || demoLoading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? "Signing in…" : "Sign in"}
          {!loading ? <ArrowRight size={16} /> : null}
        </button>
      </form>

      {showDemo ? (
        <div className="demo-card">
          <span className="demo-card-icon">
            <Sparkles size={15} />
          </span>
          <div className="demo-card-copy">
            <strong>Explore the demo workspace</strong>
            <span>
              {demoEmail} · {demoPassword}
            </span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={useDemo}
            disabled={loading || demoLoading}
          >
            {demoLoading ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            Open
          </button>
        </div>
      ) : null}

      <div className="auth-bottom">
        New to DEVSPACE?{" "}
        <Link href="/register" className="auth-link">
          Create an account
        </Link>
      </div>
    </>
  );
}
