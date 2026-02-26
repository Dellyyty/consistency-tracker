export interface User {
  id: string;
  pin_hash: string;
  pin_salt: string;
  display_name: string;
  timezone: string;
  check_in_times: string[]; // ["07:00", "12:00", "20:00"]
  start_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  sort_order: number;
  created_at: string;
  removed_at: string | null;
}

export interface CheckIn {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  session_number: number; // 1, 2, or 3
  completed_at: string;
}

export interface Completion {
  id: string;
  check_in_id: string;
  task_id: string;
  completed: boolean;
}

// Computed types
export interface SessionStatus {
  sessionNumber: number;
  label: string;
  time: string;
  status: 'completed' | 'available' | 'upcoming' | 'missed';
  checkIn?: CheckIn;
  completions?: Completion[];
}

export interface DayStats {
  date: string;
  totalTasks: number;
  completedTasks: number;
  percentage: number;
  sessions: SessionStatus[];
}

export interface TaskStats {
  task: Task;
  totalPossible: number;
  totalCompleted: number;
  percentage: number;
}

export interface OverallStats {
  today: number;
  week: number;
  month: number;
  allTime: number;
  currentStreak: number;
  longestStreak: number;
  totalCheckIns: number;
  totalPossibleCheckIns: number;
}
