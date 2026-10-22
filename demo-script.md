# Demo video script — 5 minutes

Record at 390×844 (phone) or 1440×900 with a phone frame. Keep the owner inbox in a second tab.

## Before recording

1. `POST /api/demo/reset` or press «بازنشانی» in `/store`.
2. Check `curl /api/health` → `llm: true`.
3. Open the buyer app and `/store` in two tabs.
4. Turn off notifications; hide the Next.js dev badge by using the production build (`npm run build && npm start`).

## Shot list

| Time | On screen | Say / caption |
|---|---|---|
| 0:00 | A Tehran passage, closed shutters (or a simple title card) | «سه پاساژ، سه بار "نداریم". مشکل جست‌وجو نیست؛ مشکل رفتن است.» |
| 0:10 | Home | «هم‌قدم اول می‌فهمد دقیقاً چه می‌خواهی.» |
| 0:20 | Type or pick the demo query, hit «فروشگاه‌ها را پیدا کن» | «گوشی سامسونگ S25 FE ۲۵۶، تا ۲۰۰ میلیون، امروز فردوسی، قسطی هم باشه خوبه.» |
| 0:35 | Intent bar + category editor; switch to «ساعت» and back | «هر بخش را می‌شود عوض کرد؛ بدون شروع دوباره.» |
| 0:55 | Results, scroll cards | «۳۳ قیمت ثبت‌شده؛ ۲۸ تا در بودجه. اما قیمت با موجودی یکی نیست.» |
| 1:15 | Point at «ثبت‌شده ۹ روز پیش» and «موجودی نامشخص» | «این قیمت هفته‌ی پیش ثبت شده؛ موجودی هنوز تأیید نشده.» |
| 1:30 | Tap «از ۳ فروشگاه بپرس» | «دستیار ارزان‌ترین، نزدیک‌ترین و یک گزینه‌ی دیگر را انتخاب می‌کند.» |
| 1:45 | Ask page timeline | «به هر سه پیام داد. حالا منتظر جواب واقعی است.» |
| 2:00 | Owner tab: open نی‌آرا آروان, type «این مدل ۲۵۶ تموم شده.» | «فروشنده با متن آزاد جواب می‌دهد.» |
| 2:20 | Buyer tab updates; card becomes «موجود نیست»; next shop added | «دستیار جواب را می‌خواند، کارت را عوض می‌کند و فروشگاه بعدی را می‌پرسد.» |
| 2:40 | Owner tab: open رووان, type «هست ۱۸۴٬۶۰۰٬۰۰۰ تومان. تا ۹ شب. گارانتی ۱۸ ماه.» | «قیمت، ساعت و گارانتی را از همان جمله درمی‌آورد.» |
| 3:00 | Buyer card flips to «تأیید فروشنده» | «حالا این عدد، قیمت تأییدشده است؛ نه قیمت ثبت‌شده.» |
| 3:15 | Tap «برنامه سفر» | «برنامه سفر: کجا، تا کی، اگر نبود کجا.» |
| 3:35 | Plan page: primary, fallback, checklist, map | «فروشگاه اصلی، جایگزین ارزان‌تر، چک‌لیست و مسیر.» |
| 3:55 | Back to results; turn on «پرداخت اعتباری» | «فقط یک فروشگاه در بودجه پرداخت اعتباری دارد؛ دستیار این را پنهان نمی‌کند.» |
| 4:10 | Category switch to ساعت | «همین مسیر برای ساعت هم کار می‌کند.» |
| 4:25 | `/data` sheet | «داده صادقانه برچسب خورده: نام و شماره نمایشی، قیمت ثبت‌شده، موجودی تأییدشده.» |
| 4:40 | Live URL + agent timeline | «هم‌قدم: قبل از رفتن، مطمئن شو.» |

## Rules

- Show the live URL in the browser bar.
- Do not cut from the owner reply to the buyer update; let the two-second polling show.
- If the owner reply is ambiguous, type a follow-up; it proves the agent loop.
- Record one rehearsal, reset, then record the final take.
- Persian voiceover is best. If not possible, burn in Persian captions; silent is the fallback.
