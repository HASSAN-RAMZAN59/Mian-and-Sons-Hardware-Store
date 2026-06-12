import React, { useEffect, useMemo, useState } from 'react';

const getTimeLeft = (targetDate) => {
  const distance = new Date(targetDate).getTime() - Date.now();

  if (Number.isNaN(distance) || distance <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, completed: true };
  }

  return {
    days: Math.floor(distance / (1000 * 60 * 60 * 24)),
    hours: Math.floor((distance / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((distance / (1000 * 60)) % 60),
    seconds: Math.floor((distance / 1000) % 60),
    completed: false
  };
};

const pad = (value) => String(value).padStart(2, '0');

const CountdownTimer = ({ targetDate, label = 'Offer ends in:', compact = false, className = '' }) => {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    setTimeLeft(getTimeLeft(targetDate));

    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const text = useMemo(() => {
    if (timeLeft.completed) return '00:00:00';
    if (compact) return `${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
    return `${pad(timeLeft.days)}:${pad(timeLeft.hours)}:${pad(timeLeft.minutes)}:${pad(timeLeft.seconds)}`;
  }, [compact, timeLeft]);

  if (compact) {
    return <span className={className}>{text}</span>;
  }

  return (
    <div className={className}>
      <span className="text-sm text-gray-200">{label}</span>
      <span className="ml-2 font-bold tracking-wide">{text}</span>
    </div>
  );
};

export default CountdownTimer;