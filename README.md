# Resource Pack Obfuscator

This program takes a **Minecraft resource pack** and obfuscates it to make it more difficult for others to navigate or modify. Obfuscation is not the same as encryption, and a determined user can still reverse engineer the pack. But, this is the best we can do without access to true encryption. This is a work in progress and may not work for some packs.

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
    "mergeUIs": false,                                      // Merge your UI files to their vanilla uis
    "renameJSON": true,                                     // Rename JSON files to random UUIDs
    "renameTextures": true,                                 // Resolve texture paths and rename them
    "renameItemIcons": false,                               // Rename the icon keys in item_texture.json
    "renamePrefix": ".",                                    // Rename files with this prefix
    "comments": true,                                       // Flood JSON files with garbage comments
    "commentsSize": [ 50, 100 ],                            // Size range of each comment
    "setReadOnly": false,                                   // Set all files to read only
    "convertTGA": false,                                    // Converts .png and .jpeg files to .tga
    "nestedDepth": [ 20, 30 ],                              // Range of depth (can't be too large)
}
```

### Usage:
1. Place your resource pack folder inside the input directory.
2. Edit the config.json file to be your input folder and enable which features to use.
3. Run the obfuscator: `node main`

### Example Output:

```
Resource Pack Obsfucator % node main
│   Copying all pack content into: ./output/Asteroid OBFS
├── Your new pack UUID is: 7e2bd592-80a5-49d9-b808-b0f77f4a2624
├── Converted 611 image files to TGA format.
├── Renamed 95 icon names in textures/item_texture.json.
├── Renamed 132 texture paths in JSON files.
├── Merged 7 JSON UI file paths.
├── Escaped 174 applicable JSON unicode files.
├── Flooded 48288 comments into all JSON files.
├── Renamed 156 applicable JSON file paths.
├── Changed 798 file permissions to read only.
├── Deleted 24 empty folders created from nested paths.
│   Successfully obfuscated: ./input/Asteroid Resources
└── Obfuscated pack size difference: 9.096 -> 25.900 MB.
```
You may be required to run as sudo if you previously enabled setReadOnly!

### Important Notes & Caveats:

- **Merge UIs:** If your UIs are modified versions of vanilla UI files, you can merge your files with the vanilla UI files it inherits from. To do this, place the respective vanilla UI files into the `assets/vanilla-ui` folder. For example, if your pack edits parts of `server_form.json`, place the FULL vanilla version of `server_form.json` into `assets/vanilla-ui`. We will use this to merge the files while keeping your changes present.

- **Rename Textures:** If enabled, behavior packs that reference your textures (such as action forms) will not work due to their file paths changing. To fix this, use the generated texture path mapping in `assets/textures.json` to remap your texture paths in your scripts. In the scenario that your pack modifies a vanilla texture and something in your pack uses it, Minecraft will use the vanilla texture while your pack uses the modified version. For example, if you have a custom item using a modified version of `textures/items/totem.png`, your custom item will use the modified version while vanilla Minecraft will use the vanilla texture.

- **Comments Enabled:** The larger the comment size range, the larger your pack becomes contingent on the size and amount of JSON files your pack has. Increasingly large ranges become pointless as they trade off unnecessary pack size for something that can be cleaned by a JSON parser. Too small of ranges and your JSON files do not look obfuscated as thoroughly.

- **Rename Item Icons:** Using this will rename the icon keys in `textures/item_texture.json`. This will break your behavior packs that use those key names unless we remap those icon keys too. Input your items folder into `assets/bp-items` so we can remap those icon keys. You will have to use the new generated items folder `assets/new-items` in your behavior pack.

### Created by: https://github.com/AutoAsteroid