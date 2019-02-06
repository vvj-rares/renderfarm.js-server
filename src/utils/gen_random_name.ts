module.exports = function (prefix, suffix) {

    const uuidv4 = require('uuid/v4');
    let newFileGuid = uuidv4();

    let randomPart1 = newFileGuid.split("-").join("");
    randomPart1 = randomPart1.substring(0, 10);

    return `${prefix !== undefined ? (prefix + "_") : ""}${randomPart1}${suffix !== undefined ? ("_" + suffix) : ""}`;
}