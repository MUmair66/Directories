import { pageMeta } from "@/lib/meta";
import { BRAND_NAME } from "@/lib/site";
import { LegalPage } from "@/components/content/legal-page";

export const metadata = pageMeta({
  title: "Terms of Service",
  description: `The terms that govern your use of ${BRAND_NAME}, including accounts, listings, reviews and acceptable use.`,
  path: "/terms",
});

export default function TermsPage() {
  return <LegalPage slug="terms" />;
}
