# geckos.io stress test

Based on what I can observe (tested locally), the **server** runs more or less stable with:

- 30 connection with 60 fps
- 32 connection with 50 fps
- 38 connection with 40 fps
- 44 connection with 30 fps
- 50 connection with 20 fps

The byteSize you send has no impact on performance.

---

Why this limit? I guess because `dataChannel.send()` is so slow. It takes about 0.2-0.3 ms to send a message.

Unfortunately, for now, the DataChannels do not run in a worker. So that is not an option for now.

I guess a node.js cluster would help, but for now, geckos.io does not work in a cluster.
