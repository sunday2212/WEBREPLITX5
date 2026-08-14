import fs from "fs"; const filePath = 
"./quizx/Brain/file-manifest.json";
// Read JSON
const data = JSON.parse(fs.readFileSync(filePath, 
"utf-8")); let quizCount = 0; let articleCount = 0;
// ✅ Step 1: Convert ALL to quiz
for (const key in data) { if (data[key].type === 
  "article") {
    data[key].type = "quiz"; quizCount++;
  }
}
// ✅ Step 2: Revert specific prefixes to article
for (const key in data) { if ( key.startsWith("Amboss 
    (Article)") || key.startsWith("uWorld Medical 
    Library")
  ) { data[key].type = "article"; articleCount++;
  }
}
// Save file
fs.writeFileSync(filePath, JSON.stringify(data, null, 
2)); console.log(`✅ Converted to quiz: ${quizCount}`);
console.log(`🔁 Reverted to article: ${articleCount}`);
