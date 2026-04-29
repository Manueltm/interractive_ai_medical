// app/dashboard/components/DashboardCard.tsx
"use client";

import Link from "next/link";

export default function DashboardCard({
  title,
  href,
  description,
}: {
  title: string;
  href: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
    >
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <p className="text-gray-600">{description}</p>
    </Link>
  );
}