import {
  createContext,
  useContext,
} from 'react'

export interface PlannedFeatureNotice {
  title: string
  message: string
}

export interface PlannedFeatureContextValue {
  showPlannedFeature: (
    notice: PlannedFeatureNotice,
  ) => void
}

export const PlannedFeatureContext =
  createContext<PlannedFeatureContextValue | null>(
    null,
  )

export function usePlannedFeature() {
  const context = useContext(
    PlannedFeatureContext,
  )

  if (!context) {
    throw new Error(
      'usePlannedFeature must be used within PlannedFeatureProvider.',
    )
  }

  return context
}