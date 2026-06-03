"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  Medal,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";

import {
  journeyOfficialLinks,
  journeyPathways,
  journeySteps,
  type JourneyIconKey,
  type JourneyPathway,
  type JourneyPathwayId,
  type JourneyStep,
  type JourneyStepId,
} from "@/lib/journey-roadmap-data";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const iconMap = {
  book: BookOpenCheck,
  briefcase: BriefcaseBusiness,
  clipboard: ClipboardCheck,
  file: FileCheck2,
  medal: Medal,
  sparkles: Sparkles,
} satisfies Record<JourneyIconKey, LucideIcon>;

function JourneyAction({
  children,
  className,
  href,
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  href: string;
  variant?: "default" | "outline" | "secondary";
}) {
  const content = (
    <>
      <span className="min-w-0">{children}</span>
      {href.startsWith("http") ? (
        <ExternalLink aria-hidden="true" className="size-4" />
      ) : (
        <ArrowRight aria-hidden="true" className="size-4" />
      )}
    </>
  );

  return (
    <Button
      asChild
      className={cn(
        "h-auto min-h-11 max-w-full gap-2 whitespace-normal px-4 py-2 text-center leading-snug",
        className,
      )}
      size="lg"
      variant={variant}
    >
      {href.startsWith("http") ? (
        <a href={href} rel="noreferrer" target="_blank">
          {content}
        </a>
      ) : (
        <Link href={href}>{content}</Link>
      )}
    </Button>
  );
}

function PathwayButton({
  isSelected,
  onSelect,
  pathway,
}: {
  isSelected: boolean;
  onSelect: (pathway: JourneyPathway) => void;
  pathway: JourneyPathway;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "flex min-h-36 flex-col rounded-lg border p-4 text-left transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        isSelected
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent/25",
      )}
      onClick={() => onSelect(pathway)}
      type="button"
    >
      <span className="block text-sm font-semibold leading-5">{pathway.label}</span>
      <span
        className={cn(
          "mt-2 block text-sm leading-6",
          isSelected ? "text-primary-foreground/90" : "text-muted-foreground",
        )}
      >
        {pathway.detail}
      </span>
    </button>
  );
}

function StepBulletList({ bullets }: { bullets: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-foreground">
      {bullets.map((bullet) => (
        <li className="flex gap-2.5" key={bullet}>
          <CheckCircle2
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
          <span className="min-w-0 break-words">{bullet}</span>
        </li>
      ))}
    </ul>
  );
}

function RoadmapStepButton({
  isActive,
  onSelect,
  step,
}: {
  isActive: boolean;
  onSelect: (stepId: JourneyStepId) => void;
  step: JourneyStep;
}) {
  const Icon = iconMap[step.icon];

  return (
    <li className="flex">
      <button
        aria-current={isActive ? "step" : undefined}
        className={cn(
          "rda-journey-step-card group flex min-h-[16rem] w-full flex-col overflow-hidden rounded-lg border bg-card p-4 text-left shadow-sm transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5",
          isActive
            ? "border-primary bg-primary/5 shadow-md ring-2 ring-primary/20"
            : "border-border hover:border-primary/45 hover:bg-accent/20",
        )}
        data-rda-journey-step={step.id}
        onClick={() => onSelect(step.id)}
        type="button"
      >
        <span className="flex items-start justify-between gap-4">
          <span className="flex min-w-0 items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
              {step.number}
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold uppercase text-primary">
                {step.eyebrow}
              </span>
              <span className="mt-1 block break-words font-heading text-xl font-semibold leading-tight text-foreground">
                {step.title}
              </span>
            </span>
          </span>
          <Icon
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground",
            )}
          />
        </span>
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{step.detail}</p>
        <div className="mt-4">
          <StepBulletList bullets={step.bullets} />
        </div>
      </button>
    </li>
  );
}

