// Portions of this file are derived from FluidHTN (MIT License)
// Copyright (c) 2019 Pål Trefall
// https://github.com/ptrefall/fluid-hierarchical-task-network

import log from "loglevel";
import Context from "./context.js";
import CompoundTask from "./Tasks/compoundTask.js";
import PrimitiveTask from "./Tasks/primitiveTask.js";
import DecompositionStatus from "./decompositionStatus.js";
import ContextState from "./contextState.js";

class Domain {
  // TODO: Handle actions, conditions, and effects via name lookup as separate objects
  // (see domain test for example)
  constructor({ name, tasks }) {
    this.Name = name;
    this.Tasks = [];

    tasks?.forEach((task) => {
      if (typeof (task) === "function" || task.operator) {
        this.Tasks.push(new PrimitiveTask(task));
      } else {
        this.Tasks.push(new CompoundTask(task));
      }
    });

    // Our root node is a simple 'selector' task across our list of available tasks
    // So planning is essentially decomposing our entire set of tasks
    this.Root = new CompoundTask({ name: "Root", tasks, type: "select" });
  }

  add(parentTask, childTask) {
    if (parentTask === childTask) {
      throw Error("Parent and child cannot be the same task!");
    }

    parentTask.addSubtask(childTask);
    childTask.Parent = parentTask;
  }

  // TODO: Refactor into smaller methods
  // eslint-disable-next-line max-statements, complexity -- Cleanup later
  findPlan(context) {
    if (!(context instanceof Context)) {
      throw new TypeError(`Domain received non-context object: ${JSON.stringify(context)}`);
    }

    if (!context.IsInitialized) {
      throw new Error("Context has not been initialized");
    }

    if (!context.MethodTraversalRecord) {
      throw new Error("We require the Method Traversal Record to have a valid instance.");
    }

    // The context is now in planning
    context.ContextState = ContextState.Planning;

    let result = { status: DecompositionStatus.Rejected, plan: [] };
    let plan = [];

    // context.MethodTraversalRecord = [];

    //  result = this.Root.decompose(context, 0);

    // We first check whether we have a stored start task. This is true
    // if we had a partial plan pause somewhere in our plan, and we now
    // want to continue where we left off.
    // If this is the case, we don't erase the MTR, but continue building it.
    // However, if we have a partial plan, but LastMTR is not 0, that means
    // that the partial plan is still running, but something triggered a replan.
    // When this happens, we have to plan from the domain root (we're not
    // continuing the current plan), so that we're open for other plans to replace
    // the running partial plan.
    if (context.HasPausedPartialPlan && context.LastMTR.length === 0) {
      context.HasPausedPartialPlan = false;
      while (context.PartialPlanQueue.length > 0) {
        const kvp = context.PartialPlanQueue.shift();

        if (plan.length === 0) {
          const kvpStatus = kvp.Task.decompose(context, kvp.TaskIndex);

          result.status = kvpStatus.status;
          plan = kvpStatus.plan;
        } else {
          const kvpStatus = kvp.Task.decompose(context, kvp.TaskIndex);

          result.status = kvpStatus.status;
          if (kvpStatus.status === DecompositionStatus.Succeeded || kvpStatus.status === DecompositionStatus.Partial) {
            plan.push(...kvpStatus.plan);
            result.plan = plan;
          }
        }

        // While continuing a partial plan, we might encounter
        // a new pause.
        if (context.HasPausedPartialPlan) {
          break;
        }
      }

      // If we failed to continue the paused partial plan,
      // then we have to start planning from the root.
      if (result.status === DecompositionStatus.Rejected || result.status === DecompositionStatus.Failed) {
        context.MethodTraversalRecord = [];
        if (context.DebugMTR) {
          context.MTRDebug = [];
        }

        result = this.Root.decompose(context, 0);
      }
    } else {
      let lastPartialPlanQueue = null;

      if (context.HasPausedPartialPlan) {
        context.HasPausedPartialPlan = false;
        lastPartialPlanQueue = [].push(...context.PartialPlanQueue);
        context.PartialPlanQueue = [];
      }

      // We only erase the MTR if we start from the root task of the domain.
      context.MethodTraversalRecord = [];
      if (context.DebugMTR) {
        context.MTRDebug = [];
      }

      result = this.Root.decompose(context, 0);

      // If we failed to find a new plan, we have to restore the old plan,
      // if it was a partial plan.
      if (lastPartialPlanQueue?.length > 0 && (
        result.status === DecompositionStatus.Rejected || result.status === DecompositionStatus.Failed
      )) {
        context.HasPausedPartialPlan = true;
        context.PartialPlanQueue = [].push(...lastPartialPlanQueue);
      }
    }

    // If this MTR equals the last MTR, then we need to double check whether we ended up
    // just finding the exact same plan. During decomposition each compound task can't check
    // for equality, only for less than, so this case needs to be treated after the fact.
    let isMTRsEqual = context.MethodTraversalRecord.length === context.LastMTR.length;

    if (isMTRsEqual) {
      for (let i = 0; i < context.MethodTraversalRecord.length; i++) {
        if (context.MethodTraversalRecord[i] < context.LastMTR[i]) {
          isMTRsEqual = false;
          break;
        }
      }

      if (isMTRsEqual) {
        result = {
          plan: [],
          status: DecompositionStatus.Rejected,
        };
      }
    }

    if (result.status === DecompositionStatus.Succeeded || result.status === DecompositionStatus.Partial) {
      // Trim away any plan-only or plan&execute effects from the world state change stack, that only
      // permanent effects on the world state remains now that the planning is done.
      context.trimForExecution();

      // Apply permanent world state changes to the actual world state used during plan execution.
      for (const worldStateKey of Object.keys(context.WorldStateChangeStack)) {
        const stack = context.WorldStateChangeStack[worldStateKey];

        if (stack?.length > 0) {
          context.WorldState[worldStateKey] = stack.pop();
          context.WorldStateChangeStack[worldStateKey] = [];
        }
      }
    } else {
      // Clear away any changes that might have been applied to the stack
      // No changes should be made or tracked further when the plan failed.
      for (const worldStateKey of Object.keys(context.WorldStateChangeStack)) {
        if (context.WorldStateChangeStack[worldStateKey]?.length > 0) {
          context.WorldStateChangeStack[worldStateKey] = [];
        }
      }
    }

    // The context is no longer in planning
    context.ContextState = ContextState.Executing;

    return result;
  }
}

export default Domain;
