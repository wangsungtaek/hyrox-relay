// 팀 기록 데이터. 새 측정을 추가하려면 rounds 배열에 같은 형식으로 한 회차를 덧붙이면 된다.
// 시간은 "분:초" 문자열. 기록이 없는 칸은 null.
// run800은 스테이션 앞 달리기(기본 800m, 스키 구간은 1000m). 거리가 다르면 runDist로 적는다.
window.HYROX_DATA = {
  event: { name: "HYROX 혼성 릴레이", date: "2026-11-15", start: "18:50" }, // 출발 시각 (한국 시간)
  goal: "60:00",

  athletes: [
    { id: "성택", color: "#2f6fde" },
    { id: "현정", color: "#7b52c9" },
    { id: "유진", color: "#1f9d6b" },
    { id: "진우", color: "#b07a12" },
  ],

  // 대회 순서대로
  stations: [
    { id: "ski", name: "스키", en: "SkiErg 1000m", runDist: 1000 },
    { id: "push", name: "푸시", en: "Sled Push 50m" },
    { id: "pull", name: "풀", en: "Sled Pull 50m" },
    { id: "burpee", name: "버피", en: "Burpee Broad Jump 80m" },
    { id: "row", name: "로잉", en: "Row 1000m" },
    { id: "carry", name: "캐리", en: "Farmers Carry 200m" },
    { id: "lunge", name: "런지", en: "Sandbag Lunges 100m" },
    { id: "wallball", name: "월볼", en: "Wall Balls 100회" },
  ],

  // 각 구간: 800m 달리기 → 스테이션 → 200m 달리기 (스키 구간만 앞 달리기 1000m)
  rounds: [
    {
      label: "1차",
      legs: [
        { a: "성택", run800: "4:00", runDist: 1200, station: "4:37", run200: null },
        { a: "현정", run800: "3:18", station: "1:58", run200: "1:10" },
        { a: "유진", run800: "3:05", station: "4:40", run200: "0:49" },
        { a: "성택", run800: "3:39", station: "5:35", run200: "1:25" },
        { a: "진우", run800: "3:11", station: "4:22", run200: "1:04" },
        { a: "유진", run800: "3:05", station: "1:42", run200: "0:49" },
        { a: "진우", run800: "3:20", station: "4:45", run200: "1:08" },
        { a: "현정", run800: "3:32", station: "6:29", run200: "1:12" },
      ],
      notes: [
        "스키 구간은 달리기 1200m를 한 번에 뛰어서 200m 기록이 따로 없음",
        "런지 구간: 보드에 합계 9:23으로 적혀 있지만 구간 합은 9:13이라 9:13을 사용",
      ],
    },
    {
      label: "2차",
      legs: [
        { a: "성택", run800: "3:52", station: "4:10", run200: "0:41" },
        { a: "현정", run800: "3:24", station: "2:33", run200: "1:09" },
        { a: "유진", run800: "2:57", station: "4:14", run200: "0:50" },
        { a: "진우", run800: "3:16", station: "5:10", run200: "1:01" },
        { a: "성택", run800: "2:46", station: "4:02", run200: "0:56" },
        { a: "현정", run800: "3:40", station: "2:24", run200: "0:52" },
        { a: "진우", run800: "3:33", station: "4:38", run200: "1:05" },
        { a: "유진", run800: "3:20", station: "4:20", run200: "0:58" },
      ],
      notes: [],
    },
    {
      label: "3차",
      legs: [
        { a: "진우", run800: "3:48", station: "4:16", run200: "0:57" },
        { a: "현정", run800: "3:14", station: "1:49", run200: "0:58" },
        { a: "유진", run800: "2:53", station: "4:02", run200: "0:48" },
        { a: "성택", run800: "2:50", station: "3:29", run200: "0:53" },
        { a: "진우", run800: "3:09", station: "4:10", run200: "1:01" },
        { a: "현정", run800: "3:13", station: "1:53", run200: "0:41" },
        { a: "성택", run800: "3:14", station: "5:31", run200: "0:54" },
        { a: "유진", run800: "3:02", station: "4:06", run200: "0:56" },
      ],
      notes: [
        "보드 최종 합계는 62:47이지만 구간 합은 61:47이라 61:47을 사용 (1분 차이, 확인 필요)",
      ],
    },
    {
      label: "4차",
      date: "2026-11-09",
      // 모든 구간 앞 600m + 뒤 400m (스키 포함). 월볼만 앞 800m 후 스테이션으로 끝.
      runDist: 600,
      run2Dist: 400,
      legs: [
        { a: "진우", run800: "2:30", station: "3:58", run200: "1:52" },
        { a: "현정", run800: "2:23", station: "1:34", run200: "2:04" },
        { a: "유진", run800: "2:19", station: "3:57", run200: "1:37" },
        { a: "성택", run800: "2:12", station: "2:34", run200: "1:54" },
        { a: "진우", run800: "2:32", station: "4:03", run200: "1:54" },
        { a: "현정", run800: "2:27", station: "1:42", run200: "1:32" },
        { a: "유진", run800: "2:41", station: "3:05", run200: "1:42" },
        { a: "성택", run800: "3:14", runDist: 800, station: "5:12", run200: null },
      ],
      notes: [
        "11월 9일 시뮬레이션. 앞 600m + 뒤 400m 형식 (1~3차는 800m+200m, 스키만 1000m+200m)",
        "월볼 구간은 앞 800m 후 스테이션으로 끝 (뒤 달리기 없음). 달리기 총 7.8km",
      ],
    },
  ],

  // 혼성 릴레이 티어 (S/A/B 상한, 넘으면 C). 조사 근거는 tierSources 참고.
  // 스테이션: Rox Lyfe 개인전 엘리트·평균(약 90분대) 기록을 남녀 평균 → S=엘리트, B=평균, A=중간값.
  // 혼성 릴레이는 남녀 2명씩이고 한 사람이 스테이션 2개만 하므로 이 기준이 대체로 맞는다.
  tiers: {
    finish: { S: "54:00", A: "65:00", B: "80:00" },
    runPerKm: { S: "3:45", A: "4:15", B: "4:55" },
    station: {
      ski: { S: "4:00", A: "4:17", B: "4:34" },
      push: { S: "2:53", A: "3:18", B: "3:44" },
      pull: { S: "3:34", A: "5:04", B: "6:34" },
      burpee: { S: "2:46", A: "3:55", B: "5:04" },
      row: { S: "4:14", A: "4:34", B: "4:54" },
      carry: { S: "1:47", A: "2:13", B: "2:39" },
      lunge: { S: "3:19", A: "4:21", B: "5:24" },
      wallball: { S: "4:08", A: "5:34", B: "6:59" },
    },
    // 실제 혼성 릴레이 록스존(교대·이동) 시간 예
    roxzone: [
      { label: "서울 2025 혼성 릴레이 (1:14:01, 112팀 중 48위)", time: "5:47" },
      { label: "인천 2024 혼성 릴레이 (1:23:25, 39팀 중 29위)", time: "7:03" },
    ],
  },
  tierSources: [
    { label: "Rox Lyfe – HYROX Average vs Elite 종목별 기록", url: "https://roxlyfe.com/hyrox-from-average-to-elite/" },
    { label: "Hyranking – 서울 2025 혼성 릴레이 결과", url: "https://hyranking.com/result/seoul-2025-LR3MS4JI40569A" },
    { label: "Hyranking – 인천 2024 혼성 릴레이 결과", url: "https://hyranking.com/result/incheon-2024-JGDMS4JIAD44C" },
    { label: "Gym Mikolo – HYROX 릴레이 형식·평균 기록", url: "https://gym-mikolo.com/blogs/guides/hyrox-relay-format-rules-weights-and-team-training" },
    { label: "HYROX DataLab – 종목별 평균 기록", url: "https://hyroxdatalab.com/articles/average-hyrox-station-times" },
  ],

  // 대회 코스: HYROX Seoul 2026 (KINTEX) 릴레이 흐름
  // 위치·흐름: HYROX 공식 경기장 지도. 미터 거리: roxlapper.com 실측(한 바퀴 560m, 스테이션별 록스존 합계)을
  // 공식 지도 비율로 나눈 추정치 (2026-11-09 확인).
  // 구간: 처음 달리기(run) → 록스존 진입(in) → 스테이션 → 록스존 퇴장(out) → 교대 구역까지 달리기(toTZ)
  course: {
    name: "HYROX Seoul 2026 · KINTEX",
    mapUrl: "https://hyrox.com/wp-content/uploads/2026/11/13-15-November-1.pdf",
    eventUrl: "https://hyrox.com/event/hyrox-seoul/",
    url: "https://roxlapper.com/seoul/2026-11-13",
    lapM: 560,
    rule: "\"IN\"을 두 번째로 볼 때 진입",
    legs: [
      { run: 590, in: 10, out: 180, toTZ: 320, from: "출발 터널" },
      { run: 630, in: 15, out: 180, toTZ: 320 },
      { run: 630, in: 50, out: 125, toTZ: 320 },
      { run: 630, in: 90, out: 80, toTZ: 320 },
      { run: 630, in: 105, out: 65, toTZ: 320 },
      { run: 630, in: 130, out: 60, toTZ: 320 },
      { run: 630, in: 150, out: 45, toTZ: 320 },
      { run: 630, in: 150, out: 0, toTZ: 15, to: "결승선 (팀원 4명 함께)" },
    ],
  },

  // 1시간 언더용 목표 스플릿. 선수(a)는 다음 측정 배치.
  // 런지 성택→유진, 월볼 유진→성택으로 변경 (두 사람 모두 첫 시도라 목표는 임시)
  target: [
    { a: "진우", run800: "3:35", station: "4:10", run200: "0:50" },
    { a: "현정", run800: "3:10", station: "1:49", run200: "0:50" },
    { a: "유진", run800: "2:53", station: "3:55", run200: "0:45" },
    { a: "성택", run800: "2:50", station: "3:29", run200: "0:50" },
    { a: "진우", run800: "3:05", station: "4:05", run200: "0:52" },
    { a: "현정", run800: "3:10", station: "1:50", run200: "0:41" },
    { a: "유진", run800: "3:00", station: "4:45", run200: "0:50" },
    { a: "성택", run800: "3:05", station: "4:10", run200: "0:50" },
  ],
};
