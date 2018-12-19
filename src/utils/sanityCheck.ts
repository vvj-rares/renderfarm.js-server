let limitNumber = function(value: number, minValue: number, maxValue: number) {
    if (!value) {
        return minValue;
    }

    if (value < minValue) return minValue;
    if (value > maxValue) return maxValue;

    return value;
};

module.exports = {
    checkProgressiveMaxRenderTime: function(value) {
        let defaultMin = 1 / 60; // 1 second
        let defaultMax = 60.0;   // max 1 hour

        return limitNumber(value, defaultMin, defaultMax);
    },
    checkProgressiveNoiseThreshold: function(value) {
        let defaultMin = 0.000001;
        let defaultMax = 1.0;

        return limitNumber(value, defaultMin, defaultMax);
    }
};