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
  method: "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
): Promise<T> {
  const config = api.config;
  const response = await fetch(`${config.baseURL}${path}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(config.headers ?? {}),
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
    throw data ?? new Error(`Request failed with status ${response.status}`);
  }

  return data as T;
}
