import os
import requests
import pandas as pd
import time

API_KEY = os.environ.get("FSAPI_KEY")

if not API_KEY:
    raise RuntimeError(
        "Defina a variável de ambiente FSAPI_KEY antes de executar a coleta."
    )

# ---------------------------------------------------------
# IDENTIFICADORES NA API
# Os IDs abaixo seguem o padrão da footballsoccerapi (lg_... / tm_...).
# Confira os valores corretos da Série A e do Corinthians na
# documentação/painel da API e informe-os por variável de ambiente:
#   $env:SERIE_A_ID="lg_XXXXXXX"
#   $env:CORINTHIANS_ID="tm_XXXXXXX"
# ---------------------------------------------------------

SERIE_A_ID = os.environ.get("SERIE_A_ID")
CORINTHIANS_ID = os.environ.get("CORINTHIANS_ID")
TEMPORADA = int(os.environ.get("TEMPORADA", "2026"))

if not SERIE_A_ID or not CORINTHIANS_ID:
    raise RuntimeError(
        "Defina as variáveis de ambiente SERIE_A_ID e CORINTHIANS_ID "
        "com os identificadores da Série A e do Corinthians na API."
    )

BASE_URL = "https://api.footballsoccerapi.com/v1"

HEADERS = {
    "X-API-Key": API_KEY
}


# =========================================================
# 1. BUSCAR TODOS OS JOGOS DISPONÍVEIS
# =========================================================

def buscar_todos_jogos():

    url = f"{BASE_URL}/matches"

    params = {
        "league_id": SERIE_A_ID,
        "team_id": CORINTHIANS_ID,
        "season": TEMPORADA,
        "limit": 1000,
        "sort": "kickoff_utc"
    }

    todos = []
    cursor = None

    while True:

        if cursor:
            params["cursor"] = cursor

        response = requests.get(
            url,
            headers=HEADERS,
            params=params,
            timeout=30
        )

        print(
            "Busca geral:",
            response.status_code
        )

        response.raise_for_status()

        json = response.json()

        dados = json.get("data", [])

        todos.extend(dados)

        meta = json.get("meta", {})

        print(
            "Página:",
            meta.get("page"),
            "| Recebidos:",
            len(dados),
            "| Total informado:",
            meta.get("total")
        )

        cursor = meta.get("next_cursor")

        if not cursor:
            break

    return todos


# =========================================================
# 2. DETALHAR UM JOGO
# =========================================================

def buscar_detalhes(match_id):

    url = (
        f"{BASE_URL}/matches/{match_id}"
    )

    response = requests.get(
        url,
        headers=HEADERS,
        timeout=30
    )

    if response.status_code != 200:

        print(
            f"   Detalhes indisponíveis "
            f"({response.status_code})"
        )

        return None

    return response.json().get(
        "data"
    )


# =========================================================
# 3. ENCONTRAR ESTATÍSTICAS DE UM TIME
# =========================================================

def stats_time(jogo, nome_time):

    for item in jogo.get(
        "statistics",
        []
    ):

        if (
            item.get("team_name")
            == nome_time
        ):

            return item.get(
                "statistics",
                {}
            )

    return {}


def percentual_decimal(valor):
    """Converte percentuais da API (ex.: 63) para decimal (0.63).
    Esse formato é o ideal para o Power BI aplicar o formato Porcentagem.
    """
    if valor is None:
        return None

    try:
        return round(float(valor) / 100, 4)
    except (TypeError, ValueError):
        return None


# =========================================================
# 4. PROCESSAR
# =========================================================

jogos = buscar_todos_jogos()

print("\n" + "=" * 60)
print(
    "TOTAL DE JOGOS RETORNADOS:",
    len(jogos)
)
print("=" * 60)


resultado = []


