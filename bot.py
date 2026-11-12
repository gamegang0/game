import os, html, sqlite3, random, time, threading, shutil, hashlib, signal, hmac
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
bot = telebot.TeleBot(TOKEN)

# آیدی عددی تو (از دستور /myid توی بات بگیر). بکاپ دیتابیس توی چت خصوصی تو با بات ذخیره و پین می‌شه.
ADMIN_ID = int(os.environ.get("ADMIN_ID", "0") or 0)
# رمز پنل ادمین داخل خود فایل است؛ برای تغییر، همین مقدار را ویرایش کن.
ADMIN_PASSWORD = "84729163"


def restore_from_telegram():
    """اگه فایل دیتابیس نبود (هاست همه‌چیز رو پاک کرده)، آخرین بکاپِ پین‌شده توی چت ادمین رو برمی‌گردونه."""
    if os.path.exists(DB_PATH) and os.path.getsize(DB_PATH) > 0:
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
db.execute("""CREATE TABLE IF NOT EXISTS players(
    id INTEGER PRIMARY KEY, name TEXT, coins INTEGER DEFAULT 100,
    last_mine REAL DEFAULT 0, last_daily REAL DEFAULT 0,
    wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0)""")
for col in (
    "xp INTEGER DEFAULT 0", "sword INTEGER DEFAULT 0",
    "armor INTEGER DEFAULT 0", "last_steal REAL DEFAULT 0",
    "account_no TEXT", "thief INTEGER DEFAULT 0", "guard INTEGER DEFAULT 0",
    "custom_name INTEGER DEFAULT 0", "farm_level INTEGER DEFAULT 1",
    "farm_last_claim REAL DEFAULT 0"
):
    try:
        db.execute(f"ALTER TABLE players ADD COLUMN {col}")
    except sqlite3.OperationalError:
        pass

# شماره حساب بازی برای بازیکنان قدیمی هم ساخته می‌شود؛ شماره‌ها یکتا هستند.
def make_account_number():
    while True:
        number = str(random.randint(10_000_000, 99_999_999))
        exists = db.execute(
            "SELECT 1 FROM players WHERE account_no=?", (number,)
        ).fetchone()
        if not exists:
            return number

for old_player in db.execute(
    "SELECT id FROM players WHERE account_no IS NULL OR account_no=''"
).fetchall():
    db.execute(
        "UPDATE players SET account_no=? WHERE id=?",
        (make_account_number(), old_player["id"])
    )
db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_players_account_no ON players(account_no)")
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
# برای بازیکنان قدیمی، درآمد مزرعه از زمان نصب این نسخه محاسبه می‌شود؛ نه از سال ۱۹۷۰.
db.execute("UPDATE players SET farm_last_claim=? WHERE farm_last_claim IS NULL OR farm_last_claim<=0", (time.time(),))
db.commit()

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
name_setup_state = set()  # کاربرانی که باید نام نمایشی انتخاب کنند
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
SLOT_COST = 20
GIVE_TAX_PERCENT = 5
MAX_DIGITS = 9
FARM_BASE_INCOME = 50          # هر سطح مزرعه، ۵۰ سکه در ساعت
FARM_UPGRADE_COST = 100        # هزینه ثابت هر ارتقا
FARM_UPGRADE_XP = 50           # امتیاز (XP) که با هر ارتقا گرفته می‌شود
FARM_INCOME_STEP = 50          # افزایش درآمد ساعتی با هر ارتقا
FARM_MAX_LEVEL = 1_000_000
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


def face(v):
    return FACES[v - 1] if 1 <= v <= 6 else str(v)


def card(head, body):
    return f"✨ <b>{head}</b> ✨\n{LINE}\n{body}"


def rank_title(p):
    lv = 1 + p["xp"] // 100
    if lv >= 10:
        return "🐉 افسانه‌ای"
    if lv >= 7:
        return "👑 فرمانده"
    if lv >= 5:
        return "🛡 شوالیه"
    if lv >= 3:
        return "⚔️ جنگجو"
    return "🌱 تازه‌کار"


