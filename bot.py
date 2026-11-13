import os, html, sqlite3, random, time, threading, shutil, hashlib, signal, hmac, datetime
import telebot
from telebot import types

TOKEN = os.environ.get("BOT_TOKEN") or "PUT_YOUR_TOKEN_HERE"
# دیتابیس عمداً بیرون از پوشه‌ی پروژه (گیت) ذخیره می‌شود تا آپدیت/پول/دیپلوی چیزی را ریست نکند.
# روی سرور (Railway/Render/...) حتماً DB_PATH را روی یک Volume دائمی مثل /data/game.db بگذار.
_OLD_DB = "game.db"
DB_PATH = os.environ.get("DB_PATH") or os.path.join(os.path.expanduser("~"), "coin_game_data", "game.db")
os.makedirs(os.path.dirname(os.path.abspath(DB_PATH)), exist_ok=True)
if (not os.path.exists(DB_PATH) and os.path.exists(_OLD_DB)
        and os.path.abspath(_OLD_DB) != os.path.abspath(DB_PATH)):
    shutil.copy2(_OLD_DB, DB_PATH)  # انتقال یک‌باره‌ی دیتابیس قدیمی
CHANNEL_URL = os.environ.get("CHANNEL_URL", "")      # اختیاری: لینک کانال برای دکمه‌ی شیشه‌ای
ANNOUNCEMENT_CHAT_ID = os.environ.get("ANNOUNCEMENT_CHAT_ID", "").strip()  # کانال اطلاع‌رسانی کدهای هدیه؛ ربات باید ادمین باشد
bot = telebot.TeleBot(TOKEN)

# آیدی عددی تو (از دستور /myid توی بات بگیر). بکاپ دیتابیس توی چت خصوصی تو با بات ذخیره و پین می‌شه.
# آیدی عددی خودت را (از /myid در بات) اینجا بنویس تا نیازی به تنظیمات هاست نباشد.
ADMIN_ID_IN_FILE = 7476734523  # آیدی عددی ادمین؛ باعث می‌شود بعد از هر آپدیت/پاک‌شدن دیتابیس، بکاپ پین‌شده خودکار برگردد
ADMIN_ID = int(os.environ.get("ADMIN_ID", "0") or 0) or ADMIN_ID_IN_FILE
# رمز پنل ادمین داخل خود فایل است؛ برای تغییر، همین مقدار را ویرایش کن.
ADMIN_PASSWORD = "armin3130"  # همین متن را در چت خصوصی با بات بفرست تا مستقیم وارد پنل ادمین شوی


def _db_has_players(path):
    """True اگه فایل دیتابیس سالم باشه و حداقل یک بازیکن داخلش باشه."""
    try:
        c = sqlite3.connect(path)
        try:
            return c.execute("SELECT 1 FROM players LIMIT 1").fetchone() is not None
        finally:
            c.close()
    except Exception:
        return False


def restore_from_telegram():
    """اگه فایل دیتابیس نبود یا خالی بود (هاست همه‌چیز رو پاک کرده)، آخرین بکاپِ پین‌شده توی چت ادمین رو برمی‌گردونه."""
    if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) > 0 and _db_has_players(DB_PATH):
        return
    if not ADMIN_ID:
        print("⚠️ ADMIN_ID تنظیم نشده؛ بازیابی بکاپ از تلگرام ممکن نیست.")
        return
    try:
        pinned = bot.get_chat(ADMIN_ID).pinned_message
        if not pinned or not pinned.document:
            print("بکاپی توی تلگرام پیدا نشد (اولین اجرا؟).")
            return
        info = bot.get_file(pinned.document.file_id)
        data = bot.download_file(info.file_path)
        if not data.startswith(b"SQLite format 3"):
            print("فایل پین‌شده دیتابیس معتبر نیست.")
            return
        with open(DB_PATH, "wb") as f:
            f.write(data)
        print("✅ دیتابیس از بکاپ تلگرام بازیابی شد.")
    except Exception as e:
        print("restore failed:", e)


restore_from_telegram()
if not os.environ.get("DB_PATH"):
    print("⚠️ DB_PATH تنظیم نشده؛ اگر هاست دیسک دائمی ندارد، با هر آپدیت دیتابیس پاک می‌شود.")

lock = threading.RLock()
db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.row_factory = sqlite3.Row

# ستون‌هایی که روی دیتابیس‌های قدیمی هم اضافه می‌شوند (هیچ داده‌ای پاک نمی‌شود).
PLAYER_EXTRA_COLUMNS = (
    "xp INTEGER DEFAULT 0", "sword INTEGER DEFAULT 0",
    "armor INTEGER DEFAULT 0", "last_steal REAL DEFAULT 0",
    "account_no TEXT", "thief INTEGER DEFAULT 0", "guard INTEGER DEFAULT 0",
    "custom_name INTEGER DEFAULT 0", "farm_level INTEGER DEFAULT 1",
    "farm_last_claim REAL DEFAULT 0",
    # --- ستون‌های نسخه‌ی جدید ---
    "daily_streak INTEGER DEFAULT 0", "pickaxe INTEGER DEFAULT 0",
    "last_wheel REAL DEFAULT 0", "vault INTEGER DEFAULT 0",
    "mine_count INTEGER DEFAULT 0",
    "last_slots REAL DEFAULT 0",
    "last_cyber REAL DEFAULT 0",
    "cyber_lock_until REAL DEFAULT 0",
)


# شماره حساب بازی برای بازیکنان قدیمی هم ساخته می‌شود؛ شماره‌ها یکتا هستند.
def make_account_number():
    while True:
        number = str(random.randint(10_000_000, 99_999_999))
        exists = db.execute(
            "SELECT 1 FROM players WHERE account_no=?", (number,)
        ).fetchone()
        if not exists:
            return number


