## Thinking  on Synchronized Objects for Jupyter

I'd love to see a general synchronized objects specification for Jupyter/nteract, extracting the core of what ipywidgets provides.

### Model reduction

Let's try a simple paradigm - reducing a model from changes:

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

### Things to think on

* Is it good/bad that we expect the component to have a local state?
  * Should they provide the reducer, we pass them the final model state -- so its in the state tree and notebook doc, potentially easier for synchronization amongst multiple users
