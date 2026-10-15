from collections import Counter
import random

from simulacao import (buscar_jogos, separar_jogos, calcular_forcas, gols_esperados,
                       tabela_atual, simular_temporada, SEMENTE)

CORINTHIANS = 1779
SIMULACOES = 10_000

jogos = buscar_jogos()
encerrados, restantes, nomes = separar_jogos(jogos)
times = list(nomes)
forcas, media_casa, media_fora = calcular_forcas(encerrados, times)
esperados = [gols_esperados(c, f, forcas, media_casa, media_fora) for c, f in restantes]
base = tabela_atual(encerrados, times)

rng = random.Random(SEMENTE)
posicoes = Counter()
pontos = []
for _ in range(SIMULACOES):
    ordem, tabela = simular_temporada(base, restantes, esperados, rng)
    posicoes[ordem.index(CORINTHIANS) + 1] += 1
    pontos.append(tabela[CORINTHIANS][0])

print("Posição final do Corinthians em 10 mil temporadas simuladas:")
for posicao in range(1, 21):
    chance = posicoes[posicao] / SIMULACOES
    if chance > 0:
        print(f"  {posicao:>2}º: {chance:6.1%}  {'█' * round(chance * 100)}")

top10 = sum(posicoes[p] for p in range(1, 11)) / SIMULACOES
print(f"Chance de terminar em 10º ou melhor: {top10:.1%}")

pontos.sort()
print(f"Pontos finais: metade dos cenários entre {pontos[SIMULACOES // 4]} e {pontos[3 * SIMULACOES // 4]}")