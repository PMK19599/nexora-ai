export const formatDate = (d: string | Date) => new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(d));
export const getInitials = (n: string) => n.split(' ').map(x => x[0]).join('').toUpperCase().substring(0, 2);
export const getMasteryColor = (m: number) => m >= 80 ? 'text-green-600' : m >= 50 ? 'text-yellow-600' : 'text-red-600';
export const speak = (text: string, speed = 1) => { if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(text); u.rate = speed; window.speechSynthesis.speak(u); } };
export const stopSpeaking = () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };

export const getPreferenceLabel = (type?: string): string | null => {
  if (!type) return null;
  const normalized = type.toLowerCase().trim();
  switch (normalized) {
    case 'focus':
    case 'adhd':
      return 'Focus-Friendly';
    case 'predictable':
    case 'autism':
      return 'Predictable Layout';
    case 'reading':
    case 'dyslexia':
      return 'Reading-Friendly';
    default:
      return null;
  }
};

export const normalizePreferenceType = (type?: string): 'focus' | 'predictable' | 'reading' | 'none' => {
  if (!type) return 'none';
  const normalized = type.toLowerCase().trim();
  switch (normalized) {
    case 'adhd':
    case 'focus':
      return 'focus';
    case 'autism':
    case 'predictable':
      return 'predictable';
    case 'dyslexia':
    case 'reading':
      return 'reading';
    default:
      return 'none';
  }
};
