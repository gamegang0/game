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
    "last_wheel REAL DEFAULT 0", "vault INTEGER DEFAULT 0", "vault_level INTEGER DEFAULT 0",
    "mine_count INTEGER DEFAULT 0",
    "last_slots REAL DEFAULT 0",
    "last_cyber REAL DEFAULT 0",
    "cyber_lock_until REAL DEFAULT 0",
    "cyber_attacker_id INTEGER DEFAULT 0", "cyber_attacker_name TEXT DEFAULT ''",
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
        # بازار و محصولات مزرعه حذف شده‌اند؛ جدول‌های قدیمی این دو قابلیت هم پاک می‌شوند.
        db.execute("DROP TABLE IF EXISTS market_listings")
        db.execute("DROP TABLE IF EXISTS farm_crop_state")
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
        # شرط‌های در جریان به‌صورت امانی نگهداری می‌شوند؛ اگر سرور وسط بازی ری‌استارت شود،
        # همه شرط‌های باقی‌مانده در شروع بعدی به صاحبانشان برگردانده می‌شود.
        db.execute("""CREATE TABLE IF NOT EXISTS wager_escrows(
            escrow_id TEXT PRIMARY KEY, user_id INTEGER NOT NULL, amount INTEGER NOT NULL, created_at REAL NOT NULL)""")
        stale_escrows = db.execute("SELECT user_id, amount FROM wager_escrows").fetchall()
        for escrow in stale_escrows:
            db.execute("UPDATE players SET coins=MIN(?, coins+?) WHERE id=?",
                       (9_223_372_036_854_775_807, int(escrow["amount"]), int(escrow["user_id"])))
        db.execute("DELETE FROM wager_escrows")
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


# این فیلترها قبل از همه هندلرها ثبت می‌شوند تا بن و محدودیت سایبری سراسری باشند.
RESTRICTED_MESSAGE_TYPES = [
    "text", "audio", "document", "animation", "game", "photo", "sticker",
    "video", "video_note", "voice", "location", "contact", "venue", "dice",
    "new_chat_members", "left_chat_member", "new_chat_title", "new_chat_photo",
    "delete_chat_photo", "group_chat_created", "supergroup_chat_created",
    "channel_chat_created", "migrate_to_chat_id", "migrate_from_chat_id",
    "pinned_message", "invoice", "successful_payment", "connected_website",
    "poll", "passport_data", "proximity_alert_triggered", "video_chat_scheduled",
    "video_chat_started", "video_chat_ended", "video_chat_participants_invited",
    "web_app_data", "message_auto_delete_timer_changed", "forum_topic_created",
    "forum_topic_closed", "forum_topic_reopened", "forum_topic_edited",
    "general_forum_topic_hidden", "general_forum_topic_unhidden",
    "write_access_allowed", "user_shared", "chat_shared", "story",
]


@bot.message_handler(
    func=lambda m: bool(m.from_user and (is_banned(m.from_user.id) or is_cyber_restricted(m.from_user.id))),
    content_types=RESTRICTED_MESSAGE_TYPES,
)
def block_restricted_message(m):
    if is_banned(m.from_user.id):
        return reply(m, "⛔ دسترسی این حساب به بازی توسط مدیریت مسدود شده است.")
    reply(m, cyber_restriction_text(m.from_user.id))


@bot.callback_query_handler(func=lambda c: bool(c.from_user and (is_banned(c.from_user.id) or is_cyber_restricted(c.from_user.id))))
def block_restricted_callback(c):
    if is_banned(c.from_user.id):
        return bot.answer_callback_query(c.id, "⛔ دسترسی این حساب مسدود است.", show_alert=True)
    player = get_by_id(c.from_user.id)
    attacker = (player["cyber_attacker_name"] or "نامشخص") if player else "نامشخص"
    attacker_id = int(player["cyber_attacker_id"] or 0) if player else 0
    attacker_player = get_by_id(attacker_id) if attacker_id else None
    attacker_account = (attacker_player["account_no"] or "—") if attacker_player else "—"
    short_text = f"🔒 دسترسی محدود است | حمله‌کننده: {attacker} | حساب: {attacker_account}"
    bot.answer_callback_query(c.id, short_text[:195], show_alert=True)


@bot.message_handler(commands=["market", "sell", "buy", "crops"])
def removed_market_products_commands(m):
    return reply(m, "🗑 بخش‌های بازار و محصولات از بازی حذف شده‌اند.", main_markup(m.from_user.id))


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
bank_action_state = {}  # user_id -> {step: deposit | withdraw | steal}
name_setup_state = set()  # برای سازگاری با نشست‌های قدیمی؛ دیگر نام دستی گرفته نمی‌شود
admin_flow_state = {}  # فقط ادمین: ورود رمز -> شماره حساب/آیدی -> مقدار XP
admin_login_lockout = {}  # جلوگیری از حدس‌زدن رمز
BOT_BET_INPUT = {}       # user_id -> {game, created}
BOT_CHOICE_PENDING = {}  # user_id -> {game, bet, created}
PVP_BET_INPUT = {}       # user_id -> {target_id, game, created}

MAX_SQLITE_INT = 9_223_372_036_854_775_807  # must be defined before ARCADE_MAX
MINE_COOLDOWN = 60
DAILY_COOLDOWN = 24 * 3600
STEAL_COOLDOWN = 15 * 60  # هر ۱۵ دقیقه یک‌بار
TRANSFER_FEE_PERCENT = 0
DAILY_REWARD = 200
ARENA_MAX = 200
EQUIPMENT_MAX_LEVEL = 100  # دزد، نگهبان و کلنگ تا سطح ۱۰۰
VAULT_MAX_LEVEL = 20       # صندوق امن جداگانه تا سطح ۲۰
MAX_UPGRADE = EQUIPMENT_MAX_LEVEL  # سازگاری با نسخه‌های قدیمی
ARCADE_MAX = MAX_SQLITE_INT  # محدودیت فقط موجودی بازیکن و ظرفیت SQLite است
SLOT_COST = 0  # متغیر قدیمی؛ مبلغ شرط اسلات را بازیکن خودش وارد می‌کند
SLOTS_COOLDOWN = 6 * 3600
CYBER_COST = 50_000
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
    kb.add(btn("⛏️ | معدن سکه", "m:mine"), btn("🎁 | جایزه روزانه", "m:daily"))
    kb.add(btn("👑 پروفایل من", "m:profile"), btn("🏆 تالار قهرمانان", "m:top"))
    kb.add(btn("⚔️ میدان آرنا", "m:arena"), btn("🟥 عملیات سایبری", "m:cyber"))
    kb.add(btn("🎰 جکپات اسلات", "m:slots"), btn("🕹️ سالن آرکید", "m:games"))
    kb.add(btn("⚒️ کارگاه ارتقای تجهیزات", "m:shop"))
    kb.add(btn("🏛 خزانه و بانک", "m:bank"), btn("📜 سوابق تراکنش", "m:history"))
    kb.add(btn("🌿 امپراتوری مزرعه", "m:farm"))
    kb.add(btn("✨ گردونه شانس", "m:wheel"), btn("🛡 گاوصندوق امن", "m:vault"))
    kb.add(btn("🧭 مأموریت‌های ویژه", "m:missions"), btn("🎖 کلکسیون افتخارات", "m:achievements"))
    kb.add(btn("🥇 لیگ هفتگی", "m:weekly"), btn("🎟 بخت‌آزمایی رایگان", "m:raffle"))
    kb.add(btn("🎁 جعبه کدهای هدیه", "m:giftcodes"), btn("🤝 دعوت هم‌تیمی‌ها", "m:referral"))
    if ADMIN_ID and user_id == ADMIN_ID:
        kb.add(btn("🔴 مرکز فرماندهی ادمین", "m:admin"))
    kb.add(btn("📖 راهنمای بازی", "m:help"))
    if CHANNEL_URL:
        kb.add(types.InlineKeyboardButton("📢 کانال ما", url=CHANNEL_URL))
    return kb


def back_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def admin_actions_markup():
    """انتخاب عملیات پنل ادمین با دکمه‌های شیشه‌ای."""
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🪙 مدیریت موجودی", "adminop:coins"), btn("⭐ مدیریت تجربه", "adminop:xp"))
    kb.add(btn("🚫 محدودسازی حساب", "adminop:ban"), btn("🟢 آزادسازی حساب", "adminop:unban"))
    kb.add(btn("🎁 صدور کد هدیه", "adminop:gift"), btn("🗑 ابطال کد هدیه", "adminop:gift_delete"))
    kb.add(btn("⚡ فعال‌سازی رویداد دوبرابر", "adminop:event"))
    kb.add(btn("❌ بستن پنل", "adminop:cancel"))
    return kb


def admin_prompt_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("❌ لغو این عملیات", "adminop:cancel_operation"))
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
    """تا پایان زمان قفل سایبری، تمام پیام‌ها و دکمه‌های بازیکن مسدود می‌شوند."""
    player = get_by_id(uid)
    return bool(player and float(player["cyber_lock_until"] or 0) > time.time())


def cyber_restriction_text(uid):
    player = get_by_id(uid)
    until = float(player["cyber_lock_until"] or 0) if player else 0
    if until <= time.time():
        return "✅ محدودیت حمله سایبری تمام شده است."
    left = max(0, int(until - time.time()))
    attacker_name = (player["cyber_attacker_name"] or "نامشخص") if player else "نامشخص"
    attacker_id = int(player["cyber_attacker_id"] or 0) if player else 0
    attacker = get_by_id(attacker_id) if attacker_id else None
    attacker_account = attacker["account_no"] if attacker else "—"
    return (f"🔒 دسترسی شما به تمام امکانات ربات مسدود است.\n"
            f"👤 حمله‌کننده: <b>{esc(attacker_name)}</b>\n"
            f"🏦 شماره حساب حمله‌کننده: <code>{esc(attacker_account)}</code>\n"
            f"⏰ پایان محرومیت: <b>{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(until))}</b>\n"
            f"⏳ زمان باقی‌مانده: {left // 3600} ساعت و {(left % 3600) // 60} دقیقه.\n"
            "💻 این محرومیت کامل، تا ۲۴ ساعت بعد از حمله ادامه دارد.")


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


def _new_escrow_id(prefix, key):
    return f"{prefix}:{key}:{time.time_ns()}:{random.getrandbits(32)}"


def reserve_wager(uid, amount, escrow_id):
    """شرط را اتمیک از کیف پول کم و به‌صورت امانی ثبت می‌کند."""
    amount = int(amount)
    if amount <= 0 or amount > MAX_SQLITE_INT:
        return False, "❌ مبلغ شرط معتبر نیست."
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT coins FROM players WHERE id=?", (int(uid),)).fetchone()
        if not row:
            db.rollback()
            return False, "❌ حساب بازیکن پیدا نشد."
        balance = int(row["coins"] or 0)
        if balance < amount:
            db.rollback()
            return False, f"❌ موجودی کیف پولت {balance:,} سکه است؛ شرط کمتر وارد کن."
        # از سرریز SQLite در پرداخت احتمالیِ دوبرابر جلوگیری می‌کنیم.
        if balance + amount > MAX_SQLITE_INT:
            db.rollback()
            return False, "❌ این مبلغ از سقف قابل پشتیبانی کیف پول بیشتر است."
        db.execute("UPDATE players SET coins=coins-? WHERE id=?", (amount, int(uid)))
        db.execute("INSERT INTO wager_escrows(escrow_id,user_id,amount,created_at) VALUES(?,?,?,?)",
                   (str(escrow_id), int(uid), amount, time.time()))
        db.commit()
    return True, ""


def refund_wager(escrow_id):
    """شرط امانی را در صورت لغو یا خطای اجرا کامل برمی‌گرداند."""
    if not escrow_id:
        return False
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT user_id,amount FROM wager_escrows WHERE escrow_id=?",
                         (str(escrow_id),)).fetchone()
        if not row:
            db.rollback()
            return False
        db.execute("UPDATE players SET coins=MIN(?,coins+?) WHERE id=?",
                   (MAX_SQLITE_INT, int(row["amount"]), int(row["user_id"])))
        db.execute("DELETE FROM wager_escrows WHERE escrow_id=?", (str(escrow_id),))
        db.commit()
    return True


def settle_bot_wager(uid, escrow_id, outcome, xp=0):
    """win: سود خالص به‌اندازه شرط؛ draw: بازگشت شرط؛ lose: شرط از دست می‌رود."""
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT amount FROM wager_escrows WHERE escrow_id=? AND user_id=?",
                         (str(escrow_id), int(uid))).fetchone()
        if not row:
            db.rollback()
            return "⚠️ شرط قبلاً تسویه شده یا پیدا نشد."
        amount = int(row["amount"])
        payout = amount * 2 if outcome == "win" else amount if outcome == "draw" else 0
        if payout:
            db.execute("UPDATE players SET coins=MIN(?,coins+?), xp=xp+? WHERE id=?",
                       (MAX_SQLITE_INT, payout, int(xp), int(uid)))
        else:
            db.execute("UPDATE players SET xp=xp+? WHERE id=?", (int(xp), int(uid)))
        if outcome == "win":
            db.execute("UPDATE players SET wins=wins+1 WHERE id=?", (int(uid),))
        elif outcome == "lose":
            db.execute("UPDATE players SET losses=losses+1 WHERE id=?", (int(uid),))
        db.execute("DELETE FROM wager_escrows WHERE escrow_id=?", (str(escrow_id),))
        db.commit()
    if outcome == "win":
        return f"💰 شرط {amount:,} برگشت و {amount:,} سکه سود گرفتی؛ سود خالص: +{amount:,} سکه."
    if outcome == "draw":
        return f"🤝 شرط {amount:,} سکه به کیف پولت برگشت؛ نه سود کردی نه ضرر."
    return f"💸 این دور باختی؛ {amount:,} سکه شرط از دست رفت."


