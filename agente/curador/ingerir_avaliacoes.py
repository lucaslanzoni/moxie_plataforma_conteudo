#!/usr/bin/env python3
"""Ingere o export de avaliações do painel (Gabriela) em dados.json + log de aprendizado. stdlib."""

import datetime
import json
import sys
from pathlib import Path

DIR = Path(__file__).resolve().parent
RAIZ = DIR.parent.parent
DADOS = RAIZ / "dados.json"
LOG = DIR / "avaliacoes_gabriela.json"


def carregar(p, default):
    p = Path(p)
    if p.exists() and p.read_text().strip():
        return json.loads(p.read_text())
    return default


def short_code_de(url):
    """Mesma lógica de shortCodeOf em assets/feedback.js: último segmento do path da url."""
    url = url or ""
    sem_query = url.split("?")[0].rstrip("/")
    partes = sem_query.split("/")
    ultimo = partes[-1] if partes else ""
    return ultimo or url


def indexar_referencias(dados):
    """shortCode -> {"card": card, "ref": referência} (objetos vivos, pra permitir mutação/remoção in-place)."""
    indice = {}
    for card in dados["cards"]:
        for ref in card["referencias"]:
            indice[short_code_de(ref.get("url"))] = {"card": card, "ref": ref}
    return indice


def ingerir(payload, dados, log):
    """Aplica o payload exportado do painel sobre dados (in-memory) e log (lista, append).
    Retorna (resultado, prints_removidos)."""
    if payload.get("tipo") != "avaliacoes-painel":
        raise ValueError(f"tipo inesperado: {payload.get('tipo')!r}")
    if "avaliacoes" not in payload:
        raise ValueError("payload sem campo 'avaliacoes'")

    processados = {(e["shortCode"], e["estado"]) for e in log}
    indice = indexar_referencias(dados)

    resultado = {
        "aprovadas": 0,
        "rejeitadas": 0,
        "ja_processadas": 0,
        "nao_encontradas": [],
    }
    prints_removidos = []

    for avaliacao in payload["avaliacoes"]:
        sc = avaliacao["shortCode"]
        estado = avaliacao["estado"]
        if (sc, estado) in processados:
            resultado["ja_processadas"] += 1
            continue

        entrada_log = {
            **avaliacao,
            "processado_em": datetime.datetime.now().isoformat(),
        }

        entrada = indice.get(sc)
        if entrada is None:
            entrada_log["resultado"] = "nao_encontrada"
            resultado["nao_encontradas"].append(sc)
        elif estado == "rejeitado":
            card, removida = entrada["card"], entrada["ref"]
            card["referencias"] = [r for r in card["referencias"] if r is not removida]
            prints_removidos.append(removida.get("print"))
            entrada_log["resultado"] = "removida_do_dados_json"
            resultado["rejeitadas"] += 1
        elif estado == "aprovado":
            entrada["ref"]["aprovado_gabriela"] = True
            entrada_log["resultado"] = "marcada_aprovada_no_dados_json"
            resultado["aprovadas"] += 1
        else:
            entrada_log["resultado"] = f"estado_desconhecido:{estado}"

        log.append(entrada_log)

    return resultado, prints_removidos


def main():
    if len(sys.argv) != 2:
        print("uso: ingerir_avaliacoes.py <json-exportado-do-painel>", file=sys.stderr)
        sys.exit(1)

    payload = json.loads(Path(sys.argv[1]).read_text())
    dados = carregar(DADOS, None)
    if dados is None:
        raise SystemExit(f"{DADOS} não encontrado ou vazio")
    log = carregar(LOG, [])

    resultado, prints_removidos = ingerir(payload, dados, log)

    if resultado["rejeitadas"] or resultado["aprovadas"]:
        DADOS.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + "\n")
        for nome in prints_removidos:
            if not nome:
                continue
            caminho = RAIZ / nome
            if caminho.exists():
                caminho.unlink()

    if (
        resultado["aprovadas"]
        or resultado["rejeitadas"]
        or resultado["nao_encontradas"]
    ):
        LOG.write_text(json.dumps(log, ensure_ascii=False, indent=2) + "\n")

    print(
        f"aprovadas={resultado['aprovadas']} | rejeitadas={resultado['rejeitadas']} "
        f"| já processadas={resultado['ja_processadas']} | não encontradas={len(resultado['nao_encontradas'])}"
    )
    if resultado["nao_encontradas"]:
        print(
            "shortCodes não encontrados em dados.json:",
            ", ".join(resultado["nao_encontradas"]),
        )


if __name__ == "__main__":
    main()
