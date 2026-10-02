"""Simula o restante da Série A e calcula as chances de título, G6 e Z4 de cada clube.

Método de Monte Carlo: cada jogo restante é sorteado milhares de vezes, com gols
gerados por uma distribuição de Poisson a partir da força de ataque e de defesa
de cada time (em casa e fora). Ao final de cada temporada simulada, a tabela é
ordenada pelos critérios do Brasileirão e as posições finais são contadas.
"""

import csv
import math
import os
import random
from datetime import date

import requests

TOKEN = os.environ.get("FOOTBALL_DATA_KEY", "").strip()
URL = "https://api.football-data.org/v4"
TEMPORADA = int(os.environ.get("TEMPORADA", "2026"))
ARQUIVO = "simulacao_serie_a.csv"

SIMULACOES = 10_000   # quantas temporadas simular
SEMENTE = 2026        # mesma semente = mesmos sorteios = resultado reproduzível
PESO_MEDIA = 5        # "jogos de time médio" somados a cada clube para suavizar as forças
G6_FIM = 6
Z4_INICIO = 17
CORINTHIANS = 1779
ARQUIVO_POSICOES = "simulacao_posicoes_corinthians.csv"


# ---------------------------------------------------------------
# Parte A: dados e forças dos times
# ---------------------------------------------------------------

def buscar_jogos():
    """Baixa todos os jogos da Série A na temporada (encerrados e restantes)."""
    if not TOKEN:
        raise SystemExit('Defina a chave antes: $env:FOOTBALL_DATA_KEY="SUA_CHAVE"')
    resposta = requests.get(
        f"{URL}/competitions/BSA/matches",
        headers={"X-Auth-Token": TOKEN},
        params={"season": TEMPORADA},
        timeout=30,
    )
    resposta.raise_for_status()
    return resposta.json()["matches"]


def separar_jogos(jogos):
    """Divide os jogos em encerrados (com placar) e restantes (ainda a disputar)."""
    encerrados, restantes, nomes = [], [], {}
    for jogo in jogos:
        casa, fora = jogo["homeTeam"], jogo["awayTeam"]
        nomes[casa["id"]] = casa.get("shortName") or casa.get("name")
        nomes[fora["id"]] = fora.get("shortName") or fora.get("name")
        placar = (jogo.get("score") or {}).get("fullTime") or {}
        if jogo["status"] == "FINISHED" and placar.get("home") is not None:
            encerrados.append((casa["id"], fora["id"], placar["home"], placar["away"]))
        elif jogo["status"] != "CANCELLED":
            restantes.append((casa["id"], fora["id"]))
    return encerrados, restantes, nomes


def calcular_forcas(encerrados, times):
    """Calcula a força de ataque e de defesa de cada time, em casa e fora.

    Força 1,00 = igual à média da liga. Ataque 1,20 = marca 20% a mais que a média.
    Defesa 0,80 = sofre 20% a menos que a média (defesa menor é melhor).
    """
    total_jogos = len(encerrados)
    media_casa = sum(j[2] for j in encerrados) / total_jogos   # gols do mandante por jogo
    media_fora = sum(j[3] for j in encerrados) / total_jogos   # gols do visitante por jogo

    soma = {t: {"gp_c": 0, "gc_c": 0, "j_c": 0, "gp_f": 0, "gc_f": 0, "j_f": 0} for t in times}
    for casa, fora, gols_casa, gols_fora in encerrados:
        soma[casa]["gp_c"] += gols_casa
        soma[casa]["gc_c"] += gols_fora
        soma[casa]["j_c"] += 1
        soma[fora]["gp_f"] += gols_fora
        soma[fora]["gc_f"] += gols_casa
        soma[fora]["j_f"] += 1

    def suavizar(gols, jogos, media):
        # Soma PESO_MEDIA jogos "de time médio" antes de dividir: evita forças
        # exageradas por causa de poucos jogos ou de uma goleada isolada.
        return (gols + PESO_MEDIA * media) / ((jogos + PESO_MEDIA) * media)

    forcas = {}
    for t, s in soma.items():
        forcas[t] = {
            "ataque_casa": suavizar(s["gp_c"], s["j_c"], media_casa),
            "defesa_casa": suavizar(s["gc_c"], s["j_c"], media_fora),
            "ataque_fora": suavizar(s["gp_f"], s["j_f"], media_fora),
            "defesa_fora": suavizar(s["gc_f"], s["j_f"], media_casa),
        }
    return forcas, media_casa, media_fora


def gols_esperados(casa, fora, forcas, media_casa, media_fora):
    """Quantos gols, em média, cada time deve marcar neste confronto."""
    esperado_casa = media_casa * forcas[casa]["ataque_casa"] * forcas[fora]["defesa_fora"]
    esperado_fora = media_fora * forcas[fora]["ataque_fora"] * forcas[casa]["defesa_casa"]
    return esperado_casa, esperado_fora


# ---------------------------------------------------------------
# Parte B: simular uma temporada
# ---------------------------------------------------------------

def sortear_gols(media, rng):
    """Sorteia um número de gols seguindo a distribuição de Poisson (algoritmo de Knuth)."""
    limite = math.exp(-media)
    gols, produto = 0, rng.random()
    while produto > limite:
        gols += 1
        produto *= rng.random()
    return gols


