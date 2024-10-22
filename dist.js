// lib/SMotion.ts
import { Signal } from "signal-polyfill";

class Animator {
  tracks = [];
  lastPlayheadPosition = 0;
  playing = new Signal.State(false);
  playheadPosition = new Signal.State(0);
  duration = new Signal.State(3000);
  loopPlayback = new Signal.State(false);
  onRequestAnimationFrame;
  onReset;
  onTracksChanged;
  constructor(opts) {
    this.onRequestAnimationFrame = opts.onRequestAnimationFrame;
    this.onReset = opts.onReset;
    this.onTracksChanged = opts.onTracksChanged;
  }
  addTrack(track) {
    const newTrack = {
      name: track.name,
      keyframes: track.keyframes.map((keyframe) => ({
        $time: new Signal.State(keyframe.time),
        $value: new Signal.State(0)
      }))
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
    const loop = (time) => {
      this.lastPlayheadPosition = this.playheadPosition.get();
      if (!this.playing.get())
        return;
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
    for (const track of this.tracks) {
      for (let keyframeIndex = 0;keyframeIndex < track.keyframes.length; keyframeIndex++) {
        const keyframe = track.keyframes[keyframeIndex];
        if (keyframe.$time.get() >= this.lastPlayheadPosition && keyframe.$time.get() <= this.playheadPosition.get()) {
          if (dispatchEvents) {
            console.log("keyframe", keyframe);
          }
        }
      }
    }
  }
  processFrames() {
    for (let ti = 0;ti < this.tracks.length; ti++) {
      const track = this.tracks[ti];
      for (let ki = 0;ki < track.keyframes.length; ki++) {
        const inKeyframe = track.keyframes[ki];
        const outKeyframe = track.keyframes.at(ki + 1);
        if (inKeyframe.$time.get() > this.playheadPosition.get()) {
          inKeyframe.$value.set(0);
        }
        if (inKeyframe.$time.get() < this.playheadPosition.get()) {
          inKeyframe.$value.set(1);
        }
        if (!outKeyframe) {
          continue;
        }
        if (inKeyframe.$time.get() <= this.playheadPosition.get() && outKeyframe.$time.get() >= this.playheadPosition.get()) {
          const range = outKeyframe.$time.get() - inKeyframe.$time.get();
          const progress = (this.playheadPosition.get() - inKeyframe.$time.get()) / range;
          inKeyframe.$value.set(progress);
        }
      }
    }
  }
}
export {
  Animator
};
