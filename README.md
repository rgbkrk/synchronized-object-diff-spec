# Thinking  on Synchronized Objects for Jupyter

I'd love to see a general synchronized objects specification for Jupyter/nteract, extracting the core of what ipywidgets provides.

TODO: Write a preamble with the motivations and goals.

## Forming a messaging specification

### Initiating the model

Message type: `create_model`

```
content = {
  id: string,
  target: string,
}
```

### Updating the model

These are going to end up using the comms pathway while I'm prototyping, but I'd like to assume we have a higher level message.

Message type: `update_model`

```
content = {
  id: string
  data: value (Object, string, etc.)
  metadata: value (Object, string, etc.)
}
```

Q: Should the update message provide information about if an attached binary buffer comes with the message?

### Out-of-synchronization

Could these get out of sync? Yes!

We probably want some lineage so an actor can ask for the whole model again. If they missed a dependent, they ask for either the entire model or all the patches they need.

```
Truth:  A --> B --> C --> D

Kernel: A --> B --> C --> D

Client: A --> B --> D       ❌
 "Ruh roh, I have up to B, just got D."

Kernel:              C

Client:  A --> B --> C --> D ✅
```

All actors can send to request the whole model or a collection of patches - all while receiving patches on top of the initial model. Similar to other real-time models, the resolution is done by one actor, the kernel, amongst "competing" actors while providing an optimistic "merged" view to clients. If the model gets out of sync, the kernel can request either the model or all the changes they missed and vice versa.

Notes from William Stein: we'll likely want a synchronization numbers or synced clocks for this.

Goal is to have eventual consistency in ~1 second. On reconnect (due to network), synchronize, get latest synchronization numbers.

Alternatively, synchronize clocks (which is easy to do for an electron app).

Suggestion from Jonathan Frederic: Dead Reckoning

Source of Truth: kernel

## Proposed plugin API for nteract

### Model reduction

Let's think about how a model could get updates.

```js
const simpleUpdate = (model, change) =>
  Object.assign({}, model, change);
```

If they rely on Immutable.js

```js
const mergedUpdate = (model, change) =>
  model.merge(Immutable.fromJS(change))
```

Or if they like assuming the change _is_ the whole thing

```js
const directed = (model, change) =>
  change
```

The :key: here would be that this is a contract _for a frontend component_ to coordinate with a backend. They could be using [protobufs](https://github.com/dcodeIO/protobuf.js/wiki/How-to-read-binary-data-in-the-browser-or-under-node.js%3F), [bitmasks on binary arrays](https://github.com/rgbkrk/bitjet), etc. - it's up to the libraries! The component expects updates to their model and that it too may send updates.

It's up to the implementer for how big or small they want to be in terms of what's diff'ed.

### Providing reducers

Per model type, there should be an associated reducer which we'll allow to be
a function.

```js
module.exports.reducer = (model, update) =>
  Object.assign({}, model, update);
```

When a new model is created, with a modelID, we register the reducer and apply it to our list of models.

```js
[MODEL_CREATE]: (state, action) => {
  const { target, id } = action;
  return state.setIn(['models', id, 'reducer'],
            state.getIn(['modelReducers'], target);
}
```

Later, as changes flow through, we update the state of that model.

```js
[MODEL_UPDATE]: (state, action) => {
  const id = action.modelID;
  const model = state.getIn(['models', id]);
  return state.setIn(['models', id, 'state'],
    model.reducer(model.state, action.update, models));
}
```

Displaying

```js
<Transform
  data={data}
  models={models}
/>
```

Changes to that model get reflected back to registered views. React (and the component itself) handle the rest of the changes. The hope would be that the last state of the model could be serialized into the notebook document rather than the initial state from the `display_data`.

We also pass `models` so they can subselect from other models if it's a nested model.

## Questions to explore and answer

Questions to answer:

* What's the message spec?
* How do we handle differences?
* How do we handle binary payloads (from the message spec)?
* How do we delete a model / know to delete a model? (are there "listeners")
* Nested models
