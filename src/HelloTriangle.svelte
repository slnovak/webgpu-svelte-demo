<script>
  import * as Comlink from "comlink";
  import { onMount } from "svelte";

  // We will use this variable to access the DOM element
  // once the component gets mounted.
  let canvas;

  const worker = new Worker("./helloTriangle.js", { type: "module" });

  // helloTriangle is an ES6 proxy object that wraps the object
  // we exposed in the worker.
  const helloTriangle = Comlink.wrap(worker);

  // We can access the "ready" store in the worker and wrap a callback
  // function with Comlink that will get called whenever the store state
  // changes. Note that the "subscribe" method returns a function that
  // is meant to unsubscribe. However, it's wrapped in a promise. Also
  // note that we capture the interval so that we can clean it up later.
  let interval;
  const promise = helloTriangle.ready.subscribe(
    Comlink.proxy(ready => {
      if (ready) interval = setInterval(() => helloTriangle.frame(), 50);
    })
  );

  // Once the promise resolves, assign it to the unsubscribe method.
  let unsubscribe;
  promise.then(value => (unsubscribe = value));

  // Once a component "mounts", its DOM elements have been rendered.
  // Since we bound "canvas" to the canvas element (via bind:this={...}),
  // we can assume that canvas is now a DOM element.
  onMount(() => {
    console.log(canvas);
    const offscreenCanvas = canvas.transferControlToOffscreen(canvas);

    // We can now transfer the offscreenCanvas to the Web Worker.
    helloTriangle.canvas.set(
      Comlink.transfer(offscreenCanvas, [offscreenCanvas])
    );

    // If onMount returns a function, this function will be evaluated when
    // the component gets unloaded (such as closing an object editor). This
    // is where we do cleanup.
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  });
</script>

<canvas bind:this={canvas} width="600" height="400" />
