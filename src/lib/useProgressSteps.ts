"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Cycles through a list of progress labels while `active` is true.
 * Gives users a sense of forward momentum during long API calls.
 *
 * Returns the current label, the step index, and an elapsed‐seconds counter.
 */
export function useProgressSteps(
  active: boolean,
  steps: string[],
  intervalMs = 3500
) {
  const [currentStep, setCurrentStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startTime = useRef(0);

  // Reset when activation starts; advance through steps on a timer
  useEffect(() => {
    if (!active) {
      setCurrentStep(0);
      setElapsed(0);
      return;
    }

    startTime.current = Date.now();

    // Advance step
    const stepTimer = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }, intervalMs);

    // Tick elapsed counter every second
    const clockTimer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(stepTimer);
      clearInterval(clockTimer);
    };
  }, [active, steps.length, intervalMs]);

  return {
    step: currentStep,
    label: steps[currentStep] ?? steps[0],
    elapsed,
    total: steps.length,
    progress: steps.length > 1 ? (currentStep / (steps.length - 1)) * 100 : 0,
  };
}