"""Publica a dashboard HTML do Corinthians dentro do Streamlit."""

from __future__ import annotations

import base64
import json
from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components


ROOT = Path(__file__).resolve().parent
DATA_FILE = "corinthians_serie_a_2026_todos_jogos.csv"
DEMO_FILE = "exemplo_demo_corinthians_serie_a_2026.csv"


def read_text(filename: str) -> str:
    return (ROOT / filename).read_text(encoding="utf-8")


def build_dashboard() -> str:
    html = read_text("index.html")
    css = read_text("styles.css")
    javascript = read_text("app.js")
    csv_path = ROOT / DATA_FILE
    csv_text = csv_path.read_text(encoding="utf-8-sig") if csv_path.exists() else ""
    demo_text = read_text(DEMO_FILE)



    tabela_path = ROOT / "tabela_serie_a.csv"
    tabela_text = tabela_path.read_text(encoding="utf-8-sig") if tabela_path.exists() else ""
    logo = base64.b64encode((ROOT / "corinthians-logo.svg").read_bytes()).decode("ascii")
    artilharia_path = ROOT / "artilharia_corinthians.csv"
    artilharia_text = artilharia_path.read_text(encoding="utf-8-sig") if artilharia_path.exists() else ""
    simulacao_path = ROOT / "simulacao_serie_a.csv"
    simulacao_text = simulacao_path.read_text(encoding="utf-8-sig") if simulacao_path.exists() else ""
    posicoes_path = ROOT / "simulacao_posicoes_corinthians.csv"
    posicoes_text = posicoes_path.read_text(encoding="utf-8-sig") if posicoes_path.exists() else ""

    html = html.replace(
        '<link rel="stylesheet" href="styles.css">',
        f"<style>{css}</style>",
    )
    html = html.replace(
        'src="corinthians-logo.svg"',
        f'src="data:image/svg+xml;base64,{logo}"',
    )

    def embed(text: str) -> str:
        return json.dumps(text, ensure_ascii=False).replace("</", "<\\/")

    embedded_script = f"""
      <script>
        window.__CORINTHIANS_CSV__ = {embed(csv_text)};
        window.__CORINTHIANS_DEMO_CSV__ = {embed(demo_text)};
                window.__TABELA_CSV__ = {embed(tabela_text)};
                window.__ARTILHARIA_CSV__ = {embed(artilharia_text)};
                        window.__SIMULACAO_CSV__ = {embed(simulacao_text)};
        window.__SIMULACAO_POS_CSV__ = {embed(posicoes_text)};
        
      </script>
      <script>{javascript}</script>
      <script>
        (() => {{
          let lastHeight = 0;
          const syncHeight = () => {{
            const height = Math.max(
              document.body.scrollHeight,
              document.documentElement.scrollHeight
            );
            if (height === lastHeight) return;
            lastHeight = height;
            window.parent.postMessage({{
              isStreamlitMessage: true,
              type: "streamlit:setFrameHeight",
              height
            }}, "*");
          }};
          window.addEventListener("load", syncHeight);
          window.addEventListener("resize", syncHeight);
          new ResizeObserver(syncHeight).observe(document.body);
          setTimeout(syncHeight, 200);
          setTimeout(syncHeight, 900);
        }})();
      </script>
    """
    return html.replace('<script src="app.js"></script>', embedded_script)


st.set_page_config(
    page_title="Corinthians | Painel de desempenho",
    page_icon="⚫",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    """
    <style>
      .stApp { background: #f5f5f3; }
      .block-container { max-width: 1536px; padding: 0 !important; }
      [data-testid="stHeader"], [data-testid="stToolbar"] { display: none; }
      iframe { display: block; }
    </style>
    """,
    unsafe_allow_html=True,
)

st.iframe(build_dashboard(), width='stretch', height='content')
