// Os jogos são carregados do CSV gerado por coleta_detalhada.py (ver loadCsv, no fim do arquivo).
let matches = [];
let usingDemoData = false;

const TEAM_NAME = 'Corinthians';
const HOME_GROUND = 'Neo Química Arena';
const TOTAL_ROUNDS = 38;
const ACCENT = '#111111';
const DATA_FILE = 'corinthians_serie_a_2026_todos_jogos.csv';
const DEMO_FILE = 'exemplo_demo_corinthians_serie_a_2026.csv';

const $ = (id) => document.getElementById(id);
const pct = (n) => `${n.toLocaleString('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1})}%`;
const decimal = (n) => n.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
const formatDate = (date) => new Intl.DateTimeFormat('pt-BR', {day: '2-digit', month: 'short'}).format(new Date(`${date}T12:00:00`)).replace('.', '');
let activeFilter = 'Todos';
// Referências da Série A (pontos corridos, 20 clubes, 38 rodadas).
const MODEL_LIMITS = {relegation: 44, libertadores: 60, title: 75};

function summarize(list) {
  const wins = list.filter(m => m.result === 'V').length;
  const draws = list.filter(m => m.result === 'E').length;
  const losses = list.filter(m => m.result === 'D').length;
  const points = list.reduce((sum, m) => sum + m.points, 0);
  const gf = list.reduce((sum, m) => sum + m.gf, 0);
  const ga = list.reduce((sum, m) => sum + m.ga, 0);
  const max = list.length * 3;
  return { games: list.length, wins, draws, losses, points, gf, ga, max, efficiency: max ? points / max * 100 : 0, ppg: list.length ? points / list.length : 0 };
}

function renderSummary(list) {
  const s = summarize(list);
  $('headerGames').textContent = `${matches.length} de ${TOTAL_ROUNDS}`;
  $('headerStartDate').textContent = formatDate(matches[0].date);
  $('headerEndDate').textContent = formatDate(matches.at(-1).date);
  $('kpiEfficiency').textContent = pct(s.efficiency);
  $('efficiencyMeter').style.width = `${s.efficiency}%`;
  $('efficiencyDetail').textContent = `${s.points} de ${s.max} pontos possíveis`;
  $('kpiWins').textContent = s.wins;
  $('kpiDraws').textContent = s.draws;
  $('kpiLosses').textContent = s.losses;
  $('kpiPpg').textContent = decimal(s.ppg);
  $('ppgMeter').style.width = `${Math.min(s.ppg / 3 * 100, 100)}%`;
  $('kpiGoalDiff').textContent = `${s.gf - s.ga > 0 ? '+' : ''}${s.gf - s.ga}`;
  $('goalsFor').textContent = s.gf;
  $('goalsAgainst').textContent = s.ga;
  $('winsCount').textContent = s.wins;
  $('drawsCount').textContent = s.draws;
  $('lossesCount').textContent = s.losses;
  $('donutEfficiency').textContent = pct(s.efficiency);
  $('winsPercent').textContent = pct(s.games ? s.wins / s.games * 100 : 0);
  $('drawsPercent').textContent = pct(s.games ? s.draws / s.games * 100 : 0);
  $('lossesPercent').textContent = pct(s.games ? s.losses / s.games * 100 : 0);
  $('winRate').textContent = pct(s.games ? s.wins / s.games * 100 : 0);
  $('nonLossRate').textContent = pct(s.games ? (s.wins + s.draws) / s.games * 100 : 0);
  const winDeg = s.games ? s.wins / s.games * 360 : 0;
  const drawDeg = s.games ? s.draws / s.games * 360 : 0;
  $('resultDonut').style.background = `conic-gradient(var(--red) 0 ${winDeg}deg, var(--gold) ${winDeg}deg ${winDeg + drawDeg}deg, #b9b6b0 ${winDeg + drawDeg}deg 360deg)`;
  $('filterContext').textContent = activeFilter === 'Todos' ? 'Visão geral da campanha' : `${s.games} partidas como ${activeFilter === 'Casa' ? 'mandante' : 'visitante'}`;
}

function axisRounds(total) {
  const marks = [1];
  for (let r = 5; r < total; r += 5) marks.push(r);
  if (total > 1 && marks.at(-1) !== total) marks.push(total);
  return marks.filter((r, i) => i === 0 || total - r >= 2 || r === total);
}

