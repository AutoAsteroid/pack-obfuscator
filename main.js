
/**
 * This program takes a resource pack and obfuscates it via the enabled configs
 */

const config = require("./config.json");
const obfuscate = require("./utils.js");

const path = require("path");
const fs = require("fs");

/**
 * Pre obfuscation checks that copies our files and ensure this is a vaid pack
 */
const outputDirectory = path.join("output", config.output || config.input);
const inputDirectory = path.join("input", config.input);

if (!fs.existsSync(path.join(inputDirectory, "manifest.json")))
    return console.log("Failed to find the pack manifest in:", inputDirectory);

if (Object.values(config).filter(value => value === true).length !== 0) {
    console.log("Copying all pack content into:", "./" + outputDirectory);
    fs.rmSync(outputDirectory, { recursive: true, force: true });
    obfuscate.copyDirectory(inputDirectory, outputDirectory);
} else return console.log("None of the obfuscation configs are enabled.");

if (config.convertTGA && !obfuscate.hasFFmpeg())
    return console.log("Convert TGA requires you to have ffmpeg installed.");

/**
 * Start obfuscation based on whether it is enabled in the config file
 */
if (config.newUUID) {
    const newPackUUID = obfuscate.newPackUUID(outputDirectory);
    console.log("Your new pack UUID is:", newPackUUID);
}
if (config.convertTGA) {
    const count = obfuscate.convertTGA(outputDirectory);
    console.log("Converted", count, "image files to TGA format.");
}
if (config.renameTextures) {
    const count = obfuscate.renameTextures(outputDirectory);
    console.log("Renamed", count, "texture paths in JSON files.");
}
if (config.unicode || config.comments) {
    const { files, comments } = obfuscate.obfuscateJSON(outputDirectory);
    console.log("Obsfucated", files, "applicable JSON files.");
    console.log("Flooded", comments, "comments into all JSON files.");
}
if (config.flattenFiles || config.renameJSON) {
    const count = obfuscate.flattenJSON(outputDirectory);
    console.log("Renamed", count, "applicable JSON file paths.");
}
if (config.fileFlood) {
    const count = obfuscate.floodFiles(outputDirectory);
    console.log("Added", count, "pointless empty files.");
}
if (config.setReadOnly) {
    const count = obfuscate.setReadOnly(outputDirectory);
    console.log("Changed", count, "file permissions to read only.");
}

/**
 * Pack size doesn't really increase that much unless you enable comment flooding
 */
console.log("Successfully obfuscated:", "./" + inputDirectory);
const oldSize = (obfuscate.directorySize(inputDirectory) / 1024 / 1024).toFixed(3);
const newSize = (obfuscate.directorySize(outputDirectory) / 1024 / 1024).toFixed(3);
console.log("Obfuscated pack size difference:", oldSize, "->", newSize, "MB.");
