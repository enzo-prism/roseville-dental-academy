const MARKUP_AD_PLACEHOLDER =
  "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>Ad</title></head><body></body></html>";

export async function GET() {
  return new Response(MARKUP_AD_PLACEHOLDER, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
    status: 200,
    statusText: "OK",
  });
}