function renderChart(list) {
  if (!list.length) return;
  const w = 700, h = 285, pad = {l: 36, r: 16, t: 18, b: 32};
  let acc = 0;
  const points = list.map(m => ({x: m.round, y: (acc += m.points)}));
  const maxY = Math.max(45, Math.ceil(points.at(-1).y / 10) * 10);
  const xAt = (round) => pad.l + (round - 1) / Math.max(matches.length - 1, 1) * (w - pad.l - pad.r);
  const yAt = (value) => h - pad.b - value / maxY * (h - pad.t - pad.b);
  const actualPath = points.map((p, i) => `${i ? 'L' : 'M'} ${xAt(p.x).toFixed(1)} ${yAt(p.y).toFixed(1)}`).join(' ');
  const pacePath = `M ${xAt(1)} ${yAt(1.5)} L ${xAt(matches.length)} ${yAt(matches.length * 1.5)}`;
  const grid = [0, .25, .5, .75, 1].map(f => {
    const y = yAt(maxY * f), val = Math.round(maxY * f);
    return `<line x1="${pad.l}" y1="${y}" x2="${w-pad.r}" y2="${y}" stroke="#e4ded4" stroke-width="1"/><text x="0" y="${y+4}" fill="#89847c" font-size="10">${val}</text>`;
  }).join('');
  const area = `${actualPath} L ${xAt(points.at(-1).x)} ${h-pad.b} L ${xAt(points[0].x)} ${h-pad.b} Z`;
  $('pointsChart').innerHTML = `<svg viewBox="0 0 ${w} ${h}" aria-hidden="true">
    <defs><linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ACCENT}" stop-opacity=".16"/><stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/></linearGradient></defs>
    ${grid}<path d="${pacePath}" fill="none" stroke="#a9a39a" stroke-width="2" stroke-dasharray="6 7"/>
    <path d="${area}" fill="url(#areaFill)"/><path d="${actualPath}" fill="none" stroke="${ACCENT}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    ${points.map((p,i) => `<circle cx="${xAt(p.x)}" cy="${yAt(p.y)}" r="${i===points.length-1?5:2.4}" fill="${i===points.length-1?'#fff':ACCENT}" stroke="${ACCENT}" stroke-width="${i===points.length-1?3:0}"><title>Rodada ${p.x}: ${p.y} pontos</title></circle>`).join('')}
    ${axisRounds(matches.length).map(r => `<text x="${xAt(r)}" y="${h-7}" text-anchor="middle" fill="#89847c" font-size="10">R${r}</text>`).join('')}
    <g transform="translate(${xAt(points.at(-1).x)-45},${yAt(points.at(-1).y)+9})"><rect width="51" height="26" rx="8" fill="${ACCENT}"/><text x="25.5" y="17" fill="white" text-anchor="middle" font-size="11" font-weight="800">${points.at(-1).y} pts</text></g>
    <g transform="translate(${xAt(matches.length)-111},${yAt(matches.length*1.5)-33})"><rect width="59" height="22" rx="7" fill="#fff" stroke="#aaa6a0"/><text x="29.5" y="15" fill="#77736d" text-anchor="middle" font-size="9" font-weight="700">${matches.length*1.5} pts</text></g>
  </svg>`;
  const full = summarize(matches);
  const pacePoints = matches.length * 1.5;
  const delta = full.points - pacePoints;
  $('chartCurrentPoints').textContent = `${full.points} pts`;
  $('chartPacePoints').textContent = `${pacePoints.toLocaleString('pt-BR')} pts`;
  $('chartGap').textContent = `${delta > 0 ? '+' : ''}${delta.toLocaleString('pt-BR')} pts`;
  $('chartGapCard').classList.toggle('positive', delta >= 0);
  $('chartInsight').innerHTML = `Após ${matches.length} rodadas, o Corinthians está <b>${Math.abs(delta).toLocaleString('pt-BR')} ponto${Math.abs(delta) === 1 ? '' : 's'} ${delta >= 0 ? 'acima' : 'abaixo'}</b> do ritmo de 50% de aproveitamento.`;
}

function renderForm(list) {
  const recent = list.slice(-5);
  $('recentForm').innerHTML = recent.map(m => `<i class="${m.result}" title="${m.opponent}: ${m.gf} x ${m.ga}">${m.result}</i>`).join('');
  const points = recent.reduce((s,m) => s + m.points, 0);
  $('recentPoints').textContent = `${points}/${recent.length * 3} pts`;
}

