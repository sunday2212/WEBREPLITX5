import fs from "fs";

const filePath = "./quizx/Brain/file-manifest.json";

// Read JSON
const raw = fs.readFileSync(filePath, "utf-8");
const data = JSON.parse(raw);

let quizCount = 0;
let articleCount = 0;

// STEP 1: Convert all to quiz
for (const key in data.folders) {
  if (data.folders[key].type === "article") {
    data.folders[key].type = "quiz";
    quizCount++;
  }
}

// STEP 2: Revert Amboss (Article) and uWorld to article
for (const key in data.folders) {
  if (key.startsWith("Amboss (Article)") || key.startsWith("uWorld Medical Library")) {
    data.folders[key].type = "article";
    articleCount++;
  }
}

// Save back
fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

console.log("✅ Done");
console.log("Quiz changed:", quizCount);
console.log("Reverted to article:", articleCount);
