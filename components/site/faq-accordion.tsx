import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function FaqAccordion({
  items,
}: {
  items: readonly {
    question: string;
    answer: string;
  }[];
}) {
  return (
    <Accordion
      className="rounded-[1.35rem] border border-border/70 bg-card/95 px-4 py-1.5 shadow-[0_24px_48px_-34px_rgba(35,57,85,0.32)] sm:rounded-[1.6rem] sm:px-5 sm:py-2"
      collapsible
      type="single"
    >
      {items.map((item) => (
        <AccordionItem key={item.question} value={item.question}>
          <AccordionTrigger className="pr-1 text-[0.98rem] leading-6 font-medium text-foreground hover:no-underline sm:pr-2 sm:text-base">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pr-2 text-sm leading-6 text-muted-foreground sm:pr-6">
            <p>{item.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
