import remToPx from 'postcss-rem-to-responsive-pixel';

// Tailwind emits rem units, which resolve against the host page's <html>
// font-size — not the shadow root. Convert to px so the injected UI scales
// consistently regardless of the page's root font size.
export default {
  plugins: [
    remToPx({ rootValue: 16, propList: ['*'], transformUnit: 'px' }),
  ],
};
