"""Salva a classificação da Série A em tabela_serie_a.csv."""

import csv
import os
from datetime import date

import requests

TOKEN = os.environ["FOOTBALL_DATA_KEY"].strip()
URL = "https://api.football-data.org/v4"
TEMPORADA = int(os.environ.get("TEMPORADA", "2026"))
ARQUIVO = "tabela_serie_a.csv"

COLUNAS = [
    "posicao", "time_id", "time", "escudo", "jogos", "pontos",
    "vitorias", "empates", "derrotas", "saldo_gols", "gols_pro",
    "gols_contra", "forma", "atualizado_em",
]


def buscar_classificacao():
    """Pede a classificação à API e devolve só a tabela geral."""
    resposta = requests.get(
        f"{URL}/competitions/BSA/standings",
        headers={"X-Auth-Token": TOKEN},
        params={"season": TEMPORADA},
        timeout=30,
    )
    resposta.raise_for_status()
    dados = resposta.json()

    for bloco in dados["standings"]:
        if bloco["type"] == "TOTAL":
            return bloco["table"]
    raise ValueError("Classificação geral não encontrada na resposta da API.")


def montar_linha(item, hoje):
    """Traduz um time da API para uma linha do nosso CSV."""
    return {
        "posicao": item["position"],
        "time_id": item["team"]["id"],
        "time": item["team"]["shortName"],
        "escudo": item["team"]["crest"],
        "jogos": item["playedGames"],
        "pontos": item["points"],
        "vitorias": item["won"],
        "empates": item["draw"],
        "derrotas": item["lost"],
        "saldo_gols": item["goalDifference"],
        "gols_pro": item["goalsFor"],
        "gols_contra": item["goalsAgainst"],
        "forma": item.get("form") or "",
        "atualizado_em": hoje,
    }


def main():
    hoje = date.today().isoformat()
    tabela = buscar_classificacao()
    linhas = [montar_linha(item, hoje) for item in tabela]

    with open(ARQUIVO, "w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=COLUNAS)
        escritor.writeheader()
        escritor.writerows(linhas)

    print(f"{len(linhas)} times salvos em {ARQUIVO}")


if __name__ == "__main__":
    main()