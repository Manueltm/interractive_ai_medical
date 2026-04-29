// utils/formatAiExplanation.ts
export const formatAiExplanation = (text: string): string => {
  if (!text) return '';
  
  return text
    .split('\n')
    .filter(line => line.trim().length > 0)
    .map(line => {
      // Clean the line and convert markdown bold to HTML
      return line
        .trim()
        .replace(/^[0-9️⃣🔸•]+[\.\s]*/, '')
        .replace(/^[-*]\s*/, '')
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-amber-900">$1</strong>');
    })
    .join('</li><li>');
};