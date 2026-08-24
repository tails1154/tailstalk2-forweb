# TailsTalk 2 Website RPC helper

This Manifest V3 extension shares the active webpage title and
hostname with TailsTalk 2. It is enabled by default and can be disabled in
TailsTalk 2 under User Settings → Advanced → Website activity RPC.

## Download and install

Download the current archive from:

`https://tails1154.com:9782/tailstalk2-rpc/tailstalk2-rpc-1.0.0.zip`

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Extract the archive and choose **Load unpacked**.
4. Open TailsTalk 2 and keep the extension enabled in Advanced settings.

Update metadata is available at:

`https://tails1154.com:9782/tailstalk2-rpc/update.xml`

The extension only forwards activity to the approved TailsTalk 2 web origins:
the production client and the development client.

## Site-specific activity templates

A webpage can provide a custom template without credentials:

```js
window.postMessage(
  {
    source: "tailstalk2-rpc",
    type: "activity",
    activity: {
      title: "Watching Example Course",
      site: "Example Learning",
      details: "Lesson 3",
      state: "12 minutes remaining"
    }
  },
  window.location.origin,
);
```

The extension sanitizes and length-limits every field. Pages cannot send
Tailstalk session tokens or arbitrary destination URLs through this protocol.
