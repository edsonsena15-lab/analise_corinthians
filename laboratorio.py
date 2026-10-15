from simulacao import buscar_jogos, separar_jogos, calcular_forcas, gols_esperados

CORINTHIANS = 1779

jogos = buscar_jogos()
encerrados, restantes, nomes = separar_jogos(jogos)
forcas, media_casa, media_fora = calcular_forcas(encerrados, list(nomes))

print(f"Média da liga por jogo: mandante {media_casa:.2f} gols, visitante {media_fora:.2f} gols")

print("Forças do Corinthians (1,00 = média da liga):")
for nome, valor in forcas[CORINTHIANS].items():
    print(f"  {nome}: {valor:.2f}")

casa, fora = next(jogo for jogo in restantes if CORINTHIANS in jogo)
esperado_casa, esperado_fora = gols_esperados(casa, fora, forcas, media_casa, media_fora)
print(f"Próximo jogo: {nomes[casa]} x {nomes[fora]}")
print(f"Gols esperados: {esperado_casa:.2f} x {esperado_fora:.2f}")