import { getRatings } from "@/lib/ratings.mjs";

export const dynamic = "force-dynamic";
export async function GET() {
    return Response.json(await getRatings(), { headers: { "Cache-Control": "no-store" } });
}
