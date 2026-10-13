export type Mood = 'neutral' | 'happy' | 'curious' | 'surprised';

const SURPRISED_WORDS = /\b(wow|whoa|no way|incredible|amazing|unbelievable|surprising|surprisingly|astonishing|shocking)\b/i;
const HAPPY_WORDS = /\b(great|love|awesome|nice|exactly|glad|happy|fantastic|wonderful|perfect|excellent|brilliant|enjoy|fun|good)\b/i;
// Only the latest words count, so the expression follows the sentence being spoken
const RECENT_CHARACTERS = 120;

// Reads the tone of what is being said so the characters can show it on their faces
export const detectMood = (text: string): Mood => {
    const recent = text.slice(-RECENT_CHARACTERS);
    if (!recent.trim()) return 'neutral';

    if (SURPRISED_WORDS.test(recent)) return 'surprised';
    if (recent.trimEnd().endsWith('?')) return 'curious';
    if (HAPPY_WORDS.test(recent) || recent.includes('!')) return 'happy';
    return 'neutral';
};