function renderVenue() {
  const home = summarize(matches.filter(m => m.venue === 'Casa'));
  const away = summarize(matches.filter(m => m.venue === 'Fora'));
  const card = (name, subtitle, icon, s, cls='') => {
    const goalDiff = s.gf - s.ga;
    return `<article class="venue-card ${cls}">
      <div class="venue-card-head"><div><i>${icon}</i><span><b>${name}</b><small>${subtitle}</small></span></div><strong>${pct(s.efficiency)}</strong></div>
      <div class="venue-progress"><i style="width:${s.efficiency}%"></i></div>
      <div class="venue-stats">
        <div><span>Pontos</span><b>${s.points}</b></div>
        <div><span>Por jogo</span><b>${decimal(s.ppg)}</b></div>
        <div><span>Saldo</span><b>${goalDiff > 0 ? '+' : ''}${goalDiff}</b></div>
      </div>
      <div class="venue-record"><span><b>${s.wins}</b> vitórias</span><span><b>${s.draws}</b> empates</span><span><b>${s.losses}</b> derrotas</span></div>
    </article>`;
  };
  const totalPoints = home.points + away.points;
  const homeShare = totalPoints ? home.points / totalPoints * 100 : 0;
  const awayShare = 100 - homeShare;
  $('venueComparison').innerHTML = `
    <div class="venue-cards">${card('Em casa', `Na ${HOME_GROUND}`, 'C', home)}${card('Como visitante', 'Longe de Itaquera', 'F', away, 'away')}</div>
    <div class="venue-deep-dive">
      <div class="points-origin">
        <div class="venue-detail-head"><span>ORIGEM DOS ${totalPoints} PONTOS</span><b>${pct(homeShare)} em casa</b></div>
        <div class="split-points"><i style="width:${homeShare}%"></i><i style="width:${awayShare}%"></i></div>
        <div class="split-labels"><span><b>${home.points}</b> casa</span><span><b>${away.points}</b> fora</span></div>
      </div>
      <div class="goal-balance">
        <div class="venue-detail-head"><span>BALANÇO DE GOLS</span><b>${home.gf + away.gf} marcados</b></div>
        <div class="goal-balance-rows">
          <span><i class="home-dot"></i>Casa <b>${home.gf} pró · ${home.ga} contra</b></span>
          <span><i></i>Fora <b>${away.gf} pró · ${away.ga} contra</b></span>
        </div>
      </div>
    </div>`;
  const better = home.efficiency >= away.efficiency ? ['em casa', home, away] : ['fora de casa', away, home];
  $('venueInsight').innerHTML = `<span>LEITURA DO MANDO</span><p>O Corinthians rende melhor <b>${better[0]}</b>: são <strong>${pct(Math.abs(better[1].efficiency - better[2].efficiency))}</strong> pontos percentuais de diferença.</p>`;
}

function renderProjection() {
  const s = summarize(matches);
  const remaining = TOTAL_ROUNDS - s.games;
  const projected = Math.round(s.ppg * TOTAL_ROUNDS);
  $('projectedPoints').textContent = `${projected} pts`;
  $('projectionCopy').innerHTML = `Mantendo a média atual de <b>${decimal(s.ppg)} ponto por jogo</b>, a projeção é terminar as 38 rodadas com aproximadamente <b>${projected} pontos</b>. Restam ${remaining} partidas.`;
  $('remainingFixtures').innerHTML = getRemainingFixtures().map(fixture => `<span class="fixture-chip"><b>${fixture.venue === 'Casa' ? 'C' : 'F'}</b> ${fixture.opponent}</span>`).join('');
  updateScenario();
}

function getRemainingFixtures() {
  const fixtures = [];
  for (let round = matches.length + 1; round <= TOTAL_ROUNDS; round++) {
    if (round > 19) {
      const firstLeg = matches[round - 20];
      if (firstLeg) fixtures.push({
        round,
        opponent: firstLeg.opponent,
        venue: firstLeg.venue === 'Casa' ? 'Fora' : 'Casa'
      });
    }
  }
  return fixtures;
}

function factorial(n) {
  let value = 1;
  for (let i = 2; i <= n; i++) value *= i;
  return value;
}

function rising(value, n) {
  let result = 1;
  for (let i = 0; i < n; i++) result *= value + i;
  return result;
}

function predictivePointsDistribution(games, summary) {
  const alpha = [summary.wins + .5, summary.draws + .5, summary.losses + .5];
  const alphaTotal = alpha.reduce((sum, value) => sum + value, 0);
  const distribution = new Map();
  for (let wins = 0; wins <= games; wins++) {
    for (let draws = 0; draws <= games - wins; draws++) {
      const losses = games - wins - draws;
      const arrangements = factorial(games) / factorial(wins) / factorial(draws) / factorial(losses);
      const probability = arrangements
        * rising(alpha[0], wins) * rising(alpha[1], draws) * rising(alpha[2], losses)
        / rising(alphaTotal, games);
      const points = wins * 3 + draws;
      distribution.set(points, (distribution.get(points) || 0) + probability);
    }
  }
  return distribution;
}

function buildFinishDistribution() {
  const current = summarize(matches).points;
  const fixtures = getRemainingFixtures();
  const homeGames = fixtures.filter(f => f.venue === 'Casa').length;
  const awayGames = fixtures.length - homeGames;
  const home = predictivePointsDistribution(homeGames, summarize(matches.filter(m => m.venue === 'Casa')));
  const away = predictivePointsDistribution(awayGames, summarize(matches.filter(m => m.venue === 'Fora')));
  const final = new Map();
  for (const [homePoints, homeProbability] of home) {
    for (const [awayPoints, awayProbability] of away) {
      const total = current + homePoints + awayPoints;
      final.set(total, (final.get(total) || 0) + homeProbability * awayProbability);
    }
  }
  return final;
}

function distributionProbability(distribution, predicate) {
  return [...distribution].reduce((sum, [points, probability]) => sum + (predicate(points) ? probability : 0), 0);
}

function distributionQuantile(distribution, target) {
  let cumulative = 0;
  for (const [points, probability] of [...distribution].sort((a, b) => a[0] - b[0])) {
    cumulative += probability;
    if (cumulative >= target) return points;
  }
  return Math.max(...distribution.keys());
}

function modelPercent(probability) {
  const value = probability * 100;
  if (value > 0 && value < .1) return '<0,1%';
  return pct(value);
}