def xp_bar(xp):
    filled = (xp % 100) // 10
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
    kb.add(btn("⛏ جمع‌آوری سکه", "m:mine"), btn("🎁 جایزه روزانه", "m:daily"))
    kb.add(btn("👤 پروفایل", "m:profile"), btn("🏆 برترین‌ها", "m:top"))
    kb.add(btn("🛒 فروشگاه", "m:shop"), btn("🎰 اسلات", "m:slots"))
    kb.add(btn("🎲 تاس", "m:dice"), btn("⚔️ آرنا", "m:arena"))
    kb.add(btn("🏦 بانک و شماره حساب", "m:bank"), btn("🧾 تاریخچه", "m:history"))
    kb.add(btn("🎮 بازی‌های بیشتر", "m:games"))
    kb.add(btn("🌾 مزرعه و درآمد ساعتی", "m:farm"))
    kb.add(btn("🎟 دعوت دوستان +۵۰۰ سکه", "m:referral"))
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
        if not current:
            db.execute(
                "INSERT OR IGNORE INTO players(id, name, account_no) VALUES(?, ?, ?)",
                (user.id, user.first_name, make_account_number())
            )
        elif not current["account_no"]:
            db.execute(
                "UPDATE players SET account_no=? WHERE id=?",
                (make_account_number(), user.id)
            )
        db.execute("UPDATE players SET name=CASE WHEN COALESCE(custom_name, 0)=0 THEN ? ELSE name END WHERE id=?",
                   (user.first_name, user.id))
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


def level(p):
    return 1 + p["xp"] // 100


def power(p):
    return p["sword"] * 2 + p["armor"]  # سطح (XP) روی قدرت تاثیری نداره


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
    bases = {"sword": 300, "armor": 200, "thief": 250, "guard": 250}
    return bases[kind] * (p[kind] + 1)


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
        if r < 0.05:
            loss = min(10, current["coins"])
            db.execute("UPDATE players SET last_mine=?, coins=coins-?, xp=xp+1 WHERE id=?",
                       (now, loss, p["id"]))
            result = f"🦹 دزدها بهت حمله کردن و {loss} سکه بردن!"
        elif r < 0.15:
            gain = random.randint(15, 25) * 3
            db.execute("UPDATE players SET last_mine=?, coins=coins+?, xp=xp+5 WHERE id=?",
                       (now, gain, p["id"]))
            result = f"💎 صندوق گنج پیدا کردی! <b>{gain}</b> سکه! 🎉"
        else:
            gain = random.randint(5, 25)
            db.execute("UPDATE players SET last_mine=?, coins=coins+?, xp=xp+2 WHERE id=?",
                       (now, gain, p["id"]))
            flavor = random.choice(["⛏ توی معدن کار کردی", "🪙 یه کیسه سکه پیدا کردی",
                                    "🏔 از کوه سکه آوردی", "🐪 کاروان رد شد و سکه ریخت"])
            result = f"{flavor}: <b>+{gain}</b> سکه"
        db.commit()
    return result


def do_daily(user):
    p = get_player(user)
    now = time.time()
    with lock:
        db.execute("BEGIN IMMEDIATE")
        current = db.execute("SELECT last_daily FROM players WHERE id=?", (p["id"],)).fetchone()
        wait = DAILY_COOLDOWN - (now - current["last_daily"])
        if wait > 0:
            db.rollback()
            return f"⏳ {int(wait // 3600)} ساعت و {int(wait % 3600 // 60)} دقیقه دیگه."
        db.execute("UPDATE players SET last_daily=?, coins=coins+?, xp=xp+10 WHERE id=?",
                   (now, DAILY_REWARD, p["id"]))
        db.commit()
    return f"🎁 جایزه روزانه: <b>+{DAILY_REWARD}</b> سکه!"


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
        reward = hours * level_now * FARM_BASE_INCOME
        # افزودن به زمان قبلی، دقیقه‌های ناقص را برای ساعت بعد حفظ می‌کند.
        new_last = last + hours * 3600
        db.execute("UPDATE players SET coins=coins+?, farm_last_claim=? WHERE id=?",
                   (reward, new_last, uid))
        db.commit()
        return reward, hours


