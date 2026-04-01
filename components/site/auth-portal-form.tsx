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

  const primaryAction = page.actions[0];
  const secondaryActions = page.actions.slice(1);

  return (
    <Card
      className="border border-border/70 bg-card/95 shadow-[0_24px_48px_-36px_rgba(32,51,76,0.35)]"
      id="portal-form"
    >
      <CardHeader className="space-y-3">
        <CardTitle className="text-3xl">{page.cardTitle}</CardTitle>
        <p className="text-sm leading-7 text-muted-foreground">{page.cardCopy}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            setMessage(
              "The redesigned shell preserves these academy portal routes, but account authentication is not wired into this repository yet. Use the live portal for account actions or contact the academy for support.",
            );
          }}
        >
          <div className="grid gap-4">
            {page.fields.map((field) => (
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

          <p className="text-sm leading-6 text-muted-foreground">{page.note}</p>

          {message ? (
            <div
              aria-live="polite"
              className="rounded-[1.1rem] border border-primary/15 bg-primary/7 px-4 py-3 text-sm leading-6 text-foreground"
            >
              {message}
            </div>
          ) : null}

          <div data-slot="button-group" className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button className="rounded-full px-5" size="lg" type="submit">
              {primaryAction?.label ?? "Continue"}
            </Button>
            {secondaryActions.map((action) => (
              <Button
                key={action.analyticsKey}
                asChild
                className="rounded-full"
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