def reserve_pvp_wagers(challenge_id, challenger_id, target_id, amount):
    """فقط هنگام قبول دعوت، شرط هر دو بازیکن یک‌جا و اتمیک رزرو می‌شود."""
    amount = int(amount)
    ids = (int(challenger_id), int(target_id))
    escrow_ids = [f"pvp:{int(challenge_id)}:{uid}" for uid in ids]
    with lock:
        db.execute("BEGIN IMMEDIATE")
        rows = db.execute("SELECT id,coins FROM players WHERE id IN (?,?)", ids).fetchall()
        balances = {int(r["id"]): int(r["coins"] or 0) for r in rows}
        if len(balances) != 2:
            db.rollback()
            return False, "❌ یکی از حساب‌های مسابقه پیدا نشد."
        for uid in ids:
            if balances[uid] < amount:
                db.rollback()
                role = "دعوت‌کننده" if uid == ids[0] else "تو"
                return False, f"❌ موجودی {role} برای شرط {amount:,} سکه کافی نیست؛ دعوت لغو شد."
            if balances[uid] + amount > MAX_SQLITE_INT:
                db.rollback()
                return False, "❌ این مبلغ از سقف قابل پشتیبانی کیف پول بیشتر است."
        for uid, escrow_id in zip(ids, escrow_ids):
            db.execute("UPDATE players SET coins=coins-? WHERE id=?", (amount, uid))
            db.execute("INSERT INTO wager_escrows(escrow_id,user_id,amount,created_at) VALUES(?,?,?,?)",
                       (escrow_id, uid, amount, time.time()))
        db.commit()
    return True, escrow_ids


def refund_pvp_wagers(challenge):
    for uid in (challenge.get("challenger"), challenge.get("target")):
        if uid is not None:
            refund_wager(f"pvp:{int(challenge['id'])}:{int(uid)}")


def settle_pvp_wagers(challenge, winner_id):
    """دو شرط در صورت برد به برنده می‌رسد؛ در مساوی هر دو شرط بازمی‌گردد."""
    a_id, b_id = int(challenge["challenger"]), int(challenge["target"])
    bet = int(challenge["bet"])
    escrow_ids = [f"pvp:{int(challenge['id'])}:{a_id}", f"pvp:{int(challenge['id'])}:{b_id}"]
    with lock:
        db.execute("BEGIN IMMEDIATE")
        escrows = db.execute("SELECT escrow_id,user_id,amount FROM wager_escrows WHERE escrow_id IN (?,?)",
                             tuple(escrow_ids)).fetchall()
        if len(escrows) != 2:
            db.rollback()
            return "⚠️ شرط‌ها پیدا نشدند؛ برای جلوگیری از پرداخت تکراری، تسویه انجام نشد."
        if winner_id is None:
            db.execute("UPDATE players SET coins=MIN(?,coins+?) WHERE id=?",
                       (MAX_SQLITE_INT, bet, a_id))
            db.execute("UPDATE players SET coins=MIN(?,coins+?) WHERE id=?",
                       (MAX_SQLITE_INT, bet, b_id))
            outcome_text = f"🤝 مساوی شد؛ شرط {bet:,} سکه هر دو نفر کامل برگشت."
        elif int(winner_id) in (a_id, b_id):
            loser_id = b_id if int(winner_id) == a_id else a_id
            db.execute("UPDATE players SET coins=MIN(?,coins+?), xp=xp+30, wins=wins+1 WHERE id=?",
                       (MAX_SQLITE_INT, bet * 2, int(winner_id)))
            db.execute("UPDATE players SET xp=xp+10, losses=losses+1 WHERE id=?", (loser_id,))
            outcome_text = (f"🏆 برنده {nm(get_by_id(int(winner_id)))} شد و مجموع شرط‌ها یعنی "
                            f"{bet*2:,} سکه را گرفت؛ سود خالص برنده +{bet:,} سکه است.\n"
                            f"💸 بازنده {bet:,} سکه از دست داد.")
        else:
            db.rollback()
            return "❌ برنده مسابقه معتبر نیست."
        db.execute("DELETE FROM wager_escrows WHERE escrow_id IN (?,?)", tuple(escrow_ids))
        db.commit()
    try:
        if winner_id is None:
            record_weekly_points(a_id, 2); record_weekly_points(b_id, 2)
        else:
            record_weekly_points(int(winner_id), 10)
            record_weekly_points(b_id if int(winner_id) == a_id else a_id, 2)
    except Exception:
        pass
    return outcome_text


def parse_bet_argument(m):
    parts = (m.text or "").split()
    if len(parts) == 1:
        return None
    if len(parts) != 2:
        return False
    raw = parts[1].translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    raw = raw.replace(",", "").replace("٬", "").replace(" ", "")
    if not raw.isdigit() or len(raw) > 19 or int(raw) <= 0 or int(raw) > MAX_SQLITE_INT:
        return False
    return int(raw)


def ask_bot_bet(chat_id, user, game):
    PVP_BET_INPUT.pop(user.id, None)
    BOT_CHOICE_PENDING.pop(user.id, None)
    BOT_BET_INPUT[user.id] = {"game": game, "created": time.time()}
    bank_transfer_state.pop(user.id, None)
    bank_action_state.pop(user.id, None)
    PVP_TARGET_INPUT.pop(user.id, None)
    return say(chat_id, f"💰 مبلغ شرط بازی <b>{esc(game)}</b> را به سکه وارد کن.\n"
                    "هر مبلغ مثبتی تا سقف موجودی کیف پولت قابل قبول است. برای لغو /cancel را بزن.", back_markup())


def bot_choice_markup(game):
    kb = types.InlineKeyboardMarkup()
    if game == "flip":
        kb.add(btn("🦅 شیر", "bg:flip:h"), btn("🪙 خط", "bg:flip:t"))
    elif game == "rps":
        kb.add(btn("🪨 سنگ", "bg:rps:r"), btn("📄 کاغذ", "bg:rps:p"), btn("✂️ قیچی", "bg:rps:s"))
    elif game == "roulette":
        kb.add(btn("🔴 قرمز", "bg:roulette:red"), btn("⚫ سیاه", "bg:roulette:black"))
        kb.add(btn("🟢 سبز", "bg:roulette:green"))
    kb.add(btn("❌ لغو", "bg:cancel"))
    return kb


def play_bot_game(chat_id, user, game, bet):
    if game == "dice":
        return say(chat_id, do_dice(user, chat_id, bet), result_markup("m:dice"))
    if game == "slots":
        return say(chat_id, do_slots(user, chat_id, bet), result_markup("m:slots"))
    if game in ARCADE:
        return say(chat_id, do_arcade(user, chat_id, game, bet), result_markup("m:games"))
    if game in ("flip", "rps", "roulette"):
        BOT_CHOICE_PENDING[user.id] = {"game": game, "bet": int(bet), "created": time.time()}
        titles = {"flip": "شیر یا خط", "rps": "سنگ کاغذ قیچی", "roulette": "رولت رنگی"}
        return say(chat_id, card(titles[game], f"💰 شرط: <b>{int(bet):,} سکه</b>\nانتخابت را بزن:"), bot_choice_markup(game))
    if game == "blackjack":
        text_value, markup_value = start_blackjack(user, bet)
        return say(chat_id, text_value, markup_value)
    if game == "guess":
        text_value, markup_value = start_guess(user, bet)
        return say(chat_id, text_value, markup_value)
    return say(chat_id, "❌ بازی نامعتبر است.", back_markup())


def launch_free_bot_game(chat_id, user, game):
    # نام تابع برای سازگاری حفظ شده؛ اکنون همه بازی‌های حریف‌محور شرط دلخواه دارند.
    return ask_bot_bet(chat_id, user, game)


@bot.message_handler(func=lambda m: m.from_user and m.from_user.id in BOT_BET_INPUT, content_types=["text"])
def bot_bet_input(m):
    uid = m.from_user.id
    state = BOT_BET_INPUT.get(uid)
    if not state:
        return
    raw = (m.text or "").strip()
    if raw.lower() in ("/cancel", "لغو", "انصراف"):
        BOT_BET_INPUT.pop(uid, None)
        return reply(m, "❌ شرط بازی لغو شد.", back_markup())
    if raw.startswith("/"):
        BOT_BET_INPUT.pop(uid, None)
        return reply(m, "❌ شرط بازی لغو شد؛ برای شروع دوباره بازی را انتخاب کن.", back_markup())
    if time.time() - state.get("created", 0) > 180:
        BOT_BET_INPUT.pop(uid, None)
        return reply(m, "⌛ زمان واردکردن مبلغ تمام شد؛ بازی را دوباره انتخاب کن.", back_markup())
    normalized = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    normalized = normalized.replace(",", "").replace("٬", "").replace(" ", "")
    if not normalized.isdigit() or len(normalized) > 19 or int(normalized) <= 0 or int(normalized) > MAX_SQLITE_INT:
        return reply(m, "❌ مبلغ باید یک عدد مثبت باشد. دوباره وارد کن یا /cancel بزن:")
    bet = int(normalized)
    p = get_player(m.from_user)
    if int(p["coins"] or 0) < bet:
        return reply(m, f"❌ موجودی کیف پولت {int(p['coins']):,} سکه است؛ مبلغ کمتری وارد کن:")
    game = state["game"]
    BOT_BET_INPUT.pop(uid, None)
    return play_bot_game(m.chat.id, m.from_user, game, bet)


def parse_amount(m, index=1):
    parts = (m.text or "").split()
    if len(parts) <= index:
        return None
    s = parts[index].translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789")).replace(",", "").replace("٬", "")
    if not s.isdigit() or len(s) > 19:
        return None
    n = int(s)
    return n if 0 < n <= MAX_SQLITE_INT else None


def too_fast(uid, secs=6):
    now = time.time()
    if now - last_action.get(uid, 0) < secs:
        return True
    last_action[uid] = now
    return False


def roll(chat_id, emoji="🎲"):
    return bot.send_dice(chat_id, emoji=emoji).dice.value





def price(kind, p):
    bases = {"thief": 250, "guard": 250, "pickaxe": 400, "vault": 500}
    current_level = int(p["vault_level"] or 0) if kind == "vault" else int(p[kind] or 0)
    return bases[kind] * (current_level + 1)


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
    kb.add(btn("🌾 برداشت محصول و درآمد", "farm:collect"))
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
            f"🔐 صندوق امن: سطح {p['vault_level'] or 0}/{VAULT_MAX_LEVEL} — {p['vault'] or 0} سکه  |  🔥 رکورد روزانه: {p['daily_streak'] or 0} روز\n"
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
                "از دکمه‌های شیشه‌ای زیر برای انتقال، سپرده‌گذاری، برداشت یا دزدی استفاده کن.\n"
                "برای انتقال، شماره حساب مقصد و مبلغ را وارد و در پایان تأیید کن.\n"
                "برای دزدی، شماره حساب ۸ رقمی بازیکن مقصد را وارد کن.\n\n"
                "این شماره فقط حساب داخل بازی است و به حساب بانکی واقعی ارتباطی ندارد.")


