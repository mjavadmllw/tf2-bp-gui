# TF2 Backpack Expander 🎒

<div align="center">

![TF2 Logo](https://img.shields.io/badge/Team_Fortress_2-Tool-orange?style=for-the-badge&logo=steam)
![Electron](https://img.shields.io/badge/Electron-191970?style=for-the-badge&logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

**English** | [فارسی](#فارسی)

</div>

---

## English

A Windows desktop app (built with Electron) that connects to your Steam account and Team Fortress 2's Game Coordinator, then lets you use **Backpack Expander** items with a single click to grow your backpack capacity — no manual crafting/using through the TF2 client needed.

### ✨ Features

- 🔐 Sign in with your Steam account (with Steam Guard support — email or mobile code)
- 💾 Optional "Remember me" — credentials are encrypted with your OS's native encryption (Windows DPAPI via Electron's `safeStorage`) and stored only on your machine
- 🎒 Detects Backpack Expanders in your backpack and uses them with one click
- 📊 Shows your current backpack slots and account type (Free / Premium), live-updating as expanders are used
- 📦 Full inventory tab — browse, search, and delete items
- 🎮 Join/Leave TF2 toggle, so the app can talk to the Game Coordinator without you having to launch the game
- 🛒 Built-in "Need backpack?" helper on the Backpack tab that opens the Steam Store purchase page for Backpack Expanders, with a quantity field
- 🧳 Custom app/taskbar icon

### 📥 Download & Run

You don't need Node.js or any setup to just use the app:

1. Go to the [Releases](../../releases) page of this repository.
2. Download the latest `TF2 Backpack Expander.exe` (portable build) from the newest release.
3. Run the `.exe` — no installation required.
4. Sign in with your Steam account inside the app.

> ⚠️ Windows SmartScreen or your antivirus may flag the `.exe` because it's not code-signed. This is expected for an open-source, unsigned build — you can inspect the source code in this repo yourself before running it.

### 🛠️ Build it yourself

If you'd rather build the app from source instead of using the Releases build:

**Requirements**

- [Node.js](https://nodejs.org/) (version 18 or higher)

**Windows (quick path)**

1. Download/clone this repository and open the folder.
2. Run `setup.bat` (installs dependencies via `npm install`).
3. Run `gui.bat` to start the app in development mode, **or**
4. Run `build.bat` to produce a portable `.exe` — the output will be in the `release/` folder.

**Manual (Windows / Linux / macOS)**

```bash
npm install        # install dependencies
npm start           # run the app in development mode
npm run dist         # build the portable executable (output in release/)
```

The build config lives in the `build` section of [package.json](package.json) (electron-builder). The app icon is at `build/icon.ico` / `build/icon.png` — replace those files if you want to customize it.

### 💡 Notes & Tips

- Each Backpack Expander costs **$1** on the Steam Store. Make sure you have enough Steam Wallet balance before buying — the in-app "Need backpack?" button takes you straight to the purchase page.
- Backpack slot limits are **3750** for Free-to-Play accounts and **4000** for Premium (TF2 has been purchased/played) accounts. The app won't try to use an expander once you're at the limit.
- If Steam Guard is enabled on your account, the app will prompt you for the code (from your email or the Steam Mobile app) right inside the window.
- Item deletion in the Inventory tab is **permanent** — there's a confirmation modal, but double-check before confirming.
- This is an unofficial, community-made tool and is **not affiliated with Valve or Steam**. Use it at your own risk and in line with Steam's Terms of Service.

### 📄 License

This project is licensed under the [MIT](LICENSE) license.

### 👨‍💻 Developer

Built with ❤️ by Mjavad_mllw

---

<div dir="rtl">

## فارسی

یک اپلیکیشن دسکتاپ برای ویندوز (ساخته‌شده با Electron) که به اکانت استیم شما و Game Coordinator بازی Team Fortress 2 متصل می‌شود و به شما اجازه می‌دهد آیتم‌های **Backpack Expander** را فقط با یک کلیک استفاده کنید تا ظرفیت بک‌پک‌تان افزایش پیدا کند — بدون نیاز به باز کردن بازی و استفاده دستی از داخل TF2.

### ✨ امکانات

- 🔐 ورود با اکانت استیم (پشتیبانی از Steam Guard — کد ایمیل یا اپلیکیشن موبایل)
- 💾 گزینه «مرا به خاطر بسپار» — اطلاعات ورود با رمزنگاری سطح سیستم‌عامل (DPAPI ویندوز از طریق `safeStorage` در Electron) ذخیره می‌شود و فقط روی همان سیستم شما قابل استفاده است
- 🎒 تشخیص خودکار آیتم‌های Backpack Expander در بک‌پک و استفاده از آن‌ها با یک کلیک
- 📊 نمایش زنده تعداد اسلات‌های فعلی بک‌پک و نوع اکانت (رایگان / پرمیوم)
- 📦 تب اینونتوری کامل — جست‌وجو و حذف آیتم‌ها
- 🎮 دکمه‌ی خروج/ورود به بازی، تا برنامه بدون نیاز به باز بودن خود بازی بتواند با Game Coordinator ارتباط برقرار کند
- 🛒 دکمه‌ی «Need backpack?» در تب بک‌پک که مستقیماً شما را به صفحه‌ی خرید Backpack Expander در استیم می‌برد و امکان انتخاب تعداد را هم دارد
- 🧳 آیکون اختصاصی برای برنامه و نوار وظیفه

### 📥 دانلود و اجرا

برای استفاده‌ی معمولی از برنامه نیازی به Node.js یا هیچ نصب اضافه‌ای نیست:

1. به بخش [Releases](../../releases) این ریپازیتوری بروید.
2. آخرین نسخه‌ی `TF2 Backpack Expander.exe` (نسخه‌ی پرتابل) را از جدیدترین ریلیز دانلود کنید.
3. فایل `.exe` را اجرا کنید — نیازی به نصب نیست.
4. داخل برنامه با اکانت استیم خودتان وارد شوید.

> ⚠️ ممکن است Windows SmartScreen یا آنتی‌ویروس شما به فایل `.exe` هشدار بدهد، چون این فایل امضای دیجیتال (code-signed) ندارد. این موضوع برای یک بیلد متن‌باز و بدون امضا طبیعی است — می‌توانید قبل از اجرا، خودتان کد پروژه را در همین ریپازیتوری بررسی کنید.

### 🛠️ ساخت (بیلد) خودتان

اگر ترجیح می‌دهید به‌جای استفاده از فایل آماده‌ی بخش Releases، خودتان برنامه را از روی سورس بسازید:

**پیش‌نیازها**

- [Node.js](https://nodejs.org/) (نسخه‌ی 18 به بالا)

**مسیر سریع (ویندوز)**

1. این ریپازیتوری را دانلود یا کلون کنید و پوشه‌ی آن را باز کنید.
2. فایل `setup.bat` را اجرا کنید (وابستگی‌ها را با `npm install` نصب می‌کند).
3. برای اجرای برنامه در حالت توسعه، `gui.bat` را اجرا کنید، **یا**
4. برای گرفتن خروجی `.exe` پرتابل، `build.bat` را اجرا کنید — خروجی داخل پوشه‌ی `release/` قرار می‌گیرد.

**مسیر دستی (ویندوز / لینوکس / مک)**

```bash
npm install        # نصب وابستگی‌ها
npm start           # اجرای برنامه در حالت توسعه
npm run dist         # ساخت فایل اجرایی پرتابل (خروجی در release/)
```

تنظیمات بیلد در بخش `build` فایل [package.json](package.json) قرار دارد (با electron-builder). آیکون برنامه هم در مسیر `build/icon.ico` و `build/icon.png` است — اگر خواستید می‌توانید این فایل‌ها را با آیکون دلخواه خودتان جایگزین کنید.

### 💡 نکات مهم

- هر عدد Backpack Expander در فروشگاه استیم **۱ دلار** قیمت دارد. قبل از خرید مطمئن شوید موجودی کافی در کیف پول استیم (Steam Wallet) خود دارید — دکمه‌ی «Need backpack?» داخل برنامه مستقیماً شما را به صفحه‌ی خرید می‌برد.
- سقف تعداد اسلات‌های بک‌پک برای اکانت‌های رایگان (Free-to-Play) برابر **۳۷۵۰** و برای اکانت‌های پرمیوم برابر **۴۰۰۰** است. برنامه پس از رسیدن به این سقف، دیگر اجازه‌ی استفاده از expander را نمی‌دهد.
- اگر Steam Guard روی اکانت شما فعال باشد، برنامه همان داخل پنجره از شما کد (از ایمیل یا اپلیکیشن Steam Mobile) را می‌خواهد.
- حذف آیتم از تب اینونتوری **غیرقابل بازگشت** است — برای این کار یک مودال تأیید وجود دارد، اما قبل از تأیید نهایی حتماً دوباره بررسی کنید.
- این ابزار غیررسمی و ساخته‌شده توسط یک توسعه‌دهنده‌ی مستقل است و **هیچ ارتباطی با شرکت Valve یا استیم ندارد**. استفاده از آن بر عهده‌ی خودتان است و باید مطابق با قوانین استفاده‌ی استیم (Terms of Service) باشد.

### 📄 مجوز

این پروژه تحت مجوز [MIT](LICENSE) منتشر شده است.

### 👨‍💻 توسعه‌دهنده

ساخته‌شده با ❤️ توسط Mjavad_mllw

</div>

---

<div align="center">

⭐ If you found this project useful, don't forget to star it!

</div>
