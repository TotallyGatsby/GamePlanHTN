// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import log from "loglevel";
import ContextState from "./contextState.js";
import EffectType from "./effectType.js";

class Context {
  constructor() {
    this.IsInitialized = false;
    this.IsDirty = false;
    this.ContextState = ContextState.Executing;
    this.CurrentDecompositionDepth = 0;
    this.WorldState = {};
    this.LastMTR = [];
    this.MethodTraversalRecord = [];
    this.WorldStateChangeStack = null;
    this.MTRDebug = [];
    this.LastMTRDebug = [];
    this.DebugMTR = false;
    this.PartialPlanQueue = [];
    this.DecompositionLog = [];
    this.LogDecomposition = false;
    this.HasPausedPartialPlan = false;
  }

  init() {
    if (!this.WorldStateChangeStack) {
      this.WorldStateChangeStack = {};
      for (const stateKey in this.WorldState) {
        this.WorldStateChangeStack[stateKey] = [];
      }
    }

    if (this.DebugMTR) {
      if (!this.MTRDebug) {
        this.MTRDebug = [];
      }
      if (!this.LastMTRDebug) {
        this.LastMTRDebug = [];
      }
    }

    if (this.LogDecomposition) {
      if (!this.DecompositionLog) {
        this.DecompositionLog = [];
      }
    }

    this.IsInitialized = true;
  }

  // The `HasState` method returns `true` if the value of the state at the specified index in the `WorldState` array
  // is equal to the specified value. Otherwise, it returns `false`.
  hasState(state, value = 1) {
    return this.getState(state) === value;
  }

  // The `GetState` method returns the value of the state at the specified index in the `WorldState` array.
  // If the `ContextState` is `ContextState.Executing`, it returns the value from the `WorldState` array directly.
  // Otherwise, it returns the value of the topmost object in the `WorldStateChangeStack` array at the specified index,
  // or the value from the `WorldState` array if the stack is empty.
  getState(state) {
    if (this.ContextState === ContextState.Executing) {
      return this.WorldState[state];
    }

    if (this.WorldStateChangeStack[state].length === 0) {
      return this.WorldState[state];
    }

    return this.WorldStateChangeStack[state][0].value;
  }

  // The `SetState` method sets the value of the state at the specified index in the `WorldState` array.
  // If the `ContextState` is `ContextState.Executing`, it sets the `IsDirty` property to `true` if `setAsDirty` is `true`
  // and the value of the state is not already equal to the specified value.
  // Otherwise, it adds a new object to the `WorldStateChangeStack` array at the specified index with properties
  // "effectType" and "value".
  setState(state, value = 1, setAsDirty = true, e = EffectType.Permanent) {
    if (this.ContextState === ContextState.Executing) {
      // Prevent setting the world state dirty if we're not changing anything.
      if (this.WorldState[state] === value) {
        return;
      }

      this.WorldState[state] = value;
      if (setAsDirty) {
        // When a state change during execution, we need to mark the context dirty for replanning!
        this.IsDirty = true;
      }
    } else {
      this.WorldStateChangeStack[state].push({
        effectType: e,
        value,
      });
    }
  }

  // The `Reset` method clears the `MethodTraversalRecord` and `LastMTR` arrays.
  // If `DebugMTR` is `true`, it also clears the `MTRDebug` and `LastMTRDebug` arrays.
  // Finally, it sets the `IsInitialized` property to `false`.
  reset() {
    this.MethodTraversalRecord = [];
    this.LastMTR = [];

    if (this.DebugMTR) {
      this.MTRDebug = [];
      this.LastMTRDebug = [];
    }

    this.IsInitialized = false;
  }


  // The `GetWorldStateChangeDepth` method returns an array containing the
  // length of each stack in the `WorldStateChangeStack` array. If a stack
  // is `null`, its length is `0`.
  getWorldStateChangeDepth() {
    const stackDepth = new Array(this.WorldStateChangeStack.length);

    for (let i = 0; i < this.WorldStateChangeStack.length; i++) {
      stackDepth[i] = (this.WorldStateChangeStack[i] ? this.WorldStateChangeStack[i].length : 0);
    }

    return stackDepth;
  }

  // The `TrimForExecution` method trims the `WorldStateChangeStack` array
  // by removing all elements that are not of type `EffectType.Permanent`.
  // If the `ContextState` is `ContextState.Executing`, an error is thrown.
  trimForExecution() {
    if (this.ContextState === ContextState.Executing) {
      throw new Error("Can not trim a context when in execution mode");
    }

    for (const stack of this.WorldStateChangeStack) {
      while (stack.length !== 0 && stack[0].Key !== EffectType.Permanent) {
        stack.shift();
      }
    }
  }

  // The `TrimToStackDepth` method trims the `WorldStateChangeStack` array
  // to the specified depth for each element in the `stackDepth` array.
  // If the `ContextState` is `ContextState.Executing`, an error is thrown.
  trimToStackDepth(stackDepth) {
    if (this.ContextState === ContextState.Executing) {
      throw new Error("Can not trim a context when in execution mode");
    }

    for (let i = 0; i < stackDepth.length; i++) {
      const stack = this.WorldStateChangeStack[i];

      while (stack.length > stackDepth[i]) {
        stack.pop();
      }
    }
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
    this.PartialPlanQueue = [];
  }
}

export default Context;
