"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PinGate from "@/components/pin-gate";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem("grokessmap_auth");
    if (auth === "true") {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return <PinGate onSuccess={() => router.replace("/dashboard")} />;
}