def farm_markup(p):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("💰 دریافت درآمدِ آماده‌شده", "farm:collect"))
    kb.add(btn(f"⬆️ ارتقا — {FARM_UPGRADE_COST} سکه (+{FARM_INCOME_STEP} سکه/ساعت، +{FARM_UPGRADE_XP} امتیاز)", "farm:upgrade"))
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
    body = (
        f"🌾 سطح مزرعه: <b>{p['farm_level']}</b>\n"
        f"💵 درآمد هر ساعت: <b>{p['farm_level'] * FARM_BASE_INCOME}</b> سکه\n"
        f"💰 موجودی فعلی: <b>{p['coins']}</b> سکه\n"
        f"⬆️ هزینه هر ارتقا: <b>{FARM_UPGRADE_COST}</b> سکه\n"
        f"📈 هر ارتقا: <b>+{FARM_INCOME_STEP} سکه در ساعت</b> و <b>+{FARM_UPGRADE_XP} امتیاز</b>\n"
    )
    if collected:
        body += f"\n✅ درآمد {hours} ساعت گذشته دریافت شد: <b>+{collected}</b> سکه\n"
    body += f"\n⏳ تا درآمد بعدی: <b>{mins} دقیقه و {secs} ثانیه</b>\n"
    body += "\nدرآمد به‌ازای زمان واقعی جمع می‌شود؛ ساعت‌های ناقص هم برای نوبت بعد حفظ می‌شوند."
    return card("مزرعه", body), farm_markup(p)


def upgrade_farm(uid):
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
        if p["coins"] < FARM_UPGRADE_COST:
            db.rollback()
            return f"❌ برای ارتقا {FARM_UPGRADE_COST} سکه لازم داری. موجودی: {p['coins']} سکه."
        db.execute("UPDATE players SET coins=coins-?, farm_level=farm_level+1, xp=xp+? WHERE id=?",
                   (FARM_UPGRADE_COST, FARM_UPGRADE_XP, uid))
        db.commit()
    return (f"✅ مزرعه ارتقا یافت! درآمد ساعتی از {(level_now * FARM_BASE_INCOME)} به {(level_now + 1) * FARM_BASE_INCOME} سکه رسید.\n"
            f"⭐ <b>+{FARM_UPGRADE_XP}</b> امتیاز گرفتی.")


def do_profile(user):
    p = get_player(user)
    body = (f"👤 <b>{nm(p)}</b>  {rank_title(p)}\n"
            f"💰 سکه: <b>{p['coins']}</b>\n"
            f"🏦 شماره حساب: <code>{p['account_no']}</code>\n"
            f"⭐ سطح {level(p)}  {xp_bar(p['xp'])}  {p['xp'] % 100}/100\n"
            f"💪 قدرت دوئل: <b>{power(p)}</b>  (⚔️{p['sword']} 🛡{p['armor']})\n"
            f"🥷 دزد: سطح {p['thief']}  |  🛡 نگهبان: سطح {p['guard']}\n"
            f"🏅 برد: {p['wins']} | 💀 باخت: {p['losses']}")
    return card("پروفایل", body)


