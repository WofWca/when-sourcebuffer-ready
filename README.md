# when-sourcebuffer-ready

Execute `callback` when `sourceBuffer.updating` becomes `false`,
or immediately if it's already `false`.

If this function was called several times while
`sourceBuffer.updating === true` then `callback`s are executed
in the same order as this function was called.

## Usage

```javascript
console.log(sourceBuffer.updating); // false
execWhenSourceBufferReady(sourceBuffer, () => {
  sourceBuffer.appendBuffer(buffer1);
  console.log('appendBuffer() 1 executed');
});
// 'appendBuffer() 1 executed'

console.log(sourceBuffer.updating); // true
// `sourceBuffer.updating === true`, but we can still queue
// another `appendBuffer()`.
execWhenSourceBufferReady(sourceBuffer, () => {
  sourceBuffer.appendBuffer(buffer2);
  console.log('appendBuffer() 2 executed');
});
// A few moments later:
// 'appendBuffer() 2 executed'
```

## Why

This

```javascript
function naiveExecWhenSourceBufferReady(buffer) {
    if (!sourceBuffer.updating) {
      sourceBuffer.addEventListener("updateend", () => {
        sourceBuffer.appendBuffer(buffer);
      }, { once: true });
    } else {
      sourceBuffer.appendBuffer(buffer);
    }
}
naiveExecWhenSourceBufferReady(buffer1);
setTimeout(() => naiveExecWhenSourceBufferReady(buffer2), 50);
setTimeout(() => naiveExecWhenSourceBufferReady(buffer3), 100);
```

is not enogh. Because the "updateend" event callback
[is not executed _synchronously_](https://w3c.github.io/media-source/#dom-sourcebuffer-appendbuffer)
as `.updating` becomes false.
So it might so happen that, if you used the above naive approch,
buffers would be appended in wrong order.
The third buffer might check `if (!sourceBuffer.updating) {`
and go on executing `appendBuffer()` __before__ the "updateend" event callback
is executed for the second buffer, which could result in an error.

## How it works

Nothing fancy. It keeps a queue (array) of callbacks for each `SourceBuffer`.

## Why I made the project

[The cloning algorithm of the Jump Cutter browser extension](https://github.com/WofWca/jumpcutter?tab=readme-ov-file#how-it-works)
and the [webxdc-video-call app](https://github.com/WofWca/webxdc-video-call)
needed it.

## TODO

Certain operations on `MediaSource` (not `SourceBuffer`), such as setting
[duration](https://w3c.github.io/media-source/#duration-attribute)
can cause an error

> If the updating attribute equals true on any SourceBuffer in sourceBuffers

so perhaps we need to write a similar function that checks `.updating`
on all `SourceBuffer`s of a `MediaSource`.
