import Landing from "@/components/library-landing";
import games from "@/data/games.json";
import { getCatalogStats } from "@/lib/catalog-stats";

export default async function Page() {
  return <Landing games={games} stats={await getCatalogStats()} />;
}