for numero, basico in enumerate(
    jogos,
    start=1
):

    match_id = basico["match_id"]

    print(
        f"\n[{numero}/{len(jogos)}] "
        f"{basico.get('home_team_name')} x "
        f"{basico.get('away_team_name')}"
    )

    detalhe = None

    try:

        detalhe = buscar_detalhes(
            match_id
        )

    except Exception as erro:

        print(
            "   Erro no detalhe:",
            erro
        )

    # Se não conseguir detalhe,
    # mantém os dados básicos.
    jogo = detalhe or basico

    mandante = jogo.get(
        "home_team_name"
    )

    visitante = jogo.get(
        "away_team_name"
    )

    id_mandante = jogo.get(
        "home_team_id"
    )

    id_visitante = jogo.get(
        "away_team_id"
    )

    gols_mandante = jogo.get(
        "home_goals"
    )

    gols_visitante = jogo.get(
        "away_goals"
    )

    gols_1t_mandante = jogo.get(
        "half_time_home_goals"
    )

    gols_1t_visitante = jogo.get(
        "half_time_away_goals"
    )


    # =====================================================
    # IDENTIFICAR CORINTHIANS
    # =====================================================

    if id_mandante == CORINTHIANS_ID:

        mando = "Casa"

        adversario = visitante

        gols_corinthians = gols_mandante
        gols_adversario = gols_visitante
        gols_1t_corinthians = gols_1t_mandante
        gols_1t_adversario = gols_1t_visitante

        nome_corinthians = mandante
        nome_adversario = visitante

    else:

        mando = "Fora"

        adversario = mandante

        gols_corinthians = gols_visitante
        gols_adversario = gols_mandante
        gols_1t_corinthians = gols_1t_visitante
        gols_1t_adversario = gols_1t_mandante

        nome_corinthians = visitante
        nome_adversario = mandante


    # =====================================================
    # RESULTADO
    # =====================================================

    resultado_corinthians = None

    if (
        gols_corinthians is not None
        and gols_adversario is not None
    ):

        if gols_corinthians > gols_adversario:
            resultado_corinthians = "V"

        elif gols_corinthians < gols_adversario:
            resultado_corinthians = "D"

        else:
            resultado_corinthians = "E"


    # =====================================================
    # ESTATÍSTICAS
    # =====================================================

    gols_2t_corinthians = None
    gols_2t_adversario = None
    resultado_intervalo = None

    if (
        gols_corinthians is not None
        and gols_adversario is not None
        and gols_1t_corinthians is not None
        and gols_1t_adversario is not None
    ):
        gols_2t_corinthians = gols_corinthians - gols_1t_corinthians
        gols_2t_adversario = gols_adversario - gols_1t_adversario

        if gols_1t_corinthians > gols_1t_adversario:
            resultado_intervalo = "V"
        elif gols_1t_corinthians < gols_1t_adversario:
            resultado_intervalo = "D"
        else:
            resultado_intervalo = "E"


    # =====================================================
    # ESTATÍSTICAS

    stats_corinthians = stats_time(
        jogo,
        nome_corinthians
    )

    stats_adv = stats_time(
        jogo,
        nome_adversario
    )


    linha = {

        "id_jogo":
            match_id,

        "data":
            jogo.get(
                "kickoff_date"
            ),

        "status":
            jogo.get(
                "match_status"
            ),

        "adversario":
            adversario,

        "mando":
            mando,

        "gols_corinthians":
            gols_corinthians,

        "gols_adversario":
            gols_adversario,

        "resultado":
            resultado_corinthians,

        "gols_1t_corinthians":
            gols_1t_corinthians,

        "gols_1t_adversario":
            gols_1t_adversario,

        "gols_2t_corinthians":
            gols_2t_corinthians,

        "gols_2t_adversario":
            gols_2t_adversario,

        "resultado_intervalo":
            resultado_intervalo,

        "estadio":
            jogo.get(
                "venue_name"
            ),

        "cidade":
            jogo.get(
                "city_name"
            ),

        # CORINTHIANS

        "posse_corinthians":
            percentual_decimal(
                stats_corinthians.get(
                    "possession_pct"
                )
            ),

        "finalizacoes_corinthians":
            stats_corinthians.get(
                "shots_total"
            ),

        "chutes_alvo_corinthians":
            stats_corinthians.get(
                "shots_on_target"
            ),

        "chutes_fora_corinthians":
            stats_corinthians.get(
                "shots_off_target"
            ),

        "chutes_bloqueados_corinthians":
            stats_corinthians.get(
                "shots_blocked"
            ),

        "chutes_area_corinthians":
            stats_corinthians.get(
                "shots_inside_box"
            ),

        "chutes_fora_area_corinthians":
            stats_corinthians.get(
                "shots_outside_box"
            ),

        "escanteios_corinthians":
            stats_corinthians.get(
                "corners"
            ),

        "faltas_corinthians":
            stats_corinthians.get(
                "fouls"
            ),

        "impedimentos_corinthians":
            stats_corinthians.get(
                "offsides"
            ),

        "passes_corinthians":
            stats_corinthians.get(
                "passes_total"
            ),

        "passes_certos_corinthians":
            stats_corinthians.get(
                "passes_accurate"
            ),

        "amarelos_corinthians":
            stats_corinthians.get(
                "yellow_cards"
            ),

        "vermelhos_corinthians":
            stats_corinthians.get(
                "red_cards"
            ),

        "defesas_corinthians":
            stats_corinthians.get(
                "saves"
            ),

        # ADVERSÁRIO

        "posse_adversario":
            percentual_decimal(
                stats_adv.get(
                    "possession_pct"
                )
            ),

        "finalizacoes_adversario":
            stats_adv.get(
                "shots_total"
            ),

        "chutes_alvo_adversario":
            stats_adv.get(
                "shots_on_target"
            ),

        "escanteios_adversario":
            stats_adv.get(
                "corners"
            ),

        "faltas_adversario":
            stats_adv.get(
                "fouls"
            ),

        "passes_adversario":
            stats_adv.get(
                "passes_total"
            ),

        "passes_certos_adversario":
            stats_adv.get(
                "passes_accurate"
            ),

        "amarelos_adversario":
            stats_adv.get(
                "yellow_cards"
            ),

        "vermelhos_adversario":
            stats_adv.get(
                "red_cards"
            )
    }


    resultado.append(
        linha
    )

    print(
        "   OK | stats:",
        "SIM"
        if stats_corinthians
        else "NÃO"
    )

    time.sleep(0.25)


