# 🎰 럭키 7 슬롯 (게임 1: 클래식 슬롯)

아이폰 Safari에서 **설치 없이 바로** 플레이하는 클래식 3릴 슬롯 웹게임입니다.
**가상 코인 전용** — 실제 돈, 결제, 환전 기능은 없습니다.

- 빌드 과정 없는 순수 HTML/CSS/JS → GitHub Pages에 그대로 올리면 끝
- PWA: Safari 공유 → "홈 화면에 추가" 하면 앱처럼 전체화면 실행
- 이미지/효과음/BGM/영상 모두 자체 제작 (재생성 스크립트 포함)

## 폴더 구조
```
index.html              화면 구조
manifest.webmanifest    PWA 설정 (홈 화면 추가)
sw.js                   오프라인 캐시 (네트워크 우선)
css/style.css           디자인 (색상은 :root 변수)
js/config.js            ★ 모든 튜닝 값: 심볼, 릴 가중치(확률), 배당표, 베팅, 재화, 보너스, 레벨
js/engine.js            순수 게임 로직 (스핀/판정/니어미스) — 브라우저와 시뮬레이터 공용
js/reels.js             릴 애니메이션 (블러, 바운스, 니어미스 감속)
js/economy.js           코인/젬/레벨/출석/시간당 보너스/저장(localStorage)
js/audio.js             Web Audio 재생, iOS 첫 탭 잠금 해제, 진동(haptic)
js/effects.js           코인비, 컨페티, 불꽃, 화면 흔들림, 숫자 카운트업
js/ui.js                메인 흐름 (스핀, 당첨 연출, 모달, 버튼)
assets/img              심볼/배경/아이콘 (WebP·PNG)
assets/src              이미지 원본 (AI 생성 원본 JPG)
assets/sfx, assets/bgm  효과음·배경음악 (MP3)
assets/video            잭팟 연출 영상 (H.264 MP4, 무음 자동재생)
scripts/                재생성/검증 스크립트
docs-screens/           스크린샷
```

## 게임 규칙
- 3릴 × 3행, 5라인 (가운데·위·아래·대각선 2개). 라인 베팅 = 총 베팅 ÷ 5
- 와일드: 보너스 외 대체 / 와일드 3개 = **잭팟**
- 체리 2개(1·2번 릴): 소당첨 (자주 터짐)
- 보너스(스캐터) 3개: 프리스핀 10회, 당첨 x2 (재발동 가능)
- 연승 배수: 3연승 x1.2 → 4연승 x1.5 → 5연승+ x2
- 니어미스: 1·2번 릴에 고배당 심볼/보너스 2개가 맞으면 3번 릴이 느려지며 긴장감 연출
- 당첨 등급: BIG(10x) / MEGA(30x) / EPIC(80x) / JACKPOT

## 재화 시스템
코인(메인), 젬(게임 내에서만 획득: 레벨업·출석·큰 당첨 → 상점에서 코인으로 교환),
출석 보상(7일 연속), 1시간마다 무료 코인, 레벨/경험치(베팅 시 획득, 레벨업 보상, 베팅 단계 해금),
코인 부족 시 구조 코인, 메뉴에서 초기화.

## 확률/배당 조정 방법
1. `js/config.js` 수정
   - `reelWeights`: 릴별 심볼 개수(가중치). 높을수록 자주 등장
   - `paytable`: 3개 일치 배당 (라인 베팅 배수)
   - `cherryTwo`, `scatter`, `streakMultipliers`, `winTiers`
2. 시뮬레이션으로 환수율 확인:
   ```bash
   node scripts/simulate.js 5000000
   ```
   현재 설정 결과(500만 스핀): **RTP ≈ 95.7%, 당첨률 ≈ 35.6%**, 프리스핀 1/475, 잭팟 1/7,788
3. 목표 RTP는 94~97% 권장. 100% 이상이면 코인이 무한히 늘어납니다.

## 에셋 재생성
```bash
python3 scripts/process_images.py   # assets/src → assets/img (배경 제거, 리사이즈)
python3 scripts/gen_audio.py        # 효과음 + BGM 합성 (numpy, ffmpeg)
python3 scripts/gen_video.py        # 잭팟 영상 (Pillow, ffmpeg)
```

## 로컬 실행
```bash
python3 -m http.server 8080
# 브라우저에서 http://localhost:8080  (같은 와이파이의 아이폰: http://<PC IP>:8080)
```
※ `file://`로 직접 열면 오디오 로딩이 안 됩니다. 반드시 서버로 여세요.

## GitHub Pages 배포
1. GitHub에 저장소 생성 후 push
2. Settings → Pages → Source: `Deploy from a branch`, Branch: `main` / `(root)`
3. `https://<아이디>.github.io/<저장소명>/` 를 아이폰 Safari로 열기 → 공유 → 홈 화면에 추가

## 테스트
`scripts/screenshot_test.js` (Playwright): 390×844 아이폰 화면으로 로드, 콘솔 에러 확인, 스크린샷 저장.
