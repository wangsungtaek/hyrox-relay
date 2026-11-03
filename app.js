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
  // 앞 달리기 거리 (기본 800m, 스키 구간 1000m, 회차별 예외는 leg.runDist)
  function runDist(leg, i) {
    return leg.runDist || D.stations[i].runDist || 800;
  }
  // 대회처럼 구간당 달리기 1km로 맞춘 시간. 초과 거리는 앞 달리기 페이스로 뺀다.
  function legRace(leg, i) {
    const p = legParts(leg);
    const dist = runDist(leg, i);
    const extra = dist + (leg.run200 ? 200 : 0) - 1000;
    return legTotal(leg) - (extra > 0 && p.r8 ? (p.r8 * extra) / dist : 0);
  }
  function roundStats(r) {
    let r8 = 0, st = 0, r2 = 0, race = 0;
    r.legs.forEach((l, i) => { const p = legParts(l); r8 += p.r8; st += p.st; r2 += p.r2; race += legRace(l, i); });
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
    renderAthletes();
    renderInsights();
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
    const first = roundStats(rounds[0]).total;
    const lastStats = roundStats(rounds[rounds.length - 1]);
    const last = lastStats.total;
    const gap = lastStats.race - GOAL;
    const n = Math.max(daysLeft(), 0);
    $("kpis").innerHTML = `
      <div class="kpi focus"><div class="label">최근 기록 (${esc(rounds[rounds.length - 1].label)})</div>
        <div class="value num">${fmt(last)}</div><div class="hint">대회 거리 환산 ${fmt(lastStats.race)}</div></div>
      <div class="kpi"><div class="label">첫 측정 대비</div>
        <div class="value num ${last <= first ? "good" : "bad"}">${fmtDelta(last - first)}</div><div class="hint">${esc(rounds[0].label)} ${fmt(first)}에서</div></div>
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
      <div class="legend"><span><i class="seg-run"></i>앞 달리기 (800m, 스키 구간 1000m)</span><span><i class="seg-st"></i>스테이션 ×8</span><span><i class="seg-200"></i>뒤 200m 달리기</span></div>
      <div class="bd-delta">
        <div>앞 달리기 변화 (${esc(rounds[0].label)}→${esc(rounds[rounds.length - 1].label)})${d("r8")}</div>
        <div>스테이션 변화${d("st")}</div>
        <div>200m 달리기 변화${d("r2")}</div>
      </div>`;
  }

  // ---------- 스테이션 표 ----------
  function renderStationTable() {
    const head = `<thead><tr><th>스테이션</th>${rounds.map((r) => `<th>${esc(r.label)}</th>`).join("")}<th>첫→최근</th></tr></thead>`;
    const body = D.stations.map((s, i) => {
      const times = rounds.map((r) => legTotal(r.legs[i]));
      const best = Math.min(...times);
      const cells = rounds.map((r, k) => {
        const l = r.legs[i];
        return `<td><div class="cell ${times[k] === best ? "best" : ""}">
          <span class="t">${fmt(times[k])}</span>
          <span class="m">${chip(l.a)} 스테이션 ${l.station || "-"}</span></div></td>`;
      }).join("");
      const d = times[times.length - 1] - times[0];
      const runNote = s.runDist ? `<small>앞 달리기 ${s.runDist}m</small>` : "";
      return `<tr><td class="st">${s.name}<small>${s.en}</small>${runNote}</td>${cells}
        <td><span class="delta ${d < 0 ? "good" : d > 0 ? "bad" : ""}">${fmtDelta(d)}</span></td></tr>`;
    }).join("");
    const tot = rounds.map((r) => roundStats(r).total);
    const foot = `<tfoot><tr><td>합계</td>${tot.map((t) => `<td class="num" style="font-size:20px">${fmt(t)}</td>`).join("")}
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
    const rox = toSec(T.roxzone[0].time);
    const est = st.race + rox;

    // 완주 기록 스케일 (40분~90분)
    const lo = 40 * 60, hi = 90 * 60;
    const pos = (s) => Math.min(Math.max(((s - lo) / (hi - lo)) * 100, 0), 100);
    const edges = [lo, toSec(T.finish.S), toSec(T.finish.A), toSec(T.finish.B), hi];
    const bands = ["S", "A", "B", "C"].map((k, i) => `<span class="tier ${k}" style="width:${pos(edges[i + 1]) - pos(edges[i])}%;height:auto;border-radius:0">${k} ${i < 3 ? `~${fmt(edges[i + 1])}` : `${fmt(edges[3])}~`}</span>`).join("");
    $("tierFinish").innerHTML = `
      <p class="tier-finish-text">완주 기록 기준: 환산 기록 <b>${fmt(st.race)}</b> ${badge(tierOf(st.race, T.finish))}
        · 록스존 ${T.roxzone[0].time}을 더한 대회 예상 <b>${fmt(est)}</b> ${badge(tierOf(est, T.finish))}</p>
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
      <p>완주 티어는 혼성 릴레이 결과(서울 2025 1:14:01이 112팀 중 상위 43%, 엘리트 54분 이내)를 기준으로 잡았습니다. 연습 기록에는 록스존(교대·이동) 시간이 빠져 있어 실제 대회에서는 ${T.roxzone.map((r) => r.time).join("~")} 정도가 더해집니다.</p>
      <p>출처: ${D.tierSources.map((s) => `<a href="${s.url}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join(" · ")}</p>`;
  }

  // ---------- 선수 카드 ----------
  function renderAthletes() {
    const last = rounds[rounds.length - 1];
    $("athletes").innerHTML = D.athletes.map((a) => {
      const legs = last.legs.map((l, i) => ({ l, i })).filter((x) => x.l.a === a.id);
      const sum = legs.reduce((s, x) => s + legTotal(x.l), 0);
      // 앞 달리기를 km당 페이스로 맞춰 평균
      const avg = rounds.map((r) => {
        const xs = r.legs.map((l, i) => (l.a === a.id && toSec(l.run800) ? (toSec(l.run800) * 1000) / runDist(l, i) : null)).filter((v) => v != null);
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

    out.push(["up", `전체 <b>${fmt(a.total)} → ${fmt(b.total)}</b>로 ${fmt(a.total - b.total)} 줄었습니다. 이 중 스테이션이 ${fmt(a.st - b.st)}, 달리기가 ${fmt(a.r8 + a.r2 - b.r8 - b.r2)}입니다. 기술이 붙으면서 스테이션에서 가장 크게 줄었습니다.`]);

    out.push(["info", `연습에서는 스키 구간 앞 달리기를 1000m로 해서 전체 달리기가 8.2km입니다 (1차는 스키 구간 1200m를 한 번에). 대회는 구간마다 1km씩 총 8km라, 초과 200m를 같은 페이스로 빼면 ${esc(last.label)}는 <b>${fmt(b.race)}</b>에 해당합니다. 목표 비교는 이 환산 기록으로 합니다.`]);

    // 가장 많이 줄어든 스테이션
    const deltas = D.stations.map((s, i) => ({ s, d: legTotal(last.legs[i]) - legTotal(first.legs[i]), i }));
    const topUp = deltas.slice().sort((x, y) => x.d - y.d).slice(0, 2);
    out.push(["up", topUp.map((x) => `<b>${x.s.name}</b> ${fmtDelta(x.d)}`).join(", ") + " 구간이 가장 많이 좋아졌습니다."]);

    if (gap > 0) {
      out.push(["fix", `환산 기록 기준 목표까지 <b>${fmt(gap)}</b> 남았습니다. 8구간 기준 <b>구간당 ${Math.ceil(gap / 8)}초</b>만 줄이면 됩니다 (록스존 제외 기준).`]);
    }

    // 티어
    const tierStations = D.stations.map((s, i) => ({ s, k: tierOf(toSec(last.legs[i].station), D.tiers.station[s.id]) }));
    const strong = tierStations.filter((x) => x.k === "S").map((x) => x.s.name);
    const weak = tierStations.filter((x) => x.k === "C" || x.k === "B").map((x) => `${x.s.name}(${x.k})`);
    if (strong.length) out.push(["up", `혼성 릴레이 기준 S티어 종목: <b>${strong.join(", ")}</b>. 이미 엘리트 수준이라 지금 페이스를 유지하는 게 목표입니다.`]);
    if (weak.length) out.push(["fix", `B·C티어 종목: <b>${weak.join(", ")}</b>. 티어를 한 단계만 올려도 시간이 가장 크게 줄어드는 곳입니다.`]);
    out.push(["fix", `연습 기록에는 록스존(교대·이동)이 빠져 있습니다. 실제 혼성 릴레이에서는 ${D.tiers.roxzone.map((r) => r.time).join("~")}가 더해지므로, 대회에서 60분 안에 들어오려면 환산 기록이 <b>${fmt(GOAL - toSec(D.tiers.roxzone[0].time))}</b> 안쪽이어야 합니다. 교대 위치를 미리 정하고 터치 연습을 하면 록스존을 1분 이상 줄일 수 있습니다.`]);

    out.push(["fix", `런지와 월볼은 하체가 지친 상태에서 하는 마지막 두 스테이션이라 시간이 가장 많이 걸립니다. 런지는 보폭을 일정하게 유지하고, 월볼은 10~15회 단위로 쉬는 지점을 미리 정해 두면 줄일 여지가 큽니다.`]);

    // 200m (스테이션 직후)
    const avg200 = (r) => { const xs = r.legs.map((l) => toSec(l.run200)).filter((v) => v != null); return xs.reduce((s, v) => s + v, 0) / xs.length; };
    out.push(["info", `스테이션 직후 200m 평균은 ${fmt(Math.round(avg200(first)))} → <b>${fmt(Math.round(avg200(last)))}</b>입니다 (km당 ${fmt(Math.round(avg200(last) * 5))} 페이스). 앞 달리기보다 확실히 느리므로 스테이션을 끝내고 바로 다시 뛰는 연결 동작에서 5초씩만 줄여도 40초가 나옵니다.`]);

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

  // ---------- 목표 스플릿 ----------
  function renderTarget() {
    const ref = D.rounds[D.rounds.length - 1];
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
    $("targetTable").innerHTML = `<thead><tr><th>스테이션</th><th>선수</th><th>앞 달리기</th><th>스테이션</th><th>200m</th><th>${esc(ref.label)}</th><th>목표</th><th>단축</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr><td colspan="5">합계 (연습 거리)</td><td class="num">${fmt(sumNow)}</td><td class="num" style="font-size:20px;color:var(--good)">${fmt(sumT)}</td><td><span class="save">${fmtDelta(sumT - sumNow)}</span></td></tr>
      <tr><td colspan="5">대회 거리 환산 (달리기 8km)</td><td class="num">${fmt(raceNow)}</td><td class="num" style="font-size:20px;color:var(--good)">${fmt(raceT)}</td><td></td></tr></tfoot>`;
  }

  // ---------- 기간 계획 ----------
  const PHASES = [
    { from: "2026-11-03", to: "2026-11-07", title: "마지막 강도 주",
      items: ["릴레이 전체 시뮬레이션 1회 (실전 순서·바통 터치 포함)", "800m × 6 인터벌, 목표 페이스 3:00~3:05, 사이 200m 조깅", "취약 스테이션 반복: 런지·월볼은 800m 달린 직후 바로 수행", "스테이션 끝나고 즉시 출발하는 200m 전환 연습"] },
    { from: "2026-11-08", to: "2026-11-12", title: "테이퍼 (운동량 40~50% 감소)",
      items: ["강도는 유지하되 횟수를 절반으로: 400m × 4, 스테이션 짧게 1세트", "새 운동·무거운 하체 근력은 금지 (근육통이 대회까지 남음)", "신발·장갑·복장 실전과 똑같이 한 번 맞춰 보기", "순서·교대 위치·대기 동선 팀 공유"] },
    { from: "2026-11-13", to: "2026-11-14", title: "회복 · 탄수화물 로딩",
      items: ["20분 가벼운 조깅 + 가속주 4회, 가동성 운동", "탄수화물 위주 식사, 섬유질·기름진 음식 줄이기", "수면 8시간 이상, 음주 금지"] },
    { from: "2026-11-15", to: "2026-11-15", title: "레이스 데이",
      items: ["시작 3~4시간 전 식사, 45~60분 전 카페인(평소 먹던 사람만)", "내 구간 10분 전부터 동적 워밍업 5분, 대기 중 체온 유지", "첫 1km 과속 금지, 스테이션 끝나면 바로 출발"] },
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
        <li>시작 3~4시간 전 탄수화물 ${g(1, 2)} 식사 (흰밥+계란, 빵+잼+바나나)</li>
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
    $("formGrid").innerHTML = `<thead><tr><th>스테이션</th><th>선수</th><th>앞 달리기</th><th>스테이션</th><th>200m</th></tr></thead><tbody>` +
      D.stations.map((s, i) => `<tr><td class="st">${s.name}</td>
        <td><select id="f-a-${i}" aria-label="${s.name} 선수">${opts}</select></td>
        <td><input id="f-r8-${i}" placeholder="${s.runDist ? "3:40" : "3:05"}" aria-label="${s.name} 앞 달리기 ${s.runDist || 800}m" inputmode="numeric"></td>
        <td><input id="f-st-${i}" placeholder="4:00" aria-label="${s.name} 스테이션" inputmode="numeric"></td>
        <td><input id="f-r2-${i}" placeholder="0:50" aria-label="${s.name} 200m" inputmode="numeric"></td></tr>`).join("") + "</tbody>";
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
    extra.push({ label, legs, notes: [] });
    if (!saveExtra(extra)) {
      $("formMsg").textContent = "이 브라우저에서는 저장할 수 없습니다. JSON을 복사해 data.js에 직접 추가하세요.";
      return;
    }
    $("formMsg").textContent = `${label} 기록을 저장했습니다. 합계 ${fmt(legs.reduce((s, l) => s + legTotal(l), 0))}.`;
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
