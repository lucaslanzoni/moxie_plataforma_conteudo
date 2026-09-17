# Agente da Fase 2 — Buscador de referências (Moxie)

Três peças: o **Buscador** (este) estagia posts novos; a skill `/moxie-referencias` classifica e publica; o **ingestor de avaliações** (`curador/ingerir_avaliacoes.py`) aplica o feedback da Gabriela sobre referências já publicadas no painel.

## Ingerir avaliações da Gabriela
    /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/curador/ingerir_avaliacoes.py <json-exportado-pelo-painel>

Ela exporta pelo botão "Enviar avaliações" no painel e manda o `.json` pro Lucas. O script cruza cada avaliação com `dados.json` (via shortCode extraído da url), remove rejeitadas do catálogo (+ apaga o print) e registra o sinal em `agente/curador/avaliacoes_gabriela.json` — idempotente, roda de novo sem duplicar. Revisar o `git diff` antes de comitar/deployar. Testes: `python3 agente/curador/test_ingerir_avaliacoes.py -v`.

## Setup (uma vez)

A instalação do Python 3.14 do python.org pode vir sem o CA bundle, o que causa erro de SSL ao chamar a Apify. Se isso acontecer, rodar uma vez: `/Applications/Python\ 3.14/Install\ Certificates.command` (instala os certificados). Já foi rodado na máquina de Lucas; necessário só em máquina nova.

## Rodar à mão
    /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/buscar.py

Lê `APIFY_TOKEN` do `.env` na raiz. Escreve candidatos em `agente/pendentes.json` + imagens em `agente/pendentes/`. Não faz git.

## Agendar (launchd, 1x/dia)
    cp com.lucas.moxie-buscador.plist ~/Library/LaunchAgents/
    launchctl load ~/Library/LaunchAgents/com.lucas.moxie-buscador.plist
    launchctl list | grep moxie-buscador   # conferir
Log: `~/Library/Logs/moxie-buscador.log`.

## Custo
Apify free tier = US$5/mês. `resultsLimit` e `budget_usd` em `agente/config.json`. O buscador acumula custo estimado em `custo_mes.json` e para se atingir o orçamento. `onlyPostsNewerThan` (data da última rodada) reduz o scrape após a 1ª vez.

## Contas-fonte
Edite `agente/contas_fonte.json` (só o @ sem o "@"). v1 é só Instagram.

## Testes
    /Library/Frameworks/Python.framework/Versions/3.14/bin/python3 agente/test_buscar.py -v
