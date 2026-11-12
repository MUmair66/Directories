import { inflateRawSync } from "node:zlib";

/**
 * Downloads the US Census Gazetteer "places" file and returns incorporated places
 * and CDPs with coordinates. Source: https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.html
 */
const DEFAULT_URL = "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip";

export type GazPlace = { state: string; name: string; lat: number; lng: number; population: number | null };

export async function loadGazetteer(url = process.env.GAZETTEER_URL || DEFAULT_URL): Promise<GazPlace[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Gazetteer download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = url.endsWith(".zip") ? unzipFirstFile(buf) : buf.toString("utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0]!.split("\t").map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const [iState, iName, iLat, iLng, iPop] = [col("USPS"), col("NAME"), col("INTPTLAT"), col("INTPTLONG"), col("POP")];

  return lines.slice(1).flatMap((line) => {
    const cells = line.split("\t");
    const rawName = cells[iName]?.trim() ?? "";
    const name = cleanPlaceName(rawName);
    const lat = Number(cells[iLat]);
    const lng = Number(cells[iLng]);
    if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{ state: cells[iState]!.trim(), name, lat, lng, population: iPop >= 0 ? Number(cells[iPop]) || null : null }];
  });
}

/** "Springfield city" -> "Springfield", "Honolulu CDP" -> "Honolulu". */
export function cleanPlaceName(raw: string) {
  return raw
    .replace(/\s+(city and borough|consolidated government|unified government|metropolitan government|urban county|city|town|village|borough|CDP|municipality|comunidad|zona urbana)(\s*\(.*\))?$/i, "")
    .replace(/\s*\(balance\)$/i, "")
    .trim();
}

/** Minimal ZIP reader for a single deflated entry (enough for the Gazetteer archive). */
function unzipFirstFile(zip: Buffer): string {
  if (zip.readUInt32LE(0) !== 0x04034b50) throw new Error("Not a zip file");
  const method = zip.readUInt16LE(8);
  let compressedSize = zip.readUInt32LE(18);
  const nameLen = zip.readUInt16LE(26);
  const extraLen = zip.readUInt16LE(28);
  const start = 30 + nameLen + extraLen;
  if (compressedSize === 0) {
    // Sizes stored in the central directory (data descriptor flag)
    const cd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    compressedSize = zip.readUInt32LE(cd + 20);
  }
  const data = zip.subarray(start, start + compressedSize);
  return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
}
