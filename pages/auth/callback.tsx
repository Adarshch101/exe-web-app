import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (!router.isReady || hasProcessed.current) return;

    hasProcessed.current = true;

    const handleCallback = async () => {
      const providerError = router.query.error_description;

      // OAuth provider/Supabase error
      if (typeof providerError === "string") {
        console.error("OAuth callback error:", providerError);
        await router.replace("/login");
        return;
      }

      const code = router.query.code;

      // Exchange OAuth code for a Supabase session (PKCE flow)
      if (typeof code === "string") {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error("Failed to exchange code:", error.message);
          await router.replace("/login");
          return;
        }
      }

      // Confirm the session exists
      const { data, error } = await supabase.auth.getSession();

      if (!error && data.session) {
        await router.replace("/todos");
      } else {
        await router.replace("/login");
      }
    };

    handleCallback();
  }, [router.isReady, router.query.code, router.query.error_description, router]);

  return <p>Completing login...</p>;
}
