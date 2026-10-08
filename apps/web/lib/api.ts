export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export interface ExampleDto {
  id: string;
  name: string;
  createdAt: string;
}

export interface Page {
  items: ExampleDto[];
  nextCursor: string | null;
}

export async function fetchExamples(limit: number, signal: AbortSignal): Promise<Page> {
  const res = await fetch(`${API_URL}/examples?limit=${limit}`, { signal });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json() as Promise<Page>;
}
