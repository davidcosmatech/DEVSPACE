import { redirect } from "next/navigation";

import { getViewer } from "@/lib/auth";

export default async function HomePage() {
  const viewer = await getViewer();
  redirect(viewer ? "/dashboard" : "/login");
}