def bank_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("💸 انتقال بین‌حسابی", "bankstart"))
    kb.add(btn("📥 سرمایه‌گذاری سپرده", "bankop:deposit"), btn("📤 برداشت سپرده", "bankop:withdraw"))
    kb.add(btn("🕵️ عملیات سرقت", "bankop:steal"))
    kb.add(btn("📑 گزارش تراکنش‌ها", "m:history"), btn("♻️ به‌روزرسانی", "m:bank"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def cyber_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🖥️ اجرای عملیات سایبری", "bankop:cyber"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def bank_action_cancel_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("❌ لغو", "bankop:cancel"), btn("🏦 برگشت به بانک", "m:bank"))
    return kb


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


# لیدربورد فقط بر اساس XP مرتب می‌شود؛ شماره حساب هم برای هر نفر نمایش داده می‌شود.
TOP_BOARDS = {
    "xp": ("⭐ رتبه‌بندی XP", "xp"),
    # سازگاری با callbackها و نسخه‌های قدیمی
    "overall": ("⭐ رتبه‌بندی XP", "xp"),
    "coins": ("⭐ رتبه‌بندی XP", "xp"),
}


def top_rows(kind="xp"):
    with lock:
        return db.execute(
            "SELECT * FROM players ORDER BY COALESCE(xp,0) DESC, id ASC LIMIT 10"
        ).fetchall()


def top_markup(kind="xp"):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🔄 تازه‌سازی", "m:top"), btn("🔙 منو", "m:menu"))
    return kb


def do_top(kind="xp"):
    rows = top_rows("xp")
    medals = ["🥇", "🥈", "🥉"] + ["🔹"] * 7
    lines = []
    for i, r in enumerate(rows):
        lines.append(
            f"{medals[i]} <b>{nm(r)}</b> — ⭐ <b>{int(r['xp'] or 0):,} XP</b>\n"
            f"🏦 شماره حساب: <code>{esc(r['account_no'] or '—')}</code>"
        )
    body = "\n\n".join(lines) if lines else "هنوز کسی بازی نکرده."
    body += "\n\n📊 رتبه‌بندی فقط بر اساس XP است؛ سکه، برد، مزرعه و تجهیزات در رتبه تأثیری ندارند."
    return card("لیدربورد XP", body)


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
            minutes, seconds = divmod(int(wait), 60)
            return f"⏳ دزدی بعدی پس از {minutes} دقیقه و {seconds} ثانیه فعال می‌شود. فاصله هر تلاش ۱۵ دقیقه است."
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
        account_no = account_no.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
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


@bot.message_handler(commands=["steal"])
def cmd_steal(m):
    parts = (m.text or "").split()
    if len(parts) == 1 and not reply_target(m):
        bank_transfer_state.pop(m.from_user.id, None)
        bank_action_state[m.from_user.id] = {"step": "steal"}
        return reply(m, "🥷 شماره حساب ۸ رقمی بازیکنی را که می‌خواهی هدف قرار بدهی بفرست:", bank_action_cancel_markup())
    target, error = resolve_steal_target(m)
    if error:
        return reply(m, error, bank_markup())
    return reply(m, do_steal(m.from_user, target), bank_markup())


def do_cyber(user, target):
    """رویداد کاملاً خیالی درون‌بازی؛ تمام امکانات ربات هدف را ۲۴ ساعت محدود می‌کند."""
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
        attacker_name = str(current_actor["name"] or f"user_{actor['id']}")
        lock_until = now + CYBER_LOCK_SECONDS
        db.execute("UPDATE players SET coins=coins-?, last_cyber=? WHERE id=?",
                   (CYBER_COST, now, actor["id"]))
        db.execute("""UPDATE players
                      SET cyber_lock_until=?, cyber_attacker_id=?, cyber_attacker_name=?
                      WHERE id=?""",
                   (lock_until, actor["id"], attacker_name, target["id"]))
        db.commit()
        fresh_actor = db.execute("SELECT * FROM players WHERE id=?", (actor["id"],)).fetchone()
        fresh_target = db.execute("SELECT * FROM players WHERE id=?", (target["id"],)).fetchone()
    try:
        bot.send_message(target["id"],
            f"🛡 <b>هشدار حمله سایبری</b>\n"
            f"👤 حمله‌کننده: <b>{nm(fresh_actor)}</b>\n"
            f"🏦 شماره حساب حمله‌کننده: <code>{esc(fresh_actor['account_no'])}</code>\n"
            f"⏰ محرومیت تا: <b>{time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(lock_until))}</b>\n"
            "تمام امکانات ربات تو برای ۲۴ ساعت غیرفعال شده‌اند.",
            parse_mode="HTML")
    except Exception:
        pass
    return (f"💻 <b>رویداد سایبری درون‌بازی ثبت شد!</b>\n"
            f"🎯 هدف: <b>{nm(fresh_target)}</b>\n"
            f"💸 هزینه ثابت: <b>{CYBER_COST:,} سکه</b>\n"
            "🔒 تمام بخش‌های ربات هدف برای ۲۴ ساعت مسدود شد.\n"
            f"👤 حمله‌کننده ثبت‌شده: <b>{esc(attacker_name)}</b>\n"
            f"🏦 شماره حساب حمله‌کننده: <code>{esc(fresh_actor['account_no'])}</code>\n"
            "✅ موجودی و اطلاعات حساب هدف تغییری نکرد؛ تمام پیام‌ها و دکمه‌های ربات برای او مسدود شد.\n"
            "🚫 حمله بعدی تو پس از ۲۴ ساعت آزاد می‌شود.")


@bot.message_handler(commands=["cyber"])
def cmd_cyber(m):
    parts = (m.text or "").split()
    if len(parts) != 2:
        return reply(m, "فرمت: <code>/cyber آیدی_تلگرام_یا_شماره_حساب</code>\nهزینه ثابت: ۵۰٬۰۰۰ سکه؛ تمام ربات را ۲۴ ساعت محدود می‌کند.")
    target = resolve_player_identifier(parts[1])
    reply(m, do_cyber(m.from_user, target), back_markup())


def do_dice(user, chat_id, bet):
    """تاس شرطی؛ برد سودی برابر شرط، مساوی بازپرداخت و باخت کسر شرط دارد."""
    p = get_player(user)
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    escrow_id = _new_escrow_id("bot-dice", p["id"])
    ok, error = reserve_wager(p["id"], bet, escrow_id)
    if not ok:
        return error
    try:
        mv = roll(chat_id)
        bv = roll(chat_id)
        time.sleep(4)
    except Exception:
        refund_wager(escrow_id)
        return "❌ اجرای تاس ناموفق بود؛ شرطت کامل برگشت داده شد."
    head = (f"{face(mv)} تو: <b>{mv}</b>   |   {face(bv)} ربات: <b>{bv}</b>\n"
            f"💰 شرط: <b>{int(bet):,}</b> سکه\n{LINE}\n")
    if mv > bv:
        money = settle_bot_wager(p["id"], escrow_id, "win", xp=5)
        return head + "🏆 بردی! +۵ XP\n" + money
    if mv == bv:
        money = settle_bot_wager(p["id"], escrow_id, "draw", xp=3)
        return head + "🤝 مساوی! +۳ XP\n" + money
    money = settle_bot_wager(p["id"], escrow_id, "lose", xp=1)
    return head + "💪 این دور ربات برد؛ +۱ XP برای شرکت گرفتی.\n" + money


def do_slots(user, chat_id, bet):
    """اسلات با شرط ورودی و محدودیت زمانی ۶ ساعته."""
    p = get_player(user)
    now = time.time()
    escrow_id = _new_escrow_id("bot-slots", p["id"])
    with lock:
        db.execute("BEGIN IMMEDIATE")
        current = db.execute("SELECT last_slots,coins FROM players WHERE id=?", (p["id"],)).fetchone()
        remaining = SLOTS_COOLDOWN - (now - float(current["last_slots"] or 0))
        if remaining > 0:
            db.rollback()
            return f"⏳ اسلات هر ۶ ساعت یک‌بار قابل بازی است؛ {int(remaining // 3600)} ساعت و {int((remaining % 3600) // 60)} دقیقه دیگر."
        balance = int(current["coins"] or 0)
        if balance < int(bet):
            db.rollback()
            return f"❌ موجودی کیف پولت {balance:,} سکه است؛ شرط کمتر وارد کن."
        if balance + int(bet) > MAX_SQLITE_INT:
            db.rollback()
            return "❌ این مبلغ از سقف قابل پشتیبانی کیف پول بیشتر است."
        db.execute("UPDATE players SET coins=coins-?,last_slots=? WHERE id=?", (int(bet), now, p["id"]))
        db.execute("INSERT INTO wager_escrows(escrow_id,user_id,amount,created_at) VALUES(?,?,?,?)",
                   (escrow_id, p["id"], int(bet), now))
        db.commit()
    try:
        v = roll(chat_id, "🎰")
    except Exception:
        refund_wager(escrow_id)
        with lock:
            db.execute("UPDATE players SET last_slots=0 WHERE id=? AND last_slots=?", (p["id"], now))
            db.commit()
        return "❌ اجرای اسلات از طرف تلگرام ناموفق بود؛ شرطت برگشت داده شد و زمان استفاده هم برگردانده شد."
    if v in (1, 22, 43, 64):
        money = settle_bot_wager(p["id"], escrow_id, "win", xp=50)
        return (f"🎰 <b>جکپات! سه نماد یکسان!</b>\n💰 شرط: <b>{int(bet):,} سکه</b>\n"
                f"💎 +۵۰ XP\n{money}\n⏱ نوبت بعدی: ۶ ساعت دیگر")
    money = settle_bot_wager(p["id"], escrow_id, "lose", xp=1)
    return f"🎰 این بار نمادها یکی نشدند.\n💰 شرط: <b>{int(bet):,} سکه</b>\n{money}\n⏱ نوبت بعدی: ۶ ساعت دیگر"


def do_arena(user, chat_id):
    return ("🎯 آرنا با دعوت مستقیم کار می‌کند.\n"
            "از دستور <code>/arena آیدی_تلگرام_یا_شماره_حساب</code> استفاده کن، بازی را انتخاب کن و مبلغ دلخواه شرط را تایپ کن. "
            "حریف فقط وقتی می‌تواند دعوت را قبول کند که همان مقدار سکه در کیف پولش داشته باشد؛ برنده مجموع دو شرط را می‌گیرد و در مساوی هر دو شرط برمی‌گردد.")


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
    "🏆 /top — لیدربورد فقط بر اساس XP، همراه شماره حساب\n"
    "🛒 /shop — ارتقای دزد، نگهبان و کلنگ؛ شمشیر و زره حذف شده‌اند\n"
    "🏦 /bank — شماره حساب | /transfer 12345678 100 — انتقال سکه\n"
    "🧾 /history — گردش حساب | /invite — لینک دعوت\n"
    "🎯 /arena 12345678 — دعوت به آرنا؛ مبلغ شرط را وارد می‌کنی و حریف با موجودی کافی قبول می‌کند\n"
    "💻 /cyber 12345678 — هزینه ۵۰٬۰۰۰ سکه؛ تمام پیام‌ها، فرمان‌ها و دکمه‌های ربات هدف را ۲۴ ساعت مسدود می‌کند\n"
    "🥷 /steal 12345678 — تلاش برای دزدی؛ هر ۱۵ دقیقه یک‌بار\n"
    "🎰 /slots مبلغ — اسلات با شرط دلخواه؛ هر ۶ ساعت یک‌بار\n"
    "🎡 /wheel — چرخ پاداش | /dice مبلغ — تاس با ربات | /flip مبلغ — شیر یا خط\n"
    "🎮 /darts مبلغ | /hoops مبلغ | /goal مبلغ | /bowl مبلغ | /rps مبلغ — بازی با ربات و شرط دلخواه\n"
    "🌾 /farm — مزرعه و درآمد ساعتی\n"
    "📋 /missions — مأموریت روزانه | /achievements — مدال‌ها | /weekly — لیگ هفتگی\n"
    "🎟 /raffle — قرعه‌کشی رایگان بدون خرید بلیت\n"
    "🃏 /blackjack مبلغ | /roulette مبلغ | /guess مبلغ — بازی با شرط دلخواه\n"
    "🏛 /deposit 500 — سپرده | /withdraw 500 — برداشت\n"

    "🎁 /giftcodes — کدهای عمومی | /redeem CODE — استفاده از کد هدیه\n\n"
    "🏅 سطح‌ها از ۱ تا ۱۰۰ هستند؛ برای هر سطح، XP بیشتری از سطح قبلی لازم است.\n"
    "💡 نام از یوزرنیم تلگرام (@username) گرفته می‌شود؛ اگر وجود نداشته باشد user_ID نمایش داده می‌شود.\n"
    "🏦 شماره حساب ۸ رقمی و موجودی با تغییر یوزرنیم حفظ می‌شوند.\n"
    "🤝 در بازی‌های شرطی فقط سکه درون‌بازی جابه‌جا می‌شود؛ پول واقعی نیست و تبدیل نقدی ندارد. در مساوی شرط هر دو نفر برمی‌گردد.\n"
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
                             "authenticated": True, "expires": time.time() + ADMIN_SESSION_SECONDS}
    say(m.chat.id, "✅ وارد پنل ادمین شدی.\nعملیات موردنظر را از دکمه‌های شیشه‌ای انتخاب کن.", admin_actions_markup())


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
            state.update(step="action", operation=None, attempts=0, authenticated=True,
                         expires=time.time() + ADMIN_SESSION_SECONDS)
            return reply(m, "✅ رمز درست است. عملیات موردنظر را از دکمه‌های شیشه‌ای انتخاب کن.", admin_actions_markup())
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
        elif choice in ("کد", "کد هدیه", "gift", "ساخت کد"):
            state["operation"] = "gift"; state["step"] = "gift"
            return reply(m, "کد هدیه را به این شکل بفرست:\n<code>CODE COINS XP MAX_USES</code>\nمثال: <code>WELCOME 500 20 100</code>", admin_prompt_markup())
        elif choice in ("حذف کد", "پاک کردن کد", "حذف کد هدیه", "deletegift", "removegift", "gift_delete"):
            state["operation"] = "gift_delete"; state["step"] = "gift_delete"
            return reply(m, "کد هدیه‌ای را که می‌خواهی از بازی حذف کنی بفرست:", admin_prompt_markup())
        elif choice in ("رویداد", "event"):
            state["operation"] = "event"; state["step"] = "event"
            return reply(m, "مدت رویداد درآمد ۲ برابر را به ثانیه بفرست (مثلاً 3600، حداکثر ۷ روز):")
        else:
            return reply(m, "عملیات را از دکمه‌های زیر انتخاب کن یا نام آن را بفرست:", admin_actions_markup())
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
            redeemed_before = db.execute("SELECT 1 FROM gift_redemptions WHERE code=? LIMIT 1", (code,)).fetchone()
            if exists or redeemed_before:
                return reply(m, "❌ این کد قبلاً ساخته یا استفاده شده است؛ برای جلوگیری از استفاده دوباره، یک کد تازه انتخاب کن.")
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
                    f"\nعملیات بعدی را انتخاب کن:", admin_actions_markup())

    if state["step"] == "gift_delete":
        code = raw.strip().upper()
        if not code.replace("_", "").isalnum() or not (3 <= len(code) <= 32):
            return reply(m, "❌ کد معتبر نیست. کد ۳ تا ۳۲ نویسه‌ای را بفرست:", admin_prompt_markup())
        with lock:
            gift_row = db.execute("SELECT code FROM gift_codes WHERE code=?", (code,)).fetchone()
        if not gift_row:
            return reply(m, "❌ این کد در فهرست کدهای هدیه پیدا نشد. کد دیگری بفرست:", admin_prompt_markup())
        state["delete_code"] = code
        state["step"] = "gift_delete_confirm"
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(m, f"⚠️ برای حذف دائمی کد <code>{esc(code)}</code>، دقیقاً این عبارت را بفرست:\n<code>حذف {esc(code)}</code>\n\nبا این کار کد از تابلوی عمومی برداشته می‌شود و دیگر قابل استفاده نخواهد بود.", admin_prompt_markup())

    if state["step"] == "gift_delete_confirm":
        code = state.get("delete_code", "")
        expected = f"حذف {code}".upper()
        if raw.strip().upper() != expected:
            state["step"] = "gift_delete"
            state.pop("delete_code", None)
            return reply(m, "❌ تأیید مطابقت نداشت؛ حذف انجام نشد. کد دیگری بفرست یا /cancel کن:", admin_prompt_markup())
        with lock:
            exists = db.execute("SELECT code FROM gift_codes WHERE code=?", (code,)).fetchone()
            ref = db.execute("SELECT chat_id,message_id FROM gift_announcement_refs WHERE code=?", (code,)).fetchone()
            if exists:
                db.execute("DELETE FROM gift_codes WHERE code=?", (code,))
            db.execute("DELETE FROM gift_announcement_refs WHERE code=?", (code,))
            db.commit()
        announcement_status = ""
        if ref:
            try:
                bot.delete_message(ref["chat_id"], int(ref["message_id"]))
                announcement_status = "\n📢 پیام عمومی کد هم حذف شد."
            except Exception as delete_error:
                print("gift announcement delete failed:", delete_error)
                try:
                    bot.edit_message_text("⛔ این کد هدیه توسط مدیریت حذف شده و دیگر قابل استفاده نیست.",
                                          ref["chat_id"], int(ref["message_id"]))
                    announcement_status = "\n⚠️ پیام عمومی به‌جای حذف، باطل شد."
                except Exception:
                    announcement_status = "\n⚠️ کد از ربات حذف شد، اما پیام قدیمی کانال را دستی پاک کن."
        state["step"] = "action"
        state.pop("delete_code", None)
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(m, f"✅ کد هدیه <code>{esc(code)}</code> حذف شد و دیگر قابل استفاده نیست.{announcement_status}\nعملیات بعدی را انتخاب کن:", admin_actions_markup())

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
        return reply(m, f"✅ رویداد درآمد ۲ برابر تا {time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(end_at))} فعال شد.\nعملیات بعدی را انتخاب کن:", admin_actions_markup())

    if state["step"] == "account":
        if raw.strip().lower() in ("نوع", "تغییر", "change"):
            state["step"] = "action"
            state["expires"] = time.time() + ADMIN_SESSION_SECONDS
            return reply(m, "عملیات جدید را از دکمه‌های شیشه‌ای انتخاب کن:", admin_actions_markup())
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
                return reply(m, "❌ برای جلوگیری از قفل شدن پنل، ادمین اصلی قابل بن‌کردن نیست. عملیات بعدی را انتخاب کن:", admin_actions_markup())
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
            return reply(m, f"{action_msg}\n👤 {nm(target)}\nعملیات بعدی را انتخاب کن:", admin_actions_markup())
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
            f"برای تغییر نوع عملیات دکمه‌های پنل را انتخاب کن؛ برای خروج /cancel را بزن.", admin_actions_markup()
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
    get_player(m.from_user)
    reply(m, do_top("xp"), top_markup("xp"))


