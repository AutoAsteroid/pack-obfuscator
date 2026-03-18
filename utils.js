
/**
 * We use no npm dependencies besides ffmpeg for tga file converting :) Woo!
 */
const { execSync } = require("child_process");
const readline = require("readline");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const config = require("./config.json");
const outputDirectory = path.join("output", config.output || config.input);

/**
 * Converts a string or character into its corresponding unicode escape sequence
 */
function unicodeCharacter(character) {
    return "\\u" + character.charCodeAt(0).toString(16).padStart(4, "0");
}
function stringToUnicode(string) {
    return String(string).split("").map(unicodeCharacter).join("");
}
function randomInt(min, max) {
    return min + Math.floor(Math.random() * (max - min + 1));
}
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

const color = {
    reset: "\x1b[0m",
    red: text => "\x1b[31m" + text + color.reset,
    green: text => "\x1b[32m" + text + color.reset,
    yellow: text => "\x1b[33m" + text + color.reset
}

function hasFFmpeg() {
    // Makes sure the user has ffmpeg installed for tga converting
    try {
        execSync("ffmpeg -version", { stdio: "ignore" });
        return true;
    } catch { return false; }
}

function jsonToUnicode(jsonString) {
    // Converts a json object to its unicode escape sequence equivalent
    // For some reason we cannot put unicode the following: "Array.**"
    return jsonString.replace(/"([^"]*)"/g, (match) =>
        match.startsWith('"Array.') ? 
        match : stringToUnicode(match))
        
    // Rewrite unicode " as actual " and rewrite \n
    .replaceAll("\\u0022", "\"")
    .replaceAll("\\u005c\\u006e", "\\u000a");
}

function parseJSON(file) {
    if (!fs.existsSync(file, "utf-8")) return {};

    // Safely parses a json file by removing comments first
    return JSON.parse(fs
        .readFileSync(file, "utf-8")
        .replaceAll(/\u0015/g, "\\u0015")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(?<!:)\/\/.*$/gm, "")
        .trim());
}

function copyDirectory(directory, destination) {
    // Copies the input directory to the destination directory
    fs.mkdirSync(destination, { recursive: true });
    
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const inputDirectory = path.join(directory, entry.name);
        const outputDirectory = path.join(destination, entry.name);
        
        if (entry.isDirectory())
            copyDirectory(inputDirectory, outputDirectory);
        else fs.copyFileSync(inputDirectory, outputDirectory);
    }
}

function getDirectories(directory) {
    // Return all directory paths in a given directory
    return fs
        .readdirSync(directory, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => path.join(directory, dirent.name));
}

function directorySize(directory) {
    // Recursively accumulate the total size of a directory
    let size = 0;
    for (const fileName of fs.readdirSync(directory, () => {}))
        size += fs.statSync(path.join(directory, fileName)).size;
    for (const filePath of getDirectories(directory))
        size += directorySize(filePath);
    return size;
}

function getExtension(filePath) {
    // Find the first file that has the same base name as this file
    const directory = path.dirname(filePath);
    const base = path.basename(filePath);
    if (!fs.existsSync(directory)) return null;

    const match = fs
        .readdirSync(directory)
        .find(file => path.basename(file, path.extname(file)) === base);
    return match ? path.extname(match) : null;
}

function findKeysRecursive(json, key, results = []) {
    // Returns the addresses of matching keys in an object
    if (!json || typeof json !== "object") return results;
    if (key in json)
        results.push({ parent: json, key });
    for (const value of Object.values(json))
        findKeysRecursive(value, key, results);
    return results;
}

function manipulateStrings(parent, key, transform) {
    const value = parent[key];
    if (typeof value === "string") return transform(value);
    if (Array.isArray(value))
        return value.map(v => manipulateStrings(v, transform))
    else if (typeof value === "object")
        for (const key in value)
            if (typeof value[key] === "string")
                value[key] = transform(value[key]);
    return parent[key];
}

