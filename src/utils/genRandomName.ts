module.exports = function (prefix, suffix) {

    const uuidv4 = require('uuid/v4');
    let newFileGuid = uuidv4();

    let randomPart1 = newFileGuid.split("-").join("");

    return `${prefix !== undefined ? (prefix + "_") : ""}${randomPart1}${suffix !== undefined ? ("_" + suffix) : ""}`;
}