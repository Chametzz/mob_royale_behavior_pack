const fs = require("fs");
const path = require("path");
const { MobRoyaleCard } = require("../scripts/classes/mob_royale_card.js");

const outputDirectory = path.join(__dirname, "..", "items");

if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

MobRoyaleCard.values.forEach((item) => {
  const jsonContent = {
    format_version: "1.20.50",
    "minecraft:item": {
      description: {
        identifier: item.itemId,
        category: "equipment",
      },
      components: {
        "minecraft:icon": item.icon,
        "minecraft:display_name": {
          value: `[${item.cost}] ${item.name}`,
        },
        "minecraft:max_stack_size": 1,
        "minecraft:use_animation": "none",
        "minecraft:use_modifiers": {
          use_duration: 0.0,
        },
      },
    },
  };

  const fileName = item.itemId.split(":")[1] + ".json";
  const filePath = path.join(outputDirectory, fileName);

  fs.writeFileSync(filePath, JSON.stringify(jsonContent, null, 2), "utf-8");
  console.log("\x1b[32m%s\x1b[0m", `File generated successfully: ${fileName}`);
});

console.log("\x1b[32m%s\x1b[0m", "All JSON files were successfully generated!");
