const load = async ({ fetch }) => {
  try {
    const response = await fetch("/api/sources");
    return {
      sources: response.ok ? await response.json() : []
    };
  } catch {
    return { sources: [] };
  }
};
export {
  load
};
