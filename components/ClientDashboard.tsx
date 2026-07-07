"use client";

import dynamic from "next/dynamic";

const SecurityDashboard = dynamic(
  () => import("./SecurityDashboard").then((m) => m.SecurityDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    ),
  }
);

export default function ClientDashboard() {
  return <SecurityDashboard />;
}
