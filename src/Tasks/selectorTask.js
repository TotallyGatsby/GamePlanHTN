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

const onDecomposeCompoundTask = (context, task, taskIndex, result, plan) => {
  // We need to record the task index before we decompose the task,
  // so that the traversal record is set up in the right order.
  context.MTR.push(taskIndex);

  const subPlan = [];
  const status = task.decompose(context, 0, subPlan);

  // If status is rejected, that means the entire planning procedure should cancel.
  if (status === DecompositionStatus.Rejected) {
    result = [];

    return DecompositionStatus.Rejected;
  }

  // If the decomposition failed return the existing plan
  if (status === DecompositionStatus.Failed) {
    // Remove the taskIndex if it failed to decompose.
    context.MTR.pop();

    result = plan;

    return DecompositionStatus.Failed;
  }

  plan.concat(subPlan);

  result = plan;
  const s = result.length === 0 ? DecompositionStatus.Failed : DecompositionStatus.Succeeded;

  return s;
};

const onDecomposeTask = (context, task, taskIndex, result, plan) => {
  if (!task.isValid(context)) {
    result = plan;

    return DecompositionStatus.Failed;
  }

  if (task instanceof CompoundTask) {
    return onDecomposeCompoundTask(context, task, taskIndex, result, plan);
  } else if (task instanceof PrimitiveTask) {
    task.applyEffects(context);
    plan.push(task);
  }

  result = plan;
  const status = result.length === 0 ? DecompositionStatus.Failed : DecompositionStatus.Succeeded;

  return status;
};

// For a selector task, only one child needs to successfully decompose
const decompose = (context, startIndex, result, task) => {
  const plan = [];

  for (let index = startIndex; index < task.Children.length; index++) {
    // When we plan, we need to improve upon the previous MTR
    if (context.LastMTR.length > 0 && context.MTR.length < context.LastMTR.length) {
      // If our current plan is shorter than our previous plan, check to make sure it's an actual
      // improvement. (Longer plans are not an improvement)
      if (!beatsLastMTR(context, index, context.MTR.length)) {
        context.MTR.push(-1);
        result = [];

        // Rejected plans tell the planner to look no further and stop planning entirely
        return DecompositionStatus.Rejected;
      }
    }

    const childTask = task.Children[index];

    // Note: result and plan will be mutated by this function
    // TODO: To make this simpler to understand should these functions return an object that contains
    // a status and the plan?
    const status = onDecomposeTask(context, childTask, index, result, plan);

    // If we cannot make a plan OR if we completed a plan, short circuit this for loop
    if (status === DecompositionStatus.Rejected || status === DecompositionStatus.Succeeded) {
      return status;
    }
  }

  result = plan;

  return result.Count === 0 ? DecompositionStatus.Failed : DecompositionStatus.Succeeded;
};

export { isValid, decompose };