function manipulateStrings(parent, key, transform) {
    // This function transforms the strings in a object parent key
    const value = parent[key];
    if (typeof value === "string") return parent[key] = transform(value);

    if (Array.isArray(value))
        return parent[key] = value.map(val => transform(val));
    
    if (typeof value === "object" && value !== null)
        for (const nestedKey in value) 
            if (typeof value[nestedKey] === "string") 
                value[nestedKey] = transform(value[nestedKey]);

    // Return our parent key with the manipulated strings
    return parent[key];
}

function getNestedPath(parent = "\u0015hidden", mkdir = true) {
    // Generate a random nested folder path to store our files
    const folders = [];
    const [ min, max ] = config.nestedFiles;
    for (let i = 0; i < randomInt(min, max); i++)
        folders.push(randomInt(0, 9).toString());

    const fullPath = path.join(parent, ...folders);
    const create = path.join(outputDirectory, fullPath);
    if (mkdir === true)
        fs.mkdirSync(create, { recursive: true });
    return fullPath;
}

const newTextureMap = {};

function renameTextures(directory) {
    let renameCount = 0;
    /**
     * This function recursively finds all texture path definitions and renames them to UUIDs
     * If the lecture path points to a non existent file, ignore it because it may be vanilla
     */
    for (const fileName of fs.readdirSync(directory, () => {})) {
        if (!fileName.endsWith(".json")) continue;

        const fullPath = path.join(directory, fileName);
        const jsonObject = parseJSON(fullPath);

        // Redefine this path to a random UUID and add it to the mapping
        const convertPath = (texturePath) => {
            if (typeof texturePath !== "string") return texturePath;
            if (newTextureMap[texturePath]) return newTextureMap[texturePath];

            const filePath = path.join(outputDirectory, texturePath);
            const extension = getExtension(filePath);
            if (!fs.existsSync(filePath + extension)) return texturePath;

            // Rename our file to a random UUID and store this new mapping
            const newName = config.renamePrefix + crypto.randomUUID();
            const newFile = path.join(getNestedPath(), newName);
            const newPath = path.join(outputDirectory, newFile);

            fs.renameSync(filePath + extension, newPath + extension);
            newTextureMap[texturePath] = newFile; renameCount += 1;
            return newFile;
        }
        // Convert the values of all the "textures" keys in the object
        const textures = findKeysRecursive(jsonObject, "textures");
        for (const { parent, key } of textures)
            parent[key] = manipulateStrings(parent, key, convertPath);

        if (textures.length !== 0) {
            const newJsonString = JSON.stringify(jsonObject, null, 4);
            fs.writeFileSync(path.join(directory, fileName), newJsonString, "utf-8");
        }
    }
    for (const filePath of getDirectories(directory))
        renameCount += renameTextures(filePath);
    return renameCount;
}

function newPackUUID(directory) {
    /**
     * Simply generates a random new UUID in our manifest file
     */
    const manifest = path.join(directory, "manifest.json");
    const jsonObject = parseJSON(manifest);

    jsonObject.header.uuid = crypto.randomUUID();
    jsonObject.header.name += " [OBFUSCATED]";
    const jsonString = JSON.stringify(jsonObject, null, 4);
    fs.writeFileSync(manifest, jsonString, "utf-8");
    return jsonObject.header.uuid;
}

function randomJunkChar() {
    const r = Math.random();
    // Control characters
    if (r < 0.2) return String.fromCharCode(Math.floor(Math.random() * 32));      
    // Box-drawing / symbols
    if (r < 0.4) return String.fromCharCode(0x2500 + Math.floor(Math.random() * 0x50)); 
    // Cyrillic / other letters
    return String.fromCharCode(0x0400 + Math.floor(Math.random() * 0x200));        
}

function randomComment(min, max) {
    // Generates a random comment full of random corrupted characters
    const length = randomInt(min, max);
    let garbage = "";
    for (let i = 0; i < length; i++) 
        garbage += randomJunkChar();
    // \u202E is Right-to-left override, makes viewing really annoying
    // Can honestly be bypassed with regex matching to clear comments
    return "/*\u202E" + garbage + "\u202E*/";
}

