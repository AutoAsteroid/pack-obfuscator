# Resource Pack Obfuscator

This program takes a **Minecraft resource pack** and obfuscates it to make it more difficult for others to navigate or modify. Obfuscation is not the same as encryption, and a determined user can still reverse engineer the pack. But, this is the best we can do without access to true encryption.

### Features:

- **JSON Unicode Escape** – converts JSON files to their unicode escape sequences.  
- **Random UUID Renaming** – renames JSON and resolved texture files to random UUIDs.  
- **Nested Folders** – moves your organized files to random nested folder ladders
- **Comment Flooding** – adds garbage comments to JSON files at the cost of pack size.
- **Read Only Permissions** – sets file permissions to read-only to annoy pack modifiers.
- **JSON UI Repathing** - change the file paths to your JSON UI files to hidden files.
- **Convert to TGA** - converts image files into their tga counter parts.

### Configuration:
```json
{
    "input": "My Resource Pack",                        
    "output": "",                                           // Fallback to input if not defined
    "newUUID": true,                                        // Generate a new manifest UUID
    "unicode": true,                                        // Unicode escape JSON files
    "renameUIs": false,                                     // Repath your UI files
    "renameJSON": true,                                     // Rename JSON files to random UUIDs
    "renameTextures": true,                                 // Resolve texture paths and rename them
    "renamePrefix": ".\u202E\u0015\u0014\u0013\u0012",      // Rename files with this prefix
    "comments": true,                                       // Flood JSON files with garbage comments
    "commentsSize": [ 50, 100 ],                            // Size range of each comment
    "setReadOnly": false,                                   // Set all files to read only
    "convertTGA": false,                                    // Converts .png and .jpeg files to .tga
    "nestedFiles": [ 3, 20 ],                               // Range of nested folder depth
}
```

### Usage:
1. Place your resource pack folder inside the input directory.
2. Edit the config.json file to be your input folder and enable which features to use.
3. Run the obfuscator: `node main`

### Example Output:

```
Pack Obsfucator % node main
│   Copying all pack content into: ./output/Asteroid OBFS
├── Renamed 132 texture paths in JSON files.
├── Renamed 7 JSON UI file paths.
├── Escaped 174 applicable JSON unicode files.
├── Flooded 45692 comments into all JSON files.
├── Renamed 156 applicable JSON file paths.
├── Deleted 24 empty folders created from nested paths.
│   Successfully obfuscated: ./input/Asteroid Resources
└── Obfuscated pack size difference: 9.257 -> 14.024 MB.
```
You may be required to run as sudo if you previously enabled setReadOnly

### Important Notes & Caveats:

- **Rename UIs:** If your UIs are modified versions of vanilla UI files, having rename UIs enabled will break your pack unless we merge your files with the vanilla UI it inherits from. To fix this, place the respective vanilla UI files into the `vanilla` folder. For example, if your pack edits parts of `server_form.json`, place the vanilla version of `server_form.json` into `vanilla`. We will use this to merge the files while keeping your changes present.

- **Rename Textures:** If enabled, behavior packs that reference your textures (such as action forms) will not work due to their file paths changing. To fix this, use the generated texture path mapping in `output/textures.json` to remap your texture paths in your scripts. You can do this with a simple object whenever you want to use these paths. This may break if you edit vanilla textures and use that texture path somewhere in your resource pack.

- **Comments Enabled:** The larger the comment size range, the larger your pack becomes contingent on the size and amount of JSON files your pack has. Increasingly large ranges become pointless as they trade off unnecessary pack size for something that can be cleaned by a JSON parser. Too small of ranges and your JSON files do not look obfuscated as thoroughly.

- **Rename Prefix:** By default, the rename prefix prepends `.` to hide from the linux, `\u202E` (Right-to-Left override) to reverse the name, and control characters `\u0015\u0014\u0013\u0012` that cause certain operating systems to not know the file exists. For example, files and folders named with them do not show on the default Windows file explorer, but macOS and WinRAR can view them fine.

### Created by: https://github.com/AutoAsteroid