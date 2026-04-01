import { SitePageRenderer } from "@/components/site/site-page";
import { buildSiteMetadata } from "@/lib/site-metadata";

export const metadata = buildSiteMetadata("");

export default function Page() {
  return <SitePageRenderer slug="" />;
}
