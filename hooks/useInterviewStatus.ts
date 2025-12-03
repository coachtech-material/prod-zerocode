"use client";

import { useEffect, useRef, useState } from 'react';

type InterviewStatusResponse = {
  interview_completed?: boolean;
};

function parseStatus(payload: InterviewStatusResponse | null | undefined): boolean {
  return Boolean(payload && payload.interview_completed);
}

export function useInterviewStatus(initial: boolean): boolean {
  const [interviewCompleted, setInterviewCompleted] = useState<boolean>(initial);
  const initialRef = useRef(initial);

  useEffect(() => {
    if (initialRef.current !== initial) {
      initialRef.current = initial;
      setInterviewCompleted(initial);
    }
  }, [initial]);

  useEffect(() => {
    if (interviewCompleted) {
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/interview-status', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as InterviewStatusResponse;
        if (!cancelled) {
          const next = parseStatus(data);
          if (next) {
            setInterviewCompleted(true);
            return;
          }
        }
      } finally {
        if (!cancelled) {
          timer = setTimeout(fetchStatus, 15000);
        }
      }
    };

    fetchStatus();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [interviewCompleted]);

  return interviewCompleted;
}
