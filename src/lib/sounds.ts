const SOUNDS = {
  click: 'https://d35aaqx5ub95lt.cloudfront.net/sounds/click.mp3',
  correct: 'https://d35aaqx5ub95lt.cloudfront.net/sounds/correct.mp3',
  incorrect: 'https://d35aaqx5ub95lt.cloudfront.net/sounds/incorrect.mp3',
  complete: 'https://d35aaqx5ub95lt.cloudfront.net/sounds/lesson-complete.mp3',
  streak: 'https://d35aaqx5ub95lt.cloudfront.net/sounds/streak.mp3',
};

class SoundManager {
  private audios: Record<string, HTMLAudioElement> = {};
  public soundEnabled: boolean = true;
  public hapticsEnabled: boolean = true;

  constructor() {
    if (typeof window !== 'undefined') {
      Object.entries(SOUNDS).forEach(([key, url]) => {
        const audio = new Audio(url);
        audio.preload = 'auto';
        this.audios[key] = audio;
      });
    }
  }

  play(name: keyof typeof SOUNDS) {
    if (this.soundEnabled) {
      const audio = this.audios[name];
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    }
    
    // Haptic feedback
    if (this.hapticsEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      if (name === 'correct') navigator.vibrate([50]);
      else if (name === 'incorrect') navigator.vibrate([100, 50, 100]);
      else if (name === 'click') navigator.vibrate(10);
      else if (name === 'complete') navigator.vibrate([100, 50, 100, 50, 200]);
    }
  }
}

export const soundManager = new SoundManager();
