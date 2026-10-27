import Link from "next/link";
import { Languages, MapPin, Phone } from "lucide-react";

import { LiveSignupSection } from "@/components/site/live-signup-section";
import {
  SeoBody,
  SeoCallout,
  SeoCheckList,
  SeoFactGrid,
  SeoFaqList,
  SeoHero,
  SeoPageMain,
  SeoSection,
} from "@/components/site/seo-landing-parts";
import { WhatsAppIcon } from "@/components/site/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { daProgramFacts, getOpenDaStartEntries, PHONE_HREF } from "@/lib/da-program-facts";
import {
  SPANISH_DA_ENGLISH_PATH,
  SPANISH_DA_PATH,
  spanishDaFaqs,
  spanishDaRoute,
} from "@/lib/seo-landing-pages";
import { siteContact, whatsAppUrl } from "@/lib/site-data";

// Spanish (neutral Latin American) version of the core Dental Assisting Program
// facts. Honesty rules: do not say staff speak Spanish or that classes are taught
// in Spanish — that is unconfirmed. The lead form below is the shared English
// form (reused as-is), introduced in Spanish.

export const spanishBreadcrumbs = [
  { name: "Inicio", path: "/" },
  { name: "Programa de Asistente Dental", path: SPANISH_DA_PATH },
];

