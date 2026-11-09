(function () {
  "use strict";

  const D = window.HYROX_DATA;
  const LS_KEY = "hyrox-extra-rounds";
  const GOAL = toSec(D.goal);
  const $ = (id) => document.getElementById(id);

  // ---------- 시간 유틸 ----------
  function toSec(t) {
    if (t == null || t === "") return null;
    const m = String(t).trim().match(/^(\d{1,3}):([0-5]\d)$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
  }
  function fmt(s) {
    const a = Math.round(Math.abs(s));
    return `${s < 0 ? "-" : ""}${Math.floor(a / 60)}:${String(a % 60).padStart(2, "0")}`;
  }
  function fmtDelta(d) {
    if (d === 0) return "±0:00";
    return (d < 0 ? "−" : "+") + fmt(Math.abs(d));
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- 데이터 ----------
  function loadExtra() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "[]"); } catch (e) { return []; }
  }
  function saveExtra(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  const athleteColor = Object.fromEntries(D.athletes.map((a) => [a.id, a.color]));
  const chip = (a) => `<span class="chip" style="background:${athleteColor[a] || "#666"}">${esc(a)}</span>`;

  function legParts(leg) {
    return { r8: toSec(leg.run800) || 0, st: toSec(leg.station) || 0, r2: toSec(leg.run200) || 0 };
  }
  function legTotal(leg) {
    const p = legParts(leg);
    return p.r8 + p.st + p.r2;
  }
  // 앞 달리기 거리: 구간 지정 → 회차 지정 → 스테이션 기본(스키 1000m) → 800m
  function runDist(leg, i, round) {
    return leg.runDist || (round && round.runDist) || D.stations[i].runDist || 800;
  }
  // 뒤 달리기 거리: 구간 지정 → 회차 지정 → 200m
  function run2Dist(leg, round) {
    return leg.run2Dist || (round && round.run2Dist) || 200;
  }
  // 대회처럼 구간당 달리기 1km로 맞춘 시간. 거리 차이는 그 구간 달리기 평균 페이스로 보정한다.
  function legRace(leg, i, round) {
    const p = legParts(leg);
    const dist = runDist(leg, i, round) + (leg.run200 ? run2Dist(leg, round) : 0);
    const run = p.r8 + p.r2;
    return run ? legTotal(leg) - (run * (dist - 1000)) / dist : legTotal(leg);
  }
  function roundRunKm(r) {
    return r.legs.reduce((s, l, i) => s + runDist(l, i, r) + (l.run200 ? run2Dist(l, r) : 0), 0) / 1000;
  }
  function roundStats(r) {
    let r8 = 0, st = 0, r2 = 0, race = 0;
    r.legs.forEach((l, i) => { const p = legParts(l); r8 += p.r8; st += p.st; r2 += p.r2; race += legRace(l, i, r); });
    return { r8, st, r2, total: r8 + st + r2, race: Math.round(race) };
  }

  let rounds = [];

  function refresh() {
    rounds = D.rounds.concat(loadExtra());
    renderDday();
    renderKpis();
    renderTrend();
    renderBreakdown();
    renderStationTable();
    renderTiers();
    renderEvents();
    renderAthletes();
    renderInsights();
    renderCourse();
    renderTarget();
    renderPhases();
    renderCare();
  }

  // ---------- D-day ----------
  function daysLeft() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const [y, m, d] = D.event.date.split("-").map(Number);
    return Math.round((new Date(y, m - 1, d) - today) / 86400000);
  }
  function renderDday() {
    const n = daysLeft();
    const big = n > 0 ? `D-${n}` : n === 0 ? "D-DAY" : `D+${-n}`;
    const small = n > 0 ? `${D.event.date.replace(/-/g, ".")} 대회까지<br>${n}일 남음` : n === 0 ? "오늘이 대회 날" : "대회 종료";
    $("dday").innerHTML = `<span class="big">${big}</span><span class="small">${small}</span>`;
  }

  // ---------- KPI ----------
  function renderKpis() {
    const first = roundStats(rounds[0]).race;
    const lastStats = roundStats(rounds[rounds.length - 1]);
    const last = lastStats.total;
    const gap = lastStats.race - GOAL;
    const n = Math.max(daysLeft(), 0);
    $("kpis").innerHTML = `
      <div class="kpi focus"><div class="label">최근 기록 (${esc(rounds[rounds.length - 1].label)})</div>
        <div class="value num">${fmt(last)}</div><div class="hint">대회 거리 환산 ${fmt(lastStats.race)}</div></div>
      <div class="kpi"><div class="label">첫 측정 대비</div>
        <div class="value num ${lastStats.race <= first ? "good" : "bad"}">${fmtDelta(lastStats.race - first)}</div><div class="hint">환산 기준, ${esc(rounds[0].label)} ${fmt(first)}에서</div></div>
      <div class="kpi"><div class="label">목표까지 (환산 기준)</div>
        <div class="value num ${gap <= 0 ? "good" : "bad"}">${gap <= 0 ? "달성" : fmt(gap)}</div>
        <div class="hint">${gap > 0 ? `구간당 약 ${Math.ceil(gap / 8)}초 단축` : `${fmt(-gap)} 여유`}</div></div>
      <div class="kpi"><div class="label">남은 기간</div>
        <div class="value num">${n}일</div><div class="hint">${D.event.date.replace(/-/g, ".")} 대회</div></div>`;
  }

  // ---------- 추이 차트 ----------
  function renderTrend() {
    const totals = rounds.map((r) => roundStats(r).total);
    const races = rounds.map((r) => roundStats(r).race);
    const W = 640, H = 260, L = 52, R = 24, T = 24, B = 34;
    const lo = Math.floor((Math.min(GOAL, ...races) - 120) / 60) * 60;
    const hi = Math.ceil((Math.max(...totals) + 60) / 60) * 60;
    const IN = 36;
    const x = (i) => L + IN + (totals.length === 1 ? (W - L - R - 2 * IN) / 2 : (i * (W - L - R - 2 * IN)) / (totals.length - 1));
    const y = (v) => T + ((hi - v) / (hi - lo)) * (H - T - B);
    let grid = "";
    const step = (hi - lo) / 60 > 12 ? 300 : 120;
    for (let v = lo; v <= hi; v += step) {
      grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/>
        <text x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${fmt(v)}</text>`;
    }
    const pts = totals.map((t, i) => `${x(i)},${y(t)}`).join(" ");
    const racePts = races.map((t, i) => `${x(i)},${y(t)}`).join(" ");
    const raceDots = races.map((t, i) => `
      <circle cx="${x(i)}" cy="${y(t)}" r="3.5" fill="var(--surface)" stroke="var(--muted)" stroke-width="2"/>
      <text x="${x(i)}" y="${y(t) + 18}" text-anchor="middle">${fmt(t)}</text>`).join("");
    const area = `${x(0)},${y(lo)} ${pts} ${x(totals.length - 1)},${y(lo)}`;
    const dots = totals.map((t, i) => `
      <circle cx="${x(i)}" cy="${y(t)}" r="${i === totals.length - 1 ? 6 : 4.5}" fill="${i === totals.length - 1 ? "var(--accent)" : "var(--surface)"}" stroke="var(--accent)" stroke-width="2.5"/>
      <text class="val" x="${x(i)}" y="${y(t) - 12}" text-anchor="middle">${fmt(t)}</text>
      <text x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(rounds[i].label)}</text>`).join("");
    $("trend").innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="회차별 총 기록 추이">
        ${grid}
        <polygon points="${area}" fill="var(--accent)" opacity=".08"/>
        <line x1="${L}" x2="${W - R}" y1="${y(GOAL)}" y2="${y(GOAL)}" stroke="var(--good)" stroke-width="2" stroke-dasharray="6 5"/>
        <text x="${L + 6}" y="${y(GOAL) + 16}" text-anchor="start" style="fill:var(--good);font-weight:600">목표 ${D.goal}</text>
        <polyline points="${racePts}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="3 4"/>
        ${raceDots}
        <polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>
        ${dots}
      </svg>`;
  }

  // ---------- 구성 막대 ----------
  function renderBreakdown() {
    const stats = rounds.map(roundStats);
    const max = Math.max(...stats.map((s) => s.total));
    const rows = stats.map((s, i) => `
      <div class="bd-row">
        <span class="rl">${esc(rounds[i].label)}</span>
        <div class="bd-bar" style="width:${(s.total / max) * 100}%">
          <span class="seg-run" style="width:${(s.r8 / s.total) * 100}%">${fmt(s.r8)}</span>
          <span class="seg-st" style="width:${(s.st / s.total) * 100}%">${fmt(s.st)}</span>
          <span class="seg-200" style="width:${(s.r2 / s.total) * 100}%">${fmt(s.r2)}</span>
        </div>
        <span class="bd-total">${fmt(s.total)}</span>
      </div>`).join("");
    const a = stats[0], b = stats[stats.length - 1];
    const d = (k) => `<b>${fmtDelta(b[k] - a[k])}</b>`;
    $("breakdown").innerHTML = rows + `
      <div class="legend"><span><i class="seg-run"></i>앞 달리기</span><span><i class="seg-st"></i>스테이션 ×8</span><span><i class="seg-200"></i>뒤 달리기</span></div>
      <div class="bd-delta">
        <div>앞 달리기 변화 (${esc(rounds[0].label)}→${esc(rounds[rounds.length - 1].label)})${d("r8")}</div>
        <div>스테이션 변화${d("st")}</div>
        <div>뒤 달리기 변화${d("r2")}</div>
      </div>`;
  }

  // ---------- 스테이션 표 ----------
  function renderStationTable() {
    // 회차·구간마다 달리기 거리가 달라서 칸의 큰 숫자는 구간 달리기를 1km로 맞춘 환산 시간
    const legDist = (l, i, r) => {
      const d1 = runDist(l, i, r), d2 = l.run200 ? run2Dist(l, r) : 0;
      return d2 ? `${d1}+${d2}m` : `${d1}m`;
    };
    const head = `<thead><tr><th>스테이션</th>${rounds.map((r) => `<th>${esc(r.label)}</th>`).join("")}<th>첫→최근</th></tr></thead>`;
    const body = D.stations.map((s, i) => {
      const exact = rounds.map((r) => legRace(r.legs[i], i, r));
      const times = exact.map(Math.round);
      // 한 행에 최고 기록은 하나만: 같은 기록이면 최근 회차
      const bestK = exact.reduce((b, v, k) => (v <= exact[b] ? k : b), 0);
      const cells = rounds.map((r, k) => {
        const l = r.legs[i];
        const raw = legTotal(l);
        return `<td><div class="cell ${k === bestK ? "best" : ""}">
          <span class="t">${fmt(times[k])}</span>
          <span class="m">${chip(l.a)} 스테이션 ${l.station || "-"}</span>
          <span class="m">실측 ${fmt(raw)} · 달리기 ${legDist(l, i, r)}</span></div></td>`;
      }).join("");
      const d = times[times.length - 1] - times[0];
      return `<tr><td class="st">${s.name}<small>${s.en}</small></td>${cells}
        <td><span class="delta ${d < 0 ? "good" : d > 0 ? "bad" : ""}">${fmtDelta(d)}</span></td></tr>`;
    }).join("");
    const st = rounds.map(roundStats);
    const tot = st.map((x) => x.race);
    const foot = `<tfoot><tr><td>합계<small style="display:block;font-weight:400;color:var(--muted)">환산 / 실측</small></td>${st.map((x) => `<td><span class="num" style="font-size:20px">${fmt(x.race)}</span><small style="display:block;font-weight:400;color:var(--muted)">실측 ${fmt(x.total)} · ${roundRunKm(rounds[st.indexOf(x)])}km</small></td>`).join("")}
      <td><span class="delta good">${fmtDelta(tot[tot.length - 1] - tot[0])}</span></td></tr></tfoot>`;
    $("stationTable").innerHTML = head + `<tbody>${body}</tbody>` + foot;
  }


  // ---------- 티어 ----------
  function tierOf(sec, t) {
    if (sec <= toSec(t.S)) return "S";
    if (sec <= toSec(t.A)) return "A";
    if (sec <= toSec(t.B)) return "B";
    return "C";
  }
  const badge = (k) => `<span class="tier ${k}">${k}</span>`;
  // 대회 거리 환산 기록의 달리기 시간 (8km)
  function raceRunSec(stats) {
    return stats.r8 + stats.r2 - (stats.total - stats.race);
  }

  function renderTiers() {
    const T = D.tiers;
    const last = rounds[rounds.length - 1];
    const st = roundStats(last);
    const est = estimate().total;

    // 완주 기록 스케일 (40분~90분)
    const lo = 40 * 60, hi = 90 * 60;
    const pos = (s) => Math.min(Math.max(((s - lo) / (hi - lo)) * 100, 0), 100);
    const edges = [lo, toSec(T.finish.S), toSec(T.finish.A), toSec(T.finish.B), hi];
    const bands = ["S", "A", "B", "C"].map((k, i) => `<span class="tier ${k}" style="width:${pos(edges[i + 1]) - pos(edges[i])}%;height:auto;border-radius:0">${k} ${i < 3 ? `~${fmt(edges[i + 1])}` : `${fmt(edges[3])}~`}</span>`).join("");
    $("tierFinish").innerHTML = `
      <p class="tier-finish-text">완주 기록 기준: 환산 기록 <b>${fmt(st.race)}</b> ${badge(tierOf(st.race, T.finish))}
        · 서울 코스(록스존 포함 ${courseKm()}km) 기준 대회 예상 <b>${fmt(est)}</b> ${badge(tierOf(est, T.finish))}</p>
      <div class="tier-scale">
        <div class="bands">${bands}</div>
        <div class="mark" style="left:${pos(st.race)}%"><b>환산 ${fmt(st.race)}</b></div>
        <div class="mark ghost" style="left:${pos(est)}%"><b style="top:62px">대회 예상 ${fmt(est)}</b></div>
      </div>`;

    // 종목별
    const rows = D.stations.map((s, i) => {
      const t = T.station[s.id];
      const mine = toSec(last.legs[i].station);
      return `<tr><td class="st">${s.name}<small>${s.en}</small></td>
        <td class="th">${t.S}</td><td class="th">${t.A}</td><td class="th">${t.B}</td>
        <td class="mine">${badge(tierOf(mine, t))}<span class="num">${last.legs[i].station}</span></td></tr>`;
    }).join("");
    const pace = raceRunSec(st) / 8;
    const runRow = `<tr><td class="st">달리기<small>km당 평균 페이스 (8km 환산)</small></td>
      <td class="th">${T.runPerKm.S}</td><td class="th">${T.runPerKm.A}</td><td class="th">${T.runPerKm.B}</td>
      <td class="mine">${badge(tierOf(pace, T.runPerKm))}<span class="num">${fmt(Math.round(pace))}</span></td></tr>`;
    $("tierTable").innerHTML = `<thead><tr><th>종목</th><th>S 이내</th><th>A 이내</th><th>B 이내</th><th>${esc(last.label)} 기록</th></tr></thead>
      <tbody>${rows}${runRow}</tbody>`;

    $("tierNotes").innerHTML = `
      <p>스테이션 티어는 개인전 엘리트·평균(약 90분대) 기록을 남녀 평균한 값입니다. 혼성 릴레이만 따로 낸 종목별 통계는 공개된 것이 없어 추정치이며, 남자 선수 기록은 실제보다 유리하게, 여자 선수 기록은 불리하게 나올 수 있습니다.</p>
      <p>썰매 종목은 연습 장비·바닥·무게가 대회와 다르면 시간이 크게 달라집니다. 연습 기록이 대회보다 빠르게 나올 수 있습니다.</p>
      <p>완주 티어는 혼성 릴레이 결과(서울 2025 1:14:01이 112팀 중 상위 43%, 엘리트 54분 이내)를 기준으로 잡았습니다. 연습 기록에는 록스존(스테이션 출입 이동)이 빠져 있어, 대회 예상은 서울 코스 전체 이동 거리 ${courseKm()}km를 같은 페이스로 달린다고 보고 계산했습니다 (교대 터치 시간 제외).</p>
      <p>출처: ${D.tierSources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(" · ")}</p>`;
  }

  // ---------- 국내 대회 기록 ----------
  // 우리 팀 대회 예상 = 환산 기록 + 록스존(서울 2025 중위권 팀 기준)
  // 서울 코스 전체 이동 거리 (달리기 + 록스존)
  function courseM() {
    return D.course.legs.reduce((s, l) => s + l.run + l.in + l.out + l.toTZ, 0);
  }
  const courseRunM = () => D.course.legs.reduce((s, l) => s + l.run + l.toTZ, 0);
  const courseRoxM = () => D.course.legs.reduce((s, l) => s + l.in + l.out, 0);
  const courseKm = () => (courseM() / 1000).toFixed(1);
  // 최근 회차 달리기 km당 페이스 (대회 거리 환산 기준)
  function teamPace() {
    return raceRunSec(roundStats(rounds[rounds.length - 1])) / 8;
  }
  // 선수별 최근 회차 달리기 km당 페이스 (없으면 팀 페이스)
  function athletePace(id) {
    const r = rounds[rounds.length - 1];
    let t = 0, d = 0;
    r.legs.forEach((l, i) => {
      if (l.a !== id) return;
      const p = legParts(l);
      t += p.r8 + p.r2;
      d += runDist(l, i, r) + (l.run200 ? run2Dist(l, r) : 0);
    });
    return d ? (t * 1000) / d : teamPace();
  }
  // 서울 코스 구간별 이동 거리 (달리기 + 록스존)와 담당 선수 (다음 측정 배치)
  function courseLegs() {
    return D.stations.map((s, i) => {
      const l = D.course.legs[i], a = D.target[i].a;
      const run = l.run + l.toTZ, rox = l.in + l.out, m = run + rox;
      return { s, i, a, l, run, rox, m, t: Math.round((athletePace(a) * m) / 1000) };
    });
  }
  // 대회 예상 = 구간마다 담당 선수 페이스로 코스 이동 + 스테이션 (교대 터치 시간 제외)
  function estimate() {
    const st = roundStats(rounds[rounds.length - 1]);
    const run = courseLegs().reduce((s, x) => s + x.t, 0);
    return { total: run + st.st, run, station: st.st };
  }
  // 60분 안에 들어오기 위한 전체 이동 km당 페이스 (스테이션은 최근 회차 그대로)
  function needPace() {
    return (GOAL - estimate().station) / (courseM() / 1000);
  }
  // 그 기록이면 몇 위인지 (같은 기록은 앞 순위로)
  function rankOf(list, sec) {
    return list.filter((x) => x < sec).length + 1;
  }

  function renderEvents() {
    const E = window.HYROX_EVENTS || [];
    if (!E.length) return;
    const me = estimate();
    $("evCards").innerHTML = E.map((e) => {
      const tot = e.teams.map((t) => t[0] + t[1]);
      const n = tot.length;
      const g = rankOf(tot, GOAL), m = rankOf(tot, me.total);
      const pct = (r) => Math.max(1, Math.round((r / n) * 100));
      return `<article class="ev">
        <h3><a href="${e.url}" target="_blank" rel="noopener">${e.name}</a><small>${e.date.replace(/-/g, ".")} · ${n}팀</small></h3>
        <dl><dt>1위</dt><dd>${e.best}</dd><dt>상위 10%</dt><dd>${e.p10}</dd><dt>중간 (50%)</dt><dd>${e.p50}</dd>
          <dt>60분 안 완주</dt><dd>${tot.filter((x) => x < GOAL).length}팀</dd></dl>
        <div class="rank"><span class="goal">목표 ${D.goal}이면 <b>${g}위</b> (상위 ${pct(g)}%)</span>
          <span class="est">대회 예상 ${fmt(me.total)}이면 <b>${m}위</b> (상위 ${pct(m)}%)</span></div>
      </article>`;
    }).join("");

    // 분포 차트: 행마다 대회, 점마다 팀
    const W = 640, rowH = 46, L = 74, R = 16, T = 10, B = 28;
    const H = T + rowH * E.length + B;
    const lo = 50 * 60, hi = 100 * 60;
    const x = (s) => L + ((Math.min(Math.max(s, lo), hi) - lo) / (hi - lo)) * (W - L - R);
    let grid = "";
    for (let m = 50; m <= 100; m += 10) {
      grid += `<line x1="${x(m * 60)}" x2="${x(m * 60)}" y1="${T}" y2="${H - B}" stroke="var(--line)"/>
        <text x="${x(m * 60)}" y="${H - 8}" text-anchor="middle">${m}분</text>`;
    }
    const rows = E.map((e, i) => {
      const cy = T + rowH * i + rowH / 2;
      const dots = e.teams.map((t, k) => {
        const jitter = ((k * 37) % 11 - 5) * 1.6;
        return `<circle cx="${x(t[0] + t[1]).toFixed(1)}" cy="${(cy + jitter).toFixed(1)}" r="2.6" fill="var(--muted)" opacity=".55"/>`;
      }).join("");
      return `<text x="0" y="${cy + 4}" style="fill:var(--ink);font-weight:600">${e.name}</text>${dots}`;
    }).join("");
    $("evChart").innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="국내 대회 혼성 릴레이 팀 기록 분포">
      ${grid}${rows}
      <line x1="${x(GOAL)}" x2="${x(GOAL)}" y1="${T - 4}" y2="${H - B}" stroke="var(--good)" stroke-width="2" stroke-dasharray="5 4"/>
      <line x1="${x(me.total)}" x2="${x(me.total)}" y1="${T - 4}" y2="${H - B}" stroke="var(--accent)" stroke-width="2"/>
      </svg>
      <div class="legend"><span><i style="background:var(--good)"></i>목표 ${D.goal}</span><span><i style="background:var(--accent)"></i>우리 대회 예상 ${fmt(me.total)}</span><span><i style="background:var(--muted)"></i>참가 팀</span></div>`;

    // 달리기·스테이션을 나눠서 비교 (가장 최근 대회 기준)
    const ev = E[E.length - 1];
    const runs = ev.teams.map((t) => t[0]), sts = ev.teams.map((t) => t[1]);
    const rr = rankOf(runs, me.run), sr = rankOf(sts, me.station);
    $("evNotes").innerHTML = `
      <p>60분 안에 들어온 팀은 대회별로 ${E.map((e) => `${e.name} ${e.teams.filter((t) => t[0] + t[1] < GOAL).length}팀`).join(", ")}입니다. <b>1시간 언더는 혼성 릴레이에서 상위 5% 안쪽, 시상권에 가까운 기록</b>입니다.</p>
      <p>${ev.name} 기준으로 나눠 보면, 우리 스테이션 합계 ${fmt(me.station)}는 ${ev.teams.length}팀 중 <b>${sr}위</b>, 달리기+록스존 예상 ${fmt(me.run)}는 <b>${rr}위</b> 수준입니다. 스테이션은 이미 최상위권이라 달리기와 교대에서 줄이는 것이 1시간 언더의 핵심입니다.</p>
      <p>우리 대회 예상은 서울 코스 구간마다 담당 선수의 최근 달리기 페이스로 이동 거리를 계산하고 스테이션 ${fmt(me.station)}를 더한 값입니다. 교대 터치 시간은 빠져 있고, 연습 썰매 기록이 대회보다 빠를 수 있어 실제로는 조금 더 걸릴 수 있습니다.</p>
      <p>출처: ${E.map((e) => `<a href="${e.url}" target="_blank" rel="noopener">Hyranking ${e.name} 혼성 릴레이</a>`).join(" · ")} (2026.11.03 수집)</p>`;
  }

  // ---------- 선수 카드 ----------
  function renderAthletes() {
    const last = rounds[rounds.length - 1];
    $("athletes").innerHTML = D.athletes.map((a) => {
      const legs = last.legs.map((l, i) => ({ l, i })).filter((x) => x.l.a === a.id);
      const sum = legs.reduce((s, x) => s + legTotal(x.l), 0);
      // 앞 달리기를 km당 페이스로 맞춰 평균
      const avg = rounds.map((r) => {
        const xs = r.legs.map((l, i) => (l.a === a.id && toSec(l.run800) ? (toSec(l.run800) * 1000) / runDist(l, i, r) : null)).filter((v) => v != null);
        return xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null;
      });
      return `<article class="ath" style="--c:${a.color}">
        <h3>${esc(a.id)}<span class="num">${fmt(sum)}</span></h3>
        <ul class="legs">${legs.map((x) => `<li><span>${D.stations[x.i].name} · 스테이션 ${x.l.station}</span><span class="num">${fmt(legTotal(x.l))}</span></li>`).join("")}</ul>
        ${spark(avg, a.color)}
        <div class="cap">앞 달리기 km당 평균 페이스 (위로 갈수록 빠름)</div>
      </article>`;
    }).join("");
  }
  function spark(vals, color) {
    const W = 220, H = 46, P = 18;
    const v = vals.filter((x) => x != null);
    if (!v.length) return "";
    const lo = Math.min(...v) - 5, hi = Math.max(...v) + 5;
    const x = (i) => P + (vals.length === 1 ? 0 : (i * (W - 2 * P)) / (vals.length - 1));
    const y = (s) => 8 + ((s - lo) / (hi - lo)) * (H - 22);
    const pts = vals.map((s, i) => (s == null ? null : [x(i), y(s), s])).filter(Boolean);
    return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true">
      <polyline points="${pts.map((p) => p[0] + "," + p[1]).join(" ")}" fill="none" stroke="${color}" stroke-width="2"/>
      ${pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${color}"/><text x="${p[0]}" y="${H - 2}" text-anchor="middle">${fmt(Math.round(p[2]))}</text>`).join("")}
    </svg>`;
  }

  // ---------- 분석 ----------
  function renderInsights() {
    const out = [];
    const first = rounds[0], last = rounds[rounds.length - 1];
    const a = roundStats(first), b = roundStats(last);
    const gap = b.race - GOAL;

    out.push(["up", `대회 거리(달리기 8km)로 환산하면 <b>${fmt(a.race)} → ${fmt(b.race)}</b>로 ${fmt(a.race - b.race)} 줄었습니다. 이 중 스테이션이 ${fmt(a.st - b.st)}, 달리기가 ${fmt(raceRunSec(a) - raceRunSec(b))}입니다. 기술이 붙으면서 스테이션에서 가장 크게 줄었습니다.`]);

    const km = roundRunKm(last);
    out.push(["info", km === 8
      ? `${esc(last.label)}는 달리기 총 8km로 대회와 거리가 같아 환산 없이 비교합니다.`
      : `${esc(last.label)}는 연습 거리 기준 달리기 총 ${km}km라, 대회 거리 8km로 맞추면 <b>${fmt(b.race)}</b>에 해당합니다. 목표 비교는 이 환산 기록으로 합니다.`]);

    // 가장 많이 줄어든 스테이션
    const deltas = D.stations.map((s, i) => ({ s, d: Math.round(legRace(last.legs[i], i, last) - legRace(first.legs[i], i, first)), i }));
    const topUp = deltas.slice().sort((x, y) => x.d - y.d).slice(0, 2);
    out.push(["up", topUp.map((x) => `<b>${x.s.name}</b> ${fmtDelta(x.d)}`).join(", ") + " 구간이 가장 많이 좋아졌습니다."]);

    if (gap > 0) {
      out.push(["fix", `환산 기록 기준 목표까지 <b>${fmt(gap)}</b> 남았습니다. 8구간 기준 <b>구간당 ${Math.ceil(gap / 8)}초</b>만 줄이면 됩니다 (록스존 제외 기준).`]);
    }

    // 티어
    const tierStations = D.stations.map((s, i) => ({ s, k: tierOf(toSec(last.legs[i].station), D.tiers.station[s.id]) }));
    const strong = tierStations.filter((x) => x.k === "S").map((x) => x.s.name);
    // S티어가 아닌 종목은 S 기준까지 남은 시간
    const weak = tierStations.filter((x) => x.k !== "S").map((x) => {
      const gapS = toSec(last.legs[x.s ? D.stations.indexOf(x.s) : 0].station) - toSec(D.tiers.station[x.s.id].S);
      return `${x.s.name} ${x.k}티어 (S까지 ${fmt(gapS)})`;
    });
    if (strong.length) out.push(["up", `혼성 릴레이 기준 S티어 종목: <b>${strong.join(", ")}</b>. 이미 엘리트 수준이라 지금 페이스를 유지하는 게 목표입니다.`]);
    if (weak.length) out.push(["fix", `아직 S티어가 아닌 종목: <b>${weak.join(", ")}</b>. 남은 시간을 가장 많이 줄일 수 있는 곳입니다.`]);
    const est = estimate();
    out.push(["fix", `서울 코스는 달리기 ${(courseRunM() / 1000).toFixed(2)}km에 록스존 ${(courseRoxM() / 1000).toFixed(2)}km가 더해져 전체 이동이 ${courseKm()}km입니다. 지금 페이스면 대회 예상 <b>${fmt(est.total)}</b>이고, 스테이션이 그대로라면 60분 안에 들어오기 위해 전체 이동을 <b>km당 ${fmt(Math.round(needPace()))}</b>로 가야 합니다. 록스존은 걷지 말고 조깅으로 이동하세요.`]);

    if (tierOf(toSec(last.legs[7].station), D.tiers.station.wallball) !== "S") {
      out.push(["fix", `월볼은 하체가 지친 상태에서 하는 마지막 스테이션입니다. 10~15개 단위로 쉬는 지점을 미리 정해 두고, 쉬는 시간은 숨 3~4번으로 짧게 가져가세요.`]);
    }

    // 뒤 달리기 (스테이션 직후) km당 페이스
    const pace2 = (r) => {
      let t = 0, d = 0;
      r.legs.forEach((l) => { const v = toSec(l.run200); if (v) { t += v; d += run2Dist(l, r); } });
      return d ? (t * 1000) / d : 0;
    };
    out.push(["info", `스테이션 직후 뒤 달리기 페이스는 km당 ${fmt(Math.round(pace2(first)))} → <b>${fmt(Math.round(pace2(last)))}</b>입니다. 앞 달리기보다 느리므로 스테이션을 끝내고 바로 다시 뛰는 연결 동작을 다듬으면 구간마다 몇 초씩 줄일 수 있습니다.`]);

    // 다음 측정 배치 변경
    const swaps = D.target.map((t, i) => (t.a !== last.legs[i].a ? i : null)).filter((i) => i != null);
    if (swaps.length) {
      const list = swaps.map((i) => `${D.stations[i].name} ${last.legs[i].a}→<b>${D.target[i].a}</b>`).join(", ");
      out.push(["info", `다음 측정 배치 변경: ${list}. 새로 맡는 구간은 목표 스플릿을 임시로 잡았고, 첫 기록이 나오면 그 기록을 기준으로 다시 맞춥니다.`]);
    }

    // 데이터 메모
    rounds.forEach((r) => (r.notes || []).forEach((n) => out.push(["info", `${esc(r.label)} 메모: ${esc(n)}`])));

    const label = { up: "좋아진 점", fix: "개선", info: "참고" };
    $("insights").innerHTML = out.map(([k, t]) => `<li><span class="tag ${k}">${label[k]}</span><p>${t}</p></li>`).join("");
  }

  // ---------- 대회 코스 ----------
  function renderCourse() {
    const c = D.course;
    const runM = courseRunM(), roxM = courseRoxM();
    const pace = teamPace();
    $("courseFacts").innerHTML = `
      <div>한 바퀴<b>${c.lapM}m</b></div>
      <div>달리기 합계<b>${(runM / 1000).toFixed(2)}km</b></div>
      <div>록스존 합계<b>${(roxM / 1000).toFixed(2)}km</b></div>
      <div>진입 규칙<b style="font-size:15px;font-family:var(--font-body)">${esc(c.rule)}</b></div>`;

    $("courseFlow").innerHTML = `
      <ol class="flow">
        <li><b>처음 달리기</b><span>교대 구역 출발 → 약 70m 뒤 IN을 처음 지나침 → 한 바퀴 → IN 두 번째에 진입</span></li>
        <li><b>록스존 진입</b><span>IN에서 스테이션까지 (뒤 번호일수록 멂)</span></li>
        <li><b>스테이션</b><span>1번 스키부터 8번 월볼까지 왼쪽에서 오른쪽 순서</span></li>
        <li><b>록스존 퇴장</b><span>스테이션에서 오른쪽 아래 OUT까지 (앞 번호일수록 멂)</span></li>
        <li><b>교대까지 달리기</b><span>OUT → 오른쪽 변 → 위쪽 직선 → 왼쪽 변 교대 구역에서 하이파이브</span></li>
      </ol>`;

    // 구간별 거리, 담당 선수 페이스 예상, 60분 목표
    const legs = courseLegs();
    const need = needPace();
    const goalT = (m) => Math.round((need * m) / 1000);
    const rows = legs.map((x) => `<tr><td class="num">${x.i + 1}</td><td class="st">${x.s.name}</td><td>${chip(x.a)}</td>
        <td class="num">${x.l.run}m${x.l.from ? `<small style="display:block;color:var(--muted)">${esc(x.l.from)}에서</small>` : ""}</td>
        <td class="num">${x.l.in}m</td><td class="num">${x.l.out ? `${x.l.out}m` : "–"}</td>
        <td class="num">${x.l.toTZ}m${x.l.to ? `<small style="display:block;color:var(--muted)">${esc(x.l.to)}</small>` : ""}</td>
        <td class="num">${x.m}m</td><td class="num">${fmt(x.t)}</td><td class="num" style="color:var(--good)">${fmt(goalT(x.m))}</td></tr>`).join("");
    const sum = (k) => c.legs.reduce((s, l) => s + l[k], 0);
    $("courseTable").innerHTML = `<thead><tr><th>#</th><th>스테이션</th><th>선수</th><th>처음 달리기</th><th>록스존 진입</th><th>록스존 퇴장</th><th>교대까지</th><th>합계</th><th>예상</th><th>60분 목표</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="3">합계</td><td class="num">${sum("run")}m</td><td class="num">${sum("in")}m</td><td class="num">${sum("out")}m</td><td class="num">${sum("toTZ")}m</td><td class="num">${courseM()}m</td>
        <td class="num">${fmt(legs.reduce((s, x) => s + x.t, 0))}</td><td class="num" style="color:var(--good)">${fmt(legs.reduce((s, x) => s + goalT(x.m), 0))}</td></tr></tfoot>`;

    // 선수별 이동 거리 합계
    $("courseAthletes").innerHTML = D.athletes.map((p) => {
      const mine = legs.filter((x) => x.a === p.id);
      const run = mine.reduce((s, x) => s + x.run, 0), rox = mine.reduce((s, x) => s + x.rox, 0);
      const t = mine.reduce((s, x) => s + x.t, 0);
      return `<article class="ath" style="--c:${p.color}">
        <h3>${esc(p.id)}<span class="num">${((run + rox) / 1000).toFixed(2)}km</span></h3>
        <ul class="legs">
          ${mine.map((x) => `<li><span>${x.i + 1}번 ${x.s.name}</span><span class="num">${x.l.run}+${x.l.in}+${x.l.out}+${x.l.toTZ}m</span></li>`).join("")}
          <li><span>달리기 / 록스존</span><span class="num">${run}m / ${rox}m</span></li>
          <li><span>본인 페이스 (km당 ${fmt(Math.round(athletePace(p.id)))})</span><span class="num">${fmt(t)}</span></li>
          <li><span>60분 목표 (km당 ${fmt(Math.round(need))})</span><span class="num" style="color:var(--good)">${fmt(goalT(run + rox))}</span></li>
        </ul></article>`;
    }).join("");

    // 페이스 → 바퀴·구간 시간
    const paces = [210, 225, 240, 255].concat(Math.round(pace)).sort((a, b) => a - b).filter((v, i, a) => a.indexOf(v) === i);
    const at = (p, m) => fmt(Math.round((p * m) / 1000));
    $("lapTable").innerHTML = `<thead><tr><th>km당</th><th>한 바퀴</th><th>처음 630m</th><th>교대까지 320m</th></tr></thead><tbody>` +
      paces.map((p) => `<tr class="${p === Math.round(pace) ? "me" : ""}"><td class="num">${fmt(p)}${p === Math.round(pace) ? " (우리)" : ""}</td>
        <td class="num">${at(p, c.lapM)}</td><td class="num">${at(p, 630)}</td><td class="num">${at(p, 320)}</td></tr>`).join("") + "</tbody>";

    $("courseSim").innerHTML = `
      <section><h3>코스에 맞춘 시뮬레이션 (구간당)</h3><ol>
        <li>처음 달리기 <b>630m</b> (1번 스키 구간만 <b>590m</b>)</li>
        <li>록스존 진입: 위 표의 거리만큼 조깅</li>
        <li>스테이션</li>
        <li>록스존 퇴장: 위 표의 거리만큼 조깅</li>
        <li>교대까지 <b>320m</b> 달리고 하이파이브 (8번은 월볼 후 팀원과 함께 결승선)</li></ol>
        <p style="margin:8px 0 0;font-size:13px;color:var(--muted)">지금의 600 + 스테이션 + 400 구성을 630 + 스테이션 + 320으로 바꾸고, 록스존만 더하면 대회와 거의 같습니다.</p></section>
      <section><h3>같이 연습할 것</h3><ul>
        <li>출발 약 70m 지점에 "IN" 콘을 두고, 처음엔 지나치고 <b>두 번째로 만날 때 진입</b>. 바퀴 수는 본인 책임이고 경기장 랩 화면은 참고용입니다.</li>
        <li>대기 중인 팀원이 달리는 사람의 바퀴 수를 같이 세기</li>
        <li>록스존 ${(roxM / 1000).toFixed(2)}km는 걷지 말고 조깅으로</li>
        <li>다음 주자는 교대 직전에만 교대 구역에 들어갈 수 있으니, 바로 옆 대기 구역에서 준비</li>
        <li>스테이션에서 나올 때 IN 쪽으로 나가면 2분 페널티</li></ul></section>
      <p class="src">출처: <a href="${c.mapUrl}" target="_blank" rel="noopener">HYROX 공식 서울 경기장 지도</a> · <a href="${c.eventUrl}" target="_blank" rel="noopener">HYROX Seoul 공식 페이지</a> · <a href="${c.url}" target="_blank" rel="noopener">roxlapper.com 코스 실측 (비공식)</a>. 위치와 흐름은 공식 지도, 미터 거리는 실측 자료를 지도 비율로 나눈 추정치입니다 (2026.11.09 확인).</p>`;
  }

  // ---------- 목표 스플릿 ----------
  function renderTarget() {
    const ref = D.rounds.filter((r) => !r.runDist).pop();
    let sumNow = 0, sumT = 0;
    const rows = D.target.map((t, i) => {
      const now = legTotal(ref.legs[i]), tgt = legTotal(t);
      sumNow += now; sumT += tgt;
      const d = tgt - now;
      const moved = t.a !== ref.legs[i].a;
      const save = moved ? `<span class="zero">첫 시도</span>`
        : d < 0 ? `<span class="save">${fmtDelta(d)}</span>` : `<span class="zero">${d === 0 ? "유지" : fmtDelta(d)}</span>`;
      return `<tr><td class="st">${D.stations[i].name}</td><td>${chip(t.a)}${moved ? `<span class="new-pill">새 배치</span>` : ""}</td>
        <td class="num">${t.run800}</td><td class="num">${t.station}</td><td class="num">${t.run200}</td>
        <td class="num">${moved ? "–" : fmt(now)}</td><td class="num" style="font-weight:700">${fmt(tgt)}</td>
        <td>${save}</td></tr>`;
    }).join("");
    const raceNow = roundStats(ref).race;
    const raceT = Math.round(D.target.reduce((s, t, i) => s + legRace(t, i), 0));
    $("targetTable").innerHTML = `<thead><tr><th>스테이션</th><th>선수</th><th>앞 달리기</th><th>스테이션</th><th>뒤 달리기</th><th>${esc(ref.label)}</th><th>목표</th><th>단축</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5">합계 (연습 거리)</td><td class="num">${fmt(sumNow)}</td><td class="num" style="font-size:20px;color:var(--good)">${fmt(sumT)}</td><td><span class="save">${fmtDelta(sumT - sumNow)}</span></td></tr>
      <tr><td colspan="5">대회 거리 환산 (달리기 8km)</td><td class="num">${fmt(raceNow)}</td><td class="num" style="font-size:20px;color:var(--good)">${fmt(raceT)}</td><td></td></tr></tfoot>`;
  }

  // ---------- 기간 계획 ----------
  const PHASES = [
    { from: "2026-11-03", to: "2026-11-07", title: "마지막 강도 주",
      items: ["릴레이 전체 시뮬레이션 1회 (실전 순서·바통 터치 포함)", "800m × 6 인터벌, 목표 페이스 3:00~3:05, 사이 200m 조깅", "취약 스테이션 반복: 런지·월볼은 800m 달린 직후 바로 수행", "스테이션 끝나고 즉시 출발하는 200m 전환 연습"] },
    { from: "2026-11-08", to: "2026-11-12", title: "테이퍼 (운동량 40~50% 감소)",
      items: ["11.09 마지막 시뮬레이션 (600m + 스테이션 + 400m), 대회처럼 저녁 시간에", "시뮬레이션에서 교대(터치) 동작까지 실제처럼: 다음 주자는 미리 나와 대기, 터치 즉시 출발", "이후엔 강도만 유지하고 횟수는 절반: 400m × 4, 스테이션 짧게 1세트", "새 운동·무거운 하체 근력은 금지 (근육통이 대회까지 남음)", "신발·장갑·복장 실전과 똑같이 한 번 맞춰 보기"] },
    { from: "2026-11-13", to: "2026-11-14", title: "회복 · 탄수화물 로딩",
      items: ["20분 가벼운 조깅 + 가속주 4회, 가동성 운동", "탄수화물 위주 식사, 섬유질·기름진 음식 줄이기", "수면 8시간 이상, 음주 금지", "대회장(KINTEX) 교통·주차·막차 확인, 출발 시간은 대회 약 3일 전 공지"] },
    { from: "2026-11-15", to: "2026-11-15", title: "레이스 데이",
      items: ["릴레이는 일요일 저녁 경기: 아침·점심은 평소처럼, 출발 3~4시간 전 마지막 식사, 1시간 전 가벼운 간식", "출발 1시간 반 전 도착, 체크인은 본인 신분증 필수 (대리 체크인 불가)", "달리기 코스는 실내 바퀴 수로 1km를 채우므로 각자 바퀴 수를 세고, 동료가 함께 세어 주기", "내 구간 10분 전부터 동적 워밍업 5분, 대기 중 체온 유지", "첫 1km 과속 금지, 스테이션 끝나면 바로 출발"] },
  ];
  function renderPhases() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const md = (s) => s.slice(5).replace("-", ".");
    $("phases").innerHTML = PHASES.map((p) => {
      const state = today > p.to ? "past" : today >= p.from ? "now" : "";
      return `<li class="${state}"><div class="when">${p.from === p.to ? md(p.from) : `${md(p.from)}–${md(p.to)}`}
        ${state === "now" ? `<span class="now-pill">지금</span>` : ""}</div>
        <div><h3>${p.title}</h3><ul>${p.items.map((x) => `<li>${x}</li>`).join("")}</ul></div></li>`;
    }).join("");
  }

  // ---------- 식단 · 몸 관리 ----------
  function renderCare() {
    const w = Math.min(Math.max(Number($("weight").value) || 65, 35), 130);
    const g = (lo, hi, unit = "g") => `<span class="g">${Math.round(w * lo)}${hi ? `~${Math.round(w * hi)}` : ""}${unit}</span>`;
    $("care").innerHTML = `
      <section><h3>평소 식단 (~11.12)</h3><ul>
        <li>단백질 하루 ${g(1.6, 2.0)} (체중 1kg당 1.6~2.0g), 세 끼 + 간식으로 나눠서</li>
        <li>탄수화물 운동일 ${g(5, 7)}, 밥·고구마·오트밀 위주</li>
        <li>물 하루 <span class="g">${(w * 0.035).toFixed(1)}L</span> 이상, 땀 많이 흘린 날은 전해질 추가</li>
        <li>운동 후 1시간 안에 탄수화물:단백질 3:1 간식 (바나나+우유, 주먹밥+계란)</li></ul></section>
      <section><h3>대회 2일 전~전날 (11.13–14)</h3><ul>
        <li>탄수화물 ${g(7, 9)}로 늘리기, 단백질은 평소대로</li>
        <li>현미·잡곡·생야채·튀김을 줄이고 흰쌀밥·면·빵으로</li>
        <li>처음 먹어 보는 음식, 음주, 매운 음식 금지</li></ul></section>
      <section><h3>대회 당일</h3><ul>
        <li>저녁 경기라 아침·점심은 평소대로 든든하게, 출발 3~4시간 전 탄수화물 ${g(1, 2)} 식사 (흰밥+계란, 빵+잼+바나나)</li>
        <li>출발 1시간 전 바나나·에너지바 같은 가벼운 간식</li>
        <li>2시간 전 물 500mL, 이후 조금씩</li>
        <li>카페인은 평소 마시는 사람만 약 ${g(3, 0, "mg")} (1kg당 3mg)</li>
        <li>내 구간 사이 대기 중에는 물 몇 모금, 배고프면 바나나 반 개나 젤 1개</li></ul></section>
      <section><h3>몸 관리</h3><ul>
        <li>수면 7~9시간이 회복에 가장 큰 영향</li>
        <li>매일 10분 폼롤러: 대퇴사두·둔근·종아리 (런지·월볼·썰매에 쓰이는 근육)</li>
        <li>11.10 이후에는 근육통이 생길 만한 고중량·신규 운동 금지</li>
        <li>통증이 있으면 참지 말고 그날 운동 강도를 낮추기</li></ul></section>
      <section><h3>릴레이에서 특히 중요한 것</h3><ul>
        <li>내 구간 사이 대기가 15분 이상이라 몸이 식습니다. 겉옷을 입고 있다가 10분 전부터 다시 워밍업</li>
        <li>두 번째 구간 기록이 첫 구간보다 느려지는 선수는 대기 중 걷기를 계속하기</li>
        <li>교대 위치와 순서를 팀 전원이 미리 확인</li></ul></section>
      <section><h3>대회 후</h3><ul>
        <li>30분 안에 탄수화물 + 단백질 ${g(0.3, 0.4)} 섭취</li>
        <li>가벼운 걷기와 스트레칭, 그날은 충분히 수면</li></ul></section>`;
  }

  // ---------- 기록 추가 ----------
  function renderForm() {
    const opts = D.athletes.map((a) => `<option value="${esc(a.id)}">${esc(a.id)}</option>`).join("");
    const prev = D.target;
    $("formGrid").innerHTML = `<thead><tr><th>스테이션</th><th>선수</th><th>앞 달리기</th><th>스테이션</th><th>뒤 달리기</th></tr></thead><tbody>` +
      D.stations.map((s, i) => `<tr><td class="st">${s.name}</td>
        <td><select id="f-a-${i}" aria-label="${s.name} 선수">${opts}</select></td>
        <td><input id="f-r8-${i}" placeholder="2:20" aria-label="${s.name} 앞 달리기" inputmode="numeric"></td>
        <td><input id="f-st-${i}" placeholder="4:00" aria-label="${s.name} 스테이션" inputmode="numeric"></td>
        <td><input id="f-r2-${i}" placeholder="1:40" aria-label="${s.name} 뒤 달리기" inputmode="numeric"></td></tr>`).join("") + "</tbody>";
    D.stations.forEach((_, i) => { $(`f-a-${i}`).value = prev[i].a; });
    $("newLabel").placeholder = `예: ${rounds.length + 1}차`;
  }

  function onSubmit(e) {
    e.preventDefault();
    const label = $("newLabel").value.trim();
    const legs = [];
    for (let i = 0; i < D.stations.length; i++) {
      const v = (id) => $(id).value.trim();
      const leg = { a: v(`f-a-${i}`), run800: v(`f-r8-${i}`), station: v(`f-st-${i}`), run200: v(`f-r2-${i}`) };
      for (const k of ["run800", "station", "run200"]) {
        if (toSec(leg[k]) == null) {
          $("formMsg").textContent = `${D.stations[i].name} 구간의 시간 형식을 "분:초"로 입력하세요 (예: 3:05).`;
          $(`f-${{ run800: "r8", station: "st", run200: "r2" }[k]}-${i}`).focus();
          return;
        }
      }
      legs.push(leg);
    }
    const extra = loadExtra();
    const round = { label, runDist: Number($("newDist1").value) || 600, run2Dist: Number($("newDist2").value) || 400, legs, notes: [] };
    extra.push(round);
    if (!saveExtra(extra)) {
      $("formMsg").textContent = "이 브라우저에서는 저장할 수 없습니다. JSON을 복사해 data.js에 직접 추가하세요.";
      return;
    }
    const st = roundStats(round);
    $("formMsg").textContent = `${label} 기록을 저장했습니다. 합계 ${fmt(st.total)}${st.race !== st.total ? ` (대회 거리 환산 ${fmt(st.race)})` : ""}.`;
    $("addForm").reset();
    refresh();
    renderForm();
  }

  async function onCopy() {
    const extra = loadExtra();
    const out = $("jsonOut");
    if (!extra.length) { $("formMsg").textContent = "추가한 기록이 없습니다."; return; }
    out.value = extra.map((r) => JSON.stringify(r, null, 2)).join(",\n");
    out.hidden = false;
    try {
      await navigator.clipboard.writeText(out.value);
      $("formMsg").textContent = "복사했습니다. data.js의 rounds 배열 마지막에 붙여 넣으세요.";
    } catch (err) {
      out.select();
      $("formMsg").textContent = "아래 내용을 선택했습니다. 직접 복사하세요.";
    }
  }

  function onClear() {
    saveExtra([]);
    $("jsonOut").hidden = true;
    $("formMsg").textContent = "이 브라우저에 추가한 기록을 지웠습니다.";
    refresh();
    renderForm();
  }

  refresh();
  renderForm();
  $("weight").addEventListener("input", renderCare);
  $("addForm").addEventListener("submit", onSubmit);
  $("copyJson").addEventListener("click", onCopy);
  $("clearLocal").addEventListener("click", onClear);
})();
