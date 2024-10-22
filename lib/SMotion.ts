import { Signal } from "signal-polyfill";

export type Keyframe = {
    $time: Signal.State<number>;
    $value: Signal.State<number>;
};

export type Track = {
    name: string;
    keyframes: Keyframe[];
};

export type TrackData = {
    name?: string;
    keyframes: { time: number }[];
};

export class Animator {
    readonly tracks: Track[] = [];
    private lastPlayheadPosition = 0;

    readonly playing = new Signal.State(false);
    readonly playheadPosition = new Signal.State(0);
    readonly duration = new Signal.State(3000);
    readonly loopPlayback = new Signal.State(false);

    onRequestAnimationFrame?: () => void;
    onReset?: () => void;
    onEnterFrame?: (args: { trackIndex: number, keyframeIndex: number }) => void;
    onTracksChanged?: () => void;

    constructor(opts?: {
        duration?: number;
        onRequestAnimationFrame?: () => void;
        onReset?: () => void;
        onEnterFrame?: () => void;
        onTracksChanged?: () => void;
    }) {
        if (opts?.duration) {
            this.duration.set(opts.duration);
        }
        this.onRequestAnimationFrame = opts?.onRequestAnimationFrame;
        this.onReset = opts?.onReset;
        this.onEnterFrame = opts?.onEnterFrame;
        this.onTracksChanged = opts?.onTracksChanged;
    }

    addTrack(track: TrackData) {
        const newTrack: Track = {
            name: track.name || `track${this.tracks.length}`,
            keyframes: track.keyframes.map((keyframe) => ({
                $time: new Signal.State(keyframe.time),
                $value: new Signal.State(0),
            })),
        };
        this.tracks.push(newTrack);
        if (this.onTracksChanged) {
            this.onTracksChanged();
        }
    }

    play() {
        let atEnd = false;
        this.playing.set(true);
        const start = performance.now() - this.playheadPosition.get();
        const loop = (time: number) => {
            this.lastPlayheadPosition = this.playheadPosition.get();
            if (!this.playing.get()) {
                return;
            }
            this.playheadPosition.set(time - start);
            this.processKeyframes();
            this.processFrames();
            if (this.playheadPosition.get() >= this.duration.get()) {
                atEnd = true;
                this.playheadPosition.set(this.duration.get());
                this.playing.set(this.loopPlayback.get());
                this.playing.set(false);
            }
            if (this.onRequestAnimationFrame) {
                this.onRequestAnimationFrame();
            }
            if (this.loopPlayback.get() && atEnd) {
                this.reset();
                this.play();
            } else {
                requestAnimationFrame(loop);
            }
        };
        requestAnimationFrame(loop);
    }

    pause() {
        this.playing.set(false);
    }

    reset() {
        this.playing.set(false);
        this.playheadPosition.set(0);
        if (this.onReset) {
            this.onReset();
        }
        this.processFrames();
    }

    toggleLoop() {
        this.loopPlayback.set(!this.loopPlayback.get());
    }

    processKeyframes(dispatchEvents = true) {
        for (let trackIndex = 0; trackIndex < this.tracks.length; trackIndex++) {
            const track = this.tracks[trackIndex]
            for (
                let keyframeIndex = 0;
                keyframeIndex < track.keyframes.length;
                keyframeIndex++
            ) {
                const keyframe = track.keyframes[keyframeIndex];
                if (
                    keyframe.$time.get() >= this.lastPlayheadPosition &&
                    keyframe.$time.get() <= this.playheadPosition.get()
                ) {
                    // TODO: dispatch event
                    if (dispatchEvents && this.onEnterFrame) {
                        this.onEnterFrame({ trackIndex, keyframeIndex })
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

                if (inKeyframe.$time.get() > this.playheadPosition.get()) {
                    // TODO: ensure this frame is at 0
                    inKeyframe.$value.set(0);
                }
                if (inKeyframe.$time.get() < this.playheadPosition.get()) {
                    // TODO: ensure this frame is at 1
                    inKeyframe.$value.set(1);
                }

                if (!outKeyframe) {
                    continue;
                }
                if (
                    inKeyframe.$time.get() <= this.playheadPosition.get() &&
                    outKeyframe.$time.get() >= this.playheadPosition.get()
                ) {
                    const range = outKeyframe.$time.get() - inKeyframe.$time.get();
                    const progress =
                        (this.playheadPosition.get() - inKeyframe.$time.get()) / range;
                    inKeyframe.$value.set(progress);
                }
            }
        }
    }
}
