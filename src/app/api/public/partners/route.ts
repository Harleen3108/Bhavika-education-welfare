import { handle, ok } from "@/server/http";
import { getPartners } from "@/server/services/content.service";

export const runtime = "nodejs";
export const revalidate = 300;

export const GET = handle(async () => ok({ partners: await getPartners() }));