function obfuscateJSON(directory) {
    /**
     * Unicode escapes JSON files with the exclusion of the below strings in the
     * provided folder paths because for some reason Minecraft fails to parse it
     */
    let obfuscationCount = 0;
    let commentCount = 0;
    const ignoredUnicode = {
        "/particles": [ '"format_version": "1.10.0",' ]
    }
    for (const fileName of fs.readdirSync(directory, () => {})) {
        if (!fileName.endsWith(".json")) continue;

        const fullPath = path.join(directory, fileName);
        const parent = directory.replace(outputDirectory, "");
        let jsonString = fs.readFileSync(fullPath, "utf-8")
            .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String
            .fromCharCode(parseInt(hex, 16)));
        
        // Temporarily replace our ignored strings with placeholders
        if (parent in ignoredUnicode) 
            ignoredUnicode[parent]
                .forEach((string, index) => jsonString = jsonString
                .replaceAll(string, index.toString().repeat(50)));

        // Flood a ton of random garbage comments between the JSON data
        let content = (config.unicode 
            ? jsonToUnicode(jsonString) : jsonString).replace(/\s+/g, "");
        const [ min, max ] = config.commentsSize;

        if (config.comments) content = content.replace(/{|\}|\[|\]|,|":/g, (text) => {
            // We ignore the ": we matched from the regex in the prefix
            const prefix = text === '":' ? "" : randomComment(min, max);
            const suffix = randomComment(min, max);

            commentCount += 1 + Number(Boolean(prefix));
            return prefix + text + suffix;
        });
        
        // Revert our data back to unicode back our placeholders
        if (parent in ignoredUnicode) 
            ignoredUnicode[parent]
                .forEach((string, index) => content = content
                .replaceAll(index.toString().repeat(50), string));

        fs.writeFileSync(fullPath, content, "utf8");
        obfuscationCount += 1;
    }
    // Accumulate how much we comments we add or files obfuscate
    for (const filePath of getDirectories(directory)) {
        const { files, comments } = obfuscateJSON(filePath);
        obfuscationCount += files;
        commentCount += comments;
    }
    
    return { files: obfuscationCount, comments: commentCount };
}

const retexturedPaths = new Set();

function renameJSON(directory) {
    /**
     * This function will rename all JSON files in the below directories to random UUIDs
     * and move them to random nested folders if the config enabled them to
     */
    let renameCount = 0;
    const renamableDirectories = [
        "/animation_controllers",
        "/animations",
        "/attachables",
        "/entity",
        "/particles",
        "/render_controllers",
        "/models/entity"
    ];

    for (const fileName of fs.readdirSync(directory, () => {})) {
        if (!fileName.endsWith(".json")) continue;

        // Check if this json file is in a texture path that is allowed to rename
        const fullPath = path.join(directory, fileName);
        const parent = directory.replace(outputDirectory, "");
        const renamable = renamableDirectories.find((name) => parent.startsWith(name));
        if (!renamable || retexturedPaths.has(parent)) continue;
        
        // Generate the new file path location of this JSON file
        const newDirectory = getNestedPath(renamable);
        const newName = config.renameJSON ? 
            config.renamePrefix + crypto.randomUUID() + ".json" : fileName;
        const newPath = path.join(outputDirectory, newDirectory, newName);

        if (fullPath === newPath) continue;
        fs.renameSync(fullPath, newPath);
        retexturedPaths.add(newDirectory); renameCount++;
    }
    for (const filePath of getDirectories(directory))
        renameCount += renameJSON(filePath);
    return renameCount;
}

