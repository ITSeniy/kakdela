import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        kd: {
          bg: 'var(--kd-bg)',
          'bg-deep': 'var(--kd-bg-deep)',
          panel: 'var(--kd-panel)',
          'panel-alt': 'var(--kd-panel-alt)',
          'panel-hi': 'var(--kd-panel-hi)',
          'panel-soft': 'var(--kd-panel-soft)',
          text: 'var(--kd-text)',
          'text-soft': 'var(--kd-text-soft)',
          'text-mute': 'var(--kd-text-mute)',
          accent: 'var(--kd-accent)',
          'accent-deep': 'var(--kd-accent-deep)',
          'accent-soft': 'var(--kd-accent-soft)',
          'accent-bg': 'var(--kd-accent-bg)',
          warm: 'var(--kd-warm)',
          'warm-deep': 'var(--kd-warm-deep)',
          'warm-soft': 'var(--kd-warm-soft)',
          'warm-bg': 'var(--kd-warm-bg)',
          danger: 'var(--kd-danger)',
          border: 'var(--kd-border)',
          'border-soft': 'var(--kd-border-soft)',
          online: 'var(--kd-online)',
          idle: 'var(--kd-idle)',
          dnd: 'var(--kd-dnd)',
          stage: 'var(--kd-stage)',
          'stage-text': 'var(--kd-stage-text)',
          'overlay-strong': 'var(--kd-overlay-strong)',
          'overlay-soft': 'var(--kd-overlay-soft)',
          'profile-grad-from': 'var(--kd-profile-grad-from)',
          'profile-grad-to': 'var(--kd-profile-grad-to)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        kd: '6px',
      },
      boxShadow: {
        // Active-сервер в рельсе: ring из designs/final-chrome.jsx (KD_ServerRail)
        'kd-ring-active': '0 0 0 1.5px var(--kd-bg-deep), 0 0 0 3px var(--kd-accent)',
        'kd-modal': 'var(--kd-shadow-modal)',
        'kd-tile': 'var(--kd-shadow-tile)',
      },
    },
  },
  plugins: [],
} satisfies Config