def do_bank(user):
    p = get_player(user)
    return card("بانک و شماره حساب",
                f"👤 صاحب حساب: <b>{nm(p)}</b>\n"
                f"🏦 شماره حساب بازی: <code>{p['account_no']}</code>\n"
                f"💰 موجودی: <b>{p['coins']}</b> سکه\n\n"
                "📤 برای انتقال، دکمه «انتقال سکه» را بزن؛ شماره حساب و مبلغ را جداگانه وارد و در پایان تأیید کن.\n"
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
        else:
            label = "📤 انتقال به" if sent else "📥 دریافت از"
            sign = "-" if sent else "+"
        lines.append(f"{label} <b>{other}</b> — {sign}{row['amount']} سکه")
    return card("۸ عملیات اخیر حساب", "\n".join(lines))


def top_markup():
    kb = types.InlineKeyboardMarkup()
    with lock:
        rows = db.execute("SELECT id, name, account_no FROM players ORDER BY coins DESC LIMIT 10").fetchall()
    for i, row in enumerate(rows, 1):
        kb.add(btn(f"📋 کپی حساب نفر {i}", f"copyacct:{row['id']}"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


def do_top():
    with lock:
        rows = db.execute("SELECT * FROM players ORDER BY coins DESC LIMIT 10").fetchall()
    medals = ["🥇", "🥈", "🥉"] + ["🔹"] * 7
    lines = [f"{medals[i]} <b>{nm(r)}</b> — {r['coins']} 💰 (سطح {level(r)})\n"
             f"🏦 حساب: <code>{r['account_no']}</code>"
             for i, r in enumerate(rows)]
    return card("برترین‌ها", "\n".join(lines) if lines else "هنوز کسی بازی نکرده.")


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
        if victim["coins"] <= 0:
            return "😅 این حساب موجودی قابل سرقت ندارد."

        # هر تلاش، حتی وقتی نگهبان قوی‌تر است، زمان انتظار دارد.
        db.execute("UPDATE players SET last_steal=? WHERE id=?", (time.time(), me["id"]))
        if me["thief"] <= victim["guard"]:
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

        # مبلغ با موجودی هدف و سطح دزد تغییر می‌کند و در هر بار تصادفی است.
        max_take = min(victim["coins"], max(1, victim["coins"] // 4), 20 + me["thief"] * 25)
        min_take = max(1, max_take // 3)
        amount = random.randint(min_take, max_take)
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
            f"از حساب {nm(victim)} مقدار تصادفی <b>{amount}</b> سکه برداشتی.\n"
            f"🏦 شماره حساب هدف: <code>{victim['account_no']}</code>\n"
            f"⭐ سطح دزد تو: {me['thief']} | 🛡 نگهبان هدف: {victim['guard']}")


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
    if p["coins"] < SLOT_COST:
        return f"❌ برای اسلات {SLOT_COST} سکه لازمه."
    if too_fast(p["id"]):
        return "⏳ یکم صبر کن."
    if not spend(p["id"], SLOT_COST):
        return f"❌ برای اسلات {SLOT_COST} سکه لازمه."
    v = roll(chat_id, "🎰")
    time.sleep(3)
    if v == 64:
        win = SLOT_COST * 20
        text = f"🎰 <b>777! جکپات!</b> +{win} سکه 🎉🎉"
    elif v in (1, 22, 43):
        win = SLOT_COST * 5
        text = f"🎰 سه‌تا مثل هم! <b>+{win}</b> سکه 🎉"
    else:
        win = 0
        text = f"🎰 نشد! <b>-{SLOT_COST}</b> سکه"
    if win:
        add(p["id"], win, 5)
    return text


def do_arena(user, chat_id, bet):
    if bet > ARENA_MAX:
        return f"❌ حداکثر شرط آرنا {ARENA_MAX} سکه‌ست."
    me = get_player(user)
    if me["coins"] < bet:
        return "❌ سکه کافی نداری."
    if too_fast(me["id"]):
        return "⏳ یکم صبر کن."
    with lock:
        opp = db.execute("SELECT * FROM players WHERE id!=? AND coins>=? "
                         "ORDER BY RANDOM() LIMIT 1", (me["id"], bet)).fetchone()
    if not opp:
        return "😕 حریفی پیدا نشد. بعداً امتحان کن."
    say(chat_id, f"🎯 حریف رندوم: <b>{nm(opp)}</b>")
    return run_fight(chat_id, me["id"], opp["id"], bet)


def menu_text(user):
    p = get_player(user)
    return card("بازی سکه",
                f"👤 <b>{nm(p)}</b>  {rank_title(p)}\n"
                f"💰 {p['coins']}    ⭐ سطح {level(p)}\n"
                f"🏦 حساب: <code>{p['account_no']}</code>\n\n"
                "یکی از دکمه‌های شیشه‌ای رو بزن 👇")


HELP_TEXT = card("راهنما", (
    "⛏ /mine — جمع کردن سکه (هر ۶۰ ثانیه، رویداد رندوم)\n"
    "🎁 /daily — جایزه روزانه\n"
    "👤 /profile — سطح، قدرت و تجهیزات\n"
    "🏆 /top — برترین‌ها\n"
    "🛒 /shop — خرید شمشیر، زره، دزد و نگهبان\n"
    "🏦 /bank — نمایش شماره حساب بازی\n"
    "📤 /transfer 12345678 100 — انتقال ۱۰۰ سکه به شماره حساب مقصد\n"
    "🧾 /history — ۸ عملیات بانکی اخیر\n"
    "🎟 /invite — لینک دعوت دوستان؛ هر عضو جدید ۵۰۰ سکه پاداش دارد\n"
    f"🎲 /dice 50 — تاس بنداز؛ اگه از ربات بیشتر بیاری شرطت دو برابر می‌شه\n"
    f"🎰 /slots — اسلات ({SLOT_COST} سکه، جکپات ۲۰ برابر)\n"
    f"🎯 /arena 50 — دوئل با بازیکن رندوم (تا {ARENA_MAX} سکه)\n"
    "🪙 /flip 50 — شیر یا خط\n"
    f"🎯 /darts 50 — دارت | 🏀 /hoops 50 — بسکتبال | ⚽ /goal 50 — فوتبال | 🎳 /bowl 50 — بولینگ (تا {ARCADE_MAX} سکه)\n\n"
    "👇 این‌ها باید روی پیام یه نفر <b>ریپلای</b> بشن:\n"
    "⚔️ /duel 50 — دوئل تاسی\n"
    "🥷 /steal 12345678 — تلاش برای دزدی از شماره حساب (یا ریپلای)\n"
    f"🎁 /give 50 — سکه دادن ({GIVE_TAX_PERCENT}٪ مالیات)\n\n"
    "💡 هر بازیکن یک شماره حساب ۸ رقمی دارد؛ در لیدربورد هم نمایش داده می‌شود.\n"
    "🛡 اگر نگهبان دزد را بگیرد، جریمه تصادفی از دزد کم و به صاحب حساب داده می‌شود.\n"
    "🎟 با /invite لینک دعوت بگیر؛ برای هر بازیکن جدید ۵۰۰ سکه پاداش می‌گیری.\n"
    "💪 امتیاز دوئل = تاس × ۵ + قدرت (شمشیر و زره)؛ سطح تاثیری نداره، پس تجهیزات بخر!"))


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
                    f"👤 نام تلگرامی: <b>{esc(m.from_user.first_name)}</b>\n"
                    "💰 پاداش دعوت: <b>۵۰۰ سکه</b>",
                    parse_mode="HTML"
                )
            except Exception:
                pass
    if not p["custom_name"]:
        name_setup_state.add(m.from_user.id)
        return reply(m, "👋 خوش اومدی! برای ساخت حساب بازی، اسم نمایشی دلخواهت رو بفرست.\n"
                        "این اسم در پروفایل و لیدربورد نمایش داده می‌شه.")
    reply(m, menu_text(m.from_user), main_markup(m.from_user.id))


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
            state.update(step="account", attempts=0, expires=time.time() + ADMIN_SESSION_SECONDS)
            return reply(m, "✅ رمز درست است.\nحالا شماره حساب ۸ رقمی بازیکن یا آیدی عددی تلگرام او را بفرست:")
        state["attempts"] = state.get("attempts", 0) + 1
        if state["attempts"] >= ADMIN_MAX_ATTEMPTS:
            admin_flow_state.pop(uid, None)
            admin_login_lockout[uid] = time.time() + ADMIN_LOCKOUT_SECONDS
            return reply(m, "⛔ رمز ۵ بار اشتباه بود؛ ورود به مدت ۱۵ دقیقه قفل شد.")
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(m, f"❌ رمز اشتباه است. {ADMIN_MAX_ATTEMPTS - state['attempts']} فرصت باقی مانده.")

    if state["step"] == "account":
        normalized = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789"))
        target = None
        if normalized.isdigit() and len(normalized) == 8:
            target = get_by_account(normalized)
        elif normalized.isdigit() and len(normalized) <= 19:
            target = get_by_id(int(normalized))
        if not target:
            return reply(m, "❌ بازیکن پیدا نشد. شماره حساب ۸ رقمی یا آیدی عددی تلگرام را درست بفرست:")
        state["target_id"] = target["id"]
        state["step"] = "amount"
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(m, f"👤 بازیکن انتخاب شد: <b>{nm(target)}</b>\n🏦 حساب: <code>{target['account_no']}</code>\n⭐ چند امتیاز (XP) اضافه کنم؟ عدد مثبت بفرست:")

    if state["step"] == "amount":
        raw = raw.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹", "0123456789")).replace(",", "").replace("٬", "")
        if not raw.isdigit() or len(raw) > 19 or int(raw) <= 0:
            return reply(m, "❌ مقدار باید عدد مثبت باشد. دوباره مقدار XP را بفرست:")
        amount = int(raw)
        target_id = state.get("target_id")
        with lock:
            db.execute("BEGIN IMMEDIATE")
            target = db.execute("SELECT id, name, xp, account_no FROM players WHERE id=?", (target_id,)).fetchone()
            if not target:
                db.rollback()
                state["step"] = "account"
                state.pop("target_id", None)
                return reply(m, "❌ حساب دیگر پیدا نشد. شماره حساب بازیکن بعدی را بفرست:")
            if target["xp"] > MAX_SQLITE_INT - amount:
                db.rollback()
                return reply(m, "❌ این مقدار از ظرفیت عددی دیتابیس بیشتر است. مقدار کمتری بفرست:")
            db.execute("UPDATE players SET xp=xp+? WHERE id=?", (amount, target_id))
            db.execute("INSERT INTO admin_points_log(admin_id, target_id, amount, created_at) VALUES(?, ?, ?, ?)",
                       (uid, target_id, amount, time.time()))
            db.commit()
            updated = db.execute("SELECT xp FROM players WHERE id=?", (target_id,)).fetchone()
        state["step"] = "account"
        state.pop("target_id", None)
        state["expires"] = time.time() + ADMIN_SESSION_SECONDS
        return reply(m, f"✅ امتیاز اضافه شد.\n👤 بازیکن: <b>{esc(target['name'])}</b>\n⭐ امتیاز اضافه‌شده: <b>+{amount}</b>\n⭐ مجموع XP: <b>{updated['xp']}</b>\n🏅 سطح فعلی: <b>{1 + updated['xp'] // 100}</b>\n\nبرای بازیکن بعدی، شماره حساب یا آیدی تلگرام را بفرست.\nبرای خروج /cancel را بزن.")


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


@bot.message_handler(commands=["arena"])
def cmd_arena(m):
    bet = parse_amount(m)
    if bet is None:
        return reply(m, f"بنویس: /arena 50  (حداکثر {ARENA_MAX})")
    reply(m, do_arena(m.from_user, m.chat.id, bet), result_markup(f"a:{bet}"))


def reply_target(m):
    if not m.reply_to_message:
        return None
    u = m.reply_to_message.from_user
    if u.is_bot or u.id == m.from_user.id:
        return None
    return u


@bot.message_handler(commands=["steal"])
def cmd_steal(m):
    target, error = resolve_steal_target(m)
    if error:
        return reply(m, error)
    reply(m, do_steal(m.from_user, target), back_markup())


@bot.message_handler(commands=["give"])
def cmd_give(m):
    target_user = reply_target(m)
    amount = parse_amount(m)
    if not target_user or amount is None:
        return reply(m, "روی پیام یه نفر ریپلای کن و بنویس: /give 50")
    me = get_player(m.from_user)
    target = get_player(target_user)
    if target["id"] == me["id"]:
        return reply(m, "❌ نمی‌توانی به خودت سکه بدهی.")
    received = amount - amount * GIVE_TAX_PERCENT // 100
    with lock:
        db.execute("BEGIN IMMEDIATE")
        paid = db.execute("UPDATE players SET coins=coins-? WHERE id=? AND coins>=?",
                          (amount, me["id"], amount))
        if paid.rowcount != 1:
            db.rollback()
            return reply(m, "❌ سکه کافی نداری.")
        db.execute("UPDATE players SET coins=coins+? WHERE id=?", (received, target["id"]))
        db.execute("""INSERT INTO coin_transactions
                      (sender_id, receiver_id, amount, kind, created_at, gross_amount)
                      VALUES(?, ?, ?, 'give', ?, ?)""",
                   (me["id"], target["id"], received, time.time(), amount))
        db.commit()
    reply(m, f"🎁 {amount} سکه فرستادی و <b>{received}</b> سکه به {nm(target)} رسید "
             f"({GIVE_TAX_PERCENT}٪ مالیات).")


@bot.message_handler(commands=["duel"])
def cmd_duel(m):
    global duel_counter
    target = reply_target(m)
    bet = parse_amount(m)
    if not target or bet is None:
        return reply(m, "روی پیام حریفت ریپلای کن و بنویس: /duel 50")
    me = get_player(m.from_user)
    them = get_player(target)
    if me["coins"] < bet or them["coins"] < bet:
        return reply(m, "❌ یکی از شما سکه کافی نداره.")
    duel_counter += 1
    duels[duel_counter] = (me["id"], them["id"], bet)
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("⚔️ قبول", f"acc:{duel_counter}"), btn("🏳️ رد", f"rej:{duel_counter}"))
    reply(m, f"⚔️ <b>{nm(me)}</b> ، <b>{nm(them)}</b> رو به دوئل تاسی با شرط "
             f"<b>{bet}</b> سکه دعوت کرد!", kb)


# ---------- دکمه‌های شیشه‌ای ----------
@bot.callback_query_handler(func=lambda c: c.data.startswith(("acc:", "rej:")))
def duel_answer(c):
    action, did = c.data.split(":")
    d = duels.get(int(did))
    if not d:
        return bot.answer_callback_query(c.id, "این دوئل تموم شده.")
    challenger, target, bet = d
    if c.from_user.id != target:
        return bot.answer_callback_query(c.id, "این دوئل برای تو نیست!")
    if duels.pop(int(did), None) is None:
        return bot.answer_callback_query(c.id, "این دوئل تموم شده.")
    chat = c.message.chat.id
    bot.answer_callback_query(c.id)
    if action == "rej":
        return edit(c, "🏳️ دوئل رد شد.")
    a, b = get_by_id(challenger), get_by_id(target)
    if a["coins"] < bet or b["coins"] < bet:
        return edit(c, "❌ سکه کافی نیست، دوئل لغو شد.")
    edit(c, "⚔️ دوئل پذیرفته شد!")
    say(chat, run_fight(chat, challenger, target, bet), back_markup())


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
    if action not in ("collect", "upgrade"):
        return bot.answer_callback_query(c.id, "درخواست نامعتبر است.")
    try:
        bot.answer_callback_query(c.id)
    except Exception:
        pass
    if action == "upgrade":
        result = upgrade_farm(c.from_user.id)
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
            edit(c, card("آرنا", f"🎯 شرط رو انتخاب کن (حداکثر {ARENA_MAX}):"),
                 bet_markup("a", [20, 50, 100, 200]))
        elif arg == "games":
            edit(c, card("بازی‌های بیشتر", "یه بازی انتخاب کن 👇"), games_markup())
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
        say(chat, do_arena(user, chat, bet), result_markup(f"a:{bet}"))


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
    kb.add(btn("🎳 بولینگ", "m:bowl"))
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
    return card("فروشگاه و ارتقا",
                f"💰 سکه‌ت: <b>{p['coins']}</b>   💪 قدرت دوئل: <b>{power(p)}</b>\n\n"
                f"⚔️ شمشیر: سطح {p['sword']} (+۲ قدرت)\n"
                f"🛡 زره: سطح {p['armor']} (+۱ قدرت)\n"
                f"🥷 دزد: سطح {p['thief']} (برای عبور از نگهبان)\n"
                f"🧱 نگهبان: سطح {p['guard']} (دفاع از شماره حساب)\n\n"
                "برای سرقت، سطح دزد باید حداقل یک سطح از نگهبان مقصد بالاتر باشد.\n"
                "مبلغ هر سرقت موفق به‌صورت تصادفی تعیین می‌شود.")


def shop_markup(p):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn(f"⚔️ شمشیر {p['sword']} — {price('sword', p)} سکه", "buy:sword"))
    kb.add(btn(f"🛡 زره {p['armor']} — {price('armor', p)} سکه", "buy:armor"))
    kb.add(btn(f"🥷 ارتقای دزد {p['thief']} — {price('thief', p)} سکه", "buy:thief"))
    kb.add(btn(f"🧱 ارتقای نگهبان {p['guard']} — {price('guard', p)} سکه", "buy:guard"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


@bot.message_handler(commands=["shop"])
def cmd_shop(m):
    p = get_player(m.from_user)
    reply(m, shop_text(p), shop_markup(p))


@bot.callback_query_handler(func=lambda c: c.data.startswith("buy:"))
def buy(c):
    kind = c.data.split(":")[1]
    if kind not in ("sword", "armor", "thief", "guard"):
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


if __name__ == "__main__":
    try:
        bot.set_my_commands([
            types.BotCommand("start", "🎮 منوی اصلی"),
            types.BotCommand("mine", "⛏ جمع کردن سکه"),
            types.BotCommand("farm", "🌾 مزرعه و درآمد ساعتی"),
            types.BotCommand("admin", "⚙️ پنل ادمین (فقط مدیر)"),
            types.BotCommand("daily", "🎁 جایزه روزانه"),
            types.BotCommand("profile", "👤 پروفایل"),
            types.BotCommand("top", "🏆 برترین‌ها + شماره حساب"),
            types.BotCommand("bank", "🏦 شماره حساب و موجودی"),
            types.BotCommand("transfer", "📤 انتقال سکه با شماره حساب"),
            types.BotCommand("history", "🧾 تاریخچه انتقال و دزدی"),
            types.BotCommand("invite", "🎟 لینک دعوت و پاداش ۵۰۰ سکه‌ای"),
            types.BotCommand("shop", "🛒 فروشگاه و ارتقای دزد/نگهبان"),
            types.BotCommand("dice", "🎲 تاس (مثلاً /dice 50)"),
            types.BotCommand("slots", "🎰 اسلات"),
            types.BotCommand("arena", "🎯 آرنا (مثلاً /arena 50)"),
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
            backup_to_telegram()

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
    print("Bot is running... DB:", DB_PATH)
    bot.infinity_polling()
