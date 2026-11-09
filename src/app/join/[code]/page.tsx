import { redirect } from "next/navigation";

// Short link an institute shares in WhatsApp groups: astra.app/join/K7M2QX9P → sign-up with the code filled in
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  redirect(`/login?mode=signup&code=${encodeURIComponent(code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16))}`);
}
