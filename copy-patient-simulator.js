const fs = require('fs');
const path = require('path');

function copyFolder(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source folder ${src} does not exist!`);
    return;
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyFolder(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied: ${destPath}`);
    }
  }
}

// Source and target paths
const sourceRoot = "C:/Users/User/my-patient-simulator";
const targetRoot = "C:/Users/User/hume-voice-simulator";

// Copy folders
copyFolder(path.join(sourceRoot, "app/(auth)"), path.join(targetRoot, "app/(auth)"));
copyFolder(path.join(sourceRoot, "lib/db"), path.join(targetRoot, "lib/db"));

// Copy individual files
const filesToCopy = ["drizzle.config.ts", ".env.local", "lib/constants.ts", "lib/errors.ts", "lib/usage.ts"];
filesToCopy.forEach(file => {
  const srcPath = path.join(sourceRoot, file);
  const destPath = path.join(targetRoot, file);
  fs.copyFileSync(srcPath, destPath);
  console.log(`Copied: ${destPath}`);
});

console.log("✅ All necessary files/folders copied successfully!");
