<p align="center">
  <img src="corinthians-logo.svg" alt="Marca do painel" width="110">
</p>

<h1 align="center">Dashboard Gerencial — Corinthians na Série A 2026</h1>

<p align="center">
  Projeto de análise de dados esportivos que transforma os resultados da campanha do Sport Club Corinthians Paulista no Brasileirão em indicadores de desempenho, tendências e cenários probabilísticos.
</p>

<p align="center">
  <img alt="Streamlit" src="https://img.shields.io/badge/Streamlit-1.64-FF4B4B?logo=streamlit&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-ES6-F7DF1E?logo=javascript&logoColor=111111">
  <img alt="Python" src="https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white">
  <img alt="Status" src="https://img.shields.io/badge/status-em%20desenvolvimento-111111">
</p>

![Visão geral da dashboard](dashboard-preview.png)

> **Atenção:** a imagem acima e o arquivo `exemplo_demo_corinthians_serie_a_2026.csv` usam **placares fictícios**, apenas para demonstrar o painel. Os dados reais são gerados por `coleta_detalhada.py`. Enquanto o CSV real estiver vazio, o painel exibe um aviso de "Dados de demonstração".

## Sobre o projeto

Esta dashboard acompanha a campanha do Corinthians na Série A de 2026 sob uma perspectiva gerencial. O painel consolida os resultados jogo a jogo, compara o desempenho dentro e fora de casa (Neo Química Arena × visitante) e converte a campanha em informações úteis para tomada de decisão.

Além dos indicadores tradicionais, o projeto apresenta projeções para as rodadas finais e um modelo probabilístico que estima as chances de **título**, de **vaga na Libertadores (faixa do G6)** e de **rebaixamento (Z4)**.

## Panorama analisado

Preencha esta seção depois da primeira coleta com dados reais:

| Indicador | Resultado |
|---|---:|
| Jogos disputados | — |
| Pontos conquistados | — |
| Campanha | — vitórias, — empates e — derrotas |
| Aproveitamento | —% |
| Média de pontos | — por jogo |
| Gols | — marcados e — sofridos |
| Saldo de gols | — |

## O que a dashboard entrega

- KPIs de pontos, aproveitamento, média por jogo e saldo de gols;
- distribuição de vitórias, empates e derrotas;
- evolução da pontuação rodada a rodada, comparada ao ritmo de 50%;
- comparação entre desempenho em casa e como visitante;
- gols marcados e sofridos no primeiro e no segundo tempo;
- rendimento por períodos da competição;
- sequência recente e indicadores de consistência;
- projeção de pontuação para as 38 rodadas;
- simulação de metas de pontos (40 a 80);
- cenários probabilísticos de título, Libertadores e rebaixamento;
- próximos adversários (espelhamento do primeiro turno);
- tabela completa com busca por adversário e filtros por mando de campo.

## Metodologia

### Pontuação e aproveitamento

- Vitória: 3 pontos; empate: 1 ponto; derrota: 0 ponto;
- aproveitamento: pontos conquistados ÷ pontos possíveis.

O painel considera somente partidas com `status` igual a `finished` e resultado `V`, `E` ou `D`.

### Modelo probabilístico

As probabilidades vêm de uma distribuição preditiva bayesiana (Dirichlet-multinomial com prior de Jeffreys), separando o desempenho como mandante e visitante. Os jogos restantes são identificados pelo espelhamento da tabela do primeiro turno.

Referências adotadas (constante `MODEL_LIMITS` em `app.js`):

- título: 75 pontos ou mais;
- Libertadores (faixa do G6): 60 pontos ou mais;
- rebaixamento: 44 pontos ou menos.

Essas faixas são referências analíticas, não cortes garantidos. O modelo não considera a campanha dos demais clubes, critérios de desempate, a força dos adversários nem a variação no número de vagas para a Libertadores.

## Tecnologias utilizadas

- **Python:** coleta e preparação dos dados;
- **Streamlit:** publicação da aplicação;
- **JavaScript:** cálculos, filtros, simulações e gráficos;
- **HTML e CSS:** estrutura, responsividade e identidade visual alvinegra;
- **CSV:** base consolidada.

## Estrutura do projeto

<pre><code>analise_corinthians/
├── app.js
├── coleta_detalhada.py
├── corinthians-logo.svg
├── corinthians_serie_a_2026_todos_jogos.csv      ← base real (gerada pela coleta)
├── dashboard-preview.png
├── exemplo_demo_corinthians_serie_a_2026.csv     ← dados fictícios de demonstração
├── index.html
├── requirements.txt
├── server.js
├── streamlit_app.py
└── styles.css
</code></pre>

## Executar localmente

### Streamlit

<pre><code>cd analise_corinthians
python -m pip install -r requirements.txt
python -m streamlit run streamlit_app.py
</code></pre>

Acesse <code>http://localhost:8501</code>.

### Versão HTML

<pre><code>node server.js
</code></pre>

Acesse <code>http://localhost:8000</code>.

## Atualização dos dados

O arquivo `coleta_detalhada.py` busca os jogos na API (incluindo placares do intervalo) e gera `corinthians_serie_a_2026_todos_jogos.csv`. Informe a chave da API e os identificadores da Série A e do Corinthians por variáveis de ambiente (PowerShell):

<pre><code>$env:FSAPI_KEY="SUA_CHAVE"
$env:SERIE_A_ID="lg_XXXXXXX"        # ID da Série A na API
$env:CORINTHIANS_ID="tm_XXXXXXX"    # ID do Corinthians na API
python coleta_detalhada.py
</code></pre>

Os IDs precisam ser consultados na documentação ou no painel da API. A chave não deve ser gravada no código nem enviada ao GitHub.

## Escudo

O arquivo `corinthians-logo.svg` é uma marca neutra provisória. O escudo do Corinthians é marca registrada do clube; se você tiver autorização para usá-lo, basta substituir esse arquivo mantendo o mesmo nome.

---

Projeto adaptado de [analise_nautico](https://github.com/pablohmelo02/analise_nautico), de Pablo Melo.
