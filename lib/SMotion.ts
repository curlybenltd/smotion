import { Signal } from "signal-polyfill";

export type Keyframe = {
    name?: string;
    $time: Signal.State<number>;
    $value: Signal.State<number>;
};

export type Track = {
    name: string;
    keyframes: Keyframe[];
};

export type FrameData = {
    name?: string;
    time: number;
};

export type TrackData = {
    name?: string;
    keyframes: FrameData[];
};

type AnimatorConstructorOpts = {
    play?: boolean;
    loop?: boolean;
    duration?: number;

    onRequestAnimationFrame?: () => void;
    onReset?: () => void;
    onEnterFrame?: () => void;
    onTracksChanged?: () => void;
};

export type AnimatorConstructorOptsTracks = {
    tracks: TrackData[];
    keyframes: never;
} & AnimatorConstructorOpts;

export type AnimatorConstructorOptsKeyframes = {
    tracks: never;
    keyframes: FrameData[];
} & AnimatorConstructorOpts;

export class Animator {
    readonly tracks: Track[] = [];
    #lastPosition = 0;

    readonly $playing = new Signal.State(false);
    readonly $position = new Signal.State(0);
    readonly $duration = new Signal.State(3000);
    readonly $loop = new Signal.State(false);

    onRequestAnimationFrame?: () => void;
    onReset?: () => void;
    onEnterFrame?: (args: {
        trackIndex: number;
        keyframeIndex: number;
    }) => void;
    onTracksChanged?: () => void;

    constructor(
        opts?:
            | AnimatorConstructorOpts
            | AnimatorConstructorOptsTracks
            | AnimatorConstructorOptsKeyframes
    ) {
        this.onRequestAnimationFrame = opts?.onRequestAnimationFrame;
        this.onReset = opts?.onReset;
        this.onEnterFrame = opts?.onEnterFrame;
        this.onTracksChanged = opts?.onTracksChanged;

        if (opts && "tracks" in opts) {
            for (const track of opts.tracks) {
                this.addTrack(track);
            }
        }
        if (opts && "keyframes" in opts) {
            this.addTrack({
                keyframes: opts.keyframes,
            });
        }
        // TODO: typescript struggling to narrow this correctly, if we do it first it doesn't infer tracks/keyframes
        if (opts && "tracks" in opts && "keyframes" in opts) {
            throw new Error("Cannot specify both tracks and keyframes");
        }

        if (opts?.loop) {
            this.$loop.set(opts.loop);
        }
        if (opts?.duration) {
            this.$duration.set(opts.duration);
        }
        if (opts?.play) {
            this.play();
        }
    }

    addTrack(track: TrackData) {
        const newTrack: Track = {
            name: track.name || `track${this.tracks.length}`,
            keyframes: track.keyframes.map((keyframe, i) => ({
                name: keyframe.name || `keyframe${i}`,
                $time: new Signal.State(keyframe.time),
                $value: new Signal.State(0),
            })),
        };
        this.tracks.push(newTrack);
        if (this.onTracksChanged) {
            this.onTracksChanged();
        }
    }

    $val(nameOrIndex: [trackIndex: number, keyframeIndex: number] | string) {
        let result: number | undefined;
        if (typeof nameOrIndex === "string") {
            result = this.tracks
                .flatMap((t) => t.keyframes)
                .find((k) => k.name === nameOrIndex)
                ?.$value.get();
        } else {
            const [trackIndex, keyframeIndex] = nameOrIndex;
            result = this.tracks
                .at(trackIndex)
                ?.keyframes.at(keyframeIndex)
                ?.$value.get();
        }
        if (result === undefined) {
            throw new Error(`No keyframe found at index ${nameOrIndex}`);
        }
        return result;
    }

    play() {
        let atEnd = false;
        this.$playing.set(true);
        const start = performance.now() - this.$position.get();
        const loop = (time: number) => {
            this.#lastPosition = this.$position.get();
            if (!this.$playing.get()) {
                return;
            }
            this.$position.set(time - start);
            this.processKeyframes();
            this.processFrames();
            if (this.$position.get() >= this.$duration.get()) {
                atEnd = true;
                this.$position.set(this.$duration.get());
                this.$playing.set(this.$loop.get());
                this.$playing.set(false);
            }
            if (this.onRequestAnimationFrame) {
                this.onRequestAnimationFrame();
            }
            if (this.$loop.get() && atEnd) {
                this.reset();
                this.play();
            } else {
                requestAnimationFrame(loop);
            }
        };
        requestAnimationFrame(loop);
    }

    pause() {
        this.$playing.set(false);
    }

    reset() {
        this.$playing.set(false);
        this.$position.set(0);
        if (this.onReset) {
            this.onReset();
        }
        this.processFrames();
    }

    toggleLoop() {
        this.$loop.set(!this.$loop.get());
    }

    processKeyframes(dispatchEvents = true) {
        for (
            let trackIndex = 0;
            trackIndex < this.tracks.length;
            trackIndex++
        ) {
            const track = this.tracks[trackIndex];
            for (
                let keyframeIndex = 0;
                keyframeIndex < track.keyframes.length;
                keyframeIndex++
            ) {
                const keyframe = track.keyframes[keyframeIndex];
                if (
                    keyframe.$time.get() >= this.#lastPosition &&
                    keyframe.$time.get() <= this.$position.get()
                ) {
                    // TODO: dispatch event
                    if (dispatchEvents && this.onEnterFrame) {
                        this.onEnterFrame({ trackIndex, keyframeIndex });
                    }
                }
            }
        }
    }

    processFrames() {
        for (let ti = 0; ti < this.tracks.length; ti++) {
            const track = this.tracks[ti];
            // we want the frame before and after the current position
            for (let ki = 0; ki < track.keyframes.length; ki++) {
                const inKeyframe = track.keyframes[ki];
                const outKeyframe = track.keyframes.at(ki + 1);

                if (inKeyframe.$time.get() > this.$position.get()) {
                    // TODO: ensure this frame is at 0
                    inKeyframe.$value.set(0);
                }
                if (inKeyframe.$time.get() < this.$position.get()) {
                    // TODO: ensure this frame is at 1
                    inKeyframe.$value.set(1);
                }

                if (!outKeyframe) {
                    continue;
                }
                if (
                    inKeyframe.$time.get() <= this.$position.get() &&
                    outKeyframe.$time.get() >= this.$position.get()
                ) {
                    const range =
                        outKeyframe.$time.get() - inKeyframe.$time.get();
                    const progress =
                        (this.$position.get() - inKeyframe.$time.get()) / range;
                    inKeyframe.$value.set(progress);
                }
            }
        }
    }
}
