import os, sqlite3, random, time, threading
import telebot
from telebot import types

TOKEN = os.environ.get("BOT_TOKEN") or "PUT_YOUR_TOKEN_HERE"  # روی سرور از متغیر محیطی BOT_TOKEN خونده می‌شه
bot = telebot.TeleBot(TOKEN)

lock = threading.Lock()
db = sqlite3.connect("game.db", check_same_thread=False)
db.execute("""CREATE TABLE IF NOT EXISTS players(
    id INTEGER PRIMARY KEY, name TEXT, coins INTEGER DEFAULT 100,
    last_mine REAL DEFAULT 0, last_daily REAL DEFAULT 0,
    wins INTEGER DEFAULT 0, losses INTEGER DEFAULT 0)""")
db.commit()

duels = {}      # duel_id -> (challenger_id, target_id, bet)
duel_counter = 0

MINE_COOLDOWN = 60          # ثانیه
DAILY_COOLDOWN = 24 * 3600
DAILY_REWARD = 200


def get_player(user):
    with lock:
        db.execute("INSERT OR IGNORE INTO players(id, name) VALUES(?, ?)",
                   (user.id, user.first_name))
        db.execute("UPDATE players SET name=? WHERE id=?", (user.first_name, user.id))
        db.commit()
        return db.execute("SELECT coins, last_mine, last_daily, wins, losses "
                          "FROM players WHERE id=?", (user.id,)).fetchone()


@bot.message_handler(commands=["start", "help"])
def start(m):
    get_player(m.from_user)
    bot.reply_to(m, "🎮 به بازی سکه خوش اومدی!\n\n"
                    "/mine ⛏ سکه جمع کن (هر ۶۰ ثانیه)\n"
                    "/daily 🎁 جایزه روزانه\n"
                    "/balance 💰 موجودی و آمار\n"
                    "/top 🏆 برترین‌ها\n"
                    "/duel <مبلغ> ⚔️ روی پیام یه نفر ریپلای کن و به دوئل دعوتش کن")


@bot.message_handler(commands=["balance"])
def balance(m):
    coins, _, _, wins, losses = get_player(m.from_user)
    bot.reply_to(m, f"💰 سکه: {coins}\n🏅 برد: {wins} | باخت: {losses}")


@bot.message_handler(commands=["mine"])
def mine(m):
    coins, last_mine, *_ = get_player(m.from_user)
    wait = MINE_COOLDOWN - (time.time() - last_mine)
    if wait > 0:
        return bot.reply_to(m, f"⏳ {int(wait)} ثانیه دیگه صبر کن.")
    gain = random.randint(5, 25)
    if random.random() < 0.1:
        gain *= 3
        text = f"💎 شانس آوردی! {gain} سکه پیدا کردی!"
    else:
        text = f"⛏ {gain} سکه جمع کردی."
    with lock:
        db.execute("UPDATE players SET coins=coins+?, last_mine=? WHERE id=?",
                   (gain, time.time(), m.from_user.id))
        db.commit()
    bot.reply_to(m, text)


@bot.message_handler(commands=["daily"])
def daily(m):
    _, _, last_daily, *_ = get_player(m.from_user)
    wait = DAILY_COOLDOWN - (time.time() - last_daily)
    if wait > 0:
        return bot.reply_to(m, f"⏳ {int(wait // 3600)} ساعت و {int(wait % 3600 // 60)} دقیقه دیگه.")
    with lock:
        db.execute("UPDATE players SET coins=coins+?, last_daily=? WHERE id=?",
                   (DAILY_REWARD, time.time(), m.from_user.id))
        db.commit()
    bot.reply_to(m, f"🎁 {DAILY_REWARD} سکه جایزه روزانه گرفتی!")


@bot.message_handler(commands=["top"])
def top(m):
    with lock:
        rows = db.execute("SELECT name, coins FROM players "
                          "ORDER BY coins DESC LIMIT 10").fetchall()
    text = "🏆 برترین‌ها:\n" + "\n".join(
        f"{i}. {name} — {coins}" for i, (name, coins) in enumerate(rows, 1))
    bot.reply_to(m, text)


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
    my_coins = get_player(m.from_user)[0]
    their_coins = get_player(target)[0]
    if my_coins < bet or their_coins < bet:
        return bot.reply_to(m, "❌ یکی از شما سکه کافی نداره.")
    duel_counter += 1
    duels[duel_counter] = (m.from_user.id, target.id, bet)
    kb = types.InlineKeyboardMarkup()
    kb.add(types.InlineKeyboardButton("⚔️ قبول", callback_data=f"acc:{duel_counter}"),
           types.InlineKeyboardButton("🏳️ رد", callback_data=f"rej:{duel_counter}"))
    bot.reply_to(m, f"⚔️ {m.from_user.first_name} ، {target.first_name} رو به دوئل "
                    f"با شرط {bet} سکه دعوت کرد!", reply_markup=kb)


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
    if action == "rej":
        return bot.edit_message_text("🏳️ دوئل رد شد.", c.message.chat.id, c.message.message_id)
    with lock:
        coins = dict(db.execute("SELECT id, coins FROM players WHERE id IN (?, ?)",
                                (challenger, target)).fetchall())
        if coins.get(challenger, 0) < bet or coins.get(target, 0) < bet:
            return bot.edit_message_text("❌ سکه کافی نیست، دوئل لغو شد.",
                                         c.message.chat.id, c.message.message_id)
        winner, loser = random.sample([challenger, target], 2)
        db.execute("UPDATE players SET coins=coins+?, wins=wins+1 WHERE id=?", (bet, winner))
        db.execute("UPDATE players SET coins=coins-?, losses=losses+1 WHERE id=?", (bet, loser))
        db.commit()
        wname = db.execute("SELECT name FROM players WHERE id=?", (winner,)).fetchone()[0]
    bot.edit_message_text(f"🏆 {wname} دوئل رو برد و {bet} سکه گرفت!",
                          c.message.chat.id, c.message.message_id)


print("Bot is running...")
bot.infinity_polling()
