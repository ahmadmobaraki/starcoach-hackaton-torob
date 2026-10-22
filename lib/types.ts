export type CategoryGroup = "phone" | "watch" | "lighting" | "home" | "tools" | "other";

export type Intent = {
  rawText: string;
  category: CategoryGroup;
  brand?: string;
  model?: string;
  variant?: {
    storageGb?: number;
    ramGb?: number;
    color?: string;
    condition?: "new" | "used" | "stock";
  };
  budgetMaxToman?: number;
  area: { label: string; lat?: number; lon?: number; radiusKm: number };
  payment: { creditPreferred: boolean; requireCredit: boolean; providers: string[] };
  warrantyMinMonths?: number;
  openNow: boolean;
  deadline?: "today" | "tomorrow" | "this_week";
};

export type ProductSummary = {
  productId: string;
  title: string;
  brand: string | null;
  category: string | null;
  categoryGroup: CategoryGroup;
  model: string | null;
  images: string[];
  specs: { key: string; value: string }[];
  offerCount: number;
  shopCount: number;
  minPrice: number | null;
  maxPrice: number | null;
};

export type PaymentProvider = {
  providerName: string;
  channel: string | null;
};

export type HoursState = "open" | "closed" | "unknown";

export type HoursStatus = {
  state: HoursState;
  label: string;
  today: { open: string; close: string } | null;
  source: "declared" | "missing" | "unsupported";
};

export type ConfirmationStatus = "pending" | "confirmed" | "unavailable" | "ambiguous" | "failed";

export type Confirmation = {
  threadId: string;
  status: ConfirmationStatus;
  requestedAt: string | null;
  confirmedAt: string | null;
  confirmedPrice: number | null;
  confirmedHours: string | null;
  note: string | null;
};

export type Shop = {
  shopId: string;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  locationLabel: string | null;
  websiteUrl: string | null;
  instagram: string | null;
  fastDelivery: boolean;
  payments: PaymentProvider[];
};

export type OfferWithShop = {
  offerId: string;
  productId: string;
  price: number | null;
  lastPriceChangedAt: string | null;
  warrantyMonths: number | null;
  warrantyLabel: string | null;
  sellerTitle: string | null;
  shop: Shop;
  hours: HoursStatus;
  distanceKm: number | null;
  hasCredit: boolean;
  confirmation: Confirmation | null;
  score: number;
  reasons: string[];
};

export type Facets = {
  paymentCount: number;
  openNowCount: number;
  confirmedCount: number;
};

export type SearchResult = {
  product: ProductSummary;
  offers: OfferWithShop[];
  facets: Facets;
};

export type MessageRole = "buyer" | "owner" | "agent" | "system";

export type Message = {
  id: number;
  threadId: string;
  runId: string;
  shopId: string;
  role: MessageRole;
  text: string;
  parsed: OwnerReply | null;
  createdAt: string;
};

export type OwnerReply = {
  available: boolean | null;
  priceToman: number | null;
  closesAt: string | null;
  warrantyMonths: number | null;
  alternativeStorageGb: number | null;
  alternativeText: string | null;
  note: string | null;
  confidence: number;
  source: "llm" | "regex";
};

export type Thread = {
  threadId: string;
  shop: Shop;
  offer: OfferWithShop;
  confirmation: Confirmation;
  messages: Message[];
};

export type AgentEvent = {
  id: number;
  seq: number;
  kind: string;
  title: string;
  detail: string | null;
  createdAt: string;
};

export type RunState = {
  runId: string;
  product: ProductSummary;
  intent: Intent;
  threads: Thread[];
  events: AgentEvent[];
  status: "waiting" | "partial" | "confirmed" | "unavailable";
  alternatives: OfferWithShop[];
};

export type VisitPlan = {
  runId: string;
  product: ProductSummary;
  intent: Intent;
  primary: OfferWithShop | null;
  fallback: OfferWithShop | null;
  alternatives: OfferWithShop[];
  checklist: string[];
  message: string;
  mustLeaveBy: string | null;
};
