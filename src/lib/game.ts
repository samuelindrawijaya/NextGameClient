export type Game = {
  app_id: number;
  name: string;
  description: string;
  genres: string[];
  categories?: string[];
  publisher: string;
  release_date: string | null;
  steam_url: string;
  poster: string;
  hero: string;
  header: string;
};
