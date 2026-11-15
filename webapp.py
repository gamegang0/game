# webapp.py - API + لانچر HTML برای بات (بدون نیاز به کتابخانه‌ی اضافه)
import os, json, hmac, hashlib, time, re, threading, html, random
from telebot import apihelper, types as tt
from urllib.parse import parse_qsl
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from types import SimpleNamespace

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC_URL = (os.environ.get("PUBLIC_URL") or "").rstrip("/")   # آدرس HTTPS عمومی سرور
ADMIN_CODE = os.environ.get("ADMIN_CODE") or ""                  # کد ادمین (فقط روی سرور)
fails = {}

def verify(init, token):
    d = dict(parse_qsl(init or "", keep_blank_values=True))
    h = d.pop("hash", "")
    s = "\n".join(f"{k}={v}" for k, v in sorted(d.items()))
    key = hmac.new(b"WebAppData", token.encode(), hashlib.sha256).digest()
    good = hmac.compare_digest(hmac.new(key, s.encode(), hashlib.sha256).hexdigest(), h)
    if not good or time.time() - int(d.get("auth_date", 0) or 0) > 86400 or "user" not in d:
        return None
    return json.loads(d["user"])

def start(g, port=None):
    port = port or int(os.environ.get("PORT") or 8080)   # روی Railway/Render پورت را خود هاست می‌دهد
    db, lock, token = g["db"], g["lock"], g["TOKEN"]
    clean = lambda t: re.sub(r"<[^>]+>", "", t)
    with lock:
        db.execute("CREATE TABLE IF NOT EXISTS web_inbox(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, text TEXT, created_at REAL, is_read INTEGER DEFAULT 0)")
        db.commit()
    tl = threading.local()
    bot = g["bot"]
    DICE = {"🎲": 6, "🎯": 6, "🎳": 6, "🏀": 5, "⚽": 5, "🎰": 64}
    TAG = re.compile(r"(</?(?:b|i|u|s|em|strong|code|pre)>)")

    def safe(t):   # متن تلگرام (HTML ساده) -> HTML امن برای نمایش
        out = []
        for part in TAG.split(str(t or "")):
            out.append(part if TAG.fullmatch(part) else html.escape(html.unescape(re.sub(r"<[^>]*>", "", part))))
        return "".join(out)

    def rows(markup):
        try:
            kb = json.loads(markup)["inline_keyboard"] if isinstance(markup, str) else []
        except Exception:
            return []
        res = [[dict(t=html.escape(str(x.get("text", ""))), d=x.get("callback_data"), u=x.get("url"))
                for x in r if x.get("callback_data") or x.get("url")] for r in kb]
        return [r for r in res if r]

    orig_req = apihelper._make_request

    def fake_req(token, method_name, method="get", params=None, files=None, **kw):
        uid = getattr(tl, "uid", None)
        if not uid:
            return orig_req(token, method_name, method=method, params=params, files=files, **kw)
        p = params or {}
        cid = str(p.get("chat_id", ""))
        now = int(time.time())
        msg = lambda text="": {"message_id": now % 2**31, "date": now, "chat": {"id": uid, "type": "private"}, "text": text or "."}
        if cid.lstrip("-").isdigit() and int(cid) != uid:      # پیام به بازیکن دیگر: ارسال واقعی + صندوق پیام بازی
            if method_name == "sendMessage" and int(cid) > 0:
                try:
                    with lock:
                        db.execute("INSERT INTO web_inbox(user_id,text,created_at) VALUES(?,?,?)",
                                   (int(cid), html.unescape(clean(str(p.get("text", "")))), time.time()))
                        db.commit()
                except Exception:
                    pass
            return orig_req(token, method_name, method=method, params=params, files=files, **kw)
        out, mk = tl.out, rows(p.get("reply_markup"))
        text = safe(p.get("text") or p.get("caption") or "")
        if method_name == "sendMessage":
            out.append({"k": "send", "t": text, "b": mk}); return msg(text)
        if method_name in ("editMessageText", "editMessageCaption"):
            out.append({"k": "edit", "t": text, "b": mk}); return msg(text)
        if method_name == "editMessageReplyMarkup":
            out.append({"k": "markup", "b": mk}); return True
        if method_name == "answerCallbackQuery":
            if p.get("text"): out.append({"k": "toast", "t": safe(p["text"])})
            return True
        if method_name == "sendDice":
            e = p.get("emoji", "🎲"); v = random.randint(1, DICE.get(e, 6))
            out.append({"k": "dice", "t": f"{e} {v}"})
            m = msg(); m.pop("text"); m["dice"] = {"emoji": e, "value": v}; return m
        return msg() if method_name.startswith("send") else True
    apihelper._make_request = fake_req

    orig_exec = bot._exec_task
    def exec_task(task, *a, **k):        # اجرای هم‌زمان هندلرها فقط برای درخواست‌های برنامه
        if getattr(tl, "uid", None):
            k.pop("task_type", None); k.pop("pass_bot", None)
            return task(*a, **k)
        return orig_exec(task, *a, **k)
    bot._exec_task = exec_task

    # بات داخل تلگرام فقط یک گزینه دارد: ورود به بازی
    if PUBLIC_URL.startswith("https://"):
        webkb = lambda: tt.InlineKeyboardMarkup().add(tt.InlineKeyboardButton("🎮 ورود به بازی", web_app=tt.WebAppInfo(url=PUBLIC_URL)))
        last_launch, orig_pnu = {}, bot.process_new_updates
        def pnu(updates):
            keep = []
            for upd in updates:
                cq = upd.callback_query
                chat = upd.message.chat if upd.message else (cq.message.chat if cq and cq.message else None)
                if chat is not None and chat.type == "private":
                    try:
                        if cq: bot.answer_callback_query(cq.id)
                        if time.time() - last_launch.get(chat.id, 0) > 5:
                            last_launch[chat.id] = time.time()
                            bot.send_message(chat.id, "🎮 همه‌ی بخش‌های بازی داخل برنامه است. دکمه‌ی زیر را بزن.", reply_markup=webkb())
                    except Exception:
                        pass
                else:
                    keep.append(upd)
            if keep:
                orig_pnu(keep)
        bot.process_new_updates = pnu
        try:
            bot.set_chat_menu_button(menu_button=tt.MenuButtonWebApp(text="🎮 ورود به بازی", web_app=tt.WebAppInfo(url=PUBLIC_URL)))
        except Exception as e:
            print("menu button:", e)

    def admin_id():
        r = db.execute("SELECT value FROM settings WHERE key='web_admin_id'").fetchone()
        return int(r["value"]) if r else 0

    if admin_id():
        g["ADMIN_ID"] = admin_id()      # ادمین ثبت‌شده، تنها ادمین بات است

    def me(p, uid):
        lv, cur, need = g["level_progress"](p["xp"])
        now = time.time()
        return dict(name=p["name"], coins=p["coins"], xp=p["xp"], level=lv, cur=cur, need=need,
                    streak=p["daily_streak"] or 0, is_admin=(admin_id() == uid),
                    admin_taken=bool(admin_id()), account=p["account_no"],
                    unread=db.execute("SELECT COUNT(*) n FROM web_inbox WHERE user_id=? AND is_read=0", (uid,)).fetchone()["n"],
                    steal_wait=max(0, int(g["STEAL_COOLDOWN"] - (now - (p["last_steal"] or 0)))),
                    wheel_wait=max(0, int(g["WHEEL_COOLDOWN"] - (now - (p["last_wheel"] or 0)))),
                    shop=[dict(k=k, n=n, lv=int((p["vault_level"] if k == "vault" else p[k]) or 0),
                               mx=g["VAULT_MAX_LEVEL"] if k == "vault" else g["EQUIPMENT_MAX_LEVEL"], cost=g["price"](k, p))
                          for k, n in (("thief", "🥷 دزد"), ("guard", "🧱 نگهبان"), ("pickaxe", "⛏ کلنگ"), ("vault", "🔐 صندوق امن"))],
                    mine_wait=max(0, int(g["MINE_COOLDOWN"] - (now - (p["last_mine"] or 0)))),
                    daily_wait=max(0, int(g["DAILY_COOLDOWN"] - (now - (p["last_daily"] or 0)))))

    def handle(action, u, body):
        uid = int(u["id"])
        if g["is_banned"](uid):
            return {"error": "banned"}
        user = SimpleNamespace(id=uid, username=u.get("username"))
        p = g["get_player"](user)
        if action == "top":
            with lock:
                rows = db.execute("SELECT id,name,coins,xp FROM players ORDER BY xp DESC, id LIMIT 20").fetchall()
            return {"top": [dict(id=r["id"], name=r["name"], coins=r["coins"], xp=r["xp"],
                                 level=g["level_progress"](r["xp"])[0], me=(r["id"] == uid)) for r in rows]}
        if action in ("mine", "daily"):
            text = g["do_mine"](user) if action == "mine" else g["do_daily"](user)
            return {"text": clean(text), "me": me(g["get_player"](user), uid)}
        if action == "ui":       # اجرای همه‌ی بخش‌های بات (مزرعه، بانک، پت، اسلات، آرنا، ...) داخل برنامه
            base = {"id": uid, "is_bot": False, "first_name": u.get("first_name") or "-", "username": u.get("username")}
            chat, now = {"id": uid, "type": "private"}, int(time.time())
            mid = now % 2**31
            if body.get("d"):
                bot.process_new_callback_query([tt.CallbackQuery.de_json(json.dumps({
                    "id": str(now), "from": base, "chat_instance": "1", "data": str(body["d"])[:64],
                    "message": {"message_id": mid, "date": now, "chat": chat, "text": "."}}))])
            else:
                text = str(body.get("text", ""))[:500]
                m = {"message_id": mid, "date": now, "chat": chat, "from": base, "text": text}
                if text.startswith("/"):
                    m["entities"] = [{"type": "bot_command", "offset": 0, "length": len(text.split()[0])}]
                bot.process_new_messages([tt.Message.de_json(json.dumps(m))])
            return {"events": tl.out, "me": me(g["get_player"](user), uid)}
        if action == "wheel":
            return {"text": clean(g["do_wheel"](user)), "me": me(g["get_player"](user), uid)}
        if action == "steal":
            if body.get("target"):
                target = g["get_by_id"](int(body["target"]))
            else:
                target = g["get_by_account"](str(body.get("account", "")).strip())
            return {"text": clean(g["do_steal"](user, target)), "me": me(g["get_player"](user), uid)}
        if action == "buy":
            kind = body.get("kind")
            if kind not in ("thief", "guard", "pickaxe", "vault"):
                return {"error": "نامعتبر"}
            with lock:
                p = g["get_by_id"](uid)
                col = "vault_level" if kind == "vault" else kind
                lim = g["VAULT_MAX_LEVEL"] if kind == "vault" else g["EQUIPMENT_MAX_LEVEL"]
                cost = g["price"](kind, p)
                if int(p[col] or 0) >= lim:
                    return {"error": "به حداکثر سطح رسیدی"}
                if p["coins"] < cost:
                    return {"error": "سکه کافی نداری"}
                db.execute(f"UPDATE players SET coins=coins-?, {col}={col}+1 WHERE id=?", (cost, uid))
                db.commit()
            return {"text": "✅ خریدی", "me": me(g["get_by_id"](uid), uid)}
        if action == "inbox":
            with lock:
                rows = db.execute("SELECT text,created_at FROM web_inbox WHERE user_id=? ORDER BY id DESC LIMIT 30", (uid,)).fetchall()
                db.execute("UPDATE web_inbox SET is_read=1 WHERE user_id=?", (uid,))
                db.commit()
            return {"inbox": [dict(text=r["text"], t=int(r["created_at"])) for r in rows], "me": me(p, uid)}
        if action == "admin_claim":
            if fails.get(uid, (0, 0))[0] >= 5 and time.time() < fails[uid][1]:
                return {"error": "کمی بعد دوباره تلاش کن"}
            code = str(body.get("code", ""))
            with lock:
                if admin_id():
                    return {"error": "ادمین قبلاً ثبت شده"}
                if not ADMIN_CODE or not hmac.compare_digest(code.encode(), ADMIN_CODE.encode()):
                    n = fails.get(uid, (0, 0))[0] + 1
                    fails[uid] = (n, time.time() + 600)
                    return {"error": "کد اشتباه است"}
                db.execute("INSERT OR IGNORE INTO settings(key,value) VALUES('web_admin_id',?)", (str(uid),))
                db.commit()
                g["ADMIN_ID"] = uid
            return {"text": "شما ادمین شدید", "me": me(p, uid)}
        return {"me": me(p, uid)}

    class H(BaseHTTPRequestHandler):
        def log_message(self, *a): pass
        def send(self, code, data, ctype="application/json; charset=utf-8"):
            b = data if isinstance(data, bytes) else json.dumps(data, ensure_ascii=False).encode()
            self.send_response(code)
            self.send_header("Content-Type", ctype)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", str(len(b)))
            self.end_headers()
            self.wfile.write(b)
        def do_OPTIONS(self): self.send(204, b"")
        def do_GET(self):
            html = open(os.path.join(HERE, "game.html"), encoding="utf-8").read().replace("__API__", PUBLIC_URL)
            self.send(200, html.encode(), "text/html; charset=utf-8")
        def do_POST(self):
            try:
                body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
                u = verify(body.get("init"), token)
                if not u:
                    return self.send(401, {"error": "فقط از داخل بات قابل اجراست"})
                tl.uid, tl.out = int(u["id"]), []
                try:
                    self.send(200, handle(self.path.rsplit("/", 1)[-1], u, body))
                finally:
                    tl.uid = None
            except Exception as e:
                self.send(500, {"error": "خطای سرور"})

    print("=== Mini App ===")
    print("PORT       :", port)
    print("PUBLIC_URL :", PUBLIC_URL or "❌ تنظیم نشده (تا تنظیم نشود بات تغییری نمی‌کند)")
    print("ADMIN_CODE :", "✅" if ADMIN_CODE else "❌ تنظیم نشده")
    print("حالت تک‌گزینه‌ای:", "✅ فعال" if PUBLIC_URL.startswith("https://") else "❌ غیرفعال (PUBLIC_URL باید با https:// شروع شود)")
    srv = ThreadingHTTPServer(("0.0.0.0", port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print("Mini App server on port", port)
