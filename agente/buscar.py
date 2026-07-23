#!/usr/bin/env python3
"""Buscador da Fase 2 (Moxie) — Apify scrape -> estagia pendentes. stdlib puro, sem git."""

import json
import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
AGENTE = RAIZ / "agente"
PENDENTES_DIR = AGENTE / "pendentes"
PENDENTES_JSON = AGENTE / "pendentes.json"
VISTOS_JSON = AGENTE / "vistos.json"
LAST_RUN = AGENTE / "last_run.txt"
CUSTO_MES = AGENTE / "custo_mes.json"
DADOS = RAIZ / "dados.json"
ACTOR = "apify~instagram-scraper"
ENDPOINT = f"https://api.apify.com/v2/acts/{ACTOR}/run-sync-get-dataset-items"


def normaliza_url(u):
    return (u or "").split("?")[0].rstrip("/")


def carregar_json(p, default):
    p = Path(p)
    return json.loads(p.read_text()) if p.exists() else default


def urls_publicadas(dados):
    urls = set()
    for card in dados.get("cards", []):
        for ref in card.get("referencias", []):
            if ref.get("url"):
                urls.add(normaliza_url(ref["url"]))
    return urls


def filtrar_novos(posts, vistos, publicadas):
    novos = []
    for p in posts:
        sc = p.get("shortCode")
        url = normaliza_url(p.get("url", ""))
        if not sc or not url:
            continue
        if sc in vistos or url in publicadas:
            continue
        novos.append(p)
    return novos


def montar_pendente(post, image_rel):
    return {
        "shortCode": post.get("shortCode"),
        "url": normaliza_url(post.get("url", "")),
        "handle": "@" + (post.get("ownerUsername") or ""),
        "type": post.get("type"),
        "caption": post.get("caption") or "",
        "hashtags": post.get("hashtags") or [],
        "image": image_rel,
        "scraped_at": datetime.datetime.now(datetime.timezone.utc).isoformat(
            timespec="seconds"
        ),
    }