def tabela_atual(encerrados, times):
    """Pontos, vitórias, saldo e gols pró de cada time com os jogos já disputados."""
    tabela = {t: [0, 0, 0, 0] for t in times}   # [pontos, vitorias, saldo, gols_pro]
    for casa, fora, gc, gf in encerrados:
        registrar(tabela, casa, fora, gc, gf)
    return tabela


def registrar(tabela, casa, fora, gols_casa, gols_fora):
    """Atualiza a tabela com o resultado de um jogo."""
    tabela[casa][2] += gols_casa - gols_fora
    tabela[fora][2] += gols_fora - gols_casa
    tabela[casa][3] += gols_casa
    tabela[fora][3] += gols_fora
    if gols_casa > gols_fora:
        tabela[casa][0] += 3
        tabela[casa][1] += 1
    elif gols_casa < gols_fora:
        tabela[fora][0] += 3
        tabela[fora][1] += 1
    else:
        tabela[casa][0] += 1
        tabela[fora][0] += 1


def simular_temporada(base, restantes, esperados, rng):
    """Sorteia todos os jogos restantes e devolve a classificação final (lista de ids)."""
    tabela = {t: valores[:] for t, valores in base.items()}   # cópia, para não alterar a base
    for (casa, fora), (media_c, media_f) in zip(restantes, esperados):
        registrar(tabela, casa, fora, sortear_gols(media_c, rng), sortear_gols(media_f, rng))
    # Critérios do Brasileirão: pontos, vitórias, saldo, gols pró; o resto, sorteio.
    return sorted(tabela, key=lambda t: (*tabela[t], rng.random()), reverse=True), tabela


# ---------------------------------------------------------------
# Parte C: repetir milhares de vezes e salvar
# ---------------------------------------------------------------

def main():
    jogos = buscar_jogos()
    encerrados, restantes, nomes = separar_jogos(jogos)
    times = list(nomes)
    forcas, media_casa, media_fora = calcular_forcas(encerrados, times)
    esperados = [gols_esperados(c, f, forcas, media_casa, media_fora) for c, f in restantes]
    base = tabela_atual(encerrados, times)

    print(f"Jogos encerrados: {len(encerrados)} | restantes: {len(restantes)}")
    print(f"Média de gols por jogo: mandante {media_casa:.2f} x visitante {media_fora:.2f}")

    rng = random.Random(SEMENTE)
    contagem = {t: {"titulo": 0, "g6": 0, "z4": 0, "soma_pos": 0, "pontos": []} for t in times}
    posicoes_corinthians = [0] * 21   # índice = posição final (1 a 20)
    for _ in range(SIMULACOES):
        ordem, tabela = simular_temporada(base, restantes, esperados, rng)
        for posicao, t in enumerate(ordem, start=1):
            c = contagem[t]
            c["titulo"] += posicao == 1
            c["g6"] += posicao <= G6_FIM
            c["z4"] += posicao >= Z4_INICIO
            c["soma_pos"] += posicao
            c["pontos"].append(tabela[t][0])
            if t == CORINTHIANS:
                posicoes_corinthians[posicao] += 1

    hoje = date.today().isoformat()
    restantes_por_time = {t: sum(t in jogo for jogo in restantes) for t in times}
    linhas = []
    for t in times:
        c = contagem[t]
        pontos = sorted(c["pontos"])
        linhas.append({
            "time_id": t,
            "time": nomes[t],
            "pontos_atuais": base[t][0],
            "jogos_restantes": restantes_por_time[t],
            "pontos_medios": round(sum(pontos) / SIMULACOES, 1),
            "pontos_p10": pontos[SIMULACOES // 10],
            "pontos_p50": pontos[SIMULACOES // 2],
            "pontos_p90": pontos[SIMULACOES * 9 // 10],
            "posicao_media": round(c["soma_pos"] / SIMULACOES, 1),
            "prob_titulo": round(c["titulo"] / SIMULACOES, 4),
            "prob_g6": round(c["g6"] / SIMULACOES, 4),
            "prob_z4": round(c["z4"] / SIMULACOES, 4),
            "simulacoes": SIMULACOES,
            "atualizado_em": hoje,
        })
    linhas.sort(key=lambda linha: linha["posicao_media"])

    with open(ARQUIVO, "w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.DictWriter(arquivo, fieldnames=list(linhas[0]))
        escritor.writeheader()
        escritor.writerows(linhas)

    with open(ARQUIVO_POSICOES, "w", newline="", encoding="utf-8") as arquivo:
        escritor = csv.writer(arquivo)
        escritor.writerow(["posicao", "probabilidade"])
        for posicao in range(1, 21):
            escritor.writerow([posicao, round(posicoes_corinthians[posicao] / SIMULACOES, 4)])

    # Conferências: em cada temporada há exatamente 1 campeão, 6 no G6 e 4 no Z4.
    print(f"Soma das chances de título: {sum(l['prob_titulo'] for l in linhas):.2f} (esperado 1)")
    print(f"Soma das chances de G6:     {sum(l['prob_g6'] for l in linhas):.2f} (esperado 6)")
    print(f"Soma das chances de Z4:     {sum(l['prob_z4'] for l in linhas):.2f} (esperado 4)")
    print(f"Soma das posições do Corinthians: {sum(posicoes_corinthians) / SIMULACOES:.2f} (esperado 1)")
    print(f"{len(linhas)} times salvos em {ARQUIVO} e distribuição em {ARQUIVO_POSICOES}")


if __name__ == "__main__":
    main()