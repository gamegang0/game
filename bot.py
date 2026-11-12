import os, sqlite3, random, time, threading
import telebot
from telebot import types

TOKEN = os.environ.get("BOT_TOKEN") or "PUT_YOUR_TOKEN_HERE"
DB_PATH = os.environ.get("DB_PATH", "game.db")  # روی سرور با Volume مثلاً /data/game.db
bot = telebot.TeleBot(TOKEN)

lock = threading.RLock()
db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.row_factory = sqlite3.Row
db.execute("""CREATE TABLE IF NOT EXISTS players(
    id INTEGER PRIMARY KEY, name TEXT, coins INTEGER DEFAULT 100,
    last_mine REAL DEFAULT 0, last_daily REAL DEFAULT 0,
    wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0)""")
for col in ("xp INTEGER DEFAULT 0", "sword INTEGER DEFAULT 0",
            "armor INTEGER DEFAULT 0", "last_steal REAL DEFAULT 0"):
    try:
        db.execute(f"ALTER TABLE players ADD COLUMN {col}")
    except sqlite3.OperationalError:
        pass
db.commit()

duels = {}
duel_counter = 0

MINE_COOLDOWN = 60
DAILY_COOLDOWN = 24 * 3600
STEAL_COOLDOWN = 300
DAILY_REWARD = 200
ARENA_MAX = 200
MAX_UPGRADE = 10


# ---------- کمکی‌ها ----------
def get_player(user):
    with lock:
        db.execute("INSERT OR IGNORE INTO players(id, name) VALUES(?, ?)",
                   (user.id, user.first_name))
        db.execute("UPDATE players SET name=? WHERE id=?", (user.first_name, user.id))
        db.commit()
        return db.execute("SELECT * FROM players WHERE id=?", (user.id,)).fetchone()


def get_by_id(uid):
    with lock:
        return db.execute("SELECT * FROM players WHERE id=?", (uid,)).fetchone()


def level(p):
    return 1 + p["xp"] // 100


def power(p):
    return level(p) + p["sword"] * 2 + p["armor"]


def add(uid, coins=0, xp=0):
    with lock:
        db.execute("UPDATE players SET coins=coins+?, xp=xp+? WHERE id=?", (coins, xp, uid))
        db.commit()


def fight(a, b):
    """برنده بر اساس قدرت شانسی انتخاب می‌شه؛ (winner_id, loser_id)"""
    pa, pb = power(a), power(b)
    chance = min(0.8, max(0.2, pa / (pa + pb)))
    return (a["id"], b["id"]) if random.random() < chance else (b["id"], a["id"])


def settle(winner_id, loser_id, bet):
    with lock:
        db.execute("UPDATE players SET coins=coins+?, wins=wins+1, xp=xp+20 WHERE id=?",
                   (bet, winner_id))
        db.execute("UPDATE players SET coins=coins-?, losses=losses+1, xp=xp+5 WHERE id=?",
                   (bet, loser_id))
        db.commit()


def price(kind, p):
    base = 300 if kind == "sword" else 200
    return base * (p[kind] + 1)


# ---------- دستورات ----------
@bot.message_handler(commands=["start", "help"])
def start(m):
    get_player(m.from_user)
    bot.reply_to(m, "🎮 به بازی سکه خوش اومدی!\n\n"
                    "/mine ⛏ سکه جمع کن (هر ۶۰ ثانیه)\n"
                    "/daily 🎁 جایزه روزانه\n"
                    "/profile 👤 سطح، قدرت و تجهیزات\n"
                    "/shop 🛒 فروشگاه شمشیر و زره\n"
                    "/duel <مبلغ> ⚔️ روی پیام یه نفر ریپلای کن\n"
                    f"/arena <مبلغ> 🎲 دوئل با یه بازیکن رندوم (تا {ARENA_MAX} سکه)\n"
                    "/gamble <مبلغ> 🎰 شانس‌آزمایی\n"
                    "/steal 🥷 روی پیام یه نفر ریپلای کن و ازش بدزد\n"
                    "/top 🏆 برترین‌ها")


@bot.message_handler(commands=["profile", "balance"])
def profile(m):
    p = get_player(m.from_user)
    bot.reply_to(m, f"👤 {p['name']}\n"
                    f"💰 سکه: {p['coins']}\n"
                    f"⭐ سطح: {level(p)} (XP: {p['xp']})\n"
                    f"💪 قدرت: {power(p)}\n"
                    f"⚔️ شمشیر: {p['sword']} | 🛡 زره: {p['armor']}\n"
                    f"🏅 برد: {p['wins']} | باخت: {p['losses']}")


