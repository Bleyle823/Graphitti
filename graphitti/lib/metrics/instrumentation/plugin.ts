export async function withPluginMetrics<T>(
  _options: unknown,
  run: () => Promise<T>
): Promise<T> {
  return run();
}