const spanishDateFormat = new Intl.DateTimeFormat("es-US", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function formatSpanishDate(isoDate: string) {
  return spanishDateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

function getSpanishStartDates(): string[] {
  return getOpenDaStartEntries().map(({ isoDate, isSaturdayAcademy }) =>
    isSaturdayAcademy
      ? `${formatSpanishDate(isoDate)} (grupo de los sábados)`
      : formatSpanishDate(isoDate),
  );
}

export function SpanishProgramPage() {
  const startDates = getSpanishStartDates();
  const nextStart = startDates[0] ?? "Consulte con admisiones";

  return (
    <SeoPageMain lang="es" routeId="es-programa-de-asistente-dental">
      <SeoHero
        breadcrumbLabel="Ruta de navegación"
        breadcrumbs={spanishBreadcrumbs}
        eyebrow="Capacitación en asistencia dental en Roseville, California"
        intro={
          <p>
            Un programa práctico de {daProgramFacts.weeks} semanas y {daProgramFacts.hours} horas que
            prepara a los estudiantes para un puesto de nivel inicial en un consultorio dental. Usted
            asiste a clase un día por semana, más un día de pasantía asignado.
          </p>
        }
        title="Programa de Asistente Dental"
      >
        <Button asChild variant="secondary">
          <a data-rda-lead-source="phone" href={PHONE_HREF}>
            <Phone aria-hidden="true" className="size-4" />
            Llame al {siteContact.phone}
          </a>
        </Button>
        <Button asChild data-rda-lead-source="whatsapp" data-rda-whatsapp="true" variant="whatsapp">
          <a href={whatsAppUrl} rel="noreferrer" target="_blank">
            <WhatsAppIcon />
            <span>Escríbanos por WhatsApp</span>
          </a>
        </Button>
      </SeoHero>

      <SeoBody>
        <SeoCallout className="flex items-start gap-3">
          <Languages aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
          <p className="text-base leading-7 text-foreground">
            Esta página resume el programa en español. Confirme con admisiones los detalles del idioma
            de las clases.{" "}
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href={SPANISH_DA_ENGLISH_PATH}
              hrefLang="en"
              lang="en"
            >
              View this program in English
            </Link>
            .
          </p>
        </SeoCallout>

        <SeoSection
          heading="¿Qué es el programa?"
          id="es-que-es"
          intro={
            <>
              <p>
                Es una capacitación de nivel inicial en asistencia dental que combina clases en línea,
                tareas, experiencia práctica junto al sillón dental y horas de pasantía asignadas.
              </p>
              <p>
                Al terminar, habrá completado una pasantía de {daProgramFacts.internshipHours} horas
                dentro de un consultorio dental en funcionamiento y recibirá apoyo con su currículum y
                la búsqueda de empleo.
              </p>
            </>
          }
        />

        <SeoSection
          heading="¿Para quién es?"
          id="es-para-quien"
          intro={
            <p>
              Para estudiantes nuevos que buscan empezar una carrera como asistente dental. No se
              requieren estudios ni experiencia previa: solo debe tener {daProgramFacts.minimumAge} años
              o más.
            </p>
          }
        />

        <SeoSection heading="Datos del programa" id="es-datos">
          <SeoFactGrid
            facts={[
              {
                label: "Duración",
                value: `${daProgramFacts.weeks} semanas · ${daProgramFacts.hours} horas`,
                detail: `Incluye una pasantía de ${daProgramFacts.internshipHours} horas.`,
              },
              {
                label: "Horario",
                value: "1 día de clase + 1 día de pasantía",
                detail:
                  "Un día de clase por semana (lunes, viernes o sábado; usted elige uno) más un día de pasantía asignado.",
              },
              {
                label: "Costo",
                value: daProgramFacts.tuitionLabel,
                detail:
                  "Pago inicial mínimo de $1,000; el saldo se paga semanalmente durante las nueve semanas.",
              },
              {
                label: "Próximo inicio disponible",
                value: nextStart,
                detail:
                  "Las fechas son tentativas y pueden cambiar; admisiones confirmará la disponibilidad.",
              },
              {
                label: "Requisitos",
                value: `${daProgramFacts.minimumAge} años o más`,
                detail: "No hay requisitos previos.",
              },
              {
                label: "Reembolsos",
                value: "No reembolsable",
                detail: "Ningún curso de Roseville Dental Academy es reembolsable.",
              },
            ]}
            label="Datos del Programa de Asistente Dental"
          />
        </SeoSection>

        <SeoSection heading="Lo que incluye" id="es-incluye">
          <SeoCheckList
            items={[
              "Clases en línea y tareas.",
              "Práctica junto al sillón dental con el apoyo de instructores.",
              `Pasantía de ${daProgramFacts.internshipHours} horas dentro de un consultorio dental en funcionamiento.`,
              "Apoyo con su currículum y la búsqueda de empleo.",
            ]}
          />
        </SeoSection>

        {startDates.length > 0 ? (
          <SeoSection heading="Próximas fechas de inicio" id="es-fechas">
            <ul className="flex flex-wrap gap-2">
              {startDates.map((date) => (
                <li
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground"
                  key={date}
                >
                  {date}
                </li>
              ))}
            </ul>
          </SeoSection>
        ) : null}

        <SeoSection
          heading="Cómo dar el siguiente paso"
          id="es-siguiente-paso"
          intro={
            <p>
              Llame a admisiones al {siteContact.phone} o escríbanos por WhatsApp para confirmar la
              próxima fecha de inicio, el horario que prefiere y los pasos para inscribirse.
            </p>
          }
        >
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <a data-rda-lead-source="phone" href={PHONE_HREF}>
                <Phone aria-hidden="true" className="size-4" />
                Llame al {siteContact.phone}
              </a>
            </Button>
            <Button asChild data-rda-lead-source="whatsapp" data-rda-whatsapp="true" variant="whatsapp">
              <a href={whatsAppUrl} rel="noreferrer" target="_blank">
                <WhatsAppIcon />
                <span>Escríbanos por WhatsApp</span>
              </a>
            </Button>
          </div>
          <p className="flex items-start gap-3 text-base leading-7 text-muted-foreground">
            <MapPin aria-hidden="true" className="mt-1 size-5 shrink-0 text-primary" />
            <span>
              {siteContact.school} · {siteContact.address}
            </span>
          </p>
        </SeoSection>

        <SeoFaqList faqs={spanishDaFaqs} heading="Preguntas frecuentes" id="es-faq" />

        <SeoSection
          heading="Solicite información"
          id="es-formulario"
          intro={
            <p>
              También puede enviar el formulario de abajo (está en inglés). Seleccione «Dental
              Assisting Program» y, si lo desea, indique su idioma preferido en el campo de notas.
            </p>
          }
        />
      </SeoBody>

      <div lang="en">
        <LiveSignupSection compact pagePath={SPANISH_DA_PATH} sourceLabel={spanishDaRoute.title} />
      </div>
    </SeoPageMain>
  );
}
