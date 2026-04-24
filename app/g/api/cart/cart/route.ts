const CART_FALLBACK_HTML =
  "<!DOCTYPE html><html><head><meta charset=\"utf-8\"/><title>Cart</title></head><body></body></html>";

function buildHeaders() {
  return {
    "cache-control": "no-store",
    "content-type": "text/html; charset=utf-8",
  };
}

export async function GET() {
  return new Response(CART_FALLBACK_HTML, {
    headers: buildHeaders(),
    status: 200,
    statusText: "OK",
  });
}

export async function HEAD() {
  return new Response(null, {
    headers: buildHeaders(),
    status: 200,
    statusText: "OK",
  });
}
