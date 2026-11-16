#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ربات دورهمی: مافیا 🎭 + اسم و فامیل ✍️  (یک فایل، بدون سرویس بیرونی)

نصب:   pip install pyTelegramBotAPI
اجرا:  BOT_TOKEN=توکن_بات python bot.py          (Termux:  export BOT_TOKEN=... ; python bot.py)
بعد ربات را به گروه اضافه کن و بنویس:  /mafia   یا   /esm
"""
import os, re, sys, time, random, sqlite3, threading, html, traceback
from collections import Counter
import telebot
from telebot import types

TOKEN = os.environ.get("BOT_TOKEN") or "PUT_YOUR_TOKEN_HERE"
DB_PATH = os.environ.get("DB_PATH") or os.path.join(os.path.expanduser("~"), "party_bot", "party.db")

MAFIA_MIN, MAX_PLAYERS = 4, 25
NIGHT_SEC, DAY_SEC, VOTE_SEC = 50, 75, 40       # مدت شب، بحث روز، رأی‌گیری (ثانیه)
ESM_SEC, ESM_GRACE, ESM_BREAK = 100, 10, 8       # مدت هر دور، مهلت بعد از «تموم شد»، فاصله‌ی دورها
LOBBY_TTL = 600                                  # لابی بعد از ۱۰ دقیقه بسته می‌شود

bot = telebot.TeleBot(TOKEN, parse_mode="HTML")
BOT_USER = ""
LOCK = threading.RLock()
games = {}        # chat_id -> بازی
in_game = {}      # user_id -> chat_id (برای دریافت جواب‌ها در پیوی)
_now = time.time


# ───────────────────────── ابزارها ─────────────────────────
def fa(n):
    return str(n).translate(str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹"))


def esc(t):
    return html.escape(str(t))


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def send(chat, text, kb=None):
    try:
        return bot.send_message(chat, text, reply_markup=kb, disable_web_page_preview=True)
    except Exception as e:
        log("send fail", chat, repr(e)[:120])
        return None


def send_long(chat, text):
    buf = ""
    for line in text.split("\n"):
        if len(buf) + len(line) > 3500:
            send(chat, buf); buf = ""
        buf += line + "\n"
    if buf.strip():
        send(chat, buf)


def edit(chat, mid, text, kb=None):
    try:
        bot.edit_message_text(text, chat, mid, reply_markup=kb, disable_web_page_preview=True)
    except Exception as e:
        if "not modified" not in str(e):
            log("edit fail", repr(e)[:100])


def ack(call, text="", alert=False):
    try:
        bot.answer_callback_query(call.id, text, show_alert=alert)
    except Exception:
        pass


def uname(u):
    return (u.first_name or "") + ((" " + u.last_name) if u.last_name else "") or str(u.id)


# ───────────────────────── آمار ─────────────────────────
def init_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    with sqlite3.connect(DB_PATH) as c:
        c.execute("""CREATE TABLE IF NOT EXISTS stats(user_id INTEGER PRIMARY KEY, name TEXT,
                     m_games INTEGER DEFAULT 0, m_wins INTEGER DEFAULT 0,
                     e_games INTEGER DEFAULT 0, e_wins INTEGER DEFAULT 0, e_points INTEGER DEFAULT 0)""")


def bump(uid, name, **inc):
    try:
        with sqlite3.connect(DB_PATH, timeout=10) as c:
            c.execute("INSERT OR IGNORE INTO stats(user_id,name) VALUES(?,?)", (uid, name))
            sets = ",".join(f"{k}={k}+?" for k in inc)
            c.execute(f"UPDATE stats SET name=?,{sets} WHERE user_id=?", (name, *inc.values(), uid))
    except Exception as e:
        log("db fail", e)


def top_text():
    with sqlite3.connect(DB_PATH, timeout=10) as c:
        m = c.execute("SELECT name,m_wins,m_games FROM stats WHERE m_games>0 ORDER BY m_wins DESC,m_games LIMIT 10").fetchall()
        e = c.execute("SELECT name,e_wins,e_points FROM stats WHERE e_games>0 ORDER BY e_wins DESC,e_points DESC LIMIT 10").fetchall()
    medals = ["🥇", "🥈", "🥉"] + ["▫️"] * 7
    t = "🏆 <b>برترین‌های مافیا</b>\n"
    t += "\n".join(f"{medals[i]} {esc(n)} — {fa(w)} برد از {fa(g)} بازی" for i, (n, w, g) in enumerate(m)) if m else "هنوز کسی بازی نکرده."
    t += "\n\n✍️ <b>برترین‌های اسم و فامیل</b>\n"
    t += "\n".join(f"{medals[i]} {esc(n)} — {fa(w)} برد، {fa(p)} امتیاز" for i, (n, w, p) in enumerate(e)) if e else "هنوز کسی بازی نکرده."
    return t


# ───────────────────────── زبان فارسی ─────────────────────────
_AR = str.maketrans({"ي": "ی", "ك": "ک", "ۀ": "ه", "ة": "ه", "أ": "ا", "إ": "ا", "ٱ": "ا", "آ": "ا"})


def norm(s):
    s = str(s).translate(_AR)
    s = re.sub(r"[\u064B-\u065F\u0670\u200c\u200d\u200e\u200f]", "", s)
    return re.sub(r"\s+", " ", s).strip().lower()


def valid_answer(text, letter):
    t = norm(text)
    return len(t) >= 2 and t[0] == norm(letter) and re.fullmatch(r"[\u0621-\u063A\u0641-\u064A\u067E\u0686\u0698\u06A9\u06AF\u06CC a-z]+", t) is not None


LETTERS = list("ابپتجچحخدرزسشفکگلمنوهیطعقص")
CATS = ["اسم", "فامیل", "شهر", "کشور", "حیوان", "رنگ", "غذا", "اشیاء"]
ROLE_FA = {"mafia": "😈 مافیا", "doctor": "👨‍⚕️ دکتر", "detective": "🕵️ کارآگاه", "citizen": "🙂 شهروند"}


# ───────────────────────── پایه‌ی بازی و لابی ─────────────────────────
class Game:
    title, min_players, kind = "", 2, ""

    def __init__(s, chat_id, host, hname):
        s.chat_id, s.host = chat_id, host
        s.players = {host: hname}
        s.state, s.lobby_mid, s.created, s.deadline = "lobby", None, _now(), None
        in_game[host] = chat_id

    def lobby_text(s):
        names = "\n".join(f"{fa(i + 1)}. {esc(n)}" for i, n in enumerate(s.players.values()))
        return (f"{s.title}\n\n👥 <b>بازیکن‌ها ({fa(len(s.players))}):</b>\n{names}\n\n"
                f"برای ورود دکمه‌ی «ورود» رو بزن و توی پیوی ربات «Start» رو بزن.\n"
                f"حداقل {fa(s.min_players)} نفر لازمه. {esc(s.players[s.host])} (سازنده) بازی رو شروع می‌کنه.")

    def lobby_markup(s):
        kb = types.InlineKeyboardMarkup()
        kb.add(types.InlineKeyboardButton("✋ ورود به بازی", url=f"https://t.me/{BOT_USER}?start=j{s.chat_id}"))
        kb.row(types.InlineKeyboardButton("▶️ شروع", callback_data="lb:start"),
               types.InlineKeyboardButton("🚪 خروج", callback_data="lb:leave"))
        kb.add(types.InlineKeyboardButton("❌ لغو", callback_data="lb:cancel"))
        return kb

    def post_lobby(s):
        m = send(s.chat_id, s.lobby_text(), s.lobby_markup())
        s.lobby_mid = m.message_id if m else None

    def refresh_lobby(s):
        if s.lobby_mid and s.state == "lobby":
            edit(s.chat_id, s.lobby_mid, s.lobby_text(), s.lobby_markup())

    def add_player(s, uid, name):
        if len(s.players) >= MAX_PLAYERS:
            return False
        s.players[uid] = name
        in_game[uid] = s.chat_id
        s.refresh_lobby()
        return True

    def remove_player(s, uid):
        s.players.pop(uid, None)
        if in_game.get(uid) == s.chat_id:
            in_game.pop(uid, None)
        if not s.players:
            return s.cancel("همه رفتن؛ بازی بسته شد.")
        if uid == s.host:
            s.host = next(iter(s.players))
        s.refresh_lobby()

    def cleanup(s):
        s.state = "over"
        if games.get(s.chat_id) is s:
            games.pop(s.chat_id, None)
        for u in list(s.players):
            if in_game.get(u) == s.chat_id:
                in_game.pop(u, None)

    def cancel(s, why="بازی لغو شد."):
        send(s.chat_id, "🛑 " + why)
        s.cleanup()

    def tick(s, now):
        if s.state == "lobby" and now - s.created > LOBBY_TTL:
            s.cancel("لابی منقضی شد.")


# ───────────────────────── مافیا ─────────────────────────
class Mafia(Game):
    title, min_players, kind = "🎭 <b>مافیا</b>", MAFIA_MIN, "mafia"

    def __init__(s, *a):
        super().__init__(*a)
        s.roles, s.alive, s.day = {}, [], 0
        s.n_maf, s.n_doc, s.n_det, s.acted = {}, None, None, set()
        s.votes, s.vote_mid, s.skips, s.self_saved, s.idle = {}, None, set(), set(), 0

    def name(s, u):
        return esc(s.players.get(u, "؟"))

    def start(s):
        ids = list(s.players)
        random.shuffle(ids)
        n = len(ids)
        m = max(1, n // 4)
        rl = ["mafia"] * m + ["doctor", "detective"] + ["citizen"] * (n - m - 2)
        random.shuffle(rl)
        s.roles, s.alive, s.state = dict(zip(ids, rl)), list(ids), "starting"
        mafias = [u for u in ids if s.roles[u] == "mafia"]
        for u in ids:
            t = f"🎭 نقش تو: <b>{ROLE_FA[s.roles[u]]}</b>\n"
            t += {"mafia": "شب‌ها با هم‌تیمی‌هات یکی رو حذف کن و روز خودت رو شهروند نشون بده.",
                  "doctor": "هر شب یکی رو از مرگ نجات بده (فقط یک‌بار می‌تونی خودت رو نجات بدی).",
                  "detective": "هر شب از یه نفر بپرس مافیاست یا نه.",
                  "citizen": "روز با بحث و رأی، مافیا رو پیدا کن."}[s.roles[u]]
            if s.roles[u] == "mafia" and len(mafias) > 1:
                t += "\n\n😈 تیم مافیا: " + "، ".join(esc(s.players[x]) for x in mafias)
            send(u, t)
        send(s.chat_id, f"🎬 <b>بازی شروع شد!</b>\n👥 {fa(n)} نفر — 😈 {fa(m)} مافیا، 👨‍⚕️ ۱ دکتر، 🕵️ ۱ کارآگاه، "
                        f"🙂 {fa(n - m - 2)} شهروند\n\nنقش‌ها توی پیوی ربات فرستاده شد.")
        s.begin_night()

    # ── شب
    def begin_night(s):
        s.state, s.day = "night", s.day + 1
        s.n_maf, s.n_doc, s.n_det, s.acted = {}, None, None, set()
        send(s.chat_id, f"🌙 <b>شب {fa(s.day)}</b>\nشهر خوابیده... نقش‌های ویژه توی پیوی ربات انتخاب کنن ({fa(NIGHT_SEC)} ثانیه).")
        for u in s.alive:
            r = s.roles[u]
            if r == "citizen":
                continue
            if r == "mafia":
                targets, q, k = [x for x in s.alive if s.roles[x] != "mafia"], "😈 امشب کی رو حذف کنیم؟", "m"
            elif r == "doctor":
                targets, q, k = list(s.alive), "👨‍⚕️ امشب کی رو نجات بدی؟", "d"
                if u in s.self_saved:
                    targets.remove(u)
            else:
                targets, q, k = [x for x in s.alive if x != u], "🕵️ امشب از کی استعلام بگیری؟", "t"
            kb = types.InlineKeyboardMarkup()
            for x in targets:
                kb.add(types.InlineKeyboardButton(s.players[x], callback_data=f"mn:{s.chat_id}:{k}:{x}"))
            send(u, q, kb)
        s.deadline = _now() + NIGHT_SEC

    def actors(s):
        return [u for u in s.alive if s.roles[u] in ("mafia", "doctor", "detective")]

    def night_action(s, uid, k, target):
        if s.state != "night" or uid not in s.alive:
            return "الان وقتش نیست."
        if {"m": "mafia", "d": "doctor", "t": "detective"}.get(k) != s.roles[uid] or uid in s.acted:
            return "قبلاً انتخاب کردی."
        if target not in s.alive:
            return "این بازیکن دیگه نیست."
        if k == "m":
            if s.roles[target] == "mafia":
                return "هم‌تیمی رو نمی‌شه."
            s.n_maf[uid] = target
            res = f"✅ ثبت شد: {s.name(target)}"
        elif k == "d":
            if target == uid:
                if uid in s.self_saved:
                    return "فقط یک‌بار می‌تونی خودت رو نجات بدی."
                s.self_saved.add(uid)
            s.n_doc = target
            res = f"✅ نجات‌دهنده‌ی {s.name(target)} شدی."
        else:
            if target == uid:
                return "نمی‌شه."
            s.n_det = target
            res = f"🕵️ {s.name(target)}: " + ("😈 <b>مافیاست!</b>" if s.roles[target] == "mafia" else "🙂 <b>مافیا نیست.</b>")
        s.acted.add(uid)
        s.idle = 0
        if all(a in s.acted for a in s.actors()):
            s.end_night()
        return res

    def end_night(s):
        s.state = "morning"
        target = None
        if s.n_maf:
            c = Counter(s.n_maf.values())
            top = max(c.values())
            target = random.choice([t for t, n in c.items() if n == top])
        msg = f"☀️ <b>صبح روز {fa(s.day)}</b>\n"
        if target is None:
            msg += "دیشب مافیا شلیک نکرد. 😴"
        elif target == s.n_doc:
            msg += "🔫 مافیا شلیک کرد ولی دکتر به‌موقع رسید و نجاتش داد! 🎉"
        else:
            s.alive.remove(target)
            msg += f"💀 <b>{s.name(target)}</b> دیشب کشته شد.\nنقشش: {ROLE_FA[s.roles[target]]}"
        send(s.chat_id, msg)
        if not s.check_win():
            s.begin_day()

    # ── روز
    def begin_day(s):
        s.state, s.skips, s.deadline = "day", set(), _now() + DAY_SEC
        alive = "\n".join(f"▫️ {s.name(u)}" for u in s.alive)
        kb = types.InlineKeyboardMarkup()
        kb.add(types.InlineKeyboardButton("⏭ بریم سراغ رأی‌گیری", callback_data="md:skip"))
        send(s.chat_id, f"🗣 <b>بحث آزاد</b> ({fa(DAY_SEC)} ثانیه)\nزنده‌ها:\n{alive}\n\n"
                        f"اگه بیشتر از نصف زنده‌ها دکمه رو بزنن، رأی‌گیری زودتر شروع می‌شه.", kb)

    def skip(s, uid):
        if s.state != "day" or uid not in s.alive:
            return "الان وقتش نیست."
        s.skips.add(uid)
        if len(s.skips) > len(s.alive) // 2:
            s.begin_vote()
            return "رأی‌گیری شروع شد."
        return f"ثبت شد ({fa(len(s.skips))}/{fa(len(s.alive) // 2 + 1)})"

    def vote_markup(s):
        kb = types.InlineKeyboardMarkup()
        for u in s.alive:
            kb.add(types.InlineKeyboardButton(s.players[u], callback_data=f"mv:{u}"))
        kb.add(types.InlineKeyboardButton("🚫 اعدام نکنیم", callback_data="mv:0"))
        return kb

    def vote_text(s):
        by = {}
        for v, t in s.votes.items():
            by.setdefault(t, []).append(s.name(v))
        lines = [f"▫️ {s.name(u)}: {fa(len(by[u]))}" + (f" ← {'، '.join(by[u])}" if u in by else "") if u in by else
                 f"▫️ {s.name(u)}: ۰" for u in s.alive]
        if 0 in by:
            lines.append(f"🚫 اعدام نکنیم: {fa(len(by[0]))} ← {'، '.join(by[0])}")
        return f"🗳 <b>رأی‌گیری</b> ({fa(VOTE_SEC)} ثانیه)\nکی رو اعدام کنیم؟\n\n" + "\n".join(lines)

    def begin_vote(s):
        s.state, s.votes, s.deadline = "vote", {}, _now() + VOTE_SEC
        m = send(s.chat_id, s.vote_text(), s.vote_markup())
        s.vote_mid = m.message_id if m else None

    def vote(s, uid, target):
        if s.state != "vote" or uid not in s.alive:
            return "الان وقتش نیست یا زنده نیستی."
        if target and target not in s.alive:
            return "این بازیکن دیگه نیست."
        if target == uid:
            return "به خودت رأی نده! 😅"
        s.votes[uid] = target
        if s.vote_mid:
            edit(s.chat_id, s.vote_mid, s.vote_text(), s.vote_markup())
        if len(s.votes) >= len(s.alive):
            s.end_vote()
        return "رأیت ثبت شد."

    def end_vote(s):
        s.state = "morning"
        if s.vote_mid:
            edit(s.chat_id, s.vote_mid, s.vote_text())
        s.idle = 0 if s.votes else s.idle + 1
        if s.idle >= 2:
            return s.cancel("چند دور پشت‌سرهم کسی بازی نکرد؛ بازی بسته شد. 😴")
        c = Counter(s.votes.values())
        victim = None
        if c:
            top = max(c.values())
            tops = [t for t, n in c.items() if n == top]
            if len(tops) == 1 and tops[0] != 0:
                victim = tops[0]
        if victim is None:
            send(s.chat_id, "⚖️ رأی‌ها مساوی بود یا اعدامی نبود؛ امروز کسی اعدام نشد.")
        else:
            s.alive.remove(victim)
            send(s.chat_id, f"⚰️ <b>{s.name(victim)}</b> با رأی مردم اعدام شد.\nنقشش: {ROLE_FA[s.roles[victim]]}")
        if not s.check_win():
            s.begin_night()

    # ── پایان
    def check_win(s):
        m = [u for u in s.alive if s.roles[u] == "mafia"]
        if not m:
            return s.finish("citizens")
        if len(m) >= len(s.alive) - len(m):
            return s.finish("mafia")
        return False

    def finish(s, side):
        s.state = "over"
        roles = "\n".join(f"{ROLE_FA[s.roles[u]]} — {s.name(u)}" + ("" if u in s.alive else " 💀") for u in s.players)
        send(s.chat_id, ("😈 <b>مافیا برد!</b>" if side == "mafia" else "🎉 <b>شهروندها بردن!</b>") + f"\n\n{roles}")
        for u, nm in s.players.items():
            win = (s.roles[u] == "mafia") == (side == "mafia")
            bump(u, nm, m_games=1, m_wins=1 if win else 0)
        s.cleanup()
        return True

    def tick(s, now):
        super().tick(now)
        if s.state == "night" and now >= s.deadline:
            s.end_night()
        elif s.state == "day" and now >= s.deadline:
            s.begin_vote()
        elif s.state == "vote" and now >= s.deadline:
            s.end_vote()


# ───────────────────────── اسم و فامیل ─────────────────────────
class Esm(Game):
    title, min_players, kind = "✍️ <b>اسم و فامیل</b>", 2, "esm"

    def __init__(s, chat_id, host, hname, rounds=5):
        super().__init__(chat_id, host, hname)
        s.rounds, s.round, s.letter, s.used = rounds, 0, None, set()
        s.ans, s.prog, s.total, s.end_at, s.next_at = {}, {}, {}, None, None

    def lobby_text(s):
        return super().lobby_text() + f"\n🔁 تعداد دور: {fa(s.rounds)}"

    def start(s):
        s.total = {u: 0 for u in s.players}
        send(s.chat_id, f"🎬 <b>اسم و فامیل شروع شد!</b>\n{fa(len(s.players))} بازیکن، {fa(s.rounds)} دور.\n"
                        f"جواب‌ها رو توی <b>پیوی ربات</b> می‌فرستین؛ هر کی زودتر تموم کنه، بقیه ۱۰ ثانیه وقت دارن.\n"
                        f"جواب یکتا ۱۰ امتیاز، جواب تکراری ۵ امتیاز.")
        s.begin_round()

    def prompt(s, i):
        return f"({fa(i + 1)}/{fa(len(CATS))}) <b>{CATS[i]}</b> با «{s.letter}»:"

    def begin_round(s):
        s.round += 1
        pool = [x for x in LETTERS if x not in s.used] or LETTERS
        s.letter = random.choice(pool)
        s.used.add(s.letter)
        s.state, s.end_at, s.next_at = "round", None, None
        s.ans = {u: {} for u in s.players}
        s.prog = {u: 0 for u in s.players}
        s.deadline = _now() + ESM_SEC
        send(s.chat_id, f"🔤 <b>دور {fa(s.round)} از {fa(s.rounds)}</b>\nحرف این دور: <b>«{s.letter}»</b>\n"
                        f"برید پیوی ربات و جواب بدین! ⏱ {fa(ESM_SEC)} ثانیه")
        for u in s.players:
            send(u, f"🔤 دور {fa(s.round)}: حرف <b>«{s.letter}»</b>\nهر دسته یه جواب بفرست. جواب نداری؟ بنویس <code>-</code>\n\n" + s.prompt(0))

    def on_text(s, uid, text):
        if s.state != "round" or uid not in s.prog:
            return
        i = s.prog[uid]
        if i >= len(CATS):
            return send(uid, "✅ تو تموم کردی؛ منتظر بقیه باش.")
        t = text.strip()
        if t in ("-", "—", "–"):
            s.ans[uid][i] = ""
        elif not valid_answer(t, s.letter):
            return send(uid, f"⚠️ جواب باید با «{s.letter}» شروع بشه (حداقل ۲ حرف). دوباره بفرست یا <code>-</code> بزن.")
        else:
            s.ans[uid][i] = t
        s.prog[uid] = i + 1
        if i + 1 < len(CATS):
            send(uid, s.prompt(i + 1))
            return
        send(uid, "✅ تموم شد! منتظر نتیجه باش.")
        if s.end_at is None:
            s.end_at = _now() + ESM_GRACE
            send(s.chat_id, f"⏱ <b>{esc(s.players[uid])}</b> تموم کرد! بقیه {fa(ESM_GRACE)} ثانیه وقت دارن.")
        if all(p >= len(CATS) for p in s.prog.values()):
            s.end_round()

    def end_round(s):
        s.state = "scoring"
        gained = {u: 0 for u in s.players}
        lines = []
        for i, cat in enumerate(CATS):
            ents = [(u, s.ans[u].get(i, "")) for u in s.players]
            cnt = Counter(norm(a) for _, a in ents if a)
            parts = []
            for u, a in ents:
                if not a:
                    continue
                sc = 10 if cnt[norm(a)] == 1 else 5
                gained[u] += sc
                parts.append(f"{esc(s.players[u])}: {esc(a)} ({fa(sc)})")
            if parts:
                lines.append(f"<b>{cat}</b> — " + " | ".join(parts))
        for u, g in gained.items():
            s.total[u] += g
        rank = sorted(s.players, key=lambda u: -s.total[u])
        medals = ["🥇", "🥈", "🥉"]
        board = "\n".join(f"{medals[i] if i < 3 else '▫️'} {esc(s.players[u])}: {fa(s.total[u])} (+{fa(gained[u])})"
                          for i, u in enumerate(rank))
        send_long(s.chat_id, f"📝 <b>نتیجه‌ی دور {fa(s.round)} — «{s.letter}»</b>\n\n" + ("\n".join(lines) or "کسی جواب نداد!")
                  + f"\n\n🏆 <b>جدول امتیاز</b>\n{board}")
        if s.round >= s.rounds:
            return s.finish(rank)
        s.state, s.next_at = "between", _now() + ESM_BREAK
        send(s.chat_id, f"⏳ دور بعد تا {fa(ESM_BREAK)} ثانیه‌ی دیگه...")

    def finish(s, rank):
        best = s.total[rank[0]]
        winners = [u for u in rank if s.total[u] == best]
        send(s.chat_id, "🎊 <b>بازی تموم شد!</b>\nبرنده: " + "، ".join(f"<b>{esc(s.players[u])}</b>" for u in winners)
             + f" با {fa(best)} امتیاز 👑")
        for u, nm in s.players.items():
            bump(u, nm, e_games=1, e_wins=1 if u in winners else 0, e_points=s.total[u])
        s.cleanup()

    def tick(s, now):
        super().tick(now)
        if s.state == "round" and (now >= s.deadline or (s.end_at and now >= s.end_at)):
            s.end_round()
        elif s.state == "between" and now >= s.next_at:
            s.begin_round()


# ───────────────────────── دستورها ─────────────────────────
def is_group(m):
    return m.chat.type in ("group", "supergroup")


HELP = ("🎉 <b>ربات دورهمی</b>\n\nربات رو به گروهتون اضافه کنین و بنویسین:\n"
        "🎭 /mafia — مافیا (۴ تا ۲۵ نفر)\n✍️ /esm — اسم و فامیل (<code>/esm 3</code> یعنی ۳ دور)\n"
        "🏆 /top — برترین‌ها\n❌ /cancel — لغو بازی (سازنده یا ادمین گروه)\n\n"
        "هر بازیکن باید یه بار توی پیوی ربات Start بزنه؛ دکمه‌ی «ورود» همین کار رو انجام می‌ده.")


def new_game(m, cls, *extra):
    with LOCK:
        if not is_group(m):
            return send(m.chat.id, "این دستور رو توی گروه بزن. 👥")
        if m.chat.id in games:
            return send(m.chat.id, "یه بازی توی این گروه در جریانه. برای لغو: /cancel")
        u = m.from_user
        if u.id in in_game:
            return send(m.chat.id, "تو توی یه بازی دیگه هستی.")
        g = cls(m.chat.id, u.id, uname(u), *extra)
        games[m.chat.id] = g
        g.post_lobby()


@bot.message_handler(commands=["start"])
def h_start(m):
    with LOCK:
        parts = (m.text or "").split(maxsplit=1)
        arg = parts[1].strip() if len(parts) > 1 else ""
        if m.chat.type == "private" and arg.startswith("j"):
            try:
                cid = int(arg[1:])
            except ValueError:
                return send(m.chat.id, HELP)
            g = games.get(cid)
            u = m.from_user
            if not g or g.state != "lobby":
                return send(m.chat.id, "این لابی دیگه بازه نیست. 🤷")
            if in_game.get(u.id) not in (None, cid):
                return send(m.chat.id, "تو توی یه بازی دیگه هستی.")
            if u.id in g.players:
                return send(m.chat.id, "✅ تو از قبل توی بازی هستی؛ برگرد گروه.")
            if g.add_player(u.id, uname(u)):
                send(m.chat.id, f"✅ وارد بازی <b>{g.title}</b> شدی! برگرد گروه و منتظر شروع باش.")
            else:
                send(m.chat.id, "ظرفیت پره. 😕")
            return
        send(m.chat.id, HELP)


@bot.message_handler(commands=["help"])
def h_help(m):
    send(m.chat.id, HELP)


@bot.message_handler(commands=["mafia"])
def h_mafia(m):
    new_game(m, Mafia)


@bot.message_handler(commands=["esm"])
def h_esm(m):
    parts = (m.text or "").split()
    rounds = 5
    if len(parts) > 1 and parts[1].isdigit():
        rounds = max(1, min(10, int(parts[1])))
    new_game(m, Esm, rounds)


@bot.message_handler(commands=["top"])
def h_top(m):
    send(m.chat.id, top_text())


@bot.message_handler(commands=["cancel"])
def h_cancel(m):
    with LOCK:
        g = games.get(m.chat.id)
        if not g:
            return send(m.chat.id, "بازی فعالی نیست.")
        ok = m.from_user.id == g.host
        if not ok:
            try:
                ok = bot.get_chat_member(m.chat.id, m.from_user.id).status in ("creator", "administrator")
            except Exception:
                ok = False
        if ok:
            g.cancel("بازی لغو شد.")
        else:
            send(m.chat.id, "فقط سازنده‌ی بازی یا ادمین گروه می‌تونه لغو کنه.")


@bot.callback_query_handler(func=lambda c: True)
def h_cb(c):
    with LOCK:
        try:
            d = c.data or ""
            uid = c.from_user.id
            if d.startswith("lb:"):
                g = games.get(c.message.chat.id)
                if not g or g.state != "lobby":
                    return ack(c, "این لابی بسته شده.")
                act = d[3:]
                if act == "start":
                    if uid != g.host:
                        return ack(c, "فقط سازنده می‌تونه شروع کنه.", True)
                    if len(g.players) < g.min_players:
                        return ack(c, f"حداقل {g.min_players} نفر لازمه.", True)
                    ack(c)
                    if g.lobby_mid:
                        edit(g.chat_id, g.lobby_mid, g.lobby_text() + "\n\n▶️ <b>شروع شد</b>")
                    return g.start()
                if act == "leave":
                    if uid not in g.players:
                        return ack(c, "تو توی بازی نیستی.")
                    ack(c, "خارج شدی.")
                    return g.remove_player(uid)
                if act == "cancel":
                    ok = uid == g.host
                    if not ok:
                        try:
                            ok = bot.get_chat_member(g.chat_id, uid).status in ("creator", "administrator")
                        except Exception:
                            ok = False
                    if not ok:
                        return ack(c, "فقط سازنده یا ادمین.", True)
                    ack(c)
                    return g.cancel("لابی لغو شد.")
            elif d.startswith("mn:"):                    # اکشن شب، توی پیوی
                _, cid, k, tgt = d.split(":")
                g = games.get(int(cid))
                if not isinstance(g, Mafia):
                    return ack(c, "بازی تموم شده.", True)
                res = g.night_action(uid, k, int(tgt))
                ack(c, "ثبت شد." if res.startswith(("✅", "🕵")) else res, not res.startswith(("✅", "🕵")))
                if res.startswith(("✅", "🕵")):
                    edit(c.message.chat.id, c.message.message_id, res)
            elif d.startswith("mv:"):
                g = games.get(c.message.chat.id)
                if not isinstance(g, Mafia):
                    return ack(c, "بازی تموم شده.", True)
                ack(c, g.vote(uid, int(d[3:])))
            elif d == "md:skip":
                g = games.get(c.message.chat.id)
                if not isinstance(g, Mafia):
                    return ack(c, "بازی تموم شده.", True)
                ack(c, g.skip(uid))
            else:
                ack(c)
        except Exception:
            log(traceback.format_exc())
            ack(c, "خطا؛ دوباره امتحان کن.")


@bot.message_handler(func=lambda m: m.chat.type == "private", content_types=["text"])
def h_private(m):
    with LOCK:
        if (m.text or "").startswith("/"):
            return
        cid = in_game.get(m.from_user.id)
        g = games.get(cid) if cid else None
        if isinstance(g, Esm):
            g.on_text(m.from_user.id, m.text)
        elif g:
            send(m.chat.id, "الان توی بازی مافیا هستی؛ انتخاب‌ها با دکمه‌هاست. 🎭")
        else:
            send(m.chat.id, "برای بازی، ربات رو توی گروه بذار و /mafia یا /esm بزن. 🎮")


def ticker():
    while True:
        time.sleep(1)
        with LOCK:
            for g in list(games.values()):
                try:
                    g.tick(_now())
                except Exception:
                    log(traceback.format_exc())
                    try:
                        g.cancel("خطای غیرمنتظره؛ بازی بسته شد.")
                    except Exception:
                        pass


if __name__ == "__main__":
    if TOKEN.startswith("PUT_"):
        sys.exit("اول توکن رو بذار:  export BOT_TOKEN=توکن_از_BotFather")
    init_db()
    BOT_USER = bot.get_me().username
    log("ربات بالا اومد: @" + BOT_USER)
    threading.Thread(target=ticker, daemon=True).start()
    bot.infinity_polling(skip_pending=True, allowed_updates=["message", "callback_query"])
