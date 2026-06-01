import { json } from "@sveltejs/kit";
import { a as SOURCE_REGISTRY, S as SOURCE_METADATA, i as isUsableSourceUrl } from "../../../../chunks/registry.js";
async function GET() {
  const health = await Promise.all(
    Object.values(SOURCE_REGISTRY).map(async (source) => ({
      id: source.id,
      health: source.getHealth ? await source.getHealth() : { status: "online" }
    }))
  );
  const healthMap = Object.fromEntries(health.map((entry) => [entry.id, entry.health]));
  return json(
    SOURCE_METADATA.map((source) => {
      const isNative = source.id in SOURCE_REGISTRY;
      const hasGenericParser = isUsableSourceUrl(source.baseUrl);
      return {
        ...source,
        baseUrl: hasGenericParser || isNative ? source.baseUrl : "",
        isImplemented: isNative || hasGenericParser,
        parserKind: isNative ? "native" : hasGenericParser ? "generic" : "catalog",
        health: healthMap[source.id] ?? {
          status: hasGenericParser ? "online" : "limited",
          message: hasGenericParser ? "Generic Kotatsu parser, dicek saat source dibuka" : "Ada di katalog Kotatsu, tapi domain belum terdeteksi"
        }
      };
    }),
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
