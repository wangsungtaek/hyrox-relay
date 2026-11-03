# 820팀 릴레이 로그

820팀 HYROX 혼성 릴레이(2026.11.15) 기록과 1시간 언더 준비 대시보드. 빌드 과정 없는 정적 사이트라 GitHub Pages에 그대로 올리면 됩니다.

## 파일

| 파일 | 내용 |
| --- | --- |
| `index.html` | 페이지 구조 |
| `style.css` | 스타일 (라이트/다크 자동) |
| `app.js` | 계산·차트·분석 |
| `data.js` | **팀 기록 데이터 — 기록 추가는 여기만 고치면 됨** |

## GitHub Pages 배포

1. GitHub에서 새 저장소를 만듭니다 (예: `hyrox-relay`).
2. 이 폴더에서:

```bash
git init && git add . && git commit -m "HYROX relay log"
```

```bash
git branch -M main && git remote add origin https://github.com/<계정>/hyrox-relay.git && git push -u origin main
```

3. 저장소 **Settings → Pages → Build and deployment**에서 Source를 `Deploy from a branch`, Branch를 `main` / `/ (root)`로 저장합니다.
4. 1~2분 뒤 `https://<계정>.github.io/hyrox-relay/` 에서 열립니다.

## 새 기록 추가

- **팀 모두가 보게 하려면**: `data.js`의 `rounds` 배열 끝에 회차를 하나 추가하고 커밋·푸시합니다. GitHub 웹에서 `data.js`를 바로 편집해도 됩니다.
- **페이지에서 입력**: 하단 "새 기록 추가" 폼으로 입력하면 그 브라우저에만 저장됩니다. "JSON 복사" 버튼으로 복사한 내용을 `data.js`의 `rounds`에 붙여 넣으면 공유됩니다.

```js
{
  label: "4차",
  legs: [
    { a: "진우", run800: "3:30", station: "4:10", run200: "0:50" }, // 스키
    // ... 푸시, 풀, 버피, 로잉, 캐리, 런지, 월볼 순서로 8개
  ],
  notes: [],
},
```

## 로컬에서 보기

```bash
python3 -m http.server 8765
```
