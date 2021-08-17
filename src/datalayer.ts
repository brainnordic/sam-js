const LogLevel = {
  INFO: 1,
  WARNING: 2,
  ERROR: 3,
};

function log(toLog, logLevel) {
  switch (logLevel) {
    case LogLevel.INFO:
      console.log(toLog);
      break;
    case LogLevel.WARNING:
      console.warn(toLog);
      break;
    case LogLevel.ERROR:
      console.error(toLog);
      break;
    default:
  }
}

const TYPE_RE_ =
    /\[object (Boolean|Number|String|Function|Array|Date|RegExp|Arguments)\]/;


function type(value) {
  if (value == null) return String(value);
  const match = TYPE_RE_.exec(
      Object.prototype.toString.call(Object(value)));
  if (match) return match[1].toLowerCase();
  return 'object';
}


function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(Object(value), key);
}


function isPlainObject(value) {
  if (!value || type(value) != 'object' || // Nulls, dates, etc.
      value.nodeType || // DOM nodes.
      value == value.window) { // Window objects.
    return false;
  }
  try {
    // According to jQuery, we must check for the presence of the constructor
    // property in IE. If the constructor property is inherited and isn't an
    // Object, this isn't a plain object.
    if (value.constructor && !hasOwn(value, 'constructor') &&
        !hasOwn(value.constructor.prototype, 'isPrototypeOf')) {
      return false;
    }
  } catch (e) {
    // Some objects will throw an exception when you try to access their
    // constructor. These are never plain objects.
    // See http://bugs.jquery.com/ticket/9897.
    return false;
  }
  // Lastly, we check that all properties are non-inherited.
  // According to jQuery, inherited properties are always enumerated last, so
  // it's safe to only check the last enumerated property.
  let key;
  for (key in value) {}
  return key === undefined || hasOwn(value, key);
}

function expandKeyValue(key, value) {
  const result = {};
  let target = result;
  const split = key.split('.');
  for (let i = 0; i < split.length - 1; i++) {
    target = target[split[i]] = {};
  }
  target[split[split.length - 1]] = value;
  return result;
}


function isArray(value) {
  return type(value) === 'array';
}


function isArguments(value) {
  return type(value) === 'arguments';
}


function isString(value) {
  return type(value) === 'string';
}

function merge(from, to) {
  const allowMerge = !from['_clear'];
  for (const property in from) {
    if (hasOwn(from, property)) {
      const fromProperty = from[property];
      if (isArray(fromProperty) && allowMerge) {
        if (!isArray(to[property])) to[property] = [];
        merge(fromProperty, to[property]);
      } else if (isPlainObject(fromProperty) && allowMerge) {
        if (!isPlainObject(to[property])) to[property] = {};
        merge(fromProperty, to[property]);
      } else {
        to[property] = fromProperty;
      }
    }
  }
  delete to['_clear'];
}

export class DataLayerHelper {
  dataLayer_: any[];
  listener_: (any, ...args: any[]) => any;
  listenToPast_: boolean;
  processed_: boolean;
  executingListener_: boolean;
  model_: any;
  unprocessed_: any[];
  commandProcessors_: { [key: string]: ((...args: any[]) => any|undefined)[] } ;
  abstractModelInterface_: any;

  constructor(dataLayer, options = {}) {
    options = {
      'listener': options['listener'] || (() => {
      }),
      'listenToPast': options['listenToPast'] || false,
      'processNow': options['processNow'] === undefined ?
          true : options['processNow'],
      'commandProcessors': options['commandProcessors'] || {},
    };

    this.dataLayer_ = dataLayer;

    this.listener_ = options['listener'];

    this.listenToPast_ = options['listenToPast'];

    this.processed_ = false;

    this.executingListener_ = false;

    this.model_ = {};

    this.unprocessed_ = [];

    this.commandProcessors_ = options['commandProcessors'];

    this.abstractModelInterface_ = buildAbstractModelInterface_(this);

    // Add listener for future state changes.
    const oldPush = this.dataLayer_.push;
    const that = this;
    this.dataLayer_.push = function() {
      const states = [].slice.call(arguments, 0);
      const result = oldPush.apply(that.dataLayer_, states);
      that.processStates_(states);
      return result;
    };

    if (options['processNow']) {
      this.process();
    }
  }