@bot.message_handler(commands=["mine"])
def mine(m):
    p = get_player(m.from_user)
    wait = MINE_COOLDOWN - (time.time() - p["last_mine"])
    if wait > 0:
        return bot.reply_to(m, f"⏳ {int(wait)} ثانیه دیگه صبر کن.")
    r = random.random()
    if r < 0.05:
        loss = min(10, p["coins"])
        add(p["id"], -loss, 1)
        text = f"🦹 دزدها بهت حمله کردن و {loss} سکه بردن!"
    elif r < 0.15:
        gain = random.randint(15, 25) * 3
        add(p["id"], gain, 5)
        text = f"💎 صندوق گنج پیدا کردی! {gain} سکه!"
    else:
        gain = random.randint(5, 25)
        add(p["id"], gain, 2)
        text = f"⛏ {gain} سکه جمع کردی."
    with lock:
        db.execute("UPDATE players SET last_mine=? WHERE id=?", (time.time(), p["id"]))
        db.commit()
    bot.reply_to(m, text)


@bot.message_handler(commands=["daily"])
def daily(m):
    p = get_player(m.from_user)
    wait = DAILY_COOLDOWN - (time.time() - p["last_daily"])
    if wait > 0:
        return bot.reply_to(m, f"⏳ {int(wait // 3600)} ساعت و {int(wait % 3600 // 60)} دقیقه دیگه.")
    add(p["id"], DAILY_REWARD, 10)
    with lock:
        db.execute("UPDATE players SET last_daily=? WHERE id=?", (time.time(), p["id"]))
        db.commit()
    bot.reply_to(m, f"🎁 {DAILY_REWARD} سکه جایزه روزانه گرفتی!")


@bot.message_handler(commands=["top"])
def top(m):
    with lock:
        rows = db.execute("SELECT * FROM players ORDER BY coins DESC LIMIT 10").fetchall()
    text = "🏆 برترین‌ها:\n" + "\n".join(
        f"{i}. {r['name']} (سطح {level(r)}) — {r['coins']}" for i, r in enumerate(rows, 1))
    bot.reply_to(m, text)


@bot.message_handler(commands=["gamble"])
def gamble(m):
    parts = m.text.split()
    if len(parts) < 2 or not parts[1].isdigit() or int(parts[1]) <= 0:
        return bot.reply_to(m, "بنویس: /gamble 50")
    bet = int(parts[1])
    p = get_player(m.from_user)
    if p["coins"] < bet:
        return bot.reply_to(m, "❌ سکه کافی نداری.")
    if random.random() < 0.45:
        add(p["id"], bet, 1)
        bot.reply_to(m, f"🎰 بردی! +{bet} سکه")
    else:
        add(p["id"], -bet, 1)
        bot.reply_to(m, f"🎰 باختی! -{bet} سکه")