function probabilityTag(probability, labels) {
  if (probability >= .6) return labels[0];
  if (probability >= .25) return labels[1];
  if (probability >= .05) return labels[2];
  return labels[3];
}

function renderProbabilities() {
  const distribution = buildFinishDistribution();
  const remainingGames = getRemainingFixtures().length;
  const available = remainingGames * 3;
  const relegation = distributionProbability(distribution, points => points <= MODEL_LIMITS.relegation);
  const libertadores = distributionProbability(distribution, points => points >= MODEL_LIMITS.libertadores);
  const title = distributionProbability(distribution, points => points >= MODEL_LIMITS.title);
  const q10 = distributionQuantile(distribution, .10);
  const median = distributionQuantile(distribution, .50);
  const q90 = distributionQuantile(distribution, .90);
  const currentPoints = summarize(matches).points;
  const titleNeeded = Math.max(0, MODEL_LIMITS.title - currentPoints);
  const libertadoresNeeded = Math.max(0, MODEL_LIMITS.libertadores - currentPoints);
  const safetyNeeded = Math.max(0, MODEL_LIMITS.relegation + 1 - currentPoints);
  const needText = (needed) => needed > available
    ? `São necessários <b>${needed} pontos</b>, mais do que os ${available} ainda em disputa.`
    : needed === 0 ? 'A pontuação de referência <b>já foi alcançada</b>.'
    : `São necessários <b>${needed} dos ${available} pontos</b> ainda disponíveis.`;

  $('probabilityTitle').textContent = remainingGames
    ? (remainingGames === 1 ? 'A última rodada' : `As ${remainingGames} rodadas finais`)
    : 'Campanha encerrada';

  $('titleProbability').textContent = modelPercent(title);
  $('libertadoresProbability').textContent = modelPercent(libertadores);
  $('relegationProbability').textContent = modelPercent(relegation);
  $('titleTag').textContent = probabilityTag(title, ['FAVORITO', 'NA BRIGA', 'LONGE', 'MUITO DIFÍCIL']);
  $('libertadoresTag').textContent = probabilityTag(libertadores, ['PROVÁVEL', 'POSSÍVEL', 'DESAFIO ALTO', 'MUITO DIFÍCIL']);
  $('relegationTag').textContent = probabilityTag(relegation, ['RISCO ALTO', 'RISCO REAL', 'ATENÇÃO', 'RISCO BAIXO']);
  $('titleTarget').textContent = `${MODEL_LIMITS.title} pts`;
  $('libertadoresTarget').textContent = `${MODEL_LIMITS.libertadores} pts`;
  $('titlePointsNeeded').textContent = `${titleNeeded} pts`;
  $('libertadoresPointsNeeded').textContent = `${libertadoresNeeded} pts`;
  $('survivalProbability').textContent = modelPercent(1 - relegation);
  $('safetyPointsNeeded').textContent = `${safetyNeeded} pts`;
  $('titleBar').style.width = `${Math.max(title * 100, .5)}%`;
  $('libertadoresBar').style.width = `${Math.max(libertadores * 100, .5)}%`;
  $('relegationBar').style.width = `${Math.max(relegation * 100, .5)}%`;
  $('titleDetail').innerHTML = needText(titleNeeded);
  $('libertadoresDetail').innerHTML = needText(libertadoresNeeded);
  $('relegationDetail').innerHTML = safetyNeeded
    ? `Com mais <b>${safetyNeeded} ponto${safetyNeeded === 1 ? '' : 's'}</b>, o time chega a ${MODEL_LIMITS.relegation + 1}, acima da faixa conservadora de risco.`
    : `O time já passou dos <b>${MODEL_LIMITS.relegation + 1} pontos</b>, acima da faixa conservadora de risco.`;
  $('likelyRange').textContent = `${q10}–${q90} pontos`;
  $('rangeLow').textContent = q10;
  $('rangeMedian').textContent = median;
  $('rangeHigh').textContent = q90;
  $('modelSummary').innerHTML = `Em 80% dos cenários, a campanha termina nessa faixa. O centro da projeção é <b>${median} pontos</b>.`;
}

function longestSequence(predicate) {
  let longest = 0, current = 0;
  matches.forEach(match => {
    current = predicate(match) ? current + 1 : 0;
    longest = Math.max(longest, current);
  });
  return longest;
}

