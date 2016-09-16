## Thinking 🤔 on Synchronized Objects for Jupyter

I'd love to see a general synchronized objects specification for Jupyter/nteract, extracting the core of what ipywidgets provides.

### Model reduction thinking

Let's think in terms of reducing a model from changes for a moment:

```js
const simpleUpdate = (model, changes) => 
  Object.assign({}, model, changes);
```

If they rely on Immutable.js

```js
const mergedUpdate = (model, changes) =>
  model.merge(Immutable.fromJS(changes))
```

Or if it's a direct whole-shebang:

```js
const directed = (model, changes) =>
  changes
```

The :key: here would be that this is a contract _for a frontend component_ to coordinate with a backend. They could be using [protobufs](https://github.com/dcodeIO/protobuf.js/wiki/How-to-read-binary-data-in-the-browser-or-under-node.js%3F), [bitmasks on binary arrays](https://github.com/rgbkrk/bitjet), etc. - it's up to the libraries! The component expects updates to their model and that it too may send updates.

That's the high level, I'm not sure how we end up feeding the data in to the component(s) that have access to the model.

### Out-of-synchronization

Could these get out of sync? Yes!

We probably want some lineage so we can ask for the whole model again. If you missed a dependent, you can ask for either the entire model or all the patches you need.

```
Truth:  A --> B --> C --> D

Kernel: A --> B --> C --> D

Client: A --> B --> D       ❌
 "Ruh roh, I have up to B, just got D."
 
Kernel:              C

Client:  A --> B --> C --> D ✅
```

To clarify: it sounds like we want a message you can send to request the whole model or a collection of patches, all the while receiving patches on top of the initial model. Similar to other realtime models, you do resolution on one actor (likely the backend), amongst "competing" actors while providing an optimistic "merged" view to the user. If things get out of sync the kernel can request either the model or all the changes they missed and vice versa. Basically, applying patches.

### Things to think on

* Is it good/bad that we expect the component to have its own local state?
  * Should they provide the reducer, we pass them the final model state -- so its in the state tree and notebook doc, potentially easier for synchronization amongst multiple users