@bot.message_handler(commands=["steal"])
def steal(m):
    if not m.reply_to_message:
        return bot.reply_to(m, "روی پیام کسی که می‌خوای ازش بدزدی ریپلای کن و بنویس /steal")
    victim_user = m.reply_to_message.from_user
    if victim_user.is_bot or victim_user.id == m.from_user.id:
        return bot.reply_to(m, "❌ هدف نامعتبر.")
    me = get_player(m.from_user)
    victim = get_player(victim_user)
    wait = STEAL_COOLDOWN - (time.time() - me["last_steal"])
    if wait > 0:
        return bot.reply_to(m, f"⏳ {int(wait)} ثانیه دیگه می‌تونی دوباره بدزدی.")
    with lock:
        db.execute("UPDATE players SET last_steal=? WHERE id=?", (time.time(), me["id"]))
        db.commit()
    if victim["coins"] < 20:
        return bot.reply_to(m, "😅 این بازیکن اونقدر سکه نداره که ارزش دزدی داشته باشه.")
    chance = min(0.6, max(0.2, 0.4 + (power(me) - power(victim)) * 0.03))
    if random.random() < chance:
        amount = max(1, min(60, victim["coins"] // 10))
        add(victim["id"], -amount)
        add(me["id"], amount, 3)
        bot.reply_to(m, f"🥷 موفق شدی! {amount} سکه از {victim['name']} دزدیدی.")
    else:
        fine = min(20, me["coins"])
        add(me["id"], -fine)
        bot.reply_to(m, f"🚨 گیر افتادی و {fine} سکه جریمه شدی!")


@bot.message_handler(commands=["arena"])
def arena(m):
    parts = m.text.split()
    if len(parts) < 2 or not parts[1].isdigit():
        return bot.reply_to(m, f"بنویس: /arena 50  (حداکثر {ARENA_MAX})")
    bet = int(parts[1])
    if bet <= 0 or bet > ARENA_MAX:
        return bot.reply_to(m, f"❌ مبلغ باید بین ۱ تا {ARENA_MAX} باشه.")
    me = get_player(m.from_user)
    if me["coins"] < bet:
        return bot.reply_to(m, "❌ سکه کافی نداری.")
    with lock:
        opp = db.execute("SELECT * FROM players WHERE id!=? AND coins>=? "
                         "ORDER BY RANDOM() LIMIT 1", (me["id"], bet)).fetchone()
        if not opp:
            return bot.reply_to(m, "😕 حریفی پیدا نشد. بعداً امتحان کن.")
        w, l = fight(me, opp)
        settle(w, l, bet)
    wname = me["name"] if w == me["id"] else opp["name"]
    lname = opp["name"] if w == me["id"] else me["name"]
    bot.reply_to(m, f"🎲 حریف رندوم: {opp['name']}\n"
                    f"🏆 {wname} برنده شد و {bet} سکه از {lname} گرفت!")


@bot.message_handler(commands=["duel"])
def duel(m):
    global duel_counter
    parts = m.text.split()
    if not m.reply_to_message or len(parts) < 2 or not parts[1].isdigit():
        return bot.reply_to(m, "روی پیام حریفت ریپلای کن و بنویس: /duel 50")
    target = m.reply_to_message.from_user
    bet = int(parts[1])
    if target.is_bot or target.id == m.from_user.id or bet <= 0:
        return bot.reply_to(m, "❌ دوئل نامعتبر.")
    me = get_player(m.from_user)
    them = get_player(target)
    if me["coins"] < bet or them["coins"] < bet:
        return bot.reply_to(m, "❌ یکی از شما سکه کافی نداره.")
    duel_counter += 1
    duels[duel_counter] = (me["id"], them["id"], bet)
    kb = types.InlineKeyboardMarkup()
    kb.add(types.InlineKeyboardButton("⚔️ قبول", callback_data=f"acc:{duel_counter}"),
           types.InlineKeyboardButton("🏳️ رد", callback_data=f"rej:{duel_counter}"))
    bot.reply_to(m, f"⚔️ {me['name']} ، {them['name']} رو به دوئل با شرط {bet} سکه دعوت کرد!",
                 reply_markup=kb)


@bot.callback_query_handler(func=lambda c: c.data.startswith(("acc:", "rej:")))
def duel_answer(c):
    action, did = c.data.split(":")
    d = duels.get(int(did))
    if not d:
        return bot.answer_callback_query(c.id, "این دوئل تموم شده.")
    challenger, target, bet = d
    if c.from_user.id != target:
        return bot.answer_callback_query(c.id, "این دوئل برای تو نیست!")
    del duels[int(did)]
    chat, mid = c.message.chat.id, c.message.message_id
    if action == "rej":
        return bot.edit_message_text("🏳️ دوئل رد شد.", chat, mid)
    with lock:
        a, b = get_by_id(challenger), get_by_id(target)
        if a["coins"] < bet or b["coins"] < bet:
            return bot.edit_message_text("❌ سکه کافی نیست، دوئل لغو شد.", chat, mid)
        w, l = fight(a, b)
        settle(w, l, bet)
    wname = a["name"] if w == a["id"] else b["name"]
    bot.edit_message_text(f"🏆 {wname} دوئل رو برد و {bet} سکه گرفت!", chat, mid)


# ---------- فروشگاه ----------
def shop_markup(p):
    kb = types.InlineKeyboardMarkup()
    kb.add(types.InlineKeyboardButton(
        f"⚔️ شمشیر (سطح {p['sword']}) — {price('sword', p)} سکه", callback_data="buy:sword"))
    kb.add(types.InlineKeyboardButton(
        f"🛡 زره (سطح {p['armor']}) — {price('armor', p)} سکه", callback_data="buy:armor"))
    return kb


@bot.message_handler(commands=["shop"])
def shop(m):
    p = get_player(m.from_user)
    bot.reply_to(m, f"🛒 فروشگاه\n💰 سکه‌ت: {p['coins']}\n"
                    "شمشیر: +۲ قدرت | زره: +۱ قدرت (قدرت بیشتر = شانس بیشتر توی دوئل)",
                 reply_markup=shop_markup(p))


@bot.callback_query_handler(func=lambda c: c.data.startswith("buy:"))
def buy(c):
    kind = c.data.split(":")[1]
    if kind not in ("sword", "armor"):
        return
    with lock:
        p = get_by_id(c.from_user.id)
        if not p:
            return bot.answer_callback_query(c.id, "اول /start بزن.")
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
    bot.edit_message_text(f"🛒 فروشگاه\n💰 سکه‌ت: {p['coins']}\n💪 قدرت: {power(p)}",
                          c.message.chat.id, c.message.message_id,
                          reply_markup=shop_markup(p))


print("Bot is running...")
bot.infinity_polling()
