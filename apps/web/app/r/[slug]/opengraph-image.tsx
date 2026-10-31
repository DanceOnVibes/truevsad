import { ImageResponse } from "next/og";
import { formatGBP } from "@truevsad/true-cost";
import { loadPublicReceipt } from "@/lib/quotes";

/**
 * The picture WhatsApp, iMessage and parent groups show when a receipt link is shared:
 * advertised → true price, and the FairMark badge. Nothing personal: no ages, postcode or link.
 */
export const runtime = "nodejs";
export const alt = "TrueVsAd receipt: advertised price, true price and FairMark";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COLOURS: Record<string, { fg: string; bg: string }> = {
  gold: { fg: "#ffffff", bg: "#0a5a3c" },
  fair: { fg: "#ffffff", bg: "#1f8a4c" },
  higher: { fg: "#ffffff", bg: "#9a6400" },
  high: { fg: "#ffffff", bg: "#b42318" },
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await loadPublicReceipt(slug);

  if (!r) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#fafaf7", fontSize: 64, color: "#16181d" }}>
          TrueVsAd
        </div>
      ),
      size,
    );
  }

  const fm = r.fairMark;
  const c = COLOURS[fm.level];
  const where = [r.destination, `${r.nights} night${r.nights === 1 ? "" : "s"}`].filter(Boolean).join(" · ");
  const shown = r.todayTrueCostPence ?? r.trueCostPence;

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#fafaf7", padding: 64, color: "#16181d", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 34, color: "#5d6470" }}>The true price of this holiday</div>
        <div style={{ display: "flex", fontSize: 30, color: "#5d6470", marginTop: 8 }}>{where}</div>
        <div style={{ display: "flex", alignItems: "flex-end", marginTop: 56 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, color: "#5d6470" }}>Advertised</div>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 700 }}>{formatGBP(r.advertisedPence)}</div>
          </div>
          <div style={{ display: "flex", fontSize: 84, margin: "0 40px", color: "#5d6470" }}>→</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, color: "#5d6470" }}>True all-in</div>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 700 }}>{formatGBP(shown)}</div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 48 }}>
          {c ? (
            <div style={{ display: "flex", background: c.bg, color: c.fg, borderRadius: 999, padding: "14px 32px", fontSize: 40, fontWeight: 700 }}>
              {`${fm.label} ${fm.display}`}
            </div>
          ) : (
            <div style={{ display: "flex", fontSize: 34, color: "#5d6470" }}>FairMark unavailable</div>
          )}
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 30, color: "#0b6e4f", fontWeight: 700 }}>truevsad.co.uk</div>
      </div>
    ),
    size,
  );
}