def init_schema():
    """جدول‌ها را می‌سازد و ستون‌های جدید را اضافه می‌کند. روی دیتابیس پر هم امن است."""
    global ADMIN_ID
    with lock:
        db.execute("""CREATE TABLE IF NOT EXISTS players(
            id INTEGER PRIMARY KEY, name TEXT, coins INTEGER DEFAULT 100,
            last_mine REAL DEFAULT 0, last_daily REAL DEFAULT 0,
            wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0)""")
        for col in PLAYER_EXTRA_COLUMNS:
            try:
                db.execute(f"ALTER TABLE players ADD COLUMN {col}")
            except sqlite3.OperationalError:
                pass
        for old_player in db.execute(
            "SELECT id FROM players WHERE account_no IS NULL OR account_no=''"
        ).fetchall():
            db.execute(
                "UPDATE players SET account_no=? WHERE id=?",
                (make_account_number(), old_player["id"])
            )
        db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_players_account_no ON players(account_no)")
        db.execute("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT)")
        if not ADMIN_ID:
            _saved_admin = db.execute("SELECT value FROM settings WHERE key='admin_id'").fetchone()
            if _saved_admin and str(_saved_admin["value"]).isdigit():
                ADMIN_ID = int(_saved_admin["value"])
        db.execute("""CREATE TABLE IF NOT EXISTS coin_transactions(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            kind TEXT NOT NULL,
            created_at REAL NOT NULL
        )""")
        try:
            db.execute("ALTER TABLE coin_transactions ADD COLUMN gross_amount INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        # هر بازیکن فقط یک‌بار می‌تواند با لینک دعوت عضو شود.
        db.execute("""CREATE TABLE IF NOT EXISTS referrals(
            referred_id INTEGER PRIMARY KEY,
            referrer_id INTEGER NOT NULL,
            created_at REAL NOT NULL
        )""")
        db.execute("CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)")
        # ثبت سابقه امتیازهایی که ادمین به بازیکنان می‌دهد.
        db.execute("""CREATE TABLE IF NOT EXISTS admin_points_log(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            created_at REAL NOT NULL
        )""")
        # سابقه جداگانه سکه‌هایی که ادمین به بازیکنان اضافه می‌کند.
        db.execute("""CREATE TABLE IF NOT EXISTS admin_coin_log(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            admin_id INTEGER NOT NULL,
            target_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            created_at REAL NOT NULL
        )""")
        # سامانه‌های افزوده‌شده؛ همه به‌شکل افزایشی ساخته می‌شوند و جدول‌های قدیمی پاک نمی‌شوند.
        db.execute("""CREATE TABLE IF NOT EXISTS daily_progress(
            user_id INTEGER NOT NULL, day_key TEXT NOT NULL, mine_count INTEGER DEFAULT 0,
            claimed INTEGER DEFAULT 0, PRIMARY KEY(user_id, day_key))""")
        db.execute("""CREATE TABLE IF NOT EXISTS achievement_claims(
            user_id INTEGER NOT NULL, achievement_key TEXT NOT NULL, claimed_at REAL NOT NULL,
            PRIMARY KEY(user_id, achievement_key))""")
        db.execute("""CREATE TABLE IF NOT EXISTS gift_codes(
            code TEXT PRIMARY KEY, coins INTEGER DEFAULT 0, xp INTEGER DEFAULT 0,
            max_uses INTEGER DEFAULT 1, uses INTEGER DEFAULT 0, active INTEGER DEFAULT 1,
            created_at REAL NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS gift_redemptions(
            code TEXT NOT NULL, user_id INTEGER NOT NULL, redeemed_at REAL NOT NULL,
            PRIMARY KEY(code, user_id))""")
        db.execute("""CREATE TABLE IF NOT EXISTS gift_announcement_refs(
            code TEXT PRIMARY KEY, chat_id TEXT NOT NULL, message_id INTEGER NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS banned_players(
            user_id INTEGER PRIMARY KEY, reason TEXT DEFAULT '', created_at REAL NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS bank_deposits(
            user_id INTEGER PRIMARY KEY, amount INTEGER DEFAULT 0, last_interest REAL NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS market_listings(
            id INTEGER PRIMARY KEY AUTOINCREMENT, seller_id INTEGER NOT NULL, item TEXT NOT NULL,
            quantity INTEGER NOT NULL, unit_price INTEGER NOT NULL, created_at REAL NOT NULL, active INTEGER DEFAULT 1)""")
        db.execute("CREATE INDEX IF NOT EXISTS idx_market_active ON market_listings(active, id)")
        # شمشیر و زره از نسخه جدید حذف شده‌اند؛ پیشنهادهای قدیمی آن‌ها دیگر قابل خرید نیست.
        db.execute("UPDATE market_listings SET active=0 WHERE item IN ('sword', 'armor')")
        db.execute("""CREATE TABLE IF NOT EXISTS farm_crop_state(
            user_id INTEGER PRIMARY KEY, crop TEXT DEFAULT 'wheat', last_claim REAL NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS weekly_points(
            user_id INTEGER NOT NULL, week_key TEXT NOT NULL, points INTEGER DEFAULT 0,
            PRIMARY KEY(user_id, week_key))""")
        db.execute("""CREATE TABLE IF NOT EXISTS weekly_awards(
            week_key TEXT PRIMARY KEY, settled_at REAL NOT NULL, winners TEXT NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS free_raffle_entries(
            day_key TEXT NOT NULL, user_id INTEGER NOT NULL, joined_at REAL NOT NULL,
            PRIMARY KEY(day_key, user_id))""")
        db.execute("""CREATE TABLE IF NOT EXISTS free_raffle_draws(
            day_key TEXT PRIMARY KEY, winner_id INTEGER, prize INTEGER NOT NULL, drawn_at REAL NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS free_roulette_claims(
            user_id INTEGER PRIMARY KEY, last_at REAL NOT NULL)""")
        db.execute("CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT)")
        # برای بازیکنان قدیمی، درآمد مزرعه از زمان نصب این نسخه محاسبه می‌شود؛ نه از سال ۱۹۷۰.
        db.execute("UPDATE players SET farm_last_claim=? WHERE farm_last_claim IS NULL OR farm_last_claim<=0", (time.time(),))
        # مهاجرت یک‌باره سطح‌بندی قدیمی به منحنی XP تدریجی؛ سطح بازیکنان قدیمی حفظ می‌شود.
        migrated = db.execute("SELECT value FROM settings WHERE key='level_curve_v2'").fetchone()
        if not migrated:
            for xp_row in db.execute("SELECT id, COALESCE(xp,0) AS xp FROM players").fetchall():
                old_xp = max(0, int(xp_row["xp"] or 0))
                old_level = min(100, 1 + old_xp // 100)
                old_progress = old_xp % 100 if old_level < 100 else 0
                new_xp = 50 * (old_level - 1) * old_level + old_progress
                new_xp = min(new_xp, 50 * 99 * 100)
                db.execute("UPDATE players SET xp=? WHERE id=?", (new_xp, xp_row["id"]))
            db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('level_curve_v2','1')")
        db.commit()


init_schema()
# اگر آیدی کانال/گروه در محیط هاست داده نشده باشد، از تنظیم ذخیره‌شده استفاده می‌شود.
if not ANNOUNCEMENT_CHAT_ID:
    try:
        _gift_chat = db.execute("SELECT value FROM settings WHERE key='announcement_chat_id'").fetchone()
        if _gift_chat and _gift_chat["value"]:
            ANNOUNCEMENT_CHAT_ID = str(_gift_chat["value"])
    except Exception:
        pass

def is_banned(uid):
    with lock:
        return db.execute("SELECT 1 FROM banned_players WHERE user_id=?", (uid,)).fetchone() is not None


# این دو فیلتر قبل از همه هندلرهای پیام و دکمه ثبت می‌شوند تا بن واقعاً اعمال شود.
@bot.message_handler(func=lambda m: bool(m.from_user and is_banned(m.from_user.id)),
                     content_types=["text", "photo", "document", "sticker", "audio", "video", "voice"])
def block_banned_message(m):
    reply(m, "⛔ دسترسی این حساب به بازی توسط مدیریت مسدود شده است.")


@bot.callback_query_handler(func=lambda c: bool(c.from_user and is_banned(c.from_user.id)))
def block_banned_callback(c):
    bot.answer_callback_query(c.id, "⛔ دسترسی این حساب مسدود است.", show_alert=True)


_backup_state = {"hash": None, "msg_id": None}


def backup_to_telegram(force=False):
    """یه کپی از دیتابیس برای ادمین می‌فرسته و پین می‌کنه (فقط اگه تغییر کرده باشه)."""
    if not ADMIN_ID:
        return False
    # دیتابیس خالی (مثلاً بازیابی ناموفق) نباید جای بکاپِ سالم را بگیرد.
    with lock:
        has_players = db.execute("SELECT 1 FROM players LIMIT 1").fetchone()
    if not has_players:
        print("⚠️ دیتابیس خالی است؛ بکاپ ارسال نشد تا بکاپ قبلی خراب نشود.")
        return False
    snap = os.path.join(os.path.dirname(os.path.abspath(DB_PATH)), "game_backup.db")
    try:
        if os.path.exists(snap):
            os.remove(snap)
        with lock:
            dst = sqlite3.connect(snap)
            db.backup(dst)
            dst.close()
        with open(snap, "rb") as f:
            digest = hashlib.md5(f.read()).hexdigest()
        if not force and digest == _backup_state["hash"]:
            return False
        with open(snap, "rb") as f:
            msg = bot.send_document(ADMIN_ID, f, caption=f"💾 بکاپ بازی — {time.strftime('%Y-%m-%d %H:%M:%S')}",
                                    disable_notification=True)
        try:
            bot.pin_chat_message(ADMIN_ID, msg.message_id, disable_notification=True)
        except Exception as e:
            print("pin failed:", e)
        old = _backup_state["msg_id"]
        if old:
            try:
                bot.delete_message(ADMIN_ID, old)
            except Exception:
                pass
        _backup_state.update(hash=digest, msg_id=msg.message_id)
        return True
    except Exception as e:
        print("telegram backup failed:", e)
        return False


duels = {}
duel_counter = 0
last_action = {}
bank_transfer_state = {}  # user_id -> {step, account_no, amount}
name_setup_state = set()  # برای سازگاری با نشست‌های قدیمی؛ دیگر نام دستی گرفته نمی‌شود
admin_flow_state = {}  # فقط ادمین: ورود رمز -> شماره حساب/آیدی -> مقدار XP
admin_login_lockout = {}  # جلوگیری از حدس‌زدن رمز

MINE_COOLDOWN = 60
DAILY_COOLDOWN = 24 * 3600
STEAL_COOLDOWN = 300
TRANSFER_FEE_PERCENT = 0
DAILY_REWARD = 200
ARENA_MAX = 200
MAX_UPGRADE = 10
ARCADE_MAX = 500
SLOT_COST = 0  # اسلات رایگان است
SLOTS_COOLDOWN = 6 * 3600
CYBER_COST = 25_000
CYBER_COOLDOWN = 24 * 3600
CYBER_LOCK_SECONDS = 24 * 3600
GIVE_TAX_PERCENT = 5
MAX_DIGITS = 9
FARM_BASE_INCOME = 50          # هر سطح مزرعه، ۵۰ سکه در ساعت
FARM_UPGRADE_COST = 100        # هزینه‌ی اولین ارتقا (از سطح ۱ به ۲)
FARM_COST_STEP = 50            # با هر سطح، هزینه‌ی ارتقای بعدی ۵۰ سکه بیشتر می‌شود (۱۰۰، ۱۵۰، ۲۰۰، ...)
FARM_MULTI_UPGRADE = 5         # دکمه‌ی ارتقای چندتایی
FARM_UPGRADE_XP = 50           # امتیاز (XP) که با هر ارتقا گرفته می‌شود
FARM_INCOME_STEP = 50          # افزایش درآمد ساعتی با هر ارتقا
FARM_MAX_LEVEL = 1_000_000
DAILY_STREAK_WINDOW = 48 * 3600  # اگر بیشتر از ۴۸ ساعت از جایزه قبلی بگذرد، رکورد پشت‌سرهم صفر می‌شود
DAILY_STREAK_STEP = 50           # هر روز پشت‌سرهم ۵۰ سکه پاداش اضافه
DAILY_STREAK_MAX_DAYS = 6        # سقف پاداش اضافه (روز هفتم به بعد: +۳۰۰)
WHEEL_COOLDOWN = 6 * 3600        # چرخ شانس هر ۶ ساعت
# (عنوان، سکه، امتیاز XP، وزن شانس)
WHEEL_PRIZES = [
    ("💨 پوچ! این‌بار نشد", 0, 1, 20),
    ("🪙 ۲۰ سکه", 20, 2, 30),
    ("🪙 ۵۰ سکه", 50, 3, 25),
    ("💰 ۱۰۰ سکه", 100, 4, 14),
    ("💎 ۲۵۰ سکه", 250, 6, 7),
    ("👑 ۵۰۰ سکه", 500, 10, 3),
    ("🎉 جکپات ۱۰۰۰ سکه", 1000, 20, 1),
]
VAULT_BASE_CAP = 1000            # ظرفیت صندوق امن؛ هر سطح نگهبان ۱۰۰۰ تا اضافه می‌کند
PICKAXE_BONUS = 3                # هر سطح کلنگ، ۳ سکه به هر معدن اضافه می‌کند
ADMIN_SESSION_SECONDS = 600
ADMIN_MAX_ATTEMPTS = 5
ADMIN_LOCKOUT_SECONDS = 900
MAX_SQLITE_INT = 9_223_372_036_854_775_807
LINE = "━━━━━━━━━━━━━━"
FACES = "⚀⚁⚂⚃⚄⚅"


# ---------- ابزارهای نمایشی ----------
def esc(s):
    return html.escape(str(s))


def nm(p):
    return esc(p["name"])


def telegram_player_name(user):
    """نام نمایشی را از یوزرنیم تلگرام می‌گیرد؛ در نبود یوزرنیم از شناسه پایدار استفاده می‌کند."""
    username = (getattr(user, "username", None) or "").strip().lstrip("@")
    if username:
        return "@" + username[:32]
    return f"user_{int(user.id)}"


def face(v):
    return FACES[v - 1] if 1 <= v <= 6 else str(v)


def card(head, body):
    return f"✨ <b>{head}</b> ✨\n{LINE}\n{body}"


def rank_title(p):
    lv = level(p)
    if lv >= 10:
        return "🐉 افسانه‌ای"
    if lv >= 7:
        return "👑 فرمانده"
    if lv >= 5:
        return "🛡 شوالیه"
    if lv >= 3:
        return "⚔️ جنگجو"
    return "🌱 تازه‌کار"


def xp_threshold(level_value):
    # XP تجمعی لازم برای شروع یک سطح؛ هر سطح ۱۰۰×شماره سطح XP می‌خواهد.
    lv = max(1, min(100, int(level_value)))
    return 50 * (lv - 1) * lv


def level_progress(xp_value):
    xp_value = max(0, int(xp_value or 0))
    max_xp = xp_threshold(100)
    if xp_value >= max_xp:
        return 100, 0, 0
    lo, hi = 1, 100
    while lo < hi:
        mid = (lo + hi + 1) // 2
        if xp_threshold(mid) <= xp_value:
            lo = mid
        else:
            hi = mid - 1
    lv = lo
    current = xp_value - xp_threshold(lv)
    needed = lv * 100
    return lv, current, needed


def xp_bar(player_or_xp):
    xp_value = player_or_xp["xp"] if hasattr(player_or_xp, "keys") else player_or_xp
    lv, current, needed = level_progress(xp_value)
    filled = 10 if lv >= 100 else min(10, current * 10 // max(1, needed))
    return "▰" * filled + "▱" * (10 - filled)


def reply(m, text, markup=None):
    return bot.reply_to(m, text, parse_mode="HTML", reply_markup=markup)


def say(chat_id, text, markup=None):
    return bot.send_message(chat_id, text, parse_mode="HTML", reply_markup=markup)


def edit(c, text, markup=None):
    try:
        bot.edit_message_text(text, c.message.chat.id, c.message.message_id,
                              parse_mode="HTML", reply_markup=markup)
    except Exception as e:
        if "not modified" not in str(e):
            say(c.message.chat.id, text, markup)


# ---------- دکمه‌های شیشه‌ای ----------
def btn(text, data):
    return types.InlineKeyboardButton(text, callback_data=data)


def main_markup(user_id=None):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("⛏ معدن سکه", "m:mine"), btn("🎁 جایزه روزانه", "m:daily"))
    kb.add(btn("👤 پروفایل", "m:profile"), btn("🏆 رتبه‌بندی", "m:top"))
    kb.add(btn("🎯 آرنای دونفره", "m:arena"), btn("💻 حمله سایبری", "m:cyber"))
    kb.add(btn("🎰 اسلات رایگان", "m:slots"), btn("🎲 بازی‌های بیشتر", "m:games"))
    kb.add(btn("🛒 فروشگاه", "m:shop"), btn("🛍 بازار", "m:market"))
    kb.add(btn("🏦 بانک", "m:bank"), btn("🧾 گردش حساب", "m:history"))
    kb.add(btn("🌾 مزرعه", "m:farm"), btn("🌱 محصولات", "m:crops"))
    kb.add(btn("🎡 چرخ شانس", "m:wheel"), btn("🔐 صندوق امن", "m:vault"))
    kb.add(btn("📋 مأموریت‌ها", "m:missions"), btn("🏅 دستاوردها", "m:achievements"))
    kb.add(btn("🏆 لیگ هفتگی", "m:weekly"), btn("🎟 قرعه‌کشی رایگان", "m:raffle"))
    kb.add(btn("🎁 کدهای هدیه", "m:giftcodes"), btn("🎟 دعوت دوستان", "m:referral"))
    if ADMIN_ID and user_id == ADMIN_ID:
        kb.add(btn("⚙️ پنل ادمین", "m:admin"))
    kb.add(btn("❓ راهنما", "m:help"))
    if CHANNEL_URL:
        kb.add(types.InlineKeyboardButton("📢 کانال ما", url=CHANNEL_URL))
    return kb


def back_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def result_markup(again=None):
    kb = types.InlineKeyboardMarkup()
    if again:
        kb.add(btn("🔁 دوباره", again), btn("🔙 منو", "m:menu"))
    else:
        kb.add(btn("🔙 منو", "m:menu"))
    return kb


def bet_markup(prefix, amounts):
    kb = types.InlineKeyboardMarkup()
    kb.add(*[btn(f"💰 {a}", f"{prefix}:{a}") for a in amounts])
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


# ---------- منطق بازی ----------
def get_player(user):
    with lock:
        current = db.execute(
            "SELECT account_no FROM players WHERE id=?", (user.id,)
        ).fetchone()
        display_name = telegram_player_name(user)
        if not current:
            db.execute(
                "INSERT OR IGNORE INTO players(id, name, account_no) VALUES(?, ?, ?)",
                (user.id, display_name, make_account_number())
            )
        elif not current["account_no"]:
            db.execute(
                "UPDATE players SET account_no=? WHERE id=?",
                (make_account_number(), user.id)
            )
        # نام همه‌ی کاربران (حتی حساب‌های قدیمی) از یوزرنیم فعلی تلگرام به‌روز می‌شود.
        # شماره حساب و موجودی دست‌نخورده می‌مانند.
        db.execute("UPDATE players SET name=?, custom_name=0 WHERE id=?",
                   (display_name, user.id))
        # حساب تازه باید از همین لحظه شروع به جمع‌کردن درآمد ساعتی کند.
        farm_clock = db.execute("SELECT farm_last_claim FROM players WHERE id=?", (user.id,)).fetchone()
        if farm_clock and (farm_clock["farm_last_claim"] is None or farm_clock["farm_last_claim"] <= 0):
            db.execute("UPDATE players SET farm_last_claim=? WHERE id=?", (time.time(), user.id))
        db.commit()
        return db.execute("SELECT * FROM players WHERE id=?", (user.id,)).fetchone()


def get_by_account(account_no):
    with lock:
        return db.execute(
            "SELECT * FROM players WHERE account_no=?", (str(account_no),)
        ).fetchone()


def get_by_id(uid):
    with lock:
        return db.execute("SELECT * FROM players WHERE id=?", (uid,)).fetchone()


def resolve_player_identifier(value):
    """شناسه عددی تلگرام یا شماره حساب ۸ رقمی را به بازیکن موجود تبدیل می‌کند."""
    raw = str(value or "").strip().lstrip("@")
    if not raw.isdigit():
        return None
    try:
        by_telegram_id = get_by_id(int(raw))
        if by_telegram_id:
            return by_telegram_id
    except (ValueError, OverflowError):
        return None
    return get_by_account(raw) if len(raw) == 8 else None


def is_cyber_restricted(uid):
    """محدودیت حمله سایبری فقط ورود به آرنا را متوقف می‌کند، نه کل ربات را."""
    player = get_by_id(uid)
    return bool(player and float(player["cyber_lock_until"] or 0) > time.time())


def cyber_restriction_text(uid):
    player = get_by_id(uid)
    until = float(player["cyber_lock_until"] or 0) if player else 0
    if until <= time.time():
        return "✅ محدودیت آرنا تمام شده است."
    left = int(until - time.time())
    return (f"🔒 ورود به آرنا تا <b>{time.strftime('%Y-%m-%d %H:%M', time.localtime(until))}</b> محدود است "
            f"(حدود {left // 3600} ساعت و {(left % 3600) // 60} دقیقه).\n"
            "✅ معدن، بانک، انتقال، مزرعه و بقیه بخش‌های ربات همچنان در دسترس هستند.")


def gift_announcement_text(code):
    with lock:
        row = db.execute("SELECT code,coins,xp,max_uses,uses,active FROM gift_codes WHERE code=?", (code,)).fetchone()
    if not row:
        return None
    status = "✅ فعال" if row["active"] and row["uses"] < row["max_uses"] else "⛔ ظرفیت تکمیل شده/غیرفعال"
    return (f"🎁 <b>تابلوی کد هدیه</b>\n\n"
            f"🔑 کد: <code>{esc(row['code'])}</code>\n"
            f"🪙 پاداش: <b>{int(row['coins']):,} سکه</b>\n"
            f"⭐ پاداش: <b>{int(row['xp']):,} XP</b>\n"
            f"👥 استفاده‌شده: <b>{int(row['uses'])}/{int(row['max_uses'])}</b>\n"
            f"📌 وضعیت: {status}\n"
            "🏅 سطح هر بازیکن پس از دریافت XP و بر اساس XP قبلی خودش تا سقف ۱۰۰ محاسبه می‌شود.\n\n"
            f"برای دریافت: <code>/redeem {esc(row['code'])}</code>\n"
            "برای دیدن فهرست: /giftcodes")


def refresh_gift_announcement(code):
    """پیام عمومی کد را پس از هر استفاده ویرایش می‌کند تا شمارنده همیشه تازه باشد."""
    with lock:
        ref = db.execute("SELECT chat_id,message_id FROM gift_announcement_refs WHERE code=?", (code,)).fetchone()
    text_value = gift_announcement_text(code)
    if not ref or not text_value:
        return False
    try:
        bot.edit_message_text(text_value, ref["chat_id"], ref["message_id"], parse_mode="HTML")
        return True
    except Exception as exc:
        print("gift announcement refresh failed:", exc)
        return False


def level(p):
    return level_progress(p["xp"])[0]


def power(p):
    # قدرت شمشیر و زره حذف شده؛ فقط برای سازگاری با نسخه‌های قبلی صفر برمی‌گرداند.
    return 0


def add(uid, coins=0, xp=0):
    with lock:
        db.execute("UPDATE players SET coins=coins+?, xp=xp+? WHERE id=?", (coins, xp, uid))
        db.commit()


def spend(uid, amount):
    """اگه سکه کافی بود کم می‌کنه و True برمی‌گردونه (اتمیک)"""
    with lock:
        row = db.execute("SELECT coins FROM players WHERE id=?", (uid,)).fetchone()
        if not row or row["coins"] < amount:
            return False
        db.execute("UPDATE players SET coins=coins-? WHERE id=?", (amount, uid))
        db.commit()
        return True


def parse_amount(m, index=1):
    parts = (m.text or "").split()
    if len(parts) <= index:
        return None
    s = parts[index]
    if not s.isdigit() or len(s) > MAX_DIGITS:
        return None
    n = int(s)
    return n if n > 0 else None


def too_fast(uid, secs=6):
    now = time.time()
    if now - last_action.get(uid, 0) < secs:
        return True
    last_action[uid] = now
    return False


def roll(chat_id, emoji="🎲"):
    return bot.send_dice(chat_id, emoji=emoji).dice.value


def settle(winner_id, loser_id, bet):
    """مقدار واقعی جابه‌جا شده رو برمی‌گردونه (اگه بازنده کمتر داشت همون)"""
    with lock:
        row = db.execute("SELECT coins FROM players WHERE id=?", (loser_id,)).fetchone()
        amount = max(0, min(bet, row["coins"]))
        db.execute("UPDATE players SET coins=coins+?, wins=wins+1, xp=xp+20 WHERE id=?",
                   (amount, winner_id))
        db.execute("UPDATE players SET coins=coins-?, losses=losses+1, xp=xp+5 WHERE id=?",
                   (amount, loser_id))
        db.commit()
        return amount


def run_fight(chat_id, a_id, b_id, bet):
    """دوئل تاسی: امتیاز = تاس × ۵ + قدرت"""
    a, b = get_by_id(a_id), get_by_id(b_id)
    say(chat_id, f"⚔️ <b>{nm(a)}</b> 🆚 <b>{nm(b)}</b>\n💰 شرط: {bet} سکه\n🎲 تاس‌ها در راهن...")
    va = roll(chat_id)
    vb = roll(chat_id)
    time.sleep(4)
    sa, sb = va * 5 + power(a), vb * 5 + power(b)
    text = (f"{face(va)} {nm(a)}: {va}×۵ + قدرت {power(a)} = <b>{sa}</b>\n"
            f"{face(vb)} {nm(b)}: {vb}×۵ + قدرت {power(b)} = <b>{sb}</b>\n{LINE}\n")
    if sa == sb:
        return text + "🤝 مساوی شد! سکه‌ای جابه‌جا نشد."
    winner, loser = (a, b) if sa > sb else (b, a)
    amount = settle(winner["id"], loser["id"], bet)
    return text + f"🏆 <b>{nm(winner)}</b> برنده شد و {amount} سکه از {nm(loser)} گرفت! 🎉"


def price(kind, p):
    bases = {"thief": 250, "guard": 250, "pickaxe": 400}
    return bases[kind] * (int(p[kind] or 0) + 1)


def do_mine(user):
    p = get_player(user)
    now = time.time()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        current = db.execute("SELECT * FROM players WHERE id=?", (p["id"],)).fetchone()
        wait = MINE_COOLDOWN - (now - current["last_mine"])
        if wait > 0:
            db.rollback()
            return f"⏳ {int(wait)} ثانیه دیگه صبر کن."
        r = random.random()
        pickaxe_bonus = int(current["pickaxe"] or 0) * PICKAXE_BONUS
        if r < 0.04:
            max_loss = min(1000, int(current["coins"]) // 2)
            loss = random.randint(1, max_loss) if max_loss > 0 else 0
            db.execute("UPDATE players SET last_mine=?, coins=coins-?, xp=xp+1 WHERE id=?",
                       (now, loss, p["id"]))
            result = f"🏴‍☠️ راهزن کمین کرده بود! <b>{loss}</b> سکه از دست دادی (حداکثر ۱۰۰۰)."
        elif r < 0.09:
            gain = min(5000, int((random.randint(500, 5000) + pickaxe_bonus) * active_income_multiplier()))
            db.execute("UPDATE players SET last_mine=?, coins=coins+?, xp=xp+25 WHERE id=?",
                       (now, gain, p["id"]))
            result = f"💎 صندوق افسانه‌ای پیدا کردی! <b>+{gain:,}</b> سکه! 🎉"
        elif r < 0.25:
            gain = min(5000, int((random.randint(100, 700) + pickaxe_bonus) * active_income_multiplier()))
            db.execute("UPDATE players SET last_mine=?, coins=coins+?, xp=xp+8 WHERE id=?",
                       (now, gain, p["id"]))
            result = f"⛏ رگه طلای ارزشمند پیدا کردی: <b>+{gain:,}</b> سکه!"
        else:
            gain = min(5000, int((random.randint(20, 150) + pickaxe_bonus) * active_income_multiplier()))
            db.execute("UPDATE players SET last_mine=?, coins=coins+?, xp=xp+3 WHERE id=?",
                       (now, gain, p["id"]))
            flavor = random.choice(["⛏ معدن امروز پربار بود", "🪙 کیسه سکه پیدا کردی",
                                    "🏔 از دل کوه طلا بیرون آوردی", "✨ رگه‌ای درخشان کشف کردی"])
            result = f"{flavor}: <b>+{gain:,}</b> سکه"
        db.execute("UPDATE players SET mine_count=COALESCE(mine_count,0)+1 WHERE id=?", (p["id"],))
        db.commit()
    update_daily_mine_progress(p["id"])
    record_weekly_points(p["id"], 5)
    return result


def do_daily(user):
    p = get_player(user)
    now = time.time()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        current = db.execute("SELECT last_daily, daily_streak FROM players WHERE id=?", (p["id"],)).fetchone()
        prev = current["last_daily"] or 0
        wait = DAILY_COOLDOWN - (now - prev)
        if wait > 0:
            db.rollback()
            return f"⏳ {int(wait // 3600)} ساعت و {int(wait % 3600 // 60)} دقیقه دیگه."
        if prev > 0 and now - prev <= DAILY_STREAK_WINDOW:
            streak = int(current["daily_streak"] or 0) + 1
        else:
            streak = 1
        bonus = min(streak - 1, DAILY_STREAK_MAX_DAYS) * DAILY_STREAK_STEP
        reward = DAILY_REWARD + bonus
        db.execute("UPDATE players SET last_daily=?, daily_streak=?, coins=coins+?, xp=xp+10 WHERE id=?",
                   (now, streak, reward, p["id"]))
        db.commit()
    record_weekly_points(p["id"], 10)
    text = f"🎁 جایزه روزانه: <b>+{reward}</b> سکه!"
    if bonus:
        text += f"\n🔥 {streak} روز پشت‌سرهم! پاداش رکورد: <b>+{bonus}</b> سکه"
    else:
        text += "\n🔥 فردا هم بیا تا پاداش رکورد پشت‌سرهم بگیری (هر روز +۵۰ سکه)."
    return text


def collect_farm_income(uid, now=None):
    """فقط ساعت‌های کامل را پرداخت می‌کند و دقیقه‌های باقی‌مانده را نگه می‌دارد."""
    now = time.time() if now is None else now
    with lock:
        db.execute("BEGIN IMMEDIATE")
        p = db.execute("SELECT farm_level, farm_last_claim FROM players WHERE id=?", (uid,)).fetchone()
        if not p:
            db.rollback()
            return 0, 0
        last = p["farm_last_claim"] or now
        elapsed = max(0, now - last)
        hours = int(elapsed // 3600)
        if hours <= 0:
            db.rollback()
            return 0, 0
        level_now = max(1, int(p["farm_level"] or 1))
        # رویداد دوبرابر فقط برای بازه‌ای محاسبه می‌شود که واقعاً داخل زمان رویداد بوده است.
        new_last = last + hours * 3600
        reward = income_with_event(level_now * FARM_BASE_INCOME, last, new_last)
        # افزودن به زمان قبلی، دقیقه‌های ناقص را برای ساعت بعد حفظ می‌کند.
        db.execute("UPDATE players SET coins=coins+?, farm_last_claim=? WHERE id=?",
                   (reward, new_last, uid))
        db.commit()
        record_weekly_points(uid, 3)
        return reward, hours


def farm_upgrade_cost(level_now):
    """هزینه‌ی ارتقا از سطح فعلی به سطح بعدی: سطح ۱ → ۱۰۰، سطح ۲ → ۱۵۰، سطح ۳ → ۲۰۰ ..."""
    return FARM_UPGRADE_COST + (max(1, int(level_now or 1)) - 1) * FARM_COST_STEP


def farm_markup(p):
    cost = farm_upgrade_cost(p["farm_level"])
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("💰 دریافت درآمدِ آماده‌شده", "farm:collect"))
    kb.add(btn(f"⬆️ ارتقا — {cost} سکه (+{FARM_INCOME_STEP} سکه/ساعت، +{FARM_UPGRADE_XP} امتیاز)", "farm:upgrade"))
    kb.add(btn(f"⬆️⬆️ ارتقا تا {FARM_MULTI_UPGRADE} سطح (هر چقدر سکه داری)", "farm:upgrade5"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def farm_page(user):
    p = get_player(user)
    collected, hours = collect_farm_income(p["id"])
    p = get_by_id(p["id"])
    elapsed = max(0, time.time() - (p["farm_last_claim"] or time.time()))
    remaining = max(1, 3600 - int(elapsed % 3600))
    h, rem = divmod(remaining, 3600)
    mins, secs = divmod(rem, 60)
    cost = farm_upgrade_cost(p["farm_level"])
    payback = max(1, -(-cost // FARM_INCOME_STEP))  # سقفِ تقسیم
    body = (
        f"🌾 سطح مزرعه: <b>{p['farm_level']}</b>\n"
        f"💵 درآمد هر ساعت: <b>{p['farm_level'] * FARM_BASE_INCOME}</b> سکه\n"
        f"💰 موجودی فعلی: <b>{p['coins']}</b> سکه\n"
        f"⬆️ هزینه ارتقای بعدی: <b>{cost}</b> سکه (بعدش {cost + FARM_COST_STEP})\n"
        f"📈 هر ارتقا: <b>+{FARM_INCOME_STEP} سکه در ساعت</b> و <b>+{FARM_UPGRADE_XP} امتیاز</b>\n"
        f"⏱ هزینه‌ی ارتقای بعدی حدود <b>{payback}</b> ساعت بعد برمی‌گرده\n"
    )
    if collected:
        body += f"\n✅ درآمد {hours} ساعت گذشته دریافت شد: <b>+{collected}</b> سکه\n"
    body += f"\n⏳ تا درآمد بعدی: <b>{mins} دقیقه و {secs} ثانیه</b>\n"
    body += "\nدرآمد به‌ازای زمان واقعی جمع می‌شود؛ ساعت‌های ناقص هم برای نوبت بعد حفظ می‌شوند."
    return card("مزرعه", body), farm_markup(p)


def upgrade_farm(uid, times=1):
    # اول درآمد سطح قبلی تسویه می‌شود تا ارتقا، درآمد ساعت‌های گذشته را عقب‌گردی زیاد نکند.
    collect_farm_income(uid)
    with lock:
        db.execute("BEGIN IMMEDIATE")
        p = db.execute("SELECT coins, farm_level FROM players WHERE id=?", (uid,)).fetchone()
        if not p:
            db.rollback()
            return "❌ حساب بازیکن پیدا نشد."
        level_now = max(1, int(p["farm_level"] or 1))
        if level_now >= FARM_MAX_LEVEL:
            db.rollback()
            return "❌ مزرعه به حداکثر سطح مجاز رسیده است."
        # هزینه‌ی هر سطح جداگانه حساب می‌شود (۱۰۰، ۱۵۰، ۲۰۰، ...)
        lvl, spent, done = level_now, 0, 0
        while done < times and lvl < FARM_MAX_LEVEL:
            cost = farm_upgrade_cost(lvl)
            if p["coins"] - spent < cost:
                break
            spent += cost
            lvl += 1
            done += 1
        if done == 0:
            db.rollback()
            return (f"❌ برای ارتقا {farm_upgrade_cost(level_now)} سکه لازم داری. "
                    f"موجودی: {p['coins']} سکه.")
        db.execute("UPDATE players SET coins=coins-?, farm_level=?, xp=xp+? WHERE id=?",
                   (spent, lvl, FARM_UPGRADE_XP * done, uid))
        db.commit()
    return (f"✅ مزرعه {done} سطح ارتقا یافت! (سطح {level_now} ← {lvl})\n"
            f"💸 هزینه: <b>{spent}</b> سکه\n"
            f"💵 درآمد ساعتی از {level_now * FARM_BASE_INCOME} به {lvl * FARM_BASE_INCOME} سکه رسید.\n"
            f"⭐ <b>+{FARM_UPGRADE_XP * done}</b> امتیاز گرفتی.\n"
            f"⬆️ هزینه ارتقای بعدی: <b>{farm_upgrade_cost(lvl)}</b> سکه")


def do_profile(user):
    p = get_player(user)
    body = (f"👤 <b>{nm(p)}</b>  {rank_title(p)}\n"
            f"💰 سکه: <b>{p['coins']}</b>\n"
            f"🏦 شماره حساب: <code>{p['account_no']}</code>\n"
            f"⭐ سطح {level(p)}/100  {xp_bar(p)}  "
            f"{level_progress(p['xp'])[1]}/{level_progress(p['xp'])[2] if level(p) < 100 else 'MAX'} XP تا سطح بعد\n"
            f"🥷 دزد: سطح {p['thief']}  |  🛡 نگهبان: سطح {p['guard']}  |  ⛏ کلنگ: سطح {p['pickaxe'] or 0}\n"
            f"🔐 صندوق امن: <b>{p['vault'] or 0}</b> سکه  |  🔥 رکورد روزانه: {p['daily_streak'] or 0} روز\n"
            f"🏅 برد: {p['wins']} | 💀 باخت: {p['losses']}\n"
            f"🎯 وضعیت آرنا: {'محدود تا پایان زمان حمله' if float(p['cyber_lock_until'] or 0) > time.time() else 'آزاد'}")
    return card("پروفایل", body)


def do_bank(user):
    p = get_player(user)
    return card("بانک و شماره حساب",
                f"👤 صاحب حساب: <b>{nm(p)}</b>\n"
                f"🏦 شماره حساب بازی: <code>{p['account_no']}</code>\n"
                f"💰 موجودی: <b>{p['coins']}</b> سکه\n"
                f"🏛 سپرده بانکی: <b>{get_deposit_balance(p['id'])}</b> سکه (سود روزانه ۲٪)\n\n"
                "📤 برای انتقال، دکمه «انتقال سکه» را بزن؛ شماره حساب و مبلغ را جداگانه وارد و در پایان تأیید کن.\n"
                "برای سپرده‌گذاری: <code>/deposit 500</code> و برداشت: <code>/withdraw 500</code>\n"
                "🥷 تلاش برای دزدی:\n<code>/steal شماره_حساب</code>\n"
                "🧾 مشاهده گردش حساب: <code>/history</code>\n\n"
                "این شماره فقط حساب داخل بازی است و به حساب بانکی واقعی ارتباطی ندارد.")


def do_history(user):
    p = get_player(user)
    with lock:
        rows = db.execute("""SELECT t.*,
            CASE WHEN t.sender_id=? THEN receiver.name ELSE sender.name END AS other_name
            FROM coin_transactions t
            LEFT JOIN players sender ON sender.id=t.sender_id
            LEFT JOIN players receiver ON receiver.id=t.receiver_id
            WHERE t.sender_id=? OR t.receiver_id=?
            ORDER BY t.id DESC LIMIT 8""", (p["id"], p["id"], p["id"])).fetchall()
    if not rows:
        return card("تاریخچه حساب", "هنوز انتقال یا عملیات دزدی ثبت نشده است.")
    lines = []
    for row in rows:
        other = esc(row["other_name"] or "بازیکن")
        sent = row["sender_id"] == p["id"]
        if row["kind"] == "steal":
            if sent:
                lines.append(f"🥷 دزدی موفق از <b>{other}</b> — +{row['amount']} سکه")
            else:
                lines.append(f"🚨 از حساب شما دزدی شد — -{row['amount']} سکه")
            continue
        elif row["kind"] == "give":
            if sent:
                gross = row["gross_amount"] or row["amount"]
                lines.append(f"🎁 هدیه به <b>{other}</b> — -{gross} سکه")
            else:
                lines.append(f"🎁 هدیه از <b>{other}</b> — +{row['amount']} سکه")
            continue
        elif row["kind"] == "guard_fine":
            label = "🧾 جریمه دزدی پرداخت‌شده به" if sent else "🛡 پاداش نگهبانی از طرف"
            sign = "-" if sent else "+"
        elif row["kind"] == "referral":
            lines.append(f"🎟 پاداش دعوت یک زیرمجموعه — +{row['amount']} سکه")
            continue
        elif row["kind"] == "admin_credit":
            lines.append(f"🎁 هدیه از مدیریت — +{row['amount']} سکه")
            continue
        else:
            label = "📤 انتقال به" if sent else "📥 دریافت از"
            sign = "-" if sent else "+"
        lines.append(f"{label} <b>{other}</b> — {sign}{row['amount']} سکه")
    return card("۸ عملیات اخیر حساب", "\n".join(lines))


TOP_BOARDS = {
    "coins": ("💰 ثروت", "(coins + COALESCE(vault, 0))"),
    "level": ("⭐ سطح", "xp"),
    "farm": ("🌾 مزرعه", "farm_level"),
    "wins": ("🏅 برد", "wins"),
}


def top_rows(kind="coins"):
    if kind not in TOP_BOARDS:
        kind = "coins"
    with lock:
        return db.execute(
            f"SELECT * FROM players ORDER BY {TOP_BOARDS[kind][1]} DESC, id ASC LIMIT 10"
        ).fetchall()


def top_markup(kind="coins"):
    if kind not in TOP_BOARDS:
        kind = "coins"
    kb = types.InlineKeyboardMarkup()
    tabs = [btn(("• " if k == kind else "") + v[0], f"top:{k}") for k, v in TOP_BOARDS.items()]
    kb.add(tabs[0], tabs[1])
    kb.add(tabs[2], tabs[3])
    for i, row in enumerate(top_rows(kind), 1):
        kb.add(btn(f"📋 کپی حساب نفر {i}", f"copyacct:{row['id']}"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def _top_value(kind, r):
    if kind == "level":
        return f"سطح {level(r)} ({r['xp']} XP)"
    if kind == "farm":
        return f"مزرعه سطح {r['farm_level']} ({r['farm_level'] * FARM_BASE_INCOME} سکه/ساعت)"
    if kind == "wins":
        return f"{r['wins']} برد"
    return f"{r['coins'] + (r['vault'] or 0)} 💰 (سطح {level(r)})"


def do_top(kind="coins"):
    if kind not in TOP_BOARDS:
        kind = "coins"
    rows = top_rows(kind)
    medals = ["🥇", "🥈", "🥉"] + ["🔹"] * 7
    lines = [f"{medals[i]} <b>{nm(r)}</b> — {_top_value(kind, r)}\n"
             f"🏦 حساب: <code>{r['account_no']}</code>"
             for i, r in enumerate(rows)]
    return card(f"برترین‌ها — {TOP_BOARDS[kind][0]}", "\n".join(lines) if lines else "هنوز کسی بازی نکرده.")


def do_transfer(user, account_no, amount):
    me = get_player(user)
    if not str(account_no).isdigit() or len(str(account_no)) != 8:
        return "❌ شماره حساب باید دقیقاً ۸ رقم باشد."
    if amount <= 0 or amount > 999_999_999:
        return "❌ مبلغ انتقال معتبر نیست."
    with lock:
        target = db.execute(
            "SELECT * FROM players WHERE account_no=?", (str(account_no),)
        ).fetchone()
        if not target:
            return "❌ این شماره حساب در بازی وجود ندارد."
        if target["id"] == me["id"]:
            return "❌ نمی‌توانی به حساب خودت سکه انتقال بدهی."
        db.execute("BEGIN IMMEDIATE")
        try:
            paid = db.execute(
                "UPDATE players SET coins=coins-? WHERE id=? AND coins>=?",
                (amount, me["id"], amount)
            )
            if paid.rowcount != 1:
                db.rollback()
                return "❌ موجودی‌ات برای این انتقال کافی نیست."
            received = amount - (amount * TRANSFER_FEE_PERCENT // 100)
            db.execute("UPDATE players SET coins=coins+? WHERE id=?",
                       (received, target["id"]))
            db.execute("""INSERT INTO coin_transactions
                (sender_id, receiver_id, amount, kind, created_at)
                VALUES(?, ?, ?, 'transfer', ?)""",
                (me["id"], target["id"], received, time.time()))
            db.commit()
        except Exception:
            db.rollback()
            raise
    # پیام رسید انتقال برای گیرنده؛ اگر هنوز ربات را باز نکرده باشد، خطا نادیده گرفته می‌شود.
    sender = get_by_id(me["id"])
    try:
        bot.send_message(
            target["id"],
            f"📥 <b>واریز جدید به حساب شما</b>\n"
            f"از طرف <b>{nm(sender)}</b> مبلغ <b>{received}</b> سکه به شما انتقال داده شد.\n"
            f"🏦 شماره حساب شما: <code>{target['account_no']}</code>\n"
            f"💰 موجودی جدید: <b>{get_by_id(target['id'])['coins']}</b> سکه",
            parse_mode="HTML"
        )
    except Exception:
        pass
    return (f"✅ انتقال انجام شد!\n📤 به <b>{nm(target)}</b> فرستادی: <b>{amount}</b> سکه\n"
            f"📥 مبلغ واریزشده: <b>{received}</b> سکه\n"
            f"🏦 مقصد: <code>{target['account_no']}</code>")



def register_referral(new_user_id, payload):
    """برای حساب تازه‌ساخته‌شده، یک معرف ثبت و ۵۰۰ سکه پاداش پرداخت می‌کند."""
    if not payload or not payload.startswith("ref_"):
        return None
    raw_id = payload[4:]
    if not raw_id.isdigit():
        return None
    referrer_id = int(raw_id)
    if referrer_id == new_user_id:
        return None

    with lock:
        referrer = db.execute("SELECT id FROM players WHERE id=?", (referrer_id,)).fetchone()
        if not referrer:
            return None
        try:
            db.execute("BEGIN IMMEDIATE")
            db.execute(
                "INSERT INTO referrals(referred_id, referrer_id, created_at) VALUES(?, ?, ?)",
                (new_user_id, referrer_id, time.time())
            )
            db.execute("UPDATE players SET coins=coins+500 WHERE id=?", (referrer_id,))
            db.execute(
                "INSERT INTO coin_transactions(sender_id, receiver_id, amount, kind, created_at) "
                "VALUES(0, ?, 500, 'referral', ?)",
                (referrer_id, time.time())
            )
            db.commit()
        except sqlite3.IntegrityError:
            db.rollback()
            return None
        except Exception:
            db.rollback()
            raise
    return get_by_id(referrer_id)


def referral_text(user):
    p = get_player(user)
    try:
        username = bot.get_me().username
    except Exception:
        username = None
    with lock:
        count = db.execute(
            "SELECT COUNT(*) AS n FROM referrals WHERE referrer_id=?", (p["id"],)
        ).fetchone()["n"]
    if not username:
        link_line = "فعلاً ساخت لینک دعوت ممکن نشد؛ کمی بعد دوباره امتحان کن."
    else:
        link = f"https://t.me/{username}?start=ref_{p['id']}"
        link_line = f"🔗 لینک اختصاصی تو:\n<code>{link}</code>"
    return card("دعوت دوستان", (
        "با لینک اختصاصی‌ات دوستانت را به بازی دعوت کن.\n"
        "🎁 به‌ازای هر بازیکن جدیدی که برای اولین بار با لینک تو وارد شود، "
        "<b>۵۰۰ سکه</b> می‌گیری.\n\n"
        f"👥 تعداد زیرمجموعه‌ها: <b>{count}</b>\n"
        f"💰 پاداش کل: <b>{count * 500}</b> سکه\n\n{link_line}\n\n"
        "⚠️ هر حساب جدید فقط یک‌بار برای یک معرف ثبت می‌شود؛ ورود دوباره یا لینک خودت پاداش ندارد."
    ))


def do_steal(user, target):
    me = get_player(user)
    if not target:
        return "❌ حساب مقصد پیدا نشد. شماره حساب را بررسی کن."
    if target["id"] == me["id"]:
        return "❌ از حساب خودت نمی‌توانی دزدی کنی!"
    with lock:
        me = db.execute("SELECT * FROM players WHERE id=?", (me["id"],)).fetchone()
        victim = db.execute("SELECT * FROM players WHERE id=?", (target["id"],)).fetchone()
        wait = STEAL_COOLDOWN - (time.time() - me["last_steal"])
        if wait > 0:
            return f"⏳ {int(wait)} ثانیه دیگر برای عملیات بعدی صبر کن."
        if int(victim["coins"] or 0) < 2:
            return "😅 موجودی هدف برای دزدی کافی نیست؛ هیچ‌وقت تمام موجودی بازیکن برداشته نمی‌شود."

        # هر تلاش، حتی وقتی نگهبان قوی‌تر است، زمان انتظار دارد.
        db.execute("UPDATE players SET last_steal=? WHERE id=?", (time.time(), me["id"]))
        if me["thief"] < victim["guard"]:
            # نگهبان دزد را می‌گیرد؛ جریمه تصادفی از دزد کم و به صاحب حساب می‌رسد.
            fine = random.randint(1, min(60, me["coins"])) if me["coins"] > 0 else 0
            db.execute("UPDATE players SET xp=xp+2, coins=coins+? WHERE id=?",
                       (fine, victim["id"]))
            if fine:
                db.execute("UPDATE players SET coins=coins-? WHERE id=?", (fine, me["id"]))
                db.execute("""INSERT INTO coin_transactions
                    (sender_id, receiver_id, amount, kind, created_at)
                    VALUES(?, ?, ?, 'guard_fine', ?)""",
                    (me["id"], victim["id"], fine, time.time()))
            db.commit()
            thief_name = nm(me)
            thief_account = me["account_no"]
            victim_id = victim["id"]
            victim_name = nm(victim)
            victim_account = victim["account_no"]
            thief_level = me["thief"]
            guard_level = victim["guard"]
            # اطلاع خصوصی به صاحب حساب؛ اگر هنوز ربات را استارت نکرده باشد خطا نادیده گرفته می‌شود.
            try:
                bot.send_message(
                    victim_id,
                    f"🚨 <b>تلاش برای دزدی از حساب شما خنثی شد!</b>\n"
                    f"🛡 نگهبان تو دزد را گرفت.\n"
                    f"👤 بازیکن مهاجم: <b>{thief_name}</b>\n"
                    f"🏦 شماره حساب مهاجم: <code>{thief_account}</code>\n"
                    f"💸 جریمه‌ای که از او کم شد: <b>{fine}</b> سکه\n"
                    f"💰 این مبلغ به حساب تو اضافه شد. موجودی جدید: <b>{get_by_id(victim_id)['coins']}</b> سکه",
                    parse_mode="HTML"
                )
            except Exception:
                pass
            return (f"🛡 <b>دزد دستگیر شد!</b> نگهبان {victim_name} جلوی دزدی را گرفت.\n"
                    f"🏦 شماره حساب بازیکنی که قصد دزدی داشت: <code>{thief_account}</code>\n"
                    f"💸 جریمه تصادفی پرداخت کردی: <b>{fine}</b> سکه\n"
                    f"📥 این مبلغ به حساب {victim_name} رسید.\n"
                    f"🥷 سطح دزد تو: <b>{thief_level}</b> | 🛡 سطح نگهبان مقصد: <b>{guard_level}</b>")

        # سرقت عادی با سطح دزد قوی‌تر می‌شود؛ ۴٪ احتمال دارد دقیقاً نصف موجودی هدف برداشته شود.
        half_chance = random.random() < 0.04
        if half_chance:
            amount = int(victim["coins"]) // 2
            steal_note = "💥 ضربه ویژه! نصف موجودی حساب هدف را برداشتی."
        else:
            max_take = min(int(victim["coins"]) // 2, 100 + int(me["thief"]) * 150)
            min_take = max(1, max_take // 3)
            amount = random.randint(min_take, max_take)
            steal_note = "🥷 سطح دزد بالاتر، سقف سرقتت را بیشتر می‌کند."
        db.execute("UPDATE players SET coins=coins-? WHERE id=?", (amount, victim["id"]))
        db.execute("UPDATE players SET coins=coins+?, xp=xp+3 WHERE id=?",
                   (amount, me["id"]))
        db.execute("""INSERT INTO coin_transactions
            (sender_id, receiver_id, amount, kind, created_at)
            VALUES(?, ?, ?, 'steal', ?)""",
            (me["id"], victim["id"], amount, time.time()))
        db.commit()
    # به قربانی فقط خبر دزدی داده می‌شود؛ هویت دزد نمایش داده نمی‌شود.
    try:
        bot.send_message(
            victim["id"],
            f"🚨 <b>از حساب شما دزدی شد!</b>\n"
            f"💸 <b>{amount}</b> سکه برداشته شد.\n"
            f"💰 موجودی جدید: <b>{victim['coins'] - amount}</b> سکه\n"
            f"🧱 برای جلوگیری از دزدی بعدی، نگهبانت رو ارتقا بده.",
            parse_mode="HTML"
        )
    except Exception:
        pass
    return (f"🥷 <b>دزدی موفق بود!</b>\n"
            f"از حساب {nm(victim)} مقدار تصادفی <b>{amount:,}</b> سکه برداشتی.\n"
            f"🏦 شماره حساب هدف: <code>{victim['account_no']}</code>\n"
            f"⭐ سطح دزد تو: {me['thief']} | 🛡 نگهبان هدف: {victim['guard']}\n{steal_note}")


def resolve_steal_target(m):
    parts = (m.text or "").split()
    if len(parts) >= 2:
        account_no = parts[1]
        if not account_no.isdigit() or len(account_no) != 8:
            return None, "فرمت درست: <code>/steal شماره_حساب</code> (شماره حساب ۸ رقمی)"
        target = get_by_account(account_no)
        if not target:
            return None, "❌ این شماره حساب پیدا نشد."
        return target, None
    u = reply_target(m)
    if u:
        return get_player(u), None
    return None, "شماره حساب را وارد کن: <code>/steal 12345678</code> یا روی پیام بازیکن ریپلای کن."


def do_cyber(user, target):
    """رویداد کاملاً خیالی درون‌بازی؛ فقط آرنای هدف را ۲۴ ساعت محدود می‌کند."""
    actor = get_player(user)
    if not target:
        return "❌ بازیکن مقصد پیدا نشد. آیدی عددی تلگرام یا شماره حساب ۸ رقمی را بررسی کن."
    if int(target["id"]) == int(actor["id"]):
        return "❌ نمی‌توانی به حساب خودت حمله کنی."
    now = time.time()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        current_actor = db.execute("SELECT * FROM players WHERE id=?", (actor["id"],)).fetchone()
        current_target = db.execute("SELECT * FROM players WHERE id=?", (target["id"],)).fetchone()
        if not current_target:
            db.rollback()
            return "❌ مقصد دیگر وجود ندارد."
        remaining = CYBER_COOLDOWN - (now - float(current_actor["last_cyber"] or 0))
        if remaining > 0:
            db.rollback()
            return f"⏳ حمله بعدی تو {int(remaining // 3600)} ساعت و {int((remaining % 3600) // 60)} دقیقه دیگر آماده می‌شود."
        if float(current_target["cyber_lock_until"] or 0) > now:
            db.rollback()
            return "🔒 آرنای این بازیکن از قبل محدود است؛ حمله دوباره روی او ثبت نشد."
        if int(current_actor["coins"]) < CYBER_COST:
            db.rollback()
            return f"❌ برای حمله سایبری درون‌بازی {CYBER_COST:,} سکه لازم داری."
        db.execute("UPDATE players SET coins=coins-?, last_cyber=? WHERE id=?",
                   (CYBER_COST, now, actor["id"]))
        db.execute("UPDATE players SET cyber_lock_until=? WHERE id=?",
                   (now + CYBER_LOCK_SECONDS, target["id"]))
        db.commit()
        fresh_actor = db.execute("SELECT * FROM players WHERE id=?", (actor["id"],)).fetchone()
        fresh_target = db.execute("SELECT * FROM players WHERE id=?", (target["id"],)).fetchone()
    try:
        bot.send_message(target["id"],
            f"🛡 <b>هشدار امنیتی بازی</b>\nیک رویداد خیالی از طرف <b>{nm(fresh_actor)}</b> ثبت شد.\n"
            "آرنای دونفره تو برای ۲۴ ساعت غیرفعال شده است. موجودی و بقیه بخش‌های ربات دست‌نخورده‌اند.",
            parse_mode="HTML")
    except Exception:
        pass
    return (f"💻 <b>رویداد سایبری درون‌بازی ثبت شد!</b>\n"
            f"🎯 هدف: <b>{nm(fresh_target)}</b>\n"
            f"💸 هزینه ثابت: <b>{CYBER_COST:,} سکه</b>\n"
            "🔒 آرنای هدف برای ۲۴ ساعت محدود شد.\n"
            "✅ موجودی هدف، بانک، معدن، مزرعه و سایر امکانات او تغییری نکرد.\n"
            "🚫 این قابلیت ارتقا ندارد؛ حمله بعدی تو پس از ۲۴ ساعت آزاد می‌شود.")


@bot.message_handler(commands=["cyber"])
def cmd_cyber(m):
    parts = (m.text or "").split()
    if len(parts) != 2:
        return reply(m, "فرمت: <code>/cyber آیدی_تلگرام_یا_شماره_حساب</code>\nهزینه ثابت: ۲۵٬۰۰۰ سکه؛ فقط آرنا را ۲۴ ساعت محدود می‌کند.")
    target = resolve_player_identifier(parts[1])
    reply(m, do_cyber(m.from_user, target), back_markup())


def do_dice(user, chat_id, bet):
    p = get_player(user)
    if p["coins"] < bet:
        return "❌ سکه کافی نداری."
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    if not spend(p["id"], bet):
        return "❌ سکه کافی نداری."
    mv = roll(chat_id)
    bv = roll(chat_id)
    time.sleep(4)
    head = f"{face(mv)} تو: <b>{mv}</b>   |   {face(bv)} ربات: <b>{bv}</b>\n{LINE}\n"
    if mv > bv:
        add(p["id"], bet * 2, 2)
        return head + f"🏆 بردی! <b>+{bet}</b> سکه 🎉"
    if mv == bv:
        add(p["id"], bet)
        return head + "🤝 مساوی! شرطت برگشت."
    return head + f"💀 باختی! <b>-{bet}</b> سکه"


def do_slots(user, chat_id):
    p = get_player(user)
    now = time.time()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        current = db.execute("SELECT last_slots FROM players WHERE id=?", (p["id"],)).fetchone()
        remaining = SLOTS_COOLDOWN - (now - float(current["last_slots"] or 0))
        if remaining > 0:
            db.rollback()
            return f"⏳ اسلات رایگان است؛ {int(remaining // 3600)} ساعت و {int((remaining % 3600) // 60)} دقیقه دیگر دوباره می‌توانی بازی کنی."
        db.execute("UPDATE players SET last_slots=? WHERE id=?", (now, p["id"]))
        db.commit()
    try:
        v = roll(chat_id, "🎰")
    except Exception:
        with lock:
            db.execute("UPDATE players SET last_slots=0 WHERE id=?", (p["id"]))
            db.commit()
        return "❌ اجرای اسلات از طرف تلگرام ناموفق بود؛ زمان استفاده برگردانده شد."
    if v in (1, 22, 43, 64):
        win = 5000
        add(p["id"], win, 50)
        return f"🎰 <b>سه نماد یکسان! جکپات ویژه!</b>\n💎 <b>+۵٬۰۰۰ سکه</b> و +۵۰ XP گرفتی! 🎉\n⏱ نوبت بعدی: ۶ ساعت دیگر"
    return "🎰 این بار نمادها یکی نشدند؛ چیزی از موجودی‌ات کم نشد.\n✅ اسلات کاملاً رایگان است.\n⏱ نوبت بعدی: ۶ ساعت دیگر"


def do_arena(user, chat_id, bet=None):
    return ("🎯 آرنا حالا فقط با دعوت مستقیم کار می‌کند.\n"
            "از دستور <code>/arena آیدی_تلگرام_یا_شماره_حساب</code> استفاده کن "
            "و یکی از بازی‌های دونفره را انتخاب کن. مسابقه‌ها بدون شرط سکه هستند و XP می‌دهند.")


def menu_text(user):
    p = get_player(user)
    lv, progress, needed = level_progress(p["xp"])
    progress_text = "MAX" if lv >= 100 else f"{progress:,}/{needed:,} XP"
    return card("🌌 GAME HUB | مرکز بازی", (
        f"👤 <b>{nm(p)}</b>  {rank_title(p)}\n"
        f"💰 کیف پول: <b>{p['coins']:,}</b> سکه  ·  ⭐ سطح <b>{lv}/100</b>\n"
        f"🏦 شماره حساب: <code>{p['account_no']}</code>\n"
        f"✨ پیشرفت سطح: <b>{progress_text}</b>\n"
        f"<code>{xp_bar(p)} </code>\n"
        "━━━━━━━━━━━━━━\n"
        "⚡ <b>ماجراجویی، اقتصاد، مزرعه و لیگ دوستانه</b>\n"
        "🎮 یک بخش را از پنل دکمه‌های پایین انتخاب کن.\n"
        "🛡 موجودی و شماره حساب با تغییر یوزرنیم حفظ می‌شوند."
    ))


HELP_TEXT = card("راهنمای بازی | GAME GUIDE", (
    "⛏ /mine — معدن هر ۶۰ ثانیه؛ جایزه تا ۵٬۰۰۰ سکه و رویداد راهزن تا ۱٬۰۰۰ سکه\n"
    "🎁 /daily — جایزه روزانه و رکورد پیوسته\n"
    "👤 /profile — سطح، XP، موجودی، شماره حساب و آمار برد/باخت\n"
    "🏆 /top — رتبه‌بندی بازیکنان\n"
    "🛒 /shop — ارتقای دزد، نگهبان و کلنگ؛ شمشیر و زره حذف شده‌اند\n"
    "🏦 /bank — شماره حساب | /transfer 12345678 100 — انتقال سکه\n"
    "🧾 /history — گردش حساب | /invite — لینک دعوت\n"
    "🎯 /arena 12345678 — دعوت مستقیم به فوتبال، بسکتبال، دارت، بولینگ، تاس، شیر یا خط یا سنگ‌کاغذقیچی\n"
    "💻 /cyber 12345678 — رویداد خیالی با هزینه ثابت ۲۵٬۰۰۰ سکه؛ فقط آرنا را ۲۴ ساعت محدود می‌کند\n"
    "🥷 /steal 12345678 — تلاش برای دزدی؛ هرگز تمام موجودی هدف برداشته نمی‌شود و سقف ضربه نصف موجودی است\n"
    "🎰 /slots — اسلات رایگان هر ۶ ساعت؛ باخت هیچ سکه‌ای کم نمی‌کند، سه نماد یکسان +۵٬۰۰۰ سکه\n"
    "🎡 /wheel — چرخ رایگان | /dice — تاس با ربات | /flip — شیر یا خط\n"
    "🌾 /farm — مزرعه | /crops — انتخاب محصولات و رویداد آب‌وهوا\n"
    "📋 /missions — مأموریت روزانه | /achievements — مدال‌ها | /weekly — لیگ هفتگی\n"
    "🎟 /raffle — قرعه‌کشی رایگان بدون خرید بلیت\n"
    "🃏 /blackjack — بلک‌جک تمرینی رایگان | /roulette — رولت رایگان | /guess — حدس عدد\n"
    "🏛 /deposit 500 — سپرده | /withdraw 500 — برداشت\n"
    "🛍 /market — بازار | /sell pickaxe 1 300 — فروش آیتم | /buy 12 — خرید پیشنهاد\n"
    "🎁 /giftcodes — کدهای عمومی | /redeem CODE — استفاده از کد هدیه\n\n"
    "🏅 سطح‌ها از ۱ تا ۱۰۰ هستند؛ برای هر سطح، XP بیشتری از سطح قبلی لازم است.\n"
    "💡 نام از یوزرنیم تلگرام (@username) گرفته می‌شود؛ اگر وجود نداشته باشد user_ID نمایش داده می‌شود.\n"
    "🏦 شماره حساب ۸ رقمی و موجودی با تغییر یوزرنیم حفظ می‌شوند.\n"
    "🤝 آرنا فقط مسابقه دوستانه است: سکه‌ای از هیچ‌یک کم نمی‌شود؛ برنده XP و آمار برد دریافت می‌کند.\n"
    "📌 برای سنجاق عمومی کدها، ادمین در گروه اطلاع‌رسانی دستور /setgiftchannel را اجرا کند و به ربات اجازه سنجاق پیام بدهد.\n"
    "━━━━━━━━━━━━━━\nبرای برگشت به منو از دکمه‌های رنگارنگ پایین صفحه استفاده کن."
))


# ---------- دستورات ----------
@bot.message_handler(commands=["start", "menu"])
def cmd_start(m):
    # پارامتر ref فقط هنگام اولین ساخت حساب بررسی می‌شود.
    with lock:
        is_new_player = db.execute(
            "SELECT 1 FROM players WHERE id=?", (m.from_user.id,)
        ).fetchone() is None
    p = get_player(m.from_user)
    if is_new_player:
        parts = (m.text or "").split(maxsplit=1)
        payload = parts[1].strip() if len(parts) > 1 else ""
        referrer = register_referral(m.from_user.id, payload)
        if referrer:
            try:
                bot.send_message(
                    referrer["id"],
                    f"🎉 یک زیرمجموعه جدید با لینک تو وارد بازی شد!\n"
                    f"👤 یوزرنیم تلگرام: <b>{esc(telegram_player_name(m.from_user))}</b>\n"
                    "💰 پاداش دعوت: <b>۵۰۰ سکه</b>",
                    parse_mode="HTML"
                )
            except Exception:
                pass
    # دیگر از بازیکن اسم دستی نمی‌پرسیم؛ نام از @username تلگرام گرفته می‌شود.
    # اگر کاربر یوزرنیم نداشته باشد، شناسه user_ID نمایش داده می‌شود.
    name_setup_state.discard(m.from_user.id)
    reply(m, menu_text(m.from_user), main_markup(m.from_user.id))


@bot.message_handler(
    func=lambda m: bool(m.from_user and m.chat.type == "private"
                        and (m.text or "").strip() == ADMIN_PASSWORD
                        and (not ADMIN_ID or m.from_user.id == ADMIN_ID)),
    content_types=["text"])
def admin_quick_login(m):
    """فرستادن رمز در چت خصوصی: اولین نفر ادمین ثبت می‌شود (در دیتابیس ذخیره می‌شود) و مستقیم وارد پنل می‌شود."""
    global ADMIN_ID
    uid = m.from_user.id
    try:
        bot.delete_message(m.chat.id, m.message_id)
    except Exception:
        pass
    if not ADMIN_ID:
        with lock:
            db.execute("INSERT OR REPLACE INTO settings(key, value) VALUES('admin_id', ?)", (str(uid),))
            db.commit()
        ADMIN_ID = uid
        threading.Thread(target=backup_to_telegram, kwargs={"force": True}, daemon=True).start()
    get_player(m.from_user)
    name_setup_state.discard(uid)
    bank_transfer_state.pop(uid, None)
    admin_flow_state[uid] = {"step": "action", "attempts": 0, "chat_id": m.chat.id,
                             "expires": time.time() + ADMIN_SESSION_SECONDS}
    say(m.chat.id, "✅ وارد پنل ادمین شدی.\nعملیات: سکه، XP، بن، آزاد، کد، رویداد\nبرای خروج /cancel را بزن.")


@bot.message_handler(func=lambda m: m.from_user and m.from_user.id in name_setup_state,
                     content_types=["text"])
def first_name_setup(m):
    uid = m.from_user.id
    chosen = (m.text or "").strip()
    if chosen.startswith("/"):
        if uid == ADMIN_ID and chosen.split()[0].split("@")[0] == "/admin":
            return cmd_admin(m)
        return reply(m, "اول یک اسم نمایشی بفرست تا حسابت ساخته بشه.")
    if not chosen or len(chosen) > 24 or len(chosen) < 2:
        return reply(m, "❌ اسم باید بین ۲ تا ۲۴ کاراکتر باشه. دوباره بفرست.")
    with lock:
        db.execute("UPDATE players SET name=?, custom_name=1 WHERE id=?", (chosen, uid))
        db.commit()
    name_setup_state.discard(uid)
    reply(m, menu_text(m.from_user), main_markup(m.from_user.id))


@bot.message_handler(commands=["myid"])
def cmd_myid(m):
    reply(m, f"آیدی عددی تو: <code>{m.from_user.id}</code>")


@bot.message_handler(commands=["backup"])
def cmd_backup(m):
    if not ADMIN_ID or m.from_user.id != ADMIN_ID:
        return
    ok = backup_to_telegram(force=True)
    reply(m, "✅ بکاپ فرستاده و پین شد." if ok else "❌ بکاپ نشد؛ لاگ رو ببین.")


@bot.message_handler(commands=["admin"])
def cmd_admin(m):
    if not ADMIN_ID or m.from_user.id != ADMIN_ID:
        return reply(m, "⛔ این دستور در دسترس نیست.")
    if m.chat.type != "private":
        return reply(m, "🔒 برای امنیت، پنل ادمین را فقط در گفت‌وگوی خصوصی با ربات باز کن.")
    if not ADMIN_PASSWORD:
        return reply(m, "⚠️ رمز ادمین در ابتدای فایل bot.py تنظیم نشده است.")
    until = admin_login_lockout.get(m.from_user.id, 0)
    if until > time.time():
        return reply(m, f"⏳ به‌دلیل تلاش ناموفق، ورود موقتاً قفل است. {int(until - time.time())} ثانیه دیگر امتحان کن.")
    name_setup_state.discard(m.from_user.id)
    bank_transfer_state.pop(m.from_user.id, None)
    admin_flow_state[m.from_user.id] = {
        "step": "password", "attempts": 0,
        "chat_id": m.chat.id, "expires": time.time() + ADMIN_SESSION_SECONDS
    }
    reply(m, "🔐 رمز پنل ادمین را بفرست.\nبرای لغو بنویس /cancel")


@bot.message_handler(func=lambda m: m.from_user and m.from_user.id in admin_flow_state,
                     content_types=["text"])
def admin_flow_input(m):
    uid = m.from_user.id
    state = admin_flow_state.get(uid)
    if not state:
        return
    if m.chat.type != "private" or m.chat.id != state.get("chat_id"):
        return
    if state.get("expires", 0) < time.time():
        admin_flow_state.pop(uid, None)
        return reply(m, "⌛ نشست ادمین منقضی شد. دوباره /admin را بزن.")
    raw = (m.text or "").strip()
    if raw.lower() in ("/cancel", "لغو", "انصراف"):
        admin_flow_state.pop(uid, None)
        return reply(m, "❌ پنل ادمین بسته شد.")
    if raw.startswith("/"):
        admin_flow_state.pop(uid, None)
        return reply(m, "نشست ادمین لغو شد. برای شروع دوباره /admin را بزن.")

    if state["step"] == "password":
        # متن رمز در صورت امکان بلافاصله از چت پاک می‌شود.
        try:
            bot.delete_message(m.chat.id, m.message_id)
        except Exception:
            pass
        if hmac.compare_digest(raw.encode("utf-8"), ADMIN_PASSWORD.encode("utf-8")):
            state.update(step="action", operation=None, attempts=0,
                         expires=time.time() + ADMIN_SESSION_SECONDS)
            return reply(m, "✅ رمز درست است.\nعملیات را بفرست: سکه، XP، بن، آزاد، کد، رویداد\nبرای خروج /cancel را بزن.")
        state["attempts"] = state.get("attempts", 0) + 1
        if state["attempts"] >= ADMIN_MAX_ATTEMPTS:
            admin_flow_state.pop(uid, None)
            admin_login_lockout[uid] = time.time() + ADMIN_LOCKOUT_SECONDS
            return reply(m, "⛔ رمز ۵ بار اشتباه بود؛ ورود به مدت ۱۵ دقیقه قفل شد.")
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(m, f"❌ رمز اشتباه است. {ADMIN_MAX_ATTEMPTS - state['attempts']} فرصت باقی مانده.")

    if state["step"] == "action":
        choice = raw.strip().lower()
        if choice in ("1", "امتیاز", "xp", "point", "points"):
            state["operation"] = "xp"; action_label = "امتیاز XP"; state["step"] = "account"
        elif choice in ("2", "سکه", "coin", "coins"):
            state["operation"] = "coins"; action_label = "سکه"; state["step"] = "account"
        elif choice in ("بن", "ban"):
            state["operation"] = "ban"; action_label = "بن بازیکن"; state["step"] = "account"
        elif choice in ("آزاد", "رفع بن", "unban"):
            state["operation"] = "unban"; action_label = "آزاد کردن بازیکن"; state["step"] = "account"
        elif choice in ("کد", "کد هدیه", "gift"):
            state["operation"] = "gift"; state["step"] = "gift"
            return reply(m, "کد هدیه را به این شکل بفرست:\n<code>CODE COINS XP MAX_USES</code>\nمثال: <code>WELCOME 500 20 100</code>")
        elif choice in ("رویداد", "event"):
            state["operation"] = "event"; state["step"] = "event"
            return reply(m, "مدت رویداد درآمد ۲ برابر را به ثانیه بفرست (مثلاً 3600، حداکثر ۷ روز):")
        else:
            return reply(m, "❌ یکی از این موارد را بفرست: سکه، XP، بن، آزاد، کد یا رویداد.")
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(m, f"✅ عملیات انتخاب شد: <b>{action_label}</b>\nحالا شماره حساب ۸ رقمی یا آیدی عددی تلگرام بازیکن را بفرست:")

    if state["step"] == "gift":
        parts = raw.split()
        if len(parts) != 4 or not parts[0].replace("_", "").isalnum() or not (3 <= len(parts[0]) <= 32):
            return reply(m, "فرمت: <code>CODE COINS XP MAX_USES</code> (کد ۳ تا ۳۲ نویسه)")
        code = parts[0].upper()
        nums = []
        try: nums = [int(x) for x in parts[1:]]
        except ValueError: return reply(m, "❌ مقادیر سکه، XP و تعداد استفاده باید عدد باشند.")
        coins, xp_value, limit = nums
        if coins < 0 or xp_value < 0 or limit < 1 or limit > 100000 or coins > MAX_SQLITE_INT or xp_value > MAX_SQLITE_INT:
            return reply(m, "❌ مقادیر خارج از محدوده هستند.")
        with lock:
            exists = db.execute("SELECT 1 FROM gift_codes WHERE code=?", (code,)).fetchone()
            if exists:
                return reply(m, "❌ این کد قبلاً ساخته شده است؛ برای جلوگیری از صفرشدن شمارنده استفاده، کد تازه‌ای انتخاب کن.")
            db.execute("INSERT INTO gift_codes(code,coins,xp,max_uses,uses,active,created_at) VALUES(?,?,?,?,0,1,?)",
                       (code, coins, xp_value, limit, time.time()))
            db.commit()
        state["step"] = "action"; state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        used = 0
        announce_text = (f"🎁 <b>کد هدیه جدید</b>\n\n"
                         f"🔑 کد: <code>{esc(code)}</code>\n"
                         f"🪙 پاداش: <b>{coins:,} سکه</b>\n"
                         f"⭐ پاداش: <b>{xp_value:,} XP</b>\n"
                         f"👥 استفاده‌شده: <b>{used}/{limit}</b>\n"
                         f"🏅 سطح نهایی پس از دریافت، براساس مجموع XP تا سقف ۱۰۰ محاسبه می‌شود.\n\n"
                         f"برای دریافت: <code>/redeem {esc(code)}</code>\n"
                         f"برای دیدن کدهای فعال: /giftcodes")
        pinned_status = ""
        if ANNOUNCEMENT_CHAT_ID:
            try:
                announcement = bot.send_message(ANNOUNCEMENT_CHAT_ID, gift_announcement_text(code), parse_mode="HTML")
                with lock:
                    db.execute("INSERT OR REPLACE INTO gift_announcement_refs(code,chat_id,message_id) VALUES(?,?,?)",
                               (code, str(ANNOUNCEMENT_CHAT_ID), int(announcement.message_id)))
                    db.commit()
                try:
                    bot.pin_chat_message(ANNOUNCEMENT_CHAT_ID, announcement.message_id, disable_notification=True)
                    pinned_status = "\n📌 پیام عمومی کد در گروه/کانال سنجاق شد."
                except Exception as pin_error:
                    print("gift code pin failed:", pin_error)
                    pinned_status = "\n⚠️ پیام عمومی ارسال شد، اما سنجاق نشد؛ به ربات دسترسی سنجاق بده."
            except Exception as announce_error:
                print("gift code announcement failed:", announce_error)
                pinned_status = "\n⚠️ ارسال عمومی ناموفق بود؛ تنظیم گروه اطلاع‌رسانی را بررسی کن."
        else:
            pinned_status = "\n📌 برای سنجاق عمومی، در گروه اطلاع‌رسانی /setgiftchannel را اجرا کن."
        return reply(m, f"✅ کد <code>{esc(code)}</code> ساخته شد.\n🪙 {coins:,} سکه | ⭐ {xp_value:,} XP | 👥 استفاده: {used}/{limit}\n"
                    f"این کد در /giftcodes برای همه بازیکنان نمایش داده می‌شود.{pinned_status}"
                    f"\nعملیات بعدی را بفرست یا /cancel.")

    if state["step"] == "event":
        normalized_event = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
        if not normalized_event.isdigit() or not (60 <= int(normalized_event) <= 604800):
            return reply(m, "❌ مدت باید بین ۶۰ تا ۶۰۴۸۰۰ ثانیه باشد.")
        end_at = int(time.time()) + int(normalized_event)
        with lock:
            db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('double_income_started',?)", (str(time.time()),))
            db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('double_income_until',?)", (str(end_at),))
            db.commit()
        state["step"] = "action"; state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(m, f"✅ رویداد درآمد ۲ برابر تا {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_at))} فعال شد.\nعملیات بعدی را بفرست یا /cancel.")

    if state["step"] == "account":
        if raw.strip().lower() in ("نوع", "تغییر", "change"):
            state["step"] = "action"
            state["expires"] = time.time() + ADMIN_SESSION_SECONDS
            return reply(m, "عملیات جدید را بفرست: سکه، XP، بن، آزاد، کد یا رویداد.")
        normalized = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
        target = None
        if normalized.isdigit() and len(normalized) == 8:
            target = get_by_account(normalized) or get_by_id(int(normalized))
        elif normalized.isdigit() and len(normalized) <= 19:
            target = get_by_id(int(normalized))
        if not target:
            return reply(m, "❌ بازیکن پیدا نشد. شماره حساب ۸ رقمی یا آیدی عددی تلگرام را درست بفرست:")
        state["target_id"] = target["id"]
        if state.get("operation") in ("ban", "unban"):
            target_id = target["id"]
            if state.get("operation") == "ban" and target_id == ADMIN_ID:
                state["step"] = "action"; state.pop("target_id", None)
                return reply(m, "❌ برای جلوگیری از قفل شدن پنل، ادمین اصلی قابل بن‌کردن نیست. عملیات بعدی را بفرست.")
            with lock:
                if state["operation"] == "ban":
                    db.execute("INSERT OR REPLACE INTO banned_players(user_id,reason,created_at) VALUES(?,?,?)",
                               (target_id, "مسدود توسط مدیریت", time.time()))
                    action_msg = "⛔ بازیکن بن شد."
                else:
                    db.execute("DELETE FROM banned_players WHERE user_id=?", (target_id,))
                    action_msg = "✅ بن بازیکن برداشته شد."
                db.commit()
            state["step"] = "action"; state.pop("target_id", None)
            state["expires"] = time.time() + ADMIN_SESSION_SECONDS
            return reply(m, f"{action_msg}\n👤 {nm(target)}\nعملیات بعدی را بفرست یا /cancel.")
        state["step"] = "amount"
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        if state.get("operation") == "coins":
            prompt = "🪙 چند سکه به موجودی این بازیکن اضافه کنم؟ عدد مثبت بفرست:"
        else:
            prompt = "⭐ چند امتیاز (XP) اضافه کنم؟ عدد مثبت بفرست:"
        return reply(m, f"👤 بازیکن انتخاب شد: <b>{nm(target)}</b>\n🏦 حساب: <code>{target['account_no']}</code>\n{prompt}")

    if state["step"] == "amount":
        raw = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")).replace(",", "").replace("٬", "")
        if not raw.isdigit() or len(raw) > 19 or int(raw) <= 0:
            unit = "سکه" if state.get("operation") == "coins" else "امتیاز XP"
            return reply(m, f"❌ مقدار {unit} باید عدد مثبت باشد. دوباره بفرست:")
        amount = int(raw)
        target_id = state.get("target_id")
        operation = state.get("operation", "xp")

        with lock:
            db.execute("BEGIN IMMEDIATE")
            target = db.execute(
                "SELECT id, name, xp, coins, account_no FROM players WHERE id=?",
                (target_id,)
            ).fetchone()
            if not target:
                db.rollback()
                state["step"] = "account"
                state.pop("target_id", None)
                return reply(m, "❌ حساب دیگر پیدا نشد. شماره حساب بازیکن بعدی را بفرست:")

            if operation == "coins":
                if target["coins"] > MAX_SQLITE_INT - amount:
                    db.rollback()
                    return reply(m, "❌ این مقدار از ظرفیت عددی دیتابیس بیشتر است. مقدار کمتری بفرست:")
                db.execute("UPDATE players SET coins=coins+? WHERE id=?", (amount, target_id))
                db.execute(
                    "INSERT INTO admin_coin_log(admin_id, target_id, amount, created_at) VALUES(?, ?, ?, ?)",
                    (uid, target_id, amount, time.time())
                )
                # sender_id=0 یعنی سکه از طرف سیستم/مدیریت ایجاد شده و از بازیکنی کم نشده است.
                db.execute(
                    "INSERT INTO coin_transactions(sender_id, receiver_id, amount, kind, created_at) "
                    "VALUES(0, ?, ?, 'admin_credit', ?)",
                    (target_id, amount, time.time())
                )
                db.commit()
                updated = db.execute("SELECT coins FROM players WHERE id=?", (target_id,)).fetchone()
                result_line = (
                    f"🪙 سکه اضافه‌شده: <b>+{amount}</b>\n"
                    f"💰 موجودی جدید: <b>{updated['coins']}</b> سکه"
                )
                notify_text = (
                    f"🎁 <b>هدیه از مدیریت بازی</b>\n"
                    f"مبلغ <b>{amount}</b> سکه به حساب شما اضافه شد.\n"
                    f"💰 موجودی جدید: <b>{updated['coins']}</b> سکه"
                )
            else:
                if target["xp"] > MAX_SQLITE_INT - amount:
                    db.rollback()
                    return reply(m, "❌ این مقدار از ظرفیت عددی دیتابیس بیشتر است. مقدار کمتری بفرست:")
                db.execute("UPDATE players SET xp=xp+? WHERE id=?", (amount, target_id))
                db.execute(
                    "INSERT INTO admin_points_log(admin_id, target_id, amount, created_at) VALUES(?, ?, ?, ?)",
                    (uid, target_id, amount, time.time())
                )
                db.commit()
                updated = db.execute("SELECT xp FROM players WHERE id=?", (target_id,)).fetchone()
                result_line = (
                    f"⭐ امتیاز اضافه‌شده: <b>+{amount}</b>\n"
                    f"⭐ مجموع XP: <b>{updated['xp']}</b>\n"
                    f"🏅 سطح فعلی: <b>{1 + updated['xp'] // 100}</b>"
                )
                notify_text = (
                    f"⭐ <b>امتیاز جدید از مدیریت</b>\n"
                    f"<b>{amount}</b> امتیاز XP به حساب شما اضافه شد.\n"
                    f"⭐ مجموع XP: <b>{updated['xp']}</b>"
                )

        # پیام اطلاع‌رسانی خصوصی به بازیکن؛ اگر ربات را باز نکرده باشد خطا نادیده گرفته می‌شود.
        try:
            bot.send_message(target_id, notify_text, parse_mode="HTML")
        except Exception:
            pass

        state["step"] = "account"
        state.pop("target_id", None)
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(
            m,
            f"✅ عملیات با موفقیت انجام شد.\n"
            f"👤 بازیکن: <b>{esc(target['name'])}</b>\n"
            f"🏦 حساب: <code>{target['account_no']}</code>\n"
            f"{result_line}\n\n"
            f"برای بازیکن بعدی، شماره حساب یا آیدی تلگرام را بفرست.\n"
            f"برای تغییر نوع عملیات بنویس «نوع»؛ برای خروج /cancel را بزن."
        )


@bot.message_handler(commands=["invite"])
def cmd_invite(m):
    reply(m, referral_text(m.from_user), back_markup())


@bot.message_handler(commands=["help"])
def cmd_help(m):
    get_player(m.from_user)
    reply(m, HELP_TEXT, back_markup())


@bot.message_handler(commands=["profile", "balance"])
def cmd_profile(m):
    reply(m, do_profile(m.from_user), back_markup())


@bot.message_handler(commands=["mine"])
def cmd_mine(m):
    reply(m, do_mine(m.from_user), result_markup("m:mine"))


@bot.message_handler(commands=["farm"])
def cmd_farm(m):
    text, markup = farm_page(m.from_user)
    reply(m, text, markup)


@bot.message_handler(commands=["daily"])
def cmd_daily(m):
    reply(m, do_daily(m.from_user), back_markup())


@bot.message_handler(commands=["top"])
def cmd_top(m):
    reply(m, do_top(), top_markup())


@bot.message_handler(commands=["bank", "account"])
def cmd_bank(m):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("📤 انتقال سکه", "bankstart"))
    kb.add(btn("🧾 تاریخچه حساب", "m:history"), btn("🔙 منو", "m:menu"))
    reply(m, do_bank(m.from_user), kb)


@bot.message_handler(commands=["history"])
def cmd_history(m):
    reply(m, do_history(m.from_user), back_markup())


@bot.message_handler(commands=["transfer", "send"])
def cmd_transfer(m):
    parts = (m.text or "").split()
    if len(parts) != 3:
        return reply(m, "فرمت درست: <code>/transfer شماره_حساب مبلغ</code>\nمثال: <code>/transfer 12345678 100</code>")
    account_no, raw_amount = parts[1], parts[2]
    if not account_no.isdigit() or len(account_no) != 8:
        return reply(m, "❌ شماره حساب باید دقیقاً ۸ رقم باشد.")
    if not raw_amount.isdigit() or len(raw_amount) > MAX_DIGITS or int(raw_amount) <= 0:
        return reply(m, "❌ مبلغ باید عددی مثبت و حداکثر ۹ رقم باشد.")
    reply(m, do_transfer(m.from_user, account_no, int(raw_amount)), back_markup())


@bot.message_handler(func=lambda m: m.from_user and m.from_user.id in bank_transfer_state,
                     content_types=["text"])
def bank_transfer_input(m):
    uid = m.from_user.id
    state = bank_transfer_state.get(uid)
    if not state:
        return
    raw = (m.text or "").strip()
    if raw.startswith("/"):
        bank_transfer_state.pop(uid, None)
        return reply(m, "فرایند انتقال لغو شد؛ از منو دوباره وارد بانک شو.", back_markup())
    if state["step"] == "account":
        if not raw.isdigit() or len(raw) != 8:
            return reply(m, "❌ شماره حساب باید دقیقاً ۸ رقم باشد. دوباره شماره حساب را بفرست.")
        target = get_by_account(raw)
        if not target:
            return reply(m, "❌ این شماره حساب پیدا نشد. شماره را دوباره وارد کن.")
        if target["id"] == uid:
            return reply(m, "❌ نمی‌توانی به حساب خودت انتقال بدهی. شماره مقصد دیگری بفرست.")
        state["account_no"] = raw
        state["step"] = "amount"
        return reply(m, f"✅ مقصد: <b>{nm(target)}</b>\n🏦 <code>{raw}</code>\nحالا مبلغ سکه را به عدد وارد کن:")
    if state["step"] == "amount":
        if not raw.isdigit() or len(raw) > MAX_DIGITS or int(raw) <= 0:
            return reply(m, "❌ مبلغ باید عدد مثبت و حداکثر ۹ رقم باشد. دوباره مبلغ را وارد کن.")
        amount = int(raw)
        me = get_player(m.from_user)
        target = get_by_account(state["account_no"])
        if not target:
            bank_transfer_state.pop(uid, None)
            return reply(m, "❌ حساب مقصد دیگر پیدا نمی‌شود؛ انتقال لغو شد.")
        if me["coins"] < amount:
            return reply(m, f"❌ موجودی کافی نیست. موجودی تو: {me['coins']} سکه. مبلغ دیگری وارد کن.")
        state["amount"] = amount
        state["step"] = "confirm"
        kb = types.InlineKeyboardMarkup()
        kb.add(btn("✅ تأیید انتقال", "bankconfirm"), btn("❌ لغو", "bankcancel"))
        return reply(m, card("تأیید انتقال", f"📤 از حساب تو: <b>{amount}</b> سکه\n📥 گیرنده: <b>{nm(target)}</b>\n🏦 شماره مقصد: <code>{state['account_no']}</code>\n\nبا تأیید، سکه‌ها منتقل می‌شوند."), kb)


@bot.message_handler(commands=["dice", "gamble"])
def cmd_dice(m):
    bet = parse_amount(m)
    if bet is None:
        return reply(m, "بنویس: /dice 50")
    reply(m, do_dice(m.from_user, m.chat.id, bet), result_markup(f"d:{bet}"))


@bot.message_handler(commands=["slots"])
def cmd_slots(m):
    reply(m, do_slots(m.from_user, m.chat.id), result_markup("m:slots"))


# ---------- آرنای دونفره (بدون شرط‌بندی سکه) ----------
PVP_GAME_DATA = {
    "football": ("⚽", "فوتبال"),
    "basketball": ("🏀", "بسکتبال"),
    "darts": ("🎯", "دارت"),
    "bowling": ("🎳", "بولینگ"),
    "dice": ("🎲", "تاس"),
    "coin": ("🪙", "شیر یا خط"),
    "rps": (None, "سنگ کاغذ قیچی"),
}
PVP_CHALLENGES = {}
PVP_COUNTER = 0


def pvp_game_markup(target_id):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("⚽ فوتبال", f"pvpstart:{target_id}:football"), btn("🏀 بسکتبال", f"pvpstart:{target_id}:basketball"))
    kb.add(btn("🎯 دارت", f"pvpstart:{target_id}:darts"), btn("🎳 بولینگ", f"pvpstart:{target_id}:bowling"))
    kb.add(btn("🎲 تاس", f"pvpstart:{target_id}:dice"), btn("🪙 شیر یا خط", f"pvpstart:{target_id}:coin"))
    kb.add(btn("✊ سنگ‌کاغذقیچی", f"pvpstart:{target_id}:rps"))
    kb.add(btn("✖ لغو", "m:menu"))
    return kb


def _pvp_award(challenger_id, target_id, winner_id=None):
    if winner_id is None:
        with lock:
            db.execute("UPDATE players SET xp=xp+15 WHERE id IN (?,?)", (challenger_id, target_id))
            db.commit()
        return "🤝 مساوی شد؛ هر دو +۱۵ XP گرفتید."
    loser_id = target_id if winner_id == challenger_id else challenger_id
    with lock:
        db.execute("UPDATE players SET xp=xp+30,wins=wins+1 WHERE id=?", (winner_id,))
        db.execute("UPDATE players SET xp=xp+10,losses=losses+1 WHERE id=?", (loser_id,))
        db.commit()
    try:
        record_weekly_points(winner_id, 10)
        record_weekly_points(loser_id, 2)
    except Exception:
        pass
    winner = get_by_id(winner_id); loser = get_by_id(loser_id)
    return (f"🏆 برنده: <b>{nm(winner)}</b> — +۳۰ XP و یک برد\n"
            f"👏 بازیکن دوم: <b>{nm(loser)}</b> — +۱۰ XP و یک باخت")


def _pvp_send_result(challenge, result_text):
    c = challenge
    for uid in (c["challenger"], c["target"]):
        try:
            bot.send_message(uid, result_text, parse_mode="HTML", reply_markup=back_markup())
        except Exception:
            pass


def _pvp_roll_match(challenge_id):
    c = PVP_CHALLENGES.get(challenge_id)
    if not c: return
    emoji, title = PVP_GAME_DATA[c["game"]]
    try:
        if c["game"] == "coin":
            a_roll = random.randint(1, 2)
            b_roll = random.randint(1, 2)
        else:
            a_roll = bot.send_dice(c["challenger"], emoji).dice.value
            b_roll = bot.send_dice(c["target"], emoji).dice.value
    except Exception as exc:
        PVP_CHALLENGES.pop(challenge_id, None)
        msg = ("❌ اجرای مسابقه انجام نشد؛ هر دو بازیکن باید ابتدا ربات را در گفت‌وگوی خصوصی /start کرده باشند. "
               "هیچ سکه‌ای از حساب کسی کم نشد.")
        _pvp_send_result(c, msg)
        return
    if a_roll > b_roll:
        winner_id = c["challenger"]
    elif b_roll > a_roll:
        winner_id = c["target"]
    else:
        winner_id = None
    awards = _pvp_award(c["challenger"], c["target"], winner_id)
    a = get_by_id(c["challenger"]); b = get_by_id(c["target"])
    if c["game"] == "coin":
        result_a = "🦅 شیر" if a_roll == 1 else "🪙 خط"
        result_b = "🦅 شیر" if b_roll == 1 else "🪙 خط"
    else:
        result_a, result_b = str(a_roll), str(b_roll)
    result = (f"🎮 <b>نتیجه مسابقه {title}</b>\n"
              f"{nm(a)}: <b>{result_a}</b>\n{nm(b)}: <b>{result_b}</b>\n"
              f"━━━━━━━━━━━━━━\n{awards}\n"
              "🪙 موجودی هیچ‌کدام شرط‌بندی یا کم نشده است.")
    PVP_CHALLENGES.pop(challenge_id, None)
    _pvp_send_result(c, result)


def cmd_arena(m):
    parts = (m.text or "").split()
    target = None
    if m.reply_to_message and m.reply_to_message.from_user and not m.reply_to_message.from_user.is_bot:
        target = get_player(m.reply_to_message.from_user)
    elif len(parts) == 2:
        target = resolve_player_identifier(parts[1])
    if not target:
        return reply(m, "فرمت: <code>/arena آیدی_تلگرام_یا_شماره_حساب</code>\nیا روی پیام حریف ریپلای کن و /arena بزن.")
    if target["id"] == m.from_user.id:
        return reply(m, "❌ نمی‌توانی خودت را به مسابقه دعوت کنی.")
    if is_cyber_restricted(m.from_user.id):
        return reply(m, cyber_restriction_text(m.from_user.id))
    if is_cyber_restricted(target["id"]):
        return reply(m, "🔒 این بازیکن فعلاً در محدودیت رقابتی است و نمی‌تواند مسابقه بپذیرد.")
    reply(m, card("ARENA | دعوت به مسابقه", f"🎯 حریف: <b>{nm(target)}</b>\n🎮 رشته مسابقه را انتخاب کن.\n⚽ فوتبال · 🏀 بسکتبال · 🎯 دارت · 🎳 بولینگ · 🎲 تاس · 🪙 شیر یا خط · ✊ سنگ‌کاغذقیچی\n\n🏅 مسابقه دوستانه و بدون شرط سکه است؛ برنده +۳۰ XP و یک برد، بازنده +۱۰ XP می‌گیرد."),
          pvp_game_markup(target["id"]))


@bot.message_handler(commands=["arena", "duel", "challenge"])
def cmd_arena_entry(m):
    cmd_arena(m)


@bot.callback_query_handler(func=lambda c: c.data.startswith(("pvpstart:", "pvpaccept:", "pvpreject:", "pvprps:")))
def pvp_callbacks(c):
    global PVP_COUNTER
    data = c.data or ""
    try: bot.answer_callback_query(c.id)
    except Exception: pass
    parts = data.split(":")
    if parts[0] == "pvpstart":
        try: target_id, game = int(parts[1]), parts[2]
        except (ValueError, IndexError): return
        if game not in PVP_GAME_DATA: return
        if c.from_user.id == target_id: return bot.answer_callback_query(c.id, "دعوت به خودت ممکن نیست.")
        if is_cyber_restricted(c.from_user.id) or is_cyber_restricted(target_id):
            return bot.answer_callback_query(c.id, "یکی از بازیکنان در محدودیت رقابتی است.")
        # پاک‌سازی دعوت‌های منقضی‌شده تا دیکشنری در اجرای طولانی رشد نکند.
        for old_cid, old_match in list(PVP_CHALLENGES.items()):
            if time.time() - old_match.get("created", 0) > 600:
                PVP_CHALLENGES.pop(old_cid, None)
        target = get_by_id(target_id)
        if not target: return bot.answer_callback_query(c.id, "حریف پیدا نشد.")
        PVP_COUNTER += 1
        cid = PVP_COUNTER
        PVP_CHALLENGES[cid] = {"challenger": c.from_user.id, "target": target_id,
                               "game": game, "created": time.time(), "rps": {}}
        emoji, title = PVP_GAME_DATA[game]
        kb = types.InlineKeyboardMarkup()
        kb.add(btn("✅ قبول مسابقه", f"pvpaccept:{cid}"), btn("❌ رد", f"pvpreject:{cid}"))
        try:
            bot.send_message(target_id,
                f"⚡ <b>دعوت به آرنا!</b>\n👤 دعوت‌کننده: <b>{esc(telegram_player_name(c.from_user))}</b>\n"
                f"🎮 بازی: <b>{title}</b>\nقبول می‌کنی؟\n⏳ اعتبار دعوت: ۲ دقیقه", parse_mode="HTML", reply_markup=kb)
            edit(c, f"✅ دعوت {title} برای حریف ارسال شد. منتظر پاسخ او بمان.", back_markup())
        except Exception:
            PVP_CHALLENGES.pop(cid, None)
            edit(c, "❌ نتوانستم به حریف پیام بدهم. او باید ابتدا /start را در ربات زده باشد.", back_markup())
        return
    if parts[0] in ("pvpaccept", "pvpreject"):
        try: cid = int(parts[1])
        except (ValueError, IndexError): return
        match = PVP_CHALLENGES.get(cid)
        if not match: return bot.answer_callback_query(c.id, "این دعوت دیگر فعال نیست.")
        if time.time() - match["created"] > 120:
            PVP_CHALLENGES.pop(cid, None)
            return edit(c, "⌛ زمان دعوت تمام شد.", back_markup())
        if c.from_user.id != match["target"]:
            return bot.answer_callback_query(c.id, "این دعوت برای حساب تو نیست.")
        if parts[0] == "pvpreject":
            PVP_CHALLENGES.pop(cid, None)
            try: bot.send_message(match["challenger"], "🏳️ دعوت مسابقه رد شد.")
            except Exception: pass
            return edit(c, "دعوت را رد کردی.", back_markup())
        if is_cyber_restricted(match["challenger"]) or is_cyber_restricted(match["target"]):
            PVP_CHALLENGES.pop(cid, None)
            return edit(c, "🔒 مسابقه به‌دلیل محدودیت رقابتی یکی از حساب‌ها لغو شد.", back_markup())
        if match["game"] == "rps":
            match["accepted"] = True
            kb = types.InlineKeyboardMarkup()
            kb.add(btn("✊ سنگ", f"pvprps:{cid}:rock"), btn("📄 کاغذ", f"pvprps:{cid}:paper"), btn("✂️ قیچی", f"pvprps:{cid}:scissors"))
            for uid in (match["challenger"], match["target"]):
                try: bot.send_message(uid, "✊ <b>سنگ، کاغذ، قیچی</b> — انتخابت را بزن:", parse_mode="HTML", reply_markup=kb)
                except Exception: pass
            return edit(c, "✅ مسابقه پذیرفته شد؛ هر دو بازیکن انتخاب کنند.", back_markup())
        edit(c, "✅ مسابقه پذیرفته شد؛ نتیجه در حال اجراست.", back_markup())
        _pvp_roll_match(cid)
        return
    if parts[0] == "pvprps":
        try: cid = int(parts[1]); choice = parts[2]
        except (ValueError, IndexError): return
        match = PVP_CHALLENGES.get(cid)
        if not match or not match.get("accepted"):
            return bot.answer_callback_query(c.id, "مسابقه فعال نیست.")
        if time.time() - match["created"] > 300:
            PVP_CHALLENGES.pop(cid, None)
            return bot.answer_callback_query(c.id, "زمان مسابقه تمام شده است؛ دوباره دعوت بفرست.")
        if c.from_user.id not in (match["challenger"], match["target"]):
            return bot.answer_callback_query(c.id, "این انتخاب برای تو نیست.")
        if choice not in ("rock", "paper", "scissors"):
            return
        match["rps"][c.from_user.id] = choice
        bot.answer_callback_query(c.id, "انتخاب ثبت شد.")
        if len(match["rps"]) < 2:
            return
        a_choice = match["rps"][match["challenger"]]
        b_choice = match["rps"][match["target"]]
        symbols = {"rock": "✊ سنگ", "paper": "📄 کاغذ", "scissors": "✂️ قیچی"}
        if a_choice == b_choice: winner_id = None
        elif (a_choice, b_choice) in (("rock", "scissors"), ("paper", "rock"), ("scissors", "paper")):
            winner_id = match["challenger"]
        else: winner_id = match["target"]
        awards = _pvp_award(match["challenger"], match["target"], winner_id)
        a = get_by_id(match["challenger"]); b = get_by_id(match["target"])
        result = (f"✊ <b>نتیجه سنگ، کاغذ، قیچی</b>\n"
                  f"{nm(a)}: {symbols[a_choice]}\n{nm(b)}: {symbols[b_choice]}\n"
                  f"━━━━━━━━━━━━━━\n{awards}\n"
                  "🪙 هیچ سکه‌ای از حساب بازیکن‌ها کم نشد.")
        PVP_CHALLENGES.pop(cid, None)
        _pvp_send_result(match, result)


@bot.callback_query_handler(func=lambda c: c.data.startswith("copyacct:"))
def copy_account_button(c):
    try:
        target_id = int(c.data.split(":", 1)[1])
    except ValueError:
        return bot.answer_callback_query(c.id, "شماره حساب نامعتبر است.")
    target = get_by_id(target_id)
    if not target or not target["account_no"]:
        return bot.answer_callback_query(c.id, "حساب پیدا نشد.")
    bot.answer_callback_query(c.id, "شماره حساب ارسال شد.")
    say(c.message.chat.id,
        f"🏦 شماره حساب {nm(target)} برای کپی:\n<code>{target['account_no']}</code>")


@bot.callback_query_handler(func=lambda c: c.data in ("bankstart", "bankconfirm", "bankcancel"))
def bank_flow_callback(c):
    uid = c.from_user.id
    if c.data == "bankstart":
        bank_transfer_state[uid] = {"step": "account"}
        bot.answer_callback_query(c.id)
        return say(c.message.chat.id, "🏦 شماره حساب ۸ رقمی مقصد را بفرست:", back_markup())
    if c.data == "bankcancel":
        bank_transfer_state.pop(uid, None)
        bot.answer_callback_query(c.id, "انتقال لغو شد.")
        return edit(c, "❌ انتقال لغو شد.", back_markup())
    state = bank_transfer_state.get(uid)
    if not state or state.get("step") != "confirm":
        return bot.answer_callback_query(c.id, "درخواست انتقال معتبر نیست؛ دوباره از بانک شروع کن.")
    account_no, amount = state["account_no"], state["amount"]
    bank_transfer_state.pop(uid, None)
    bot.answer_callback_query(c.id, "در حال انجام انتقال...")
    result = do_transfer(c.from_user, account_no, amount)
    return edit(c, result, back_markup())


@bot.callback_query_handler(func=lambda c: c.data.startswith("farm:"))
def farm_callback(c):
    action = c.data.split(":", 1)[1]
    if action not in ("collect", "upgrade", "upgrade5"):
        return bot.answer_callback_query(c.id, "درخواست نامعتبر است.")
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    if action in ("upgrade", "upgrade5"):
        get_player(c.from_user)
        result = upgrade_farm(c.from_user.id, FARM_MULTI_UPGRADE if action == "upgrade5" else 1)
        page, markup = farm_page(c.from_user)
        return edit(c, result + "\n\n" + page, markup)
    page, markup = farm_page(c.from_user)
    return edit(c, page, markup)


@bot.callback_query_handler(func=lambda c: c.data.startswith(("m:", "d:", "a:")))
def menu_router(c):
    kind, _, arg = c.data.partition(":")
    user, chat = c.from_user, c.message.chat.id
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    if kind == "m":
        if arg == "menu":
            edit(c, menu_text(user), main_markup(user.id))
        elif arg == "mine":
            edit(c, do_mine(user), result_markup("m:mine"))
        elif arg == "daily":
            edit(c, do_daily(user), back_markup())
        elif arg == "profile":
            edit(c, do_profile(user), back_markup())
        elif arg == "top":
            edit(c, do_top(), top_markup())
        elif arg == "bank":
            kb = types.InlineKeyboardMarkup()
            kb.add(btn("📤 انتقال سکه", "bankstart"))
            kb.add(btn("🧾 تاریخچه حساب", "m:history"), btn("🔙 منو", "m:menu"))
            edit(c, do_bank(user), kb)
        elif arg == "history":
            edit(c, do_history(user), back_markup())
        elif arg == "farm":
            farm_text_value, farm_kb = farm_page(user)
            edit(c, farm_text_value, farm_kb)
        elif arg == "wheel":
            edit(c, do_wheel(user), back_markup())
        elif arg == "vault":
            vault_text_value, vault_kb = vault_page(user)
            edit(c, vault_text_value, vault_kb)
        elif arg == "rps":
            edit(c, card("سنگ کاغذ قیچی", "✊ شرط رو انتخاب کن (حداکثر %d):" % ARCADE_MAX),
                 bet_markup("rb", [10, 50, 100, 500]))
        elif arg == "admin":
            if not ADMIN_ID or user.id != ADMIN_ID:
                return
            if c.message.chat.type != "private":
                return say(chat, "🔒 پنل ادمین فقط در گفت‌وگوی خصوصی قابل استفاده است.")
            if not ADMIN_PASSWORD:
                return say(chat, "⚠️ رمز ادمین در ابتدای فایل bot.py تنظیم نشده است.")
            until = admin_login_lockout.get(user.id, 0)
            if until > time.time():
                return say(chat, f"⏳ ورود موقتاً قفل است؛ {int(until - time.time())} ثانیه دیگر امتحان کن.")
            admin_flow_state[user.id] = {"step": "password", "attempts": 0,
                                         "chat_id": chat, "expires": time.time() + ADMIN_SESSION_SECONDS}
            return say(chat, "🔐 رمز پنل ادمین را بفرست. برای لغو /cancel را بزن.")
        elif arg == "referral":
            edit(c, referral_text(user), back_markup())
        elif arg == "help":
            edit(c, HELP_TEXT, back_markup())
        elif arg == "shop":
            p = get_player(user)
            edit(c, shop_text(p), shop_markup(p))
        elif arg == "slots":
            say(chat, do_slots(user, chat), result_markup("m:slots"))
        elif arg == "dice":
            edit(c, card("تاس", "🎲 شرط رو انتخاب کن:"), bet_markup("d", [10, 50, 100, 500]))
        elif arg == "arena":
            edit(c, card("آرنای دونفره", "برای دعوت حریف، آیدی عددی تلگرام یا شماره حساب ۸ رقمی را بفرست:\n<code>/arena 12345678</code>\n\nمسابقه‌ها بدون شرط‌بندی و بدون کم‌شدن موجودی بازیکن‌ها هستند؛ برنده XP دریافت می‌کند."), back_markup())
        elif arg == "games":
            edit(c, card("مرکز مینی‌گیم", "🎮 یک بازی انتخاب کن؛ اسلات رایگان هر ۶ ساعت یک‌بار قابل استفاده است."), games_markup())
        elif arg == "cyber":
            edit(c, card("💻 رویداد سایبری درون‌بازی",
                         f"هزینه ثابت: <b>{CYBER_COST:,} سکه</b>\n"
                         "🎯 هدف را با آیدی عددی تلگرام یا شماره حساب ۸ رقمی انتخاب کن.\n"
                         "🔒 اثر فقط آرنای دونفره هدف را دقیقاً ۲۴ ساعت می‌بندد.\n"
                         "✅ موجودی، بانک، انتقال، معدن، مزرعه و بقیه ربات دست‌نخورده می‌مانند.\n"
                         "🚫 ارتقا ندارد؛ هر بازیکن هر ۲۴ ساعت یک حمله می‌تواند انجام دهد.\n\n"
                         "دستور: <code>/cyber 12345678</code>"), back_markup())
        elif arg == "giftcodes":
            edit(c, giftcodes_page(user), back_markup())
        elif arg == "blackjack":
            text_value, markup_value = start_blackjack(user)
            edit(c, text_value, markup_value)
        elif arg == "roulette":
            say(chat, do_roulette(user), back_markup())
        elif arg == "guess":
            text_value, markup_value = start_guess(user)
            edit(c, text_value, markup_value)
        elif arg == "missions":
            mission_text, mission_kb = missions_page(user)
            edit(c, mission_text, mission_kb)
        elif arg == "achievements":
            edit(c, achievements_page(user), back_markup())
        elif arg == "market":
            edit(c, market_page(user), market_markup())
        elif arg == "crops":
            crop_text, crop_kb = crops_page(user)
            edit(c, crop_text, crop_kb)
        elif arg == "weekly":
            edit(c, weekly_page(user), back_markup())
        elif arg == "raffle":
            edit(c, raffle_page(user), raffle_markup())
        elif arg == "flip":
            edit(c, card("شیر یا خط", "🪙 شرط رو انتخاب کن:"), bet_markup("fb", [10, 50, 100, 500]))
        elif arg in ARCADE:
            _, title, _t = ARCADE[arg]
            edit(c, card(title, f"شرط رو انتخاب کن (حداکثر {ARCADE_MAX}):"),
                 bet_markup(f"x:{arg}", [10, 50, 100, 500]))
        return
    if not arg.isdigit() or not (0 < int(arg) < 10 ** MAX_DIGITS):
        return
    bet = int(arg)
    if kind == "d":
        say(chat, do_dice(user, chat, bet), result_markup(f"d:{bet}"))
    elif kind == "a":
        say(chat, do_arena(user, chat, bet), back_markup())


# ---------- بازی‌های جدید ----------
# بازی: (ایموجی تلگرام, اسم, {عدد تاس: ضریب برگشت کل شرط})
ARCADE = {
    "darts": ("🎯", "دارت", {6: 4, 5: 2}),
    "hoops": ("🏀", "بسکتبال", {5: 2.5, 4: 2.5}),
    "goal": ("⚽", "فوتبال", {5: 1.65, 4: 1.65, 3: 1.65}),
    "bowl": ("🎳", "بولینگ", {6: 5, 5: 1}),
}


def games_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🪙 شیر یا خط", "m:flip"), btn("🎯 دارت", "m:darts"))
    kb.add(btn("🏀 بسکتبال", "m:hoops"), btn("⚽ فوتبال", "m:goal"))
    kb.add(btn("🎳 بولینگ", "m:bowl"), btn("✊ سنگ کاغذ قیچی", "m:rps"))
    kb.add(btn("🃏 بلک‌جک تمرینی", "m:blackjack"), btn("🎡 رولت رایگان", "m:roulette"))
    kb.add(btn("🔢 حدس عدد", "m:guess"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def do_arcade(user, chat_id, game, bet):
    emoji, title, table = ARCADE[game]
    if bet > ARCADE_MAX:
        return f"❌ حداکثر شرط {title} {ARCADE_MAX} سکه‌ست."
    p = get_player(user)
    if p["coins"] < bet:
        return "❌ سکه کافی نداری."
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    if not spend(p["id"], bet):
        return "❌ سکه کافی نداری."
    v = roll(chat_id, emoji)
    time.sleep(4)
    mult = table.get(v, 0)
    if mult <= 0:
        return f"{emoji} {title}: نشد! 💀 <b>-{bet}</b> سکه"
    payout = int(bet * mult)
    add(p["id"], payout, 3 if payout > bet else 1)
    if payout <= bet:
        return f"{emoji} {title}: مساوی! 🤝 شرطت برگشت."
    return f"{emoji} {title}: عالی بود! 🎉 <b>+{payout - bet}</b> سکه"


def do_flip(user, side, bet):
    if bet > ARCADE_MAX:
        return f"❌ حداکثر شرط {ARCADE_MAX} سکه‌ست."
    p = get_player(user)
    if p["coins"] < bet:
        return "❌ سکه کافی نداری."
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    if not spend(p["id"], bet):
        return "❌ سکه کافی نداری."
    result = random.choice(["h", "t"])
    names = {"h": "🦅 شیر", "t": "🪙 خط"}
    head = f"🪙 سکه چرخید... <b>{names[result]}</b> اومد!\n{LINE}\n"
    if result == side:
        payout = bet * 19 // 10
        add(p["id"], payout, 2)
        if payout <= bet:
            return head + "🤝 شرطت برگشت."
        return head + f"🏆 بردی! <b>+{payout - bet}</b> سکه 🎉"
    return head + f"💀 باختی! <b>-{bet}</b> سکه"


@bot.message_handler(commands=["flip"])
def cmd_flip(m):
    bet = parse_amount(m)
    if bet is None:
        return reply(m, "بنویس: /flip 50")
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🦅 شیر", f"f:h:{bet}"), btn("🪙 خط", f"f:t:{bet}"))
    reply(m, card("شیر یا خط", f"💰 شرط: {bet}\nیکی رو انتخاب کن:"), kb)


@bot.message_handler(commands=list(ARCADE))
def cmd_arcade(m):
    game = (m.text or "").split()[0].lstrip("/").split("@")[0].lower()
    bet = parse_amount(m)
    if game not in ARCADE or bet is None:
        return reply(m, f"بنویس: /{game} 50")
    reply(m, do_arcade(m.from_user, m.chat.id, game, bet), result_markup(f"x:{game}:{bet}"))


@bot.callback_query_handler(func=lambda c: c.data.startswith(("fb:", "f:", "x:")))
def new_games_callback(c):
    parts = c.data.split(":")
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    chat = c.message.chat.id
    try:
        if parts[0] == "fb":
            bet = int(parts[1])
            kb = types.InlineKeyboardMarkup()
            kb.add(btn("🦅 شیر", f"f:h:{bet}"), btn("🪙 خط", f"f:t:{bet}"))
            kb.add(btn("🔙 منو", "m:menu"))
            return edit(c, card("شیر یا خط", f"💰 شرط: {bet}\nیکی رو انتخاب کن:"), kb)
        if parts[0] == "f":
            side, bet = parts[1], int(parts[2])
            if side not in ("h", "t") or not (0 < bet < 10 ** MAX_DIGITS):
                return
            return say(chat, do_flip(c.from_user, side, bet), result_markup(f"fb:{bet}"))
        game, bet = parts[1], int(parts[2])
        if game not in ARCADE or not (0 < bet < 10 ** MAX_DIGITS):
            return
        say(chat, do_arcade(c.from_user, chat, game, bet), result_markup(f"x:{game}:{bet}"))
    except (ValueError, IndexError):
        return


# ---------- فروشگاه ----------
def shop_text(p):
    return card("فروشگاه تجهیزات",
                f"💰 موجودی: <b>{p['coins']:,}</b> سکه\n\n"
                f"🥷 دزد: سطح {p['thief']} — سرقت عادی قوی‌تر با هر سطح\n"
                f"🧱 نگهبان: سطح {p['guard']} — محافظت در برابر سرقت عادی\n"
                f"⛏ کلنگ: سطح {p['pickaxe'] or 0} — +{PICKAXE_BONUS} سکه پایه در معدن\n\n"
                "💻 حمله سایبری ارتقا ندارد و همیشه ۲۵٬۰۰۰ سکه هزینه دارد.\n"
                "⚔️ شمشیر و زره از قدرت دوئل حذف شده‌اند.")


def shop_markup(p):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn(f"🥷 ارتقای دزد {p['thief']} — {price('thief', p)} سکه", "buy:thief"))
    kb.add(btn(f"🧱 ارتقای نگهبان {p['guard']} — {price('guard', p)} سکه", "buy:guard"))
    kb.add(btn(f"⛏ کلنگ {p['pickaxe'] or 0} — {price('pickaxe', p)} سکه", "buy:pickaxe"))
    kb.add(btn("💻 اطلاعات حمله سایبری", "m:cyber"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


@bot.message_handler(commands=["shop"])
def cmd_shop(m):
    p = get_player(m.from_user)
    reply(m, shop_text(p), shop_markup(p))


@bot.callback_query_handler(func=lambda c: c.data.startswith("buy:"))
def buy(c):
    kind = c.data.split(":")[1]
    if kind not in ("thief", "guard", "pickaxe"):
        return bot.answer_callback_query(c.id)
    with lock:
        p = get_player(c.from_user)
        if p[kind] >= MAX_UPGRADE:
            return bot.answer_callback_query(c.id, "به حداکثر سطح رسیدی!")
        cost = price(kind, p)
        if p["coins"] < cost:
            return bot.answer_callback_query(c.id, "سکه کافی نداری!")
        db.execute(f"UPDATE players SET coins=coins-?, {kind}={kind}+1 WHERE id=?",
                   (cost, p["id"]))
        db.commit()
        p = get_by_id(p["id"])
    bot.answer_callback_query(c.id, "✅ خریدی!")
    edit(c, shop_text(p), shop_markup(p))


# ---------- چرخ شانس ----------
def do_wheel(user):
    p = get_player(user)
    now = time.time()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        cur = db.execute("SELECT last_wheel FROM players WHERE id=?", (p["id"],)).fetchone()
        wait = WHEEL_COOLDOWN - (now - (cur["last_wheel"] or 0))
        if wait > 0:
            db.rollback()
            return f"⏳ چرخ شانس {int(wait // 3600)} ساعت و {int(wait % 3600 // 60)} دقیقه دیگه آماده می‌شه."
        label, coins, xp, _w = random.choices(WHEEL_PRIZES, weights=[w[3] for w in WHEEL_PRIZES])[0]
        db.execute("UPDATE players SET last_wheel=?, coins=coins+?, xp=xp+? WHERE id=?",
                   (now, coins, xp, p["id"]))
        db.commit()
    return (f"🎡 چرخ شانس چرخید...\n{LINE}\n🎁 جایزه: <b>{label}</b>\n"
            f"⭐ +{xp} امتیاز\n⏳ نوبت بعدی: {WHEEL_COOLDOWN // 3600} ساعت دیگه")


@bot.message_handler(commands=["wheel"])
def cmd_wheel(m):
    reply(m, do_wheel(m.from_user), back_markup())


# ---------- صندوق امن ----------
def vault_cap(p):
    return VAULT_BASE_CAP * (int(p["guard"] or 0) + 1)


def vault_page(user):
    p = get_player(user)
    cap = vault_cap(p)
    vault_now = int(p["vault"] or 0)
    body = (
        f"💰 سکه‌های جیبی (قابل دزدی): <b>{p['coins']}</b>\n"
        f"🔐 داخل صندوق امن (غیرقابل دزدی): <b>{vault_now}</b> / {cap}\n\n"
        "سکه‌هایی که توی صندوق باشن توسط دزدها دیده نمی‌شن.\n"
        "با ارتقای 🧱 نگهبان، ظرفیت صندوق ۱۰۰۰ تا بیشتر می‌شه.\n"
        "برای بازی، شرط‌بندی، خرید و انتقال باید اول سکه رو برداشت کنی."
    )
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("📥 واریز ۱۰۰", "v:dep:100"), btn("📥 واریز ۵۰۰", "v:dep:500"), btn("📥 واریز همه", "v:dep:all"))
    kb.add(btn("📤 برداشت ۱۰۰", "v:wd:100"), btn("📤 برداشت ۵۰۰", "v:wd:500"), btn("📤 برداشت همه", "v:wd:all"))
    kb.add(btn("🔙 منو", "m:menu"))
    return card("صندوق امن", body), kb


def vault_move(user, direction, amount):
    get_player(user)
    uid = user.id
    if amount != "all" and (not str(amount).isdigit() or len(str(amount)) > MAX_DIGITS):
        return "❌ مقدار نامعتبر است."
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT coins, vault, guard FROM players WHERE id=?", (uid,)).fetchone()
        if not row:
            db.rollback()
            return "❌ حساب پیدا نشد."
        coins, vault_now = int(row["coins"]), int(row["vault"] or 0)
        cap = vault_cap(row)
        if direction == "dep":
            free = max(0, cap - vault_now)
            n = min(coins, free) if amount == "all" else int(amount)
            if free <= 0:
                db.rollback()
                return f"❌ صندوق پر است ({vault_now}/{cap}). نگهبانت رو ارتقا بده تا ظرفیت بیشتر بشه."
            if n <= 0 or n > coins:
                db.rollback()
                return "❌ سکه کافی نداری."
            if n > free:
                db.rollback()
                return f"❌ ظرفیت صندوق کافی نیست؛ جای خالی: {free} سکه."
            db.execute("UPDATE players SET coins=coins-?, vault=COALESCE(vault,0)+? WHERE id=?", (n, n, uid))
            msg = f"✅ <b>{n}</b> سکه به صندوق امن رفت."
        else:
            n = vault_now if amount == "all" else int(amount)
            if n <= 0 or n > vault_now:
                db.rollback()
                return "❌ این مقدار داخل صندوق نیست."
            db.execute("UPDATE players SET coins=coins+?, vault=COALESCE(vault,0)-? WHERE id=?", (n, n, uid))
            msg = f"✅ <b>{n}</b> سکه از صندوق برداشتی."
        db.commit()
    return msg


@bot.message_handler(commands=["vault"])
def cmd_vault(m):
    text, kb = vault_page(m.from_user)
    reply(m, text, kb)


@bot.callback_query_handler(func=lambda c: c.data.startswith("v:"))
def vault_callback(c):
    parts = c.data.split(":")
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    if len(parts) != 3 or parts[1] not in ("dep", "wd"):
        return
    msg = vault_move(c.from_user, parts[1], parts[2])
    page, kb = vault_page(c.from_user)
    edit(c, msg + "\n\n" + page, kb)


# ---------- سنگ کاغذ قیچی ----------
RPS_SYMBOLS = {"r": ("🪨", "سنگ"), "p": ("📄", "کاغذ"), "s": ("✂️", "قیچی")}
RPS_BEATS = {"r": "s", "s": "p", "p": "r"}  # سنگ قیچی را می‌شکند، قیچی کاغذ را می‌برد، کاغذ سنگ را می‌پوشاند


def do_rps(user, choice, bet):
    if choice not in RPS_SYMBOLS:
        return "❌ انتخاب نامعتبر."
    if bet > ARCADE_MAX:
        return f"❌ حداکثر شرط {ARCADE_MAX} سکه‌ست."
    p = get_player(user)
    if p["coins"] < bet:
        return "❌ سکه کافی نداری."
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    if not spend(p["id"], bet):
        return "❌ سکه کافی نداری."
    bot_choice = random.choice(list(RPS_SYMBOLS))
    me_e, me_n = RPS_SYMBOLS[choice]
    bt_e, bt_n = RPS_SYMBOLS[bot_choice]
    head = f"{me_e} تو: <b>{me_n}</b>   🆚   {bt_e} ربات: <b>{bt_n}</b>\n{LINE}\n"
    if choice == bot_choice:
        add(p["id"], bet, 0)
        return head + "🤝 مساوی! شرطت برگشت."
    if RPS_BEATS[choice] == bot_choice:
        payout = bet * 19 // 10
        add(p["id"], payout, 2)
        if payout <= bet:
            return head + "🤝 شرطت برگشت."
        return head + f"🏆 بردی! <b>+{payout - bet}</b> سکه 🎉"
    return head + f"💀 باختی! <b>-{bet}</b> سکه"


def rps_choice_markup(bet):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🪨 سنگ", f"r:r:{bet}"), btn("📄 کاغذ", f"r:p:{bet}"), btn("✂️ قیچی", f"r:s:{bet}"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


@bot.message_handler(commands=["rps"])
def cmd_rps(m):
    bet = parse_amount(m)
    if bet is None:
        return reply(m, f"بنویس: /rps 50  (حداکثر {ARCADE_MAX})")
    reply(m, card("سنگ کاغذ قیچی", f"💰 شرط: {bet}\nیکی رو انتخاب کن:"), rps_choice_markup(bet))


@bot.callback_query_handler(func=lambda c: c.data.startswith(("rb:", "r:")))
def rps_callback(c):
    parts = c.data.split(":")
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    try:
        if parts[0] == "rb":
            bet = int(parts[1])
            if not (0 < bet < 10 ** MAX_DIGITS):
                return
            return edit(c, card("سنگ کاغذ قیچی", f"💰 شرط: {bet}\nیکی رو انتخاب کن:"), rps_choice_markup(bet))
        choice, bet = parts[1], int(parts[2])
        if choice not in RPS_SYMBOLS or not (0 < bet < 10 ** MAX_DIGITS):
            return
        say(c.message.chat.id, do_rps(c.from_user, choice, bet), result_markup(f"rb:{bet}"))
    except (ValueError, IndexError):
        return


# ---------- تب‌های لیدربورد ----------
@bot.callback_query_handler(func=lambda c: c.data.startswith("top:"))
def top_callback(c):
    kind = c.data.split(":", 1)[1]
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    if kind not in TOP_BOARDS:
        return
    edit(c, do_top(kind), top_markup(kind))


# ---------- ابزارهای ادمین: آمار، پیام همگانی، بازگردانی بکاپ ----------
def _is_admin_msg(m):
    return bool(ADMIN_ID and m.from_user and m.from_user.id == ADMIN_ID)


@bot.message_handler(commands=["stats"])
def cmd_stats(m):
    if not _is_admin_msg(m):
        return
    now = time.time()
    with lock:
        row = db.execute(
            "SELECT COUNT(*) AS n, COALESCE(SUM(coins),0) AS c, COALESCE(SUM(vault),0) AS v, "
            "COALESCE(MAX(farm_level),1) AS f, "
            "SUM(CASE WHEN last_mine > ? OR last_daily > ? OR last_wheel > ? THEN 1 ELSE 0 END) AS active "
            "FROM players", (now - 86400, now - 86400, now - 86400)).fetchone()
    reply(m, card("آمار بازی",
                  f"👥 تعداد بازیکنان: <b>{row['n']}</b>\n"
                  f"🟢 فعال در ۲۴ ساعت گذشته: <b>{row['active'] or 0}</b>\n"
                  f"💰 مجموع سکه‌های جیبی: <b>{row['c']}</b>\n"
                  f"🔐 مجموع سکه‌های صندوق: <b>{row['v']}</b>\n"
                  f"🌾 بالاترین سطح مزرعه: <b>{row['f']}</b>"))


@bot.message_handler(commands=["broadcast"])
def cmd_broadcast(m):
    if not _is_admin_msg(m) or m.chat.type != "private":
        return
    parts = (m.text or "").split(maxsplit=1)
    if len(parts) < 2 or not parts[1].strip():
        return reply(m, "فرمت: <code>/broadcast متن پیام</code>\nپیام برای همه‌ی بازیکنان فرستاده می‌شود.")
    text = "📢 " + parts[1].strip()
    with lock:
        ids = [r["id"] for r in db.execute("SELECT id FROM players").fetchall()]
    admin_chat = m.chat.id

    def _run():
        ok = fail = 0
        for pid in ids:
            try:
                bot.send_message(pid, text)  # بدون HTML تا متن ادمین باعث خطا نشود
                ok += 1
            except Exception:
                fail += 1
            time.sleep(0.05)
        try:
            bot.send_message(admin_chat, f"📢 ارسال تمام شد.\n✅ موفق: {ok}\n❌ ناموفق (بات رو بلاک کرده/استارت نکرده): {fail}")
        except Exception:
            pass

    threading.Thread(target=_run, daemon=True).start()
    reply(m, f"⏳ در حال ارسال برای {len(ids)} بازیکن...")


def restore_from_bytes(data):
    """دیتابیس زنده را با فایل بکاپ جایگزین می‌کند. قبلش از دیتابیس فعلی یک کپی ایمنی می‌گیرد."""
    if not data.startswith(b"SQLite format 3"):
        return False, "❌ این فایل یک دیتابیس SQLite معتبر نیست."
    tmp = DB_PATH + ".restore_tmp"
    safety = DB_PATH + ".before_restore"
    try:
        with open(tmp, "wb") as f:
            f.write(data)
        src_db = sqlite3.connect(tmp)
        try:
            has_table = src_db.execute(
                "SELECT 1 FROM sqlite_master WHERE type='table' AND name='players'").fetchone()
            if not has_table:
                return False, "❌ داخل این فایل جدول بازیکنان (players) نیست."
            count = src_db.execute("SELECT COUNT(*) FROM players").fetchone()[0]
            if count == 0:
                return False, "❌ این بکاپ هیچ بازیکنی ندارد؛ برای جلوگیری از خالی شدن بازی، بازگردانی انجام نشد."
            with lock:
                db.commit()
                keep = sqlite3.connect(safety)
                try:
                    db.backup(keep)
                finally:
                    keep.close()
                src_db.backup(db)
                init_schema()  # ستون‌های جدید روی بکاپ قدیمی هم اضافه می‌شود
        finally:
            src_db.close()
        _backup_state.update(hash=None)
        return True, f"✅ بازگردانی انجام شد؛ {count} بازیکن برگشت.\n(کپی ایمنی دیتابیس قبلی کنار فایل اصلی با پسوند .before_restore ذخیره شد.)"
    except Exception as e:
        return False, f"❌ بازگردانی ناموفق بود: {esc(e)}"
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass


def _restore_document(m, doc):
    if m.chat.type != "private":
        return reply(m, "🔒 بازگردانی فقط در چت خصوصی با ربات ممکن است.")
    if doc.file_size and doc.file_size > 20 * 1024 * 1024:
        return reply(m, "❌ حجم فایل بیشتر از حد مجاز تلگرام برای ربات‌هاست.")
    try:
        info = bot.get_file(doc.file_id)
        data = bot.download_file(info.file_path)
    except Exception as e:
        return reply(m, f"❌ دانلود فایل ناموفق بود: {esc(e)}")
    ok, msg = restore_from_bytes(data)
    reply(m, msg)
    if ok:
        threading.Thread(target=backup_to_telegram, kwargs={"force": True}, daemon=True).start()


@bot.message_handler(content_types=["document"],
                     func=lambda m: _is_admin_msg(m) and (m.caption or "").strip().lower().startswith("/restore"))
def restore_by_caption(m):
    _restore_document(m, m.document)


@bot.message_handler(commands=["restore"])
def cmd_restore(m):
    if not _is_admin_msg(m):
        return
    doc = m.reply_to_message.document if m.reply_to_message and m.reply_to_message.document else None
    if not doc:
        return reply(m, "فایل بکاپ (.db) را بفرست و در کپشنش بنویس <code>/restore</code>؛ "
                        "یا روی همان فایل ریپلای کن و /restore بزن.")
    _restore_document(m, doc)


# ================== امکانات افزوده‌شده نسخه توسعه‌یافته ==================
# بازی‌های شانسی جدید بدون شرط‌بندی: هیچ سکه‌ای برای ورود/چرخاندن/حدس‌زدن مصرف نمی‌شود.
BLACKJACK_STATES = {}
GUESS_STATES = {}
GUESS_COOLDOWN = 24 * 3600
FREE_ROULETTE_COOLDOWN = 24 * 3600
DAILY_MISSION_TARGET = 5
CROP_DATA = {
    "wheat": ("🌾 گندم", 5, 1),
    "fruit": ("🍎 میوه", 12, 3),
    "gold": ("🪙 طلایی", 25, 7),
}
MARKET_ITEMS = {
    "thief": ("🥷 دزد", "thief"),
    "guard": ("🧿 نگهبان", "guard"),
    "pickaxe": ("⛏ کلنگ", "pickaxe"),
}


def active_income_multiplier():
    with lock:
        row = db.execute("SELECT value FROM settings WHERE key='double_income_until'").fetchone()
    try:
        return 2 if row and float(row["value"]) > time.time() else 1
    except (TypeError, ValueError):
        return 1


def income_with_event(hourly_rate, start_at, end_at):
    """درآمد عادی + فقط بخش ساعاتی که واقعاً با رویداد ۲برابر هم‌پوشانی دارند."""
    base = max(0.0, float(end_at) - float(start_at)) * float(hourly_rate) / 3600.0
    with lock:
        start_row = db.execute("SELECT value FROM settings WHERE key='double_income_started'").fetchone()
        end_row = db.execute("SELECT value FROM settings WHERE key='double_income_until'").fetchone()
    try:
        event_start = float(start_row["value"]) if start_row else 0.0
        event_end = float(end_row["value"]) if end_row else 0.0
    except (TypeError, ValueError):
        event_start = event_end = 0.0
    overlap = max(0.0, min(float(end_at), event_end) - max(float(start_at), event_start))
    return int(base + overlap * float(hourly_rate) / 3600.0)


def utc_day_key(ts=None):
    return time.strftime("%Y-%m-%d", time.gmtime(time.time() if ts is None else ts))


def current_week_key(ts=None):
    dt = datetime.datetime.fromtimestamp(time.time() if ts is None else ts, tz=datetime.timezone.utc).date()
    monday = dt - datetime.timedelta(days=dt.weekday())
    return monday.isoformat()


def record_weekly_points(uid, points):
    if points <= 0:
        return
    key = current_week_key()
    with lock:
        db.execute("INSERT INTO weekly_points(user_id,week_key,points) VALUES(?,?,?) "
                   "ON CONFLICT(user_id,week_key) DO UPDATE SET points=points+excluded.points",
                   (uid, key, points))
        db.commit()


def update_daily_mine_progress(uid):
    key = utc_day_key()
    with lock:
        db.execute("INSERT INTO daily_progress(user_id,day_key,mine_count,claimed) VALUES(?,?,1,0) "
                   "ON CONFLICT(user_id,day_key) DO UPDATE SET mine_count=mine_count+1",
                   (uid, key))
        db.commit()


def missions_page(user):
    p = get_player(user)
    key = utc_day_key()
    with lock:
        db.execute("INSERT OR IGNORE INTO daily_progress(user_id,day_key,mine_count,claimed) VALUES(?,?,0,0)",
                   (p["id"], key))
        row = db.execute("SELECT mine_count,claimed FROM daily_progress WHERE user_id=? AND day_key=?",
                         (p["id"], key)).fetchone()
    count = int(row["mine_count"] or 0)
    claimed = bool(row["claimed"])
    status = "✅ تکمیل و دریافت شد" if claimed else ("🎉 آماده دریافت" if count >= DAILY_MISSION_TARGET else "⏳ در حال انجام")
    body = ("📋 ماموریت روزانه امروز (بر اساس UTC)\n" 
            f"⛏ پنج بار معدن کن: <b>{min(count, DAILY_MISSION_TARGET)}/{DAILY_MISSION_TARGET}</b>\n"
            f"وضعیت: <b>{status}</b>\n\n"
            "🎁 پاداش: ۲۵۰ سکه + ۲۵ XP\n"
            "پیشرفت فقط با دستور /mine یا دکمه معدن ثبت می‌شود.")
    kb = types.InlineKeyboardMarkup()
    if count >= DAILY_MISSION_TARGET and not claimed:
        kb.add(btn("🎁 دریافت پاداش ماموریت", "mission:claim"))
    kb.add(btn("🔙 منو", "m:menu"))
    return card("ماموریت روزانه", body), kb


def claim_daily_mission(user):
    p = get_player(user); key = utc_day_key()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT mine_count,claimed FROM daily_progress WHERE user_id=? AND day_key=?",
                         (p["id"], key)).fetchone()
        if not row or int(row["mine_count"] or 0) < DAILY_MISSION_TARGET:
            db.rollback(); return "❌ هنوز پنج بار معدن نکردی."
        if row["claimed"]:
            db.rollback(); return "✅ پاداش امروز را قبلاً گرفتی."
        db.execute("UPDATE daily_progress SET claimed=1 WHERE user_id=? AND day_key=?", (p["id"], key))
        db.execute("UPDATE players SET coins=coins+250,xp=xp+25 WHERE id=?", (p["id"],))
        db.commit()
    record_weekly_points(p["id"], 10)
    return "🎉 ماموریت کامل شد: +۲۵۰ سکه و +۲۵ XP"


ACHIEVEMENTS = [
    ("first_1000", "🪙 اولین ۱۰۰۰ سکه", "داشتن حداقل ۱۰۰۰ سکه در کیف", lambda p: p["coins"] >= 1000, 150, 20),
    ("level_10", "⭐ سطح ۱۰", "رسیدن به سطح ۱۰", lambda p: level(p) >= 10, 300, 50),
    ("farm_10", "🌾 کشاورز حرفه‌ای", "رسیدن مزرعه به سطح ۱۰", lambda p: p["farm_level"] >= 10, 300, 50),
    ("mine_50", "⛏ معدن‌کار", "۵۰ بار معدن‌کاری", lambda p: int(p["mine_count"] or 0) >= 50, 250, 35),
    ("wins_10", "🏆 مبارز", "ثبت ۱۰ برد", lambda p: p["wins"] >= 10, 250, 35),
]


def achievements_page(user):
    p = get_player(user)
    earned = []
    with lock:
        db.execute("BEGIN IMMEDIATE")
        for key, title, desc, condition, coins, xp_value in ACHIEVEMENTS:
            if condition(p):
                cur = db.execute("INSERT OR IGNORE INTO achievement_claims(user_id,achievement_key,claimed_at) VALUES(?,?,?)",
                                 (p["id"], key, time.time()))
                if cur.rowcount == 1:
                    db.execute("UPDATE players SET coins=coins+?,xp=xp+? WHERE id=?", (coins, xp_value, p["id"]))
                    earned.append(f"{title}: +{coins} سکه و +{xp_value} XP")
        db.commit()
        claimed = {r["achievement_key"] for r in db.execute("SELECT achievement_key FROM achievement_claims WHERE user_id=?",
                                                             (p["id"],)).fetchall()}
    lines = []
    for key, title, desc, condition, coins, xp_value in ACHIEVEMENTS:
        lines.append(("✅" if key in claimed else "🔒") + f" {title} — {desc}")
    if earned:
        lines.insert(0, "🎉 دستاورد جدید دریافت شد:\n" + "\n".join(earned) + "\n")
    return card("دستاوردها و مدال‌ها", "\n".join(lines) + "\n\nهر مدال فقط یک‌بار پاداش می‌دهد.")


def settle_previous_week():
    """تمام هفته‌های بسته‌نشده را یک‌بار تسویه می‌کند؛ حتی اگر سرور چند هفته خاموش بوده باشد."""
    now = time.time()
    current = current_week_key(now)
    with lock:
        keys = [r["week_key"] for r in db.execute(
            "SELECT DISTINCT w.week_key FROM weekly_points w "
            "LEFT JOIN weekly_awards a ON a.week_key=w.week_key "
            "WHERE w.week_key<? AND a.week_key IS NULL ORDER BY w.week_key ASC",
            (current,)
        ).fetchall()]
    all_winners = []
    for week_key in keys:
        with lock:
            # ممکن است درخواست /weekly و زمان‌بند هم‌زمان اجرا شوند؛ قبل از پرداخت دوباره بررسی می‌کنیم.
            if db.execute("SELECT 1 FROM weekly_awards WHERE week_key=?", (week_key,)).fetchone():
                continue
            rows = db.execute("SELECT user_id,points FROM weekly_points WHERE week_key=? "
                              "ORDER BY points DESC,user_id ASC LIMIT 3", (week_key,)).fetchall()
            db.execute("BEGIN IMMEDIATE")
            rewards = [1000, 500, 250]
            winners = []
            for i, row in enumerate(rows):
                prize = rewards[i]
                db.execute("UPDATE players SET coins=coins+?,xp=xp+? WHERE id=?",
                           (prize, 20 if i == 0 else 10, row["user_id"]))
                winners.append({"id": int(row["user_id"]), "points": int(row["points"]), "prize": prize})
            import json
            db.execute("INSERT OR IGNORE INTO weekly_awards(week_key,settled_at,winners) VALUES(?,?,?)",
                       (week_key, now, json.dumps(winners, ensure_ascii=False)))
            db.commit()
        for i, winner in enumerate(winners):
            try:
                bot.send_message(winner["id"],
                    f"🏆 جایزه رقابت هفتگی هفته {week_key}: رتبه {i+1} و +{winner['prize']} سکه دریافت کردی!")
            except Exception:
                pass
        all_winners.extend(winners)
    return all_winners or None


def weekly_page(user):
    get_player(user)
    settle_previous_week()
    key = current_week_key()
    with lock:
        rows = db.execute("SELECT w.user_id,w.points,p.name FROM weekly_points w JOIN players p ON p.id=w.user_id "
                          "WHERE w.week_key=? ORDER BY w.points DESC,w.user_id ASC LIMIT 10", (key,)).fetchall()
    lines = [f"{i+1}. {esc(r['name'])} — {r['points']} امتیاز" for i, r in enumerate(rows)]
    if not lines: lines = ["هنوز امتیازی ثبت نشده؛ معدن‌کاری، جایزه روزانه و جمع‌آوری مزرعه امتیاز می‌دهند."]
    return card("رقابت هفتگی", "هفته از دوشنبه (UTC) محاسبه می‌شود.\n\n" + "\n".join(lines) +
                "\n\n🥇 نفر اول هفته: ۱۰۰۰ سکه + ۲۰ XP\n🥈 نفر دوم: ۵۰۰ سکه + ۱۰ XP\n🥉 نفر سوم: ۲۵۰ سکه + ۱۰ XP\nجایزه پس از شروع هفته بعد و اولین بررسی رقابت پرداخت می‌شود.")


def settle_free_raffle(day_key):
    with lock:
        already = db.execute("SELECT 1 FROM free_raffle_draws WHERE day_key=?", (day_key,)).fetchone()
        if already: return None
        rows = db.execute("SELECT user_id FROM free_raffle_entries WHERE day_key=? ORDER BY user_id", (day_key,)).fetchall()
        if not rows: return None
        winner = random.choice(rows)["user_id"]
        prize = 800
        db.execute("BEGIN IMMEDIATE")
        db.execute("UPDATE players SET coins=coins+?,xp=xp+20 WHERE id=?", (prize, winner))
        db.execute("INSERT INTO free_raffle_draws(day_key,winner_id,prize,drawn_at) VALUES(?,?,?,?)",
                   (day_key, winner, prize, time.time()))
        db.commit()
    try: bot.send_message(winner, f"🎉 در قرعه‌کشی رایگان روز {day_key} برنده شدی: +{prize} سکه و +۲۰ XP!")
    except Exception: pass
    return winner


def settle_pending_raffles():
    today = utc_day_key()
    with lock:
        days = [r["day_key"] for r in db.execute(
            "SELECT DISTINCT e.day_key FROM free_raffle_entries e "
            "LEFT JOIN free_raffle_draws d ON d.day_key=e.day_key "
            "WHERE e.day_key<? AND d.day_key IS NULL ORDER BY e.day_key ASC", (today,)
        ).fetchall()]
    for day in days:
        settle_free_raffle(day)


def raffle_page(user):
    p = get_player(user)
    today = utc_day_key()
    yesterday = utc_day_key(time.time() - 86400)
    settle_free_raffle(yesterday)
    with lock:
        row = db.execute("SELECT 1 FROM free_raffle_entries WHERE day_key=? AND user_id=?", (today, p["id"])).fetchone()
        count = db.execute("SELECT COUNT(*) AS n FROM free_raffle_entries WHERE day_key=?", (today,)).fetchone()["n"]
        draw = db.execute("SELECT winner_id,prize FROM free_raffle_draws WHERE day_key=?", (yesterday,)).fetchone()
    last_line = ""
    if draw:
        winner_row = get_by_id(draw["winner_id"]) if draw["winner_id"] else None
        last_line = f"\nبرنده دیروز: {nm(winner_row) if winner_row else '—'} | جایزه {draw['prize']} سکه"
    kb = types.InlineKeyboardMarkup()
    if not row: kb.add(btn("🎟 شرکت رایگان امروز", "raffle:join"))
    kb.add(btn("🔙 منو", "m:menu"))
    return card("قرعه‌کشی رایگان", f"🎁 شرکت کاملاً رایگان است؛ خرید بلیت یا پرداخت سکه وجود ندارد.\nهر حساب روزی یک ورودی دارد.\n👥 شرکت‌کنندگان امروز: {count}\n" + ("✅ امروز ثبت‌نام کردی." if row else "برای ثبت ورودی رایگان دکمه را بزن.") + last_line), kb


def raffle_markup():
    kb = types.InlineKeyboardMarkup(); kb.add(btn("🎟 ثبت‌نام رایگان", "raffle:join")); kb.add(btn("🔙 منو", "m:menu")); return kb


# ---- سپرده بانکی با سود ثابت روزانه (بدون پول واقعی) ----
def get_deposit_balance(uid):
    now = time.time()
    with lock:
        db.execute("INSERT OR IGNORE INTO bank_deposits(user_id,amount,last_interest) VALUES(?,0,?)", (uid, now))
        row = db.execute("SELECT amount,last_interest FROM bank_deposits WHERE user_id=?", (uid,)).fetchone()
        days = max(0, int((now - row["last_interest"]) // 86400))
        compound_days = min(days, 3650)  # سقف محاسبات برای جلوگیری از حلقه بسیار بزرگ
        amount = int(row["amount"] or 0)
        for _ in range(compound_days):
            amount = min(MAX_SQLITE_INT, amount + amount * 2 // 100)
        if days:
            db.execute("UPDATE bank_deposits SET amount=?,last_interest=? WHERE user_id=?",
                       (amount, row["last_interest"] + days * 86400, uid))
        db.commit()  # حتی اگر سودی نرسیده باشد، تراکنش INSERT OR IGNORE بسته شود.
        return amount


def move_deposit(user, amount, withdraw=False):
    p = get_player(user)
    if amount <= 0 or amount > 999_999_999: return "❌ مبلغ باید عدد مثبت و حداکثر ۹ رقم باشد."
    get_deposit_balance(p["id"])
    with lock:
        db.execute("BEGIN IMMEDIATE")
        dep = db.execute("SELECT amount FROM bank_deposits WHERE user_id=?", (p["id"],)).fetchone()
        if withdraw:
            if not dep or dep["amount"] < amount:
                db.rollback(); return "❌ موجودی سپرده برای این برداشت کافی نیست."
            db.execute("UPDATE bank_deposits SET amount=amount-? WHERE user_id=?", (amount, p["id"]))
            db.execute("UPDATE players SET coins=coins+? WHERE id=?", (amount, p["id"]))
            text = f"✅ {amount} سکه از سپرده برداشت شد."
        else:
            cur = db.execute("UPDATE players SET coins=coins-? WHERE id=? AND coins>=?", (amount, p["id"], amount))
            if cur.rowcount != 1:
                db.rollback(); return "❌ سکه کافی در کیف نداری."
            db.execute("INSERT OR IGNORE INTO bank_deposits(user_id,amount,last_interest) VALUES(?,0,?)", (p["id"], time.time()))
            db.execute("UPDATE bank_deposits SET amount=amount+? WHERE user_id=?", (amount, p["id"]))
            text = f"✅ {amount} سکه به سپرده رفت. سود ساده‌شده روزانه ۲٪ است."
        db.commit()
    return text + f"\n🏛 موجودی سپرده: {get_deposit_balance(p['id'])} سکه"


@bot.message_handler(commands=["deposit", "withdraw"])
def cmd_deposit_withdraw(m):
    n = parse_amount(m)
    if n is None: return reply(m, "فرمت: <code>/deposit 500</code> یا <code>/withdraw 500</code>")
    reply(m, move_deposit(m.from_user, n, withdraw=(m.text.split()[0].lstrip("/").split("@")[0] == "withdraw")), back_markup())


# ---- بازار بازیکنان ----
def market_page(user):
    get_player(user)
    with lock:
        rows = db.execute("SELECT l.*,p.name FROM market_listings l JOIN players p ON p.id=l.seller_id WHERE l.active=1 ORDER BY l.id DESC LIMIT 10").fetchall()
    lines = []
    for r in rows:
        if r["item"] not in MARKET_ITEMS:
            continue
        title = MARKET_ITEMS[r["item"]][0]
        lines.append(f"#{r['id']} | {title} ×{r['quantity']} | هر عدد {r['unit_price']} سکه | فروشنده: {esc(r['name'])}")
    return card("بازار بازیکنان", "\n".join(lines) if lines else "فعلاً پیشنهادی برای فروش وجود ندارد.\nبرای فروش: /sell pickaxe 1 300\nبرای خرید: /buy شماره")


def market_markup():
    kb = types.InlineKeyboardMarkup(); kb.add(btn("🔄 تازه‌سازی بازار", "market:refresh")); kb.add(btn("🔙 منو", "m:menu")); return kb


@bot.message_handler(commands=["market"])
def cmd_market(m):
    reply(m, market_page(m.from_user), market_markup())


@bot.message_handler(commands=["sell"])
def cmd_sell(m):
    parts = (m.text or "").split()
    if len(parts) != 4: return reply(m, "فرمت: <code>/sell pickaxe 1 300</code>\nآیتم: thief, guard, pickaxe")
    item = parts[1].lower()
    try: qty, unit_price = int(parts[2]), int(parts[3])
    except ValueError: return reply(m, "❌ تعداد و قیمت باید عدد باشند.")
    if item not in MARKET_ITEMS or not (1 <= qty <= 1000) or not (1 <= unit_price <= 999_999_999):
        return reply(m, "❌ آیتم، تعداد یا قیمت معتبر نیست.")
    p = get_player(m.from_user); col = MARKET_ITEMS[item][1]
    with lock:
        db.execute("BEGIN IMMEDIATE")
        cur = db.execute(f"UPDATE players SET {col}={col}-? WHERE id=? AND {col}>=?", (qty, p["id"], qty))
        if cur.rowcount != 1:
            db.rollback(); return reply(m, "❌ به این تعداد از آن آیتم برای فروش نداری.")
        db.execute("INSERT INTO market_listings(seller_id,item,quantity,unit_price,created_at,active) VALUES(?,?,?,?,?,1)",
                   (p["id"], item, qty, unit_price, time.time()))
        listing_id = db.execute("SELECT last_insert_rowid()").fetchone()[0]
        db.commit()
    reply(m, f"✅ پیشنهاد فروش #{listing_id} ثبت شد: {MARKET_ITEMS[item][0]} ×{qty}، هر عدد {unit_price} سکه.")


@bot.message_handler(commands=["buy"])
def cmd_buy(m):
    parts = (m.text or "").split()
    if len(parts) != 2 or not parts[1].isdigit(): return reply(m, "فرمت: <code>/buy 12</code>")
    uid = m.from_user.id; listing_id = int(parts[1]); get_player(m.from_user)
    with lock:
        db.execute("BEGIN IMMEDIATE")
        listing = db.execute("SELECT * FROM market_listings WHERE id=? AND active=1", (listing_id,)).fetchone()
        if not listing: db.rollback(); return reply(m, "❌ این پیشنهاد دیگر فعال نیست.")
        if listing["seller_id"] == uid: db.rollback(); return reply(m, "❌ نمی‌توانی پیشنهاد خودت را بخری.")
        total = int(listing["quantity"]) * int(listing["unit_price"])
        if total > MAX_SQLITE_INT: db.rollback(); return reply(m, "❌ قیمت بیش از حد مجاز است.")
        seller_balance = db.execute("SELECT coins FROM players WHERE id=?", (listing["seller_id"],)).fetchone()["coins"]
        if seller_balance > MAX_SQLITE_INT - total: db.rollback(); return reply(m, "❌ موجودی فروشنده به سقف عددی رسیده؛ خرید ممکن نیست.")
        cur = db.execute("UPDATE players SET coins=coins-? WHERE id=? AND coins>=?", (total, uid, total))
        if cur.rowcount != 1: db.rollback(); return reply(m, "❌ سکه کافی نداری.")
        if listing["item"] not in MARKET_ITEMS:
            db.rollback(); return reply(m, "❌ این نوع کالا از فروشگاه حذف شده است.")
        col = MARKET_ITEMS[listing["item"]][1]
        db.execute(f"UPDATE players SET {col}={col}+? WHERE id=?", (listing["quantity"], uid))
        db.execute("UPDATE players SET coins=coins+? WHERE id=?", (total, listing["seller_id"]))
        db.execute("UPDATE market_listings SET active=0 WHERE id=? AND active=1", (listing_id,))
        db.commit()
    reply(m, f"✅ خرید انجام شد: {MARKET_ITEMS[listing['item']][0]} ×{listing['quantity']} برای {total} سکه.")
    try: bot.send_message(listing["seller_id"], f"🛍 پیشنهاد #{listing_id} فروخته شد؛ {total} سکه دریافت کردی.")
    except Exception: pass


# ---- محصولات مزرعه با آب‌وهوا ----
def crops_page(user):
    p = get_player(user)
    now = time.time()
    with lock:
        db.execute("INSERT OR IGNORE INTO farm_crop_state(user_id,crop,last_claim) VALUES(?, 'wheat', ?)", (p["id"], now))
        row = db.execute("SELECT crop,last_claim FROM farm_crop_state WHERE user_id=?", (p["id"],)).fetchone()
        db.commit()
    name, rate, required_level = CROP_DATA[row["crop"]]
    hours = max(0, min(24, int((now - row["last_claim"]) // 3600)))
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🌾 گندم", "crop:choose:wheat"), btn("🍎 میوه", "crop:choose:fruit"))
    kb.add(btn("🪙 محصول طلایی", "crop:choose:gold"))
    kb.add(btn("📦 برداشت محصول", "crop:collect"), btn("🔙 منو", "m:menu"))
    body = (f"محصول فعلی: <b>{name}</b>\nدرآمد پایه: {rate * max(1,p['farm_level'])} سکه/ساعت\n"
            f"زمان آماده برداشت: {hours} ساعت\nمزرعه لازم برای میوه: سطح ۳؛ محصول طلایی: سطح ۷\n"
            "در برداشت، ممکن است خشکسالی (۵۰٪ درآمد) یا باران (۱۵۰٪ درآمد) رخ دهد.\n"
            "این درآمد جدا از درآمد اصلی مزرعه محاسبه می‌شود؛ حداکثر ۲۴ ساعت ذخیره می‌شود.")
    return card("محصولات مزرعه", body), kb


def choose_crop(user, crop):
    p = get_player(user)
    if crop not in CROP_DATA: return "❌ محصول نامعتبر است."
    _, _, req = CROP_DATA[crop]
    if p["farm_level"] < req: return f"🔒 برای این محصول مزرعه سطح {req} لازم است."
    with lock:
        db.execute("INSERT OR IGNORE INTO farm_crop_state(user_id,crop,last_claim) VALUES(?, 'wheat', ?)", (p["id"], time.time()))
        db.execute("UPDATE farm_crop_state SET crop=?,last_claim=? WHERE user_id=?", (crop, time.time(), p["id"]))
        db.commit()
    return f"✅ محصول مزرعه به {CROP_DATA[crop][0]} تغییر کرد. زمان درآمد از همین لحظه محاسبه می‌شود."


def collect_crop(user):
    p = get_player(user); now = time.time()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT crop,last_claim FROM farm_crop_state WHERE user_id=?", (p["id"],)).fetchone()
        if not row:
            db.execute("INSERT INTO farm_crop_state(user_id,crop,last_claim) VALUES(?, 'wheat', ?)", (p["id"], now))
            db.commit(); return "🌾 مزرعه کاشته شد؛ یک ساعت دیگر برای برداشت برگرد."
        elapsed = max(0, now - row["last_claim"]); hours = min(24, int(elapsed // 3600))
        if hours <= 0: db.rollback(); return "⏳ هنوز یک ساعت کامل نگذشته؛ بعداً برداشت کن."
        _, rate, _ = CROP_DATA[row["crop"]]
        event = random.random()
        if event < .15: factor, weather = .5, "☀️ خشکسالی؛ درآمد نصف شد"
        elif event < .40: factor, weather = 1.5, "🌧 باران؛ درآمد ۵۰٪ بیشتر شد"
        else: factor, weather = 1.0, "🌤 هوای عادی"
        new_crop_clock = now if now - row["last_claim"] > 24 * 3600 else row["last_claim"] + hours * 3600
        reward = income_with_event(rate * max(1, p["farm_level"]) * factor, row["last_claim"], row["last_claim"] + hours * 3600)
        db.execute("UPDATE players SET coins=coins+? WHERE id=?", (reward, p["id"]))
        db.execute("UPDATE farm_crop_state SET last_claim=? WHERE user_id=?", (new_crop_clock, p["id"]))
        db.commit()
    record_weekly_points(p["id"], 3)
    return f"✅ برداشت {CROP_DATA[row['crop']][0]}: +{reward} سکه\n{weather}\nساعت‌های ذخیره‌شده: {hours}"


@bot.message_handler(commands=["crops"])
def cmd_crops(m):
    text, kb = crops_page(m.from_user); reply(m, text, kb)


# ---- بلک‌جک تمرینی و رایگان ----
def bj_card(): return random.choice([1,2,3,4,5,6,7,8,9,10,10,10,10])
def bj_total(cards):
    total = sum(cards); aces = cards.count(1)
    while total <= 11 and aces > 0: total += 10; aces -= 1
    return total

def blackjack_markup(uid):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🃏 کارت بگیر", "bj:hit"), btn("✋ توقف", "bj:stand"))
    kb.add(btn("🔙 منو", "m:menu")); return kb

def blackjack_text(state, reveal=False):
    mine = bj_total(state["player"]); dealer = bj_total(state["dealer"] if reveal else state["dealer"][:1])
    return card("بلک‌جک تمرینی", f"دست تو: <b>{state['player']}</b> = {mine}\nدست ربات: <b>{state['dealer'] if reveal else str(state['dealer'][:1]) + ' + ❓'}</b> = {dealer if reveal else '؟'}\n\nاین بازی تمرینی و رایگان است؛ سکه‌ای شرط‌بندی نمی‌شود.")

def start_blackjack(user):
    uid = user.id; get_player(user)
    state = {"player": [bj_card(), bj_card()], "dealer": [bj_card(), bj_card()], "done": False}
    BLACKJACK_STATES[uid] = state
    if bj_total(state["player"]) == 21:
        state["done"] = True; add(uid, 0, 10)
        return blackjack_text(state, True) + "\n🎉 بلک‌جک! +۱۰ XP", result_markup()
    return blackjack_text(state), blackjack_markup(uid)


@bot.message_handler(commands=["blackjack", "bj"])
def cmd_blackjack(m):
    text_value, markup_value = start_blackjack(m.from_user)
    reply(m, text_value, markup_value)


def play_blackjack(user, action):
    uid = user.id; state = BLACKJACK_STATES.get(uid)
    if not state or state.get("done"): return "❌ دست فعالی نداری؛ /blackjack را بزن."
    if action == "hit":
        state["player"].append(bj_card())
        if bj_total(state["player"]) < 22:
            return blackjack_text(state), blackjack_markup(uid)
    # پایان با توقف یا رد شدن از ۲۱
    if bj_total(state["player"]) <= 21:
        while bj_total(state["dealer"]) < 17: state["dealer"].append(bj_card())
    mine = bj_total(state["player"]); dealer = bj_total(state["dealer"])
    state["done"] = True
    if mine <= 21 and (dealer > 21 or mine > dealer):
        add(uid, 0, 10); result = "🏆 بردی! +۱۰ XP"
    elif mine == dealer:
        add(uid, 0, 3); result = "🤝 مساوی! +۳ XP"
    else: result = "این دست را باختی؛ دفعه بعد تلاش کن."
    return blackjack_text(state, True) + "\n" + result, result_markup()


# ---- رولت رایگان روزانه؛ بدون شرط و پرداخت سکه ----
def do_roulette(user):
    p = get_player(user); now = time.time()
    with lock:
        row = db.execute("SELECT last_at FROM free_roulette_claims WHERE user_id=?", (p["id"],)).fetchone()
        last_at = row["last_at"] if row else 0
        remaining = FREE_ROULETTE_COOLDOWN - (now - last_at)
        if remaining > 0: return f"⏳ رولت رایگان بعدی تا {int(remaining//3600)} ساعت و {int(remaining%3600//60)} دقیقه دیگر آماده می‌شود."
        color = random.choice(["قرمز", "سیاه", "سبز"])
        reward = {"قرمز": 5, "سیاه": 10, "سبز": 20}[color]
        db.execute("INSERT OR REPLACE INTO free_roulette_claims(user_id,last_at) VALUES(?,?)", (p["id"], now))
        db.execute("UPDATE players SET xp=xp+? WHERE id=?", (reward, p["id"]))
        db.commit()
    return f"🎡 رولت رایگان: خانه <b>{color}</b> آمد! +{reward} XP\nبدون شرط‌بندی و بدون هزینه ورودی."


@bot.message_handler(commands=["roulette"])
def cmd_roulette(m):
    reply(m, do_roulette(m.from_user), back_markup())


# ---- حدس عدد روزانه، پاداش XP ثابت ----
def start_guess(user):
    uid=user.id; p=get_player(user); now=time.time()
    if uid in GUESS_STATES:
        kb=types.InlineKeyboardMarkup(); kb.add(*[btn(str(x), f"guess:{x}") for x in range(1,6)]); kb.add(*[btn(str(x), f"guess:{x}") for x in range(6,11)])
        return "یک دور حدس عدد در حال انجام داری؛ عددی بین ۱ تا ۱۰ انتخاب کن.", kb
    with lock:
        row=db.execute("SELECT value FROM settings WHERE key=?", (f"guess_last_{uid}",)).fetchone()
        last=float(row["value"]) if row else 0
        if now-last < GUESS_COOLDOWN: return f"⏳ حدس رایگان بعدی {int((GUESS_COOLDOWN-(now-last))//3600)} ساعت دیگر آماده است.", back_markup()
        db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)", (f"guess_last_{uid}", str(now)))
        db.commit()
    GUESS_STATES[uid]={"number":random.randint(1,10),"tries":0}
    kb=types.InlineKeyboardMarkup(); kb.add(*[btn(str(x), f"guess:{x}") for x in range(1,6)]); kb.add(*[btn(str(x), f"guess:{x}") for x in range(6,11)])
    return card("حدس عدد", "یک عدد بین ۱ تا ۱۰ انتخاب کن.\n۵ تلاش داری؛ با پاسخ درست +۱۰ XP می‌گیری. این بازی رایگان است."), kb


@bot.message_handler(commands=["guess"])
def cmd_guess(m):
    text_value, markup_value = start_guess(m.from_user)
    reply(m, text_value, markup_value)


# ---- کد هدیه ----
@bot.message_handler(commands=["redeem"])
def cmd_redeem(m):
    parts=(m.text or "").split()
    if len(parts)!=2: return reply(m, "فرمت: <code>/redeem CODE</code>")
    uid=m.from_user.id; p=get_player(m.from_user); code=parts[1].upper()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        gift=db.execute("SELECT * FROM gift_codes WHERE code=? AND active=1", (code,)).fetchone()
        if not gift: db.rollback(); return reply(m, "❌ کد معتبر یا فعال نیست.")
        if gift["uses"]>=gift["max_uses"]: db.rollback(); return reply(m, "❌ ظرفیت استفاده از این کد تمام شده.")
        balance = db.execute("SELECT coins,xp FROM players WHERE id=?", (uid,)).fetchone()
        if balance["coins"] > MAX_SQLITE_INT - gift["coins"] or balance["xp"] > MAX_SQLITE_INT - gift["xp"]:
            db.rollback(); return reply(m, "❌ پاداش کد از ظرفیت عددی حساب بیشتر است.")
        try: db.execute("INSERT INTO gift_redemptions(code,user_id,redeemed_at) VALUES(?,?,?)", (code,uid,time.time()))
        except sqlite3.IntegrityError: db.rollback(); return reply(m, "❌ این کد را قبلاً استفاده کرده‌ای.")
        db.execute("UPDATE gift_codes SET uses=uses+1 WHERE code=?", (code,))
        db.execute("UPDATE players SET coins=coins+?,xp=xp+? WHERE id=?", (gift["coins"],gift["xp"],uid))
        db.commit()
    updated = get_by_id(uid)
    lv, progress, needed = level_progress(updated["xp"])
    with lock:
        usage = db.execute("SELECT uses,max_uses FROM gift_codes WHERE code=?", (code,)).fetchone()
    refresh_gift_announcement(code)
    reply(m, f"🎁 کد پذیرفته شد!\n🪙 +{gift['coins']:,} سکه | ⭐ +{gift['xp']:,} XP\n"
             f"🏅 سطح فعلی: <b>{lv}/100</b>\n"
             f"📊 پیشرفت سطح: {progress}/{needed if lv < 100 else 'MAX'} XP\n"
             f"👥 تعداد استفاده از کد: <b>{usage['uses']}/{usage['max_uses']}</b>")


def giftcodes_page(user):
    get_player(user)
    with lock:
        rows = db.execute("SELECT code,coins,xp,max_uses,uses,active FROM gift_codes ORDER BY created_at DESC LIMIT 20").fetchall()
    if not rows:
        body = "هنوز کد هدیه‌ای ساخته نشده است."
    else:
        lines = []
        for row in rows:
            remaining = max(0, int(row["max_uses"]) - int(row["uses"]))
            status = "✅ قابل استفاده" if row["active"] and remaining > 0 else "⛔ ظرفیت تکمیل/غیرفعال"
            lines.append(f"🎁 <code>{esc(row['code'])}</code> — {status}\n"
                         f"🪙 پاداش: <b>{row['coins']:,} سکه</b>  ·  ⭐ <b>{row['xp']:,} XP</b>\n"
                         f"👥 استفاده‌شده: <b>{row['uses']}/{row['max_uses']}</b>  ·  باقیمانده: <b>{remaining}</b>\n"
                         f"📥 دریافت: <code>/redeem {esc(row['code'])}</code>")
        body = "\n\n".join(lines)
    return card("تابلوی عمومی کدهای هدیه", body + "\n\nسطح از ۱ تا ۱۰۰ است؛ سطح بعدی هر بار XP بیشتری می‌خواهد. پس از هر استفاده، شمارنده پیام سنجاق‌شده هم به‌روزرسانی می‌شود.")


@bot.message_handler(commands=["giftcodes", "gifts"])
def cmd_giftcodes(m):
    reply(m, giftcodes_page(m.from_user), back_markup())


@bot.message_handler(commands=["setgiftchannel"])
def cmd_set_gift_channel(m):
    global ANNOUNCEMENT_CHAT_ID
    if not ADMIN_ID or not m.from_user or m.from_user.id != ADMIN_ID:
        return reply(m, "⛔ فقط ادمین می‌تواند گروه اطلاع‌رسانی را تنظیم کند.")
    if m.chat.type not in ("group", "supergroup"):
        return reply(m, "این دستور را داخل گروه/سوپرگروهی اجرا کن که ربات در آن اجازه ارسال و سنجاق پیام دارد.")
    ANNOUNCEMENT_CHAT_ID = str(m.chat.id)
    with lock:
        db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES('announcement_chat_id',?)", (ANNOUNCEMENT_CHAT_ID,))
        active_codes = db.execute("SELECT code FROM gift_codes WHERE active=1 AND uses<max_uses ORDER BY created_at DESC LIMIT 20").fetchall()
        db.commit()
    published = 0
    for code_row in active_codes:
        code_value = code_row["code"]
        try:
            announcement = bot.send_message(ANNOUNCEMENT_CHAT_ID, gift_announcement_text(code_value), parse_mode="HTML")
            with lock:
                db.execute("INSERT OR REPLACE INTO gift_announcement_refs(code,chat_id,message_id) VALUES(?,?,?)",
                           (code_value, ANNOUNCEMENT_CHAT_ID, int(announcement.message_id)))
                db.commit()
            try:
                bot.pin_chat_message(ANNOUNCEMENT_CHAT_ID, announcement.message_id, disable_notification=True)
            except Exception as pin_error:
                print("gift code pin failed:", pin_error)
            published += 1
        except Exception as announce_error:
            print("gift code publish failed:", announce_error)
    reply(m, f"✅ این گروه به‌عنوان تابلوی عمومی کدهای هدیه ثبت شد.\n📌 تعداد کدهای فعال منتشرشده: {published}\nاز این به بعد کدهای جدید هم ارسال و سنجاق می‌شوند؛ ربات باید مدیر و دارای اجازه Pin باشد.")


# ---- قرعه‌کشی آزاد و بدون بلیت پولی ----
@bot.message_handler(commands=["raffle"])
def cmd_raffle(m):
    txt,kb=raffle_page(m.from_user); reply(m,txt,kb)


# ---- فرمان‌های ماموریت، نشان و رقابت ----
@bot.message_handler(commands=["missions"])
def cmd_missions(m):
    txt,kb=missions_page(m.from_user); reply(m,txt,kb)

@bot.message_handler(commands=["achievements"])
def cmd_achievements(m): reply(m, achievements_page(m.from_user), back_markup())

@bot.message_handler(commands=["weekly"])
def cmd_weekly(m): reply(m, weekly_page(m.from_user), back_markup())


# ---- callback های افزوده‌شده ----
@bot.callback_query_handler(func=lambda c: c.data.startswith(("mission:", "raffle:", "bj:", "guess:", "crop:", "market:")))
def extended_callbacks(c):
    data=c.data; user=c.from_user
    try: bot.answer_callback_query(c.id)
    except Exception: pass
    if data == "mission:claim":
        msg=claim_daily_mission(user); txt,kb=missions_page(user); return edit(c,msg+"\n\n"+txt,kb)
    if data == "raffle:join":
        day=utc_day_key(); uid=user.id; get_player(user)
        with lock:
            db.execute("INSERT OR IGNORE INTO free_raffle_entries(day_key,user_id,joined_at) VALUES(?,?,?)", (day,uid,time.time()))
            db.commit()
        txt,kb=raffle_page(user); return edit(c,"✅ ورودی رایگان امروزت ثبت شد.\n\n"+txt,kb)
    if data.startswith("bj:"):
        action=data.split(":",1)[1]
        result=play_blackjack(user,action)
        if isinstance(result,tuple): return edit(c,result[0],result[1])
        return edit(c,result,back_markup())
    if data.startswith("guess:"):
        uid=user.id; state=GUESS_STATES.get(uid)
        try: guess=int(data.split(":")[1])
        except ValueError: return
        if not state or guess<1 or guess>10: return bot.answer_callback_query(c.id,"اول /guess را بزن.")
        state["tries"]+=1
        target=state["number"]
        if guess==target:
            add(uid,0,10); GUESS_STATES.pop(uid,None)
            return edit(c,card("حدس عدد",f"🎉 درست حدس زدی! عدد {target} بود. +۱۰ XP"),result_markup())
        if state["tries"]>=5:
            GUESS_STATES.pop(uid,None)
            return edit(c,card("حدس عدد",f"این دور تمام شد. عدد {target} بود؛ فردا دوباره رایگان بازی کن."),result_markup())
        direction="بزرگ‌تر" if guess<target else "کوچک‌تر"
        kb=types.InlineKeyboardMarkup(); kb.add(*[btn(str(x), f"guess:{x}") for x in range(1,6)]); kb.add(*[btn(str(x), f"guess:{x}") for x in range(6,11)])
        return edit(c, card("حدس عدد", f"❌ درست نبود؛ عدد مخفی {direction} است.\nتلاش: {state['tries']}/5"), kb)
    if data.startswith("crop:"):
        parts=data.split(":")
        if len(parts)==3 and parts[1]=="choose":
            msg=choose_crop(user,parts[2]); txt,kb=crops_page(user); return edit(c,msg+"\n\n"+txt,kb)
        if len(parts)==2 and parts[1]=="collect":
            msg=collect_crop(user); txt,kb=crops_page(user); return edit(c,msg+"\n\n"+txt,kb)
    if data=="market:refresh": return edit(c,market_page(user),market_markup())




if __name__ == "__main__":
    try:
        bot.set_my_commands([
            types.BotCommand("start", "🎮 منوی اصلی"),
            types.BotCommand("mine", "⛏ جمع کردن سکه"),
            types.BotCommand("farm", "🌾 مزرعه و درآمد ساعتی"),
            types.BotCommand("wheel", "🎡 چرخ شانس رایگان"),
            types.BotCommand("vault", "🔐 صندوق امن (ضد دزدی)"),
            types.BotCommand("rps", "✊ سنگ کاغذ قیچی (مثلاً /rps 50)"),
            types.BotCommand("admin", "⚙️ پنل ادمین (فقط مدیر)"),
            types.BotCommand("daily", "🎁 جایزه روزانه"),
            types.BotCommand("profile", "👤 پروفایل"),
            types.BotCommand("top", "🏆 برترین‌ها + شماره حساب"),
            types.BotCommand("bank", "🏦 شماره حساب و موجودی"),
            types.BotCommand("transfer", "📤 انتقال سکه با شماره حساب"),
            types.BotCommand("history", "🧾 تاریخچه انتقال و دزدی"),
            types.BotCommand("invite", "🎟 لینک دعوت و پاداش ۵۰۰ سکه‌ای"),
            types.BotCommand("missions", "📋 ماموریت روزانه"),
            types.BotCommand("achievements", "🏅 دستاوردها و مدال‌ها"),
            types.BotCommand("weekly", "🏆 رقابت هفتگی"),
            types.BotCommand("raffle", "🎟 قرعه‌کشی رایگان"),
            types.BotCommand("blackjack", "🃏 بلک‌جک تمرینی رایگان"),
            types.BotCommand("roulette", "🎡 رولت رایگان روزانه"),
            types.BotCommand("guess", "🔢 حدس عدد روزانه"),
            types.BotCommand("market", "🛍 بازار بازیکنان"),
            types.BotCommand("crops", "🌱 محصولات مزرعه"),
            types.BotCommand("deposit", "🏛 سپرده‌گذاری"),
            types.BotCommand("withdraw", "🏛 برداشت سپرده"),
            types.BotCommand("redeem", "🎁 کد هدیه"),
            types.BotCommand("shop", "🛒 ارتقای دزد، نگهبان و کلنگ"),
            types.BotCommand("dice", "🎲 تاس (مثلاً /dice 50)"),
            types.BotCommand("slots", "🎰 اسلات رایگان هر ۶ ساعت"),
            types.BotCommand("arena", "🎯 دعوت به آرنای دونفره با آیدی/شماره حساب"),
            types.BotCommand("cyber", "💻 حمله سایبری درون‌بازی (۲۵۰۰۰ سکه)"),
            types.BotCommand("giftcodes", "🎁 کدهای هدیه و شمارنده استفاده"),
            types.BotCommand("setgiftchannel", "📌 تنظیم گروه عمومی کد هدیه (ادمین)"),
            types.BotCommand("flip", "🪙 شیر یا خط (مثلاً /flip 50)"),
            types.BotCommand("darts", "🎯 دارت"),
            types.BotCommand("hoops", "🏀 بسکتبال"),
            types.BotCommand("goal", "⚽ فوتبال"),
            types.BotCommand("bowl", "🎳 بولینگ"),
            types.BotCommand("duel", "⚔️ دوئل (ریپلای + /duel 50)"),
            types.BotCommand("steal", "🥷 دزدی با شماره حساب"),
            types.BotCommand("give", "🎁 سکه دادن (ریپلای + /give 50)"),
            types.BotCommand("help", "❓ راهنما"),
        ])
    except Exception as e:
        print("set_my_commands failed:", e)
    def backup_loop():
        while True:
            time.sleep(300)
            try:
                backup_to_telegram()
                settle_pending_raffles()
                settle_previous_week()
            except Exception as e:
                print("scheduled tasks failed:", e)

    def _on_term(signum, frame):
        # هاست موقع آپدیت SIGTERM می‌فرسته؛ قبل از خاموشی آخرین بکاپ رو می‌فرستیم.
        try:
            backup_to_telegram(force=True)
        finally:
            os._exit(0)

    try:
        signal.signal(signal.SIGTERM, _on_term)
    except Exception:
        pass
    threading.Thread(target=backup_loop, daemon=True).start()
    threading.Thread(target=backup_to_telegram, daemon=True).start()
    with lock:
        _n_players = db.execute("SELECT COUNT(*) AS n FROM players").fetchone()["n"]
    print(f"Bot is running... DB: {DB_PATH} | players: {_n_players} | admin: {ADMIN_ID or 'تنظیم نشده'}")
    bot.infinity_polling()
