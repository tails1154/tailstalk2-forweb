import type { API } from "stoat-api";

/**
 * Send JSON to a TailsTalk extension endpoint while retaining the session
 * authentication configured on the Stoat API client.
 *
 * These endpoints are intentionally not part of the generated Stoat schema,
 * so the generated serializer cannot safely encode their request bodies.
 */
export async function requestClientJson<T>(
  api: API,
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  extraHeaders?: HeadersInit,
): Promise<T> {
  const config = api.config;
  const response = await fetch(`${config.baseURL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(config.headers ?? {}),
      ...(extraHeaders ?? {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error = new Error(
      typeof data === "string"
        ? data
        : `Request failed with status ${response.status}`,
    ) as Error & { status: number; data: unknown };
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data as T;
}
