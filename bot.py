import os, html, sqlite3, random, time, threading
import telebot
from telebot import types

TOKEN = os.environ.get("BOT_TOKEN") or "PUT_YOUR_TOKEN_HERE"
DB_PATH = os.environ.get("DB_PATH", "game.db")       # روی سرور با Volume مثلاً /data/game.db
CHANNEL_URL = os.environ.get("CHANNEL_URL", "")      # اختیاری: لینک کانال برای دکمه‌ی شیشه‌ای
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
last_action = {}

MINE_COOLDOWN = 60
DAILY_COOLDOWN = 24 * 3600
STEAL_COOLDOWN = 300
DAILY_REWARD = 200
ARENA_MAX = 200
MAX_UPGRADE = 10
SLOT_COST = 20
GIVE_TAX_PERCENT = 5
MAX_DIGITS = 9
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


def main_markup():
    kb = types.InlineKeyboardMarkup()
    kb.add(btn("⛏ جمع‌آوری سکه", "m:mine"), btn("🎁 جایزه روزانه", "m:daily"))
    kb.add(btn("👤 پروفایل", "m:profile"), btn("🏆 برترین‌ها", "m:top"))
    kb.add(btn("🛒 فروشگاه", "m:shop"), btn("🎰 اسلات", "m:slots"))
    kb.add(btn("🎲 تاس", "m:dice"), btn("⚔️ آرنا", "m:arena"))
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
    base = 300 if kind == "sword" else 200
    return base * (p[kind] + 1)


def do_mine(user):
    p = get_player(user)
    wait = MINE_COOLDOWN - (time.time() - p["last_mine"])
    if wait > 0:
        return f"⏳ {int(wait)} ثانیه دیگه صبر کن."
    with lock:
        db.execute("UPDATE players SET last_mine=? WHERE id=?", (time.time(), p["id"]))
        db.commit()
    r = random.random()
    if r < 0.05:
        loss = min(10, p["coins"])
        add(p["id"], -loss, 1)
        return f"🦹 دزدها بهت حمله کردن و {loss} سکه بردن!"
    if r < 0.15:
        gain = random.randint(15, 25) * 3
        add(p["id"], gain, 5)
        return f"💎 صندوق گنج پیدا کردی! <b>{gain}</b> سکه! 🎉"
    gain = random.randint(5, 25)
    add(p["id"], gain, 2)
    flavor = random.choice(["⛏ توی معدن کار کردی", "🪙 یه کیسه سکه پیدا کردی",
                            "🏔 از کوه سکه آوردی", "🐪 کاروان رد شد و سکه ریخت"])
    return f"{flavor}: <b>+{gain}</b> سکه"


def do_daily(user):
    p = get_player(user)
    wait = DAILY_COOLDOWN - (time.time() - p["last_daily"])
    if wait > 0:
        return f"⏳ {int(wait // 3600)} ساعت و {int(wait % 3600 // 60)} دقیقه دیگه."
    with lock:
        db.execute("UPDATE players SET last_daily=? WHERE id=?", (time.time(), p["id"]))
        db.commit()
    add(p["id"], DAILY_REWARD, 10)
    return f"🎁 جایزه روزانه: <b>+{DAILY_REWARD}</b> سکه!"


def do_profile(user):
    p = get_player(user)
    body = (f"👤 <b>{nm(p)}</b>  {rank_title(p)}\n"
            f"💰 سکه: <b>{p['coins']}</b>\n"
            f"⭐ سطح {level(p)}  {xp_bar(p['xp'])}  {p['xp'] % 100}/100\n"
            f"💪 قدرت: <b>{power(p)}</b>  (⚔️{p['sword']} 🛡{p['armor']})\n"
            f"🏅 برد: {p['wins']} | 💀 باخت: {p['losses']}")
    return card("پروفایل", body)


def do_top():
    with lock:
        rows = db.execute("SELECT * FROM players ORDER BY coins DESC LIMIT 10").fetchall()
    medals = ["🥇", "🥈", "🥉"] + ["🔹"] * 7
    lines = [f"{medals[i]} <b>{nm(r)}</b> — {r['coins']} 💰 (سطح {level(r)})"
             for i, r in enumerate(rows)]
    return card("برترین‌ها", "\n".join(lines) if lines else "هنوز کسی بازی نکرده.")


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
                f"💰 {p['coins']}    ⭐ سطح {level(p)}\n\n"
                "یکی از دکمه‌های شیشه‌ای رو بزن 👇")


HELP_TEXT = card("راهنما", (
    "⛏ /mine — جمع کردن سکه (هر ۶۰ ثانیه، رویداد رندوم)\n"
    "🎁 /daily — جایزه روزانه\n"
    "👤 /profile — سطح، قدرت و تجهیزات\n"
    "🏆 /top — برترین‌ها\n"
    "🛒 /shop — خرید شمشیر و زره\n"
    f"🎲 /dice 50 — تاس بنداز؛ اگه از ربات بیشتر بیاری شرطت دو برابر می‌شه\n"
    f"🎰 /slots — اسلات ({SLOT_COST} سکه، جکپات ۲۰ برابر)\n"
    f"🎯 /arena 50 — دوئل با بازیکن رندوم (تا {ARENA_MAX} سکه)\n\n"
    "👇 این‌ها باید روی پیام یه نفر <b>ریپلای</b> بشن:\n"
    "⚔️ /duel 50 — دوئل تاسی\n"
    "🥷 /steal — دزدی\n"
    f"🎁 /give 50 — سکه دادن ({GIVE_TAX_PERCENT}٪ مالیات)\n\n"
    "💡 ریپلای: روی پیام طرف انگشتت رو نگه دار و Reply رو بزن.\n"
    "💪 امتیاز دوئل = تاس × ۵ + قدرت، پس شمشیر و زره بخر!"))


