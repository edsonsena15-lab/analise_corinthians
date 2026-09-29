"""Coleta os jogos do Corinthians na Série A pela API gratuita do football-data.org.

Uso (PowerShell):
    $env:FOOTBALL_DATA_KEY="SUA_CHAVE"
    python coleta_football_data.py

Gera corinthians_serie_a_2026_todos_jogos.csv no mesmo formato usado pelo painel.
O plano gratuito traz placar final e de intervalo; estatísticas como posse e
finalizações ficam em branco (o painel não depende delas).
"""

from __future__ import annotations

import csv
import os
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

API_KEY = os.environ.get("FOOTBALL_DATA_KEY")
TEMPORADA = int(os.environ.get("TEMPORADA", "2026"))
COMPETICAO = "BSA"  # Campeonato Brasileiro Série A no football-data.org
BASE_URL = "https://api.football-data.org/v4"
FUSO = ZoneInfo("America/Sao_Paulo")
ARQUIVO = Path(__file__).resolve().parent / "corinthians_serie_a_2026_todos_jogos.csv"

COLUNAS = [
    "id_jogo", "data", "status", "adversario", "mando", "gols_corinthians", "gols_adversario",
    "resultado", "estadio", "cidade", "posse_corinthians", "finalizacoes_corinthians",
    "chutes_alvo_corinthians", "chutes_fora_corinthians", "chutes_bloqueados_corinthians",
    "chutes_area_corinthians", "chutes_fora_area_corinthians", "escanteios_corinthians",
    "faltas_corinthians", "impedimentos_corinthians", "passes_corinthians",
    "passes_certos_corinthians", "amarelos_corinthians", "vermelhos_corinthians",
    "defesas_corinthians", "posse_adversario", "finalizacoes_adversario",
    "chutes_alvo_adversario", "escanteios_adversario", "faltas_adversario",
    "passes_adversario", "passes_certos_adversario", "amarelos_adversario",
    "vermelhos_adversario", "aproveitamento_passes_corinthians",
    "precisao_finalizacao_corinthians", "conversao_corinthians",
    "aproveitamento_passes_adversario", "precisao_finalizacao_adversario",
    "conversao_adversario", "gols_1t_corinthians", "gols_1t_adversario",
    "gols_2t_corinthians", "gols_2t_adversario", "resultado_intervalo",
]


def get(caminho: str, **params) -> dict:
    resposta = requests.get(
        f"{BASE_URL}{caminho}",
        headers={"X-Auth-Token": API_KEY},
        params=params,
        timeout=30,
    )
    if resposta.status_code in (401, 403):
        sys.exit(f"Acesso negado ({resposta.status_code}). Confira a chave FOOTBALL_DATA_KEY.")
    if resposta.status_code == 429:
        sys.exit("Limite de requisições atingido (429). Aguarde um minuto e tente de novo.")
    resposta.raise_for_status()
    return resposta.json()


def encontrar_corinthians() -> dict:
    times = get(f"/competitions/{COMPETICAO}/teams", season=TEMPORADA).get("teams", [])
    for time in times:
        nomes = " ".join(str(time.get(c, "")) for c in ("name", "shortName", "tla")).lower()
        if "corinthians" in nomes:
            return time
    sys.exit(f"Corinthians não encontrado na Série A {TEMPORADA}. Times: "
             + ", ".join(t.get("shortName", "?") for t in times))


def resultado(pro, contra):
    if pro is None or contra is None:
        return ""
    return "V" if pro > contra else "D" if pro < contra else "E"


def main() -> None:
    if not API_KEY:
        sys.exit("Defina a variável de ambiente FOOTBALL_DATA_KEY antes de executar a coleta.")

    corinthians = encontrar_corinthians()
    cid = corinthians["id"]
    print(f"Time encontrado: {corinthians.get('name')} (id {cid})")

    jogos = get(f"/competitions/{COMPETICAO}/matches", season=TEMPORADA).get("matches", [])
    jogos = [j for j in jogos if cid in (j["homeTeam"]["id"], j["awayTeam"]["id"])]
    print(f"Jogos do Corinthians na temporada {TEMPORADA}: {len(jogos)}")

    linhas = []
    for jogo in jogos:
        em_casa = jogo["homeTeam"]["id"] == cid
        adversario = jogo["awayTeam"] if em_casa else jogo["homeTeam"]
        placar = jogo.get("score", {})
        final = placar.get("fullTime") or {}
        intervalo = placar.get("halfTime") or {}
        lado, outro = ("home", "away") if em_casa else ("away", "home")

        gp, gc = final.get(lado), final.get(outro)
        ip, ic = intervalo.get(lado), intervalo.get(outro)
        status = str(jogo.get("status", "")).lower()
        encerrado = status == "finished" and gp is not None and gc is not None
        data_local = datetime.fromisoformat(jogo["utcDate"].replace("Z", "+00:00")).astimezone(FUSO)

        linha = dict.fromkeys(COLUNAS, "")
        linha.update({
            "id_jogo": f"fd_{jogo['id']}",
            "data": data_local.date().isoformat(),
            "status": status,
            "adversario": adversario.get("shortName") or adversario.get("name"),
            "mando": "Casa" if em_casa else "Fora",
            "estadio": jogo.get("venue") or "",
        })
        if encerrado:
            linha.update({
                "gols_corinthians": gp,
                "gols_adversario": gc,
                "resultado": resultado(gp, gc),
            })
            if ip is not None and ic is not None:
                linha.update({
                    "gols_1t_corinthians": ip,
                    "gols_1t_adversario": ic,
                    "gols_2t_corinthians": gp - ip,
                    "gols_2t_adversario": gc - ic,
                    "resultado_intervalo": resultado(ip, ic),
                })
        linhas.append(linha)

    linhas.sort(key=lambda l: l["data"])
    with ARQUIVO.open("w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=COLUNAS)
        escritor.writeheader()
        escritor.writerows(linhas)

    encerrados = sum(1 for l in linhas if l["resultado"])
    print(f"Jogos encerrados: {encerrados}")
    print(f"Arquivo gerado: {ARQUIVO.name}")


if __name__ == "__main__":
    main()
