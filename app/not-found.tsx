import { SiteFooter } from "../components/site/site-footer";
import { SiteHeader } from "../components/site/site-header";
import { SmartLink } from "../components/site/smart-link";
import { Button } from "../components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="site-frame py-20 sm:py-28">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-border/70 bg-card/95 px-6 py-10 text-center shadow-[0_30px_72px_-48px_rgba(35,57,85,0.42)] sm:px-10 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">
            Page not found
          </p>
          <h1 className="mt-4 text-balance text-5xl sm:text-6xl">
            That route is not available here.
          </h1>
          <p className="mt-4 text-pretty text-base leading-8 text-muted-foreground">
            Head back to the homepage, start the admissions flow, or contact the
            academy if you were looking for a private student route.
          </p>
          <div data-slot="button-group" className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild className="rounded-full px-5" size="lg">
              <SmartLink href="/">Return home</SmartLink>
            </Button>
            <Button asChild className="rounded-full" size="lg" variant="outline">
              <SmartLink href="/registration">Open registration</SmartLink>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