function renameUIs(directory) {
    /**
     * In order to rename UIs we will need to define their definitions, but this
     * also breaks Minecraft's inheritance with their UIs, so we must merge files
     */
    const definitions = { ui_defs: [] };
    const ui = path.join(directory, "ui");
    
    for (const fileName of fs.readdirSync(ui, () => {})) {
        if (!fileName.endsWith(".json")) continue;

        const newDirectory = getNestedPath();
        const vanillaJSON = parseJSON(path.join("vanilla", fileName));
        const currentJSON = parseJSON(path.join(ui, fileName));

        // This will merge our custom ui files with their vanilla uis
        for (const key of Object.keys(currentJSON))
            if (typeof currentJSON[key] !== "object") continue;
            else if (key in vanillaJSON)
                Object.assign(vanillaJSON[key], currentJSON[key]);
            else vanillaJSON[key] = currentJSON[key];

        // You are able to rename JSON UI files with any file extension
        const newName = config.renamePrefix + crypto.randomUUID() + ".png";
        const newPath = path.join(newDirectory, newName);
        const newJSON = JSON.stringify(vanillaJSON, null, 4);

        fs.writeFileSync(path.join(directory, newPath), newJSON);
        fs.rmSync(path.join(ui, fileName));
        definitions.ui_defs.push(newPath);
    }
    // Flood the UI definitions file so its harder to know which are real files
    for (let i = 0; i < 100; i++) {
        const fakePath = getNestedPath(undefined, false);
        const fakeName = config.renamePrefix + crypto.randomUUID() + ".png";
        definitions.ui_defs.push(path.join(fakePath, fakeName));
    }
    // Shuffle our definitions so its in a random order
    shuffleArray(definitions.ui_defs);

    const output = JSON.stringify(definitions, null, 4);
    fs.writeFileSync(path.join(ui, "_ui_defs.json"), output);
    return definitions.ui_defs.length;
}

function setReadOnly(directory) {
    /**
     * This function sets our entire pack to have read only permissions
     */
    let fileCount = 0;
    fs.chmodSync(directory, 0o555);

    for (const file of fs.readdirSync(directory)) {
        const fullPath = path.join(directory, file);

        if (!fs.statSync(fullPath).isFile()) continue;
        fs.chmodSync(fullPath, 0o444);
        fileCount += 1;
    }
    for (const filePath of getDirectories(directory))
        fileCount += setReadOnly(filePath);
    return fileCount;
}

function convertTGA(directory) {
    /**
     * This function converts png and jpeg images to "corrupted" .tga files
     */
    let fileCount = 0;
    for (const file of fs.readdirSync(directory)) {
        if (!file.endsWith(".png") && !file.endsWith(".jpeg")) continue;

        // Makes use of ffmpeg to convert our images to tga format
        const fullPath = path.join(directory, file);
        const fileName = path.basename(file, path.extname(file));
        const output = path.join(directory, fileName + ".tga");
        const current = fullPath.replace(outputDirectory, "");
        if (current === "/pack_icon.png") continue;

        readline.clearLine(process.stdout, 0);
        readline.cursorTo(process.stdout, 0);
        process.stdout.write(`└── Converting to TGA format: ${color.green(current)}`);
        execSync(`ffmpeg -loglevel quiet -i "${fullPath}" "${output}"`);

        // Remove the old image file as we don't need it anymore
        fs.rmSync(fullPath); fileCount += 1;

        // "Corrupt" our tga file for low level parsers. Not fullproof
        const buffer = fs.readFileSync(output);
        const idLength = randomInt(15, 255);
        buffer[0] = idLength;

        // Force top left origin and set our alpha depth to nonsense
        buffer[17] = (buffer[17] & 0x0F) | 0x20;
        buffer[17] = (buffer[17] & 0xF0) | 0x0F;

        // Write extra bytes into the tga file
        fs.writeFileSync(output, Buffer.concat([
            buffer.slice(0, 18), crypto.randomBytes(idLength),
            buffer.slice(18),
            crypto.randomBytes(randomInt(10, 20))
        ]));
    }
    for (const filePath of getDirectories(directory))
        fileCount += convertTGA(filePath);

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    return fileCount;
}

function deleteEmptyFolders(directory) {
    // Delete empty directories that may have been created
    let deleteCount = 0;
    for (const filePath of getDirectories(directory))
        deleteCount += deleteEmptyFolders(filePath);

    const files = fs.readdirSync(directory);
    if (files.filter(file => file !== ".DS_Store").length) 
        return deleteCount;
    else fs.rmSync(directory, { recursive: true, force: true });
    return deleteCount + 1;
}

module.exports = {
    renameTextures, obfuscateJSON, renameJSON, setReadOnly, convertTGA, renameUIs, newTextureMap,
    newPackUUID, copyDirectory, directorySize, hasFFmpeg, deleteEmptyFolders, color
}