function renderPerformance() {
  $('gameStrip').innerHTML = matches.map(match => `<div class="game-tile ${match.result}" title="R${match.round} · ${match.opponent} · ${match.gf} x ${match.ga}">
    <span>R${String(match.round).padStart(2, '0')}</span><strong>${match.result}</strong>
  </div>`).join('');

  const periods = [
    {label: 'Rodadas 1–10', list: matches.slice(0, 10)},
    {label: 'Rodadas 11–20', list: matches.slice(10, 20)},
    {label: `Rodadas 21–${matches.length}`, list: matches.slice(20)}
  ].filter(period => period.list.length);
  const periodData = periods.map(period => ({...period, summary: summarize(period.list)}));
  const best = Math.max(...periodData.map(period => period.summary.efficiency));
  $('periodGrid').innerHTML = periodData.map(period => `<div class="period-card ${period.summary.efficiency === best ? 'best' : ''}">
    <span>${period.label}</span><strong>${pct(period.summary.efficiency)}</strong>
    <div class="period-meter"><i style="width:${period.summary.efficiency}%"></i></div>
    <small>${period.summary.points} pontos · ${period.summary.wins}V ${period.summary.draws}E ${period.summary.losses}D</small>
  </div>`).join('');

  const cleanSheets = matches.filter(match => match.ga === 0).length;
  const recent = summarize(matches.slice(-5));
  const unbeatenRun = longestSequence(match => match.result !== 'D');
  const winningRun = longestSequence(match => match.result === 'V');
  const items = [
    {value: unbeatenRun, unit: unbeatenRun === 1 ? 'jogo' : 'jogos', eyebrow: 'REGULARIDADE', title: 'Maior sequência invicta', note: 'sem derrotas consecutivas', tone: 'red'},
    {value: winningRun, unit: winningRun === 1 ? 'jogo' : 'jogos', eyebrow: 'VITÓRIAS', title: 'Maior sequência de vitórias', note: 'vitórias consecutivas', tone: 'green'},
    {value: cleanSheets, unit: `de ${matches.length} jogos`, eyebrow: 'SOLIDEZ DEFENSIVA', title: 'Jogos sem sofrer gol', note: `${pct(cleanSheets / matches.length * 100)} das partidas`, tone: 'dark'},
    {value: recent.points, unit: 'de 15 pontos', eyebrow: 'MOMENTO RECENTE', title: 'Últimos 5 jogos', note: `${pct(recent.efficiency)} de aproveitamento`, tone: 'gold'}
  ];
  $('streakGrid').innerHTML = items.map(item => `<div class="streak-item ${item.tone}">
    <span class="streak-eyebrow">${item.eyebrow}</span>
    <div class="streak-value"><b>${item.value}</b><small>${item.unit}</small></div>
    <strong>${item.title}</strong>
    <p>${item.note}</p>
  </div>`).join('');
}

function updateScenario() {
  const target = Number($('targetPoints').value);
  const current = summarize(matches).points;
  const remaining = TOTAL_ROUNDS - matches.length;
  const needed = Math.max(0, target - current);
  const wins = Math.ceil(needed / 3);
  $('targetOutput').textContent = target;
  if (needed > remaining * 3) {
    $('scenarioText').innerHTML = `A meta exige <b>${needed} pontos</b>, acima dos ${remaining * 3} ainda disponíveis.`;
  } else if (!needed) {
    $('scenarioText').innerHTML = `Meta já alcançada: o Corinthians tem <b>${current} pontos</b>.`;
  } else {
    const restPoints = wins * 3 - needed;
    const detail = restPoints ? `${wins - 1} vitórias e ${3 - restPoints} empate${3-restPoints===1?'':'s'}` : `${wins} vitória${wins===1?'':'s'}`;
    $('scenarioText').innerHTML = `Faltam <b>${needed} pontos</b>. Um caminho mínimo: <b>${detail}</b> nos ${remaining} jogos restantes.`;
  }
}