  process() {
    if (this.processed_) {
      log(`Process has already been run. This method should only ` +
        `run a single time to prepare the helper.`, LogLevel.ERROR);
    }

    // Register a processor for set command.
    this.registerProcessor('set', function() {
      let toMerge = {};
      if (arguments.length === 1 && type(arguments[0]) === 'object') {
        toMerge = arguments[0];
      } else if (arguments.length === 2 && type(arguments[0]) === 'string') {
        // Maintain consistency with how objects are merged
        // outside of the set command (overwrite or recursively merge).
        toMerge = expandKeyValue(arguments[0], arguments[1]);
      }
      return toMerge;
    });
    // Mark helper as having been processed.
    this.processed_ = true;

    const startingLength = this.dataLayer_.length;
    for (let i = 0; i < startingLength; i++) {
     this.processStates_([this.dataLayer_[i]], !(this.listenToPast_));
    }
  }

  get(key) {
    let target = this.model_;
    const split = key.split('.');
    for (let i = 0; i < split.length; i++) {
      if (target[split[i]] === undefined) return undefined;
      target = target[split[i]];
    }
    return target;
  }

  flatten() {
    this.dataLayer_.splice(0, this.dataLayer_.length);
    this.dataLayer_[0] = {};
    merge(this.model_, /** @type {!Object<string, *>} */ (this.dataLayer_[0]));
  }


  registerProcessor(name, processor) {
    if (!(name in this.commandProcessors_)) {
      this.commandProcessors_[name] = [];
    }
    this.commandProcessors_[name].push(processor);
  }

  processArguments_(args: any[]) {
    // Run all registered processors associated with this command.
    const states:any[] = [];
    const name = /** @type {string} */ (args[0]);
    if (this.commandProcessors_[name]) {
      const length = this.commandProcessors_[name].length;
      for (let i = 0; i < length; i++) {
        const callback = this.commandProcessors_[name][i];
        states.push(callback.apply(this.abstractModelInterface_,
            [].slice.call(args, 1)));
      }
    }
    return states;
  }

  processStates_(states, skipListener = false) {
    if (!this.processed_) {
      return;
    }
    this.unprocessed_.push.apply(this.unprocessed_, states);
    if (this.executingListener_) {
      return;
    }

    while (this.unprocessed_.length > 0) {
      const update = this.unprocessed_.shift();
      if (isArray(update)) {
        processCommand_(/** @type {!Array<*>} */ (update), this.model_);
      } else if (isArguments(update)) {
        const newStates = this.processArguments_((update));
        this.unprocessed_.push.apply(this.unprocessed_, newStates);
      } else if (typeof update == 'function') {
        try {
          update.call(this.abstractModelInterface_);
        } catch (e) {
          // Catch any exceptions to we don't drop subsequent updates.
          log(`An exception was thrown when running the method ` +
              `${update}, execution was skipped.`, LogLevel.ERROR);
          log(e, LogLevel.ERROR);
        }
      } else if (isPlainObject(update)) {
        if(update['event'] && typeof update['event'] == 'string') {
          const data = (({ event, ...o }) => o)(update)
          const newStates = this.processArguments_(['event', update['event'], data])
          this.unprocessed_.push.apply(this.unprocessed_, newStates);
        } else if(update['plugin']) {
          this.processArguments_(['plugin', update['plugin']]);
        } else {
          for (const key in update) {
            merge(expandKeyValue(key, update[key]), this.model_);
          }
         }
      } else {
        continue;
      }
      if (!skipListener) {
        this.executingListener_ = true;
        this.listener_(this.model_, update);
        this.executingListener_ = false;
      }
    }
  }
}

function buildAbstractModelInterface_(dataLayerHelper) {
  return {
    set(key, value) {
      merge(expandKeyValue(key, value),
          dataLayerHelper.model_);
    },
    get(key) {
      return dataLayerHelper.get(key);
    },
  };
}

function processCommand_(command, model) {
  if (!isString(command[0])) {
    log(`Error processing command, no command was run. The first ` +
        `argument must be of type string, but was of type ` +
        `${typeof command[0]}.\nThe command run was ${command}`,
        LogLevel.WARNING);
  }
  const path = command[0].split('.');
  const method = path.pop();
  const args = command.slice(1);
  let target = model;
  for (let i = 0; i < path.length; i++) {
    if (target[path[i]] === undefined) {
      log(`Error processing command, no command was run as the ` +
          `object at ${path} was undefined.\nThe command run was ${command}`,
          LogLevel.WARNING);
      return;
    }
    target = target[path[i]];
  }
  try {
    target[method].apply(target, args);
  } catch (e) {
    // Catch any exception so we don't drop subsequent updates.
    log(`An exception was thrown by the method ` +
        `${method}, so no command was run.\nThe method was called on the ` +
        `data layer object at the location ${path}.`, LogLevel.ERROR);
  }
}