# =========================================================
# DATAFRAME
# =========================================================

df = pd.DataFrame(
    resultado
)

df = df.drop_duplicates(
    subset=["id_jogo"]
)

df["data"] = pd.to_datetime(
    df["data"],
    errors="coerce"
)

df = df.sort_values(
    "data"
)


# =========================================================
# MÉTRICAS PERCENTUAIS
# Valores entre 0 e 1 para o Power BI.
# Ex.: 0.7188 -> formatado no Power BI como 71,88%
# =========================================================

passes_corinthians = df["passes_corinthians"].replace(0, pd.NA)
finalizacoes_corinthians = df["finalizacoes_corinthians"].replace(0, pd.NA)
passes_adversario = df["passes_adversario"].replace(0, pd.NA)
finalizacoes_adversario = df["finalizacoes_adversario"].replace(0, pd.NA)

df[
    "aproveitamento_passes_corinthians"
] = (
    df["passes_certos_corinthians"]
    / passes_corinthians
).round(4)

df[
    "precisao_finalizacao_corinthians"
] = (
    df["chutes_alvo_corinthians"]
    / finalizacoes_corinthians
).round(4)

df[
    "conversao_corinthians"
] = (
    df["gols_corinthians"]
    / finalizacoes_corinthians
).round(4)

# Mesmas métricas para o adversário, úteis para comparação no Power BI.
df[
    "aproveitamento_passes_adversario"
] = (
    df["passes_certos_adversario"]
    / passes_adversario
).round(4)

df[
    "precisao_finalizacao_adversario"
] = (
    df["chutes_alvo_adversario"]
    / finalizacoes_adversario
).round(4)

df[
    "conversao_adversario"
] = (
    df["gols_adversario"]
    / finalizacoes_adversario
).round(4)


# =========================================================
# EXPORTAR
# =========================================================

arquivo = (
    "corinthians_serie_a_2026_todos_jogos.csv"
)

df.to_csv(
    arquivo,
    index=False,
    encoding="utf-8-sig"
)


print("\n" + "=" * 60)
print("FINALIZADO")
print("=" * 60)

print(
    "Jogos encontrados:",
    len(df)
)

print(
    "Jogos encerrados:",
    (
        df["status"]
        == "finished"
    ).sum()
)

print(
    "Jogos com estatísticas:",
    df[
        "finalizacoes_corinthians"
    ].notna().sum()
)

print(
    "Arquivo:",
    arquivo
)