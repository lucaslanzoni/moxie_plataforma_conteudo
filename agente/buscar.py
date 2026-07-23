#!/usr/bin/env python3
"""Buscador da Fase 2 (Moxie) — Apify scrape -> estagia pendentes. stdlib puro, sem git."""

import json
import subprocess
import urllib.request
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


def carregar_token():
    for linha in (RAIZ / ".env").read_text().splitlines():
        linha = linha.strip()
        if linha.startswith("APIFY_TOKEN=") and not linha.startswith("#"):
            return linha.split("=", 1)[1].strip()
    raise SystemExit("APIFY_TOKEN não encontrado no .env")


def chamar_apify(token, conta, limite, newer_than=""):
    payload = {
        "directUrls": [f"https://www.instagram.com/{conta}/"],
        "resultsType": "posts",
        "resultsLimit": limite,
    }
    if newer_than:
        payload["onlyPostsNewerThan"] = newer_than
    req = urllib.request.Request(
        ENDPOINT,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as r:
        return json.loads(r.read())


def baixar_imagem(url, dest):
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read()
    tmp = dest.with_suffix(".orig")
    tmp.write_bytes(data)
    subprocess.run(
        ["sips", "-Z", "900", "-s", "format", "jpeg", str(tmp), "--out", str(dest)],
        check=True,
        capture_output=True,
    )
    tmp.unlink()


def _custo_mes_atual():
    est = carregar_json(CUSTO_MES, {"mes": "", "usd": 0.0})
    mes = datetime.date.today().strftime("%Y-%m")
    if est.get("mes") != mes:
        est = {"mes": mes, "usd": 0.0}
    return est


def main():
    token = carregar_token()
    config = carregar_json(
        AGENTE / "config.json",
        {"resultsLimit": 5, "budget_usd": 4.5, "custo_por_1000": 2.70},
    )
    contas = carregar_json(AGENTE / "contas_fonte.json", [])
    vistos = set(carregar_json(VISTOS_JSON, []))
    dados = carregar_json(DADOS, {})
    publicadas = urls_publicadas(dados)
    pendentes = carregar_json(PENDENTES_JSON, [])
    ja_pendentes = {p["shortCode"] for p in pendentes}
    newer = LAST_RUN.read_text().strip() if LAST_RUN.exists() else ""

    est = _custo_mes_atual()
    if est["usd"] >= config.get("budget_usd", 4.5):
        print(
            f"[guard] orçamento do mês atingido (US${est['usd']:.2f}) — não vou rodar."
        )
        return

    total_itens, novos_estagiados = 0, 0
    for conta in contas:
        try:
            posts = chamar_apify(token, conta, config.get("resultsLimit", 5), newer)
        except Exception as e:
            print(f"[erro] {conta}: {e}")
            continue
        total_itens += len(posts)
        for post in filtrar_novos(posts, vistos | ja_pendentes, publicadas):
            sc = post["shortCode"]
            dest = PENDENTES_DIR / f"{sc}.jpg"
            try:
                baixar_imagem(post.get("displayUrl", ""), dest)
            except Exception as e:
                print(f"[erro img] {sc}: {e}")
                continue
            pendentes.append(montar_pendente(post, f"agente/pendentes/{sc}.jpg"))
            ja_pendentes.add(sc)
            novos_estagiados += 1

    PENDENTES_JSON.write_text(json.dumps(pendentes, ensure_ascii=False, indent=2))
    LAST_RUN.write_text(datetime.date.today().isoformat())
    custo = total_itens * config.get("custo_por_1000", 2.70) / 1000
    est["usd"] = round(est["usd"] + custo, 4)
    CUSTO_MES.write_text(json.dumps(est))
    print(
        f"buscados: {total_itens} | novos estagiados: {novos_estagiados} | custo rodada: US${custo:.3f} | mês: US${est['usd']:.3f}"
    )
    print(f"pendentes aguardando aprovação: {len(pendentes)}")


if __name__ == "__main__":
    main()
