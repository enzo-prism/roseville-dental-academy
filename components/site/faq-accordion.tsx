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
    <Accordion className="rounded-[1.6rem] border border-border/70 bg-card/95 px-5 py-2 shadow-[0_24px_48px_-34px_rgba(35,57,85,0.32)]" collapsible type="single">
      {items.map((item) => (
        <AccordionItem key={item.question} value={item.question}>
          <AccordionTrigger className="text-base leading-6 font-medium text-foreground hover:no-underline">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="pr-6 text-sm leading-6 text-muted-foreground">
            <p>{item.answer}</p>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