function JourneyRoadmap({
  activeStepId,
  onSelectStep,
}: {
  activeStepId: JourneyStepId;
  onSelectStep: (stepId: JourneyStepId) => void;
}) {
  return (
    <div className="relative">
      <svg
        aria-hidden="true"
        className="rda-journey-road-svg pointer-events-none absolute inset-x-8 top-28 hidden h-80 text-primary/30 lg:block"
        preserveAspectRatio="none"
        viewBox="0 0 1000 320"
      >
        <path
          className="rda-journey-road-line"
          d="M 55 62 H 500 H 945 C 985 62 985 258 945 258 H 500 H 55"
          fill="none"
          pathLength="1"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="6"
        />
      </svg>

      <ol className="rda-journey-roadmap-list relative z-10 hidden grid-cols-3 gap-x-8 gap-y-6 lg:grid">
        {journeySteps.map((step) => (
          <RoadmapStepButton
            isActive={activeStepId === step.id}
            key={step.id}
            onSelect={onSelectStep}
            step={step}
          />
        ))}
      </ol>

      <Accordion
        className="gap-3 lg:hidden"
        onValueChange={(value) => {
          if (value) {
            onSelectStep(value as JourneyStepId);
          }
        }}
        type="single"
        value={activeStepId}
      >
        {journeySteps.map((step) => {
          const Icon = iconMap[step.icon];

          return (
            <AccordionItem
              className={cn(
                "rounded-lg border border-border bg-card px-3 shadow-sm",
                activeStepId === step.id && "border-primary/40 ring-2 ring-primary/15",
              )}
              key={step.id}
              value={step.id}
            >
              <AccordionTrigger className="gap-3 py-4 hover:no-underline">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {step.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold uppercase text-primary">
                    {step.eyebrow}
                  </span>
                  <span className="block font-heading text-lg font-semibold leading-tight text-foreground">
                    {step.title}
                  </span>
                </span>
                <Icon aria-hidden="true" className="hidden size-5 shrink-0 text-primary sm:block" />
              </AccordionTrigger>
              <AccordionContent className="pb-5">
                <p className="text-sm leading-6 text-muted-foreground">{step.detail}</p>
                <div className="mt-3">
                  <StepBulletList bullets={step.bullets} />
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

export function JourneyPage() {
  const [pathwayId, setPathwayId] = useState<JourneyPathwayId>("new");
  const [activeStepId, setActiveStepId] = useState<JourneyStepId>("start-training");

  const activePathway = useMemo(
    () => journeyPathways.find((pathway) => pathway.id === pathwayId) ?? journeyPathways[0],
    [pathwayId],
  );
  const activeStep = useMemo(
    () => journeySteps.find((step) => step.id === activeStepId) ?? journeySteps[0],
    [activeStepId],
  );

  const ActiveIcon = iconMap[activeStep.icon];

  return (
    <main
      className="overflow-x-clip bg-background"
      data-rda-journey-page="true"
      data-rda-route="journey"
    >
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        <Image
          alt="Roseville Dental Academy students gathered in scrubs after hands-on training."
          className="absolute inset-0 -z-20 size-full object-cover opacity-35"
          fill
          priority
          sizes="100vw"
          src="/assets/live/drive/class-group-scrubs.jpg"
        />
        <div className="absolute inset-0 -z-10 bg-primary/75" />
        <div className="mx-auto grid min-h-[31rem] max-w-6xl content-center gap-8 px-4 py-16 sm:min-h-[34rem] sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl space-y-5">
            <Badge
              className="h-auto max-w-full whitespace-normal bg-primary-foreground px-3 py-1 text-left leading-5 text-primary"
              variant="secondary"
            >
              Train / Work / Certify / Apply
            </Badge>
            <h1 className="max-w-3xl font-heading text-4xl font-semibold leading-tight sm:text-5xl">
              DA to RDA Career Journey
            </h1>
            <p className="max-w-2xl text-base leading-7 text-primary-foreground/90 sm:text-lg">
              See the big picture before you choose your first step. This guided roadmap shows
              how training, work experience, course certificates, application steps, and the exam
              can fit together for California dental assistants.
            </p>
            <div className="flex flex-wrap gap-3">
              <JourneyAction
                className="max-sm:w-full"
                href="/dental-assisting-program"
                variant="secondary"
              >
                Start with the 9-week program
              </JourneyAction>
              <JourneyAction className="max-sm:w-full" href="#journey-start" variant="outline">
                Find my starting point
              </JourneyAction>
            </div>
          </div>
        </div>
      </section>

      <section
        aria-labelledby="journey-start"
        className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:px-8 xl:grid-cols-[minmax(0,0.64fr)_minmax(20rem,0.36fr)]"
      >
        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-primary">Choose your starting point</p>
            <h2
              className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl"
              id="journey-start"
            >
              Where are you now?
            </h2>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground">
              Select the option closest to your situation. The roadmap will highlight the most
              useful next step without hiding the full path.
            </p>
          </div>
          <div
            aria-label="Choose your current career starting point"
            className="grid gap-3 md:grid-cols-3"
            role="group"
          >
            {journeyPathways.map((pathway) => (
              <PathwayButton
                isSelected={pathway.id === pathwayId}
                key={pathway.id}
                onSelect={(selectedPathway) => {
                  setPathwayId(selectedPathway.id);
                  setActiveStepId(selectedPathway.focusStep);
                }}
                pathway={pathway}
              />
            ))}
          </div>
        </div>

        <Card
          className="border-primary/30 bg-card"
          data-rda-journey-next-action="true"
          size="default"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ActiveIcon aria-hidden="true" className="size-5 text-primary" />
              Best next step
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {activePathway.nextAction}
            </p>
            <div className="rounded-lg border border-border bg-muted/45 p-4">
              <p className="text-sm font-semibold text-foreground">
                Focus: {activeStep.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {activeStep.support}
              </p>
            </div>
            <JourneyAction className="w-full sm:w-auto sm:min-w-64" href={activeStep.ctaHref}>
              {activeStep.ctaLabel}
            </JourneyAction>
          </CardContent>
        </Card>
      </section>

      <section
        aria-labelledby="journey-roadmap"
        className="border-y border-border bg-muted/45"
      >
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-sm font-semibold text-primary">Animated roadmap</p>
              <h2
                className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl"
                id="journey-roadmap"
              >
                The practical DA to RDA path
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                Click any step to see what it means and where Roseville Dental Academy can help.
              </p>
            </div>
            <Badge
              className="h-auto max-w-full whitespace-normal py-1.5 text-sm leading-5"
              variant="outline"
            >
              Source checked June 3, 2026
            </Badge>
          </div>

          <JourneyRoadmap activeStepId={activeStepId} onSelectStep={setActiveStepId} />

          <Card
            className="border-primary/25 bg-card lg:mr-24"
            data-rda-journey-active-step="true"
          >
            <CardHeader>
              <CardTitle className="flex items-start gap-3 text-xl">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {activeStep.number}
                </span>
                <span className="min-w-0 break-words">{activeStep.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {activeStep.detail}
                </p>
                <StepBulletList bullets={activeStep.bullets} />
              </div>
              <JourneyAction
                className="w-full sm:w-auto sm:min-w-64"
                href={activeStep.ctaHref}
                variant="secondary"
              >
                {activeStep.ctaLabel}
              </JourneyAction>
            </CardContent>
          </Card>
        </div>
      </section>

      <section
        aria-labelledby="journey-sources"
        className="mx-auto max-w-6xl space-y-8 px-4 py-12 sm:px-6 sm:py-14 lg:px-8"
      >
        <div className="max-w-3xl space-y-3">
          <p className="text-sm font-semibold text-primary">Official requirements</p>
          <h2
            className="font-heading text-3xl font-semibold leading-tight text-foreground sm:text-4xl"
            id="journey-sources"
          >
            Verify your current eligibility
          </h2>
          <p className="text-base leading-7 text-muted-foreground">
            This page is a plain-language overview, not a guarantee of licensure. California
            requirements, forms, fees, and course timing can change, so confirm your pathway with
            the Dental Board of California before applying.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journeyOfficialLinks.map((link) => (
            <Card className="border-border bg-card" key={link.href}>
              <CardHeader>
                <CardTitle className="break-words text-lg">{link.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-6 text-muted-foreground">
                  {link.description}
                </p>
                <Button
                  asChild
                  className="h-auto min-h-10 w-full whitespace-normal px-3 py-2 text-center leading-snug"
                  variant="outline"
                >
                  <a
                    aria-label={`Open official source: ${link.label}`}
                    href={link.href}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <span>Open official source</span>
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="rounded-lg border border-primary/25 bg-accent/20 p-5">
          <p className="text-sm leading-6 text-accent-foreground">
            Start with 9-week training, then complete the required experience, course
            certificates, application, background check, and exam steps for your pathway.
          </p>
        </div>
      </section>
    </main>
  );
}
