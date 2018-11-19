module.exports = function (prefix, suffix) {
    let randomPart = (Math.random() * 1e12).toFixed(0);
    return `${prefix !== undefined ? (prefix + "_") : ""}${randomPart}${suffix !== undefined ? ("_" + suffix) : ""}`;
}