function resultPoints(gf, ga) {
  return gf > ga ? 3 : gf === ga ? 1 : 0;
}
function signedNumber(value) {
  return (value > 0 ? '+' : '') + value;
}
function setHalfBalance(id, value) {
  const element = $(id);
  element.textContent = signedNumber(value) + ' saldo';
  element.classList.toggle('positive', value > 0);
  element.classList.toggle('negative', value < 0);
}
function renderHalves(list) {
  const valid = list.filter(m => [m.htGf, m.htGa, m.shGf, m.shGa].every(Number.isFinite));
  if (!valid.length) {
    $('halvesInsight').textContent = 'Os placares de intervalo não estão disponíveis para este recorte.';
    return;
  }
  const totals = valid.reduce((acc, match) => {
    acc.htGf += match.htGf;
    acc.htGa += match.htGa;
    acc.shGf += match.shGf;
    acc.shGa += match.shGa;
    acc.htPoints += resultPoints(match.htGf, match.htGa);
    acc.finalPoints += resultPoints(match.gf, match.ga);
    const before = resultPoints(match.htGf, match.htGa);
    const after = resultPoints(match.gf, match.ga);
    if (after > before) acc.improved += 1;
    if (after < before) acc.worsened += 1;
    return acc;
  }, {htGf: 0, htGa: 0, shGf: 0, shGa: 0, htPoints: 0, finalPoints: 0, improved: 0, worsened: 0});

  const totalScored = totals.htGf + totals.shGf;
  const maxGoals = Math.max(totals.htGf, totals.htGa, totals.shGf, totals.shGa, 1);
  const firstBalance = totals.htGf - totals.htGa;
  const secondBalance = totals.shGf - totals.shGa;
  const pointsSwing = totals.finalPoints - totals.htPoints;
  const unchanged = valid.length - totals.improved - totals.worsened;
  const gameCount = value => value + (value === 1 ? ' jogo' : ' jogos');
  const improvedText = gameCount(totals.improved) + (totals.improved === 1 ? ' melhorou' : ' melhoraram');
  const worsenedText = gameCount(totals.worsened) + (totals.worsened === 1 ? ' piorou' : ' pioraram');
  const unchangedText = gameCount(unchanged) + (unchanged === 1 ? ' manteve' : ' mantiveram');
  const pointsSwingText = signedNumber(pointsSwing) + (Math.abs(pointsSwing) === 1 ? ' ponto' : ' pontos');
  const productive = totals.htGf === totals.shGf ? 'Equilibrado' : totals.htGf > totals.shGf ? '1º tempo' : '2º tempo';
  const vulnerable = totals.htGa === totals.shGa ? 'Equilibrado' : totals.htGa > totals.shGa ? '1º tempo' : '2º tempo';

  $('firstHalfFor').textContent = totals.htGf;
  $('firstHalfAgainst').textContent = totals.htGa;
  $('secondHalfFor').textContent = totals.shGf;
  $('secondHalfAgainst').textContent = totals.shGa;
  $('firstHalfShare').textContent = pct(totalScored ? totals.htGf / totalScored * 100 : 0);
  $('secondHalfShare').textContent = pct(totalScored ? totals.shGf / totalScored * 100 : 0);
  setHalfBalance('firstHalfBalance', firstBalance);
  setHalfBalance('secondHalfBalance', secondBalance);
  $('firstForBar').style.width = (totals.htGf / maxGoals * 100) + '%';
  $('firstAgainstBar').style.width = (totals.htGa / maxGoals * 100) + '%';
  $('secondForBar').style.width = (totals.shGf / maxGoals * 100) + '%';
  $('secondAgainstBar').style.width = (totals.shGa / maxGoals * 100) + '%';
  $('productiveHalf').textContent = productive;
  $('vulnerableHalf').textContent = vulnerable;
  $('improvedResults').innerHTML = '<em class="change-up">' + improvedText + '</em>' +
    '<i>•</i><em class="change-down">' + worsenedText + '</em>';
  $('unchangedResults').textContent = unchangedText + ' o mesmo resultado';
  $('pointsSwing').textContent = pointsSwingText;

  $('halvesInsight').innerHTML = 'Em <b>' + gameCount(totals.improved) + '</b>, o Corinthians terminou melhor do que estava no intervalo; ' +
    'em <b>' + gameCount(totals.worsened) + '</b>, terminou pior; e em <b>' + gameCount(unchanged) + '</b>, manteve a mesma situação. ' +
    'O saldo dessas mudanças foi de <b>' + pointsSwingText + '</b>.';
}
function renderTable(list) {
  let accumulated = 0;
  const accumulatedByRound = new Map(matches.map(m => [m.round, (accumulated += m.points)]));
  const term = $('matchSearch').value.trim().toLocaleLowerCase('pt-BR');
  const visible = list.filter(m => m.opponent.toLocaleLowerCase('pt-BR').includes(term));
  const resultName = {V: 'Vitória', E: 'Empate', D: 'Derrota'};
  $('matchesBody').innerHTML = visible.map(m => `<tr class="row-${m.result}">
    <td><span class="round-number">${String(m.round).padStart(2,'0')}</span></td><td class="date-cell">${formatDate(m.date)}</td>
    <td><div class="fixture"><span>${TEAM_NAME}</span><strong>${m.gf} <i>×</i> ${m.ga}</strong><span>${m.opponent}</span></div></td>
    <td><span class="venue-tag ${m.venue.toLowerCase()}">${m.venue}</span></td>
    <td><div class="result-cell"><span class="badge ${m.result}">${m.result}</span><b>${resultName[m.result]}</b></div></td>
    <td><span class="points-pill ${m.result}">+${m.points}</span></td>
    <td><div class="accumulated"><b>${accumulatedByRound.get(m.round)}</b><span>pts</span></div></td>
  </tr>`).join('');
  $('emptyState').hidden = visible.length > 0;
}

function applyFilter(filter) {
  activeFilter = filter;
  const list = filter === 'Todos' ? matches : matches.filter(m => m.venue === filter);
  renderSummary(list);
  renderForm(list);
  renderHalves(list);
  renderTable(list);
}

document.querySelectorAll('#venueFilter button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('#venueFilter button').forEach(b => b.classList.remove('active'));
  button.classList.add('active');
  applyFilter(button.dataset.filter);
}));
$('targetPoints').addEventListener('input', updateScenario);
$('matchSearch').addEventListener('input', () => applyFilter(activeFilter));

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"' && quoted && text[i + 1] === '"') { field += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some(value => value !== '')) rows.push(row);
      row = [];
    } else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift().map(header => header.trim());
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}

function toMatches(csvText) {
  const records = parseCsv(csvText).filter(row => row.status === 'finished' && ['V','E','D'].includes(row.resultado));
  records.sort((x, y) => x.data.localeCompare(y.data));
  const num = (value) => value === '' || value == null ? NaN : Number(value);
  return records.map((row, index) => ({
    round: index + 1,
    date: row.data.slice(0, 10),
    opponent: row.adversario,
    venue: row.mando,
    gf: Number(row.gols_corinthians),
    ga: Number(row.gols_adversario),
    htGf: num(row.gols_1t_corinthians),
    htGa: num(row.gols_1t_adversario),
    shGf: num(row.gols_2t_corinthians),
    shGa: num(row.gols_2t_adversario),
    result: row.resultado,
    points: row.resultado === 'V' ? 3 : row.resultado === 'E' ? 1 : 0
  }));
}

