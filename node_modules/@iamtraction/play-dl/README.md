# Play-dl

A **light-weight** YouTube, SoundCloud, Spotify and Deezer streaming and searching library.

-   Search by video, playlist/album, channel/artist
-   Stream audio from YouTube and SoundCloud

# Why play-dl?

[ytdl-core](https://github.com/fent/node-ytdl-core) has some issues with miniget and also stream abort issues. On the other hand, [youtube-dl](https://github.com/ytdl-org/youtube-dl) is a perfect alternative but it takes time to launch. Hence, play-dl is created to avoid these issues along with providing comparatively faster performance than others.

[![Build](https://github.com/iamtraction/play-dl/actions/workflows/build.yml/badge.svg)](https://github.com/iamtraction/play-dl/actions/workflows/build.yml)
[![NPM](https://img.shields.io/npm/v/@iamtraction/play-dl.svg?color=00aa00&logo=npm)](https://www.npmjs.com/package/@iamtraction/play-dl)
[![License](https://img.shields.io/github/license/iamtraction/play-dl?color=00aa00)](./LICENSE)
[![Discord](https://img.shields.io/badge/Discord-Join-00aa00?logo=discord&logoColor=white)](https://discord.gg/Z8txJ6a)

## Support

You can contact me for support on my [chat server](https://discord.gg/Z8txJ6a).

### Installation

**Node.js 20.0.0 or newer is required.**

```bash
npm install @iamtraction/play-dl@latest
pnpm add @iamtraction/play-dl@latest
yarn add @iamtraction/play-dl@latest
```

### Importing

**TypeScript:**
```ts
import play from '@iamtraction/play-dl'; // Everything

import { video_basic_info, stream } from '@iamtraction/play-dl'; // Individual functions
```

**CommonJS modules:**
```js
const play = require('@iamtraction/play-dl'); // Everything

// Individual functions by using destructuring
const { video_basic_info, stream } = require('@iamtraction/play-dl');
```

**ES6 modules:**
```ts
import play from '@iamtraction/play-dl'; // Everything

import { video_basic_info, stream } from '@iamtraction/play-dl'; // Individual functions
```

## **Compatibility issues** - discord-player

Because discord-player doesn't work with raw opus packets you need to enable the compatibility mode in `play-dl`, if you want to use both frameworks together.

- To fix the playback of YouTube videos with `discord-player`, you can disable some of play-dl's optimisations and fixes by setting the `discordPlayerCompatibility` option for `stream` and `stream_from_info` to true

- The `discordPlayerCompatiblity` option might break the playback of long YouTube videos.

- Even with the `discordPlayerCompatibility` option set you will not be able to use the seek option for `stream` and `stream_from_info`.


### [Documentation](https://iamtraction.github.io/play-dl/)
### [Examples](./examples)
### [Instructions](./instructions)

## Credits

This project is a maintained fork of [play-dl](https://github.com/play-dl/play-dl), continued under its original GPL-3.0 license.
