export function flattenLatestRow(
  latest: Record<string, unknown> | null | undefined
): Record<string, unknown> {
  if (!latest) {
    return {};
  }

  const flat: Record<string, unknown> = { ...latest };

  if ("should_alert" in latest) {
    const deviationBps = latest.deviation_bps;
    const bridgeDeviationBps = latest.bridge_deviation_bps;
    const thresholdBps = latest.threshold_bps ?? 50;
    const shouldAlert = latest.should_alert;

    flat.alert_summary =
      shouldAlert === true
        ? `Alert condition met (deviation ${deviationBps ?? "?"} bps, bridge ${bridgeDeviationBps ?? "?"} bps; threshold ${thresholdBps} bps)`
        : "No alert condition met";
  }

  return flat;
}
