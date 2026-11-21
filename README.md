# CodeQuest — Code. Solve. Level Up.

**CodeQuest** is a gamified programming learning platform that blends interactive coding challenges, progression mechanics (XP, levels, streaks, quests, boss battles), and adaptive AI tutoring into a futuristic coding adventure.

---

## Key Features

- **10 Learning Worlds & 52 Interactive Lessons**: Progress from *Programming Foundations* to *Interview Arena* with short concept cards and instant MCQ checks.
- **32+ Multi-Language Coding Challenges & Daily Challenge**: Built on Monaco Editor supporting JavaScript, Python, Java, C++, and C with live test-case validation.
- **Secure Sandboxed Execution**: Executes JavaScript inside an isolated Web Worker with shadowed network APIs and strict timeout guards, alongside deterministic educational subset transpilers for Python, C, C++, and Java.
- **AI Coding Tutor (Gemini API)**: Progressive 3-stage hint ladder (`Hint 1 -> Hint 2 -> Hint 3`) that guides learners without revealing full solutions unless explicitly requested.
- **6 Multi-Stage Boss Battles**: Escalating Easy -> Medium -> Hard coding encounters (e.g., *Robot Army*, *Recursion Hydra*, *Sentinel Gatekeeper*) with live boss HP bars.
- **1v1 Code Battles & 8 Project Quests**: Real-time competitive pacing duels and multi-checkpoint project builds.
- **XP, 10-Tier Leveling, Streaks & Achievements**: Earn XP from lessons, challenges, daily streaks, quests, and battles across 10 ranks (`Code Rookie` -> `Code Legend`).
- **Progress Analytics & Mistake Analyzer**: Recharts visualizations paired with AI-powered insights and categorized mistake tracking.
- **AI Personalized Learning Plan**: Generates a 5-week custom curriculum tailored to skill level, goal, weekly hours, and target deadline.

---

## Project Structure

```
├── index.html
├── metadata.json
├── package.json
├── server.ts                       # Express API server + Vite SSR/dev middleware
├── server/
│   ├── db.ts                       # SQLite persistence, scrypt auth, HMAC tokens, XP/streak engine
│   └── gemini.ts                   # Server-side @google/genai integration (Tutor, Plan, Insights)
├── supabase/
│   └── schema.sql                  # Production PostgreSQL + Supabase RLS schema
└── src/
    ├── App.tsx                     # Root application shell & navigation
    ├── index.css                   # Tailwind CSS v4 theme & design tokens
    ├── types/codequest.ts          # Domain TypeScript interfaces
    ├── data/
    │   ├── curriculum.ts           # 10 Worlds, 52 Lessons, 6 Bosses, Quests, Projects, Achievements
    │   └── challenges.ts           # 32 multi-language challenges + Daily Challenge selector
    ├── utils/
    │   ├── progression.ts          # Level thresholds, adaptive difficulty, mistake classifier
    │   ├── sandboxRunner.ts        # Isolated Web Worker JS runner & Python/C/C++/Java subset engines
    │   └── soundEffects.ts         # Web Audio API feedback synthesizer with mute toggle
    └── components/
        ├── LandingPage.tsx
        ├── AuthModal.tsx
        ├── OnboardingWizard.tsx
        ├── DashboardView.tsx
        ├── LearningWorldView.tsx
        ├── ChallengeArenaView.tsx
        ├── BossBattleView.tsx
        ├── CodeBattleView.tsx
        ├── ProjectQuestsView.tsx
        ├── CommunityProgressViews.tsx
        ├── AnalyticsAndPlanViews.tsx
        ├── ProfileAndSettingsViews.tsx
        ├── MonacoCodeEditor.tsx
        └── GameFeedbackOverlay.tsx
```

---

## Local Development

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env` and populate your keys:
   ```bash
   cp .env.example .env
   ```

3. **Run unit tests**:
   ```bash
   npx tsx --test src/utils/progression.test.ts src/utils/sandboxRunner.test.ts
   ```

4. **Start the development server** (runs Express API + Vite on port `3000`):
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`. Use **Demo Explorer** (`demo@codequest.dev` / `CodeQuest123!`) or sign up to create a fresh profile.

---

## Environment Variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | For AI Tutor / Plans / Insights | Server-side Gemini API key (`@google/genai`) |
| `APP_URL` | Optional | Public origin URL for OAuth callbacks & links |
| `SUPABASE_URL` | For Supabase production DB | Supabase project URL |
| `SUPABASE_ANON_KEY` | For Supabase production DB | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | For Supabase server routes | Server-only Supabase service role key |
| `GOOGLE_CLIENT_ID` | Optional | Enables Google OAuth sign-in when paired with secret |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth client secret |

---

## Supabase PostgreSQL Setup (Production)

The app runs out-of-the-box locally using persistent SQLite (`data/codequest.sqlite`) with zero external setup. To deploy against **Supabase PostgreSQL**:

1. Create a new Supabase project.
2. Open the **SQL Editor** in Supabase and run the entire schema script in [`supabase/schema.sql`](./supabase/schema.sql). This creates all 15 normalized tables (`users`, `profiles`, `courses`, `lessons`, `challenges`, `submissions`, `progress`, `achievements`, `user_achievements`, `quests`, `streaks`, `leaderboards`, `projects`, `mistakes`, `learning_plans`) with Row-Level Security (RLS) policies enabled.
3. Add `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to your hosting environment.

---

## Secure Code Execution Architecture

CodeQuest **never** executes untrusted learner code via `eval()`/`new Function()` on the browser main thread or on the Node.js Express server:

1. **JavaScript**: Runs inside an ephemeral `Blob` Web Worker (`src/utils/sandboxRunner.ts`) that shadows `fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`, and `navigator` inside strict mode, captures console logs, and terminates automatically on a `1500ms` timeout guard.
2. **Python, C, C++, Java**: Executed through an AST-like deterministic educational transpiler/subset evaluator inside the isolated sandbox before mapping test-case outputs.
3. **Production Scaling**: For full standard-library execution across Python, Java, C++, and C, route `/api/challenges/execute` to an isolated container runner (e.g., Judge0 CE, Piston, or Firecracker microVMs) with CPU/memory/network cgroups disabled.

---

## Build & Deployment

```bash
npm run build
npm run start
```

Deploy to any Node.js container host (Cloud Run, Fly.io, Railway, Render) with port `3000` exposed and `GEMINI_API_KEY` configured in runtime secrets.
