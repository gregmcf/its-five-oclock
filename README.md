# It's 5 o'clock

An animated clock by Greg McFarlane. The minute and hour hands remain fixed at 12 and 5 while the numbers move to show the current time.

Website (once GitHub Pages is enabled): https://gregmcf.github.io/its-five-oclock/

The clock features cubic Hermite interpolation, smooth hand-crossing transitions, elastic animation, resizable ellipse geometry and ellipse arc-length spacing.

## Use on iPhone

Open the website in Safari and select Share → Add to Home Screen. After a successful first load, the app is designed to work offline.

## Publishing

In **Settings → Pages**, set **Build and deployment → Source** to **GitHub Actions**. The workflow `.github/workflows/pages.yml` deploys the site on every push to `main`.

## Licence

MIT. Original Python version © 2007–2012 Greg McFarlane.
