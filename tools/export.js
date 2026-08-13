const JSZip = require("jszip");
const fs = require("fs");
const path = require("path");

// ============================================================
// RELEASE CONFIGURATION (PRODUCTION)
// Enter the unique UUIDs here for your exported release version.
// ============================================================
const RELEASE_CONFIG = {
  bp: {
    name: "Mob Royale",
    headerUuid: "a0be96c6-c6dd-452d-b0a6-dd32f788d610",
    modules: {
      data: "1cb1b2f0-fc4b-4423-ba7e-2f2de5ec7bf0", // Replace the "data" module UUID
      script: "196dcfdc-819b-4eb1-a824-7750f9f9071c", // Replace the "script" module UUID
    },
  },
  rp: {
    name: "Mob Royale",
    headerUuid: "b53eca86-e425-45af-bed1-c0af5f8b2e98",
    modules: {
      resources: "c22b5fd9-dfb8-4ea2-99ee-41501a4ee070", // Replace the "resources" module UUID
    },
  },
};

const BP_DIRECTORY = path.join(__dirname, "..");
const RP_DIRECTORY = path.join(
  __dirname,
  "..",
  "..",
  "..",
  "development_resource_packs",
  "mob_royale",
);

const OUTPUT_NAME = "mob_royale";
const OUTPUT_DIRECTORY = path.join(__dirname, "..", "build");

const BP_ALLOWED = [
  "entities",
  "items",
  "scripts",
  "manifest.json",
  "pack_icon.png",
];
const RP_ALLOWED = [
  "entity",
  "models",
  "render_controllers",
  "textures",
  "manifest.json",
  "pack_icon.png",
];

/**
 * Modifies the manifest.json in memory for the Release version.
 */
function getModifiedManifest(filePath, config, otherPackHeaderUuid) {
  const rawData = fs.readFileSync(filePath, "utf-8");
  const manifest = JSON.parse(rawData);

  // 1. Change pack name
  if (config.name) {
    manifest.header.name = config.name;
  }

  // 2. Change Header UUID
  if (config.headerUuid) {
    manifest.header.uuid = config.headerUuid;
  }

  // 3. Dynamically change each module's UUID according to its type ("data", "script", "resources")
  if (manifest.modules && Array.isArray(manifest.modules)) {
    manifest.modules.forEach((moduleItem) => {
      if (config.modules && config.modules[moduleItem.type]) {
        moduleItem.uuid = config.modules[moduleItem.type];
      }
    });
  }

  // 4. Update dependency UUIDs (Ignores @minecraft/server and updates RP dependency)
  if (manifest.dependencies && Array.isArray(manifest.dependencies)) {
    manifest.dependencies.forEach((dep) => {
      // Only updates dependencies using UUID instead of module_name
      if (dep.uuid && otherPackHeaderUuid) {
        dep.uuid = otherPackHeaderUuid;
      }
    });
  }

  return JSON.stringify(manifest, null, 2);
}

/**
 * Recursively iterates through folders and adds files to the ZIP.
 */
function addFolderToZip(
  zip,
  currentPath,
  rootPath = currentPath,
  allowedRootItems = null,
  manifestConfig = null,
  otherPackHeaderUuid = null,
) {
  const items = fs.readdirSync(currentPath);

  for (const item of items) {
    const fullPath = path.join(currentPath, item);

    if (
      currentPath === rootPath &&
      allowedRootItems &&
      !allowedRootItems.includes(item)
    ) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    const relativePath = path.relative(rootPath, fullPath);

    if (stat.isDirectory()) {
      addFolderToZip(
        zip,
        fullPath,
        rootPath,
        allowedRootItems,
        manifestConfig,
        otherPackHeaderUuid,
      );
    } else {
      // If it's manifest.json, insert the modified version
      if (item === "manifest.json" && manifestConfig) {
        const modifiedJson = getModifiedManifest(
          fullPath,
          manifestConfig,
          otherPackHeaderUuid,
        );
        zip.file(relativePath, modifiedJson);
      } else {
        const fileData = fs.readFileSync(fullPath);
        zip.file(relativePath, fileData);
      }
    }
  }
}

async function createPackBuffer(
  sourceDir,
  allowedRootItems,
  manifestConfig,
  otherPackHeaderUuid,
) {
  const zip = new JSZip();
  addFolderToZip(
    zip,
    sourceDir,
    sourceDir,
    allowedRootItems,
    manifestConfig,
    otherPackHeaderUuid,
  );
  return await zip.generateAsync({ type: "nodebuffer" });
}

async function exportAddon() {
  if (!fs.existsSync(OUTPUT_DIRECTORY)) {
    fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  }

  const mcaddon = new JSZip();

  // Export BP passing the Release RP Header UUID to update dependencies
  const bpBuffer = await createPackBuffer(
    BP_DIRECTORY,
    BP_ALLOWED,
    RELEASE_CONFIG.bp,
    RELEASE_CONFIG.rp.headerUuid,
  );

  // Export RP passing the Release BP Header UUID
  const rpBuffer = await createPackBuffer(
    RP_DIRECTORY,
    RP_ALLOWED,
    RELEASE_CONFIG.rp,
    RELEASE_CONFIG.bp.headerUuid,
  );

  mcaddon.file(`${OUTPUT_NAME}_bp.mcpack`, bpBuffer);
  mcaddon.file(`${OUTPUT_NAME}_rp.mcpack`, rpBuffer);

  const mcaddonBuffer = await mcaddon.generateAsync({ type: "nodebuffer" });
  const outputPath = path.join(OUTPUT_DIRECTORY, `${OUTPUT_NAME}.mcaddon`);

  fs.writeFileSync(outputPath, mcaddonBuffer);
  console.log(
    "Addon successfully exported to /build with updated UUIDs and names.",
  );
}

exportAddon();
