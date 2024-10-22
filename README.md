# smotion

_Note: this package is prerelease, no bundles are built yet!_

```bash
bun add @curlyben/smotion
```

smotion is a low level web animation library that drives [signals](https://github.com/proposal-signals/signal-polyfill).

## A Vanilla Example:

```typescript
import { reaction } from "signal-utils/subtle/reaction"
import { Animator } from "@curlyben/smotion"

const ani = new Animator()

ani.addTrack({
  keyframes: [
    // a named frame
    { name: "move it!", time: 0 },
    // an anonymous frame (will get named `frame1` automatically)
    { time: 1000 }
  ],
})

// eg. using 'reacion' from signal-utils, we update a style.left property of an element
// see: https://github.com/proposal-signals/signal-utils
reaction(
    () => ani.$val("move it!"),
    (percent) => document.querySelector("#widget").style.left = `${percent}px`
)

ani.play()
```

## A lit Example

```typescript
import { html, LitElement } from "lit"
import { customElement, property, state } from "lit/decorators.js";
import { watch } from "@lit-labs/signals"
import { computed, SignalWatcher, watch } from "@lit-labs/signals";
import { Animator } from "@curlyben/smotion"

@customElement("move-it")
export class MoveIt extends LitElement {
  #animator = new Animator({ loop: true, play: true, duration: 1000, keyframes: [
    { name: "move it!", time: 0 },
    { time: 500 },
  ]})
  render() {
    const left = computed(() => `${this.#animator.$val("move it!") * 100}px`)
    return html`
      <div style="position: absolute; top: 0px; left: ${watch(left)}">
        hello world!
      </div>
    `
  }
}
```

## Contributing

To install dependencies:

```bash
bun install
```

## Related Projects

[motion - a beautiful native web animation library from Matt Perry](https://motion.dev/)

[theatre.js - the evergreen web animation tool that inspired this one](https://www.theatrejs.com/)
