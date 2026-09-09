export const b2bCorsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function b2bOptions() {
  return new Response(null, { status: 204, headers: b2bCorsHeaders });
}

export function b2bJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: b2bCorsHeaders });
}

export function b2bError(error: string, status: number) {
  return b2bJson({ error }, status);
}
