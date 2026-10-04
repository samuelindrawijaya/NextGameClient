import games from "@/data/games.json";

export type CatalogStats = {
  count: number;
  source: "supabase" | "preview";
  genreCount: number;
};

export async function getCatalogStats(): Promise<CatalogStats> {
  const fallback: CatalogStats = {
    count: games.length,
    source: "preview",
    genreCount: new Set(games.flatMap((game) => game.genres)).size,
  };
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return fallback;
  try {
    const endpoint = new URL("/rest/v1/game_lists?select=app_id", url);
    const response = await fetch(endpoint, {
      method: "HEAD",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "count=exact",
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    });
    const count = response.headers.get("content-range")?.split("/").at(-1);
    if (response.ok && count && /^\d+$/.test(count))
      return { ...fallback, count: Number(count), source: "supabase" };
  } catch {
    /* Render the real preview count when the public catalog is unavailable. */
  }
  return fallback;
}
