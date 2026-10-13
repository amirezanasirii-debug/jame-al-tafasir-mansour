"""Offline tafsir library reader. Does not bundle copyrighted text."""
import sqlite3
import tkinter as tk
from tkinter import filedialog, messagebox, ttk

MAX_ROWS = 100

class Mansour(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("جامع‌التفاسیر منصور — نسخه توسعه‌ای ۲.۵.۰")
        self.geometry("1000x700")
        self.conn = None
        self.configure(bg="#f5f7f5")
        toolbar = ttk.Frame(self, padding=12)
        toolbar.pack(fill="x")
        ttk.Button(toolbar, text="باز کردن بسته SQLite", command=self.open_db).pack(side="right", padx=6)
        self.sura = tk.StringVar(value="1")
        self.aya = tk.StringVar(value="1")
        self.query = tk.StringVar()
        ttk.Label(toolbar, text="سوره").pack(side="left")
        ttk.Entry(toolbar, width=5, textvariable=self.sura).pack(side="left", padx=4)
        ttk.Label(toolbar, text="آیه").pack(side="left")
        ttk.Entry(toolbar, width=5, textvariable=self.aya).pack(side="left", padx=4)
        ttk.Button(toolbar, text="نمایش تفسیر", command=self.show_verse).pack(side="left", padx=8)
        searchbar = ttk.Frame(self, padding=12)
        searchbar.pack(fill="x")
        ttk.Entry(searchbar, textvariable=self.query).pack(side="left", fill="x", expand=True)
        ttk.Button(searchbar, text="جستجو", command=self.search).pack(side="left", padx=6)
        self.output = tk.Text(self, wrap="word", font=("Tahoma", 12), padx=18, pady=18)
        self.output.pack(expand=True, fill="both", padx=16, pady=12)
        self.output.tag_configure("rtl", justify="right")
        self.write("هیچ متن قرآن یا تفسیر بدون مجوز همراه برنامه نیست.\nبرای شروع، بسته SQLite دارای مجوز را باز کنید.")
    def write(self, text):
        self.output.delete("1.0", "end")
        self.output.insert("end", text, "rtl")
    def open_db(self):
        path = filedialog.askopenfilename(filetypes=[("SQLite", "*.sqlite *.db"), ("All files", "*.*")])
        if not path: return
        try:
            conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
            try:
                integrity = conn.execute("PRAGMA integrity_check").fetchone()
                if integrity != ("ok",):
                    raise ValueError("فایل SQLite سالم نیست.")
                names = {row[0] for row in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                if not {"tafsir_sources", "tafsir_entries"}.issubset(names):
                    raise ValueError("بسته تفسیری معتبر نیست.")
                rows = conn.execute("SELECT name_fa, author, license FROM tafsir_sources LIMIT 100").fetchall()
                if not rows or any(not all(x) for x in rows):
                    raise ValueError("فراداده منبع یا مجوز ناقص است.")
            except Exception:
                conn.close()
                raise
            if self.conn: self.conn.close()
            self.conn = conn
            self.write("منابع تفسیری:\n" + "\n".join(f"{name} — {author} — {license_name}" for name, author, license_name in rows))
        except (sqlite3.Error, ValueError, OSError) as exc:
            messagebox.showerror("خطا", str(exc))
    def show_verse(self):
        if not self.conn: return self.write("ابتدا یک بسته SQLite باز کنید.")
        try:
            sura, aya = int(self.sura.get()), int(self.aya.get())
            if not (1 <= sura <= 114 and 1 <= aya <= 286):
                raise ValueError("شماره سوره یا آیه نامعتبر است.")
            rows = self.conn.execute("""
                SELECT s.name_fa, e.sura, e.aya_from, e.aya_to, e.text_original
                FROM tafsir_entries e JOIN tafsir_sources s ON s.id=e.source_id
                WHERE e.sura=? AND e.aya_from<=? AND e.aya_to>=?
                LIMIT ?
            """, (sura, aya, aya, MAX_ROWS)).fetchall()
            self.show_rows(rows)
        except (sqlite3.Error, ValueError) as exc:
            messagebox.showerror("خطا", str(exc))
    def search(self):
        if not self.conn: return self.write("ابتدا یک بسته SQLite باز کنید.")
        q = self.query.get().strip()
        if len(q) < 2: return self.write("عبارت جستجو باید حداقل دو حرف داشته باشد.")
        try:
            rows = self.conn.execute("""
                SELECT s.name_fa, e.sura, e.aya_from, e.aya_to, e.text_original
                FROM tafsir_entries e JOIN tafsir_sources s ON s.id=e.source_id
                WHERE e.text_original LIKE ? ESCAPE '\\' LIMIT ?
            """, ("%" + q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%", MAX_ROWS)).fetchall()
            self.show_rows(rows)
        except sqlite3.Error as exc:
            messagebox.showerror("خطا", str(exc))
    def show_rows(self, rows):
        if not rows: return self.write("موردی یافت نشد.")
        self.write("\n\n".join(f"{name} — سوره {sura}، آیات {start} تا {end}\n{text}" for name, sura, start, end, text in rows))

if __name__ == "__main__":
    Mansour().mainloop()
