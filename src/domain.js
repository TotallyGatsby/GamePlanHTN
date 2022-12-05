import log from "loglevel";
import Context from "./context.js";
import CompoundTask from "./Tasks/compoundTask.js";
import PrimitiveTask from "./Tasks/primitiveTask.js";
import DecompositionStatus from "./decompositionStatus.js";

class Domain {
  // TODO: Handle actions, conditions, and effects via name lookup as separate objects
  // (see domain test for example)
  constructor({ name, tasks }) {
    this.Name = name;
    this.Tasks = [];

    tasks.forEach((task) => {
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

  // TODO: Refactor into smaller methods
  // eslint-disable-next-line max-statements -- Cleanup later
  findPlan(context) {
    if (!(context instanceof Context)) {
      throw new TypeError(`Domain received non-context object: ${JSON.stringify(context)}`);
    }

    if (!context.Initialized) {
      throw new Error("Context has not been initialized");
    }

    log.debug(`Finding plan for domain: ${this.Name}`);
    // The context is now in planning
    context.IsExecuting = false;

    let result = { status: DecompositionStatus.Rejected, plan: [] };

    context.MethodTraversalRecord = [];

    result = this.Root.decompose(context, 0);

    log.debug(`Status from Decomposing Root: ${result.status}`);
    // If this MTR equals the last MTR, then we need to double check whether we ended up
    // just finding the exact same plan. During decomposition each compound task can't check
    // for equality, only for less than, so this case needs to be treated after the fact.
    let isMTRsEqual = context.MethodTraversalRecord.length === context.LastMTR.length;

    if (isMTRsEqual) {
      log.debug(`Evaluating LastMTR vs result, as they are the same size.`);
      for (let i = 0; i < context.MethodTraversalRecord.length; i++) {
        if (context.MethodTraversalRecord[i] < context.LastMTR[i]) {
          isMTRsEqual = false;
          break;
        }
      }

      if (isMTRsEqual) {
        log.debug(`Rejecting plan, MTR is the same as last MTR.`);
        result = {
          plan: [],
          status: DecompositionStatus.Rejected,
        };
      }
    }

    if (result.status === DecompositionStatus.Succeeded) {
      // Trim away any plan-only or plan&execute effects from the world state change stack, that only
      // permanent effects on the world state remains now that the planning is done.
      context.trimForExecution();

      // Apply permanent world state changes to the actual world state used during plan execution.
      for (let i = 0; i < context.WorldStateChangeStack.length; i++) {
        const stack = context.WorldStateChangeStack[i];

        if (stack && stack.length > 0) {
          context.WorldState[i] = stack.pop();
        }
      }
    } else {
      // Clear away any changes that might have been applied to the stack
      // No changes should be made or tracked further when the plan failed.
      for (let i = 0; i < context.WorldStateChangeStack.length; i++) {
        const stack = context.WorldStateChangeStack[i];

        if (stack && stack.length > 0) {
          stack.clear();
        }
      }
    }

    // The context is no longer in planning
    context.IsExecuting = true;

    return result;
  }
}

export default Domain;
