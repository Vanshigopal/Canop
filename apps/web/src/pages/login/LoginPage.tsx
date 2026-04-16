import { BrandMark } from "@/components/brand/BrandMark";
import { PoweredByRaquel } from "@/components/brand/PoweredByRaquel";
import { AuroraBackground } from "@/components/layout/AuroraBackground";
import { Button, Input } from "@/components/primitives";
import { api } from "@/lib/api";
import { zodResolver } from "@hookform/resolvers/zod";
import { type LoginRequest, LoginRequestSchema } from "@raquel/types";
import axios from "axios";
import { useState } from "react";
import { useForm } from "react-hook-form";
import s from "./login.module.css";

export function LoginPage() {
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({
    resolver: zodResolver(LoginRequestSchema),
    defaultValues: { tenantSlug: "", email: "", password: "" },
  });

  async function onSubmit(data: LoginRequest) {
    setSubmitting(true);
    try {
      const response = await api.post("/api/v1/auth/login", data);
      console.log("[login] success:", response.data);
      // Session 3: store tokens, redirect to dashboard
      alert(
        `Login successful! Welcome, ${response.data.data.user.name}.\n\n(Session 3 will add proper redirect to dashboard)`,
      );
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data) {
        const errorData = err.response.data;
        console.error("[login] error:", errorData);
        alert(errorData.title || errorData.message || "Login failed");
      } else {
        console.error("[login] error:", err);
        alert("Connection error — is the API running?");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AuroraBackground />
      <main className={s.shell}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className={`${s.card} glass-panel animate-fade-up`}
          noValidate
        >
          <BrandMark size={48} />
          <div className={s.eyebrow}>RAQUEL · AI ERP</div>
          <h1 className={s.title}>
            Welcome <span className={s.italic}>back.</span>
          </h1>
          <p className={s.caption}>Sign in to your institute.</p>

          <div className="flex flex-col gap-3.5">
            <Input
              label="Your institute"
              placeholder="demo"
              suffix=".raquel.app"
              autoComplete="organization"
              {...register("tenantSlug")}
              error={errors.tenantSlug?.message}
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@institute.in"
              autoComplete="email"
              {...register("email")}
              error={errors.email?.message}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              {...register("password")}
              error={errors.password?.message}
            />
          </div>

          <div className="h-5" />
          <Button type="submit" fullWidth loading={submitting}>
            Sign in →
          </Button>

          <div className={s.divider}>
            <span>or</span>
          </div>

          <Button type="button" variant="secondary" fullWidth>
            Continue with Google
          </Button>

          <a href="/signup" className={s.demoLink}>
            New institute? Request a demo →
          </a>
        </form>

        <div className={s.footerWrap}>
          <PoweredByRaquel />
        </div>
      </main>
    </>
  );
}
