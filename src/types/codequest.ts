export type ProgrammingLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'cpp'
  | 'c'
  | 'go'
  | 'rust'
  | 'csharp'
  | 'kotlin'
  | 'swift'
  | 'ruby';

export type WorkspaceAmbience = 'nebula' | 'matrix' | 'synth' | 'obsidian';

export type ExperienceLevel =
  | 'Complete beginner'
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced';

export type LearningGoal =
  | 'Learn programming'
  | 'Prepare for interviews'
  | 'Learn DSA'
  | 'Build projects'
  | 'College studies';

export type DailyTimeBudget =
  | '15 minutes'
  | '30 minutes'
  | '1 hour'
  | '2+ hours';

export type DifficultyTier = 'Beginner' | 'Easy' | 'Intermediate' | 'Hard';

export type MistakeCategory =
  | 'Syntax'
  | 'Logic'
  | 'Loops'
  | 'Functions'
  | 'Arrays'
  | 'DSA';

export type NavSection =
  | 'dashboard'
  | 'learn'
  | 'challenges'
  | 'daily'
  | 'bosses'
  | 'battle'
  | 'projects'
  | 'leaderboard'
  | 'achievements'
  | 'mistakes'
  | 'analytics'
  | 'plan'
  | 'profile'
  | 'settings';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  name: string;
  avatarUrl: string;
  xp: number;
  level: number;
  levelTitle: string;
  currentStreak: number;
  longestStreak: number;
  totalActiveDays: number;
  preferredLanguage: ProgrammingLanguage;
  experienceLevel: ExperienceLevel;
  goal: LearningGoal;
  dailyTime: DailyTimeBudget;
  onboardingCompleted: boolean;
  adaptiveDifficulty: DifficultyTier;
  adaptiveNote: string;
  soundEnabled: boolean;
  unlockedCosmetics: string[];
  activeTitle: string;
  joinedAt: string;
}

export interface WorldItem {
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  themeColor: string;
  bossId?: string;
  requiredXp: number;
}

export interface LessonQuestion {
  prompt: string;
  codeSnippet?: string;
  language?: ProgrammingLanguage;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface LessonItem {
  id: string;
  worldId: string;
  order: number;
  title: string;
  concept: string;
  exampleCode: string;
  xpReward: number;
  durationMinutes: number;
  question: LessonQuestion;
}

export interface ChallengeTestCase {
  id: string;
  description: string;
  functionCall: string;
  args: unknown[];
  expectedOutput: string;
}

export interface ChallengeItem {
  id: string;
  worldId: string;
  title: string;
  description: string;
  difficulty: DifficultyTier;
  topic: MistakeCategory;
  xpReward: number;
  estimatedMinutes: number;
  functionName: string;
  starterCode: Record<ProgrammingLanguage, string>;
  testCases: ChallengeTestCase[];
  hints: string[];
  sampleSolution: Record<ProgrammingLanguage, string>;
}

export interface BossStage {
  stageNumber: 1 | 2 | 3;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  challengeId: string;
  dialogue: string;
}

export interface BossBattleItem {
  id: string;
  worldId: string;
  name: string;
  title: string;
  description: string;
  imageUrl: string;
  xpReward: number;
  badgeName: string;
  stages: BossStage[];
}

export interface AchievementItem {
  id: string;
  title: string;
  description: string;
  category: string;
  xpBonus: number;
  badgeIcon: string;
  requirementType:
    | 'first_code'
    | 'first_perfect'
    | 'streak_7'
    | 'xp_100'
    | 'xp_500'
    | 'challenges_10'
    | 'mistakes_resolved'
    | 'lessons_10'
    | 'boss_1'
    | 'level_10'
    | 'project_1'
    | 'battle_win';
  requirementValue: number;
}

export interface QuestItem {
  id: string;
  title: string;
  description: string;
  cadence: 'daily' | 'weekly';
  metric: 'challenges' | 'xp' | 'lessons' | 'daily_challenge' | 'boss';
  target: number;
  xpReward: number;
  cosmeticReward?: string;
}

export interface ProjectQuestItem {
  id: string;
  title: string;
  description: string;
  difficulty: DifficultyTier;
  xpReward: number;
  badgeName: string;
  requiredLessons: number;
  language: ProgrammingLanguage;
  checkpoints: string[];
  starterCode: string;
  validationFunction: string;
  testCases: ChallengeTestCase[];
}

export interface MistakeRecord {
  id: string;
  userId: string;
  challengeId: string;
  challengeTitle: string;
  category: MistakeCategory;
  summary: string;
  codeSnippet: string;
  recommendedChallengeId: string;
  resolved: boolean;
  occurrences: number;
  createdAt: string;
}

export interface SubmissionRecord {
  id: string;
  challengeId: string;
  language: ProgrammingLanguage;
  passed: boolean;
  passedCount: number;
  totalCount: number;
  executionMs: number;
  hintsUsed: number;
  xpEarned: number;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  name: string;
  avatarUrl: string;
  xp: number;
  weeklyXp: number;
  level: number;
  levelTitle: string;
  streak: number;
  isFriend: boolean;
  isCurrentUser?: boolean;
}

export interface LearningPlanWeek {
  week: number;
  title: string;
  focusTopics: string[];
  tasks: string[];
  completed: boolean;
}

export interface LearningPlan {
  id: string;
  currentSkill: string;
  goal: string;
  hoursPerWeek: number;
  deadline: string;
  summary: string;
  weeks: LearningPlanWeek[];
  createdAt: string;
}

export interface UserStatePayload {
  profile: UserProfile;
  completedLessonIds: string[];
  solvedChallengeIds: string[];
  defeatedBossIds: string[];
  completedProjectIds: string[];
  unlockedAchievementIds: string[];
  claimedQuestIds: string[];
  dailyChallengeCompletedDate: string | null;
  weeklyActivity: { date: string; dayLabel: string; count: number; xp: number }[];
  questProgress: Record<string, number>;
  submissions: SubmissionRecord[];
  mistakes: MistakeRecord[];
  learningPlan: LearningPlan | null;
  battleWins: number;
}

export interface ExecutionTestResult {
  testCaseId: string;
  description: string;
  inputDisplay: string;
  expectedOutput: string;
  actualOutput: string;
  passed: boolean;
  error?: string;
}

export interface SandboxExecutionResult {
  passedAll: boolean;
  passedCount: number;
  totalCount: number;
  stdout: string;
  executionMs: number;
  runtimeLabel: string;
  results: ExecutionTestResult[];
  compileOrRuntimeError?: string;
}

export interface TutorMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  hintLevel?: number;
  timestamp: string;
}
