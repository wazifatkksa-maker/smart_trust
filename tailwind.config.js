/** SMARTTRUST — Tailwind is used only as the base layer that Salla web components rely on.
 *  The visual language lives in src/assets/styles (st-* classes and --st-* tokens). */
module.exports = {
  content: [
    'src/views/**/*.twig',
    'src/assets/js/**/*.js',
    'node_modules/@salla.sa/twilight-tailwind-theme/safe-list-css.txt',
  ],
  darkMode: 'class',
  theme: {
    container: { center: true, padding: { DEFAULT: '20px', md: '40px', lg: '48px', xl: '64px' } },
    screens: { sm: '480px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1440px' },
    extend: {
      colors: {
        st: {
          ink: 'var(--st-ink)', night: 'var(--st-night)', ivory: 'var(--st-ivory)', paper: 'var(--st-paper)',
          sand: 'var(--st-sand)', line: 'var(--st-line)', signal: 'var(--st-signal)', text: 'var(--st-text)',
        },
      },
      fontFamily: {
        primary: 'var(--st-font)',
        mono: 'var(--st-mono)',
      },
      borderRadius: { st: 'var(--st-radius-1)' },
      maxWidth: { st: 'var(--st-container)' },
      transitionTimingFunction: { st: 'var(--st-ease)' },
    },
  },
  plugins: [
    require('@salla.sa/twilight-tailwind-theme'),
    require('@tailwindcss/forms'),
  ],
};
