import type { Metadata } from "next";
import { loadAuthorities } from "@/lib/school";
import { FairFamClient } from "./FairFamClient";

export const runtime = "nodejs";
export const preferredRegion = "lhr1";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "FairFam — your school dates, your family, one honest price — TrueVsAd",
  description:
    "Find the holiday weeks your whole family can travel, from your council's or your own school's dates, then check any deal's true price for your family.",
};

export default async function FairFamPage() {
  const authorities = await loadAuthorities();
  return <FairFamClient councils={authorities.map((a) => a.authority)} />;
}
