import { pageMeta } from "@/lib/meta";
import { BRAND_NAME } from "@/lib/site";
import { LegalPage } from "@/components/content/legal-page";

export const metadata = pageMeta({
  title: "Privacy Policy",
  description: `How ${BRAND_NAME} collects, uses and protects your personal information, and the choices you have.`,
  path: "/privacy",
});

export default function PrivacyPage() {
  return <LegalPage slug="privacy" />;
}
