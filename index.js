// @ts-check
/**
 * Execute `callback` when `sourceBuffer.updating` becomes `false`,
 * or immediately if it's already `false`.
 *
 * If this function was called several times while
 * `sourceBuffer.updating === true` then `callback`s are executed
 * in the same order as this function was called.
 * @param {SourceBuffer} sourceBuffer
 * @param {() => void} callback
 * @param {((warning: string) => void) | undefined} onWarning - you can pass
 * `undefined` so that doesn't print warnings
 * @returns {void}
 * @example
 * console.log(sourceBuffer.updating); // false
 * execWhenSourceBufferReady(sourceBuffer, () => {
 *   sourceBuffer.appendBuffer(buffer1);
 *   console.log('appendBuffer() 1 executed');
 * });
 * // 'appendBuffer() 1 executed'
 *
 * console.log(sourceBuffer.updating); // true
 * // `sourceBuffer.updating === true`, but we can still queue
 * // another `appendBuffer()`.
 * execWhenSourceBufferReady(sourceBuffer, () => {
 *   sourceBuffer.appendBuffer(buffer2);
 *   console.log('appendBuffer() 2 executed');
 * });
 * // A few moments later:
 * // 'appendBuffer() 2 executed'
 */
export default function execWhenSourceBufferReady(
  sourceBuffer,
  callback,
  onWarning = console.warn
) {
  let queue = queueMap.get(sourceBuffer);
  if (queue && queue.length > 0) {
    // console.log('queue not empty, pushing', callback);

    queue.push(callback);
    return;
  }
  // There is nothing in the queue.

  if (!sourceBuffer.updating) {
    // console.log(
    //   'sourceBuffer.updating === false, executing immediately',
    //   callback
    // );
    callback();
    return;
  }

  if (!queue) {
    queue = [callback];
    queueMap.set(sourceBuffer, queue);
  } else {
    queue.push(callback);
  }

  /** @type {true} */
  const _assert1 = sourceBuffer.updating;
  // `sourceBuffer.updating === true` and we just added the first item
  // to the queue.
  // Let's initiate the "empty queue" process

  const onSourceBufferReadyAndQueueNotEmpty = () => {
    if (sourceBuffer.updating) {
      onWarning?.(
        "sourceBuffer.updating === true, but we're supposed to be the only " +
          "party that can operate on the sourceBuffer. " +
          "Something else made it busy. " +
          "We'll graciously wait for the next 'updateend' event"
      );
      return;
    }

    // why `do while`? Because if `sourceBuffer.updating` didn't
    // become `true` after `callback()`,
    // there will be no subsequent 'updateend' event,
    // so we'd be waiting for it indefinitely.
    do {
      /** @type {true} */
      const _assert2 = !sourceBuffer.updating;
      const callback = queue.shift();
      callback();

      if (!sourceBuffer.updating) {
        onWarning?.(
          "Executed `callback()`, but it didn't make " +
            "`sourceBuffer.updating === true`\n" +
            "We'll handle it graciously, but usually " +
            "operations on `sourceBuffer` cause it to become busy."
        );
      }

      // Checking length _after_ `queue.shift()` because, as stated before,
      // there is at least one item in the queue, and this is the only code
      // that can reduce the size of the queue.
      if (queue.length === 0) {
        sourceBuffer.removeEventListener(
          "updateend",
          onSourceBufferReadyAndQueueNotEmpty
        );
        return;
      }
      // The queue is still not empty.
    } while (!sourceBuffer.updating);
    // `sourceBuffer.updating === true` and the queue is still not empty.
    // Let's simply wait for the next 'updateend' event.
    /** @type {true} */
    const _assert3 = sourceBuffer.updating;
  };

  sourceBuffer.addEventListener(
    "updateend",
    onSourceBufferReadyAndQueueNotEmpty,
    { passive: true }
  );
  // Why 'updateend' and not 'updated' or 'update' and 'error' and 'abort'?
  // Because 'updateend' seems to be the only event that 100% correlates
  // with `.updating` becoming `false`.
  // https://www.w3.org/TR/media-source-2/#sourcebuffer-events
  // Search for "updating attribute to false" and
  // "fire an event named updateend". The former is always accompanied
  // by the latter.
  //
  // Although you might ask whether it makes sense
  // to apply queued operations
  // if the event that caused `.updating` to become `false`
  // is 'error' or 'abort'. IDK.
}
/** @type {WeakMap<SourceBuffer, Array<() => void>>} */
const queueMap = new WeakMap();

/**
 * @license
 * Copyright 2023, 2024 WofWca <wofwca@protonmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
