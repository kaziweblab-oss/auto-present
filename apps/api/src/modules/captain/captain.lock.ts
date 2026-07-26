const attendanceLocks = new Map<string, Promise<void>>();

export async function withAttendanceLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const previous = attendanceLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  attendanceLocks.set(key, current);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (attendanceLocks.get(key) === current) attendanceLocks.delete(key);
  }
}

export function resetAttendanceLocksForTests(): void {
  attendanceLocks.clear();
}
