import log from "loglevel";
import DecompositionStatus from "../decompositionStatus.js";
import CompoundTask from "./compoundTask.js";
import PrimitiveTask from "./primitiveTask.js";

const isValid = (context, task) => {
  if (task.defaultValidityTest(context) === false) {
    return false;
  }

  // A sequence with 0 children is not valid
  if (task.Children.length === 0) {
    return false;
  }

  return true;
};

const beatsLastMTR = (context, taskIndex, currentDecompositionIndex) => {
  log.debug("Evaluating whether task beats previous MTR");
  // If the last plan's traversal record for this decomposition layer
  // has a smaller index than the current task index we're about to
  // decompose, then the new decomposition can't possibly beat the
  // running plan, so we cancel finding a new plan.
  if (context.LastMTR[currentDecompositionIndex] < taskIndex) {
    // But, if any of the earlier records beat the record in LastMTR, we're still good, as we're on a higher priority branch.
    // This ensures that a plan of [0,0,1] can beat [0,1,0], as earlier tasks have priority
    for (let i = 0; i < context.MTR.length; i++) {
      const diff = context.MTR[i] - context.LastMTR[i];

      if (diff < 0) {
        return true;
      }
      if (diff > 0) {
        // We should never really be able to get here, but just in case.
        return false;
      }
    }

    return false;
  }

  return true;
};

const onDecomposeCompoundTask = (context, childTask, taskIndex, plan) => {
  log.debug(`Decomposing Compound Child Task: ${childTask.Name}`);
  // We need to record the task index before we decompose the task,
  // so that the traversal record is set up in the right order.
  context.MTR.push(taskIndex);

  const childResult = childTask.decompose(context, 0);

  log.debug(`Decomposing Compound Child Task Result: ${JSON.stringify(childResult)}`);
  // If status is rejected, that means the entire planning procedure should cancel.
  if (childResult.status === DecompositionStatus.Rejected) {
    return {
      plan: [],
      status: DecompositionStatus.Rejected,
    };
  }

  // If the decomposition failed return the existing plan
  if (childResult.status === DecompositionStatus.Failed) {
    // Remove the taskIndex if it failed to decompose.
    context.MTR.pop();

    return {
      plan,
      status: DecompositionStatus.Failed,
    };
  }

  log.debug(`Existing plan: ${JSON.stringify(plan)}`);

  // If we successfully decomposed our subtask, add the resulting plan to this plan
  return {
    plan: plan.concat(childResult.plan),
    status: (plan.length === 0) ? DecompositionStatus.Failed : DecompositionStatus.Succeeded,
  };
};

const onDecomposeTask = (context, childTask, taskIndex, plan) => {
  // If the task we're evaluating is invalid, return the existing plan as the result
  if (!childTask.isValid(context)) {
    return {
      plan,
      status: DecompositionStatus.Failed,
    };
  }

  if (childTask instanceof CompoundTask) {
    log.debug(`Decomposing child compound task: ${childTask.Name}`);

    return onDecomposeCompoundTask(context, childTask, taskIndex, plan);
  } else if (childTask instanceof PrimitiveTask) {
    log.debug(`Adding primitive task to plan: ${childTask.Name}`);
    childTask.applyEffects(context);
    plan.push(childTask);
  }

  return {
    plan,
    status: plan.length === 0 ? DecompositionStatus.Failed : DecompositionStatus.Succeeded,
  };
};

// For a selector task, only one child needs to successfully decompose
const decompose = (context, startIndex, task) => {
  log.debug(`Decomposing Task: ${task.Name}`);

  let result = {
    plan: [],
    status: DecompositionStatus.Rejected,
  };

  for (let index = startIndex; index < task.Children.length; index++) {
    // When we plan, we need to improve upon the previous MTR
    if (context.LastMTR.length > 0 && context.MTR.length < context.LastMTR.length) {
      // If our current plan is shorter than our previous plan, check to make sure it's an actual
      // improvement. (Longer plans are not an improvement)
      if (!beatsLastMTR(context, index, context.MTR.length)) {
        context.MTR.push(-1);
        result = {
          plan: [],
          status: DecompositionStatus.Rejected,
        };

        // Rejected plans tell the planner to look no further and stop planning entirely
        return result;
      }
    }

    const childTask = task.Children[index];

    // Note: result and plan will be mutated by this function
    // TODO: To make this simpler to understand should these functions return an object that contains
    // a status and the plan?
    log.debug(`About to decompose ${(childTask.constructor.name)}: ${childTask.Name}: ${JSON.stringify(result)}`);
    result = onDecomposeTask(context, childTask, index, result.plan);
    log.debug(`Resulting plan after decomposing ${childTask.Name}: ${JSON.stringify(result)}`);


    // If we cannot make a plan OR if we completed a plan, short circuit this for loop
    if (result.status === DecompositionStatus.Rejected || result.status === DecompositionStatus.Succeeded) {
      return result;
    }
  }

  log.debug(`Resulting plan from ${task.Name}: ${JSON.stringify(result)}`);

  result.status = result.plan.length === 0 ? DecompositionStatus.Failed : DecompositionStatus.Succeeded;

  return result;
};

export { isValid, decompose };
