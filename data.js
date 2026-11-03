// 팀 기록 데이터. 새 측정을 추가하려면 rounds 배열에 같은 형식으로 한 회차를 덧붙이면 된다.
// 시간은 "분:초" 문자열. 기록이 없는 칸은 null.
// run800은 스테이션 앞 달리기(기본 800m, 스키 구간은 1000m). 거리가 다르면 runDist로 적는다.
window.HYROX_DATA = {
  event: { name: "HYROX 혼성 릴레이", date: "2026-11-15" },
  goal: "60:00",

  athletes: [
    { id: "성택", color: "#2f6fde" },
    { id: "현정", color: "#d4473a" },
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
  ],

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
