export const DEMO_PRODUCT_ID = "product_6c62d575e3d247f6f29e051a";
export const DEMO_ALTERNATIVE_PRODUCT_ID = "product_f07ef205504b7ab37b60b509";

export const DEMO_QUERY =
  "یه گوشی سامسونگ S25 FE ۲۵۶ می‌خوام، تا ۲۰۰ میلیون، امروز می‌رم فردوسی، قسطی هم باشه خوبه.";

export const DEMO_INTENT_TEXT = DEMO_QUERY;

export type DemoShop = {
  shopId: string;
  role: string;
  expectedReply: string;
};

export const DEMO_SHOPS: DemoShop[] = [
  {
    shopId: "shop_20d56d048f03a19fec6bf58c",
    role: "cheapest-closed",
    expectedReply: "این مدل ۲۵۶ تموم شده.",
  },
  {
    shopId: "shop_1ffc7576fed58fa57cd99a21",
    role: "cheapest-open",
    expectedReply: "این مدل ۲۵۶ تموم شده.",
  },
  {
    shopId: "shop_ec32a89464e8016804212b92",
    role: "primary",
    expectedReply: "هست ۱۸۴٬۶۰۰٬۰۰۰ تومان. تا ۹ شب. گارانتی ۱۸ ماه.",
  },
  {
    shopId: "shop_a89f7ff44bb5801bc1f42da4",
    role: "nearest",
    expectedReply: "هست ۱۹۲ میلیون. تا ۹ شب.",
  },
  {
    shopId: "shop_f3804c06a114592c95710713",
    role: "fallback",
    expectedReply: "هست ۱۸۴٬۹۰۰٬۰۰۰ تومان. تا ۹ شب.",
  },
  {
    shopId: "shop_581df06e4845192eafcbcf47",
    role: "fallback",
    expectedReply: "هست ۱۸۶ میلیون. تا ۹ شب.",
  },
  {
    shopId: "shop_0201f9487d68b9ba04ec2e1d",
    role: "payment",
    expectedReply: "هست ۱۹۷٬۸۹۸٬۰۰۰ تومان. با تارا و ازکی‌وام.",
  },
  {
    shopId: "shop_d31ef83bf64457123dccc6f2",
    role: "alternative",
    expectedReply: "مدل هند ۲۵۶ موجوده، ۱۸۸ میلیون و ۸۰۰.",
  },
];

export const DEMO_SHOP_IDS = DEMO_SHOPS.map((s) => s.shopId);

export const CHECKLIST = [
  "کارت بانکی و پول نقد",
  "کارت گارانتی و فاکتور فروش",
  "بررسی IMEI روی جعبه و گوشی",
  "تست دوربین، لمس، شارژ و باتری",
  "گرفتن رسید با تاریخ و مهر فروشگاه",
];
