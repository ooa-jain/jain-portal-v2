"use client";

import React, { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// --- HELPER COMPONENTS (ICONS) ---

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48" aria-hidden>
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

// --- TYPE DEFINITIONS ---

/**
 * A card shown over the hero. Either a person (avatarSrc + handle) or, as in
 * the portal, a feature with an icon.
 */
export interface Testimonial {
  avatarSrc?: string;
  icon?: React.ReactNode;
  name: string;
  handle: string;
  text: string;
}

export interface SignInPageProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Shown above the title, e.g. the institution logo. */
  logo?: React.ReactNode;
  heroImageSrc?: string;
  /** Optional looping, muted video over the hero image. */
  heroVideoSrc?: string;
  /** Content laid over the hero, top-left (e.g. a light logo). */
  heroOverlay?: React.ReactNode;
  testimonials?: Testimonial[];
  emailPlaceholder?: string;
  /** Error message shown above the submit button. */
  error?: React.ReactNode;
  /** Disables the form and shows a spinner on the submit button. */
  pending?: boolean;
  /** Extra content below the form (e.g. demo sign-in buttons). */
  children?: React.ReactNode;
  /** Replaces the "New to our platform? Create Account" line. */
  footer?: React.ReactNode;
  resetPasswordLabel?: string;
  onSignIn?: (event: React.FormEvent<HTMLFormElement>) => void;
  /** The Google button is shown only when this is set. */
  onGoogleSignIn?: () => void;
  onResetPassword?: () => void;
  onCreateAccount?: () => void;
}

// --- SUB-COMPONENTS ---

const GlassInputWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-1.5 rounded-2xl border border-border bg-foreground/[0.03] backdrop-blur-sm transition-colors focus-within:border-link/70 focus-within:bg-link/[0.06]">
    {children}
  </div>
);

const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial; delay: string }) => (
  <div className={`animate-testimonial ${delay} flex w-64 items-start gap-3 rounded-3xl border border-white/15 bg-white/70 p-5 text-foreground backdrop-blur-xl`}>
    {testimonial.avatarSrc ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={testimonial.avatarSrc} className="h-10 w-10 rounded-2xl object-cover" alt="" />
    ) : (
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">{testimonial.icon}</span>
    )}
    <div className="text-sm leading-snug">
      <p className="flex items-center gap-1 font-semibold">{testimonial.name}</p>
      <p className="text-muted-foreground">{testimonial.handle}</p>
      <p className="mt-1 text-foreground/80">{testimonial.text}</p>
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
  title = <span className="font-light tracking-tighter text-foreground">Welcome</span>,
  description = "Access your account and continue your journey with us",
  logo,
  heroImageSrc,
  heroVideoSrc,
  heroOverlay,
  testimonials = [],
  emailPlaceholder = "Enter your email address",
  error,
  pending = false,
  children,
  footer,
  resetPasswordLabel = "Reset password",
  onSignIn,
  onGoogleSignIn,
  onResetPassword,
  onCreateAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex min-h-[100dvh] w-full flex-col md:h-[100dvh] md:flex-row">
      {/* Left column: sign-in form */}
      <section className="flex flex-1 items-center justify-center overflow-y-auto p-6 sm:p-8">
        <div className="w-full max-w-md">
          <div className="flex flex-col gap-[clamp(14px,2.6vh,24px)]">
            {logo && <div className="animate-element">{logo}</div>}
            <h1 className="animate-element animate-delay-100 text-[clamp(30px,min(9vw,6.2vh),48px)] font-semibold leading-tight">{title}</h1>
            <p className="animate-element animate-delay-200 text-muted-foreground">{description}</p>

            <form className="space-y-[clamp(12px,2.2vh,20px)]" onSubmit={onSignIn} noValidate>
              <div className="animate-element animate-delay-300">
                <label htmlFor="signin-email" className="text-sm font-medium text-muted-foreground">
                  Email Address
                </label>
                <GlassInputWrapper>
                  <input
                    id="signin-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder={emailPlaceholder}
                    className="w-full rounded-2xl bg-transparent px-4 py-[clamp(11px,2vh,16px)] text-[15px] focus:outline-none"
                  />
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-400">
                <label htmlFor="signin-password" className="text-sm font-medium text-muted-foreground">
                  Password
                </label>
                <GlassInputWrapper>
                  <div className="relative">
                    <input
                      id="signin-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required
                      placeholder="Enter your password"
                      className="w-full rounded-2xl bg-transparent px-4 py-[clamp(11px,2vh,16px)] pr-12 text-[15px] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-3 flex items-center"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted-foreground transition-colors hover:text-foreground" />
                      )}
                    </button>
                  </div>
                </GlassInputWrapper>
              </div>

              <div className="animate-element animate-delay-500 flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-3">
                  <input type="checkbox" name="rememberMe" defaultChecked className="custom-checkbox" />
                  <span className="text-foreground/90">Keep me signed in</span>
                </label>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onResetPassword?.();
                  }}
                  className="text-link transition-colors hover:underline"
                >
                  {resetPasswordLabel}
                </a>
              </div>

              {error && (
                <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive-soft px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="animate-element animate-delay-600 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-[clamp(12px,2.1vh,16px)] font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-70"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign In
              </button>
            </form>

            {onGoogleSignIn && (
              <>
                <div className="animate-element animate-delay-700 relative flex items-center justify-center">
                  <span className="w-full border-t border-border"></span>
                  <span className="absolute bg-background px-4 text-sm text-muted-foreground">Or continue with</span>
                </div>
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="animate-element animate-delay-800 flex w-full items-center justify-center gap-3 rounded-2xl border border-border py-4 transition-colors hover:bg-secondary"
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </>
            )}

            {children && <div className="animate-element animate-delay-700">{children}</div>}

            <div className="animate-element animate-delay-900 text-center text-sm text-muted-foreground">
              {footer ?? (
                <>
                  New to our platform?{" "}
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onCreateAccount?.();
                    }}
                    className="text-link transition-colors hover:underline"
                  >
                    Create Account
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Right column: hero image or video + cards */}
      {(heroImageSrc || heroVideoSrc) && (
        <section className="relative hidden flex-1 p-4 md:block">
          <div
            className="animate-slide-right animate-delay-300 absolute inset-4 overflow-hidden rounded-3xl bg-cover bg-center"
            style={heroImageSrc ? { backgroundImage: `url(${heroImageSrc})` } : undefined}
          >
            {heroVideoSrc && (
              <video className="absolute inset-0 h-full w-full object-cover" poster={heroImageSrc} autoPlay muted loop playsInline preload="auto" aria-hidden>
                <source src={heroVideoSrc} type="video/mp4" />
              </video>
            )}
            <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,14,30,.5)_0%,rgba(8,14,30,0)_30%,rgba(8,14,30,0)_55%,rgba(8,14,30,.55)_100%)]" />
            {heroOverlay && <div className="absolute left-7 top-7">{heroOverlay}</div>}
          </div>
          {testimonials.length > 0 && (
            <div className="absolute bottom-8 left-1/2 flex w-full -translate-x-1/2 justify-center gap-4 px-8">
              <TestimonialCard testimonial={testimonials[0]} delay="animate-delay-1000" />
              {testimonials[1] && (
                <div className="hidden xl:flex">
                  <TestimonialCard testimonial={testimonials[1]} delay="animate-delay-1200" />
                </div>
              )}
              {testimonials[2] && (
                <div className="hidden 2xl:flex">
                  <TestimonialCard testimonial={testimonials[2]} delay="animate-delay-1400" />
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
