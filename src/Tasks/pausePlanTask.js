class PrimitiveTask {
  constructor(props) {
    this.Name = props?.name;
    this.Conditions = [];
    this.Effects = [];
  }

  addCondition() {
    throw new Error("Pause Plan Tasks cannot have conditions");
  }

  addEffect() {
    throw new Error("Pause Plan Tasks cannot have effects");
  }

  applyEffects() {
    // No-op
  }

  isValid() {
    return true;
  }
}

export default PrimitiveTask;
