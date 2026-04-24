export const dynamic = "force-static";

export function GET() {
  return new Response("", {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
