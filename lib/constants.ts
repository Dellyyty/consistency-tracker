export const SUMMER_DATE = '2026-06-20';

export const SESSION_LABELS = ['Morning', 'Midday', 'Evening'] as const;

export const MOTIVATIONAL_MESSAGES = {
  perfect: [
    "Flawless execution. You're built different.",
    "100% today. Champions don't take days off.",
    "Perfect score. The grind doesn't lie.",
    "Every box checked. This is what discipline looks like.",
  ],
  great: [
    "Strong day. Keep that momentum rolling.",
    "Almost perfect — you're dialed in.",
    "Crushing it. Tomorrow, finish even stronger.",
    "That's the energy. Consistency compounds.",
  ],
  good: [
    "Solid effort. Progress over perfection.",
    "You showed up. That's more than most.",
    "Good day. Stack enough of these and you're unstoppable.",
    "Halfway there and still going. Respect.",
  ],
  low: [
    "Rough day? Tomorrow's a fresh start.",
    "Even 1% beats 0%. You showed up.",
    "The streak doesn't end unless you quit.",
    "Bad days build character. Get back at it.",
  ],
  none: [
    "Day's not over yet. Go check in.",
    "No check-ins today. There's still time.",
    "The only bad workout is the one that didn't happen.",
  ],
} as const;

export const DEFAULT_CHECK_IN_TIMES = ['07:00', '12:00', '20:00'];

export const TASK_EMOJIS = [
  '💪', '🏃', '📚', '🧘', '💧', '🥗', '💤', '📝',
  '🎯', '🧠', '💊', '🚫', '☀️', '🔥', '✅', '⭐',
  '🏋️', '🍎', '📖', '🧹', '💰', '🎨', '🎵', '🌿',
];
