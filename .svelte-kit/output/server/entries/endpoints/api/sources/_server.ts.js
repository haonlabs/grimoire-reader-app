import { json } from "@sveltejs/kit";
import { S as SOURCE_REGISTRY } from "../../../../chunks/registry.js";
const SOURCE_METADATA = [
  {
    id: "mangadex",
    name: "MangaDex",
    description: "Community manga catalog using the official MangaDex REST API.",
    language: "multi",
    baseUrl: "https://mangadex.org",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Official API",
    icon: "MD"
  },
  {
    id: "mangafire",
    name: "MangaFire",
    description: "English manga source using the MangaFire HTML catalog and AJAX reader endpoints.",
    language: "en",
    baseUrl: "https://mangafire.to",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Scraping + API",
    icon: "MF"
  },
  {
    id: "mangaplus",
    name: "MangaPlus",
    description: "Official Shueisha catalog using the same MANGA Plus web API shape as Kotatsu.",
    language: "en/ja",
    baseUrl: "https://mangaplus.shueisha.co.jp",
    contentRating: "safe",
    isNsfw: false,
    method: "Unofficial API",
    icon: "M+"
  },
  {
    id: "batoto",
    name: "Bato.to",
    description: "Large multilingual community source using Bato browse/detail selectors.",
    language: "multi",
    baseUrl: "https://wto.to",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Scraping",
    icon: "BT"
  },
  {
    id: "komiku",
    name: "Komiku",
    description: "Indonesian source using the current Komiku API HTML partials and reader pages.",
    language: "id",
    baseUrl: "https://komiku.org",
    contentRating: "safe",
    isNsfw: false,
    method: "Scraping",
    icon: "KO"
  },
  {
    id: "shinigami",
    name: "Shinigami ID",
    description: "Indonesian manga, manhwa, and manhua source using the Shinigami API.",
    language: "id",
    baseUrl: "https://shinigami.cv",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Unofficial API",
    icon: "SH"
  },
  {
    id: "komikcast",
    name: "Komikcast",
    description: "Indonesian komik source using the current Komikcast backend API.",
    language: "id",
    baseUrl: "https://v2.komikcast.fit",
    contentRating: "suggestive",
    isNsfw: false,
    method: "Unofficial API",
    icon: "KC"
  }
];
async function GET() {
  const health = await Promise.all(
    Object.values(SOURCE_REGISTRY).map(async (source) => ({
      id: source.id,
      health: source.getHealth ? await source.getHealth() : { status: "online" }
    }))
  );
  const healthMap = Object.fromEntries(health.map((entry) => [entry.id, entry.health]));
  return json(
    SOURCE_METADATA.map((source) => ({
      ...source,
      health: healthMap[source.id] ?? { status: "offline" }
    })),
    {
      headers: {
        "cache-control": "public, max-age=300"
      }
    }
  );
}
export {
  GET
};
