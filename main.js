
/**
 * This program takes a resource pack and obfuscates it via the enabled configs
 */

const config = require("./config.json");
const obfuscate = require("./utils.js");
const { color: { red, green, yellow } } = obfuscate;

const path = require("path");
const fs = require("fs");

/**
 * Pre obfuscation checks that copies our files and ensure this is a vaid pack
 */
const outputDirectory = path.join("output", config.output || config.input);
const inputDirectory = path.join("input", config.input);

if (!fs.existsSync(path.join(inputDirectory, "manifest.json")))
    return console.log("└── Failed to find the pack manifest in:", yellow(inputDirectory));

if (config.convertTGA && !obfuscate.hasFFmpeg())
    return console.log("└── Convert TGA requires you to have ffmpeg installed.");

if (config.renameItemIcons && !fs.existsSync(path.join(inputDirectory, "textures/item_texture.json")))
    return console.log("└── Renaming texture icons requires a textures/item_texture.json file.");

if (Object.values(config).filter(value => value === true).length !== 0) {
    console.log("│   Copying all pack content into:", yellow("./" + outputDirectory));
    fs.rmSync(outputDirectory, { recursive: true, force: true });
    obfuscate.copyDirectory(inputDirectory, outputDirectory);
} 
else return console.log("└── None of the obfuscation configs are enabled.");

/**
 * Start obfuscation based on whether it is enabled in the config file (renameTextures may not work)
 */
if (config.newUUID) {
    const newPackUUID = obfuscate.newPackUUID(outputDirectory);
    console.log("├── Your new pack UUID is:", yellow(newPackUUID));
}
if (config.convertTGA) {
    const count = obfuscate.convertTGA(outputDirectory);
    console.log("├── Converted", green(count), "image files to TGA format.");
}
if (config.renameItemIcons) {
    const count = obfuscate.renameIcons(outputDirectory);
    console.log("├── Renamed", green(count), "icon names in textures/item_texture.json.");
}
if (config.renameTextures) {
    const count = obfuscate.renameTextures(outputDirectory);
    const textureMap = JSON.stringify(obfuscate.newTextureMap, null, 4);
    console.log("├── Renamed", green(count), "texture paths in JSON files.");
    fs.writeFileSync("assets/textures.json", textureMap, "utf-8");
}
if (config.renameUIs) {
    const count = obfuscate.renameUIs(outputDirectory);
    console.log("├── Renamed", green(count), "JSON UI file paths.");
}
if (config.unicode || config.comments) {
    const { files, comments } = obfuscate.obfuscateJSON(outputDirectory);
    console.log("├── Escaped", green(files), "applicable JSON unicode files.");
    console.log("├── Flooded", green(comments), "comments into all JSON files.");
}
if (config.renameJSON) {
    const count = obfuscate.renameJSON(outputDirectory);
    console.log("├── Renamed", green(count), "applicable JSON file paths.");
}
if (config.setReadOnly) {
    const count = obfuscate.setReadOnly(outputDirectory);
    console.log("├── Changed", green(count), "file permissions to read only.");
}

/**
 * Pack size doesn't really increase that much unless you enable large comment flooding or TGA files
 */
const deleted = obfuscate.deleteEmptyFolders(outputDirectory);
console.log("├── Deleted", green(deleted), "empty folders created from nested paths.");
console.log("│   Successfully obfuscated:", yellow("./" + inputDirectory));
const oldSize = (obfuscate.directorySize(inputDirectory) / 1024 / 1024).toFixed(3);
const newSize = (obfuscate.directorySize(outputDirectory) / 1024 / 1024).toFixed(3);
console.log("└── Obfuscated pack size difference:", red(oldSize), "->", red(newSize), "MB.");