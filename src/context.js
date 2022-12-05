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
    this.MethodTraversalRecord = [];
    this.WorldStateChangeStack = [];
    this.LastMTRDebug = [];
    this.DebugMTR = false;
    this.partialPlanQueue = [];
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

  clarMTR() {
    this.MethodTraversalRecord = [];
  }

  clearLastMTR() {
    this.LastMTR = [];
  }

  shiftMTR() {
    this.LastMTR = [];
    this.LastMTR.push(...this.MethodTraversalRecord);
  }

  restoreMTR() {
    this.MethodTraversalRecord = [];
    this.MethodTraversalRecord.push(...this.LastMTR);
    this.LastMTR = [];
  }

  clearLastMTRDebug() {
    this.LastMTRDebug = [];
  }

  shiftMTRDebug() {
    this.LastMTRDebug = [];
    this.LastMTRDebug.push(...this.MTRDebug);
  }

  restoreMTRDebug() {
    this.MTRDebug = [];
    this.MTRDebug.push(...this.LastMTRDebug);
    this.LastMTRDebug = [];
  }

  clearPartialPlanQueue() {
    this.partialPlanQueue = [];
  }
}

export default Context;
