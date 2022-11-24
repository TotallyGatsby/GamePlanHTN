class PrimitiveTask {
  constructor(props) {
    this.Name = "";
    this.Conditions = [];
    this.Effects = [];

    if (typeof (props) === "function") {
      this.Operator = props;
    } else {
      this.Name = props.name;
      this.Operator = props.operator;
    }
  }

  isValid(context) {
    if (context === undefined) {
      return false;
    }

    for (let index = 0; index < this.Conditions.length; index++) {
      if (typeof (this.Conditions[index]) === "function") {
        if (this.Conditions[index](context) === false) {
          return false;
        }
      }
    }

    return true;
  }
}

export default PrimitiveTask;
