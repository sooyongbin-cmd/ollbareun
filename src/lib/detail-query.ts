export function optionalDetailId(params: URLSearchParams, name: string): string | undefined {
  if (!params.has(name)) return undefined;
  const id = params.get(name)?.trim();
  if (!id || id.length > 128) throw new Error(`${name} 값을 확인하세요.`);
  return id;
}
