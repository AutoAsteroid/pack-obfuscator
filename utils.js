
const fs = require("fs");
const path = require("path");
const uuid = require("uuid");

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

function jsonToUnicode(jsonString) {
    // Converts a json object to its unicode escape sequence equivalent
    const ignoredStrings = new Set([ `"Array.skins"` ]);
    return jsonString.replace(/"([^"]*)"/g, (match) => 
        ignoredStrings.has(match) ? 
        match: stringToUnicode(match))

    // Rewrite unicode " as actual " and rewrite \n
    .replaceAll("\\u0022", "\"")
    .replaceAll("\\u005c\\u006e", "\\u000a");
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
    console.log(parent, key);
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
        const jsonString = fs.readFileSync(fullPath, "utf-8")
        // Remove all comments and the BOM (Byte order mark) that breaks parsing
            .replaceAll(/\u0015/g, "\\u0015")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/(?<!:)\/\/.*$/gm, "")
            .trim();
        const jsonObject = JSON.parse(jsonString);

        // Redefine this path to a random UUID and add it to the mapping
        const convertPath = (texturePath) => {
            if (typeof texturePath !== "string") return texturePath;

            const parent = path.dirname(texturePath);
            if (newTextureMap[texturePath]) 
                return path.join(parent, newTextureMap[texturePath]);

            const filePath = path.join(outputDirectory, texturePath);
            const extension = getExtension(filePath);
            if (!fs.existsSync(filePath + extension))
                return texturePath;

            // Rename our file to a random UUID and store this new mapping
            renameCount += 1;
            const newBase = newTextureMap[texturePath] = config.renamePrefix + uuid.v4();
            const newFile = path.join(outputDirectory, parent, newBase + extension);
            fs.renameSync(filePath + extension, newFile);
            return path.join(parent, newBase);
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
    const jsonObject = JSON.parse(fs.readFileSync(manifest));

    jsonObject.header.uuid = uuid.v4();
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

        /**
         * Flood a ton of random garbage comments between the JSON data
         */
        let content = (config.unicode 
            ? jsonToUnicode(jsonString) : jsonString).replace(/\s+/g, "");
        const [ min, max ] = config.commentsSize;
        const matchRegex = /{|\}|\[|\]|,|":/g;

        if (config.comments) content = content.replace(matchRegex, (text) => {
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

function flattenJSON(directory) {
    /**
     * This function will rename all JSON files in the below directories to random UUIDs
     * and flatten their location if the config file enables them to.
     */
    let renameCount = 0;
    const renamableDirectories = [
        "/animations",
        "/attachables",
        "/entity",
        "/particles",
        "/render_controllers",
        "/models/entity"
    ];
    for (const fileName of fs.readdirSync(directory, () => {})) {
        if (!fileName.endsWith(".json")) continue;

        const fullPath = path.join(directory, fileName);
        const parent = directory.replace(outputDirectory, "");
        const renamable = renamableDirectories.find((name) => parent.startsWith(name));
        if (!renamable) continue;

        const newDirectory = config.flattenFiles ? 
            path.join(outputDirectory, renamable) : 
            path.join(outputDirectory, parent);

        // Generate the new file path location of this JSON file
        const newName = config.renameJSON ? uuid.v4() + ".json" : fileName;
        const newPath = path.join(newDirectory, config.renamePrefix + newName);

        if (fullPath === newPath) continue;
        fs.renameSync(fullPath, newPath);
        renameCount++;
    }
    for (const filePath of getDirectories(directory))
        renameCount += flattenJSON(filePath);

    // Delete directory that are empty after flattening them
    if (config.flattenFiles && fs.readdirSync(directory).length === 0) 
        fs.rmdirSync(directory);
    return renameCount;
}


function floodFiles(directory) {
    /**
     * This function just writes a bunch of random empty files to 
     */
    const [ min, max ] = config.fileFloodCount;
    const extensions = [
        ".gif", ".bmp", ".webp", ".exe", ".dumbass", ".lol",
        ".txt", ".log", ".csv", ".xml", ".yaml", ".yml", ".ini",
        ".cfg", ".dat", ".bin", ".zip", ".rar", ".7z", ".tar",
        ".gz", ".bz2", ".iso", ".dmg", ".pkg", ".deb", ".rpm"
    ];
    let fileCount = 0;
    
    const amount = randomInt(min, max);
    for (let i = 0; i < amount; i++) {
        const ext = extensions[randomInt(0, extensions.length - 1)];
        const file = path.join(directory, uuid.v4() + ext);
        fs.writeFileSync(file, randomJunkChar(), "binary");
    }
    fileCount += amount;
    for (const folderName of getDirectories(directory))
        fileCount += floodFiles(folderName);
    return fileCount;
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

module.exports = {
    newPackUUID, renameTextures, obfuscateJSON, flattenJSON, floodFiles,
    setReadOnly, copyDirectory, directorySize
}