// Diagnostic shortcuts from the health/incident modals (spec: symptom search + visual ID).
export function googleSearch(item: string, issue: string): void {
  if (!issue) {
    window.alert("Select or type an issue first");
    return;
  }
  const q = encodeURIComponent(`Ravia Farms ${item} ${issue} symptoms and treatment`);
  window.open(`https://www.google.com/search?q=${q}`, "_blank");
}

export function googleLens(): void {
  window.open("https://lens.google.com/upload", "_blank");
}
