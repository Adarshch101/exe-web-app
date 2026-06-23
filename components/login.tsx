"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/router";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { getSafeRedirect } from "@/lib/routes";
import { LogIn, Mail, Lock, ArrowLeft } from "lucide-react";

type LoginMode = "login" | "forgot";

const Login = () => {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Logged in successfully!");
      router.push(getSafeRedirect(router.query.redirect));
    }

    setLoading(false);
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success("Password reset link sent! Check your email.");
    }

    setLoading(false);
  }

  function switchToForgot() {
    setMode("forgot");
    setResetSent(false);
  }

  function switchToLogin() {
    setMode("login");
    setResetSent(false);
  }

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/20">
      <Card className="w-full max-w-md shadow-lg border-2">
        {mode === "login" ? (
          <>
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <LogIn className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">Welcome Back</CardTitle>
              <CardDescription className="text-center">
                Enter your credentials to access your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Password
                    </Label>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-xs"
                      onClick={switchToForgot}
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center border-0 bg-transparent pt-0">
              <p className="text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Button variant="link" className="h-auto p-0" asChild>
                  <Link href="/signup">Sign up</Link>
                </Button>
              </p>
            </CardFooter>
          </>
        ) : (
          <>
            <CardHeader className="space-y-4">
              <div className="flex justify-center">
                <div className="p-3 rounded-full bg-primary/10">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl text-center">Reset Password</CardTitle>
              <CardDescription className="text-center">
                {resetSent
                  ? "We sent a password reset link to your email. Click the link to set a new password."
                  : "Enter your email and we'll send you a reset link"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {resetSent ? (
                <div className="space-y-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11"
                    onClick={switchToLogin}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="h-11"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 text-base" disabled={loading}>
                    {loading ? "Sending..." : "Send reset link"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={switchToLogin}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to login
                  </Button>
                </form>
              )}
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default Login;
