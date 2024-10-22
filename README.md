# smotion

smotion is a low level web animation library that drives [signals](https://github.com/proposal-signals/signal-polyfill).

```typescript
import { reaction } from "signal-utils/subtle/reaction"
import { Animator } from "@curlyben/smotion"

const ani = new Animator()

ani.addTrack({
  keyframes: [{ time: 0 }, { time: 1000 }],
})

const widget = document.querySelector("#widget")

reaction(
    () => ani.tracks[0].frames[0].$value.get() * 100,
    (percent) => widget.style.left = `${percent}px`
)

ani.play()
```

## Contributing

To install dependencies:

```bash
bun install
```

## Related Projects

[motion - a beautiful native web animation library from Matt Perry](https://motion.dev/)

[theatre.js - the evergreen web animation tool that inspired this one](https://www.theatrejs.com/)
