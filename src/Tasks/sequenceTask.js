const isValid = (context, task) => {
  if (task.defaultValidityTest(context) === false) {
    console.log("Base isValid failed");
    return false;
  }

  // A sequence with 0 children is not valid
  if (task.Children.length === 0) {
    return false;
  }

  return true;
};

export { isValid };