# ---------- دستورات ----------
@bot.message_handler(commands=["start", "menu"])
def cmd_start(m):
    reply(m, menu_text(m.from_user), main_markup())


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


@bot.message_handler(commands=["daily"])
def cmd_daily(m):
    reply(m, do_daily(m.from_user), back_markup())


@bot.message_handler(commands=["top"])
def cmd_top(m):
    reply(m, do_top(), back_markup())


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
    target = reply_target(m)
    if not target:
        return reply(m, "روی پیام کسی که می‌خوای ازش بدزدی ریپلای کن و بنویس /steal")
    me = get_player(m.from_user)
    victim = get_player(target)
    wait = STEAL_COOLDOWN - (time.time() - me["last_steal"])
    if wait > 0:
        return reply(m, f"⏳ {int(wait)} ثانیه دیگه می‌تونی دوباره بدزدی.")
    with lock:
        db.execute("UPDATE players SET last_steal=? WHERE id=?", (time.time(), me["id"]))
        db.commit()
    if victim["coins"] < 20:
        return reply(m, "😅 این بازیکن اونقدر سکه نداره که ارزش دزدی داشته باشه.")
    chance = min(0.6, max(0.2, 0.4 + (power(me) - power(victim)) * 0.03))
    if random.random() < chance:
        amount = max(1, min(60, victim["coins"] // 10))
        add(victim["id"], -amount)
        add(me["id"], amount, 3)
        reply(m, f"🥷 موفق شدی! <b>{amount}</b> سکه از {nm(victim)} دزدیدی.")
    else:
        fine = min(20, me["coins"])
        add(me["id"], -fine)
        reply(m, f"🚨 گیر افتادی و <b>{fine}</b> سکه جریمه شدی!")


@bot.message_handler(commands=["give"])
def cmd_give(m):
    target = reply_target(m)
    amount = parse_amount(m)
    if not target or amount is None:
        return reply(m, "روی پیام یه نفر ریپلای کن و بنویس: /give 50")
    me = get_player(m.from_user)
    get_player(target)
    if not spend(me["id"], amount):
        return reply(m, "❌ سکه کافی نداری.")
    received = amount - amount * GIVE_TAX_PERCENT // 100
    add(target.id, received)
    reply(m, f"🎁 {amount} سکه فرستادی و <b>{received}</b> سکه به {esc(target.first_name)} رسید "
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
            edit(c, menu_text(user), main_markup())
        elif arg == "mine":
            edit(c, do_mine(user), result_markup("m:mine"))
        elif arg == "daily":
            edit(c, do_daily(user), back_markup())
        elif arg == "profile":
            edit(c, do_profile(user), back_markup())
        elif arg == "top":
            edit(c, do_top(), back_markup())
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
        return
    if not arg.isdigit() or not (0 < int(arg) < 10 ** MAX_DIGITS):
        return
    bet = int(arg)
    if kind == "d":
        say(chat, do_dice(user, chat, bet), result_markup(f"d:{bet}"))
    elif kind == "a":
        say(chat, do_arena(user, chat, bet), result_markup(f"a:{bet}"))


# ---------- فروشگاه ----------
def shop_text(p):
    return card("فروشگاه",
                f"💰 سکه‌ت: <b>{p['coins']}</b>   💪 قدرت: <b>{power(p)}</b>\n"
                "⚔️ شمشیر: +۲ قدرت\n🛡 زره: +۱ قدرت\n"
                "(امتیاز دوئل = تاس × ۵ + قدرت)")


def shop_markup(p):
    kb = types.InlineKeyboardMarkup()
    kb.add(btn(f"⚔️ شمشیر (سطح {p['sword']}) — {price('sword', p)} سکه", "buy:sword"))
    kb.add(btn(f"🛡 زره (سطح {p['armor']}) — {price('armor', p)} سکه", "buy:armor"))
    kb.add(btn("🔙 منو", "m:menu"))
    return kb


@bot.message_handler(commands=["shop"])
def cmd_shop(m):
    p = get_player(m.from_user)
    reply(m, shop_text(p), shop_markup(p))


@bot.callback_query_handler(func=lambda c: c.data.startswith("buy:"))
def buy(c):
    kind = c.data.split(":")[1]
    if kind not in ("sword", "armor"):
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
            types.BotCommand("daily", "🎁 جایزه روزانه"),
            types.BotCommand("profile", "👤 پروفایل"),
            types.BotCommand("top", "🏆 برترین‌ها"),
            types.BotCommand("shop", "🛒 فروشگاه"),
            types.BotCommand("dice", "🎲 تاس (مثلاً /dice 50)"),
            types.BotCommand("slots", "🎰 اسلات"),
            types.BotCommand("arena", "🎯 آرنا (مثلاً /arena 50)"),
            types.BotCommand("duel", "⚔️ دوئل (ریپلای + /duel 50)"),
            types.BotCommand("steal", "🥷 دزدی (ریپلای)"),
            types.BotCommand("give", "🎁 سکه دادن (ریپلای + /give 50)"),
            types.BotCommand("help", "❓ راهنما"),
        ])
    except Exception as e:
        print("set_my_commands failed:", e)
    print("Bot is running...")
    bot.infinity_polling()
