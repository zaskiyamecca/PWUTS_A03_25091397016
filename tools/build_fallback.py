#!/usr/bin/env python3
"""Menyematkan pages/*.html ke js/pages-fallback.js.
Dipakai saat Ajax gagal (mis. index.html dibuka via file://).
Jalankan ulang setiap kali pages/*.html diubah:  python tools/build_fallback.py"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
pages = {p.stem: p.read_text(encoding='utf-8') for p in sorted((root / 'pages').glob('*.html'))}
out = '/* DIHASILKAN OTOMATIS oleh tools/build_fallback.py - jangan diedit manual */\nwindow.PAGE_FALLBACK = ' + json.dumps(pages, ensure_ascii=False) + ';\n'
(root / 'js' / 'pages-fallback.js').write_text(out, encoding='utf-8')
print('OK:', ', '.join(pages))
