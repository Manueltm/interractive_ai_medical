"use client";

import { useState } from "react";

export function useActionState<S, F = any>(
  action: (formData: F) => Promise<S>, // only formData
  initialState: S
): [S, (formData: F) => void] {
  const [state, setState] = useState<S>(initialState);

  const formAction = async (formData: F) => {
    const newState = await action(formData); // only formData
    setState(newState);
  };

  return [state, formAction];
}
