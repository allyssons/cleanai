# FFmpeg WebAssembly notices

This directory contains the browser wrapper used by the video joiner:

- `ffmpeg.js` and `814.ffmpeg.js` come from `@ffmpeg/ffmpeg` 0.12.15. The wrapper is licensed under MIT; see [LICENSE-MIT.txt](./LICENSE-MIT.txt) and the [upstream source](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.15/packages/ffmpeg).
- The FFmpeg core (`@ffmpeg/core` 0.12.10) is fetched from jsDelivr only after a visitor starts video analysis. The core is licensed under GPL-2.0-or-later. The license text is in [LICENSE-GPL-2.0-or-later.txt](./LICENSE-GPL-2.0-or-later.txt); source and build files are in the [upstream v12.10 release](https://github.com/ffmpegwasm/ffmpeg.wasm/tree/v12.10/packages/core).

The core is not stored in this repository. The browser fetches its JavaScript and WebAssembly files directly from the version-pinned CDN URL in `video-joiner.js`. The selected video clips remain in the visitor's browser and are not sent to that CDN.
