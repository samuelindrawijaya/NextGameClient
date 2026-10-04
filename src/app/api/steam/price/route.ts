import { NextRequest, NextResponse } from "next/server";
import games from "@/data/games.json";

export async function GET(request: NextRequest) {
  const appId = Number(request.nextUrl.searchParams.get("appId"));
  if (!games.some((game) => game.app_id === appId)) {
    return NextResponse.json(
      { price: null, error: "Unknown catalog item" },
      { status: 400 },
    );
  }
  try {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&cc=id&l=english&filters=price_overview`,
      {
        next: { revalidate: 3600 },
        signal: AbortSignal.timeout(10000),
      },
    );
    if (!response.ok) throw new Error("Steam price unavailable");
    const data = await response.json();
    const price = data[String(appId)]?.success
      ? data[String(appId)]?.data?.price_overview
      : null;
    if (
      !price ||
      price.currency !== "IDR" ||
      typeof price.final !== "number" ||
      typeof price.initial !== "number"
    ) {
      return NextResponse.json({ price: null, source: "Steam", region: "ID" });
    }
    return NextResponse.json({
      price: {
        initial: price.initial / 100,
        final: price.final / 100,
        discount: price.discount_percent,
        currency: "IDR",
      },
      source: "Steam",
      region: "ID",
      cacheSeconds: 3600,
    });
  } catch {
    return NextResponse.json({ price: null, source: "Steam", region: "ID" });
  }
}
