# colour-gate

```js
var gate = new Gate(Element video, Function callback);
```

The callback will get run once when the registered colour is detect with a single argument (Object {name: String}).

## Methods

```js
registerColour(String name, Object colour {r: Number, g: Number, b: Number});
```

Manually register a colour to track.

```js
dropper(String name)
```

Enable the canvas dropper to select a colour to track.