@bot.message_handler(commands=["bank", "account"])
def cmd_bank(m):
    bank_transfer_state.pop(m.from_user.id, None)
    bank_action_state.pop(m.from_user.id, None)
    reply(m, do_bank(m.from_user), bank_markup())


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


@bot.message_handler(func=lambda m: m.from_user and m.from_user.id in bank_action_state,
                     content_types=["text"])
def bank_action_input(m):
    uid = m.from_user.id
    state = bank_action_state.get(uid)
    if not state:
        return
    raw = (m.text or "").strip()
    if raw.lower() in ("/cancel", "لغو", "انصراف"):
        bank_action_state.pop(uid, None)
        return reply(m, "❌ عملیات بانکی لغو شد.", bank_markup())
    if raw.startswith("/"):
        bank_action_state.pop(uid, None)
        return reply(m, "❌ عملیات بانکی لغو شد. برای شروع دوباره از دکمه‌های بانک استفاده کن.", bank_markup())

    normalized = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    normalized = normalized.replace(",", "").replace("٬", "").replace(" ", "")
    step = state.get("step")
    if step in ("deposit", "withdraw"):
        if not normalized.isdigit() or len(normalized) > MAX_DIGITS or int(normalized) <= 0:
            action = "سپرده‌گذاری" if step == "deposit" else "برداشت"
            return reply(m, f"❌ مبلغ {action} باید عدد مثبت و حداکثر ۹ رقم باشد. دوباره بفرست:", bank_action_cancel_markup())
        amount = int(normalized)
        bank_action_state.pop(uid, None)
        result = move_deposit(m.from_user, amount, withdraw=(step == "withdraw"))
        return reply(m, result + "\n\n" + do_bank(m.from_user), bank_markup())

    if step == "steal":
        if not normalized.isdigit() or len(normalized) != 8:
            return reply(m, "❌ شماره حساب باید دقیقاً ۸ رقم باشد. دوباره شماره حساب را بفرست:", bank_action_cancel_markup())
        target = get_by_account(normalized)
        if not target:
            return reply(m, "❌ این شماره حساب در بازی پیدا نشد. دوباره وارد کن:", bank_action_cancel_markup())
        bank_action_state.pop(uid, None)
        result = do_steal(m.from_user, target)
        return reply(m, result + "\n\n" + do_bank(m.from_user), bank_markup())

    if step == "cyber":
        if not normalized.isdigit() or len(normalized) > 19:
            return reply(m, "❌ آیدی تلگرام یا شماره حساب معتبر نیست. دوباره بفرست:", bank_action_cancel_markup())
        target = resolve_player_identifier(normalized)
        if not target:
            return reply(m, "❌ بازیکنی با این آیدی یا شماره حساب پیدا نشد. دوباره وارد کن:", bank_action_cancel_markup())
        if int(target["id"]) == uid:
            return reply(m, "❌ نمی‌توانی به حساب خودت حمله کنی. هدف دیگری بفرست:", bank_action_cancel_markup())
        bank_action_state.pop(uid, None)
        result = do_cyber(m.from_user, target)
        return reply(m, result, back_markup())


@bot.message_handler(commands=["dice", "gamble"])
def cmd_dice(m):
    bet = parse_bet_argument(m)
    if bet is False:
        return reply(m, "فرمت: <code>/dice مبلغ</code>؛ مثال: <code>/dice 2500</code>")
    if bet is None:
        return ask_bot_bet(m.chat.id, m.from_user, "dice")
    return play_bot_game(m.chat.id, m.from_user, "dice", bet)


@bot.message_handler(commands=["slots"])
def cmd_slots(m):
    bet = parse_bet_argument(m)
    if bet is False:
        return reply(m, "فرمت: <code>/slots مبلغ</code>")
    if bet is None:
        return ask_bot_bet(m.chat.id, m.from_user, "slots")
    return play_bot_game(m.chat.id, m.from_user, "slots", bet)


# ---------- آرنای دونفره با شرط دلخواه ----------
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
PVP_TARGET_INPUT = {}  # user_id -> {created}
PVP_COUNTER = 0
PVP_LOCK = threading.RLock()


def pvp_game_markup(target_id):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("⚽ فوتبال", f"pvpstart:{target_id}:football"), btn("🏀 بسکتبال", f"pvpstart:{target_id}:basketball"))
    kb.add(btn("🎯 دارت", f"pvpstart:{target_id}:darts"), btn("🎳 بولینگ", f"pvpstart:{target_id}:bowling"))
    kb.add(btn("🎲 تاس", f"pvpstart:{target_id}:dice"), btn("🪙 شیر یا خط", f"pvpstart:{target_id}:coin"))
    kb.add(btn("✊ سنگ‌کاغذقیچی", f"pvpstart:{target_id}:rps"))
    kb.add(btn("✖ لغو", "m:menu"))
    return kb


def _pvp_finish_awards(challenge, winner_id):
    """شرط دو بازیکن را تسویه کرده و XP و آمار را ثبت می‌کند."""
    return settle_pvp_wagers(challenge, winner_id)


def _pvp_send_result(challenge, result_text):
    for uid in (challenge["challenger"], challenge["target"]):
        try:
            bot.send_message(uid, result_text, parse_mode="HTML", reply_markup=back_markup())
        except Exception:
            pass


def _pvp_roll_match(challenge_id):
    c = PVP_CHALLENGES.get(challenge_id)
    if not c:
        return
    emoji, title = PVP_GAME_DATA[c["game"]]
    try:
        if c["game"] == "coin":
            a_roll = random.randint(1, 2)
            b_roll = random.randint(1, 2)
        else:
            a_roll = bot.send_dice(c["challenger"], emoji).dice.value
            b_roll = bot.send_dice(c["target"], emoji).dice.value
    except Exception:
        refund_pvp_wagers(c)
        PVP_CHALLENGES.pop(challenge_id, None)
        msg = "❌ اجرای مسابقه انجام نشد؛ شرط هر دو بازیکن کامل برگشت داده شد. هر دو باید ربات را /start کرده باشند."
        _pvp_send_result(c, msg)
        return
    if a_roll > b_roll:
        winner_id = c["challenger"]
    elif b_roll > a_roll:
        winner_id = c["target"]
    else:
        winner_id = None
    awards = _pvp_finish_awards(c, winner_id)
    a = get_by_id(c["challenger"]); b = get_by_id(c["target"])
    if c["game"] == "coin":
        result_a = "🦅 شیر" if a_roll == 1 else "🪙 خط"
        result_b = "🦅 شیر" if b_roll == 1 else "🪙 خط"
    else:
        result_a, result_b = str(a_roll), str(b_roll)
    result = (f"🎮 <b>نتیجه مسابقه {title}</b>\n"
              f"{nm(a)}: <b>{result_a}</b>\n{nm(b)}: <b>{result_b}</b>\n"
              f"💰 شرط هر نفر: <b>{int(c['bet']):,} سکه</b>\n"
              f"━━━━━━━━━━━━━━\n{awards}")
    PVP_CHALLENGES.pop(challenge_id, None)
    _pvp_send_result(c, result)


def _create_pvp_invite(challenger_id, target_id, game, bet):
    global PVP_COUNTER
    challenger = get_by_id(challenger_id)
    target = get_by_id(target_id)
    if not challenger or not target:
        return False, "❌ یکی از حساب‌ها پیدا نشد."
    if int(challenger_id) == int(target_id):
        return False, "❌ نمی‌توانی خودت را دعوت کنی."
    if game not in PVP_GAME_DATA:
        return False, "❌ نوع مسابقه معتبر نیست."
    if is_cyber_restricted(challenger_id) or is_cyber_restricted(target_id):
        return False, "🔒 یکی از بازیکنان در محدودیت ۲۴ ساعته است."
    bet = int(bet)
    if bet <= 0 or int(challenger["coins"] or 0) < bet:
        return False, f"❌ موجودی تو برای شرط {bet:,} سکه کافی نیست."
    with PVP_LOCK:
        now = time.time()
        for old_cid, old_match in list(PVP_CHALLENGES.items()):
            if now - old_match.get("created", 0) > 600:
                if old_match.get("accepted") and not old_match.get("finished"):
                    refund_pvp_wagers(old_match)
                PVP_CHALLENGES.pop(old_cid, None)
        PVP_COUNTER += 1
        cid = PVP_COUNTER
        PVP_CHALLENGES[cid] = {
            "id": cid,
            "challenger": int(challenger_id),
            "target": int(target_id),
            "game": game,
            "bet": bet,
            "created": now,
            "rps": {},
            "accepted": False,
            "accepting": False,
            "finished": False,
        }
    _, title = PVP_GAME_DATA[game]
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("✅ قبول مسابقه", f"pvpaccept:{cid}"), btn("❌ رد", f"pvpreject:{cid}"))
    try:
        bot.send_message(
            target_id,
            f"⚡ <b>دعوت به آرنا!</b>\n👤 دعوت‌کننده: <b>{esc(challenger['name'])}</b>\n"
            f"🎮 بازی: <b>{title}</b>\n💰 شرط هر نفر: <b>{bet:,} سکه</b>\n"
            f"🏦 موجودی کیف پول تو: <b>{int(target['coins'] or 0):,} سکه</b>\n"
            "✅ برای قبول، باید همین مقدار سکه در کیف پولت داشته باشی.\n"
            "🏆 برنده، هر دو شرط را می‌گیرد؛ در مساوی هر دو شرط برمی‌گردد.\n"
            "⏳ اعتبار دعوت: ۲ دقیقه",
            parse_mode="HTML",
            reply_markup=kb,
        )
    except Exception:
        PVP_CHALLENGES.pop(cid, None)
        return False, "❌ نتوانستم به حریف پیام بدهم. او باید ابتدا /start را در ربات زده باشد."
    return True, (f"✅ دعوت {title} با شرط <b>{bet:,} سکه برای هر نفر</b> ارسال شد.\n"
                   "در زمان قبول دعوت، موجودی هر دو نفر دوباره بررسی و شرط‌ها از کیف پول کنار گذاشته می‌شود.")

