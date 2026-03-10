# Resource Pack Obfuscator

This program takes a **Minecraft resource pack** and obfuscates it to make it more difficult for others to navigate or modify. Obfuscation is not the same as encryption, and a determined user can still reverse engineer the pack. But, this is the best we can do without access to true encryption.

### Features:

- **JSON Unicode Escape Sequences** – converts JSON files to their unicode escape sequences.  
- **Random UUID Renaming** – renames JSON and resolved texture files to random UUIDs.  
- **Flatten JSON Folders** – moves JSON files from organized folders into a single structure.  
- **Comment Flooding** – adds garbage comments to JSON files at the cost of pack size.
- **File Flooding** – creates pointless empty files to increase the annoyance factor.  
- **Prefix Renaming** – prepend certain control characters to file names.
- **Read-only Permissions** – sets file permissions to read-only to annoy pack modifiers.
- **Convert to TGA** - converts image files into their tga counter parts

### Configuration:
```json
{
    "input": "My Resource Pack",                        
    "output": "",                                           // Fallback to input if not defined
    "newUUID": true,                                        // Generate a new manifest UUID
    "unicode": true,                                        // Unicode escape JSON files
    "flattenFiles": true,                                   // Flatten nested folders to one folder
    "renameJSON": true,                                     // Rename JSON files to random UUIDs
    "renameTextures": true,                                 // Resolve texture paths and rename them
    "renamePrefix": ".\u202E\u0015\u0014\u0013\u0012",      // Rename files with this prefix
    "comments": true,                                       // Flood JSON files with garbage comments
    "commentsSize": [ 50, 100 ],                            // Size range of each comment
    "fileFlood": false,                                     // Flood folders with random files
    "fileFloodCount": [ 100, 200 ],                         // Number of files to flood with range
    "setReadOnly": true,                                    // Set all files to read only
    "convertTGA": false                                     // Converts .png and .jpeg files to .tga
}
```
### Usage:
1. Place your resource pack folder inside the input directory.
2. Edit the config.json file to be your input folder and enable which features to use.
3. Run the obfuscator: `node main`

### Example Output:

```base
Copying all pack content into: ./output/Asteroid OBFS
Your new pack UUID is: 90fbec0a-c26c-43c0-b326-82d4e2172f69
Renamed 132 texture paths in JSON files.
Obfuscated 181 applicable JSON files.
Flooded 49993 comments into all JSON files.
Renamed 156 applicable JSON file paths.
Added 4578 pointless empty files.
Changed 5445 file permissions to read only.
Successfully obfuscated: ./input/Asteroid Resources
Obfuscated pack size difference: 9.158 -> 17.434 MB.
```

### Important Notes & Caveats:

- **Rename Textures:** If rename textures is enabled, behavior packs that reference your custom textures (such as server forms) will not work due to their file paths changing. The simplest solution to this is to create a copy of your textures under a different folder name and using that path in your behavior packs. So while players can access these unobfuscated files, modifying them will not change the resource pack.
- **Comments Enabled:** The larger the comment size range, the larger your pack becomes contingent on the size and amount of JSON files your pack has. Increasingly large ranges become pointless as they trade off unnecessary pack size for something that can be cleaned by a JSON parser. Too small of ranges and your JSON files do not look obfuscated as thoroughly.
- **Rename Prefix:** By default, the rename prefix prepends `.` to hide from the linux, `\u202E` (Right-to-Left override) to reverse the name, and control characters `\u0015\u0014\u0013\u0012` that cause certain operating systems to not know the file exists. For example, files and folders named with them do not show on the default Windows file explorer, but macOS and WinRAR can view them fine.

### Created by: https://github.com/AutoAsteroid