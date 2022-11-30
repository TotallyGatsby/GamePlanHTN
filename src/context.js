import log from "loglevel";

class Context {
  constructor() {
    this.Initialized = false;
    this.IsDirty = false;
    this.IsExecuting = true;
    this.isDone = false;
    // TODO: Should this be a map?
    this.WorldState = {};
    this.LastMTR = [];
    this.MTR = [];
    this.WorldStateChangeStack = [];
  }

  init() {
    this.Initialized = true;
  }

  hasState(key, value = 1) {
    if (this.WorldState.hasOwnProperty(key) && this.WorldState[key] === value) {
      return true;
    }

    return false;
  }

  getState(key) {
    if (this.IsExecuting) {
      return this.WorldState[key];
    }

    // TODO: Implement when planning is implemented
    return undefined;
  }

  setState(key, value = 1, dirtyContext = true) {
    if (this.IsExecuting) {
      if (this.WorldState[key] === value) {
        return;
      }

      this.WorldState[key] = value;
      if (dirtyContext) {
        this.IsDirty = true;
      }
    } else {
      // TODO: Implement planning stack
    }
  }

  setDone() {
    this.isDone = true;
  }

  trimForExecution() {
    log.debug("Not implemented");
  }
}

export default Context;
