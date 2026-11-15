# webapp.py - API + لانچر HTML برای بات (بدون نیاز به کتابخانه‌ی اضافه)
import os, json, hmac, hashlib, time, re, threading
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

def start(g, port=8080):
    db, lock, token = g["db"], g["lock"], g["TOKEN"]
    clean = lambda t: re.sub(r"<[^>]+>", "", t)
    with lock:
        db.execute("CREATE TABLE IF NOT EXISTS web_inbox(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, text TEXT, created_at REAL, is_read INTEGER DEFAULT 0)")
        db.commit()
    tl = threading.local()
    bot = g["bot"]; orig_send = bot.send_message

    def send_hook(chat_id, text, *a, **k):   # پیام‌هایی که بات به قربانی می‌فرستد، داخل صندوق پیام بازی هم ذخیره می‌شود
        try:
            actor = getattr(tl, "uid", None)
            if actor and isinstance(chat_id, int) and chat_id > 0 and chat_id != actor:
                with lock:
                    db.execute("INSERT INTO web_inbox(user_id,text,created_at) VALUES(?,?,?)", (chat_id, clean(str(text)), time.time()))
                    db.commit()
        except Exception:
            pass
        return orig_send(chat_id, text, *a, **k)
    bot.send_message = send_hook

    def admin_id():
        r = db.execute("SELECT value FROM settings WHERE key='web_admin_id'").fetchone()
        return int(r["value"]) if r else 0

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
                tl.uid = int(u["id"])
                try:
                    self.send(200, handle(self.path.rsplit("/", 1)[-1], u, body))
                finally:
                    tl.uid = None
            except Exception as e:
                self.send(500, {"error": "خطای سرور"})

    srv = ThreadingHTTPServer(("0.0.0.0", port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    print("Mini App server on port", port)
