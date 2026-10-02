"""Salva gols e assistências dos jogadores do Corinthians em artilharia_corinthians.csv.

Fonte: ranking de artilheiros da Série A no football-data.org (plano gratuito).
Limitação: só entram jogadores que aparecem entre os artilheiros do campeonato.
"""

import csv
import os
from datetime import date

import requests

TOKEN = os.environ.get("FOOTBALL_DATA_KEY", "").strip()
if not TOKEN:
    raise SystemExit("Defina a chave antes: $env:FOOTBALL_DATA_KEY=\"SUA_CHAVE\"")
URL = "https://api.football-data.org/v4"
TEMPORADA = int(os.environ.get("TEMPORADA", "2026"))
TIME_ID = 1779  # Corinthians
ARQUIVO = "artilharia_corinthians.csv"

COLUNAS = [
    "ranking", "jogador", "jogos", "gols", "assistencias",
    "penaltis", "participacoes", "atualizado_em",
]


def buscar_artilharia():
    """Pede à API o ranking de artilheiros da Série A."""
    resposta = requests.get(
        f"{URL}/competitions/BSA/scorers",
        headers={"X-Auth-Token": TOKEN},
        params={"season": TEMPORADA, "limit": 100},
        timeout=30,
    )
    resposta.raise_for_status()
    return resposta.json().get("scorers", [])


def montar_linha(posicao, item, hoje):
    """Traduz um jogador da API para uma linha do nosso CSV."""
    gols = item.get("goals") or 0
    assistencias = item.get("assists") or 0
    return {
        "ranking": posicao,
        "jogador": item["player"]["name"],
        "jogos": item.get("playedMatches") or "",
        "gols": gols,
        "assistencias": assistencias,
        "penaltis": item.get("penalties") or 0,
        "participacoes": gols + assistencias,
        "atualizado_em": hoje,
    }


def main():
    hoje = date.today().isoformat()
    ranking = buscar_artilharia()

    linhas = [
        montar_linha(posicao, item, hoje)
        for posicao, item in enumerate(ranking, start=1)
        if item["team"]["id"] == TIME_ID
    ]
    linhas.sort(key=lambda linha: (-linha["participacoes"], -linha["gols"]))

    with open(ARQUIVO, "w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=COLUNAS)
        escritor.writeheader()
        escritor.writerows(linhas)

    print(f"{len(linhas)} jogadores do Corinthians salvos em {ARQUIVO}")


if __name__ == "__main__":
    main()