def cmd_arena(m):
    BOT_BET_INPUT.pop(m.from_user.id, None)
    BOT_CHOICE_PENDING.pop(m.from_user.id, None)
    PVP_BET_INPUT.pop(m.from_user.id, None)
    parts = (m.text or "").split()
    target = None
    if m.reply_to_message and m.reply_to_message.from_user and not m.reply_to_message.from_user.is_bot:
        target = get_player(m.reply_to_message.from_user)
    elif len(parts) == 2:
        target = resolve_player_identifier(parts[1])
    if not target:
        uid = m.from_user.id
        bank_transfer_state.pop(uid, None)
        bank_action_state.pop(uid, None)
        PVP_TARGET_INPUT[uid] = {"created": time.time()}
        return reply(m, "🎯 آیدی عددی تلگرام یا شماره حساب ۸ رقمی حریف را بفرست.\nبرای لغو /cancel را بزن:", back_markup())
    if target["id"] == m.from_user.id:
        return reply(m, "❌ نمی‌توانی خودت را به مسابقه دعوت کنی.")
    if is_cyber_restricted(m.from_user.id):
        return reply(m, cyber_restriction_text(m.from_user.id))
    if is_cyber_restricted(target["id"]):
        return reply(m, "🔒 این بازیکن فعلاً در محدودیت رقابتی است و نمی‌تواند مسابقه بپذیرد.")
    reply(m, card("ARENA | دعوت به مسابقه", f"🎯 حریف: <b>{nm(target)}</b>\n🎮 رشته مسابقه را انتخاب کن.\n⚽ فوتبال · 🏀 بسکتبال · 🎯 دارت · 🎳 بولینگ · 🎲 تاس · 🪙 شیر یا خط · ✊ سنگ‌کاغذقیچی\n\n🎁 بعد از انتخاب بازی، مبلغ شرط را خودت تایپ می‌کنی. حریف فقط در صورت داشتن همان مقدار سکه می‌تواند دعوت را قبول کند."),
          pvp_game_markup(target["id"]))


@bot.message_handler(commands=["arena", "duel", "challenge"])
def cmd_arena_entry(m):
    cmd_arena(m)


@bot.message_handler(func=lambda m: m.from_user and m.from_user.id in PVP_TARGET_INPUT, content_types=["text"])
def pvp_target_input(m):
    uid = m.from_user.id
    raw = (m.text or "").strip()
    if raw.lower() in ("/cancel", "لغو", "انصراف"):
        PVP_TARGET_INPUT.pop(uid, None)
        return reply(m, "❌ دعوت آرنا لغو شد.", back_markup())
    normalized = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    target = resolve_player_identifier(normalized)
    if not target:
        return reply(m, "❌ بازیکن پیدا نشد. آیدی عددی تلگرام یا شماره حساب ۸ رقمی را دوباره بفرست:", back_markup())
    if int(target["id"]) == uid:
        return reply(m, "❌ نمی‌توانی خودت را دعوت کنی. شماره حساب یا آیدی حریف دیگری را بفرست:", back_markup())
    if is_cyber_restricted(uid) or is_cyber_restricted(target["id"]):
        PVP_TARGET_INPUT.pop(uid, None)
        return reply(m, "🔒 یکی از دو بازیکن در محرومیت سایبری است و نمی‌تواند وارد آرنا شود.", back_markup())
    PVP_TARGET_INPUT.pop(uid, None)
    bank_transfer_state.pop(uid, None)
    bank_action_state.pop(uid, None)
    return reply(m, card("ARENA | انتخاب بازی", f"🎯 حریف: <b>{nm(target)}</b>\nشماره حساب: <code>{esc(target['account_no'])}</code>\n🎮 بازی را انتخاب کن؛ بعد مبلغ دلخواه شرط را تایپ می‌کنی. حریف باید همان مبلغ را در کیف پول داشته باشد."), pvp_game_markup(target["id"]))


@bot.message_handler(func=lambda m: m.from_user and m.from_user.id in PVP_BET_INPUT, content_types=["text"])
def pvp_bet_input(m):
    uid = m.from_user.id
    state = PVP_BET_INPUT.get(uid)
    if not state:
        return
    raw = (m.text or "").strip()
    if raw.lower() in ("/cancel", "لغو", "انصراف") or raw.startswith("/"):
        PVP_BET_INPUT.pop(uid, None)
        return reply(m, "❌ تعیین مبلغ شرط آرنا لغو شد.", back_markup())
    if time.time() - state.get("created", 0) > 180:
        PVP_BET_INPUT.pop(uid, None)
        return reply(m, "⌛ زمان تعیین شرط تمام شد؛ دوباره از آرنا دعوت بفرست.", back_markup())
    normalized = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    normalized = normalized.replace(",", "").replace("٬", "").replace(" ", "")
    if not normalized.isdigit() or len(normalized) > 19 or int(normalized) <= 0 or int(normalized) > MAX_SQLITE_INT:
        return reply(m, "❌ مبلغ باید عدد مثبت باشد. دوباره وارد کن یا /cancel بزن:")
    bet = int(normalized)
    p = get_player(m.from_user)
    if int(p["coins"] or 0) < bet:
        return reply(m, f"❌ موجودی تو {int(p['coins']):,} سکه است؛ شرط کمتر وارد کن:")
    target_id, game = int(state["target_id"]), state["game"]
    PVP_BET_INPUT.pop(uid, None)
    if is_cyber_restricted(uid) or is_cyber_restricted(target_id):
        return reply(m, "🔒 یکی از بازیکنان در محدودیت ۲۴ ساعته است؛ دعوت ساخته نشد.", back_markup())
    success, message = _create_pvp_invite(uid, target_id, game, bet)
    return reply(m, message, back_markup())


def expire_pvp_match(challenge_id):
    with PVP_LOCK:
        match = PVP_CHALLENGES.get(challenge_id)
        if not match or not match.get("accepted") or match.get("finished"):
            return
        match["finished"] = True
        refund_pvp_wagers(match)
        PVP_CHALLENGES.pop(challenge_id, None)
    _pvp_send_result(match, "⌛ زمان انتخاب تمام شد؛ شرط هر دو بازیکن کامل برگشت داده شد.")


@bot.callback_query_handler(func=lambda c: c.data.startswith(("pvpstart:", "pvpaccept:", "pvpreject:", "pvprps:")))
def pvp_callbacks(c):
    data = c.data or ""
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    parts = data.split(":")
    if parts[0] == "pvpstart":
        try:
            target_id, game = int(parts[1]), parts[2]
        except (ValueError, IndexError):
            return
        if game not in PVP_GAME_DATA:
            return
        if c.from_user.id == target_id:
            return bot.answer_callback_query(c.id, "دعوت به خودت ممکن نیست.")
        if is_cyber_restricted(c.from_user.id) or is_cyber_restricted(target_id):
            return bot.answer_callback_query(c.id, "یکی از بازیکنان در محدودیت رقابتی است.")
        target = get_by_id(target_id)
        if not target:
            return bot.answer_callback_query(c.id, "حریف پیدا نشد.")
        bank_transfer_state.pop(c.from_user.id, None)
        bank_action_state.pop(c.from_user.id, None)
        PVP_TARGET_INPUT.pop(c.from_user.id, None)
        BOT_BET_INPUT.pop(c.from_user.id, None)
        PVP_BET_INPUT[c.from_user.id] = {"target_id": target_id, "game": game, "created": time.time()}
        _, game_title = PVP_GAME_DATA[game]
        return edit(c, f"🎮 بازی انتخاب شد: <b>{game_title}</b>\n💰 مبلغ شرط هر نفر را خودت تایپ کن. محدودیت ثابت ندارد؛ فقط باید کیف پول تو و حریفت هر دو به‌اندازه شرط موجودی داشته باشند.\nبرای لغو /cancel را بزن.", back_markup())

    if parts[0] in ("pvpaccept", "pvpreject"):
        try:
            cid = int(parts[1])
        except (ValueError, IndexError):
            return
        match = PVP_CHALLENGES.get(cid)
        if not match:
            return bot.answer_callback_query(c.id, "این دعوت دیگر فعال نیست.")
        if time.time() - match["created"] > 120:
            PVP_CHALLENGES.pop(cid, None)
            return edit(c, "⌛ زمان دعوت تمام شد.", back_markup())
        if c.from_user.id != match["target"]:
            return bot.answer_callback_query(c.id, "این دعوت برای حساب تو نیست.")
        if parts[0] == "pvpreject":
            with PVP_LOCK:
                current_match = PVP_CHALLENGES.get(cid)
                if current_match is not match:
                    return bot.answer_callback_query(c.id, "این دعوت دیگر فعال نیست.")
                if match.get("accepting") or match.get("accepted"):
                    return bot.answer_callback_query(c.id, "قبول دعوت در حال انجام است یا مسابقه شروع شده.")
                PVP_CHALLENGES.pop(cid, None)
            try:
                bot.send_message(match["challenger"], "🏳️ دعوت مسابقه رد شد.")
            except Exception:
                pass
            return edit(c, "دعوت را رد کردی.", back_markup())
        if is_cyber_restricted(match["challenger"]) or is_cyber_restricted(match["target"]):
            PVP_CHALLENGES.pop(cid, None)
            return edit(c, "🔒 مسابقه به‌دلیل محدودیت آرنا یکی از حساب‌ها لغو شد.", back_markup())
        a = get_by_id(match["challenger"]); b = get_by_id(match["target"])
        if not a or not b:
            PVP_CHALLENGES.pop(cid, None)
            return edit(c, "❌ یکی از حساب‌ها دیگر پیدا نمی‌شود؛ مسابقه لغو شد.", back_markup())
        with PVP_LOCK:
            current_match = PVP_CHALLENGES.get(cid)
            if current_match is not match:
                return bot.answer_callback_query(c.id, "این دعوت دیگر فعال نیست.")
            if match.get("accepted") or match.get("accepting"):
                return bot.answer_callback_query(c.id, "این مسابقه قبلاً پذیرفته شده یا در حال قبول شدن است.")
            match["accepting"] = True
        ok, reserve_result = reserve_pvp_wagers(cid, match["challenger"], match["target"], match["bet"])
        if not ok:
            with PVP_LOCK:
                if PVP_CHALLENGES.get(cid) is match:
                    PVP_CHALLENGES.pop(cid, None)
            try:
                bot.send_message(match["challenger"], reserve_result, parse_mode="HTML")
            except Exception:
                pass
            return edit(c, reserve_result, back_markup())
        with PVP_LOCK:
            if PVP_CHALLENGES.get(cid) is not match:
                refund_pvp_wagers(match)
                return edit(c, "❌ دعوت در همین لحظه لغو شد؛ شرط هر دو نفر برگشت داده شد.", back_markup())
            match["accepted"] = True
            match["accepting"] = False
            match["accepted_at"] = time.time()
        if match["game"] == "rps":
            timer = threading.Timer(300, expire_pvp_match, args=(cid,))
            timer.daemon = True
            timer.start()
            kb = types.InlineKeyboardMarkup()
            kb.add(btn("✊ سنگ", f"pvprps:{cid}:rock"), btn("📄 کاغذ", f"pvprps:{cid}:paper"), btn("✂️ قیچی", f"pvprps:{cid}:scissors"))
            for player_id in (match["challenger"], match["target"]):
                try:
                    bot.send_message(player_id,
                                     f"✊ <b>سنگ، کاغذ، قیچی</b>\n💰 شرط هر نفر: {int(match['bet']):,} سکه. انتخابت را بزن:",
                                     parse_mode="HTML", reply_markup=kb)
                except Exception:
                    pass
            return edit(c, "✅ مسابقه پذیرفته شد؛ هر دو بازیکن انتخاب کنند.", back_markup())
        match["finished"] = True
        edit(c, "✅ مسابقه پذیرفته شد؛ نتیجه در حال اجراست.", back_markup())
        _pvp_roll_match(cid)
        return

    if parts[0] == "pvprps":
        try:
            cid = int(parts[1]); choice = parts[2]
        except (ValueError, IndexError):
            return
        with PVP_LOCK:
            match = PVP_CHALLENGES.get(cid)
            if not match or not match.get("accepted") or match.get("finished"):
                return bot.answer_callback_query(c.id, "مسابقه فعال نیست یا قبلاً تمام شده است.")
            if time.time() - float(match.get("accepted_at", match["created"])) > 300:
                refund_pvp_wagers(match)
                PVP_CHALLENGES.pop(cid, None)
                return bot.answer_callback_query(c.id, "زمان مسابقه تمام شده است؛ شرط هر دو نفر برگشت داده شد.")
            if c.from_user.id not in (match["challenger"], match["target"]):
                return bot.answer_callback_query(c.id, "این انتخاب برای تو نیست.")
            if choice not in ("rock", "paper", "scissors"):
                return
            if c.from_user.id in match["rps"]:
                return bot.answer_callback_query(c.id, "انتخاب تو قبلاً ثبت شده است.")
            match["rps"][c.from_user.id] = choice
            if len(match["rps"]) < 2:
                bot.answer_callback_query(c.id, "انتخاب ثبت شد؛ منتظر حریف بمان.")
                return
            match["finished"] = True
            a_choice = match["rps"][match["challenger"]]
            b_choice = match["rps"][match["target"]]
        symbols = {"rock": "✊ سنگ", "paper": "📄 کاغذ", "scissors": "✂️ قیچی"}
        if a_choice == b_choice:
            winner_id = None
        elif (a_choice, b_choice) in (("rock", "scissors"), ("paper", "rock"), ("scissors", "paper")):
            winner_id = match["challenger"]
        else:
            winner_id = match["target"]
        awards = _pvp_finish_awards(match, winner_id)
        a = get_by_id(match["challenger"]); b = get_by_id(match["target"])
        result = (f"✊ <b>نتیجه سنگ، کاغذ، قیچی</b>\n"
                  f"{nm(a)}: {symbols[a_choice]}\n{nm(b)}: {symbols[b_choice]}\n"
                  f"💰 شرط هر نفر: <b>{int(match['bet']):,} سکه</b>\n"
                  f"━━━━━━━━━━━━━━\n{awards}")
        PVP_CHALLENGES.pop(cid, None)
        _pvp_send_result(match, result)


