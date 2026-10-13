"""Development-only desktop shell. No unlicensed Quran or tafsir texts bundled."""
import sqlite3
import tkinter as tk
from tkinter import filedialog, messagebox

class Mansour(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("جامع‌التفاسیر منصور — نسخه آزمایشی ۲.۵.۰")
        self.geometry("840x560")
        self.conn = None
        tk.Button(self, text="باز کردن بسته SQLite", command=self.open_db).pack(pady=12)
        self.output = tk.Text(self, wrap="word")
        self.output.pack(expand=True, fill="both", padx=16, pady=12)
        self.output.insert("end", "هیچ متن قرآن یا تفسیر بدون مجوز همراه برنامه نیست.\n")
    def open_db(self):
        path = filedialog.askopenfilename(filetypes=[("SQLite", "*.sqlite *.db")])
        if not path: return
        try:
            conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
            rows = conn.execute("SELECT name_fa, author, license FROM tafsir_sources LIMIT 100").fetchall()
            if self.conn: self.conn.close()
            self.conn = conn
            self.output.delete("1.0", "end")
            for name, author, license_name in rows:
                self.output.insert("end", f"{name} — {author} — {license_name}\n")
        except (sqlite3.Error, OSError) as exc:
            messagebox.showerror("خطا", str(exc))
if __name__ == "__main__":
    Mansour().mainloop()
