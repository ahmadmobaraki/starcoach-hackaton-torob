import { notFound } from "next/navigation";
import { OwnerInbox } from "@/components/OwnerInbox";
import { getStoreList, getStoreThreads } from "@/lib/agent";

export const dynamic = "force-dynamic";

export default async function StoreInboxPage({ params }: { params: Promise<{ shopId: string }> }) {
  const { shopId } = await params;
  const shop = getStoreList().find((item) => item.shop_id === shopId);
  if (!shop) notFound();
  const threads = getStoreThreads(shopId);
  return (
    <OwnerInbox
      shopId={shopId}
      shopName={shop.name}
      shopAddress={shop.address ?? "آدرس ثبت نشده"}
      initialThreads={threads}
    />
  );
}