@bot.callback_query_handler(func=lambda c: c.data in ("bankstart", "bankconfirm", "bankcancel"))
def bank_flow_callback(c):
    uid = c.from_user.id
    if c.data == "bankstart":
        bank_action_state.pop(uid, None)
        bank_transfer_state[uid] = {"step": "account"}
        bot.answer_callback_query(c.id)
        return say(c.message.chat.id, "🏦 شماره حساب ۸ رقمی مقصد را بفرست:", back_markup())
    if c.data == "bankcancel":
        bank_transfer_state.pop(uid, None)
        bank_action_state.pop(uid, None)
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


@bot.callback_query_handler(func=lambda c: c.data.startswith("bankop:"))
def bank_action_callback(c):
    uid = c.from_user.id
    action = (c.data or "").split(":", 1)[1]
    if action == "cancel":
        bank_action_state.pop(uid, None)
        bot.answer_callback_query(c.id, "عملیات لغو شد.")
        return edit(c, do_bank(c.from_user), bank_markup())
    if action not in ("deposit", "withdraw", "steal", "cyber"):
        return bot.answer_callback_query(c.id, "درخواست نامعتبر است.", show_alert=True)
    bank_transfer_state.pop(uid, None)
    bank_action_state[uid] = {"step": action}
    bot.answer_callback_query(c.id)
    if action == "deposit":
        prompt = "🏦 مبلغی را که می‌خواهی به سپرده منتقل کنی به عدد بفرست:"
    elif action == "withdraw":
        prompt = "💸 مبلغی را که می‌خواهی از سپرده برداشت کنی به عدد بفرست:"
    elif action == "steal":
        prompt = "🥷 شماره حساب ۸ رقمی بازیکنی را که می‌خواهی هدف قرار بدهی بفرست:"
    else:
        prompt = f"💻 آیدی عددی تلگرام یا شماره حساب ۸ رقمی هدف را بفرست. هزینه حمله {CYBER_COST:,} سکه است:"
    return say(c.message.chat.id, prompt, bank_action_cancel_markup())


@bot.callback_query_handler(func=lambda c: c.data.startswith("adminop:"))
def admin_action_callback(c):
    uid = c.from_user.id
    if uid != ADMIN_ID or c.message.chat.type != "private":
        return bot.answer_callback_query(c.id, "این پنل فقط برای ادمین است.", show_alert=True)
    state = admin_flow_state.get(uid)
    if not state or not state.get("authenticated") or state.get("expires", 0) < time.time():
        admin_flow_state.pop(uid, None)
        return bot.answer_callback_query(c.id, "نشست ادمین معتبر نیست؛ دوباره /admin را بزن.", show_alert=True)
    action = (c.data or "").split(":", 1)[1]
    if action == "cancel":
        admin_flow_state.pop(uid, None)
        bot.answer_callback_query(c.id, "پنل بسته شد.")
        return edit(c, "❌ پنل ادمین بسته شد.", back_markup())
    if action == "cancel_operation":
        state.update(step="action", operation=None, expires=time.time() + ADMIN_SESSION_SECONDS)
        state.pop("delete_code", None)
        bot.answer_callback_query(c.id, "عملیات لغو شد.")
        return edit(c, "❌ عملیات لغو شد. عملیات بعدی را انتخاب کن:", admin_actions_markup())

    mapping = {
        "coins": ("coins", "account", "شماره حساب ۸ رقمی یا آیدی عددی بازیکن را بفرست تا سکه اضافه کنم:"),
        "xp": ("xp", "account", "شماره حساب ۸ رقمی یا آیدی عددی بازیکن را بفرست تا XP اضافه کنم:"),
        "ban": ("ban", "account", "شماره حساب ۸ رقمی یا آیدی عددی بازیکنی را که باید بن شود بفرست:"),
        "unban": ("unban", "account", "شماره حساب ۸ رقمی یا آیدی عددی بازیکنی را که باید آزاد شود بفرست:"),
        "gift": ("gift", "gift", "کد هدیه را به این شکل بفرست:\n<code>CODE COINS XP MAX_USES</code>\nمثال: <code>WELCOME 500 20 100</code>"),
        "gift_delete": ("gift_delete", "gift_delete", "کد هدیه‌ای را که می‌خواهی حذف کنی بفرست:"),
        "event": ("event", "event", "مدت رویداد درآمد ۲ برابر را به ثانیه بفرست (۶۰ تا ۶۰۴۸۰۰):")
    }
    if action not in mapping:
        return bot.answer_callback_query(c.id, "عملیات نامعتبر است.", show_alert=True)
    operation, step, prompt = mapping[action]
    state.update(operation=operation, step=step, expires=time.time() + ADMIN_SESSION_SECONDS)
    state.pop("delete_code", None)
    bot.answer_callback_query(c.id)
    if step == "account":
        return edit(c, prompt, admin_prompt_markup())
    return edit(c, prompt, admin_prompt_markup())


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
            edit(c, do_top("xp"), top_markup("xp"))
        elif arg == "bank":
            bank_transfer_state.pop(user.id, None)
            bank_action_state.pop(user.id, None)
            edit(c, do_bank(user), bank_markup())
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
            launch_free_bot_game(chat, user, "rps")
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
            launch_free_bot_game(chat, user, "slots")
        elif arg == "dice":
            launch_free_bot_game(chat, user, "dice")
        elif arg == "arena":
            PVP_TARGET_INPUT[user.id] = {"created": time.time()}
            say(chat, "🎯 آیدی عددی تلگرام یا شماره حساب ۸ رقمی حریف را بفرست؛ بعد بازی و مبلغ شرط را انتخاب می‌کنی. حریف باید همان‌قدر سکه داشته باشد.\nبرای لغو /cancel را بزن:", back_markup())
        elif arg == "games":
            edit(c, card("مرکز مینی‌گیم", "🎮 یک بازی انتخاب کن و مبلغ شرط دلخواهت را تایپ کن؛ شرط از کیف پول کم می‌شود و بعد از نتیجه تسویه می‌شود."), games_markup())
        elif arg == "cyber":
            edit(c, card("💻 حمله سایبری درون‌بازی",
                         f"هزینه هر حمله: <b>{CYBER_COST:,} سکه</b>\n"
                         "🎯 با دکمه زیر، آیدی عددی تلگرام یا شماره حساب ۸ رقمی هدف را وارد کن.\n"
                         "🔒 بعد از ثبت حمله، هدف دقیقاً ۲۴ ساعت به هیچ پیام، فرمان یا دکمه‌ای از ربات دسترسی ندارد.\n"
                         "✅ موجودی و اطلاعات حساب هدف تغییر نمی‌کند.\n"
                         "⏳ هر بازیکن هر ۲۴ ساعت فقط یک حمله می‌تواند انجام دهد."), cyber_markup())
        elif arg == "giftcodes":
            edit(c, giftcodes_page(user), back_markup())
        elif arg == "blackjack":
            launch_free_bot_game(chat, user, "blackjack")
        elif arg == "roulette":
            launch_free_bot_game(chat, user, "roulette")
        elif arg == "guess":
            launch_free_bot_game(chat, user, "guess")
        elif arg == "missions":
            mission_text, mission_kb = missions_page(user)
            edit(c, mission_text, mission_kb)
        elif arg == "achievements":
            edit(c, achievements_page(user), back_markup())
        elif arg == "weekly":
            edit(c, weekly_page(user), back_markup())
        elif arg == "raffle":
            edit(c, raffle_page(user), raffle_markup())
        elif arg == "flip":
            launch_free_bot_game(chat, user, "flip")
        elif arg in ARCADE:
            launch_free_bot_game(chat, user, arg)
        return
    if kind == "d":  # سازگاری با دکمه‌های قدیمی
        try:
            bet = int(arg)
        except (ValueError, TypeError):
            return launch_free_bot_game(chat, user, "dice")
        return play_bot_game(chat, user, "dice", bet)
    elif kind == "a":
        say(chat, do_arena(user, chat), back_markup())


# ---------- بازی‌های جدید ----------
# بازی‌های آرکید شرطی: (ایموجی تلگرام، نام بازی، نتیجه‌های موفق)
ARCADE = {
    "darts": ("🎯", "دارت", {6, 5}),
    "hoops": ("🏀", "بسکتبال", {5, 4}),
    "goal": ("⚽", "فوتبال", {5, 4, 3}),
    "bowl": ("🎳", "بولینگ", {6, 5}),
}


