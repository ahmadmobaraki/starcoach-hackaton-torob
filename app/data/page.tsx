import Link from "next/link";
import { ArrowRight, Database, Info, PhoneOff, ShieldAlert, Store } from "lucide-react";
import { Header } from "@/components/Header";
import { formatNumber } from "@/lib/format";

const facts = [
  { value: 6476, label: "فروشگاه" },
  { value: 225903, label: "محصول یکتا" },
  { value: 331506, label: "آفر قیمت‌دار" },
  { value: 4473, label: "فروشگاه با ساعت کاری" },
  { value: 266, label: "فروشگاه با پرداخت اعتباری" },
  { value: 112, label: "فروشگاه با سایت یا اینستاگرام" },
];

export default function DataPage() {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-8">
        <Link
          href="/"
          className="inline-flex min-h-9 items-center gap-1 text-xs text-muted hover:text-ink"
        >
          <ArrowRight size={15} />
          بازگشت
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight">درباره داده</h1>
        <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
          هم‌قدم روی خروجی دیتاست چالش ترب کار می‌کند. این صفحه می‌گوید چه چیزی واقعی است، چه چیزی
          نیست، و چرا بعضی کارت‌ها «تأیید نشده» هستند.
        </p>

        <section className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label} className="rounded-md border border-line bg-surface px-3 py-3">
              <div className="text-lg font-extrabold text-accent">{formatNumber(fact.value)}</div>
              <div className="mt-0.5 text-[11px] leading-5 text-muted">{fact.label}</div>
            </div>
          ))}
        </section>

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-bold">چیزهایی که نباید با هم اشتباه شوند</h2>
          <div className="space-y-2">
            <article className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Database size={16} className="text-accent" />
                قیمت ثبت‌شده ≠ موجودی
              </div>
              <p className="mt-1.5 text-xs leading-7 text-muted">
                هر آفر یعنی فروشگاه این محصول را «قیمت داده» است. این یعنی روی قفسه هست؟ نه. تا وقتی
                فروشنده موجودی را تأیید نکند، کارت «موجودی نامشخص» می‌ماند.
              </p>
            </article>
            <article className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Store size={16} className="text-accent" />
                دسته‌ی فروشگاه ≠ داشتن محصول
              </div>
              <p className="mt-1.5 text-xs leading-7 text-muted">
                این که فروشگاهی دسته‌ی «گوشی موبایل» دارد یعنی ممکن است گوشی بفروشد؛ نه این که مدل
                دقیق موردنظرت را دارد. فقط آفر، محصول را به فروشگاه وصل می‌کند.
              </p>
            </article>
            <article className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-xs font-bold">
                <PhoneOff size={16} className="text-warning" />
                شماره‌ها و بعضی نام‌ها نمایشی‌اند
              </div>
              <p className="mt-1.5 text-xs leading-7 text-muted">
                در دیتاست، شماره‌ی همه‌ی فروشگاه‌ها و نام ۶٬۳۶۴ فروشگاه از ۶٬۴۷۶ فروشگاه نمایشی است.
                ما شماره‌ی جعلی را دکمه‌ی تماس نمی‌کنیم؛ جایش از فروشگاه می‌پرسیم. ۱۱۲ فروشگاه سایت
                یا اینستاگرام واقعی دارند و لینکشان نمایش داده می‌شود.
              </p>
            </article>
            <article className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-xs font-bold">
                <ShieldAlert size={16} className="text-warning" />
                ساعت کاری و پرداخت اعتباری ناقص‌اند
              </div>
              <p className="mt-1.5 text-xs leading-7 text-muted">
                ۴٬۴۷۳ فروشگاه ساعت کاری ثبت کرده‌اند و فقط ۲۶۶ فروشگاه گزینه‌ی پرداخت اعتباری
                دارند. نبودِ اطلاعات یعنی «نامشخص»، نه «ندارد». فیلتر پرداخت اعتباری را روشن کنی،
                ممکن است فقط دو فروشگاه بماند؛ همین را شفاف نشان می‌دهیم.
              </p>
            </article>
            <article className="rounded-md border border-line bg-surface p-4">
              <div className="flex items-center gap-2 text-xs font-bold">
                <Info size={16} className="text-info" />
                پوشش جغرافیایی
              </div>
              <p className="mt-1.5 text-xs leading-7 text-muted">
                همه‌ی فروشگاه‌ها در تهران‌اند، اما نمونه‌ی دیتاست حدود ۱۰٪ فروشگاه‌های تهران و
                انتخابی از چند منطقه است. مرکز تمرکز دمو: فردوسی و شیخ هادی.
              </p>
            </article>
          </div>
        </section>

        <section className="mt-8 rounded-md border border-line bg-surface p-4">
          <h2 className="text-sm font-bold">در دمو چه چیزی شبیه‌سازی شده؟</h2>
          <p className="mt-1.5 text-xs leading-7 text-muted">
            پنل فروشنده یک نسخه‌ی نمایشی است تا حلقه‌ی «بپرس، بخوان، دوباره برنامه بریز» را واقعی
            نشان بدهد. پاسخ‌ها متن آزادند و دستیار آن‌ها را می‌خواند؛ در نسخه‌ی واقعی همین API به
            واتساپ بیزینس وصل می‌شود. پیام‌ها و تأییدها موقتی‌اند و با بازنشانی دمو پاک می‌شوند.
          </p>
        </section>

        <p className="mt-6 text-[11px] leading-6 text-muted">
          منبع: فایل‌های `shops.csv`، `products.csv` و `offers.csv` در پوشه‌ی `torob-dataset/`.
          اعداد از README و خود داده‌ها گرفته شده‌اند.
        </p>
      </main>
    </>
  );
}
