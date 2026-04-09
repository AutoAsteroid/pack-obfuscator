
/**
 * This program takes a resource pack and obfuscates it via the enabled configs
 */

const path = require("path");
const fs = require("fs");

// Normalize file paths to use unix style file paths so this works on windows fine
const pathJoin = path.join; path.join = (...args) => pathJoin(...args).replace(/\\/g, "/");

const config = require("./config.json");
const obfuscate = require("./utils.js");
const { color: { red, green, yellow }, count } = obfuscate;

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
if (config.newUUID)
    console.log("├── Your new pack UUID is:", yellow(obfuscate.newPackUUID(outputDirectory)));

if (config.convertTGA) {
    obfuscate.convertTGA(outputDirectory);
    console.log("├── Converted", green(count.convertTGA), "image files to TGA format.");
}
if (config.renameItemIcons) {
    obfuscate.renameIcons(outputDirectory);
    console.log("├── Renamed", green(count.renameIcons), "icon names in textures/item_texture.json.");
}
if (config.mergeUIs) {
    obfuscate.mergeUIs(outputDirectory);
    console.log("├── Merged", green(count.mergeUIs), "JSON UI files.");
}
if (config.renameTextures) {
    obfuscate.renameTextures(outputDirectory);
    fs.writeFileSync("assets/textures.json", JSON.stringify(obfuscate.newTextureMap, null, 4), "utf-8");
    console.log("├── Renamed", green(count.renameTextures), "texture paths in JSON files.");
}
if (config.unicode || config.comments) {
    obfuscate.obfuscateJSON(outputDirectory);
    console.log("├── Escaped", green(count.unicode), "applicable JSON unicode files.");
    console.log("├── Flooded", green(count.comments), "comments into all JSON files.");
}
if (config.renameJSON) {
    obfuscate.renameJSON(outputDirectory);
    console.log("├── Renamed", green(count.renameJSON), "applicable JSON file paths.");
}
if (config.setReadOnly) {
    obfuscate.setReadOnly(outputDirectory);
    console.log("├── Changed", green(count.readOnly), "file permissions to read only.");
}

/**
 * Pack size doesn't really increase that much unless you enable large comment flooding or TGA files
 */
obfuscate.deleteEmptyFolders(outputDirectory);
console.log("├── Deleted", green(count.deleteEmpty), "empty folders created from nested paths.");
console.log("│   Successfully obfuscated:", yellow("./" + inputDirectory));
const oldSize = (obfuscate.directorySize(inputDirectory) / 1024 / 1024).toFixed(3);
const newSize = (obfuscate.directorySize(outputDirectory) / 1024 / 1024).toFixed(3);
console.log("└── Obfuscated pack size difference:", red(oldSize), "->", red(newSize), "MB.");