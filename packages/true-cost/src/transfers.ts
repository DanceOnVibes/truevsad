import { mentions } from "./scope";

/**
 * Getting from the resort airport to your stay, by public bus or metered taxi, when the deal
 * doesn't include transfers.
 *
 * Shown as "Good to know" on the receipt. Never added to the true price: fares depend on where
 * exactly you stay and how you choose to travel. Only routes with an official published fare are
 * listed (operator, transport authority or government taxi guide), each with the date we checked.
 */
export interface TransferOption {
  mode: "bus" | "taxi";
  /** The fare as published, one way. */
  fare: string;
  sourceUrl: string;
}

export interface ResortTransfer {
  /** Resort names as they appear in adverts. */
  places: string[];
  airport: string;
  options: TransferOption[];
  checkedOn: string;
}

const CYPRUS_TAXI_GUIDE =
  "https://www.visitcyprus.com/files/PracticalInfo/transportation/guide_taxi_service_cyprus_6120115_EN.pdf";

export const RESORT_TRANSFERS: ResortTransfer[] = [
  {
    places: ["Paphos", "Pafos", "Kato Paphos"],
    airport: "Paphos airport",
    options: [
      {
        mode: "bus",
        fare: "Pafos Buses route 612: €2 one way (€3 after 9pm), luggage included; children up to 5 free, up to 12 half price",
        sourceUrl: "https://pafosbuses.com/tickets",
      },
      {
        mode: "taxi",
        fare: "about €14 by day, €17 at night to the town centre (Cyprus government taxi guide; the meter decides), plus €1.20 luggage",
        sourceUrl: CYPRUS_TAXI_GUIDE,
      },
    ],
    checkedOn: "2026-11-01",
  },
  {
    places: ["Ayia Napa", "Agia Napa"],
    airport: "Larnaca airport",
    options: [
      {
        mode: "taxi",
        fare: "about €44 by day, €52 at night to the centre (Cyprus government taxi guide; the meter decides), plus €1.20 luggage",
        sourceUrl: CYPRUS_TAXI_GUIDE,
      },
    ],
    checkedOn: "2026-11-01",
  },
  {
    places: ["Marmaris"],
    airport: "Dalaman airport",
    options: [
      {
        mode: "bus",
        fare: "Muttaş airport bus to Marmaris bus station: ₺420 one way (from 18 May 2026)",
        sourceUrl: "https://ulasim.muttas.com.tr/storage/uploads/tarifeler/1779012021_Marmaris-Dalaman.pdf",
      },
    ],
    checkedOn: "2026-11-01",
  },
  {
    places: ["Kavos"],
    airport: "Corfu airport",
    options: [
      {
        mode: "bus",
        fare: "Blue Bus 15 to Corfu town (€1.10, €1.70 bought on board), then Green Bus B1 to Kavos (€5.30)",
        sourceUrl: "https://ktelkerkyras.gr/wp-content/uploads/2026/07/TimeTable-18-07-2026-EN.pdf",
      },
    ],
    checkedOn: "2026-11-01",
  },
  {
    places: ["Sidari"],
    airport: "Corfu airport",
    options: [
      {
        mode: "bus",
        fare: "Blue Bus 15 to Corfu town (€1.10, €1.70 bought on board), then Green Bus A2 to Sidari (€4.10)",
        sourceUrl: "https://ktelkerkyras.gr/wp-content/uploads/2026/07/TimeTable-18-07-2026-EN.pdf",
      },
    ],
    checkedOn: "2026-11-01",
  },
];

export function transferFor(destination: string | undefined | null): ResortTransfer | undefined {
  if (!destination) return undefined;
  return RESORT_TRANSFERS.find((t) => t.places.some((p) => mentions(destination, p)));
}
