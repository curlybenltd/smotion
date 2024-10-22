import { expect, mock, test } from "bun:test";
import { reaction } from "signal-utils/subtle/reaction";

import * as lib from "./SMotion";
import { sleep } from "bun";

// turns a signal predicate to a promise
const when = (exp: () => boolean) =>
    new Promise((resolve) => {
        const cleanup = reaction(exp, (t) => {
            cleanup();
            resolve(true);
        });
    });

test("accepts a onRequestAnimationFrame and calls it", async () => {
    const cb = mock();
    const s = new lib.Animator({
        duration: 100,
        onRequestAnimationFrame: cb,
    });

    s.addTrack({
        keyframes: [
            {
                time: 0,
            },
            {
                time: 100,
            },
        ],
    });

    expect(cb).not.toBeCalled();
    s.play();
    await when(() => s.$playing.get() === false);
    expect(cb).toBeCalled();
});

test("accepts a onReset and calls it", async () => {
    const cb = mock();
    const s = new lib.Animator({
        duration: 100,
        onReset: cb,
    });

    s.addTrack({
        keyframes: [
            {
                time: 0,
            },
            {
                time: 100,
            },
        ],
    });

    expect(cb).not.toBeCalled();
    s.play();
    s.$loop.set(true);
    await sleep(1500);
    s.$loop.set(false);
    const ok = await when(() => s.$playing.get() === false);
    expect(cb).toBeCalled();
    expect(ok).toBeTrue();
});

test("accepts a onTracksChanged and calls it", async () => {
    const cb = mock();
    const s = new lib.Animator({
        duration: 100,
        onTracksChanged: cb,
    });

    expect(cb).not.toBeCalled();

    s.addTrack({
        keyframes: [
            {
                time: 0,
            },
            {
                time: 100,
            },
        ],
    });

    expect(cb).toBeCalled();
});

test("accepts a onEnterFrame and calls it", async () => {
    const cb = mock();
    const s = new lib.Animator({
        duration: 100,
        onEnterFrame: cb,
    });

    s.addTrack({
        keyframes: [
            {
                time: 0,
            },
            {
                time: 100,
            },
        ],
    });

    expect(cb).not.toBeCalled();
    s.play();
    await when(() => s.$playing.get() === false);
    expect(cb).toBeCalled();
});

test("drives a frame value from 0 to 1", async () => {
    const s = new lib.Animator({ duration: 200 });
    s.addTrack({
        keyframes: [{ time: 0 }, { time: 100 }],
    });

    expect(s.tracks[0].keyframes[0].$value.get()).toBe(0);
    s.play();
    await when(() => s.$playing.get() === false);
    expect(s.tracks[0].keyframes[0].$value.get() === 1);
});

test("there is a $val method that drives a keyframe value signal", async () => {
    const s = new lib.Animator({ duration: 200 });
    s.addTrack({
        keyframes: [{ name: "move it!", time: 0 }, { time: 100 }],
    });

    expect(s.$val([0, 0])).toBe(0);
    s.play();
    await when(() => s.$playing.get() === false);
    expect(s.$val([0, 0]) === 1);

    s.reset();
    expect(s.$val("move it!") === 0);
    s.play();
    await when(() => s.$playing.get() === false);
    expect(s.$val("move it!") === 1);
});

test("it can automatically play", async () => {
    const s = new lib.Animator({ duration: 200, play: true });
    s.addTrack({
        keyframes: [{ time: 0 }, { time: 100 }],
    });

    await when(() => s.$playing.get() === false);
    expect(s.tracks[0].keyframes[0].$value.get() === 1);
});

test("it can automatically loop", async () => {
    const { resolve, promise } = Promise.withResolvers();
    const reset = mock(() => {
        resolve();
    });
    const s = new lib.Animator({
        duration: 200,
        loop: true,
        play: true,
        onReset: reset,
    });
    s.addTrack({
        keyframes: [{ time: 0 }, { time: 100 }],
    });

    await promise;
    expect(reset).toBeCalled();
    s.$loop.set(false);

    await when(() => s.$playing.get() === false);
    expect(s.tracks[0].keyframes[0].$value.get() === 1);
});

test("it can be constructed with tracks", async () => {
    const s = new lib.Animator({
        duration: 200,
        tracks: [{ keyframes: [{ time: 0 }, { time: 100 }] }],
    });

    expect(s.tracks[0].keyframes[0].$value.get()).toBe(0);
    s.play();
    await when(() => s.$playing.get() === false);
    expect(s.tracks[0].keyframes[0].$value.get() === 1);
});

test("it can be constructed with keyframes", async () => {
    const s = new lib.Animator({
        duration: 200,
        keyframes: [{ time: 0 }, { time: 100 }],
    });

    expect(s.tracks[0].keyframes[0].$value.get()).toBe(0);
    s.play();
    await when(() => s.$playing.get() === false);
    expect(s.tracks[0].keyframes[0].$value.get() === 1);
});