def games_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🪙 دوئل شیر یا خط", "m:flip"), btn("🎯 چالش دارت", "m:darts"))
    kb.add(btn("🏀 مسابقه بسکتبال", "m:hoops"), btn("⚽ ضربه پنالتی", "m:goal"))
    kb.add(btn("🎳 سالن بولینگ", "m:bowl"), btn("✊ نبرد سنگ‌کاغذقیچی", "m:rps"))
    kb.add(btn("🃏 میز بلک‌جک", "m:blackjack"), btn("🎡 میز رولت", "m:roulette"))
    kb.add(btn("🔮 معمای حدس عدد", "m:guess"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def do_arcade(user, chat_id, game, bet):
    emoji, title, table = ARCADE[game]
    p = get_player(user)
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    escrow_id = _new_escrow_id(f"bot-{game}", p["id"])
    ok, error = reserve_wager(p["id"], bet, escrow_id)
    if not ok:
        return error
    try:
        value = roll(chat_id, emoji)
        time.sleep(4)
    except Exception:
        refund_wager(escrow_id)
        return "❌ اجرای بازی ناموفق بود؛ شرطت کامل برگشت داده شد."
    head = f"{emoji} {title}\n💰 شرط: <b>{int(bet):,} سکه</b>\n"
    if value in table:
        money = settle_bot_wager(p["id"], escrow_id, "win", xp=5)
        return head + "🏆 عالی بود! +۵ XP گرفتی.\n" + money
    money = settle_bot_wager(p["id"], escrow_id, "lose", xp=1)
    return head + "💪 این بار نشد؛ +۱ XP برای شرکت گرفتی.\n" + money


def do_flip(user, side, bet):
    if side not in ("h", "t"):
        return "❌ انتخاب نامعتبر."
    p = get_player(user)
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    escrow_id = _new_escrow_id("bot-flip", p["id"])
    ok, error = reserve_wager(p["id"], bet, escrow_id)
    if not ok:
        return error
    result = random.choice(["h", "t"])
    names = {"h": "🦅 شیر", "t": "🪙 خط"}
    head = f"🪙 سکه چرخید... <b>{names[result]}</b> اومد!\n💰 شرط: <b>{int(bet):,} سکه</b>\n{LINE}\n"
    if result == side:
        money = settle_bot_wager(p["id"], escrow_id, "win", xp=5)
        return head + "🏆 درست حدس زدی! +۵ XP\n" + money
    money = settle_bot_wager(p["id"], escrow_id, "lose", xp=1)
    return head + "💪 این بار حدست درست نبود؛ +۱ XP گرفتی.\n" + money


@bot.message_handler(commands=["flip"])
def cmd_flip(m):
    bet = parse_bet_argument(m)
    if bet is False:
        return reply(m, "فرمت: <code>/flip مبلغ</code>")
    if bet is None:
        return ask_bot_bet(m.chat.id, m.from_user, "flip")
    return play_bot_game(m.chat.id, m.from_user, "flip", bet)


@bot.message_handler(commands=list(ARCADE))
def cmd_arcade(m):
    game = (m.text or "").split()[0].lstrip("/").split("@")[0].lower()
    bet = parse_bet_argument(m)
    if bet is False:
        return reply(m, f"فرمت: <code>/{game} مبلغ</code>")
    if bet is None:
        return ask_bot_bet(m.chat.id, m.from_user, game)
    return play_bot_game(m.chat.id, m.from_user, game, bet)


@bot.callback_query_handler(func=lambda c: c.data.startswith(("fb:", "f:", "x:")))
def new_games_callback(c):
    parts = (c.data or "").split(":")
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    if parts[0] in ("fb", "f"):
        return launch_free_bot_game(c.message.chat.id, c.from_user, "flip")
    if parts[0] == "x":
        game = parts[1] if len(parts) > 1 else ""
        if game not in ARCADE:
            return
        return launch_free_bot_game(c.message.chat.id, c.from_user, game)


@bot.callback_query_handler(func=lambda c: c.data.startswith("bg:"))
def bot_game_choice_callback(c):
    parts = (c.data or "").split(":")
    uid = c.from_user.id
    state = BOT_CHOICE_PENDING.get(uid)
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    if len(parts) == 2 and parts[1] == "cancel":
        BOT_CHOICE_PENDING.pop(uid, None)
        return edit(c, "❌ بازی لغو شد؛ شرطی از کیف پول کم نشد.", back_markup())
    if not state or len(parts) != 3:
        return bot.answer_callback_query(c.id, "این انتخاب منقضی شده؛ بازی را دوباره شروع کن.")
    if time.time() - state.get("created", 0) > 180:
        BOT_CHOICE_PENDING.pop(uid, None)
        return edit(c, "⌛ زمان انتخاب تمام شد؛ شرطی از کیف پول کم نشد.", back_markup())
    game, choice, bet = state["game"], parts[2], int(state["bet"])
    if parts[1] != game:
        return bot.answer_callback_query(c.id, "این انتخاب برای بازی دیگری است.")
    BOT_CHOICE_PENDING.pop(uid, None)
    if game == "flip":
        result = do_flip(c.from_user, choice, bet)
    elif game == "rps":
        result = do_rps(c.from_user, choice, bet)
    elif game == "roulette":
        result = do_roulette(c.from_user, choice, bet)
    else:
        return
    return edit(c, result, result_markup("m:games"))


# ---------- ارتقای تجهیزات ----------
def shop_text(p):
    return card("ارتقای تجهیزات",
                f"💰 موجودی: <b>{p['coins']:,}</b> سکه\n\n"
                f"🥷 دزد: سطح {p['thief']}/ {EQUIPMENT_MAX_LEVEL} — سرقت عادی قوی‌تر با هر سطح\n"
                f"🧱 نگهبان: سطح {p['guard']}/{EQUIPMENT_MAX_LEVEL} — محافظت در برابر سرقت عادی\n"
                f"⛏ کلنگ: سطح {p['pickaxe'] or 0}/{EQUIPMENT_MAX_LEVEL} — +{PICKAXE_BONUS} سکه پایه در معدن به‌ازای هر سطح\n"
                f"🔐 صندوق امن: سطح {p['vault_level'] or 0}/{VAULT_MAX_LEVEL} — هر سطح ۱۰۰۰ ظرفیت بیشتر\n\n"
                "💻 حمله سایبری ارتقا ندارد و همیشه ۵۰٬۰۰۰ سکه هزینه دارد.\n"
                "⚔️ شمشیر و زره از قدرت دوئل حذف شده‌اند.")


def shop_markup(p):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn(f"🥷 ارتقای دزد {p['thief']}/{EQUIPMENT_MAX_LEVEL} — {price('thief', p)} سکه", "buy:thief"))
    kb.add(btn(f"🧱 ارتقای نگهبان {p['guard']}/{EQUIPMENT_MAX_LEVEL} — {price('guard', p)} سکه", "buy:guard"))
    kb.add(btn(f"⛏ کلنگ {p['pickaxe'] or 0}/{EQUIPMENT_MAX_LEVEL} — {price('pickaxe', p)} سکه", "buy:pickaxe"))
    if int(p["vault_level"] or 0) < VAULT_MAX_LEVEL:
        kb.add(btn(f"🔐 ارتقای صندوق امن {p['vault_level'] or 0}/{VAULT_MAX_LEVEL} — {price('vault', p)} سکه", "buy:vault"))
    else:
        kb.add(btn(f"🔐 صندوق امن — حداکثر سطح {VAULT_MAX_LEVEL}", "buy:vault"))
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
    if kind not in ("thief", "guard", "pickaxe", "vault"):
        return bot.answer_callback_query(c.id)
    with lock:
        p = get_player(c.from_user)
        current_level = int(p["vault_level"] or 0) if kind == "vault" else int(p[kind] or 0)
        level_limit = VAULT_MAX_LEVEL if kind == "vault" else EQUIPMENT_MAX_LEVEL
        if current_level >= level_limit:
            return bot.answer_callback_query(c.id, f"به حداکثر سطح {level_limit} رسیدی!")
        cost = price(kind, p)
        if p["coins"] < cost:
            return bot.answer_callback_query(c.id, "سکه کافی نداری!")
        if kind == "vault":
            db.execute("UPDATE players SET coins=coins-?, vault_level=vault_level+1 WHERE id=?",
                       (cost, p["id"]))
        else:
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
    return VAULT_BASE_CAP * (int(p["vault_level"] or 0) + 1)


def vault_page(user):
    p = get_player(user)
    cap = vault_cap(p)
    vault_now = int(p["vault"] or 0)
    body = (
        f"💰 سکه‌های جیبی (قابل دزدی): <b>{p['coins']}</b>\n"
        f"🔐 داخل صندوق امن (غیرقابل دزدی): <b>{vault_now}</b> / {cap}\n\n"
        "سکه‌هایی که توی صندوق باشن توسط دزدها دیده نمی‌شن.\n"
        "با ارتقای مستقل 🔐 صندوق امن از بخش تجهیزات، ظرفیت صندوق ۱۰۰۰ تا بیشتر می‌شه.\n"
        "برای ارتقای تجهیزات و انتقال سکه، ابتدا از صندوق برداشت کن."
    )
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🔒 سپرده ۱۰۰", "v:dep:100"), btn("🔒 سپرده ۵۰۰", "v:dep:500"), btn("🔒 سپرده همه", "v:dep:all"))
    kb.add(btn("🔓 برداشت ۱۰۰", "v:wd:100"), btn("🔓 برداشت ۵۰۰", "v:wd:500"), btn("🔓 برداشت همه", "v:wd:all"))
    kb.add(btn("🔙 منو", "m:menu"))
    return card("صندوق امن", body), kb


def vault_move(user, direction, amount):
    get_player(user)
    uid = user.id
    if amount != "all" and (not str(amount).isdigit() or len(str(amount)) > MAX_DIGITS):
        return "❌ مقدار نامعتبر است."
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT coins, vault, guard, vault_level FROM players WHERE id=?", (uid,)).fetchone()
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
                return f"❌ صندوق پر است ({vault_now}/{cap}). سطح صندوق امن را از بخش تجهیزات ارتقا بده."
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


@bot.callback_query_handler(func=lambda c: bool(c.data and c.data.startswith("v:")))
def vault_callback(c):
    parts = (c.data or "").split(":")
    if len(parts) != 3 or parts[1] not in ("dep", "wd") or not c.from_user:
        try:
            bot.answer_callback_query(c.id, "دکمه نامعتبر است.", show_alert=True)
        except Exception:
            pass
        return
    try:
        msg = vault_move(c.from_user, parts[1], parts[2])
        page, kb = vault_page(c.from_user)
        try:
            bot.answer_callback_query(c.id, "عملیات صندوق انجام شد.")
        except Exception:
            pass
        edit(c, msg + "\n\n" + page, kb)
    except Exception as e:
        try:
            bot.answer_callback_query(c.id, "خطا در عملیات صندوق؛ دوباره تلاش کن.", show_alert=True)
        except Exception:
            pass
        print("vault_callback error:", repr(e))


# ---------- سنگ کاغذ قیچی ----------
RPS_SYMBOLS = {"r": ("🪨", "سنگ"), "p": ("📄", "کاغذ"), "s": ("✂️", "قیچی")}
RPS_BEATS = {"r": "s", "s": "p", "p": "r"}  # سنگ قیچی را می‌شکند، قیچی کاغذ را می‌برد، کاغذ سنگ را می‌پوشاند


def do_rps(user, choice, bet):
    if choice not in RPS_SYMBOLS:
        return "❌ انتخاب نامعتبر."
    p = get_player(user)
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    escrow_id = _new_escrow_id("bot-rps", p["id"])
    ok, error = reserve_wager(p["id"], bet, escrow_id)
    if not ok:
        return error
    bot_choice = random.choice(list(RPS_SYMBOLS))
    me_e, me_n = RPS_SYMBOLS[choice]
    bt_e, bt_n = RPS_SYMBOLS[bot_choice]
    head = f"{me_e} تو: <b>{me_n}</b>   🆚   {bt_e} ربات: <b>{bt_n}</b>\n💰 شرط: <b>{int(bet):,} سکه</b>\n{LINE}\n"
    if choice == bot_choice:
        money = settle_bot_wager(p["id"], escrow_id, "draw", xp=3)
        return head + "🤝 مساوی! +۳ XP گرفتی.\n" + money
    if RPS_BEATS[choice] == bot_choice:
        money = settle_bot_wager(p["id"], escrow_id, "win", xp=5)
        return head + "🏆 بردی! +۵ XP گرفتی.\n" + money
    money = settle_bot_wager(p["id"], escrow_id, "lose", xp=1)
    return head + "💪 این دور ربات برد؛ +۱ XP گرفتی.\n" + money


@bot.message_handler(commands=["rps"])
def cmd_rps(m):
    bet = parse_bet_argument(m)
    if bet is False:
        return reply(m, "فرمت: <code>/rps مبلغ</code>")
    if bet is None:
        return ask_bot_bet(m.chat.id, m.from_user, "rps")
    return play_bot_game(m.chat.id, m.from_user, "rps", bet)


@bot.callback_query_handler(func=lambda c: c.data.startswith(("rb:", "r:")))
def rps_callback(c):
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    return launch_free_bot_game(c.message.chat.id, c.from_user, "rps")


# ---------- تب‌های لیدربورد ----------
@bot.callback_query_handler(func=lambda c: c.data.startswith("top:"))
def top_callback(c):
    kind = c.data.split(":", 1)[1]
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    if kind not in TOP_BOARDS:
        kind = "overall"
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
# بازی‌های شانسی با شرط دلخواه؛ فقط سکه‌های مجازی داخل همین ربات استفاده می‌شوند.
BLACKJACK_STATES = {}
GUESS_STATES = {}
GUESS_COOLDOWN = 24 * 3600
FREE_ROULETTE_COOLDOWN = 24 * 3600
DAILY_MISSION_TARGET = 5
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


# بازار بازیکنان و محصولات مزرعه در این نسخه حذف شده‌اند؛ جدول‌های مربوط نیز هنگام شروع حذف می‌شوند.

# ---- بلک‌جک با شرط سکه‌های مجازی ----
def bj_card(): return random.choice([1,2,3,4,5,6,7,8,9,10,10,10,10])
def bj_total(cards):
    total = sum(cards); aces = cards.count(1)
    while total <= 11 and aces > 0: total += 10; aces -= 1
    return total

def blackjack_markup(uid):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("🃏 کارت بگیر", "bj:hit"), btn("✋ توقف", "bj:stand"))
    kb.add(btn("❌ لغو و بازگشت شرط", "bj:cancel"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def blackjack_text(state, reveal=False):
    mine = bj_total(state["player"])
    dealer = bj_total(state["dealer"] if reveal else state["dealer"][:1])
    bet = int(state.get("bet", 0))
    return card("بلک‌جک", f"دست تو: <b>{state['player']}</b> = {mine}\n"
                f"دست ربات: <b>{state['dealer'] if reveal else str(state['dealer'][:1]) + ' + ❓'}</b> = {dealer if reveal else '؟'}\n"
                f"💰 شرط: <b>{bet:,} سکه</b>\nبرای برد، مجموع دست تو باید از ربات بیشتر و حداکثر ۲۱ باشد.")


def start_blackjack(user, bet):
    uid = user.id
    get_player(user)
    if uid in BLACKJACK_STATES and not BLACKJACK_STATES[uid].get("done"):
        return blackjack_text(BLACKJACK_STATES[uid]), blackjack_markup(uid)
    escrow_id = _new_escrow_id("bot-blackjack", uid)
    ok, error = reserve_wager(uid, bet, escrow_id)
    if not ok:
        return error, back_markup()
    state = {"player": [bj_card(), bj_card()], "dealer": [bj_card(), bj_card()],
             "done": False, "bet": int(bet), "escrow_id": escrow_id}
    BLACKJACK_STATES[uid] = state
    if bj_total(state["player"]) == 21:
        state["done"] = True
        money = settle_bot_wager(uid, escrow_id, "win", xp=10)
        return blackjack_text(state, True) + f"\n🎉 بلک‌جک! +۱۰ XP\n{money}", result_markup()
    return blackjack_text(state), blackjack_markup(uid)


@bot.message_handler(commands=["blackjack", "bj"])
def cmd_blackjack(m):
    bet = parse_bet_argument(m)
    if bet is False:
        return reply(m, "فرمت: <code>/blackjack مبلغ</code>")
    if bet is None:
        return ask_bot_bet(m.chat.id, m.from_user, "blackjack")
    text_value, markup_value = start_blackjack(m.from_user, bet)
    reply(m, text_value, markup_value)


def play_blackjack(user, action):
    uid = user.id
    state = BLACKJACK_STATES.get(uid)
    if not state or state.get("done"):
        return "❌ دست فعالی نداری؛ /blackjack مبلغ را بزن."
    if action == "cancel":
        refund_wager(state.get("escrow_id"))
        state["done"] = True
        BLACKJACK_STATES.pop(uid, None)
        return "❌ دست لغو شد؛ شرط کامل به کیف پولت برگشت."
    if action == "hit":
        state["player"].append(bj_card())
        if bj_total(state["player"]) < 22:
            return blackjack_text(state), blackjack_markup(uid)
    if bj_total(state["player"]) <= 21:
        while bj_total(state["dealer"]) < 17:
            state["dealer"].append(bj_card())
    mine = bj_total(state["player"])
    dealer = bj_total(state["dealer"])
    state["done"] = True
    if mine <= 21 and (dealer > 21 or mine > dealer):
        money = settle_bot_wager(uid, state["escrow_id"], "win", xp=10)
        result = "🏆 بردی! +۱۰ XP\n" + money
    elif mine == dealer:
        money = settle_bot_wager(uid, state["escrow_id"], "draw", xp=3)
        result = "🤝 مساوی! +۳ XP\n" + money
    else:
        money = settle_bot_wager(uid, state["escrow_id"], "lose", xp=1)
        result = "این دست را باختی؛ +۱ XP\n" + money
    return blackjack_text(state, True) + "\n" + result, result_markup()


# ---- رولت رنگی با شرط دلخواه؛ همچنان هر ۲۴ ساعت یک بار ----
def do_roulette(user, chosen_color, bet):
    p = get_player(user)
    now = time.time()
    escrow_id = _new_escrow_id("bot-roulette", p["id"])
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT last_at FROM free_roulette_claims WHERE user_id=?", (p["id"],)).fetchone()
        last_at = float(row["last_at"] or 0) if row else 0
        remaining = FREE_ROULETTE_COOLDOWN - (now - last_at)
        if remaining > 0:
            db.rollback()
            return f"⏳ رولت بعدی تا {int(remaining//3600)} ساعت و {int(remaining%3600//60)} دقیقه دیگر آماده می‌شود."
        balance_row = db.execute("SELECT coins FROM players WHERE id=?", (p["id"],)).fetchone()
        balance = int(balance_row["coins"] or 0)
        if balance < int(bet):
            db.rollback()
            return f"❌ موجودی کیف پولت {balance:,} سکه است؛ شرط کمتر وارد کن."
        if balance + int(bet) > MAX_SQLITE_INT:
            db.rollback()
            return "❌ این مبلغ از سقف قابل پشتیبانی کیف پول بیشتر است."
        db.execute("UPDATE players SET coins=coins-? WHERE id=?", (int(bet), p["id"]))
        db.execute("INSERT INTO wager_escrows(escrow_id,user_id,amount,created_at) VALUES(?,?,?,?)",
                   (escrow_id, p["id"], int(bet), now))
        db.execute("INSERT OR REPLACE INTO free_roulette_claims(user_id,last_at) VALUES(?,?)", (p["id"], now))
        db.commit()
    color = random.choice(["red", "black", "green"])
    labels = {"red": "قرمز 🔴", "black": "سیاه ⚫", "green": "سبز 🟢"}
    if chosen_color == color:
        money = settle_bot_wager(p["id"], escrow_id, "win", xp=10)
        return f"🎡 خانه <b>{labels[color]}</b> آمد؛ درست حدس زدی!\n💰 شرط: <b>{int(bet):,} سکه</b>\n+۱۰ XP\n{money}"
    money = settle_bot_wager(p["id"], escrow_id, "lose", xp=1)
    return f"🎡 خانه <b>{labels[color]}</b> آمد؛ انتخاب تو {labels.get(chosen_color, chosen_color)} بود.\n💰 شرط: <b>{int(bet):,} سکه</b>\n+۱ XP\n{money}"


@bot.message_handler(commands=["roulette"])
def cmd_roulette(m):
    bet = parse_bet_argument(m)
    if bet is False:
        return reply(m, "فرمت: <code>/roulette مبلغ</code>")
    if bet is None:
        return ask_bot_bet(m.chat.id, m.from_user, "roulette")
    return play_bot_game(m.chat.id, m.from_user, "roulette", bet)


# ---- حدس عدد با شرط سکه‌های مجازی و پاداش XP ----
def start_guess(user, bet):
    uid = user.id
    get_player(user)
    if uid in GUESS_STATES:
        state = GUESS_STATES[uid]
        kb = types.InlineKeyboardMarkup()
        kb.add(*[btn(str(x), f"guess:{x}") for x in range(1, 6)])
        kb.add(*[btn(str(x), f"guess:{x}") for x in range(6, 11)])
        kb.add(btn("❌ لغو و بازگشت شرط", "guess:cancel"))
        return f"یک دور حدس عدد در حال انجام داری؛ شرط فعلی {int(state.get('bet',0)):,} سکه است. عددی بین ۱ تا ۱۰ انتخاب کن.", kb
    now = time.time()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        row = db.execute("SELECT value FROM settings WHERE key=?", (f"guess_last_{uid}",)).fetchone()
        last = float(row["value"]) if row else 0
        if now - last < GUESS_COOLDOWN:
            db.rollback()
            return f"⏳ حدس عدد بعدی {int((GUESS_COOLDOWN-(now-last))//3600)} ساعت دیگر آماده است.", back_markup()
        current = db.execute("SELECT coins FROM players WHERE id=?", (uid,)).fetchone()
        balance = int(current["coins"] or 0)
        if balance < int(bet):
            db.rollback()
            return f"❌ موجودی کیف پولت {balance:,} سکه است؛ شرط کمتر وارد کن.", back_markup()
        if balance + int(bet) > MAX_SQLITE_INT:
            db.rollback()
            return "❌ این مبلغ از سقف قابل پشتیبانی کیف پول بیشتر است.", back_markup()
        escrow_id = _new_escrow_id("bot-guess", uid)
        db.execute("UPDATE players SET coins=coins-? WHERE id=?", (int(bet), uid))
        db.execute("INSERT INTO wager_escrows(escrow_id,user_id,amount,created_at) VALUES(?,?,?,?)",
                   (escrow_id, uid, int(bet), now))
        db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)", (f"guess_last_{uid}", str(now)))
        db.commit()
    GUESS_STATES[uid] = {"number": random.randint(1, 10), "tries": 0,
                         "bet": int(bet), "escrow_id": escrow_id, "previous_last": last}
    kb = types.InlineKeyboardMarkup()
    kb.add(*[btn(str(x), f"guess:{x}") for x in range(1, 6)])
    kb.add(*[btn(str(x), f"guess:{x}") for x in range(6, 11)])
    kb.add(btn("❌ لغو و بازگشت شرط", "guess:cancel"))
    return card("حدس عدد", f"یک عدد بین ۱ تا ۱۰ انتخاب کن.\n۵ تلاش داری.\n💰 شرط: <b>{int(bet):,} سکه</b>\nاگر درست حدس بزنی، شرطت برمی‌گردد و به همان اندازه سود می‌گیری؛ اگر هر ۵ تلاش تمام شود، شرط از دست می‌رود."), kb


@bot.message_handler(commands=["guess"])
def cmd_guess(m):
    bet = parse_bet_argument(m)
    if bet is False:
        return reply(m, "فرمت: <code>/guess مبلغ</code>")
    if bet is None:
        return ask_bot_bet(m.chat.id, m.from_user, "guess")
    text_value, markup_value = start_guess(m.from_user, bet)
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
@bot.callback_query_handler(func=lambda c: c.data.startswith(("mission:", "raffle:", "bj:", "guess:")))
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
        uid = user.id
        state = GUESS_STATES.get(uid)
        if not state:
            return bot.answer_callback_query(c.id, "اول بازی حدس عدد را شروع کن.")
        action = data.split(":", 1)[1]
        if action == "cancel":
            refund_wager(state.get("escrow_id"))
            GUESS_STATES.pop(uid, None)
            with lock:
                old_last = float(state.get("previous_last", 0))
                key = f"guess_last_{uid}"
                if old_last > 0:
                    db.execute("INSERT OR REPLACE INTO settings(key,value) VALUES(?,?)", (key, str(old_last)))
                else:
                    db.execute("DELETE FROM settings WHERE key=?", (key,))
                db.commit()
            return edit(c, "❌ بازی حدس عدد لغو شد؛ شرط کامل به کیف پولت برگشت و زمان بازی هم آزاد شد.", back_markup())
        try:
            guess = int(action)
        except ValueError:
            return
        if guess < 1 or guess > 10:
            return bot.answer_callback_query(c.id, "عدد باید بین ۱ تا ۱۰ باشد.")
        state["tries"] += 1
        target = state["number"]
        bet = int(state["bet"])
        if guess == target:
            money = settle_bot_wager(uid, state["escrow_id"], "win", xp=10)
            GUESS_STATES.pop(uid, None)
            return edit(c, card("حدس عدد", f"🎉 درست حدس زدی! عدد {target} بود. +۱۰ XP\\n{money}"), result_markup())
        if state["tries"] >= 5:
            money = settle_bot_wager(uid, state["escrow_id"], "lose", xp=1)
            GUESS_STATES.pop(uid, None)
            return edit(c, card("حدس عدد", f"این دور تمام شد. عدد {target} بود.\\n💰 شرط: {bet:,} سکه\\n{money}"), result_markup())
        direction = "بزرگ‌تر" if guess < target else "کوچک‌تر"
        kb = types.InlineKeyboardMarkup()
        kb.add(*[btn(str(x), f"guess:{x}") for x in range(1, 6)])
        kb.add(*[btn(str(x), f"guess:{x}") for x in range(6, 11)])
        kb.add(btn("❌ لغو و بازگشت شرط", "guess:cancel"))
        return edit(c, card("حدس عدد", f"❌ درست نبود؛ عدد مخفی {direction} است.\\nشرط: <b>{bet:,} سکه</b>\\nتلاش: {state['tries']}/5"), kb)
    if data.startswith(("crop:", "market:")):
        return bot.answer_callback_query(c.id, "🗑 این بخش از بازی حذف شده است.", show_alert=True)




if __name__ == "__main__":
    try:
        bot.set_my_commands([
            types.BotCommand("start", "🎮 منوی اصلی"),
            types.BotCommand("mine", "⛏ جمع کردن سکه"),
            types.BotCommand("farm", "🌾 مزرعه و درآمد ساعتی"),
            types.BotCommand("wheel", "🎡 چرخ شانس"),
            types.BotCommand("vault", "🔐 صندوق امن (ضد دزدی)"),
            types.BotCommand("rps", "✊ سنگ کاغذ قیچی با شرط دلخواه"),
            types.BotCommand("admin", "⚙️ پنل ادمین (فقط مدیر)"),
            types.BotCommand("daily", "🎁 جایزه روزانه"),
            types.BotCommand("profile", "👤 پروفایل"),
            types.BotCommand("top", "⭐ رتبه‌بندی XP + شماره حساب"),
            types.BotCommand("bank", "🏦 شماره حساب و موجودی"),
            types.BotCommand("transfer", "📤 انتقال سکه با شماره حساب"),
            types.BotCommand("history", "🧾 تاریخچه انتقال و دزدی"),
            types.BotCommand("invite", "🎟 لینک دعوت و پاداش ۵۰۰ سکه‌ای"),
            types.BotCommand("missions", "📋 ماموریت روزانه"),
            types.BotCommand("achievements", "🏅 دستاوردها و مدال‌ها"),
            types.BotCommand("weekly", "🏆 رقابت هفتگی"),
            types.BotCommand("raffle", "🎟 قرعه‌کشی رایگان"),
            types.BotCommand("blackjack", "🃏 بلک‌جک با شرط دلخواه"),
            types.BotCommand("roulette", "🎡 رولت با شرط دلخواه"),
            types.BotCommand("guess", "🔢 حدس عدد با شرط دلخواه"),
            types.BotCommand("deposit", "🏛 سپرده‌گذاری"),
            types.BotCommand("withdraw", "🏛 برداشت سپرده"),
            types.BotCommand("redeem", "🎁 کد هدیه"),
            types.BotCommand("shop", "🛒 ارتقای دزد، نگهبان و کلنگ"),
            types.BotCommand("dice", "🎲 تاس (مثلاً /dice 50)"),
            types.BotCommand("slots", "🎰 اسلات با شرط دلخواه هر ۶ ساعت"),
            types.BotCommand("arena", "🎯 آرنا با شرط دلخواه"),
            types.BotCommand("cyber", "💻 حمله سایبری درون‌بازی (۵۰۰۰۰ سکه)"),
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
