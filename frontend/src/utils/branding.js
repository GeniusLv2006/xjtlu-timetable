export const DEFAULT_INSTANCE_NAME = 'Timetable Toolkit for XJTLU Students'
export const DEFAULT_COMPACT_INSTANCE_NAME = 'Timetable Toolkit'
export const LEGACY_DEFAULT_INSTANCE_NAME = 'XJTLU Timetable'

export function compactInstanceName(instanceName) {
  if (
    instanceName === DEFAULT_INSTANCE_NAME ||
    instanceName === LEGACY_DEFAULT_INSTANCE_NAME
  ) {
    return DEFAULT_COMPACT_INSTANCE_NAME
  }
  return instanceName
}