async function fetchText(file) {
  try {
    const response = await fetch(file, {cache: 'no-store'});
    
    return response.ok ? await response.text() : '';
  } catch (_) {
    return '';
  }
}

async function loadCsv() {
  // 1) Dados incorporados pelo Streamlit; 2) CSV real; 3) CSV de demonstração.
  let csvText = window.__CORINTHIANS_CSV__ || await fetchText(DATA_FILE);
  matches = csvText ? toMatches(csvText) : [];
  usingDemoData = Boolean(window.__CORINTHIANS_DEMO__);
  if (!matches.length) {
    const demoText = window.__CORINTHIANS_DEMO_CSV__ || await fetchText(DEMO_FILE);
    matches = demoText ? toMatches(demoText) : [];
    usingDemoData = matches.length > 0;
  }
}

function renderAll() {
  $('demoBanner').hidden = !usingDemoData;
  $('footerSource').textContent = usingDemoData ? 'Fonte: dados fictícios de demonstração' : 'Fonte: base local de jogos';
  if (!matches.length) {
    $('filterContext').textContent = 'Nenhum jogo encerrado encontrado. Execute coleta_detalhada.py para gerar a base.';
    return;
  }
  applyFilter('Todos');
  renderChart(matches);
  renderVenue();
  renderProjection();
  renderProbabilities();
  renderPerformance();
}

$('modelInfoButton').addEventListener('click', () => {
  const explanation = $('modelExplanation');
  explanation.hidden = !explanation.hidden;
  $('modelInfoButton').textContent = explanation.hidden ? 'Como calculamos?' : 'Ocultar metodologia';
});

// ===== Classificação (tabela_serie_a.csv) =====
const STANDINGS_FILE = 'tabela_serie_a.csv';
const TEAM_ID = 1779;   // Corinthians na football-data.org
const Z4_START = 17;    // 17º colocado abre a zona de rebaixamento
const G6_END = 6;       // 6º colocado fecha a faixa do G6
let standings = [];

async function loadStandings() {
  const text = window.__TABELA_CSV__ || await fetchText(STANDINGS_FILE);
  if (!text) return;
  standings = parseCsv(text).map(row => ({
    pos: Number(row.posicao),
    id: Number(row.time_id),
    team: row.time,
    crest: row.escudo,
    games: Number(row.jogos),
    pts: Number(row.pontos),
    w: Number(row.vitorias),
    d: Number(row.empates),
    l: Number(row.derrotas),
    gd: Number(row.saldo_gols),
    form: row.forma ? row.forma.split(',') : [],
    updated: row.atualizado_em
  })).sort((a, b) => a.pos - b.pos);
}

function pointsText(value) {
  return `${value} ponto${Math.abs(value) === 1 ? '' : 's'}`;
}

function renderStandings() {
  const me = standings.find(team => team.id === TEAM_ID);
  if (usingDemoData || !me) return;   // sem tabela real, a seção continua escondida
  $('classificacao').hidden = false;

  const z4 = standings.find(team => team.pos === Z4_START);
  const safe = standings.find(team => team.pos === Z4_START - 1);
  const g6 = standings.find(team => team.pos === G6_END);

  $('standingsUpdated').textContent = `Classificação oficial da Série A, atualizada em ${formatDate(me.updated)}.`;
  $('standingsPosition').textContent = `${me.pos}º`;
  $('standingsPositionDetail').textContent = `${me.pts} pontos em ${me.games} jogos · saldo ${me.gd > 0 ? '+' : ''}${me.gd}`;

  if (me.pos < Z4_START) {
    const gap = me.pts - z4.pts;
    $('standingsZ4').textContent = `+${gap} pts`;
    $('standingsZ4Detail').textContent = `Acima do ${z4.team} (${z4.pos}º, ${z4.pts} pts), o primeiro time do Z4.`;
  } else {
    const gap = safe.pts - me.pts;
    $('standingsZ4').textContent = 'No Z4';
    $('standingsZ4Detail').textContent = `Precisa de ${pointsText(gap)} para alcançar o ${safe.team} (${safe.pos}º).`;
  }

  if (me.pos > G6_END) {
    const gap = g6.pts - me.pts;
    $('standingsG6').textContent = `−${gap} pts`;
    $('standingsG6Detail').textContent = `Atrás do ${g6.team} (${g6.pos}º, ${g6.pts} pts), o último time do G6.`;
  } else {
    $('standingsG6').textContent = 'No G6';
    $('standingsG6Detail').textContent = `Dentro da faixa do G6 (até o ${G6_END}º lugar).`;
  }

  // Rivais logo abaixo que têm jogos a menos e podem ultrapassar o Corinthians
  const threats = standings.filter(team =>
    team.pos > me.pos && team.games < me.games && team.pts + 3 * (me.games - team.games) >= me.pts
  );
  $('standingsAlert').hidden = threats.length === 0;
  $('standingsAlert').textContent = threats.length
    ? `Atenção: ${threats.map(t => `${t.team} (${t.pts} pts, ${me.games - t.games} jogo${me.games - t.games === 1 ? '' : 's'} a menos)`).join(', ')} pode${threats.length === 1 ? '' : 'm'} ultrapassar o Corinthians só com os jogos atrasados.`
    : '';

  // Tabela: 2 posições acima do Corinthians até o 18º (ou 2 abaixo, o que vier depois)
  const first = Math.max(1, me.pos - 2);
  const last = Math.min(standings.length, Math.max(Z4_START + 1, me.pos + 2));
  const formLabel = {W: 'V', D: 'E', L: 'D'};
  $('standingsRows').innerHTML = standings
    .filter(team => team.pos >= first && team.pos <= last)
    .map(team => {
      const classes = [
        team.id === TEAM_ID ? 'is-team' : '',
        team.pos >= Z4_START ? 'is-z4' : '',
        team.pos === Z4_START ? 'z4-line' : ''
      ].join(' ');
      const dots = team.form.map(r => `<i class="${formLabel[r]}">${formLabel[r]}</i>`).join('');
      return `<tr class="${classes}">
        <td>${team.pos}</td>
        <td><span class="standings-team"><img src="${team.crest}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">${team.team}</span></td>
        <td>${team.games}</td>
        <td>${team.w}-${team.d}-${team.l}</td>
        <td>${team.gd > 0 ? '+' : ''}${team.gd}</td>
        <td><b>${team.pts}</b></td>
        <td><span class="form-dots">${dots}</span></td>
      </tr>`;
    }).join('');
}

