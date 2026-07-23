#!/usr/bin/env python3
"""Registra decisões de curadoria no decisoes.json e recomputa concordancia.json. stdlib."""

import json
import sys
import datetime
from pathlib import Path

DIR = Path(__file__).resolve().parent
DECISOES = DIR / "decisoes.json"
CONCORD = DIR / "concordancia.json"


def carregar(p, default):
    p = Path(p)
    if p.exists() and p.read_text().strip():
        return json.loads(p.read_text())
    return default


def recomputar_concordancia(decisoes):
    total = len(decisoes)
    aprovado = sum(1 for d in decisoes if d["decisao"]["acao"] == "aprovado")
    ajustado = sum(1 for d in decisoes if d["decisao"]["acao"] == "ajustado")
    rejeitado = sum(1 for d in decisoes if d["decisao"]["acao"] == "rejeitado")
    considerados = card_ok = 0
    por_card = {}
    for d in decisoes:
        if d["decisao"]["acao"] == "rejeitado":
            continue
        prop = d["proposta"]["card"]
        final = d["decisao"].get("card_final") or prop
        aceito = final == prop
        considerados += 1
        card_ok += 1 if aceito else 0
        pc = por_card.setdefault(prop, {"propostas": 0, "card_aceito": 0})
        pc["propostas"] += 1
        pc["card_aceito"] += 1 if aceito else 0
    taxa = round(card_ok / considerados, 3) if considerados else 0.0
    return {
        "total": total,
        "aprovado_sem_ajuste": aprovado,
        "ajustado": ajustado,
        "rejeitado": rejeitado,
        "taxa_concordancia_card": taxa,
        "por_card": por_card,
        "atualizado_em": datetime.date.today().isoformat(),
    }


def registrar(novas):
    decisoes = carregar(DECISOES, [])
    decisoes.extend(novas)
    DECISOES.write_text(json.dumps(decisoes, ensure_ascii=False, indent=2) + "\n")
    conc = recomputar_concordancia(decisoes)
    CONCORD.write_text(json.dumps(conc, ensure_ascii=False, indent=2) + "\n")
    return conc


if __name__ == "__main__":
    entrada = json.loads(Path(sys.argv[1]).read_text())
    novas = entrada if isinstance(entrada, list) else [entrada]
    conc = registrar(novas)
    print(
        f"registradas {len(novas)} | total={conc['total']} | concordancia_card={conc['taxa_concordancia_card']}"
    )
