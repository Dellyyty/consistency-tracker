'use client';

import { useEffect, useState } from 'react';
import { MOTIVATIONAL_MESSAGES } from '@/lib/constants';

interface MotivationalBannerProps {
  percentage: number;
}

export default function MotivationalBanner({ percentage }: MotivationalBannerProps) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    let category: keyof typeof MOTIVATIONAL_MESSAGES;
    if (percentage === 100) category = 'perfect';
    else if (percentage >= 75) category = 'great';
    else if (percentage >= 50) category = 'good';
    else if (percentage > 0) category = 'low';
    else category = 'none';

    const messages = MOTIVATIONAL_MESSAGES[category];
    setMessage(messages[Math.floor(Math.random() * messages.length)]);
  }, [percentage]);

  if (!message) return null;

  return (
    <div className="rounded-xl bg-surface p-4 text-center">
      <p className="text-sm italic text-muted">&ldquo;{message}&rdquo;</p>
    </div>
  );
}