// ===== Jogadores (artilharia_corinthians.csv) =====
const PLAYERS_FILE = 'artilharia_corinthians.csv';
let players = [];

async function loadPlayers() {
  const text = window.__ARTILHARIA_CSV__ || await fetchText(PLAYERS_FILE);
  if (!text) return;
  players = parseCsv(text).map(row => ({
    name: row.jogador,
    games: row.jogos,
    goals: Number(row.gols),
    assists: Number(row.assistencias),
    total: Number(row.participacoes),
    updated: row.atualizado_em
  }));
}

function renderPlayers() {
  if (usingDemoData || !players.length) return;
  $('jogadores').hidden = false;

  const byGoals = [...players].sort((a, b) => b.goals - a.goals || b.assists - a.assists)[0];
  const byAssists = [...players].sort((a, b) => b.assists - a.assists || b.goals - a.goals)[0];
  const listedGoals = players.reduce((sum, p) => sum + p.goals, 0);
  const teamGoals = summarize(matches).gf;

  $('playersNote').textContent = `Jogadores do Corinthians entre os 100 principais artilheiros da Série A. Atualizado em ${formatDate(players[0].updated)}.`;
  $('topScorer').textContent = byGoals.name;
  $('topScorer').className = 'player-name';
  const tied = players.filter(p => p.goals === byGoals.goals).length - 1;
  $('topScorerDetail').textContent = `${byGoals.goals} gol${byGoals.goals === 1 ? '' : 's'} e ${byGoals.assists} assistência${byGoals.assists === 1 ? '' : 's'}`
    + (tied ? ` · empatado em gols com ${tied} jogador${tied === 1 ? '' : 'es'}, desempate pelas assistências` : '');
  $('topAssist').textContent = byAssists.name;
  $('topAssist').className = 'player-name';
  $('topAssistDetail').textContent = `${byAssists.assists} assistência${byAssists.assists === 1 ? '' : 's'} e ${byAssists.goals} gol${byAssists.goals === 1 ? '' : 's'}`;
  $('goalsCoverage').textContent = `${listedGoals} de ${teamGoals}`;
  $('goalsCoverageDetail').textContent = `Os outros ${Math.max(0, teamGoals - listedGoals)} gols são de jogadores fora do ranking (ou gols contra).`;

  const max = Math.max(...players.map(p => p.total), 1);
  $('playersRows').innerHTML = players.map(p => `
    <tr>
      <td><b>${p.name}</b></td>
      <td>${p.games || '—'}</td>
      <td>${p.goals}</td>
      <td>${p.assists}</td>
      <td><span class="bar-cell"><span class="bar"><i class="g" style="width:${p.goals / max * 100}%"></i><i class="a" style="width:${p.assists / max * 100}%"></i></span><b>${p.total}</b></span></td>
    </tr>`).join('');
}

Promise.all([loadCsv(), loadStandings(), loadPlayers()]).finally(() => {
  renderAll();
  renderStandings();
  renderPlayers();
});

// ===== Menu: rolar até a seção =====
// Dentro do Streamlit o painel fica num quadro (iframe) da altura da página inteira,
// então o link "#secao" não tem o que rolar. scrollIntoView rola a página de fora.
document.querySelectorAll('nav a[href^="#"]').forEach(link => {
  link.addEventListener('click', event => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({behavior: 'smooth', block: 'start'});
  });
});