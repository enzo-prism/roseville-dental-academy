const CHECKOUT_FALLBACK_JSON = JSON.stringify({
  cart: null,
  items: [],
  totals: null,
});

function buildHeaders() {
  return {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  };
}

export async function GET() {
  return new Response(CHECKOUT_FALLBACK_JSON, {
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
