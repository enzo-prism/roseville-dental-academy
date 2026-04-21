"use client";

import * as React from "react";

import { SmartLink } from "@/components/site/smart-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AuthPageData } from "@/lib/site-types";

type AuthPortalFormProps = {
  page: AuthPageData;
};

export function AuthPortalForm({ page }: AuthPortalFormProps) {
  const [message, setMessage] = React.useState<string | null>(null);
  const hasFields = Boolean(page.fields?.length);

  return (
    <Card
      className="border border-border/70 bg-card/95 shadow-[0_24px_48px_-36px_rgba(32,51,76,0.35)]"
      id="portal-form"
    >
      <CardHeader className="space-y-3">
        <CardTitle className="text-2xl sm:text-3xl">{page.cardTitle}</CardTitle>
        <p className="text-sm leading-7 text-muted-foreground">{page.cardCopy}</p>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-6">
        <form
          className="space-y-4 sm:space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(
              "Portal authentication is not connected in this preview repository yet. Use the live academy portal for account actions or contact the academy if you need help.",
            );
          }}
        >
          {hasFields ? (
            <div className="grid gap-4">
              {page.fields?.map((field) => (
                <div key={field.id} className="space-y-2">
                  <Label htmlFor={field.id}>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      className="min-h-28 rounded-[1.1rem] bg-background px-4 py-3"
                      id={field.id}
                      name={field.label}
                    />
                  ) : (
                    <Input
                      className="h-11 rounded-xl bg-background"
                      id={field.id}
                      name={field.label}
                      type={field.type}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {page.note ? (
            <p className="text-sm leading-6 text-muted-foreground">{page.note}</p>
          ) : null}

          {page.utilityNotice ? (
            <div className="rounded-[1.1rem] border border-border/70 bg-muted/45 px-4 py-4">
              <p className="text-sm font-semibold text-foreground">
                {page.utilityNotice.title}
              </p>
              <div className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                {page.utilityNotice.copy.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>
          ) : null}

          {message ? (
            <div
              aria-live="polite"
              className="rounded-[1.1rem] border border-primary/15 bg-primary/7 px-4 py-3 text-sm leading-6 text-foreground"
            >
              {message}
            </div>
          ) : null}

          <div
            data-slot="button-group"
            className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap"
          >
            {hasFields ? (
              <Button className="w-full rounded-full px-5 sm:w-auto" size="lg" type="submit">
                {page.primaryAction.label}
              </Button>
            ) : (
              <Button
                asChild
                className="w-full rounded-full px-5 sm:w-auto"
                size="lg"
                variant={page.primaryAction.variant}
              >
                <SmartLink href={page.primaryAction.href}>{page.primaryAction.label}</SmartLink>
              </Button>
            )}
            {page.secondaryLinks?.map((action) => (
              <Button
                key={action.analyticsKey}
                asChild
                className="w-full rounded-full sm:w-auto"
                size="lg"
                variant={action.variant}
              >
                <SmartLink href={action.href}>{action.label}</SmartLink>
              </Button>
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
