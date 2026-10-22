/** A fixed clock can be used for recording the demo at a stable daytime. */
export function demoNow(): Date {
  const fixed = process.env.DEMO_NOW;
  if (fixed) {
    const date = new Date(fixed);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return new Date();
}
